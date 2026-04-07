import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Outfield metric keys
const OUTFIELD_METRIC_KEYS = [
  "goals_per90", "npxg_per90", "shots_on_target_per90", "on_target_pct",
  "created_own_shot_per90", "total_shots_per90", "shots_outside_box_per90", "shots_inside_box_per90",
  "assists_per90", "xa_per90", "key_passes_per90", "xt_via_live_passes_per90",
  "progressive_passes_per90", "passes_into_final_3rd_per90", "forward_passes_per90",
  "passes_in_opp_half_per90", "passes_in_own_half_per90", "accurate_passes_per90",
  "accurate_long_balls_per90", "accurate_crosses_per90", "pass_accuracy_pct",
  "long_ball_accuracy_pct", "cross_accuracy_pct",
  "successful_dribbles_per90", "dribble_attempts_per90", "dribble_success_pct",
  "progressive_carries_per90", "xt_via_prog_carries_per90", "carries_into_final_3rd_per90",
  "touches_in_opp_box_per90", "fouls_drawn_per90",
  "tackles_won_pct", "aerials_won_pct", "duels_won_pct",
  "tackles_won_per90", "aerials_won_per90", "duels_won_per90",
  "clearances_per90", "interceptions_per90"
];

// Goalkeeper metric keys
const GK_METRIC_KEYS = [
  "gk_clean_sheets", "gk_goals_conceded", "gk_goals_conceded_inside_box", "gk_goals_conceded_outside_box",
  "gk_save_percentage", "gk_shots_on_target_faced", "gk_saves_made",
  "gk_shots_on_target_faced_inside_box", "gk_saves_from_inside_box",
  "gk_shots_on_target_faced_outside_box", "gk_saves_from_outside_box",
  "gk_touches", "gk_passes_completed", "gk_passing_accuracy",
  "gk_long_passes_completed", "gk_long_pass_accuracy",
  "gk_passes_completed_opp_half", "gk_possession_lost",
  "gk_clearances", "gk_ball_recoveries"
];

const OUTFIELD_PROMPT = `Extract all per-90 football statistics from these stat images. The images show stat categories like Shooting, Passing, Possession, and Defending with metric names and their per-90 values.

Return ONLY a JSON object mapping these exact keys to their numeric values. Use these keys:
${JSON.stringify(OUTFIELD_METRIC_KEYS, null, 2)}

Map the image labels to these keys:
- "Goals" -> goals_per90
- "npxG" -> npxg_per90
- "Shots On Target" -> shots_on_target_per90
- "On Target %" -> on_target_pct
- "Created Own Shot" -> created_own_shot_per90
- "Total Shots" -> total_shots_per90
- "Shots Outside Box" -> shots_outside_box_per90
- "Shots Inside Box" -> shots_inside_box_per90
- "Assists" -> assists_per90
- "xA" -> xa_per90
- "Key Passes" -> key_passes_per90
- "xT via Live Passes" -> xt_via_live_passes_per90
- "Progressive Passes" -> progressive_passes_per90
- "Passes Into Final 3rd" -> passes_into_final_3rd_per90
- "Forward Passes" -> forward_passes_per90
- "Passes in Opp. Half" -> passes_in_opp_half_per90
- "Passes in Own Half" -> passes_in_own_half_per90
- "Accurate Passes" -> accurate_passes_per90
- "Accurate Long Balls" -> accurate_long_balls_per90
- "Accurate Crosses" -> accurate_crosses_per90
- "Pass Accuracy %" -> pass_accuracy_pct
- "Long Ball Accuracy %" -> long_ball_accuracy_pct
- "Cross Accuracy %" -> cross_accuracy_pct
- "Successful Dribbles" -> successful_dribbles_per90
- "Dribble Attempts" -> dribble_attempts_per90
- "Dribble Success %" -> dribble_success_pct
- "Progressive Carries" -> progressive_carries_per90
- "xT via Prog. Carries" -> xt_via_prog_carries_per90
- "Carries Into Final 1/3" or "Carries Into Final ⅓" -> carries_into_final_3rd_per90
- "Touches In Opp. Box" -> touches_in_opp_box_per90
- "Fouls Drawn" -> fouls_drawn_per90
- "Tackles Won %" -> tackles_won_pct
- "Aerials Won %" -> aerials_won_pct
- "Duels Won %" -> duels_won_pct
- "Tackles Won" -> tackles_won_per90
- "Aerials Won" -> aerials_won_per90
- "Duels Won" -> duels_won_per90
- "Clearances" -> clearances_per90
- "Interceptions" -> interceptions_per90

The values shown are the per-90 numbers (the numeric value on the right side of each row, NOT the percentile bar position).
Only include metrics you can find in the images. Return raw JSON only, no markdown.`;

const GK_PROMPT = `Extract all goalkeeper statistics from these stat images. The images show goalkeeper-specific categories like Overall, Shot Performance, and Passing with metric names and their values.

Return ONLY a JSON object mapping these exact keys to their numeric values. Use these keys:
${JSON.stringify(GK_METRIC_KEYS, null, 2)}

Map the image labels to these keys:
- "Clean Sheets" -> gk_clean_sheets
- "Goals Conceded" -> gk_goals_conceded
- "Goals Conceded Inside Box" -> gk_goals_conceded_inside_box
- "Goals Conceded Outside Box" -> gk_goals_conceded_outside_box
- "Save Percentage" or "Save %" -> gk_save_percentage
- "Shots On Target Faced" -> gk_shots_on_target_faced
- "Saves Made" or "Saves" -> gk_saves_made
- "Shots On Target Faced (Inside the Box)" or "SoT Inside Box" -> gk_shots_on_target_faced_inside_box
- "Saves Made from Inside Box" or "Saves Inside Box" -> gk_saves_from_inside_box
- "Shots On Target Faced (Outside the Box)" or "SoT Outside Box" -> gk_shots_on_target_faced_outside_box
- "Saves Made from Outside Box" or "Saves Outside Box" -> gk_saves_from_outside_box
- "Touches" -> gk_touches
- "Passes Completed" -> gk_passes_completed
- "Passing Accuracy" or "Passing Accuracy (%)" -> gk_passing_accuracy
- "Long Passes Completed" -> gk_long_passes_completed
- "Long Pass Accuracy" or "Long Pass Accuracy (%)" -> gk_long_pass_accuracy
- "Passes completed (Opp. Half)" or "Passes Completed Opp Half" -> gk_passes_completed_opp_half
- "Possession Lost" -> gk_possession_lost
- "Clearances" -> gk_clearances
- "Ball Recoveries" -> gk_ball_recoveries

Extract the actual numeric values shown. Return raw JSON only, no markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { images, isGoalkeeper } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error("No images provided");
    }

    const METRIC_KEYS = isGoalkeeper ? GK_METRIC_KEYS : OUTFIELD_METRIC_KEYS;
    const promptText = isGoalkeeper ? GK_PROMPT : OUTFIELD_PROMPT;

    const content: any[] = [
      { type: "text", text: promptText },
      ...images.map((img: string) => ({
        type: "image_url",
        image_url: { url: img }
      }))
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";
    
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const metrics = JSON.parse(jsonStr);

    const cleanMetrics: Record<string, number> = {};
    for (const [key, val] of Object.entries(metrics)) {
      if (METRIC_KEYS.includes(key) && typeof val === 'number') {
        cleanMetrics[key] = val;
      }
    }

    return new Response(JSON.stringify({ metrics: cleanMetrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("extract-player-stats error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
