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

async function fetchVideoBlocklist(videoAnalysisId: string | null, playerId: string | null): Promise<{ timestamp: number; actionType: string | null; feedbackType: string }[]> {
  if (!videoAnalysisId || !playerId) return [];
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb
      .from('ai_detection_feedback')
      .select('detected_timestamp, expected_timestamp, action_type, feedback_type')
      .eq('video_analysis_id', videoAnalysisId)
      .eq('player_id', playerId)
      .in('feedback_type', ['not_involved', 'wrong_player', 'wrong_action']);
    if (!data) return [];
    return data
      .map((r: any) => {
        const ts = r.detected_timestamp ?? r.expected_timestamp;
        const num = ts == null ? NaN : Number(ts);
        if (!Number.isFinite(num)) return null;
        return { timestamp: num, actionType: r.action_type ?? null, feedbackType: r.feedback_type as string };
      })
      .filter((x: any): x is { timestamp: number; actionType: string | null; feedbackType: string } => x !== null);
  } catch (e) {
    console.error('Blocklist fetch failed', e);
    return [];
  }
}

function normaliseName(value: string): string {
  return value.trim().toLowerCase();
}

function filterActionDefinitions(actions: SportscodeAction[], allowedActionTypes?: string[]): SportscodeAction[] {
  if (!allowedActionTypes || allowedActionTypes.length === 0) return actions;
  const allow = new Set(allowedActionTypes.map(normaliseName));
  return actions.filter((a) => allow.has(normaliseName(a.action_name)));
}

function buildActionReference(actions: SportscodeAction[], examplesByType: Record<string, string[]>): string {
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
      const exs = examplesByType[normaliseName(a.action_name)] || [];
      if (exs.length > 0) {
        text += `  COACH-CONFIRMED EXAMPLES:\n`;
        for (const ex of exs.slice(0, 5)) text += `    • ${ex}\n`;
      }
    }
  }
  return text;
}

