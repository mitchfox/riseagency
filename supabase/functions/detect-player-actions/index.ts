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

interface ConfirmedExampleInput {
  timestamp?: number;
  actionType?: string;
  description?: string;
}

interface LearningContext {
  negByType: Record<string, string[]>;          // false-positive descriptions per action type
  confusions: Record<string, string[]>;          // expected → confusing-with notes
  positivesByType: Record<string, string[]>;     // confirmed examples per action type
  totalNegatives: number;
  totalPositives: number;
  totalConfusions: number;
}

function normaliseName(value: string): string {
  return value.trim().toLowerCase();
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

/**
 * Pull cross-video labelled examples so the AI generalises:
 *  - confirmed actions (positive examples per action type)
 *  - not_involved / wrong_player feedback (false-positive descriptions per action type)
 *  - wrong_action feedback (which action got confused with which)
 * Same-video records are included — they count as labelled training data, not as
 * "block this exact timestamp" rules.
 */
async function fetchLearningContext(): Promise<LearningContext> {
  const ctx: LearningContext = {
    negByType: {}, confusions: {}, positivesByType: {},
    totalNegatives: 0, totalPositives: 0, totalConfusions: 0,
  };
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb
      .from('ai_detection_feedback')
      .select('action_type, feedback_type, reason, feedback_context')
      .in('feedback_type', ['not_involved', 'wrong_player', 'wrong_action', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(800);
    if (!data) return ctx;

    for (const r of data as any[]) {
      const at = normaliseName(String(r.action_type || ''));
      if (!at) continue;
      const fb = r.feedback_type as string;
      const fc = (r.feedback_context || {}) as Record<string, unknown>;
      const desc = String(fc.detectedDescription || fc.actionDescription || r.reason || '').trim();

      if (fb === 'confirmed') {
        if (!desc) continue;
        if (!ctx.positivesByType[at]) ctx.positivesByType[at] = [];
        if (ctx.positivesByType[at].length < 6) {
          ctx.positivesByType[at].push(desc);
          ctx.totalPositives++;
        }
      } else if (fb === 'wrong_action') {
        const expected = normaliseName(String(fc.expectedAction || at));
        const detected = String(fc.detectedAction || '').trim();
        if (!desc) continue;
        if (!ctx.confusions[expected]) ctx.confusions[expected] = [];
        if (ctx.confusions[expected].length < 5) {
          ctx.confusions[expected].push(detected ? `Was called "${detected}" but expected "${expected}": ${desc}` : desc);
          ctx.totalConfusions++;
        }
      } else {
        // not_involved / wrong_player → false positive pattern
        if (!desc) continue;
        if (!ctx.negByType[at]) ctx.negByType[at] = [];
        if (ctx.negByType[at].length < 5) {
          ctx.negByType[at].push(desc);
          ctx.totalNegatives++;
        }
      }
    }
  } catch (e) {
    console.error('fetchLearningContext failed', e);
  }
  return ctx;
}

function filterActionDefinitions(actions: SportscodeAction[], allowedActionTypes?: string[]): SportscodeAction[] {
  if (!allowedActionTypes || allowedActionTypes.length === 0) return actions;
  const allow = new Set(allowedActionTypes.map(normaliseName));
  return actions.filter((a) => allow.has(normaliseName(a.action_name)));
}

function buildActionReference(
  actions: SportscodeAction[],
  positivesFromClient: Record<string, string[]>,
  learning: LearningContext,
): string {
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
      const key = normaliseName(a.action_name);
      text += `- ${a.action_name}`;
      if (a.description) text += `: ${a.description}`;
      text += '\n';
      if (a.visual_cues) text += `  VISUAL CUES: ${a.visual_cues}\n`;
      const before = a.default_before_seconds || 5;
      const after = a.default_after_seconds || 5;
      text += `  CLIP TIMING: ${before}s before, ${after}s after the key moment\n`;

      const confirmed = [
        ...(positivesFromClient[key] || []),
        ...(learning.positivesByType[key] || []),
      ].slice(0, 6);
      if (confirmed.length > 0) {
        text += `  COACH-CONFIRMED EXAMPLES:\n`;
        for (const ex of confirmed) text += `    • ${ex}\n`;
      }

      const negatives = learning.negByType[key] || [];
      if (negatives.length > 0) {
        text += `  PREVIOUSLY FLAGGED BUT REJECTED (do NOT label these as ${a.action_name} again):\n`;
        for (const ex of negatives) text += `    • ${ex}\n`;
      }

      const confusions = learning.confusions[key] || [];
      if (confusions.length > 0) {
        text += `  COMMON CONFUSIONS WITH ${a.action_name}:\n`;
        for (const ex of confusions) text += `    • ${ex}\n`;
      }
    }
  }
  return text;
}

