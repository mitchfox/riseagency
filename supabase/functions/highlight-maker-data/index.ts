import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ error: "username required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: maker, error: mErr } = await supabase
      .from("highlight_makers")
      .select("id, username, display_name, status")
      .ilike("username", username.trim())
      .maybeSingle();

    if (mErr) throw mErr;
    if (!maker || maker.status !== "active") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assigned players
    const { data: assignments, error: aErr } = await supabase
      .from("highlight_maker_players")
      .select("player_id")
      .eq("highlight_maker_id", maker.id);
    if (aErr) throw aErr;

    const playerIds = (assignments || []).map((r: any) => r.player_id);
    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ maker, players: [], playlists: [], analyses: [], actions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: players }, { data: playlists }, { data: analyses }] = await Promise.all([
      supabase
        .from("players")
        .select("id, name, position, image_url, club, club_logo, nationality, league")
        .in("id", playerIds),
      supabase
        .from("playlists")
        .select("id, player_id, name, clips, created_at, updated_at, is_favourite")
        .in("player_id", playerIds)
        .order("updated_at", { ascending: false }),
      supabase
        .from("player_analysis")
        .select(
          "id, player_id, analysis_date, opponent, result, r90_score, minutes_played, fixture_id, club_logo_url",
        )
        .in("player_id", playerIds)
        .order("analysis_date", { ascending: false }),
    ]);

    const analysisIds = (analyses || []).map((a: any) => a.id);
    let actions: any[] = [];
    if (analysisIds.length > 0) {
      const { data: acts, error: actErr } = await supabase
        .from("performance_report_actions")
        .select(
          "id, analysis_id, action_number, minute, action_score, action_type, action_description, notes, video_url, clip_id, is_first_half",
        )
        .in("analysis_id", analysisIds);
      if (actErr) throw actErr;
      actions = acts || [];
    }

    return new Response(
      JSON.stringify({
        maker,
        players: players || [],
        playlists: playlists || [],
        analyses: analyses || [],
        actions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[highlight-maker-data]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});