import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      throw new Error('No file provided');
    }

    // Get PDF as base64 - process in chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binaryString);

    // Use Lovable AI to parse the PDF
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a sports analysis document parser. Extract content from opposition analysis PDFs.

Structure:
- Page 2: Contains the OVERVIEW (one main longer paragraph)
- Page 3: Contains the SCHEME with paragraph 1 and paragraph 2 (ignore the title)
- Pages 4+: Each page contains one POINT with paragraph 1 and paragraph 2

Return ONLY valid JSON in this exact format:
{
  "overview": {
    "title": "extracted title or generated from content",
    "content": "the main paragraph from page 2"
  },
  "scheme": {
    "title": "extracted title or generated from content",
    "paragraph_1": "first paragraph from page 3",
    "paragraph_2": "second paragraph from page 3"
  },
  "points": [
    {
      "title": "extracted title or generated from content",
      "paragraph_1": "first paragraph",
      "paragraph_2": "second paragraph"
    }
  ]
}

Important:
- Generate concise titles if not explicitly stated
- Extract full paragraphs accurately
- Include all points from pages 4+
- Return ONLY the JSON object, no other text`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Parse this opposition analysis PDF and extract all content according to the structure.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Clean up the response to get pure JSON
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(jsonContent);

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let addedCount = 0;

    // Insert overview
    if (parsed.overview) {
      const { error } = await supabase.from('analysis_point_examples').insert({
        example_type: 'overview',
        category: 'pre-match',
        title: parsed.overview.title,
        content: parsed.overview.content,
      });
      if (!error) addedCount++;
    }

    // Insert scheme
    if (parsed.scheme) {
      const { error } = await supabase.from('analysis_point_examples').insert({
        example_type: 'point',
        category: 'scheme',
        title: parsed.scheme.title,
        paragraph_1: parsed.scheme.paragraph_1,
        paragraph_2: parsed.scheme.paragraph_2,
      });
      if (!error) addedCount++;
    }

    // Insert points
    if (parsed.points && Array.isArray(parsed.points)) {
      for (const point of parsed.points) {
        const { error } = await supabase.from('analysis_point_examples').insert({
          example_type: 'point',
          category: 'pre-match',
          title: point.title,
          paragraph_1: point.paragraph_1,
          paragraph_2: point.paragraph_2,
        });
        if (!error) addedCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        added: addedCount,
        parsed: parsed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
