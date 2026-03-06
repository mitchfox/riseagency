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
    const { actions, statDefinitions, existingStats } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
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
      .map((s: any) => `- ${s.key} (${s.name}, type: ${s.mode})`)
      .join("\n");

    const existingStatsText = existingStats && existingStats.length > 0
      ? `\n\nAlready recorded stats:\n${existingStats.map((s: any) => `- ${s.key}: ${s.type === 'success_fail' ? `${s.successful}/${s.total}` : s.type === 'count' ? s.count : s.score}`).join("\n")}`
      : "";

    const systemPrompt = `You are a football performance analyst. Given match actions, suggest match statistics.

PITCH ZONE SYSTEM (zones 1-18):
- Zones 1-3: Own penalty area, 4-6: Deep defensive, 7-9: Own half near halfway
- Zones 10-12: Opposition half, 13-15: Final third, 16-18: Opposition penalty area
- Columns: Left (1,4,7,10,13,16), Centre (2,5,8,11,14,17), Right (3,6,9,12,15,18)

STAT TYPES:
- success_fail: Has successful count and total count (e.g. 3/5 dribbles)
- count: Simple count (e.g. 4 interceptions)
- score: Decimal value (e.g. 0.45 xG)

RULES:
- Be LENIENT. If an action could contribute to a stat, include it.
- For success_fail stats, estimate both successful and total attempts.
- For count stats, count relevant actions.
- For score stats (xG, xA, npxG), estimate reasonable decimal values.
- Only suggest stats that have clear evidence in the actions.
- List which action numbers contribute to each stat.${existingStatsText}`;

    const userPrompt = `Here are the performance actions:\n\n${actionsText}\n\nAvailable stat definitions:\n${statsText}\n\nAnalyse each action and suggest match statistics. Only include stats where you find evidence in the actions.`;

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
                name: "suggest_match_stats",
                description: "Return suggested match statistics based on performance actions.",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          stat_key: { type: "string" },
                          stat_type: { type: "string", enum: ["success_fail", "count", "score"] },
                          successful: { type: "number", description: "For success_fail type" },
                          total: { type: "number", description: "For success_fail type" },
                          count: { type: "number", description: "For count type" },
                          score: { type: "number", description: "For score type" },
                          reasoning: { type: "string" },
                          contributing_action_numbers: {
                            type: "array",
                            items: { type: "number" },
                          },
                        },
                        required: ["stat_key", "stat_type", "reasoning", "contributing_action_numbers"],
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
            function: { name: "suggest_match_stats" },
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
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(
      JSON.stringify({ suggestions: parsed.suggestions || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("suggest-match-stats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
