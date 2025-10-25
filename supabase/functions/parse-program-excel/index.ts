import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for Excel files

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
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type (accept Excel and CSV files)
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'text/csv',
      'application/csv',
      'text/plain' // Some browsers send CSV as text/plain
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|xlsm|csv)$/i)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Read file content directly
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const extractedText = decoder.decode(arrayBuffer);
    
    console.log('Extracted text length:', extractedText.length);
    console.log('First 500 characters:', extractedText.substring(0, 500));

    // Use Lovable AI to extract structured program data
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
             content: `You are a sports programming assistant. Extract structured training program data from the provided text. 
The program should have:
- Phase information (name, dates)
- Overview text
- Sessions A-H with exercises (name, description, reps, sets, load, recovery time, video URL if any)
- Pre-sessions (PRE-A through PRE-H) with exercises if present
- Weekly schedules with activities for each day and colors
- Testing protocols

Format the output as a JSON object with this structure:
{
  "phaseName": "string",
  "phaseDates": "string",
  "overviewText": "string",
  "sessions": {
    "sessionA": { "exercises": [{ "name": "", "description": "", "repetitions": "", "sets": "", "load": "", "recoveryTime": "", "videoUrl": "" }] },
    "sessionB": { "exercises": [] },
    ... (up to sessionH),
    "PRE-A": { "exercises": [] },
    "PRE-B": { "exercises": [] },
    ... (up to PRE-H if present)
  },
  "weeklySchedules": [
    {
      "week": "Week 1",
      "week_start_date": "2025-10-27",
      "monday": "Activity", "tuesday": "", "wednesday": "", "thursday": "", "friday": "", "saturday": "", "sunday": "",
      "mondayColor": "blue", "tuesdayColor": "", ... (colors can be: red, blue, green, yellow, purple, orange, gray),
      "scheduleNotes": "Notes for this week"
    }
  ],
  "testing": "Testing protocols text"
}

CRITICAL: Always extract week_start_date for each weekly schedule entry. Parse dates from the document.
If certain data is not present in the document, use empty strings or empty arrays. Be thorough in extracting all exercises and details including PRE sessions.`
          },
          {
            role: 'user',
            content: `Extract the training program data from this document:\n\n${extractedText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_program_data',
              description: 'Extract structured training program data',
              parameters: {
                type: 'object',
                properties: {
                  phaseName: { type: 'string' },
                  phaseDates: { type: 'string' },
                  overviewText: { type: 'string' },
                  sessions: {
                    type: 'object',
                    properties: {
                      sessionA: { 
                        type: 'object',
                        properties: {
                          exercises: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                description: { type: 'string' },
                                repetitions: { type: 'string' },
                                sets: { type: 'string' },
                                load: { type: 'string' },
                                recoveryTime: { type: 'string' },
                                videoUrl: { type: 'string' }
                              }
                            }
                          }
                        }
                      },
                      sessionB: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionC: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionD: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionE: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionF: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionG: { type: 'object', properties: { exercises: { type: 'array' } } },
                      sessionH: { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-A': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-B': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-C': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-D': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-E': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-F': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-G': { type: 'object', properties: { exercises: { type: 'array' } } },
                      'PRE-H': { type: 'object', properties: { exercises: { type: 'array' } } }
                    }
                  },
                  weeklySchedules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        week: { type: 'string' },
                        week_start_date: { type: 'string' },
                        monday: { type: 'string' },
                        tuesday: { type: 'string' },
                        wednesday: { type: 'string' },
                        thursday: { type: 'string' },
                        friday: { type: 'string' },
                        saturday: { type: 'string' },
                        sunday: { type: 'string' },
                        mondayColor: { type: 'string' },
                        tuesdayColor: { type: 'string' },
                        wednesdayColor: { type: 'string' },
                        thursdayColor: { type: 'string' },
                        fridayColor: { type: 'string' },
                        saturdayColor: { type: 'string' },
                        sundayColor: { type: 'string' },
                        scheduleNotes: { type: 'string' }
                      }
                    }
                  },
                  testing: { type: 'string' }
                },
                required: ['phaseName', 'sessions', 'weeklySchedules']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_program_data' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiResult));

    // Extract the tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'Failed to extract structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const programData = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ success: true, data: programData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in parse-program-excel function:', error);
    
    let errorMessage = 'Failed to process the file. Please check the file format.';
    let statusCode = 500;
    
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg.includes('rate limit')) {
      errorMessage = 'Too many requests. Please try again later.';
      statusCode = 429;
    } else if (errMsg.includes('payment required')) {
      errorMessage = 'Service temporarily unavailable';
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});