import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const sanitizeText = (text: string): string => {
  if (!text) return '';
  // Remove potential CSV injection characters and limit length
  return text.replace(/^[=+\-@]/g, '').slice(0, 5000).trim();
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const playerId = formData.get('playerId') as string;
    const programName = formData.get('programName') as string || 'Training Program';
    
    // Validate file size
    if (file && file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!file || !playerId) {
      return new Response(
        JSON.stringify({ error: 'File and playerId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read CSV file
    const csvText = await file.text();
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Parse CSV (simple parser)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const rows = lines.map(parseCSVLine);
    const headers = rows[0];
    
    // Find column indices - ignore irrelevant columns like "session colour"
    const getColIndex = (name: string) => {
      const index = headers.findIndex(h => {
        const headerLower = h.toLowerCase();
        // Skip irrelevant columns
        if (headerLower.includes('colour') || headerLower.includes('color')) return false;
        return headerLower.includes(name.toLowerCase());
      });
      return index;
    };
    
    const sessionIdx = getColIndex('session');
    const exerciseNameIdx = getColIndex('exercise name');
    const descriptionIdx = getColIndex('exercise description');
    const repsIdx = getColIndex('repetitions');
    const setsIdx = getColIndex('sets');
    const loadIdx = getColIndex('load');
    const recoveryIdx = getColIndex('recovery time');
    const videoIdx = getColIndex('video explanation');
    const phaseNameIdx = getColIndex('phase name');
    const phaseDatesIdx = getColIndex('phase dates');
    const overviewIdx = getColIndex('overview');
    const weekIdx = getColIndex('week');
    const notesIdx = getColIndex('notes');
    
    // Days
    const mondayIdx = getColIndex('monday');
    const tuesdayIdx = getColIndex('tuesday');
    const wednesdayIdx = getColIndex('wednesday');
    const thursdayIdx = getColIndex('thursday');
    const fridayIdx = getColIndex('friday');
    const saturdayIdx = getColIndex('saturday');
    const sundayIdx = getColIndex('sunday');
    
    // Extract data
    const sessions: Record<string, any[]> = {};
    const weeklySchedules: any[] = [];
    let phaseName = '';
    let phaseDates = '';
    let overviewText = '';
    let scheduleNotes = '';
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Extract phase info (appears once) with sanitization
      if (!phaseName && row[phaseNameIdx]) {
        phaseName = sanitizeText(row[phaseNameIdx]);
      }
      if (!phaseDates && row[phaseDatesIdx]) {
        phaseDates = sanitizeText(row[phaseDatesIdx]);
      }
      if (!overviewText && row[overviewIdx]) {
        overviewText = sanitizeText(row[overviewIdx]);
      }
      if (!scheduleNotes && row[notesIdx] && row[notesIdx] !== "'-") {
        scheduleNotes = sanitizeText(row[notesIdx]);
      }
      
      // Parse session/exercise data
      const sessionCell = row[sessionIdx];
      const exerciseName = row[exerciseNameIdx];
      
      if (sessionCell && exerciseName) {
        // Parse session label (could be ["A"], ["Pre-B"], ["Schedule"])
        const sessionMatch = sessionCell.match(/\["([^"]+)"\]/);
        if (sessionMatch) {
          const sessionLabel = sessionMatch[1];
          
          if (sessionLabel === 'Schedule') {
            // This is a weekly schedule row
            const week = row[weekIdx];
            if (week) {
              weeklySchedules.push({
                week: sanitizeText(week),
                monday: sanitizeText(row[mondayIdx] || ''),
                tuesday: sanitizeText(row[tuesdayIdx] || ''),
                wednesday: sanitizeText(row[wednesdayIdx] || ''),
                thursday: sanitizeText(row[thursdayIdx] || ''),
                friday: sanitizeText(row[fridayIdx] || ''),
                saturday: sanitizeText(row[saturdayIdx] || ''),
                sunday: sanitizeText(row[sundayIdx] || '')
              });
            }
          } else {
            // This is an exercise
            if (!sessions[sessionLabel]) {
              sessions[sessionLabel] = [];
            }
            
            sessions[sessionLabel].push({
              name: sanitizeText(exerciseName),
              description: sanitizeText(row[descriptionIdx] || ''),
              repetitions: sanitizeText(row[repsIdx] || ''),
              sets: sanitizeText(row[setsIdx] || ''),
              load: sanitizeText(row[loadIdx] || ''),
              recoveryTime: sanitizeText(row[recoveryIdx] || ''),
              videoUrl: row[videoIdx] || ''
            });
          }
        }
      }
    }
    
    // Use SERVICE_ROLE_KEY for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Insert program
    const { data, error } = await supabase
      .from('player_programs')
      .insert({
        player_id: playerId,
        program_name: sanitizeText(programName),
        phase_name: phaseName,
        phase_dates: phaseDates,
        overview_text: overviewText,
        schedule_notes: scheduleNotes,
        sessions: sessions,
        weekly_schedules: weeklySchedules,
        is_current: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save program' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing program:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to import program. Please check the file format.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});