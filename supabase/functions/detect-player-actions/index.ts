import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { frames, playerInfo, videoContext } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No frames provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!playerInfo?.name) {
      return new Response(
        JSON.stringify({ error: 'Player info required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt
    const systemPrompt = `You are a football/soccer video analyst. You are reviewing frames sampled every 3 seconds from a match video.

The player you need to track is: ${playerInfo.name}
${playerInfo.description ? `Additional info: ${playerInfo.description}` : ''}
${playerInfo.notPlayer ? `This is NOT the player (to help distinguish): ${playerInfo.notPlayer}` : ''}
${videoContext?.opponent ? `Match: vs ${videoContext.opponent}` : ''}

Your job is to identify every frame where this player is making a meaningful action (e.g. receiving the ball, passing, shooting, dribbling, tackling, heading, running into space, pressing, making a defensive action, or any other notable on-ball or key off-ball action).

Be LENIENT - if you think the player might be involved in an action, include it. It's better to include false positives than miss real actions.

For each detected action, provide:
- frameIndex: which frame number (0-indexed) the action occurs in
- actionType: what type of action (e.g. "Pass", "Dribble", "Shot", "Tackle", "Run", "Press", "Header", "Cross", "Interception", "Receive")
- confidence: your confidence level ("high", "medium", "low")
- description: brief description of what the player is doing`;

    // Build messages with image content
    const imageContent = frames.map((frame: { dataUrl: string; timestamp: number; index: number }) => ([
      {
        type: 'text' as const,
        text: `Frame ${frame.index} (timestamp: ${Math.floor(frame.timestamp)}s / ${Math.floor(frame.timestamp / 60)}:${String(Math.floor(frame.timestamp % 60)).padStart(2, '0')}):`,
      },
      {
        type: 'image_url' as const,
        image_url: { url: frame.dataUrl },
      },
    ])).flat();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `Analyse all ${frames.length} frames above. Identify every frame where ${playerInfo.name} is making a meaningful action. Remember to be lenient - include anything that might be an action.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_detected_actions',
              description: 'Report all detected player actions across the analysed frames',
              parameters: {
                type: 'object',
                properties: {
                  actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        frameIndex: { type: 'number', description: 'The 0-indexed frame number' },
                        actionType: { type: 'string', description: 'Type of action (Pass, Dribble, Shot, etc.)' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                        description: { type: 'string', description: 'Brief description of the action' },
                      },
                      required: ['frameIndex', 'actionType', 'confidence', 'description'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['actions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'report_detected_actions' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required. Please top up your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ actions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(
      JSON.stringify({ actions: parsed.actions || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('detect-player-actions error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});