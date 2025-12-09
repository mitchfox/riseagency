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
    const { messages, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build dynamic system prompt based on settings
    let writingStyleDesc = '';
    switch (settings?.writingStyle) {
      case 'casual':
        writingStyleDesc = 'Use a casual, friendly, and approachable tone. Be conversational and warm.';
        break;
      case 'technical':
        writingStyleDesc = 'Be highly technical and detailed. Use precise terminology and provide in-depth explanations with specific metrics and data where relevant.';
        break;
      case 'concise':
        writingStyleDesc = 'Be extremely concise and direct. Get straight to the point with minimal explanation. Use bullet points and short sentences.';
        break;
      default:
        writingStyleDesc = 'Maintain a professional, balanced tone suitable for coaching documentation.';
    }

    let personalityDesc = '';
    switch (settings?.personality) {
      case 'analyst':
        personalityDesc = 'Approach topics from a tactical analysis perspective. Focus on patterns, formations, and strategic insights.';
        break;
      case 'mentor':
        personalityDesc = 'Be supportive and encouraging like a mentor. Focus on player development and building confidence.';
        break;
      case 'educator':
        personalityDesc = 'Take an educational approach. Explain concepts clearly, provide context, and help build understanding progressively.';
        break;
      default:
        personalityDesc = 'Respond as an experienced coach with practical, pitch-tested knowledge.';
    }

    let customInstructions = '';
    if (settings?.customInstructions) {
      customInstructions = `\n\nAdditional user instructions: ${settings.customInstructions}`;
    }

    let bannedPhrasesInstructions = '';
    if (settings?.bannedPhrases && Array.isArray(settings.bannedPhrases) && settings.bannedPhrases.length > 0) {
      bannedPhrasesInstructions = `\n\nBANNED PHRASES - NEVER use these words or phrases in your responses: ${settings.bannedPhrases.map((p: string) => `"${p}"`).join(', ')}`;
    }

    const systemPrompt = `You are an elite football/soccer coaching consultant with decades of experience at the highest levels. Your responses should be insightful, practical, and worth saving to a coaching database.

ALWAYS write in British English (UK spelling: colour, favour, defence, centre, organise, etc.).

${writingStyleDesc}

${personalityDesc}
${customInstructions}
${bannedPhrasesInstructions}

RESPONSE GUIDELINES:
- Provide substantive, well-articulated ideas that demonstrate deep coaching knowledge
- Aim for 2-4 focused paragraphs with genuine insight and practical application
- Include specific examples, coaching cues, or tactical details that make your advice actionable
- Share the "why" behind concepts - the principles that make them effective
- NEVER use markdown headers (no #, ##, ###)
- Use **bold** for key terms and important coaching points
- Use bullet points only when listing specific drill progressions, coaching points, or tactical variations
- Write as if creating valuable content for a professional coaching manual

Your expertise spans: tactical periodisation, positional play, pressing triggers, build-up patterns, transition phases, individual player development pathways, session design principles, psychological preparation, and physical conditioning for elite performance.`;



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
          ...messages
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in ai-coaching-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
