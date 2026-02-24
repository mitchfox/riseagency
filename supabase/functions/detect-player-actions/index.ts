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

    // Build the system prompt with deep football knowledge
    const systemPrompt = `You are an elite professional football (soccer) match analyst with deep tactical knowledge. You are reviewing video frames sampled every 3 seconds from a competitive match recording — typically a wide-angle broadcast or touchline camera.

PLAYER TO TRACK: ${playerInfo.name}
${playerInfo.description ? `VISUAL IDENTIFICATION: ${playerInfo.description}` : ''}
${playerInfo.notPlayer ? `DO NOT CONFUSE WITH: ${playerInfo.notPlayer}` : ''}
${videoContext?.opponent ? `OPPONENT: ${videoContext.opponent}` : ''}

UNDERSTANDING THE FOOTAGE:
- These are static frame captures, not live video. You cannot see motion between frames.
- The camera angle is usually wide, covering most of the pitch. Players will appear relatively small.
- Identify the player by their kit colour, shirt number, body shape, skin tone, hair, and position on the pitch as described above.
- If you cannot confidently identify the target player in a frame, skip that frame entirely. Do not guess.

WHAT COUNTS AS A MEANINGFUL ACTION:
You are looking for moments where the player is directly involved in play. These include:

ON THE BALL:
- Receiving a pass (ball arriving at their feet or chest)
- Making a pass (short, long, through ball, switch of play)
- Crossing the ball
- Shooting or striking towards goal
- Dribbling past or taking on an opponent
- Heading the ball
- First touch / controlling the ball
- Set piece delivery (corners, free kicks, throw-ins)
- Goal kick or distribution (if goalkeeper)

DEFENSIVE:
- Tackling or attempting a tackle
- Intercepting a pass
- Blocking a shot or cross
- Clearing the ball
- Winning an aerial duel
- Shepherding or jockeying an attacker

KEY OFF-THE-BALL:
- Making a penetrating run in behind (obvious forward sprint into space)
- Pressing the ball carrier (closing down aggressively)
- Dropping deep to receive / showing for the ball
- Marking a specific opponent tightly

DO NOT REPORT:
- Standing still, jogging into general position, or walking
- General movement that every outfield player does (shifting with the team shape)
- Moments where the player is simply in the frame but not involved
- Celebrations, conversations, or other non-play moments

CONFIDENCE GUIDE:
- "high": Player is clearly identifiable AND clearly performing the action (ball visible at feet, obvious body shape of a tackle, etc.)
- "medium": Player appears to be the right person and the body position suggests the action, but the frame is not perfectly clear
- "low": You think it might be the player or the action is ambiguous from a single frame

Be SELECTIVE. Quality over quantity. Only report frames where you genuinely believe the identified player is performing one of the actions listed above. A match typically has 40-80 meaningful involvements per player across 90 minutes.

For each detected action provide:
- frameIndex: the 0-indexed frame number
- actionType: a short label (e.g. "Pass", "Dribble", "Shot", "Tackle", "Run", "Press", "Header", "Cross", "Interception", "Receive", "Clearance", "Aerial Duel", "Set Piece", "Block")
- confidence: "high", "medium", or "low"
- description: one sentence describing what you see the player doing in that frame`;

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
                text: `Review all ${frames.length} frames above. For each frame, determine whether ${playerInfo.name} is performing a meaningful on-ball action, defensive action, or key off-ball movement as defined in your instructions. Only report genuine involvements — do not flag general positioning or jogging.`,
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
                        description: { type: 'string', description: 'Brief description of what the player is doing' },
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
