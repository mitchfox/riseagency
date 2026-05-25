import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_TABLES = new Set([
  "investor_activity_log",
  "investor_spending",
  "investor_pipeline",
  "investor_deals",
  "investor_notes",
  "investor_projections",
  "business_plan",
  "investor_forecast",
  "investor_forecast_settings",
]);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { token, op, table, row, id, action, payload } = body;
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

    // Admin-only structured actions (e.g. update player commission forecast)
    if (action) {
      if (!user.is_admin) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "updatePlayerCommission") {
        const { player_id, expected_commission_annual, potential_commission_annual, current_salary_annual, commission_notes, salary_cap_overrides, contract_start_date, contract_end_date } = payload || {};
        if (!player_id) {
          return new Response(JSON.stringify({ error: "player_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const upd: any = {};
        if (expected_commission_annual !== undefined) upd.expected_commission_annual = expected_commission_annual === null || expected_commission_annual === "" ? null : Number(expected_commission_annual);
        if (potential_commission_annual !== undefined) upd.potential_commission_annual = potential_commission_annual === null || potential_commission_annual === "" ? null : Number(potential_commission_annual);
        if (current_salary_annual !== undefined) upd.current_salary_annual = current_salary_annual === null || current_salary_annual === "" ? null : Number(current_salary_annual);
        if (commission_notes !== undefined) upd.commission_notes = commission_notes;
        if (salary_cap_overrides !== undefined) upd.salary_cap_overrides = salary_cap_overrides;
        if (contract_start_date !== undefined) upd.contract_start_date = contract_start_date === null || contract_start_date === "" ? null : contract_start_date;
        if (contract_end_date !== undefined) upd.contract_end_date = contract_end_date === null || contract_end_date === "" ? null : contract_end_date;
        const { error } = await supabase.from("players").update(upd).eq("id", player_id);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_TABLES.has(table)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (table === "investor_projections" && !user.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (table === "business_plan" && !user.is_admin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let result: any;
    if (op === "insert") result = await supabase.from(table).insert(row).select().single();
    else if (op === "update") result = await supabase.from(table).update(row || body.patch || {}).eq("id", id).select().single();
    else if (op === "delete") result = await supabase.from(table).delete().eq("id", id);
    else return new Response(JSON.stringify({ error: "Invalid op" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (result.error) throw result.error;
    return new Response(JSON.stringify({ data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});