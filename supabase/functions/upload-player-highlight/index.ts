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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const playerEmail = formData.get('playerEmail') as string;
    const clipName = formData.get('clipName') as string;

    if (!file || !playerEmail || !clipName) {
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

    // Upload file to storage using service role
    const fileName = `${player.id}_${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('analysis-files')
      .upload(`highlights/${fileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Upload failed', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('analysis-files')
      .getPublicUrl(`highlights/${fileName}`);

    // Update player highlights
    const parsed = player.highlights ? JSON.parse(player.highlights) : {};
    const updatedHighlights = {
      matchHighlights: parsed.matchHighlights || [],
      bestClips: [
        ...(parsed.bestClips || []),
        {
          name: clipName,
          videoUrl: publicUrl,
          addedAt: new Date().toISOString()
        }
      ]
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
      JSON.stringify({ success: true, videoUrl: publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
