import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

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
      .select(
        "id, short_id, player_id, club_id, fit_recommendation, club_contact_name, club_contact_role, club_contact_phone, created_at, archived_at"
      )
      .eq("short_id", shortId)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link || link.archived_at) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: club } = await supabase
      .from("club_map_positions")
      .select("id, club_name, country, image_url")
      .eq("id", link.club_id)
      .maybeSingle();

    const { data: settings } = await supabase
      .from("club_outreach_settings")
      .select("whatsapp_number")
      .eq("id", 1)
      .maybeSingle();

    const { data: linkPlayers } = await supabase
      .from("club_outreach_link_players")
      .select("player_id, position_slot, fit_recommendation, sort_order")
      .eq("link_id", link.id)
      .order("sort_order", { ascending: true });

    // Fallback to legacy single player_id when no link_players rows exist
    let entries = linkPlayers ?? [];
    if (entries.length === 0 && link.player_id) {
      entries = [
        {
          player_id: link.player_id,
          position_slot: null,
          fit_recommendation: link.fit_recommendation,
          sort_order: 0,
        },
      ];
    }

    const playerIds = entries.map((e: any) => e.player_id);
    const [{ data: playerRows }, { data: defaultsRows }] = await Promise.all([
      playerIds.length
        ? supabase
            .from("players")
            .select(
              "id, name, position, age, date_of_birth, nationality, image_url, club, league"
            )
            .in("id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
      playerIds.length
        ? supabase
            .from("club_outreach_player_defaults")
            .select(
              "player_id, stars_url_override, highlights_url, proof_of_representation_path"
            )
            .in("player_id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const playerById = new Map<string, any>(
      (playerRows ?? []).map((p: any) => [p.id, p])
    );
    const defaultsByPlayer = new Map<string, any>(
      (defaultsRows ?? []).map((d: any) => [d.player_id, d])
    );

    const players = await Promise.all(
      entries.map(async (e: any) => {
        const p = playerById.get(e.player_id);
        const d = defaultsByPlayer.get(e.player_id);
        let proofUrl: string | null = null;
        if (d?.proof_of_representation_path) {
          const { data: signed } = await supabase.storage
            .from("proof-of-representation")
            .createSignedUrl(d.proof_of_representation_path, 60 * 60 * 24);
          proofUrl = signed?.signedUrl ?? null;
        }
        const starsUrl =
          d?.stars_url_override ??
          (p?.name ? `https://risefootballagency.com/stars/${slugify(p.name)}` : null);
        return {
          player: p ?? null,
          position_slot: e.position_slot,
          fit_recommendation: e.fit_recommendation,
          sort_order: e.sort_order,
          stars_url: starsUrl,
          highlights_url: d?.highlights_url ?? null,
          proof_of_representation_url: proofUrl,
        };
      })
    );

    // best-effort log
    try {
      await supabase.from("club_outreach_visits").insert({
        outreach_id: link.id,
        user_agent: req.headers.get("user-agent") ?? null,
        referrer: req.headers.get("referer") ?? null,
      });
    } catch (_) {
      /* ignore */
    }

    return new Response(
      JSON.stringify({
        link,
        club,
        players,
        whatsapp_number: settings?.whatsapp_number ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});