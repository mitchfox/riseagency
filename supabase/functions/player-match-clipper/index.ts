import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Removed multipart form data handling — clients now upload to storage directly via TUS

    // Handle JSON operations
    const body = await req.json();
    const { action, playerEmail } = body;

    if (!playerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing playerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('email', playerEmail)
      .maybeSingle();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('video_analyses')
          .select('*')
          .eq('player_id', player.id)
          .eq('source', 'player')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(
          JSON.stringify({ data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createFromStorage': {
        const { storagePath, title, opponent, matchDate } = body;

        if (!storagePath || !title) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: urlData } = supabase.storage
          .from('analysis-videos')
          .getPublicUrl(storagePath);

        const autoDeleteAt = new Date();
        autoDeleteAt.setDate(autoDeleteAt.getDate() + 7);

        const { data, error } = await supabase
          .from('video_analyses')
          .insert({
            title,
            video_url: urlData.publicUrl,
            opponent: opponent || null,
            match_date: matchDate || null,
            player_id: player.id,
            annotations: [],
            clips: [],
            auto_delete_at: autoDeleteAt.toISOString(),
            match_minute_offset: 0,
            source: 'player',
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateClips': {
        const { videoId, clips } = body;
        // Verify this video belongs to the player
        const { data: existing } = await supabase
          .from('video_analyses')
          .select('id')
          .eq('id', videoId)
          .eq('player_id', player.id)
          .maybeSingle();

        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'Video not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('video_analyses')
          .update({ clips })
          .eq('id', videoId)
          .eq('player_id', player.id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateOffset': {
        const { videoId, match_minute_offset, second_half_offset, second_half_video_time, clips } = body;
        const updates: Record<string, unknown> = {};
        if (match_minute_offset !== undefined) updates.match_minute_offset = match_minute_offset;
        if (second_half_offset !== undefined) updates.second_half_offset = second_half_offset;
        if (second_half_video_time !== undefined) updates.second_half_video_time = second_half_video_time;
        if (clips !== undefined) updates.clips = clips;

        if (Object.keys(updates).length === 0) {
          return new Response(
            JSON.stringify({ error: 'No offset fields supplied' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('video_analyses')
          .update(updates)
          .eq('id', videoId)
          .eq('player_id', player.id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { videoId } = body;
        // Get video to clean up storage
        const { data: video } = await supabase
          .from('video_analyses')
          .select('video_url')
          .eq('id', videoId)
          .eq('player_id', player.id)
          .maybeSingle();

        if (video?.video_url?.includes('analysis-videos')) {
          const path = video.video_url.split('analysis-videos/')[1];
          if (path) await supabase.storage.from('analysis-videos').remove([path]);
        }

        const { error } = await supabase
          .from('video_analyses')
          .delete()
          .eq('id', videoId)
          .eq('player_id', player.id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'saveToClips': {
        const { videoId, clipIds } = body;

        // Get the video with its clips and URL
        const { data: videoData, error: videoErr } = await supabase
          .from('video_analyses')
          .select('video_url, clips, title, opponent')
          .eq('id', videoId)
          .eq('player_id', player.id)
          .eq('source', 'player')
          .maybeSingle();

        if (videoErr || !videoData) {
          return new Response(
            JSON.stringify({ error: 'Video not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!videoData.video_url) {
          return new Response(
            JSON.stringify({ error: 'Video file has expired' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const allClips = (videoData.clips as any[]) || [];
        const clipsToSave = clipIds
          ? allClips.filter((c: any) => clipIds.includes(c.id))
          : allClips;

        if (clipsToSave.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No clips to save' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current player highlights
        const { data: playerData, error: playerFetchErr } = await supabase
          .from('players')
          .select('highlights')
          .eq('id', player.id)
          .single();

        if (playerFetchErr) throw playerFetchErr;

        let highlights: any = { matchHighlights: [], bestClips: [] };
        try {
          if (playerData?.highlights) {
            const parsed = typeof playerData.highlights === 'string'
              ? JSON.parse(playerData.highlights)
              : playerData.highlights;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              highlights = {
                matchHighlights: Array.isArray(parsed.matchHighlights) ? parsed.matchHighlights : [],
                bestClips: Array.isArray(parsed.bestClips) ? parsed.bestClips : [],
              };
            }
          }
        } catch { /* use defaults */ }

        // Create new clip entries using media fragment URLs
        const now = new Date().toISOString();
        const newClipEntries = clipsToSave.map((clip: any) => ({
          id: `${player.id}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          name: clip.label || `Clip from ${videoData.title}`,
          videoUrl: `${videoData.video_url}#t=${Math.floor(clip.start)},${Math.ceil(clip.end)}`,
          addedAt: now,
          clubLogo: null,
          logoUrl: null,
        }));

        highlights.bestClips = [...newClipEntries, ...highlights.bestClips];

        const { error: updateErr } = await supabase
          .from('players')
          .update({ highlights })
          .eq('id', player.id);

        if (updateErr) throw updateErr;

        return new Response(
          JSON.stringify({ success: true, saved: newClipEntries.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
