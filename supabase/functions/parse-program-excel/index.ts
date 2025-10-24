import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Convert file to base64 for the document parser
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    // Parse the Excel file using Lovable's document parser
    const parseResponse = await fetch('https://api.lovable.app/document-parser/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        filename: file.name,
      }),
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error('Document parser error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = await parseResponse.json();
    const extractedText = parsedData.text || '';
    
    console.log('Extracted text length:', extractedText.length);

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
    ... (up to sessionH)
  },
  "weeklySchedules": [
    {
      "week": "Week 1",
      "monday": "Activity", "tuesday": "", "wednesday": "", "thursday": "", "friday": "", "saturday": "", "sunday": "",
      "mondayColor": "blue", "tuesdayColor": "", ... (colors can be: red, blue, green, yellow, purple, orange, gray),
      "scheduleNotes": "Notes for this week"
    }
  ],
  "testing": "Testing protocols text"
}

If certain data is not present in the document, use empty strings or empty arrays. Be thorough in extracting all exercises and details.`
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
                      sessionH: { type: 'object', properties: { exercises: { type: 'array' } } }
                    }
                  },
                  weeklySchedules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        week: { type: 'string' },
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
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiResult));

    // Extract the tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'AI did not return structured data' }),
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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
