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

async function getInvestorUser(supabase: any, token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("investor_sessions")
    .select("expires_at, investor_users(id, username, status, is_admin)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = (data as any).investor_users;
  if (!u || u.status !== "active") return null;
  return u;
}

async function notifyThoughtWallReply(
  supabase: any,
  itemId: string,
  bodyText: string | null,
  authorLabel: string,
  isAdmin: boolean,
) {
  try {
    const { data: item } = await supabase
      .from("exec_support_items")
      .select("kind, title, body")
      .eq("id", itemId)
      .maybeSingle();
    if (!item || item.kind !== "note") return;
    const snippet = (bodyText || "").trim().slice(0, 140) || "(audio reply)";
    const itemSnippet = (item.title || item.body || "").toString().trim().slice(0, 80) || "Thought wall note";
    await supabase.from("staff_notification_events").insert({
      event_type: "investor_thought_reply",
      title: `New reply on thought wall — ${itemSnippet}`,
      body: `${authorLabel}${isAdmin ? " (admin)" : ""}: ${snippet}`,
      event_data: {
        item_id: itemId,
        author_label: authorLabel,
        is_admin: isAdmin,
        target_email: "jolonlevene98@gmail.com",
      },
    });
  } catch (_e) {
    // never block the reply on notification failure
  }
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
    const action = String(body.action || "");
    // Actions any active investor can run (posting notes/replies and creating a
    // lightweight feedback target for staff-sourced scripts/tasks).
    const INVESTOR_ACTIONS = new Set(["postExecNote", "addExecReplyAsInvestor", "ensureExecSourceItem"]);
    let user: any = null;
    if (INVESTOR_ACTIONS.has(action)) {
      user = await getInvestorUser(supabase, token);
    } else {
      user = await getAdminUser(supabase, token);
    }
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
        const { id, section_id, title, summary, content, metrics, tags, display_order, image_url, image_alt, detail_blocks } = payload;
        if (!title || !section_id) return bad("title and section_id required");
        const row: any = { section_id, title, summary, content,
          metrics: Array.isArray(metrics) ? metrics : [],
          tags: Array.isArray(tags) ? tags : [],
          display_order: display_order ?? 999,
          image_url: image_url ?? null,
          image_alt: image_alt ?? null,
          detail_blocks: Array.isArray(detail_blocks) ? detail_blocks : [],
        };
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
      case "uploadImage": {
        const { base64, contentType, ext } = payload;
        if (!base64 || typeof base64 !== "string") return bad("base64 required");
        const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const safeExt = (ext || "jpg").toString().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
        const path = `investors/${crypto.randomUUID()}.${safeExt}`;
        const { error } = await supabase.storage.from("marketing-gallery").upload(path, bin, {
          contentType: contentType || "image/jpeg", cacheControl: "31536000", upsert: false,
        });
        if (error) return bad(error.message, 500);
        const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
        return ok({ url: data.publicUrl });
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
      // ---------- Capacity ----------
      case "upsertCapacitySettings": {
        const { mode, weekly_hours_total, daily_hours, monthly_hours_total, current_youth_players, current_pro_players, staff_weekly_limits } = payload;
        const row: any = {};
        if (mode) row.mode = mode === "day" ? "day" : mode === "month" ? "month" : "week";
        if (weekly_hours_total != null) row.weekly_hours_total = Number(weekly_hours_total);
        if (monthly_hours_total != null) row.monthly_hours_total = Number(monthly_hours_total);
        if (daily_hours && typeof daily_hours === "object") row.daily_hours = daily_hours;
        if (current_youth_players != null) row.current_youth_players = Math.max(0, parseInt(String(current_youth_players)) || 0);
        if (current_pro_players != null) row.current_pro_players = Math.max(0, parseInt(String(current_pro_players)) || 0);
        row.updated_at = new Date().toISOString();
        const { data: existing } = await supabase.from("investor_capacity_settings").select("id").limit(1).maybeSingle();
        // Per-staff weekly limits: deep-merge with existing record so we can update a single staff member.
        if (staff_weekly_limits && typeof staff_weekly_limits === "object") {
          const sanitized: Record<string, number> = {};
          for (const [k, v] of Object.entries(staff_weekly_limits)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) sanitized[k] = n;
          }
          if (existing?.id) {
            const { data: cur } = await supabase
              .from("investor_capacity_settings")
              .select("staff_weekly_limits")
              .eq("id", existing.id)
              .maybeSingle();
            const merged = { ...(cur?.staff_weekly_limits || {}), ...sanitized };
            row.staff_weekly_limits = merged;
          } else {
            row.staff_weekly_limits = sanitized;
          }
        }
        let savedSettings: any = null;
        if (existing?.id) {
          const { data, error } = await supabase.from("investor_capacity_settings").update(row).eq("id", existing.id).select().single();
          if (error) return bad(error.message, 500);
          savedSettings = data;
        } else {
          const { data, error } = await supabase.from("investor_capacity_settings").insert({ singleton: true, ...row }).select().single();
          if (error) return bad(error.message, 500);
          savedSettings = data;
        }
        return ok({ row: savedSettings });
      }
      case "upsertCapacityAllocation": {
        const { id, time_item_id, custom_label, player_type, hours_per_week, day_of_week, days_of_week, display_order, assigned_staff } = payload;
        if (!player_type || !["youth","pro","ongoing"].includes(player_type)) return bad("player_type required");
        const row: any = {
          time_item_id: time_item_id || null,
          custom_label: custom_label || null,
          player_type,
          hours_per_week: Number(hours_per_week) || 0,
          day_of_week: day_of_week || null,
          days_of_week: Array.isArray(days_of_week) ? days_of_week : [],
          display_order: display_order ?? 999,
          updated_at: new Date().toISOString(),
        };
        if (Array.isArray(assigned_staff)) {
          row.assigned_staff = assigned_staff
            .filter((s: any) => s && s.staff_id)
            .map((s: any) => ({ staff_id: String(s.staff_id), hours: Number(s.hours) || 0 }));
        }
        if (id) {
          const { data, error } = await supabase.from("investor_capacity_allocations").update(row).eq("id", id).select().single();
          if (error) return bad(error.message, 500);
          return ok({ row: data });
        }
        const { data, error } = await supabase.from("investor_capacity_allocations").insert(row).select().single();
        if (error) return bad(error.message, 500);
        return ok({ row: data });
      }
      case "deleteCapacityAllocation": {
        if (!payload.id) return bad("id required");
        const { error } = await supabase.from("investor_capacity_allocations").delete().eq("id", payload.id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      // ---------- Executive Support ----------
      case "upsertExecItem": {
        const { id, kind, title, body: itemBody, metadata, status, author_label } = payload;
        if (!kind || !["note","script","workflow"].includes(kind)) return bad("kind required");
        const row: any = {
          kind,
          title: title || null,
          body: itemBody || null,
          metadata: metadata && typeof metadata === "object" ? metadata : {},
          status: status || "open",
          author_label: author_label || null,
          created_by_admin: true,
          updated_at: new Date().toISOString(),
        };
        if (id) {
          const { error } = await supabase.from("exec_support_items").update(row).eq("id", id);
          if (error) return bad(error.message, 500);
          return ok();
        }
        const { data, error } = await supabase.from("exec_support_items").insert(row).select().single();
        if (error) return bad(error.message, 500);
        return ok({ row: data });
      }
      case "deleteExecItem": {
        if (!payload.id) return bad("id required");
        const { error } = await supabase.from("exec_support_items").delete().eq("id", payload.id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "ensureExecSourceItem": {
        const { kind, source_type, source_id, title, body: itemBody, metadata } = payload;
        if (!kind || !["script","workflow"].includes(kind)) return bad("kind required");
        if (!source_type || !source_id) return bad("source required");

        const { data: existing, error: existingError } = await supabase
          .from("exec_support_items")
          .select("*")
          .eq("kind", kind)
          .eq("source_type", source_type)
          .eq("source_id", String(source_id))
          .maybeSingle();
        if (existingError) return bad(existingError.message, 500);
        if (existing) return ok({ row: existing });

        const { data, error } = await supabase.from("exec_support_items").insert({
          kind,
          source_type,
          source_id: String(source_id),
          title: title || null,
          body: itemBody || null,
          metadata: metadata && typeof metadata === "object" ? metadata : {},
          author_label: user.username || "Investor",
          created_by_admin: !!user.is_admin,
        }).select().single();
        if (error) {
          const { data: raced } = await supabase
            .from("exec_support_items")
            .select("*")
            .eq("kind", kind)
            .eq("source_type", source_type)
            .eq("source_id", String(source_id))
            .maybeSingle();
          if (raced) return ok({ row: raced });
          return bad(error.message, 500);
        }
        return ok({ row: data });
      }
      case "updateExecItemStatus": {
        const { id, status } = payload;
        if (!id) return bad("id required");
        const nextStatus = status === "resolved" ? "resolved" : "open";
        const { error } = await supabase.from("exec_support_items")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "addExecReply": {
        const { item_id, body_text, audio_base64, audio_ext, author_label } = payload;
        if (!item_id) return bad("item_id required");
        let audio_url: string | null = null;
        if (audio_base64 && typeof audio_base64 === "string") {
          const bin = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0));
          const ext = (audio_ext || "webm").toString().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
          const path = `exec-support/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("marketing-gallery").upload(path, bin, {
            contentType: ext === "webm" ? "audio/webm" : "audio/mpeg", cacheControl: "31536000", upsert: false,
          });
          if (error) return bad(error.message, 500);
          const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
          audio_url = data.publicUrl;
        }
        const { data, error } = await supabase.from("exec_support_replies").insert({
          item_id, body_text: body_text || null, audio_url,
          is_admin: true, author_label: author_label || null,
        }).select().single();
        if (error) return bad(error.message, 500);
        await notifyThoughtWallReply(supabase, item_id, body_text, author_label || user.username || "Admin", true);
        return ok({ row: data });
      }
      case "deleteExecReply": {
        if (!payload.id) return bad("id required");
        const { error } = await supabase.from("exec_support_replies").delete().eq("id", payload.id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "updateExecReplyStatus": {
        const { id, status } = payload;
        if (!payload.id) return bad("id required");
        const nextStatus = status === "resolved" ? "resolved" : "open";
        const { error } = await supabase.from("exec_support_replies").update({
          status: nextStatus,
          resolved_at: nextStatus === "resolved" ? new Date().toISOString() : null,
          resolved_by_label: nextStatus === "resolved" ? (user.username || "Admin") : null,
        }).eq("id", id);
        if (error) return bad(error.message, 500);
        return ok();
      }
      case "postExecNote": {
        const { body: itemBody, audio_base64, audio_ext, author_label } = payload;
        if (!itemBody && !audio_base64) return bad("body or audio required");
        let audio_url: string | null = null;
        let storedBody = itemBody || null;
        if (audio_base64 && typeof audio_base64 === "string") {
          const bin = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0));
          const ext = (audio_ext || "webm").toString().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
          const path = `exec-support/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("marketing-gallery").upload(path, bin, {
            contentType: ext === "webm" ? "audio/webm" : "audio/mpeg", cacheControl: "31536000", upsert: false,
          });
          if (error) return bad(error.message, 500);
          const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
          audio_url = data.publicUrl;
        }
        const meta: any = audio_url ? { audio_url } : {};
        const { data, error } = await supabase.from("exec_support_items").insert({
          kind: "note", body: storedBody, metadata: meta,
          author_label: author_label || user.username || "Investor",
          created_by_admin: !!user.is_admin,
        }).select().single();
        if (error) return bad(error.message, 500);
        return ok({ row: data });
      }
      case "addExecReplyAsInvestor": {
        const { item_id, body_text, audio_base64, audio_ext, author_label } = payload;
        if (!item_id) return bad("item_id required");
        if (!body_text && !audio_base64) return bad("body or audio required");
        let audio_url: string | null = null;
        if (audio_base64 && typeof audio_base64 === "string") {
          const bin = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0));
          const ext = (audio_ext || "webm").toString().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm";
          const path = `exec-support/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("marketing-gallery").upload(path, bin, {
            contentType: ext === "webm" ? "audio/webm" : "audio/mpeg", cacheControl: "31536000", upsert: false,
          });
          if (error) return bad(error.message, 500);
          const { data } = supabase.storage.from("marketing-gallery").getPublicUrl(path);
          audio_url = data.publicUrl;
        }
        const { data, error } = await supabase.from("exec_support_replies").insert({
          item_id, body_text: body_text || null, audio_url,
          is_admin: !!user.is_admin, author_label: author_label || user.username || "Investor",
        }).select().single();
        if (error) return bad(error.message, 500);
        await notifyThoughtWallReply(supabase, item_id, body_text, author_label || user.username || "Investor", !!user.is_admin);
        return ok({ row: data });
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