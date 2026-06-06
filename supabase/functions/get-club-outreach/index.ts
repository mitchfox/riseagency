import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const shortId = url.searchParams.get("short_id");
    if (!shortId) {
      return new Response(JSON.stringify({ error: "short_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error: linkErr } = await supabase
      .from("club_outreach_links")
      .select("id, short_id, player_id, club_id, fit_recommendation, created_at, archived_at")
      .eq("short_id", shortId)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link || link.archived_at) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: player }, { data: club }, { data: defaults }, { data: settings }] = await Promise.all([
      supabase.from("players").select("id, name, position, age, date_of_birth, nationality, image_url, club, league").eq("id", link.player_id).maybeSingle(),
      supabase.from("club_map_positions").select("id, club_name, country, image_url").eq("id", link.club_id).maybeSingle(),
      supabase.from("club_outreach_player_defaults").select("stars_url_override, highlights_url, proof_of_representation_path").eq("player_id", link.player_id).maybeSingle(),
      supabase.from("club_outreach_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
    ]);

    let proofUrl: string | null = null;
    if (defaults?.proof_of_representation_path) {
      const { data: signed } = await supabase.storage
        .from("proof-of-representation")
        .createSignedUrl(defaults.proof_of_representation_path, 60 * 60 * 24);
      proofUrl = signed?.signedUrl ?? null;
    }

    // best-effort log
    try {
      await supabase.from("club_outreach_visits").insert({
        outreach_id: link.id,
        user_agent: req.headers.get("user-agent") ?? null,
        referrer: req.headers.get("referer") ?? null,
      });
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({
        link,
        player,
        club,
        defaults: {
          stars_url_override: defaults?.stars_url_override ?? null,
          highlights_url: defaults?.highlights_url ?? null,
          proof_of_representation_url: proofUrl,
        },
        whatsapp_number: settings?.whatsapp_number ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});