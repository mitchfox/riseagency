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
    const { actionType, actionContext, ratings } = await req.json();
    
    if (!actionType) {
      return new Response(
        JSON.stringify({ error: 'Action type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create a detailed prompt for the AI
    const ratingsContext = ratings.map((r: any, idx: number) => 
      `${idx + 1}. ${r.title} (${r.category || 'Uncategorized'})\n   Description: ${r.description || 'N/A'}\n   Details: ${r.content?.substring(0, 200) || 'N/A'}...`
    ).join('\n\n');

    const systemPrompt = `You are an expert football analyst helping to match player actions to R90 rating criteria. 
Your task is to analyze the action type and context provided, then identify the most relevant R90 ratings from the database.

CRITICAL: ALWAYS return 3-5 results, even if they're not perfect matches. Some guidance is better than none.

Matching strategy:
1. First, look for exact or near-exact matches (action type + context)
2. If no exact matches, broaden to the same action type with ANY context (e.g., "pass backward" → show all "pass" ratings)
3. If still limited, include related actions in the same category (e.g., "pass" → include "through ball", "cross")
4. Prioritize by relevance, but ALWAYS return at least 3 results if available in the database

Consider:
- Action type (e.g., pass, tackle, dribble)
- Context details (e.g., under pressure, in space, direction, successful/unsuccessful)
- The phase of play and area of the pitch
- Related or similar actions that could still provide useful guidance

Return a JSON array of 3-5 most relevant rating IDs, ordered by relevance.`;

    const userPrompt = `Action Type: ${actionType}
${actionContext ? `Context: ${actionContext}` : ''}

Available R90 Ratings:
${ratingsContext}

Analyze this action and return the IDs of the most relevant R90 ratings. Consider all contextual factors.`;

    // Call Lovable AI
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
            name: 'return_matching_ratings',
            description: 'Return the IDs of R90 ratings that match the action description',
            parameters: {
              type: 'object',
              properties: {
                matchedRatings: {
                  type: 'array',
                  description: 'Array of matched rating objects with their IDs and relevance reasoning',
                  items: {
                    type: 'object',
                    properties: {
                      id: { 
                        type: 'string',
                        description: 'The UUID of the matched R90 rating'
                      },
                      reasoning: {
                        type: 'string',
                        description: 'Brief explanation of why this rating matches the action'
                      }
                    },
                    required: ['id', 'reasoning']
                  }
                }
              },
              required: ['matchedRatings']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_matching_ratings' } }
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
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
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
      console.error('No tool call in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ matchedRatings: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in find-r90-rating:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});