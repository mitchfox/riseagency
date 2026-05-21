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

async function authoriseForPlayer(opts: { playerId: string; makerUsername?: string; playerEmail?: string }): Promise<{ ok: boolean; makerId?: string }> {
  if (opts.playerEmail) {
    const { data: p } = await supabase.from("players").select("id").ilike("email", opts.playerEmail).maybeSingle();
    if (p && p.id === opts.playerId) return { ok: true };
  }
  if (opts.makerUsername) {
    const { data: maker } = await supabase.from("highlight_makers").select("id, status").ilike("username", opts.makerUsername).maybeSingle();
    if (maker && maker.status === "active") {
      const { data: assn } = await supabase.from("highlight_maker_players")
        .select("player_id").eq("highlight_maker_id", maker.id).eq("player_id", opts.playerId).maybeSingle();
      if (assn) return { ok: true, makerId: maker.id };
    }
  }
  return { ok: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, playerId, playerEmail, makerUsername, clipId, name, videoUrl, durationSeconds } = body || {};
    if (!action || !playerId) {
      return new Response(JSON.stringify({ error: "action and playerId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // List is allowed to anyone with the playerId — the data is non-sensitive
      const { data, error } = await supabase
        .from("player_uploaded_clips")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, clips: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await authoriseForPlayer({ playerId, playerEmail, makerUsername });
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: "Not authorised" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      if (!videoUrl || !name) {
        return new Response(JSON.stringify({ error: "videoUrl and name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("player_uploaded_clips").insert({
        player_id: playerId,
        name: String(name).slice(0, 200),
        video_url: String(videoUrl),
        duration_seconds: durationSeconds != null ? Number(durationSeconds) : null,
        uploaded_by_maker_id: auth.makerId || null,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, clip: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rename") {
      if (!clipId || !name) return new Response(JSON.stringify({ error: "clipId and name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("player_uploaded_clips")
        .update({ name: String(name).slice(0, 200) })
        .eq("id", clipId).eq("player_id", playerId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!clipId) return new Response(JSON.stringify({ error: "clipId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("player_uploaded_clips")
        .delete().eq("id", clipId).eq("player_id", playerId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[player-uploaded-clips]", err);
    return new Response(JSON.stringify({ error: (err as Error).message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});