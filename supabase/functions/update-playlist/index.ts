import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { playerEmail, playlistId, clips } = await req.json();

    if (!playerEmail || !playlistId || !clips) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating playlist:', playlistId, 'for player:', playerEmail);
    console.log('New clips:', JSON.stringify(clips));

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('email', playerEmail)
      .maybeSingle();

    if (playerError || !player) {
      console.error('Player verification error:', playerError);
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify playlist belongs to player
    const { data: playlist, error: playlistCheckError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('player_id', player.id)
      .maybeSingle();

    if (playlistCheckError || !playlist) {
      console.error('Playlist verification error:', playlistCheckError);
      return new Response(
        JSON.stringify({ error: 'Playlist not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update playlist using service role to bypass RLS
    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('playlists')
      .update({
        clips: clips,
        updated_at: new Date().toISOString()
      })
      .eq('id', playlistId)
      .select()
      .single();

    if (updateError) {
      console.error('Playlist update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update playlist', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Playlist updated successfully');

    return new Response(
      JSON.stringify({ success: true, playlist: updatedPlaylist }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
