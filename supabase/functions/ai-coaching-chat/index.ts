import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWritingExamples(supabase: any): Promise<string> {
  try {
    // Fetch recent coaching analysis content as examples
    const { data: analyses } = await supabase
      .from('coaching_analysis')
      .select('content, description')
      .not('content', 'is', null)
      .limit(3);

    // Fetch analysis point examples
    const { data: examples } = await supabase
      .from('analysis_point_examples')
      .select('content, paragraph_1, paragraph_2')
      .limit(3);

    // Fetch positional guide content
    const { data: guides } = await supabase
      .from('positional_guides')
      .select('content')
      .not('content', 'is', null)
      .limit(2);

    let examplesText = '';
    
    if (analyses?.length || examples?.length || guides?.length) {
      examplesText = '\n\nWRITING STYLE EXAMPLES FROM DATABASE - Match this tone and style:\n';
      
      analyses?.forEach((a: any, i: number) => {
        if (a.content) examplesText += `\nExample ${i + 1}:\n${a.content.substring(0, 500)}...\n`;
      });
      
      examples?.forEach((e: any) => {
        if (e.paragraph_1) examplesText += `\nExample:\n${e.paragraph_1}\n`;
        if (e.paragraph_2) examplesText += `${e.paragraph_2}\n`;
      });
      
      guides?.forEach((g: any) => {
        if (g.content) examplesText += `\nExample:\n${g.content.substring(0, 400)}...\n`;
      });
    }
    
    return examplesText;
  } catch (error) {
    console.error('Error fetching writing examples:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create Supabase client to fetch examples
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const writingExamples = await fetchWritingExamples(supabase);

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
      const phraseList = settings.bannedPhrases.map((p: string) => `"${p}"`).join(', ');
      bannedPhrasesInstructions = `\n\n⛔ ABSOLUTELY FORBIDDEN PHRASES - YOU MUST NEVER USE THESE UNDER ANY CIRCUMSTANCES ⛔\nThe following phrases are STRICTLY BANNED. Do not use them or any variation of them: ${phraseList}\nIf you catch yourself about to write any of these phrases, STOP and rephrase completely. This is a hard requirement.`;
    }

    const systemPrompt = `You are an elite football coaching consultant with decades of experience at the highest levels. You've worked with top academies and first teams. Your responses should be insightful, practical, and worth saving to a coaching database.

ALWAYS write in British English (UK spelling: colour, favour, defence, centre, organise, etc.).

${writingStyleDesc}

${personalityDesc}
${customInstructions}
${bannedPhrasesInstructions}
${writingExamples}

CRITICAL - WRITE LIKE A REAL COACH, NOT AN AI:
- Write with authority and conviction - state things directly, don't hedge everything
- Use specific coaching terminology and real tactical language
- Reference real-world examples, formations, and scenarios
- Avoid generic filler phrases and empty superlatives
- Don't start responses with "Great question!" or similar pleasantries
- Don't say "I'd be happy to" or "Certainly!" - just answer
- Avoid words like: crucial, robust, comprehensive, holistic, synergy, leverage, utilise, facilitate
- Never use phrases like: "at the end of the day", "in terms of", "with that being said"
- Don't over-explain or pad responses - be direct and economical with words
- Write like you're talking to another coach, not explaining to a child
- STUDY THE WRITING EXAMPLES ABOVE AND MATCH THAT EXACT STYLE AND TONE

RESPONSE FORMAT:
- Provide substantive, well-articulated ideas that demonstrate deep coaching knowledge
- Aim for 2-4 focused paragraphs with genuine insight and practical application
- Include specific examples, coaching cues, or tactical details
- Share the "why" behind concepts - the principles that make them effective
- NEVER use markdown headers (no #, ##, ###)
- Use **bold** for key terms and important coaching points
- Use bullet points only when listing specific drill progressions, coaching points, or tactical variations

Your expertise spans: tactical periodisation, positional play, pressing triggers, build-up patterns, transition phases, individual player development pathways, session design principles, psychological preparation, and physical conditioning.`;



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
