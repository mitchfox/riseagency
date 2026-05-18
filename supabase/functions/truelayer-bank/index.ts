import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TL_ENV = Deno.env.get("TRUELAYER_ENV") || "live"; // "live" or "sandbox"
const AUTH_HOST = TL_ENV === "sandbox" ? "auth.truelayer-sandbox.com" : "auth.truelayer.com";
const API_HOST = TL_ENV === "sandbox" ? "api.truelayer-sandbox.com" : "api.truelayer.com";
const PROVIDERS = TL_ENV === "sandbox" ? "uk-cs-mock uk-ob-all uk-oauth-all" : "uk-ob-all uk-oauth-all";

async function getSessionUser(supabase: any, token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("investor_sessions")
    .select("user_id, expires_at, investor_users(id, username, status, is_admin)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = (data as any).investor_users;
  if (!u || u.status !== "active") return null;
  return u;
}

async function exchangeCode(code: string, redirect_uri: string) {
  const client_id = Deno.env.get("TRUELAYER_CLIENT_ID")!;
  const client_secret = Deno.env.get("TRUELAYER_CLIENT_SECRET")!;
  const res = await fetch(`https://${AUTH_HOST}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id, client_secret, code, redirect_uri,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`TrueLayer token error: ${JSON.stringify(data)}`);
  return data;
}

async function refreshToken(refresh_token: string) {
  const client_id = Deno.env.get("TRUELAYER_CLIENT_ID")!;
  const client_secret = Deno.env.get("TRUELAYER_CLIENT_SECRET")!;
  const res = await fetch(`https://${AUTH_HOST}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token", client_id, client_secret, refresh_token,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`TrueLayer refresh error: ${JSON.stringify(data)}`);
  return data;
}

async function ensureFreshToken(supabase: any, conn: any) {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60_000) return conn.access_token;
  if (!conn.refresh_token) return conn.access_token;
  const t = await refreshToken(conn.refresh_token);
  const newExp = new Date(Date.now() + (Number(t.expires_in || 3600) * 1000)).toISOString();
  await supabase.from("investor_bank_connections").update({
    access_token: t.access_token,
    refresh_token: t.refresh_token || conn.refresh_token,
    token_expires_at: newExp,
  }).eq("id", conn.id);
  return t.access_token;
}

async function tlGet(path: string, access_token: string) {
  const res = await fetch(`https://${API_HOST}${path}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`TrueLayer ${path} error: ${JSON.stringify(j)}`);
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { token, action, redirect_uri, code, transaction_id, decision, category, vendor, notes } = body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await getSessionUser(supabase, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link") {
      const client_id = Deno.env.get("TRUELAYER_CLIENT_ID");
      if (!client_id) throw new Error("TrueLayer not configured");
      const state = crypto.randomUUID();
      const url = `https://${AUTH_HOST}/?response_type=code` +
        `&client_id=${encodeURIComponent(client_id)}` +
        `&scope=${encodeURIComponent("info accounts balance transactions cards offline_access")}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&providers=${encodeURIComponent(PROVIDERS)}` +
        `&state=${state}`;
      return new Response(JSON.stringify({ url, state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange") {
      if (!code || !redirect_uri) throw new Error("Missing code/redirect_uri");
      const t = await exchangeCode(code, redirect_uri);
      const access_token = t.access_token as string;
      // Probe metadata
      let bank_name: string | null = null;
      try {
        const meta = await tlGet("/data/v1/me", access_token);
        bank_name = meta?.results?.[0]?.provider?.display_name || null;
      } catch { /* noop */ }
      const { data: conn, error: cErr } = await supabase.from("investor_bank_connections").insert({
        investor_user_id: user.id,
        provider: "truelayer",
        bank_name,
        access_token,
        refresh_token: t.refresh_token || null,
        token_expires_at: new Date(Date.now() + (Number(t.expires_in || 3600) * 1000)).toISOString(),
      }).select().single();
      if (cErr) throw cErr;
      return new Response(JSON.stringify({ connection: conn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: conns } = await supabase.from("investor_bank_connections")
        .select("id, bank_name, account_label, last_synced_at, status, created_at")
        .eq("investor_user_id", user.id).order("created_at", { ascending: false });
      const ids = (conns || []).map((c: any) => c.id);
      let txns: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("investor_bank_transactions")
          .select("*").in("connection_id", ids).order("txn_date", { ascending: false }).limit(500);
        txns = data || [];
      }
      return new Response(JSON.stringify({ connections: conns || [], transactions: txns }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { connection_id } = body;
      if (!connection_id) throw new Error("connection_id required");
      await supabase.from("investor_bank_connections")
        .delete().eq("id", connection_id).eq("investor_user_id", user.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      const { data: conns } = await supabase.from("investor_bank_connections")
        .select("*").eq("investor_user_id", user.id);
      let inserted = 0;
      for (const conn of (conns || [])) {
        try {
          const access_token = await ensureFreshToken(supabase, conn);
          const accountsResp = await tlGet("/data/v1/accounts", access_token);
          const accounts = accountsResp?.results || [];
          for (const acct of accounts) {
            const accountId = acct.account_id;
            const txnResp = await tlGet(`/data/v1/accounts/${accountId}/transactions`, access_token);
            const txns = txnResp?.results || [];
            for (const t of txns) {
              const provider_transaction_id = t.transaction_id || `${accountId}-${t.timestamp}-${t.amount}`;
              const amount = Number(t.amount) || 0;
              // TrueLayer amount sign: debits negative
              const row = {
                connection_id: conn.id,
                provider_transaction_id,
                txn_date: (t.timestamp || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
                description: t.description || null,
                merchant: t.merchant_name || null,
                category: t.transaction_category || t.transaction_classification?.[0] || null,
                amount_gbp: amount,
                raw: t,
              };
              const { error } = await supabase.from("investor_bank_transactions")
                .upsert(row, { onConflict: "connection_id,provider_transaction_id", ignoreDuplicates: true });
              if (!error) inserted++;
            }
          }
          await supabase.from("investor_bank_connections")
            .update({ last_synced_at: new Date().toISOString() }).eq("id", conn.id);
        } catch (e) {
          console.error("Sync failed for connection", conn.id, e);
        }
      }
      return new Response(JSON.stringify({ ok: true, inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decide") {
      if (!transaction_id || !decision) throw new Error("transaction_id and decision required");
      // Verify ownership
      const { data: txn } = await supabase.from("investor_bank_transactions")
        .select("*, investor_bank_connections!inner(investor_user_id)")
        .eq("id", transaction_id).maybeSingle();
      if (!txn || (txn as any).investor_bank_connections.investor_user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newStatus =
        decision === "business" ? "approved_business"
        : decision === "personal" ? "approved_personal"
        : "rejected";
      let spending_id: string | null = null;
      if (decision === "business" || decision === "personal") {
        // Spending tracker stores positive amounts for outgoings
        const spendAmount = Math.abs(Number(txn.amount_gbp));
        const { data: spend, error } = await supabase.from("investor_spending").insert({
          spend_date: txn.txn_date,
          category: category || txn.category || "misc",
          vendor: vendor || txn.merchant || txn.description || "Bank",
          amount_gbp: spendAmount,
          notes: notes || `Imported from ${decision} bank transaction`,
          is_personal: decision === "personal",
          bank_transaction_id: txn.id,
        }).select().single();
        if (error) throw error;
        spending_id = spend.id;
      }
      await supabase.from("investor_bank_transactions").update({
        status: newStatus, decided_at: new Date().toISOString(),
        decided_by: user.id, spending_id,
      }).eq("id", transaction_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});