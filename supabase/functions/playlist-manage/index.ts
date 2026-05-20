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

async function callerCanTouchPlaylist(opts: {
  playerEmail?: string;
  makerUsername?: string;
  playlistId: string;
}): Promise<boolean> {
  const { data: pl } = await supabase
    .from("playlists")
    .select("player_id")
    .eq("id", opts.playlistId)
    .maybeSingle();
  if (!pl) return false;

  if (opts.playerEmail) {
    const { data: player } = await supabase
      .from("players")
      .select("id")
      .ilike("email", opts.playerEmail)
      .maybeSingle();
    if (player && player.id === pl.player_id) return true;
  }

  if (opts.makerUsername) {
    const { data: maker } = await supabase
      .from("highlight_makers")
      .select("id, status")
      .ilike("username", opts.makerUsername)
      .maybeSingle();
    if (maker && maker.status === "active") {
      const { data: assn } = await supabase
        .from("highlight_maker_players")
        .select("player_id")
        .eq("highlight_maker_id", maker.id)
        .eq("player_id", pl.player_id)
        .maybeSingle();
      if (assn) return true;
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, playlistId, playerEmail, makerUsername, name, isFavourite } = body || {};
    if (!action || !playlistId) {
      return new Response(JSON.stringify({ error: "action and playlistId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowed = await callerCanTouchPlaylist({ playerEmail, makerUsername, playlistId });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Not authorised for this playlist" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (action === "rename") {
      if (!name || typeof name !== "string" || !name.trim()) {
        return new Response(JSON.stringify({ error: "name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      patch.name = name.trim().slice(0, 200);
    } else if (action === "favourite") {
      patch.is_favourite = !!isFavourite;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("playlists")
      .update(patch)
      .eq("id", playlistId)
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, playlist: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[playlist-manage]", err);
    return new Response(JSON.stringify({ error: (err as Error).message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});