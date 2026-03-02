import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SportscodeAction {
  action_name: string;
  description: string | null;
  visual_cues: string | null;
  typical_duration_seconds: number | null;
  default_before_seconds: number | null;
  default_after_seconds: number | null;
  category: string | null;
}

async function fetchActionDefinitions(): Promise<SportscodeAction[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data } = await sb
    .from('sportscode_action_types')
    .select('action_name, description, visual_cues, typical_duration_seconds, default_before_seconds, default_after_seconds, category')
    .order('display_order', { ascending: true });
  return (data as SportscodeAction[]) || [];
}

function normaliseName(value: string): string {
  return value.trim().toLowerCase();
}

function filterActionDefinitions(actions: SportscodeAction[], allowedActionTypes?: string[]): SportscodeAction[] {
  if (!allowedActionTypes || allowedActionTypes.length === 0) return actions;
  const allow = new Set(allowedActionTypes.map(normaliseName));
  return actions.filter((a) => allow.has(normaliseName(a.action_name)));
}

function buildActionReference(actions: SportscodeAction[]): string {
  if (actions.length === 0) return '';

  const grouped: Record<string, SportscodeAction[]> = {};
  for (const a of actions) {
    const cat = a.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  let text = '\n\nACTION TYPE REFERENCE (from coaching database):\n';
  for (const [cat, items] of Object.entries(grouped)) {
    text += `\n${cat.toUpperCase()}:\n`;
    for (const a of items) {
      text += `- ${a.action_name}`;
      if (a.description) text += `: ${a.description}`;
      text += '\n';
      if (a.visual_cues) text += `  VISUAL CUES: ${a.visual_cues}\n`;
      const before = a.default_before_seconds || 5;
      const after = a.default_after_seconds || 5;
      text += `  CLIP TIMING: ${before}s before, ${after}s after the key moment\n`;
    }
  }
  return text;
}

function buildDurationMap(actions: SportscodeAction[]): Record<string, { before: number; after: number }> {
  const map: Record<string, { before: number; after: number }> = {};
  for (const a of actions) {
    map[normaliseName(a.action_name)] = {
      before: a.default_before_seconds || 5,
      after: a.default_after_seconds || 5,
    };
  }
  return map;
}

function buildCanonicalNameMap(actions: SportscodeAction[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of actions) {
    map[normaliseName(a.action_name)] = a.action_name;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { frames, playerInfo, videoContext, allowedActionTypes, rejectionHistory } = await req.json();

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

    const requestedTypes = Array.isArray(allowedActionTypes)
      ? allowedActionTypes.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
      : undefined;

    // Fetch action definitions from the coaching database
    const actionDefs = await fetchActionDefinitions();
    const filteredDefs = filterActionDefinitions(actionDefs, requestedTypes);
    const scopedActionDefs = filteredDefs.length > 0 ? filteredDefs : actionDefs;
    const actionReference = buildActionReference(scopedActionDefs);
    const durationMap = buildDurationMap(scopedActionDefs);
    const canonicalNameMap = buildCanonicalNameMap(scopedActionDefs);
    const allowedNames = Object.values(canonicalNameMap);

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
${actionReference}
${Array.isArray(rejectionHistory) && rejectionHistory.length > 0 ? `
PREVIOUS REJECTION FEEDBACK FROM COACH:
The coach has previously rejected AI detections for the following reasons. Learn from this feedback and avoid making the same mistakes:
${rejectionHistory.slice(-20).map((r: any) => `- Action "${r.actionType}" rejected: "${r.reason}"`).join('\n')}

Use this feedback to calibrate your detection threshold. If the coach says "player not involved" or "wrong player", be more conservative.` : ''}
${allowedNames.length > 0 ? `
ALLOWED ACTION TYPES (STRICT):
- You may ONLY output actionType values from this list:
${allowedNames.map((n) => `  • ${n}`).join('\n')}
- If none of these clearly applies, skip the frame.` : ''}

CRITICAL FILTERING RULES — READ CAREFULLY:
The most common mistake is flagging frames where the player is simply VISIBLE on screen but NOT ACTIVELY INVOLVED in play. You MUST apply these filters strictly:

1. BALL PROXIMITY TEST: The player must be DIRECTLY interacting with the ball OR about to receive/contest it within the next 1-2 seconds. Simply being near the ball or in the same area of the pitch is NOT enough.

2. ACTIVE vs PASSIVE: Only flag moments where the player is the PRIMARY ACTOR — they are the one passing, shooting, tackling, heading, crossing, dribbling, etc. Do NOT flag:
   - Standing in position while play happens nearby
   - Jogging or running into space (unless it is a decisive run that creates/exploits space)
   - Being in shot but watching play develop elsewhere
   - Walking back after a phase of play
   - General defensive shape-holding without directly pressing or engaging an opponent
   - Being in frame during a set piece they are not taking or directly contesting

3. DUPLICATE SUPPRESSION: A single passage of play (e.g. receiving and passing) is ONE action, not multiple. If you see the player on the ball across 2-3 consecutive frames, report ONLY the key moment (the pass, the shot, the tackle) — not every frame they appear in.

4. EXPECTED OUTPUT: A typical outfield player has 40-80 meaningful involvements across a full 90-minute match. That means roughly one action every 60-135 seconds. If you are detecting significantly more than this rate, you are being too liberal. Be ruthless in filtering.

CONFIDENCE GUIDE:
- "high": Player is clearly identifiable AND clearly performing the action (ball visible at feet, obvious body shape of a tackle, etc.)
- "medium": Player appears to be the right person and the body position suggests the action, but the frame is not perfectly clear

DO NOT REPORT:
- Standing still, jogging into general position, or walking
- General movement that every outfield player does (shifting with the team shape)
- Moments where the player is simply in the frame but not involved
- Celebrations, conversations, or other non-play moments
- Frames where the player is visible but the ball is clearly with someone else and no pressing/closing down is happening
- Fouls/cards/penalties unless contact is clearly visible in-frame (if uncertain, skip)
- Any frame where you are not at least "medium" confident

Be EXTREMELY SELECTIVE. Quality over quantity. Only report frames where you are confident the identified player is the primary actor in a meaningful on-ball or direct defensive action.

CLIP DURATION:
For each action, suggest how many seconds before (clipBefore) and after (clipAfter) the key frame to include. Use the clip timing values from the action reference above as defaults. If an action is part of a longer sequence (e.g. a dribble leading to a cross), extend accordingly. If it is a quick isolated moment (e.g. a clearance), keep it short. The default if not specified in the reference is 5s before and 5s after.

For each detected action provide:
- frameIndex: the 0-indexed frame number
- actionType: a short label matching one of the action types from the reference above (e.g. "Pass", "Dribble", "Shot")
- confidence: "high" or "medium" ONLY (do not report "low")
- description: one sentence describing what you see the player doing in that frame — this will be shown to the coach as the reason the AI flagged it
- clipBefore: seconds before the frame to include in the clip
- clipAfter: seconds after the frame to include in the clip`;

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
                text: `Review all ${frames.length} frames above. For each frame, determine whether ${playerInfo.name} is the PRIMARY ACTOR performing a meaningful on-ball or direct defensive action. Be extremely strict — a typical player has only 40-80 involvements per 90 minutes. Do NOT report frames where the player is merely visible, jogging, or in the general area of play. Only report "high" and "medium" confidence detections.`,
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
                        actionType: {
                          type: 'string',
                          description: 'Type of action from the allowed action list',
                          enum: allowedNames,
                        },
                        confidence: { type: 'string', enum: ['high', 'medium'] },
                        description: { type: 'string', description: 'Brief description of what the player is doing — shown to the coach as the reason for flagging' },
                        clipBefore: { type: 'number', description: 'Seconds before the frame to include in the clip (default 5)' },
                        clipAfter: { type: 'number', description: 'Seconds after the frame to include in the clip (default 5)' },
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
        JSON.stringify({ actions: [], durationMap }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const rawActions = Array.isArray(parsed?.actions) ? parsed.actions : [];
    const highOnlyKeywords = /(foul|fouled|penalty|red card|yellow card)/i;

    const sanitisedActions = rawActions
      .filter((a: any) => Number.isInteger(a?.frameIndex) && a.frameIndex >= 0 && a.frameIndex < frames.length)
      .map((a: any) => {
        const canonical = canonicalNameMap[normaliseName(String(a.actionType || ''))];
        if (!canonical) return null;

        const confidence = String(a.confidence || '').toLowerCase();
        if (confidence !== 'high' && confidence !== 'medium') return null;
        if (highOnlyKeywords.test(canonical) && confidence !== 'high') return null;

        const timing = durationMap[normaliseName(canonical)] || { before: 5, after: 5 };

        return {
          frameIndex: a.frameIndex,
          actionType: canonical,
          confidence,
          description: String(a.description || '').trim() || `${canonical} detected`,
          clipBefore: Number.isFinite(a.clipBefore) ? a.clipBefore : timing.before,
          clipAfter: Number.isFinite(a.clipAfter) ? a.clipAfter : timing.after,
        };
      })
      .filter((a: any) => a !== null);

    return new Response(
      JSON.stringify({ actions: sanitisedActions, durationMap }),
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
