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

    const { playerEmail, oldName, newName, videoUrl } = await req.json();

    if (!playerEmail || !oldName || !newName || !videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, highlights')
      .eq('email', playerEmail)
      .maybeSingle();

    if (playerError || !player) {
      console.error('Player verification error:', playerError);
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update player highlights with new name (Supabase returns JSONB as objects)
    const parsed = typeof player.highlights === 'string' 
      ? JSON.parse(player.highlights) 
      : (player.highlights || {});
    const updatedHighlights = {
      matchHighlights: parsed.matchHighlights || [],
      bestClips: (parsed.bestClips || []).map((clip: any) => 
        clip.videoUrl === videoUrl && clip.name === oldName
          ? { ...clip, name: newName }
          : clip
      )
    };

    const { error: updateError } = await supabase
      .from('players')
      .update({ highlights: updatedHighlights })
      .eq('id', player.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to rename clip', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
