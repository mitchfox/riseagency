import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionToScore {
  action_type: string;
  action_description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actions } = await req.json() as { actions: ActionToScore[] };
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No actions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all R90 ratings from database
    const { data: ratings, error: ratingsError } = await supabase
      .from('r90_ratings')
      .select('id, title, description, content, category');

    if (ratingsError) {
      console.error('Error fetching R90 ratings:', ratingsError);
      throw new Error('Failed to fetch R90 ratings');
    }

    console.log(`Fetched ${ratings?.length || 0} R90 ratings`);

    // Process each action
    const scoredActions = [];
    
    for (const action of actions) {
      try {
        // Create a structured prompt for AI
        const systemPrompt = `You are an expert football/soccer analyst specializing in R90 performance ratings. Your task is to match player actions to the most appropriate R90 rating entry and extract the correct score.

R90 Rating Database (${ratings?.length || 0} entries):
${ratings?.map(r => `
ID: ${r.id}
Title: ${r.title}
Category: ${r.category}
Description: ${r.description || 'N/A'}
Content/Scores: ${r.content || 'N/A'}
---`).join('\n')}

Instructions:
1. Analyze the action type and description provided
2. Find the BEST matching R90 rating entry from the database above
3. Extract the appropriate numerical score from that entry's content
4. Consider context: successful vs unsuccessful, location on field, pressure situation
5. Return ONLY a valid decimal number (e.g., 0.0672, -0.0054, 0.012)
6. If no good match exists, return 0`;

        const userPrompt = `Action Type: ${action.action_type}
Action Description: ${action.action_description}

What is the appropriate R90 score for this action? Return only the numerical score.`;

        // Call Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI Gateway error:', aiResponse.status, errorText);
          scoredActions.push({ score: 0, error: 'AI service unavailable' });
          continue;
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '0';
        
        // Extract number from AI response
        const numberMatch = aiContent.match(/-?\d+\.?\d*/);
        const score = numberMatch ? parseFloat(numberMatch[0]) : 0;
        
        console.log(`Action: "${action.action_type}" -> Score: ${score}`);
        scoredActions.push({ score });
        
      } catch (actionError) {
        console.error('Error processing action:', actionError);
        scoredActions.push({ score: 0, error: 'Processing failed' });
      }
    }

    return new Response(
      JSON.stringify({ scores: scoredActions }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fill-action-scores function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        scores: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
