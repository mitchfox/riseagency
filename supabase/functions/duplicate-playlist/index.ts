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

    const { playerEmail, playlistId } = await req.json();
    if (!playerEmail || !playlistId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: player, error: playerError } = await supabase
      .from('players').select('id').ilike('email', playerEmail).maybeSingle();
    if (playerError || !player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: source, error: srcErr } = await supabase
      .from('playlists').select('*').eq('id', playlistId).eq('player_id', player.id).maybeSingle();
    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: copy, error: insErr } = await supabase
      .from('playlists')
      .insert({
        player_id: player.id,
        name: `${source.name} (Copy)`,
        clips: source.clips || [],
        is_favourite: false,
      })
      .select().single();
    if (insErr) {
      return new Response(JSON.stringify({ error: 'Failed to duplicate', details: insErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, playlist: copy }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});