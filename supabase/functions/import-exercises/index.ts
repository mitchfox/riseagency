import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const sanitizeText = (text: string): string => {
  if (!text) return '';
  // Remove potential CSV injection characters and limit length
  return text.replace(/^[=+\-@]/g, '').slice(0, 2000).trim();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user has staff role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['staff', 'admin'])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SERVICE_ROLE_KEY for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let text = '';
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      text = await file.text();
    } else {
      // Accept raw CSV content in request body
      text = await req.text();
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'No CSV content provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate size
      if (text.length > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: 'Content too large. Maximum size is 5MB.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      const exerciseName = sanitizeText(fields[2]);
      const description = sanitizeText(fields[3] || '');
      const reps = sanitizeText(fields[4] || '');
      const sets = fields[5] ? parseInt(fields[5]) : null;
      const load = sanitizeText(fields[6] || '');
      const restTime = fields[7] || null;
      const typeStr = fields[8] || '[]';
      const muscleGroupStr = fields[9] || '[]';
      
      // Parse JSON arrays from string
      let types: string[] = [];
      let muscleGroups: string[] = [];
      
      try {
        const parsed = JSON.parse(typeStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
        types = Array.isArray(parsed) ? parsed.map(t => sanitizeText(t)) : [];
      } catch (e) {
        types = [];
      }
      
      try {
        const parsed = JSON.parse(muscleGroupStr.replace(/\[""/, '["').replace(/""\]/, '"]'));
        muscleGroups = Array.isArray(parsed) ? parsed.map(m => sanitizeText(m)) : [];
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
    const { data: existing, error: fetchError } = await serviceClient
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
        const { error: insertError } = await serviceClient
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
    console.error('Error in import-exercises function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to import exercises. Please check the file format.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});