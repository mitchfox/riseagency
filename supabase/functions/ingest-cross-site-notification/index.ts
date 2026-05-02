import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-rise-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Allowed event types that other Rise-family sites may forward to staff
// notifications. Anything else is rejected so the table can't be polluted.
const ALLOWED_EVENT_TYPES = new Set([
  "portal_login",
  "portal_analysis_view",
  "portal_performance_view",
  "portal_transfer_submission",
  "portal_club_submission",
]);

// Sites that are permitted to forward events. The label is added to
// every event_data payload so staff can tell where it came from.
const ALLOWED_SOURCES: Record<string, string> = {
  rise: "Rise Football Agency",
  fff: "Fuel For Football",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const source = (req.headers.get("x-rise-source") || "").toLowerCase();
    const sourceLabel = ALLOWED_SOURCES[source];
    if (!sourceLabel) {
      return jsonResponse({ error: "Unknown source" }, 403);
    }

    const body = await req.json().catch(() => null) as
      | {
          eventType?: string;
          title?: string;
          body?: string;
          eventData?: Record<string, unknown>;
          dedupeKey?: string;
        }
      | null;

    if (!body || typeof body.eventType !== "string") {
      return jsonResponse({ error: "Invalid payload" }, 400);
    }
    if (!ALLOWED_EVENT_TYPES.has(body.eventType)) {
      return jsonResponse({ error: "Event type not allowed" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Tag every payload with its origin so the dropdown can display it.
    const eventData = {
      ...(body.eventData || {}),
      cross_site_source: source,
      cross_site_source_label: sourceLabel,
    } as Record<string, unknown>;

    // Dedupe within the last hour for the same event type + dedupe key
    if (body.dedupeKey) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("staff_notification_events")
        .select("id, event_data")
        .eq("event_type", body.eventType)
        .gte("created_at", oneHourAgo)
        .limit(50);
      const hit = (existing || []).some((row: any) => {
        const d = row.event_data || {};
        return (
          d.cross_site_source === source &&
          (d.player_id === body.eventData?.player_id || d.player_email === body.eventData?.player_email)
        );
      });
      if (hit) return jsonResponse({ ok: true, deduped: true });
    }

    const { error } = await supabase.from("staff_notification_events").insert({
      event_type: body.eventType,
      title: body.title || null,
      body: body.body || null,
      event_data: eventData,
    });

    if (error) {
      console.error("Insert failed:", error);
      return jsonResponse({ error: "Insert failed" }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("ingest-cross-site-notification error", err);
    return jsonResponse({ error: "Server error" }, 500);
  }
});