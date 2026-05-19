import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAdminUser(supabase: any, token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("investor_sessions")
    .select("expires_at, investor_users(id, username, status, is_admin)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = (data as any).investor_users;
  if (!u || u.status !== "active" || u.is_admin !== true) return null;
  return u;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.headers.get("x-investor-token") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await getAdminUser(supabase, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = String(body.action || "");
    const payload = body.payload || {};

    const ok = (data: any = {}) => new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const bad = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    switch (action) {
      case "upsertSection": {
        const { id, title, display_order } = payload;
        if (!title) return bad("title required");
        if (id) {
          const { error } = await supabase.from("investor_overview_sections")
            .update({ title, display_order }).eq("id", id);
          if (error) return bad(error.message, 500);
          return ok();
        }
        const { data, error } = await supabase.from("investor_overview_sections")
          .insert({ title, display_order: display_order ?? 999 }).select().single();
        if (error) return bad(error.message, 500);
        return ok({ row: data });
      }
      case "deleteSection": {
        if (!payload.id) return bad("id required");
        const { error } = await supabase.from("investor_overview_sections").delete().eq("id", payload.id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "upsertCard": {
        const { id, section_id, title, summary, content, metrics, tags, display_order } = payload;
        if (!title || !section_id) return bad("title and section_id required");
        const row: any = { section_id, title, summary, content,
          metrics: Array.isArray(metrics) ? metrics : [],
          tags: Array.isArray(tags) ? tags : [],
          display_order: display_order ?? 999 };
        if (id) {
          const { error } = await supabase.from("investor_overview_cards").update(row).eq("id", id);
          if (error) return bad(error.message, 500);
          return ok();
        }
        const { data, error } = await supabase.from("investor_overview_cards").insert(row).select().single();
        if (error) return bad(error.message, 500);
        return ok({ row: data });
      }
      case "deleteCard": {
        if (!payload.id) return bad("id required");
        const { error } = await supabase.from("investor_overview_cards").delete().eq("id", payload.id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "reorderCards": {
        const items = Array.isArray(payload.items) ? payload.items : [];
        for (const it of items) {
          await supabase.from("investor_overview_cards")
            .update({ display_order: it.display_order, section_id: it.section_id })
            .eq("id", it.id);
        }
        return ok();
      }
      // ---------- Time Management / Priorities (generic) ----------
      case "upsertOpsCategory":
      case "deleteOpsCategory":
      case "upsertOpsItem":
      case "deleteOpsItem":
      case "reorderOpsItems": {
        const kind = payload.kind === "priority" ? "priority" : "time";
        const catTable = kind === "priority" ? "investor_priority_categories" : "investor_time_categories";
        const itemTable = kind === "priority" ? "investor_priority_items" : "investor_time_items";
        if (action === "upsertOpsCategory") {
          const { id, title, display_order } = payload;
          if (!title) return bad("title required");
          if (id) {
            const { error } = await supabase.from(catTable).update({ title, display_order }).eq("id", id);
            if (error) return bad(error.message, 500);
            return ok();
          }
          const { data, error } = await supabase.from(catTable).insert({ title, display_order: display_order ?? 999 }).select().single();
          if (error) return bad(error.message, 500);
          return ok({ row: data });
        }
        if (action === "deleteOpsCategory") {
          if (!payload.id) return bad("id required");
          const { error } = await supabase.from(catTable).delete().eq("id", payload.id);
          if (error) return bad(error.message, 500);
          return ok();
        }
        if (action === "upsertOpsItem") {
          const { id, category_id, title, description, rough_time, highlights, staff_task_id, display_order } = payload;
          if (!title || !category_id) return bad("title and category_id required");
          const row: any = {
            category_id, title,
            description: description ?? null,
            rough_time: rough_time ?? null,
            highlights: Array.isArray(highlights) ? highlights : [],
            staff_task_id: staff_task_id || null,
            display_order: display_order ?? 999,
          };
          if (id) {
            const { error } = await supabase.from(itemTable).update(row).eq("id", id);
            if (error) return bad(error.message, 500);
            return ok();
          }
          const { data, error } = await supabase.from(itemTable).insert(row).select().single();
          if (error) return bad(error.message, 500);
          return ok({ row: data });
        }
        if (action === "deleteOpsItem") {
          if (!payload.id) return bad("id required");
          const { error } = await supabase.from(itemTable).delete().eq("id", payload.id);
          if (error) return bad(error.message, 500);
          return ok();
        }
        if (action === "reorderOpsItems") {
          const items = Array.isArray(payload.items) ? payload.items : [];
          for (const it of items) {
            await supabase.from(itemTable)
              .update({ display_order: it.display_order, category_id: it.category_id })
              .eq("id", it.id);
          }
          return ok();
        }
        return bad("Unknown ops action");
      }
      default:
        return bad("Unknown action");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});