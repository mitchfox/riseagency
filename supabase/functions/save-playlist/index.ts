import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { playlistId, playerEmail } = await req.json();

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('email', playerEmail)
      .single();

    if (playerError || !player) {
      throw new Error('Player not found');
    }

    // Get playlist data
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .eq('player_id', player.id)
      .single();

    if (playlistError || !playlist) {
      throw new Error('Playlist not found');
    }

    console.log('Playlist data:', JSON.stringify(playlist, null, 2));

    // Parse clips - handle both string and object formats
    let clips: Array<{ name: string; videoUrl: string; order: number }>;
    
    if (typeof playlist.clips === 'string') {
      try {
        clips = JSON.parse(playlist.clips);
      } catch (e) {
        console.error('Failed to parse clips:', e);
        throw new Error('Invalid clips data format');
      }
    } else if (Array.isArray(playlist.clips)) {
      clips = playlist.clips;
    } else {
      console.error('Clips data type:', typeof playlist.clips, playlist.clips);
      throw new Error('Clips data is not in expected format');
    }
    
    if (!clips || clips.length === 0) {
      console.error('No clips found. Clips value:', clips);
      throw new Error('No clips in playlist');
    }

    console.log('Processing', clips.length, 'clips');

    // Sort clips by order
    const sortedClips = [...clips].sort((a, b) => a.order - b.order);

    // Copy and rename files with numbered prefixes
    const results = [];
    
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const clipNumber = i + 1;
      
      // Extract the file path from the video URL
      const urlParts = clip.videoUrl.split('/analysis-files/');
      if (urlParts.length < 2) continue;
      
      const oldPath = urlParts[1];
      
      // Create new filename with number prefix
      const fileExtension = oldPath.split('.').pop();
      const newFileName = `${clipNumber}. ${clip.name}.${fileExtension}`;
      const newPath = `playlists/${player.name}/${playlist.name}/${newFileName}`;

      // Download the file
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('analysis-files')
        .download(oldPath);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${oldPath}:`, downloadError);
        continue;
      }

      // Upload to new location
      const { error: uploadError } = await supabase
        .storage
        .from('analysis-files')
        .upload(newPath, fileData, {
          contentType: fileData.type,
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${newPath}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('analysis-files')
        .getPublicUrl(newPath);

      results.push({
        originalName: clip.name,
        newName: newFileName,
        url: publicUrl,
        order: clipNumber
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clips: results,
        folderPath: `playlists/${player.name}/${playlist.name}/`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});