function groupExamplesByType(examples: ConfirmedExampleInput[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const ex of examples) {
    if (!ex?.actionType || !ex?.description) continue;
    const parts = String(ex.actionType).split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const key = normaliseName(part);
      if (!map[key]) map[key] = [];
      if (map[key].length < 6) map[key].push(String(ex.description).trim());
    }
  }
  return map;
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

// ---------- Roboflow grounding ----------

interface RoboflowDetection {
  class: string;
  confidence: number;
  x: number; y: number; width: number; height: number;
}

interface FrameGrounding {
  frameIndex: number;
  detections: RoboflowDetection[];
  hasBall: boolean;
  playerCount: number;
  available: boolean;
  endpoint?: string;
  error?: string;
}

interface FrameProcessReport {
  frameIndex: number;
  timestamp: number;
  grounding: string;
  roboflowEndpoint?: string;
  rawModelActions: string[];
  acceptedActions: string[];
  rejectedReasons: string[];
}

const BALL_CLASSES = /^(football|ball|soccer ?ball)$/i;
const PLAYER_CLASSES = /^(player|person|footballer)$/i;

const BALL_DEPENDENT_ACTIONS = /(pass|shot|cross|clearance|interception|tackle|header|dribble|carry|first touch|switch|backwards pass|forward pass|lateral pass|lofted|chipped|driven|recovery|block|save|catch|punch|distribution|throw)/i;

function extractRoboflowDetections(workflowJson: unknown): RoboflowDetection[] {
  const out: RoboflowDetection[] = [];
  if (!workflowJson || typeof workflowJson !== 'object') return out;
  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node !== 'object') return;
    if (Array.isArray(node.predictions)) {
      for (const p of node.predictions) {
        if (!p || typeof p !== 'object') continue;
        const cls = String(p.class || p.label || '').trim();
        if (!cls) continue;
        out.push({
          class: cls,
          confidence: Number(p.confidence ?? p.score ?? 0),
          x: Number(p.x ?? 0), y: Number(p.y ?? 0),
          width: Number(p.width ?? 0), height: Number(p.height ?? 0),
        });
      }
    }
    for (const v of Object.values(node)) visit(v);
  };
  visit(workflowJson);
  return out;
}

async function callRoboflowWorkflow(base64NoPrefix: string): Promise<{ detections: RoboflowDetection[]; endpoint: string } | null> {
  const apiKey = Deno.env.get('ROBOFLOW_API_KEY');
  const workspace = Deno.env.get('ROBOFLOW_WORKSPACE');
  const workflowId = Deno.env.get('ROBOFLOW_WORKFLOW_ID');
  if (!apiKey || !workspace || !workflowId) return null;
  const payloads = [
    {
      endpoint: `https://serverless.roboflow.com/infer/workflows/${workspace}/${workflowId}`,
      body: { api_key: apiKey, inputs: { image: { type: 'base64', value: base64NoPrefix } }, parameters: { classes: 'Player, Football, 3' }, use_cache: true },
    },
    {
      endpoint: `https://serverless.roboflow.com/${workspace}/workflows/${workflowId}`,
      body: { api_key: apiKey, images: { image: { type: 'base64', value: base64NoPrefix } }, parameters: { classes: 'Player, Football, 3' }, use_cache: true },
    },
  ];
  try {
    for (const attempt of payloads) {
      const res = await fetch(attempt.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.body),
      });
      if (!res.ok) {
        console.warn('Roboflow workflow non-OK', res.status, attempt.endpoint);
        continue;
      }
      const json = await res.json();
      return { detections: extractRoboflowDetections(json), endpoint: attempt.endpoint };
    }
    return null;
  } catch (e) {
    console.warn('Roboflow workflow error', e);
    return null;
  }
}

