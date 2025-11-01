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

    const { playerEmail, clipName, videoUrl } = await req.json();

    if (!playerEmail || !clipName || !videoUrl) {
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

    const parsed = player.highlights ? JSON.parse(player.highlights) : {};
    const bestClips = parsed.bestClips || [];
    
    // Find clip by name and URL
    const clipIndex = bestClips.findIndex((clip: any) => 
      clip.name === clipName && clip.videoUrl === videoUrl
    );
    
    if (clipIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Clip not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clipToDelete = bestClips[clipIndex];
    
    // Extract file path from URL
    const urlParts = clipToDelete.videoUrl.split('/highlights/');
    if (urlParts.length === 2) {
      const filePath = `highlights/${urlParts[1].split('?')[0]}`;
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('analysis-files')
        .remove([filePath]);
      
      if (deleteError) {
        console.error('Storage delete error:', deleteError);
      }
    }

    // Remove clip from array
    bestClips.splice(clipIndex, 1);
    
    const updatedHighlights = {
      matchHighlights: parsed.matchHighlights || [],
      bestClips: bestClips
    };

    const { error: updateError } = await supabase
      .from('players')
      .update({ highlights: JSON.stringify(updatedHighlights) })
      .eq('id', player.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update player data', details: updateError.message }),
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
