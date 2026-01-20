import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { prompt, context, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompts based on type
    let systemPrompt = '';
    if (type === 'program-overview') {
      systemPrompt = `You are a professional strength and conditioning coach writing a program overview. 
Write clear, professional training program overviews that explain:
- The phase goals and focus areas
- Training methodology and approach
- Key principles being applied
- What the athlete should expect

Keep it concise (3-4 paragraphs), professional, and motivating. Use proper coaching terminology.`;
    } else if (type === 'analysis-paragraph') {
      systemPrompt = `You are a professional football analyst rewriting content in a specific writing style.

CRITICAL RULES:
1. You are ONLY reformatting/restyling existing content - NOT creating new analysis points
2. The user will provide SOURCE CONTENT (the points/facts to include) and STYLE EXAMPLES (how to write)
3. Keep ALL the same tactical points, observations, and facts from the source content
4. Apply ONLY the writing style, tone, vocabulary, and sentence structure from the examples
5. Do NOT add new tactical insights, observations, or points that weren't in the source
6. Do NOT remove or skip any points from the source content
7. Use proper football/soccer terminology

Your job is essentially to be a copy editor - same substance, polished presentation matching the style examples.
Keep paragraphs focused and 3-5 sentences long.`;
    } else if (type === 'analysis-overview') {
      systemPrompt = `You are a professional football analyst writing a summary paragraph.

CRITICAL RULES:
1. You are SUMMARIZING existing analysis points - NOT creating new analysis
2. The user will provide POINTS TO SUMMARIZE (the content) and STYLE EXAMPLES (how to write)
3. Include ALL key observations and tactical points from the provided content
4. Do NOT add new insights, statistics, or tactical observations that weren't in the source points
5. Do NOT skip or omit important points from the source content
6. Apply ONLY the writing style, tone, and vocabulary from the examples
7. Condense the multiple points into one cohesive paragraph while preserving all key information

Your job is to synthesize existing content into a polished summary - same substance, cohesive presentation.
Keep the overview to one focused paragraph.`;
    } else if (type === 'analysis-point-title') {
      systemPrompt = `You are a professional football analyst creating concise analysis section titles.
Create clear, professional titles (2-5 words) that capture the key tactical concept or area of focus.
Examples: "Defensive Positioning", "Pressing Triggers", "Ball Progression", "Creating Space"`;
    } else if (type === 'recruitment-message') {
      systemPrompt = `You are a professional football recruitment specialist writing outreach messages.
Write compelling, personalized messages that:
- Build rapport and establish connection
- Highlight relevant opportunities or value propositions
- Use appropriate tone for the recipient (player, parent, agent, technical director, scout, manager)
- Include specific details provided in the context
- Are concise yet informative (2-4 paragraphs)
- End with a clear call to action or next steps

Maintain professionalism while being warm and approachable. Avoid being overly salesy or generic.`;
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context ? `${context}\n\n${prompt}` : prompt }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings > Workspace > Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ text: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-write function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
