import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await file.text();
    const lines = text.split('\n');
    const exercises = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handling quoted fields)
      const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      if (!matches || matches.length < 9) continue;
      
      const fields = matches.map(m => m.replace(/^"|"$/g, '').trim());
      
      const videoUrl = fields[0] || null;
      const exerciseName = fields[2];
      const description = fields[3] || null;
      const reps = fields[4] || null;
      const sets = fields[5] ? parseInt(fields[5]) : null;
      const load = fields[6] || null;
      const restTime = fields[7] || null;
      const typeStr = fields[8] || '[]';
      const muscleGroupStr = fields[9] || '[]';
      
      // Parse JSON arrays from string
      let types: string[] = [];
      let muscleGroups: string[] = [];
      
      try {
        const parsed = JSON.parse(typeStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
        types = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        types = [];
      }
      
      try {
        const parsed = JSON.parse(muscleGroupStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
        muscleGroups = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        muscleGroups = [];
      }
      
      // Determine category based on types
      let category = types.length > 0 ? types[0] : 'General';
      
      // Convert rest time to seconds
      let restSeconds = null;
      if (restTime && restTime !== "'-") {
        const match = restTime.match(/(\d+)s/);
        if (match) {
          restSeconds = parseInt(match[1]);
        }
      }
      
      exercises.push({
        title: exerciseName,
        description: description,
        content: `**Muscle Groups:** ${muscleGroups.join(', ') || 'N/A'}\n\n**Types:** ${types.join(', ') || 'N/A'}`,
        sets: sets,
        reps: reps || null,
        rest_time: restSeconds,
        category: category,
        tags: [...types, ...muscleGroups],
        attachments: videoUrl ? [{ type: 'video', url: videoUrl }] : []
      });
    }

    console.log(`Parsed ${exercises.length} exercises`);

    // Check for existing exercises and only insert new ones
    const { data: existing, error: fetchError } = await supabaseClient
      .from('coaching_exercises')
      .select('title');
    
    if (fetchError) {
      console.error('Error fetching existing exercises:', fetchError);
      throw fetchError;
    }

    const existingTitles = new Set(existing?.map(e => e.title) || []);
    const newExercises = exercises.filter(e => !existingTitles.has(e.title));
    
    console.log(`Found ${existingTitles.size} existing exercises, importing ${newExercises.length} new ones`);

    if (newExercises.length > 0) {
      // Insert in batches of 100
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < newExercises.length; i += batchSize) {
        const batch = newExercises.slice(i, i + batchSize);
        const { error: insertError } = await supabaseClient
          .from('coaching_exercises')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting batch:', insertError);
          throw insertError;
        }
        
        imported += batch.length;
        console.log(`Imported ${imported}/${newExercises.length} exercises`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: exercises.length,
        existing: existingTitles.size,
        imported: newExercises.length,
        skipped: exercises.length - newExercises.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
