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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const skillSummary = skill_evaluations
      .filter((s: any) => s.notes.length > 0 || s.grade)
      .map((s: any) => `${s.skill_name} (${s.grade || 'N/A'}): ${s.notes.join('; ')}`)
      .join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional football scout. Generate a comprehensive scouting evaluation based on the skill observations provided.' },
          { role: 'user', content: `Generate a professional scouting report review for ${player_name} based on these skill evaluations:\n\n${skillSummary}\n\nProvide a cohesive paragraph that synthesizes these observations into an overall assessment.` }
        ]
      })
    });

    const data = await response.json();
    return new Response(JSON.stringify({ review: data.choices[0].message.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
