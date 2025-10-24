import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseRecoveryTime(recoveryStr: string): number | null {
  if (!recoveryStr || recoveryStr === "'-" || recoveryStr === 'Full' || recoveryStr === '""') return null;
  const match = recoveryStr.match(/(\d+)s/);
  return match ? parseInt(match[1]) : null;
}

function parseSets(setsStr: string): number | null {
  if (!setsStr || setsStr === 'x' || setsStr === '""') return null;
  const num = parseInt(setsStr);
  return isNaN(num) ? null : num;
}

function parseJSONArray(str: string): string[] {
  if (!str || str === '""') return [];
  try {
    const cleaned = str.replace(/'/g, '"');
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching CSV file...');
    // Try to fetch from the public URL
    const baseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace('//', '//qwethimbtaamlhbajmal.');
    const csvUrl = `${baseUrl.replace('supabase.co', 'lovableproject.com')}/exercise-import-2025.csv`;
    
    console.log(`Attempting to fetch from: ${csvUrl}`);
    const csvResponse = await fetch(csvUrl);
    
    if (!csvResponse.ok) {
      console.error(`Failed to fetch CSV: ${csvResponse.status} ${csvResponse.statusText}`);
      throw new Error(`Failed to fetch CSV file: ${csvResponse.status}`);
    }
    
    const csvText = await csvResponse.text();
    console.log(`Fetched CSV with ${csvText.length} characters`);

    console.log('Parsing CSV...');
    const lines = csvText.split('\n');
    const exercises: any[] = [];

    // Clear existing exercises
    console.log('Clearing existing exercises...');
    await supabaseClient.from('coaching_exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV with proper quote handling
        const columns: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            columns.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        columns.push(current.trim());

        if (columns.length < 10) continue;

        const title = columns[2]?.trim();
        if (!title) continue;

        const description = columns[3]?.trim() || null;
        const reps = columns[4]?.trim() || null;
        const sets = parseSets(columns[5]?.trim());
        const restTime = parseRecoveryTime(columns[7]?.trim());
        const typeArray = parseJSONArray(columns[8]);
        const muscleArray = parseJSONArray(columns[9]);

        const category = typeArray[0] || null;
        const tags = [...typeArray, ...muscleArray];

        exercises.push({
          title,
          description,
          content: null,
          reps,
          sets,
          rest_time: restTime,
          category,
          tags: tags.length > 0 ? tags : null,
        });

        // Insert in batches of 100
        if (exercises.length === 100) {
          console.log(`Inserting batch of ${exercises.length} exercises...`);
          const { error } = await supabaseClient.from('coaching_exercises').insert(exercises);

          if (error) {
            console.error('Error inserting batch:', error);
          } else {
            console.log(`Successfully inserted ${exercises.length} exercises`);
          }
          exercises.length = 0;
        }
      } catch (error) {
        console.error(`Error parsing line ${i}:`, error);
      }
    }

    // Insert remaining exercises
    if (exercises.length > 0) {
      console.log(`Inserting final batch of ${exercises.length} exercises...`);
      const { error } = await supabaseClient.from('coaching_exercises').insert(exercises);

      if (error) {
        console.error('Error inserting final batch:', error);
      } else {
        console.log(`Successfully inserted ${exercises.length} exercises`);
      }
    }

    // Get final count
    const { count } = await supabaseClient
      .from('coaching_exercises')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Import complete! Total exercises in database: ${count}`,
        count 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
