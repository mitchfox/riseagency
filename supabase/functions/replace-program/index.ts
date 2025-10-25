import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { programId, csvContent, playerId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse CSV
    const lines = csvContent.split("\n").filter((line: string) => line.trim());
    const headers = lines[0].split(",").map((h: string) => h.replace(/^"|"$/g, "").trim());

    let phaseName = "";
    let phaseDates = "";
    let overviewText = "";
    let scheduleNotes = "";
    const sessions: any = {};
    const weeklySchedules: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const sessionCol = values[0] || "";
      
      // Overview row
      if (sessionCol.includes('"Overview"')) {
        phaseName = values[8] || "";
        phaseDates = values[9] || "";
        overviewText = values[12] || "";
      }

      // Schedule Details row
      if (sessionCol.includes('"Schedule Details"')) {
        scheduleNotes = values[27] || "";
      }

      // Schedule row
      if (sessionCol.includes('"Schedule"') && !sessionCol.includes('"Schedule Details"')) {
        const weekDate = values[13] || "";
        const schedule: any = { week: weekDate, days: {} };
        
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        for (let d = 0; d < 7; d++) {
          const sessionValue = values[14 + d] || "";
          const colorValue = values[21 + d] || "";
          if (sessionValue) {
            const sessionMatch = sessionValue.match(/>(.*?)</);
            schedule.days[dayNames[d].toLowerCase()] = {
              session: sessionMatch ? sessionMatch[1] : sessionValue,
              color: colorValue
            };
          }
        }
        
        schedule.notes = values[27] || "";
        weeklySchedules.push(schedule);
      }

      // Exercise rows
      const sessionMatch = sessionCol.match(/\["\"([A-Z][^"]*)""\]/);
      if (sessionMatch) {
        const sessionKey = sessionMatch[1];
        if (!sessions[sessionKey]) {
          sessions[sessionKey] = { exercises: [] };
        }
        
        const exerciseName = values[1] || "";
        if (exerciseName && !sessionCol.includes("Overview") && !sessionCol.includes("Schedule") && !sessionCol.includes("Testing")) {
          sessions[sessionKey].exercises.push({
            name: exerciseName,
            description: values[2] || "",
            reps: values[3] || "",
            sets: values[4] || "",
            load: values[5] || "",
            rest: values[6] || "",
            videoUrl: values[7] || ""
          });
        }
      }
    }

    // Delete old program
    await supabase.from("player_programs").delete().eq("id", programId);

    // Insert new program
    const { data, error } = await supabase.from("player_programs").insert({
      player_id: playerId,
      program_name: "November 2025",
      phase_name: phaseName,
      phase_dates: phaseDates,
      overview_text: overviewText,
      schedule_notes: scheduleNotes,
      sessions,
      weekly_schedules: weeklySchedules,
      is_current: false
    }).select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
