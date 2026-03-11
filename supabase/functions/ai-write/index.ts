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
      systemPrompt = `You are a professional football analyst who ONLY reformats existing text to match a specific writing style.

LANGUAGE: You MUST write in British English at all times. Use UK spellings throughout: colour, favour, defence, centre, organise, recognised, analysed, behaviour, etc. Never use American spellings.

CRITICAL RULE - YOU ARE A COPY EDITOR, NOT A WRITER:
- The user provides SOURCE CONTENT (the facts/observations they wrote)
- The user provides STYLE EXAMPLES (how they want it to sound)
- Your ONLY job is to rewrite the source content using the style/voice from the examples
- You are NOT analysing football - you are reformatting text the user already wrote

HOW TO USE THE STYLE EXAMPLES:
- Study the EXACT words, phrases, and sentence structures used in the examples
- Copy the same types of expressions, adjectives, and coaching language
- Match the paragraph length, rhythm, and level of detail
- If the examples use short, punchy sentences, you use short punchy sentences
- If the examples use specific coaching terms (e.g. "half-turn", "body shape", "back foot"), adopt those same terms where relevant
- Mirror the voice: if the examples are direct and assertive, be direct and assertive
- Do NOT fall back on generic AI writing. Every sentence should sound like it came from the same author who wrote the examples.

ABSOLUTE PROHIBITIONS:
1. NEVER add new tactical observations, insights, or analysis points
2. NEVER introduce examples, scenarios, or situations not in the source
3. NEVER mention specific players, teams, formations, or tactical concepts not in the source
4. NEVER add statistics, measurements, or specifics the user didn't provide
5. NEVER pad the content with generic football observations
6. If the source says "good positioning" - you write about positioning, nothing else
7. NEVER use American English spellings or vocabulary

WHAT YOU MUST DO:
1. Take ONLY the facts/observations from the SOURCE CONTENT
2. Rewrite them using the vocabulary and sentence patterns from the STYLE EXAMPLES
3. Match the tone, rhythm, and phrasing of the examples
4. Keep the same meaning - just change how it's expressed
5. If the source is brief, your output should be brief

Think of yourself as a translator: same message, different voice. Nothing added, nothing invented.`;
    } else if (type === 'analysis-overview') {
      systemPrompt = `You are a professional football analyst condensing existing points into a summary paragraph.

LANGUAGE: You MUST write in British English at all times. Use UK spellings throughout: colour, favour, defence, centre, organise, recognised, analysed, behaviour, etc. Never use American spellings.

CRITICAL RULE - YOU ARE A SUMMARIZER, NOT A CREATOR:
- The user provides SOURCE CONTENT (tactical points they've already written)
- The user provides STYLE EXAMPLES (how they want the summary to sound)
- Your ONLY job is to condense the source content into one paragraph using the example style
- You are NOT adding new analysis - you are summarising what exists

HOW TO USE THE STYLE EXAMPLES:
- Study the EXACT words, phrases, and sentence structures used in the examples
- Copy the same types of expressions, adjectives, and coaching language
- Match the paragraph length, rhythm, and level of detail
- Mirror the voice: if the examples are direct and assertive, be direct and assertive
- Do NOT fall back on generic AI writing. Every sentence should sound like it came from the same author who wrote the examples.

ABSOLUTE PROHIBITIONS:
1. NEVER add new tactical observations not found in the source points
2. NEVER introduce examples or concepts from the STYLE EXAMPLES as if they're about this match
3. NEVER mention teams, players, or specifics that aren't in the source content
4. NEVER pad with generic football analysis language
5. If something isn't in the source, it doesn't exist for this task
6. NEVER use American English spellings or vocabulary

WHAT YOU MUST DO:
1. Extract the key messages from each source point
2. Combine them into one cohesive paragraph
3. Use the vocabulary and sentence patterns from the STYLE EXAMPLES
4. Match the tone and rhythm of the examples
5. Keep it concise - one focused paragraph

The examples show you HOW to write, not WHAT to write. The source content tells you WHAT to write.`;
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
