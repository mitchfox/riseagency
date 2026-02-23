import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actions, statDefinitions } = await req.json();

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
          `Action #${a.action_number || i + 1} (min ${a.minute || "?"}, score ${a.action_score || "?"}): [${a.action_type || "unknown"}] ${a.action_description || ""} ${a.notes ? "— " + a.notes : ""}`
      )
      .join("\n");

    const statsText = (statDefinitions || [])
      .map((s: any) => `- ${s.key}: ${s.label}`)
      .join("\n");

    const systemPrompt = `You are a football performance analyst. Given a list of match actions from a player's performance report, suggest raw match totals for each stat category.

IMPORTANT RULES:
- Be LENIENT and INCLUSIVE. When in doubt, include the action as contributing to a stat.
- These are RAW MATCH TOTALS (counts), not per-90 values.
- For goals: count actions that clearly describe a goal being scored.
- For assists: count actions that clearly describe an assist.
- For shots: count any action involving a shot attempt.
- For tackles, interceptions, clearances etc: count any action that describes these defensive actions.
- For progressive passes/carries: count actions describing forward passing or carrying the ball.
- For npxG/xA: estimate reasonable values based on the quality of chances described (these are decimal scores, not counts).
- Only suggest stats where you can identify at least one contributing action.
- For each stat, list which action numbers you think contribute to it.`;

    const userPrompt = `Here are the performance actions from the match:

${actionsText}

Here are the stat categories to analyse:

${statsText}

Analyse each action and suggest raw totals for each relevant stat. Be lenient - if an action could reasonably contribute to a stat, include it.`;

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
                  "Return suggested raw match totals for each stat based on the performance actions.",
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

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ suggestions: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const suggestionsArray = parsed.suggestions || [];

    // Convert array to map keyed by stat_key
    const suggestionsMap: Record<
      string,
      { value: number; reasoning: string; contributing_action_numbers: number[] }
    > = {};
    for (const s of suggestionsArray) {
      suggestionsMap[s.stat_key] = {
        value: s.value,
        reasoning: s.reasoning,
        contributing_action_numbers: s.contributing_action_numbers,
      };
    }

    return new Response(
      JSON.stringify({ suggestions: suggestionsMap }),
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