async function groundFramesWithRoboflow(frames: { dataUrl: string; index: number }[]): Promise<FrameGrounding[]> {
  // If creds missing the first call returns null and we mark all unavailable.
  const groundings: FrameGrounding[] = await Promise.all(frames.map(async (f) => {
    const base64 = (f.dataUrl.split(',')[1] || '').trim();
    const result = base64 ? await callRoboflowWorkflow(base64) : null;
    if (!result) return { frameIndex: f.index, detections: [], hasBall: false, playerCount: 0, available: false, error: 'Roboflow workflow did not return usable detections' };
    const dets = result.detections;
    const hasBall = dets.some((d) => BALL_CLASSES.test(d.class) && d.confidence >= 0.3);
    const playerCount = dets.filter((d) => PLAYER_CLASSES.test(d.class) && d.confidence >= 0.3).length;
    return { frameIndex: f.index, detections: dets, hasBall, playerCount, available: true, endpoint: result.endpoint };
  }));
  return groundings;
}

function summariseGrounding(g: FrameGrounding): string {
  if (!g.available) return 'no object grounding available';
  const ball = g.hasBall ? 'football detected' : 'no football detected';
  const players = `${g.playerCount} player${g.playerCount === 1 ? '' : 's'} detected`;
  return `${ball}, ${players}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { frames, playerInfo, videoContext, allowedActionTypes, confirmedExamples, referenceImageUrl, teamKitDescription, minConfidence, sampleEverySeconds } = await req.json();

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

    const [actionDefs, learning] = await Promise.all([
      fetchActionDefinitions(),
      fetchLearningContext(),
    ]);
    const filteredDefs = filterActionDefinitions(actionDefs, requestedTypes);
    const scopedActionDefs = filteredDefs.length > 0 ? filteredDefs : actionDefs;
    const positivesFromClient = groupExamplesByType(Array.isArray(confirmedExamples) ? confirmedExamples : []);
    const actionReference = buildActionReference(scopedActionDefs, positivesFromClient, learning);
    const durationMap = buildDurationMap(scopedActionDefs);
    const canonicalNameMap = buildCanonicalNameMap(scopedActionDefs);
    const allowedNames = Object.values(canonicalNameMap);

    // Run Roboflow object grounding in parallel with model setup. Falls back gracefully if creds missing.
    const groundings = await groundFramesWithRoboflow(frames as { dataUrl: string; index: number }[]);
    const groundingByIndex = new Map<number, FrameGrounding>();
    for (const g of groundings) groundingByIndex.set(g.frameIndex, g);
    const roboflowAvailable = groundings.some((g) => g.available);

    const systemPrompt = `You are a professional football match analyst reviewing video frames sampled every ${sampleEverySeconds || 2} seconds from a competitive match.

PLAYER TO TRACK: ${playerInfo.name}
${playerInfo.description ? `VISUAL IDENTIFICATION: ${playerInfo.description}` : ''}
${playerInfo.notPlayer ? `DO NOT CONFUSE WITH: ${playerInfo.notPlayer}` : ''}
${playerInfo.position ? `POSITION: ${playerInfo.position}` : ''}
${videoContext?.opponent ? `OPPONENT: ${videoContext.opponent}` : ''}
${teamKitDescription ? `TEAM KIT FOR THIS MATCH: ${teamKitDescription}` : ''}
${referenceImageUrl ? `REFERENCE IMAGE: A reference still of the target player is the FIRST image in the message. Use it as your primary visual anchor — match face, hair, build, and skin tone before flagging any frame.` : ''}
${actionReference}

LEARNING CONTEXT LOADED FROM PRIOR COACH FEEDBACK:
- Confirmed positive examples per action type (above) — use these as the standard for what a real instance looks like.
- "PREVIOUSLY FLAGGED BUT REJECTED" lists per action type — these are descriptions the AI previously called this action but coaches rejected. If a frame matches one of these patterns, do NOT flag it again as that action.
- "COMMON CONFUSIONS" lists — reminders of which actions get mistaken for which.

YOUR JOB IS EXACTLY TWO STEPS, IN ORDER, FOR EVERY FRAME:

STEP 1 — IS THIS THE PLAYER?
Identify the target player using the reference image, kit description, shirt number, body shape, hair and skin tone. If you cannot confidently identify this specific player in this frame, SKIP the frame. Same standard for every position, including goalkeepers.

STEP 2 — IS THIS PLAYER PERFORMING ONE OF THE LISTED ACTIONS?
Compare what you see this player doing against the action types listed above and their VISUAL CUES. The coach-confirmed examples show real instances. The rejected examples show what NOT to call this action. The object-grounding line for each frame tells you whether a football and other players are even visible — for actions that require contact with the ball, if no football is detected in the frame, do not flag a ball-action.

- If yes, output the action's exact name from the list.
- If two distinct actions happen in the same <5s passage (e.g. an interception then a pass), output them as one comma-separated entry: "Interception, Pass".
- If no listed action clearly applies, SKIP the frame. Do not flag "positioning", "tracking play", "anticipating", "ready for", "monitoring" — those are not actions.
- Standing in the goal, watching play develop, jogging back into shape, or being visible nearby are NEVER detections, regardless of position.
- Goalkeeper priority: if the tracked player is a GK and the ball is travelling towards goal with a dive, reach, block or parry cue, classify it as Save when Save is in the allowed list. Do not downgrade that to Clearance or Defensive Positioning.
- Distribution priority: if the GK or defender clearly kicks, throws or rolls the ball to restart/build play, prefer the listed pass/distribution action over Clearance unless the cue is an emergency defensive removal under pressure.
- Defensive Positioning is allowed only when that exact action is in the allowed list and no contact/distribution/save/claim/punch action fits. It must never be the default label for simply being visible.

OUTPUT RULES:
- Only output frames where you can name a real action from the list. Empty output is correct when nothing is happening for this player.
- One passage of play = ONE entry. Do not report the same action across consecutive frames.
- Fouls / cards: only if contact is clearly visible.
- visualCueMatched: copy ONE short phrase from that action's VISUAL CUES that you can actually see in this frame. If you cannot, do not flag.
- confidence: "high" if both player and action are unambiguous; "medium" if the player is identified and a listed action is the most plausible reading of what's happening.${allowedNames.length > 0 ? `
- ALLOWED ACTION NAMES (output one of these or skip): ${allowedNames.join(', ')}` : ''}

CLIP DURATION: use the per-action defaults from the reference (clipBefore / clipAfter), extend for longer build-ups, shorten for instantaneous moments. Default 5/5.`;

    const imageContent = (frames as { dataUrl: string; timestamp: number; index: number }[]).map((frame) => {
      const g = groundingByIndex.get(frame.index);
      const grounding = g ? summariseGrounding(g) : 'no object grounding available';
      return [
        {
          type: 'text' as const,
          text: `Frame ${frame.index} (timestamp: ${Math.floor(frame.timestamp)}s / ${Math.floor(frame.timestamp / 60)}:${String(Math.floor(frame.timestamp % 60)).padStart(2, '0')}) — object grounding: ${grounding}`,
        },
        {
          type: 'image_url' as const,
          image_url: { url: frame.dataUrl },
        },
      ];
    }).flat();

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
                text: `Review all ${frames.length} frames above. For each frame, run the two-step check: (1) is this ${playerInfo.name}? (2) are they performing one of the listed actions right now? Skip the frame if either answer is no. Empty output is correct when nothing is happening.`,
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
                        visualCueMatched: { type: 'string', description: 'One short phrase from the action type\'s VISUAL CUES that you actually see in this frame. Required — leave empty only if you should not be flagging.' },
                      },
                      required: ['frameIndex', 'actionType', 'confidence', 'description', 'visualCueMatched'],
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
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required. Please top up your workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    const meta = {
      durationMap,
      examplesLoaded: learning.totalPositives + Object.values(positivesFromClient).reduce((s, a) => s + a.length, 0),
      negativeExamplesLoaded: learning.totalNegatives,
      confusionsLoaded: learning.totalConfusions,
      roboflowGroundedFrames: groundings.filter((g) => g.available).length,
      roboflowRejected: 0,
      verifierDropped: 0,
    };

    const frameProcessReport: FrameProcessReport[] = (frames as { timestamp: number; index: number }[]).map((frame) => {
      const g = groundingByIndex.get(frame.index);
      return {
        frameIndex: frame.index,
        timestamp: frame.timestamp,
        grounding: g ? summariseGrounding(g) : 'no object grounding available',
        roboflowEndpoint: g?.endpoint,
        rawModelActions: [],
        acceptedActions: [],
        rejectedReasons: g?.available === false && g.error ? [g.error] : [],
      };
    });
    const reportByFrame = new Map(frameProcessReport.map((item) => [item.frameIndex, item]));

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ actions: [], ...meta, frameProcessReport }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const rawActions = Array.isArray(parsed?.actions) ? parsed.actions : [];
    const highOnlyKeywords = /(foul|fouled|penalty|red card|yellow card)/i;
    for (const a of rawActions) {
      const idx = Number(a?.frameIndex);
      const report = reportByFrame.get(idx);
      if (report) report.rawModelActions.push(`${String(a?.actionType || 'unknown')} (${String(a?.confidence || 'unknown')}) — ${String(a?.description || 'no reason supplied')}`);
    }

    const sanitisedActions = rawActions
      .filter((a: any) => Number.isInteger(a?.frameIndex) && a.frameIndex >= 0 && a.frameIndex < frames.length)
      .map((a: any) => {
        const report = reportByFrame.get(Number(a.frameIndex));
        const reject = (reason: string) => {
          report?.rejectedReasons.push(reason);
          return null;
        };
        const rawParts = String(a.actionType || '').split(',').map((p: string) => p.trim()).filter(Boolean);
        const canonicalParts: string[] = [];
        for (const part of rawParts) {
          const c = canonicalNameMap[normaliseName(part)];
          if (c && !canonicalParts.includes(c)) canonicalParts.push(c);
        }
        if (canonicalParts.length === 0) return reject(`Dropped because "${String(a.actionType || '')}" is not in the allowed action shortlist.`);
        const canonical = canonicalParts.join(', ');
        const primary = canonicalParts[0];

        const confidence = String(a.confidence || '').toLowerCase();
        if (confidence !== 'high' && confidence !== 'medium') return reject(`Dropped ${canonical} because confidence was "${confidence || 'blank'}".`);
        if (minConfidence === 'high' && confidence !== 'high') return reject(`Dropped ${canonical} because the scan required high confidence.`);
        if (highOnlyKeywords.test(canonical) && confidence !== 'high') return reject(`Dropped ${canonical} because contact/card actions must be high confidence.`);

        const visualCue = String(a.visualCueMatched || '').trim();
        if (!visualCue) return reject(`Dropped ${canonical} because no visible cue from the action definition was supplied.`);
        const desc = String(a.description || '').trim();

        const timing = durationMap[normaliseName(primary)] || { before: 5, after: 5 };
        const frameTs = frames[a.frameIndex]?.timestamp ?? 0;

        return {
          frameIndex: a.frameIndex,
          timestamp: frameTs,
          actionType: canonical,
          confidence,
          description: desc || `${canonical} detected`,
          clipBefore: Number.isFinite(a.clipBefore) ? a.clipBefore : timing.before,
          clipAfter: Number.isFinite(a.clipAfter) ? a.clipAfter : timing.after,
          visualCueMatched: visualCue,
        };
      })
      .filter((a: any) => a !== null);

    // ROBOFLOW HARD SANITY CHECK — only when grounding was available for that frame.
    const afterGrounding = sanitisedActions.filter((det: any) => {
      const g = groundingByIndex.get(det.frameIndex);
      if (!g || !g.available) return true; // no grounding → trust the model
      const needsBall = BALL_DEPENDENT_ACTIONS.test(det.actionType);
      if (needsBall && !g.hasBall) {
        meta.roboflowRejected++;
        reportByFrame.get(det.frameIndex)?.rejectedReasons.push(`Roboflow rejected ${det.actionType}: football was not detected in this sampled frame.`);
        return false;
      }
      if (g.playerCount === 0) {
        meta.roboflowRejected++;
        reportByFrame.get(det.frameIndex)?.rejectedReasons.push(`Roboflow rejected ${det.actionType}: no player was detected in this sampled frame.`);
        return false;
      }
      return true;
    });

    // Cross-frame dedupe within 5s
    afterGrounding.sort((x: any, y: any) => x.timestamp - y.timestamp);
    const merged: any[] = [];
    const confRank: Record<string, number> = { high: 2, medium: 1 };
    for (const det of afterGrounding) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(det.timestamp - last.timestamp) <= 5) {
        const parts = new Set<string>([
          ...String(last.actionType).split(',').map((s: string) => s.trim()),
          ...String(det.actionType).split(',').map((s: string) => s.trim()),
        ]);
        last.actionType = Array.from(parts).join(', ');
        if ((confRank[det.confidence] || 0) > (confRank[last.confidence] || 0)) {
          last.frameIndex = det.frameIndex;
          last.timestamp = det.timestamp;
          last.confidence = det.confidence;
          last.description = det.description;
          last.clipBefore = det.clipBefore;
          last.clipAfter = det.clipAfter;
        }
      } else {
        merged.push({ ...det });
      }
    }

    // VERIFIER PASS — identity check.
    let finalCandidates = merged;
    if (merged.length > 0 && referenceImageUrl) {
      try {
        const verifierFrames = merged
          .map((det: any) => {
            const f = frames[det.frameIndex];
            if (!f) return null;
            return { dataUrl: f.dataUrl, candidateId: det.frameIndex, actionType: det.actionType, timestamp: det.timestamp };
          })
          .filter((x: any) => x);

        if (verifierFrames.length > 0) {
          const vSystem = `You are verifying player-action detections. The first image is a REFERENCE STILL of ${playerInfo.name}. Use face, hair, skin tone, build and shirt number from that still as your anchor.${playerInfo.description ? `\nIDENTITY NOTES: ${playerInfo.description}` : ''}${playerInfo.notPlayer ? `\nDO NOT CONFUSE WITH: ${playerInfo.notPlayer}` : ''}\n\nFor each candidate frame, decide YES or NO:\n- YES only if you can clearly see ${playerInfo.name} on screen AND they are the one actively performing the labelled action.\n- NO if the player on the ball is a teammate, an opponent, or you cannot identify ${playerInfo.name} in the frame at all.\n- NO if ${playerInfo.name} is in the frame but standing/jogging/watching while a different player performs the action.\n\nDefault to NO when uncertain. Being on the same team or in the same shot is not enough.`;

          const vContent: any[] = [
            { type: 'text', text: `REFERENCE — ${playerInfo.name}` },
            { type: 'image_url', image_url: { url: referenceImageUrl } },
          ];
          for (const v of verifierFrames) {
            vContent.push({ type: 'text', text: `Candidate ${v.candidateId} — labelled "${v.actionType}" at ${Math.floor(v.timestamp)}s. Is ${playerInfo.name} the one performing this action?` });
            vContent.push({ type: 'image_url', image_url: { url: v.dataUrl } });
          }

          const vRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: vSystem },
                { role: 'user', content: vContent },
              ],
              tools: [{
                type: 'function',
                function: {
                  name: 'report_verification',
                  description: 'Confirm or reject each candidate detection',
                  parameters: {
                    type: 'object',
                    properties: {
                      verdicts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            candidateId: { type: 'number' },
                            confirmed: { type: 'boolean' },
                            reason: { type: 'string' },
                          },
                          required: ['candidateId', 'confirmed'],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ['verdicts'],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: 'function', function: { name: 'report_verification' } },
            }),
          });

          if (vRes.ok) {
            const vJson = await vRes.json();
            const vCall = vJson.choices?.[0]?.message?.tool_calls?.[0];
            if (vCall?.function?.arguments) {
              const vParsed = JSON.parse(vCall.function.arguments);
              const verdicts: { candidateId: number; confirmed: boolean }[] = Array.isArray(vParsed?.verdicts) ? vParsed.verdicts : [];
              const verdictMap = new Map<number, boolean>();
              for (const v of verdicts) verdictMap.set(v.candidateId, !!v.confirmed);
              finalCandidates = merged.filter((det: any) => {
                const ok = verdictMap.get(det.frameIndex);
                if (!ok) {
                  meta.verifierDropped++;
                  reportByFrame.get(det.frameIndex)?.rejectedReasons.push(`Verifier rejected ${det.actionType}: target player was not confidently the player performing it.`);
                }
                return !!ok;
              });
            }
          } else {
            console.warn('Verifier pass failed, keeping first-pass detections', vRes.status);
          }
        }
      } catch (vErr) {
        console.warn('Verifier pass error, keeping first-pass detections', vErr);
      }
    }

    // Per-minute cap
    const byMinute: Record<number, any[]> = {};
    for (const d of finalCandidates) {
      const m = Math.floor((d.timestamp || 0) / 60);
      (byMinute[m] ||= []).push(d);
    }
    const capped: any[] = [];
    for (const m of Object.keys(byMinute)) {
      const list = byMinute[Number(m)].sort(
        (x, y) => (confRank[y.confidence] || 0) - (confRank[x.confidence] || 0)
      );
      capped.push(...list.slice(0, 6));
    }
    capped.sort((x, y) => x.timestamp - y.timestamp);

    const finalActions = capped.map(({ timestamp: _t, visualCueMatched: _v, ...rest }) => rest);
    for (const det of capped) {
      reportByFrame.get(det.frameIndex)?.acceptedActions.push(`${det.actionType} (${det.confidence}) — ${det.description}`);
    }

    return new Response(
      JSON.stringify({ actions: finalActions, ...meta, roboflowAvailable, frameProcessReport }),
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
