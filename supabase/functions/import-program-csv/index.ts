import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const playerId = formData.get('playerId') as string;
    const programName = formData.get('programName') as string || 'Training Program';
    
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
    
    // Find column indices
    const getColIndex = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    
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
      
      // Extract phase info (appears once)
      if (!phaseName && row[phaseNameIdx]) {
        phaseName = row[phaseNameIdx];
      }
      if (!phaseDates && row[phaseDatesIdx]) {
        phaseDates = row[phaseDatesIdx];
      }
      if (!overviewText && row[overviewIdx]) {
        overviewText = row[overviewIdx];
      }
      if (!scheduleNotes && row[notesIdx] && row[notesIdx] !== "'-") {
        scheduleNotes = row[notesIdx];
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
                week,
                monday: row[mondayIdx] || '',
                tuesday: row[tuesdayIdx] || '',
                wednesday: row[wednesdayIdx] || '',
                thursday: row[thursdayIdx] || '',
                friday: row[fridayIdx] || '',
                saturday: row[saturdayIdx] || '',
                sunday: row[sundayIdx] || ''
              });
            }
          } else {
            // This is an exercise
            if (!sessions[sessionLabel]) {
              sessions[sessionLabel] = [];
            }
            
            sessions[sessionLabel].push({
              name: exerciseName,
              description: row[descriptionIdx] || '',
              repetitions: row[repsIdx] || '',
              sets: row[setsIdx] || '',
              load: row[loadIdx] || '',
              recoveryTime: row[recoveryIdx] || '',
              videoUrl: row[videoIdx] || ''
            });
          }
        }
      }
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Insert program
    const { data, error } = await supabase
      .from('player_programs')
      .insert({
        player_id: playerId,
        program_name: programName,
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
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