function groupExamplesByType(examples: ConfirmedExampleInput[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const ex of examples) {
    if (!ex?.actionType || !ex?.description) continue;
    // An example may carry comma-separated action types; bucket under each one
    const parts = String(ex.actionType).split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const key = normaliseName(part);
      if (!map[key]) map[key] = [];
      if (map[key].length < 5) map[key].push(String(ex.description).trim());
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { frames, playerInfo, videoContext, allowedActionTypes, confirmedExamples, referenceImageUrl, teamKitDescription, minConfidence, sampleEverySeconds, videoAnalysisId, playerId } = await req.json();

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
    const examplesByType = groupExamplesByType(Array.isArray(confirmedExamples) ? confirmedExamples : []);
    const actionReference = buildActionReference(scopedActionDefs, examplesByType);
    const durationMap = buildDurationMap(scopedActionDefs);
    const canonicalNameMap = buildCanonicalNameMap(scopedActionDefs);
    const allowedNames = Object.values(canonicalNameMap);

    // Hard blocklist: timestamps the coach has previously rejected for this player on this video.
    const blocklist = await fetchVideoBlocklist(videoAnalysisId || null, playerId || null);

    const systemPrompt = `You are a professional football match analyst reviewing video frames sampled every ${sampleEverySeconds || 2} seconds from a competitive match.

PLAYER TO TRACK: ${playerInfo.name}
${playerInfo.description ? `VISUAL IDENTIFICATION: ${playerInfo.description}` : ''}
${playerInfo.notPlayer ? `DO NOT CONFUSE WITH: ${playerInfo.notPlayer}` : ''}
${playerInfo.position ? `POSITION: ${playerInfo.position}` : ''}
${videoContext?.opponent ? `OPPONENT: ${videoContext.opponent}` : ''}
${teamKitDescription ? `TEAM KIT FOR THIS MATCH: ${teamKitDescription}` : ''}
${referenceImageUrl ? `REFERENCE IMAGE: A reference still of the target player is the FIRST image in the message. Use it as your primary visual anchor — match face, hair, build, and skin tone before flagging any frame.` : ''}
${actionReference}

YOUR JOB IS EXACTLY TWO STEPS, IN ORDER, FOR EVERY FRAME:

STEP 1 — IS THIS THE PLAYER?
Identify the target player using the reference image, kit description, shirt number, body shape, hair and skin tone. If you cannot confidently identify this specific player in this frame, SKIP the frame. Same standard for every position, including goalkeepers.

STEP 2 — IS THIS PLAYER PERFORMING ONE OF THE LISTED ACTIONS?
Compare what you see this player doing against the action types listed above and their VISUAL CUES. The coach-confirmed examples show real instances of each action — match that bar.

- If yes, output the action's exact name from the list.
- If two distinct actions happen in the same <5s passage (e.g. an interception then a pass), output them as one comma-separated entry: "Interception, Pass".
- If no listed action clearly applies, SKIP the frame. Do not flag "positioning", "tracking play", "anticipating", "ready for", "monitoring" — those are not actions.
- Standing in the goal, watching play develop, jogging back into shape, or being visible nearby are NEVER detections, regardless of position.

OUTPUT RULES:
- Only output frames where you can name a real action from the list. Empty output is correct when nothing is happening for this player.
- One passage of play = ONE entry. Do not report the same action across consecutive frames.
- Fouls / cards: only if contact is clearly visible.
- visualCueMatched: copy ONE short phrase from that action's VISUAL CUES that you can actually see in this frame. If you cannot, do not flag.
- confidence: "high" if both player and action are unambiguous; "medium" if the player is identified and a listed action is the most plausible reading of what's happening.${allowedNames.length > 0 ? `
- ALLOWED ACTION NAMES (output one of these or skip): ${allowedNames.join(', ')}` : ''}

CLIP DURATION: use the per-action defaults from the reference (clipBefore / clipAfter), extend for longer build-ups, shorten for instantaneous moments. Default 5/5.`;

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
        JSON.stringify({ actions: [], durationMap, blockedCount: 0, blocklistSize: blocklist.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const rawActions = Array.isArray(parsed?.actions) ? parsed.actions : [];
    const highOnlyKeywords = /(foul|fouled|penalty|red card|yellow card)/i;

    const sanitisedActions = rawActions
      .filter((a: any) => Number.isInteger(a?.frameIndex) && a.frameIndex >= 0 && a.frameIndex < frames.length)
      .map((a: any) => {
        // Accept either a single action name or a comma-separated list of allowed names
        const rawParts = String(a.actionType || '')
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean);
        const canonicalParts: string[] = [];
        for (const part of rawParts) {
          const c = canonicalNameMap[normaliseName(part)];
          if (c && !canonicalParts.includes(c)) canonicalParts.push(c);
        }
        if (canonicalParts.length === 0) return null;
        const canonical = canonicalParts.join(', ');
        const primary = canonicalParts[0];

        const confidence = String(a.confidence || '').toLowerCase();
        if (confidence !== 'high' && confidence !== 'medium') return null;
        if (minConfidence === 'high' && confidence !== 'high') return null;
        if (highOnlyKeywords.test(canonical) && confidence !== 'high') return null;

        // Require a non-empty visual cue tying the flag back to the action's own definition.
        const visualCue = String(a.visualCueMatched || '').trim();
        if (!visualCue) return null;
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

    // Hard blocklist: drop any candidate within ±3s of a known false-positive timestamp on this video for this player.
    const BLOCK_TOL = 3;
    let blockedCount = 0;
    const afterBlocklist = sanitisedActions.filter((det: any) => {
      for (const b of blocklist) {
        if (Math.abs(det.timestamp - b.timestamp) > BLOCK_TOL) continue;
        // not_involved / wrong_player block any action at that moment
        if (b.feedbackType === 'not_involved' || b.feedbackType === 'wrong_player') {
          blockedCount++;
          return false;
        }
        // wrong_action only blocks the same action type
        if (b.feedbackType === 'wrong_action' && b.actionType) {
          const detTypes = String(det.actionType).split(',').map((s: string) => normaliseName(s));
          if (detTypes.includes(normaliseName(b.actionType))) {
            blockedCount++;
            return false;
          }
        }
      }
      return true;
    });

    // Cross-frame dedupe: merge detections within a 5s window into one comma-separated entry
    afterBlocklist.sort((x: any, y: any) => x.timestamp - y.timestamp);
    const merged: any[] = [];
    const confRank: Record<string, number> = { high: 2, medium: 1 };
    for (const det of afterBlocklist) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(det.timestamp - last.timestamp) <= 5) {
        // Merge action types
        const parts = new Set<string>([
          ...String(last.actionType).split(',').map((s: string) => s.trim()),
          ...String(det.actionType).split(',').map((s: string) => s.trim()),
        ]);
        last.actionType = Array.from(parts).join(', ');
        // Promote anchor to the higher-confidence detection
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

    // VERIFIER PASS — for every surviving candidate, re-ask the model in a tight,
    // identity-only prompt: "is the player on screen at this exact moment really X,
    // and are they the one performing this action?". This catches the dominant FP
    // pattern where the first pass labels a teammate's action as the target player's.
    let verifierDropped = 0;
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
                // If the verifier didn't return a verdict for a candidate, drop it (safer default).
                const ok = verdictMap.get(det.frameIndex);
                if (!ok) verifierDropped++;
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

    // Per-minute cap (top 6 by confidence) — guards against floods on a single passage
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

    // Strip internal-only fields before returning
    const finalActions = capped.map(({ timestamp: _t, visualCueMatched: _v, ...rest }) => rest);

    return new Response(
      JSON.stringify({ actions: finalActions, durationMap, blockedCount, blocklistSize: blocklist.length, verifierDropped }),
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
