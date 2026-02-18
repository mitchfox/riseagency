import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clubs } = await req.json();
    
    if (!clubs || !Array.isArray(clubs) || clubs.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const clubList = clubs.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n');

    const systemPrompt = `You are an expert football/soccer analyst. Given a list of football club names, identify the country each club is from.

Rules:
- Youth teams (U19, U21, U23, B team, II, reserves) belong to the same country as their parent/first team.
- If a club name contains accented characters, treat it as the same club as the unaccented version.
- Use the most common English name for the country (e.g. "England" not "United Kingdom" for English clubs, "Scotland" for Scottish clubs).
- For clubs you truly cannot identify, use "Unknown".
- Be confident - most professional and semi-professional clubs worldwide are identifiable.`;

    const userPrompt = `Identify the country for each of these football clubs:\n\n${clubList}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_club_countries',
            description: 'Return the country for each club',
            parameters: {
              type: 'object',
              properties: {
                clubs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'The club name as provided' },
                      country: { type: 'string', description: 'The country the club is from' }
                    },
                    required: ['name', 'country']
                  }
                }
              },
              required: ['clubs']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_club_countries' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ results: result.clubs || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in detect-club-countries:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to detect countries' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
