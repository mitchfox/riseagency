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

    const contentType = req.headers.get('content-type') || '';

    // Handle file upload (multipart form data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const playerEmail = formData.get('playerEmail') as string;
      const title = formData.get('title') as string;
      const opponent = formData.get('opponent') as string | null;
      const matchDate = formData.get('matchDate') as string | null;

      if (!file || !playerEmail || !title) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
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

      // Upload video
      const ext = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('analysis-videos')
        .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('analysis-videos')
        .getPublicUrl(filePath);

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
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(
          JSON.stringify({ data }),
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
        const { videoId, match_minute_offset } = body;
        const { error } = await supabase
          .from('video_analyses')
          .update({ match_minute_offset })
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
