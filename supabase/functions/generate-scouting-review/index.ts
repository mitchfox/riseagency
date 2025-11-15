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
    const { skill_evaluations, player_name } = await req.json();
    
    if (!skill_evaluations || !Array.isArray(skill_evaluations)) {
      return new Response(
        JSON.stringify({ error: 'skill_evaluations must be an array' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const skillSummary = skill_evaluations
      .filter((s: any) => s.notes?.length > 0 || s.grade)
      .map((s: any) => `${s.skill_name} (${s.grade || 'N/A'}): ${s.notes?.join('; ') || 'No notes'}`)
      .join('\n');

    if (!skillSummary) {
      return new Response(
        JSON.stringify({ error: 'No skill evaluations with grades or notes found' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a professional football scout writing comprehensive player evaluations. Generate a detailed, cohesive scouting assessment based on the skill observations provided. Focus on overall player profile, key strengths, areas for development, and potential.' 
          },
          { 
            role: 'user', 
            content: `Generate a professional scouting report review for ${player_name} based on these skill evaluations:\n\n${skillSummary}\n\nProvide a comprehensive 2-3 paragraph assessment that synthesizes these observations.` 
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate review from AI service' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const review = data.choices?.[0]?.message?.content;

    if (!review) {
      return new Response(
        JSON.stringify({ error: 'No review content generated' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-scouting-review:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
