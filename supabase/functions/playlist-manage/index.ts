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

async function callerIsStaff(req: Request): Promise<boolean> {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth) return false;
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return false;
    const { data: userData } = await supabase.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return false;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (!roles) return false;
    return roles.some((r: any) => r.role === "admin" || r.role === "staff");
  } catch {
    return false;
  }
}

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
    const { action, playlistId, playerEmail, makerUsername, name, isFavourite, clip, clips, clipIndex, starredOnly } = body || {};
    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isStaff = await callerIsStaff(req);

    // listForPlayer doesn't require a playlistId — just an authorised caller for the player.
    if (action === "listForPlayer") {
      const { playerId } = body || {};
      if (!playerId) return new Response(JSON.stringify({ error: "playerId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Validate caller has access to this player's playlists
      let ok = isStaff;
      if (playerEmail) {
        const { data: player } = await supabase.from("players").select("id").ilike("email", playerEmail).maybeSingle();
        if (player && player.id === playerId) ok = true;
      }
      if (!ok && makerUsername) {
        const { data: maker } = await supabase.from("highlight_makers").select("id, status").ilike("username", makerUsername).maybeSingle();
        if (maker && maker.status === "active") {
          const { data: assn } = await supabase.from("highlight_maker_players")
            .select("player_id").eq("highlight_maker_id", maker.id).eq("player_id", playerId).maybeSingle();
          if (assn) ok = true;
        }
      }
      if (!ok) {
        return new Response(JSON.stringify({ error: "Not authorised" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let q = supabase.from("playlists").select("id, name, clips, is_favourite").eq("player_id", playerId);
      if (starredOnly) q = q.eq("is_favourite", true);
      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, playlists: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const { playerId } = body || {};
      if (!playerId || !name) return new Response(JSON.stringify({ error: "playerId and name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Authorise caller
      let ok = isStaff;
      if (playerEmail) {
        const { data: player } = await supabase.from("players").select("id").ilike("email", playerEmail).maybeSingle();
        if (player && player.id === playerId) ok = true;
      }
      if (!ok && makerUsername) {
        const { data: maker } = await supabase.from("highlight_makers").select("id, status").ilike("username", makerUsername).maybeSingle();
        if (maker && maker.status === "active") {
          const { data: assn } = await supabase.from("highlight_maker_players")
            .select("player_id").eq("highlight_maker_id", maker.id).eq("player_id", playerId).maybeSingle();
          if (assn) ok = true;
        }
      }
      if (!ok) return new Response(JSON.stringify({ error: "Not authorised" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const initialClips = clip ? [{ id: crypto.randomUUID(), name: String(clip.name).slice(0, 200), videoUrl: clip.videoUrl, order: 0 }] : [];
      const { data, error } = await supabase.from("playlists").insert({
        player_id: playerId, name: String(name).trim().slice(0, 200),
        clips: initialClips, is_favourite: !!isFavourite,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, playlist: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!playlistId) {
      return new Response(JSON.stringify({ error: "playlistId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowed = isStaff || await callerCanTouchPlaylist({ playerEmail, makerUsername, playlistId });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Not authorised for this playlist" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mutations that act on the clips array
    if (action === "addClip" || action === "removeClip" || action === "reorder") {
      const { data: existing, error: getErr } = await supabase
        .from("playlists").select("clips").eq("id", playlistId).maybeSingle();
      if (getErr) throw getErr;
      const current: any[] = Array.isArray(existing?.clips) ? [...existing!.clips] : [];

      let next = current;
      if (action === "addClip") {
        if (!clip || !clip.videoUrl) {
          return new Response(JSON.stringify({ error: "clip with videoUrl required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (current.some((c) => c.videoUrl === clip.videoUrl)) {
          return new Response(JSON.stringify({ success: true, alreadyPresent: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        next = [
          ...current,
          {
            id: crypto.randomUUID(),
            name: String(clip.name || "Clip").slice(0, 200),
            videoUrl: String(clip.videoUrl),
            order: current.length,
            ...(clip.action_score != null ? { action_score: Number(clip.action_score) } : {}),
          },
        ];
      } else if (action === "removeClip") {
        if (typeof clipIndex !== "number") {
          return new Response(JSON.stringify({ error: "clipIndex required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        next = current.filter((_, i) => i !== clipIndex).map((c, i) => ({ ...c, order: i }));
      } else if (action === "reorder") {
        if (!Array.isArray(clips)) {
          return new Response(JSON.stringify({ error: "clips array required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        next = clips.map((c: any, i: number) => ({
          id: c.id || crypto.randomUUID(),
          name: String(c.name || "Clip").slice(0, 200),
          videoUrl: String(c.videoUrl),
          order: i,
          ...(c.action_score != null ? { action_score: Number(c.action_score) } : {}),
        }));
      }

      const { data: updated, error: upErr } = await supabase
        .from("playlists").update({ clips: next, updated_at: new Date().toISOString() })
        .eq("id", playlistId).select().single();
      if (upErr) throw upErr;
      return new Response(JSON.stringify({ success: true, playlist: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    } else if (action === "delete") {
      const { error } = await supabase.from("playlists").delete().eq("id", playlistId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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