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

    const { frames, playerInfo, videoContext, allowedActionTypes, rejectionHistory, confirmedExamples, referenceImageUrl, teamKitDescription, minConfidence, sampleEverySeconds } = await req.json();

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

    // Build confirmed examples reference
    let confirmedReference = '';
    if (Array.isArray(confirmedExamples) && confirmedExamples.length > 0) {
      confirmedReference = `\n\nCONFIRMED EXAMPLES FROM THIS VIDEO (coach-verified correct detections):
The coach has already manually identified and confirmed the following actions for this player in this match. Use these as calibration for what correct detections look like:
${confirmedExamples.map((ex: any) => `- ${ex.actionType} at ${Math.floor(ex.timestamp / 60)}.${String(Math.floor(ex.timestamp % 60)).padStart(2, '0')}${ex.description ? `: ${ex.description}` : ''}`).join('\n')}

These examples show the coach's standard for what counts as a valid detection. Match this level of involvement when deciding whether to flag new actions.`;
    }

    const systemPrompt = `You are an elite professional football match analyst with deep tactical knowledge. You are reviewing video frames sampled every ${sampleEverySeconds || 2} seconds from a competitive match recording, typically a wide-angle broadcast or touchline camera.

PLAYER TO TRACK: ${playerInfo.name}
${playerInfo.description ? `VISUAL IDENTIFICATION: ${playerInfo.description}` : ''}
${playerInfo.notPlayer ? `DO NOT CONFUSE WITH: ${playerInfo.notPlayer}` : ''}
${videoContext?.opponent ? `OPPONENT: ${videoContext.opponent}` : ''}
${teamKitDescription ? `TEAM KIT FOR THIS MATCH: ${teamKitDescription}` : ''}
${referenceImageUrl ? `REFERENCE IMAGE: A reference still of the target player has been provided as the FIRST image in the message. Use it as your primary visual anchor for who this player is — match face, hair, build, and skin tone against it before flagging any frame.` : ''}

UNDERSTANDING THE FOOTAGE:
- These are static frame captures, not live video. You cannot see motion between frames.
- The camera angle is usually wide, covering most of the pitch. Players will appear relatively small.
- Identify the player by their kit colour, shirt number, body shape, skin tone, hair, and position on the pitch as described above.
- If you cannot confidently identify the target player in a frame, skip that frame entirely. Do not guess.

TWO-STAGE IDENTIFICATION (apply mentally before flagging):
  STAGE 1 — TEAM: For each frame, first determine which players are on the target team based on the kit description above. Ignore players in the opposite kit.
  STAGE 2 — PLAYER: From the players on the target team, identify the specific target player using the reference image, description, and shirt number. Only then assess whether they are performing an action.
${actionReference}${confirmedReference}
${Array.isArray(rejectionHistory) && rejectionHistory.length > 0 ? `
PREVIOUS REJECTION FEEDBACK FROM COACH:
The coach has previously corrected AI detections and backtests. Learn from this feedback before reviewing the frames. Missed detection means the coach confirmed that action happened at that time, so be more alert for similar player body shape, pitch location and ball involvement:
${rejectionHistory.slice(-20).map((r: any) => `- Action "${r.actionType}" rejected: "${r.reason}"`).join('\n')}

Use this feedback to calibrate your threshold. If feedback says wrong_player, wrong_action or not_involved, be more conservative. If feedback says missed_detection, be more attentive around that action type and visual setup, not more conservative.` : ''}
${allowedNames.length > 0 ? `
ALLOWED ACTION TYPES (STRICT):
- You may ONLY output actionType values from this list:
${allowedNames.map((n) => `  • ${n}`).join('\n')}
- If none of these clearly applies, skip the frame.` : ''}

DETECTION RULES:
1. BALL INVOLVEMENT (outfield): Outfield players should only be flagged for ball-on actions or clearly involved off-ball moments (decisive runs, marking the receiver, pressing the carrier). Standing in shape with no immediate involvement is not a detection.

2. GOALKEEPERS: Goalkeepers are different. They are constantly in the action even without touching the ball. You SHOULD flag a goalkeeper for:
   - Defending Cross / Defending Corner / Defending Shot whenever a cross, corner or shot is being delivered into their box, even if it is intercepted, blocked or saved by a teammate before they touch it
   - Defensive Positioning when they actively reposition for a building attacking threat (set piece, shot opportunity, opposition entering the final third). Repeated frames of the same passive stance with no developing threat should still collapse to ONE moment.
   - Applied Pressure / Sweeper actions when they advance off their line
   Treat the THREAT of a shot or cross as a valid trigger for goalkeepers — coaches log these moments deliberately.

3. DUPLICATE SUPPRESSION: A single passage of play is ONE moment. If multiple consecutive frames show the same passage, report only the key frame. If TWO OR MORE distinct actions happen for this player inside the same short passage (under 5 seconds, e.g. an interception immediately followed by a pass) report a SINGLE entry whose actionType is a comma-separated list of every action that occurred in order, e.g. "Interception, Pass" or "Defending Cross, Clearance".

4. FOULS & CARDS: Only report these if contact is CLEARLY visible in the frame. If uncertain, skip.

5. RECALL OVER PRECISION: It is more important to catch every action a coach would log than to avoid the occasional extra flag. When uncertain whether a goalkeeper moment counts, prefer to flag it at "medium" confidence rather than skip it.



CONFIDENCE:
- "high": Player clearly identifiable AND clearly performing the action
- "medium": Player appears to be the right person and body position, ball path, nearby opponent or immediate receiving/contesting context suggests the action

DO NOT REPORT:
- Standing still, walking, or general repositioning
- Being visible in frame but not involved in play
- Celebrations or non-play moments
- Anything below "medium" confidence

CLIP DURATION:
For each action, suggest clipBefore and clipAfter seconds using the action reference defaults. Extend for longer sequences, shorten for quick isolated moments. Default is 5s before and 5s after.

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

    const referenceContent: any[] = referenceImageUrl
      ? [
          { type: 'text' as const, text: `REFERENCE IMAGE — this is ${playerInfo.name}. Use this as your primary visual anchor.` },
          { type: 'image_url' as const, image_url: { url: referenceImageUrl } },
        ]
      : [];

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
              ...referenceContent,
              ...imageContent,
              {
                type: 'text',
                text: `Review all ${frames.length} frames above. For each frame, determine whether ${playerInfo.name} is the PRIMARY ACTOR performing a meaningful on-ball or direct defensive action. Do NOT report frames where the player is merely visible, jogging, or in the general area of play. Only report "high" and "medium" confidence detections.`,
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
                          description: 'Single action name from the allowed list, OR a comma-separated combination (e.g. "Interception, Pass") when multiple distinct actions occur in the same <5s passage. Each part must match an allowed action name.',
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
        if (minConfidence === 'high' && confidence !== 'high') return null;
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
