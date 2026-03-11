import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type FixtureSuggestion = {
  value: number;
  reasoning: string;
  contributing_action_numbers: number[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const appendReasoning = (existing: string, note: string) =>
  existing ? `${existing} (${note})` : note;

const isLikelyDecimalMetric = (key: string) =>
  key.includes("_pct") ||
  key === "npxg_per90" ||
  key === "xa_per90" ||
  key === "xt_via_live_passes_per90" ||
  key === "xt_via_prog_carries_per90" ||
  key === "created_own_shot_per90";

const enforceMaxConstraint = (
  suggestions: Record<string, FixtureSuggestion>,
  childKey: string,
  parentKey: string,
  reason: string
) => {
  const child = suggestions[childKey];
  const parent = suggestions[parentKey];
  if (!child || !parent) return;

  if (child.value > parent.value) {
    child.value = parent.value;
    child.reasoning = appendReasoning(child.reasoning, reason);
  }
};

const normaliseFixtureSuggestions = (
  suggestions: Record<string, FixtureSuggestion>
): Record<string, FixtureSuggestion> => {
  // Base sanitisation
  for (const [key, suggestion] of Object.entries(suggestions)) {
    const parsedValue = Number(suggestion.value);
    const safeValue = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

    suggestion.value = isLikelyDecimalMetric(key)
      ? safeValue
      : Math.round(safeValue);

    if (key.includes("_pct")) {
      suggestion.value = clamp(suggestion.value, 0, 100);
    }
  }

  // Core arithmetic constraints
  enforceMaxConstraint(suggestions, "shots_on_target_per90", "total_shots_per90", "capped to total shots");
  enforceMaxConstraint(suggestions, "goals_per90", "shots_on_target_per90", "capped to shots on target");
  enforceMaxConstraint(suggestions, "assists_per90", "key_passes_per90", "capped to key passes");
  enforceMaxConstraint(suggestions, "accurate_long_balls_per90", "accurate_passes_per90", "capped to accurate passes");
  enforceMaxConstraint(suggestions, "accurate_crosses_per90", "accurate_passes_per90", "capped to accurate passes");

  const accuratePasses = suggestions["accurate_passes_per90"];
  const passesOwnHalf = suggestions["passes_in_own_half_per90"];
  const passesOppHalf = suggestions["passes_in_opp_half_per90"];

  if (accuratePasses && passesOwnHalf && passesOppHalf) {
    const halvesTotal = passesOwnHalf.value + passesOppHalf.value;
    if (halvesTotal > accuratePasses.value && accuratePasses.value >= 0) {
      if (accuratePasses.value === 0) {
        passesOwnHalf.value = 0;
        passesOppHalf.value = 0;
      } else {
        const ownRatio = passesOwnHalf.value / halvesTotal;
        const adjustedOwn = Math.round(accuratePasses.value * ownRatio);
        const adjustedOpp = Math.max(0, Math.round(accuratePasses.value - adjustedOwn));
        passesOwnHalf.value = adjustedOwn;
        passesOppHalf.value = adjustedOpp;
      }

      passesOwnHalf.reasoning = appendReasoning(
        passesOwnHalf.reasoning,
        "rebalanced so own+opp half passes cannot exceed accurate passes"
      );
      passesOppHalf.reasoning = appendReasoning(
        passesOppHalf.reasoning,
        "rebalanced so own+opp half passes cannot exceed accurate passes"
      );
    }
  }

  // Keep pass accuracy mathematically consistent where both values exist
  const passesTotal = suggestions["passes_total"];
  const passAccuracy = suggestions["pass_accuracy_pct"];

  if (passesTotal && accuratePasses && passesTotal.value > 0) {
    if (accuratePasses.value > passesTotal.value) {
      accuratePasses.value = passesTotal.value;
      accuratePasses.reasoning = appendReasoning(
        accuratePasses.reasoning,
        "capped to total passes"
      );
    }

    if (passAccuracy) {
      passAccuracy.value = clamp((accuratePasses.value / passesTotal.value) * 100, 0, 100);
      passAccuracy.reasoning = appendReasoning(
        passAccuracy.reasoning,
        "recomputed from accurate/total passes"
      );
    }
  }

  return suggestions;
};

const isPassLikeAction = (action: any): boolean => {
  const text = `${action.action_type || ""} ${action.action_description || ""} ${action.notes || ""}`.toLowerCase();
  return /(pass|cross|through ball|long ball|switch|assist|key pass)/.test(text);
};

const buildZoneEvidenceText = (actions: any[]): string => {
  let ownHalfActions = 0;
  let oppHalfActions = 0;
  let finalThirdActions = 0;
  let boxActions = 0;
  let passOwnHalf = 0;
  let passOppHalf = 0;

  for (const action of actions) {
    const zone = Number(action.zone);
    const validZone = Number.isFinite(zone) ? zone : null;
    if (!validZone || validZone < 1 || validZone > 18) continue;

    if (validZone <= 9) ownHalfActions += 1;
    if (validZone >= 10) oppHalfActions += 1;
    if (validZone >= 13) finalThirdActions += 1;
    if (validZone >= 16) boxActions += 1;

    if (isPassLikeAction(action)) {
      if (validZone <= 9) passOwnHalf += 1;
      else passOppHalf += 1;
    }
  }

  return `Grid evidence snapshot:
- Actions in own half zones (1-9): ${ownHalfActions}
- Actions in opposition half zones (10-18): ${oppHalfActions}
- Actions in final third zones (13-18): ${finalThirdActions}
- Actions in opposition box zones (16-18): ${boxActions}
- Pass-like actions in own half zones: ${passOwnHalf}
- Pass-like actions in opposition half zones: ${passOppHalf}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actions, statDefinitions, previousStats } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionsText = actions
      .map(
        (a: any, i: number) =>
          `Action #${a.action_number || i + 1} (min ${a.minute || "?"}, score ${a.action_score || "?"}, zone ${a.zone || "?"}): [${a.action_type || "unknown"}] ${a.action_description || ""} ${a.notes ? "— " + a.notes : ""}`
      )
      .join("\n");

    const statsText = (statDefinitions || [])
      .map((s: any) => `- ${s.key}: ${s.label}`)
      .join("\n");

    const previousStatsText = previousStats && Object.keys(previousStats).length > 0
      ? `\n\nPrevious match stats for this player (context only):\n${Object.entries(previousStats).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
      : "";

    const zoneEvidenceText = buildZoneEvidenceText(actions);

    const systemPrompt = `You are a football performance analyst. Given a list of match actions from a player's performance report, suggest raw match totals for EVERY stat category provided.

PITCH ZONE SYSTEM:
Each action may have a zone (1-18) indicating where on the pitch it occurred:
- Zones 1-3: Defensive box area (own penalty area)
- Zones 4-6: Deep defensive (own half, behind halfway)
- Zones 7-9: Own half (approaching halfway line)
- Zones 10-12: Opposition half (just past halfway)
- Zones 13-15: Final third (approaching opposition box)
- Zones 16-18: Opposition box area (opposition penalty area)
- Columns: Left (1,4,7,10,13,16), Centre (2,5,8,11,14,17), Right (3,6,9,12,15,18)

CRITICAL RULES:
- You MUST provide a suggestion for EVERY stat listed below.
- These are RAW MATCH TOTALS, not per-90 values.
- Be evidence-driven. If unsure, prefer lower values over inflated values.
- For pass-zone stats, use action zones directly:
  - passes_in_own_half_per90 should come from pass-like actions in zones 1-9.
  - passes_in_opp_half_per90 should come from pass-like actions in zones 10-18.
- Arithmetic consistency is mandatory:
  - shots_on_target_per90 <= total_shots_per90
  - goals_per90 <= shots_on_target_per90
  - passes_in_own_half_per90 + passes_in_opp_half_per90 <= accurate_passes_per90
  - accurate_crosses_per90 <= accurate_passes_per90
  - accurate_long_balls_per90 <= accurate_passes_per90
  - pass_accuracy_pct must be between 0 and 100
- For score stats (xG, xA, npxG), estimate reasonable decimal values.
- For each stat, list which action numbers contribute to it.${previousStatsText}`;

    const userPrompt = `Here are the performance actions from the match:

${actionsText}

${zoneEvidenceText}

Here are ALL the stat categories you MUST analyse and provide suggestions for:

${statsText}

Analyse each action and suggest raw totals for EVERY stat listed above. Keep values physically possible and arithmetically consistent.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_stats",
                description:
                  "Return suggested raw match totals for every stat based on performance actions.",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          stat_key: {
                            type: "string",
                            description: "The stat key from the definitions",
                          },
                          value: {
                            type: "number",
                            description: "The suggested raw total",
                          },
                          reasoning: {
                            type: "string",
                            description: "Brief explanation of why this value",
                          },
                          contributing_action_numbers: {
                            type: "array",
                            items: { type: "number" },
                            description:
                              "Action numbers that contribute to this stat",
                          },
                        },
                        required: [
                          "stat_key",
                          "value",
                          "reasoning",
                          "contributing_action_numbers",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_stats" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ suggestions: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const suggestionsArray = parsed.suggestions || [];

    const suggestionsMap: Record<string, FixtureSuggestion> = {};
    for (const suggestion of suggestionsArray) {
      suggestionsMap[suggestion.stat_key] = {
        value: suggestion.value,
        reasoning: suggestion.reasoning,
        contributing_action_numbers: suggestion.contributing_action_numbers,
      };
    }

    const normalisedSuggestions = normaliseFixtureSuggestions(suggestionsMap);

    return new Response(
      JSON.stringify({ suggestions: normalisedSuggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("suggest-fixture-stats error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
