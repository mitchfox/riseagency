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

    // Handle both object and string formats (Supabase returns JSONB as objects)
    const parsed = typeof player.highlights === 'string' 
      ? JSON.parse(player.highlights) 
      : (player.highlights || {});
    const bestClips = parsed.bestClips || [];
    
    console.log('Delete request - clipName:', clipName);
    console.log('Delete request - videoUrl:', videoUrl);
    console.log('Available clips:', bestClips.map((c: any) => ({ name: c.name, url: c.videoUrl })));
    
    // Normalize strings for comparison (trim whitespace, normalize unicode)
    const normalizeString = (str: string) => str.trim().normalize('NFC');
    const normalizedClipName = normalizeString(clipName);
    const normalizedVideoUrl = normalizeString(videoUrl);
    
    // Find clip by name and URL with normalized comparison
    const clipIndex = bestClips.findIndex((clip: any) => 
      normalizeString(clip.name) === normalizedClipName && 
      normalizeString(clip.videoUrl) === normalizedVideoUrl
    );
    
    if (clipIndex === -1) {
      console.error('Clip not found in array');
      return new Response(
        JSON.stringify({ 
          error: 'Clip not found',
          details: {
            requestedName: clipName,
            requestedUrl: videoUrl,
            availableClips: bestClips.length
          }
        }),
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
      .update({ highlights: updatedHighlights })
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
