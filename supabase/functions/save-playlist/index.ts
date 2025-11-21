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

    // Copy and rename files with numbered prefixes (process in batches to avoid timeout)
    const results = [];
    const skipped = [];
    const BATCH_SIZE = 20;
    
    for (let batchStart = 0; batchStart < sortedClips.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, sortedClips.length);
      const batch = sortedClips.slice(batchStart, batchEnd);
      
      console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(sortedClips.length / BATCH_SIZE)} (${batch.length} clips)`);
      
      for (const clip of batch) {
        const clipNumber = sortedClips.indexOf(clip) + 1;
      
      // Extract the file path from the video URL
      const urlParts = clip.videoUrl.split('/analysis-files/');
      if (urlParts.length < 2) {
        console.log(`Skipping clip (invalid URL): ${clip.name}`);
        skipped.push({ name: clip.name, reason: 'Invalid URL format' });
        continue;
      }
      
      const oldPath = urlParts[1];
      
      // Create new filename with number prefix and safe characters
      const fileExtension = oldPath.split('.').pop();
      const safeClipName = clip.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const safePlayerName = player.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const safePlaylistName = playlist.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFileName = `${clipNumber}. ${safeClipName}.${fileExtension}`;
      const newPath = `playlists/${safePlayerName}/${safePlaylistName}/${newFileName}`;

      // Copy file to new location within the same bucket (faster than download+upload)
      const { error: copyError } = await supabase
        .storage
        .from('analysis-files')
        .copy(oldPath, newPath);

      if (copyError) {
        const status = (copyError as any).status ?? (copyError as any).statusCode;
        const message = (copyError as any).message ?? '';

        // If the file already exists at the destination, treat it as a success and reuse it
        if (status === 409 || message.includes('resource already exists')) {
          console.log(`File already exists at ${newPath}, reusing existing file.`);
        } else {
          console.error(`Failed to copy to ${newPath}:`, copyError);
          skipped.push({ name: clip.name, reason: 'Copy failed' });
          continue;
        }
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
    }

    if (results.length === 0) {
      throw new Error('No clips could be saved. All clips may have been deleted or are inaccessible.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clips: results,
        skipped: skipped,
        folderPath: `playlists/${player.name}/${playlist.name}/`,
        message: skipped.length > 0 
          ? `${results.length} clips saved, ${skipped.length} clips skipped (may have been deleted)`
          : `${results.length} clips saved successfully`
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