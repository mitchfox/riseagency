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
    const logo = formData.get('logo') as File | null;
    const highlightType = formData.get('highlightType') as string || 'best';

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

    // Upload video file to storage using service role
    const fileName = `${player.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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

    // Get public URL for video
    const { data: { publicUrl } } = supabase.storage
      .from('analysis-files')
      .getPublicUrl(`highlights/${fileName}`);

    // Upload logo if provided
    let logoUrl = null;
    if (logo) {
      const logoFileName = `${player.id}_${Date.now()}_logo_${logo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const logoBuffer = await logo.arrayBuffer();
      
      const { error: logoUploadError } = await supabase.storage
        .from('analysis-files')
        .upload(`highlights/logos/${logoFileName}`, logoBuffer, {
          contentType: logo.type,
          upsert: false
        });

      if (!logoUploadError) {
        const { data: { publicUrl: logoPublicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`highlights/logos/${logoFileName}`);
        logoUrl = logoPublicUrl;
      } else {
        console.error('Logo upload error:', logoUploadError);
      }
    }

    // Update player highlights (Supabase returns JSONB as objects, not strings)
    const parsed = typeof player.highlights === 'string' 
      ? JSON.parse(player.highlights) 
      : (player.highlights || {});
    const clipId = `${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newClip = {
      id: clipId,
      name: clipName,
      videoUrl: publicUrl,
      logoUrl: logoUrl,
      addedAt: new Date().toISOString()
    };

    const updatedHighlights = highlightType === 'match' 
      ? {
          matchHighlights: [...(parsed.matchHighlights || []), newClip],
          bestClips: parsed.bestClips || []
        }
      : {
          matchHighlights: parsed.matchHighlights || [],
          bestClips: [...(parsed.bestClips || []), newClip]
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
      JSON.stringify({ success: true, videoUrl: publicUrl }),
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
