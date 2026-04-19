// Supabase Edge Function: ai-track-player
// Given a sequence of video frames + a click position on the first frame,
// returns the player's position in each subsequent frame as {x, y} in 0-100 % units.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrackRequest {
  frames: { time: number; dataUrl: string }[]; // base64 data URLs
  initialClick: { x: number; y: number }; // 0-100 % on first frame
}

interface TrackPoint {
  time: number;
  x: number;
  y: number;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { frames, initialClick } = (await req.json()) as TrackRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "frames required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a precision football player tracker. Given a sequence of video frames and the position of a player marked on the first frame, you must locate the SAME player in every subsequent frame.

Coordinates use a 0-100 percentage system where (0,0) is top-left and (100,100) is bottom-right of each frame.

The user has marked a player at approximately (${initialClick.x.toFixed(1)}, ${initialClick.y.toFixed(1)}) on frame 0. Return that exact position for frame 0, then locate the same player in each subsequent frame.

Return STRICT JSON via the report_track tool. If the player is occluded or off-screen in a frame, set confidence to 0 and use the last known position.`;

    const userContent: any[] = [
      { type: "text", text: `Track the player marked at (${initialClick.x.toFixed(1)}, ${initialClick.y.toFixed(1)}) on frame 0 across all ${frames.length} frames.` },
    ];
    for (let i = 0; i < frames.length; i++) {
      userContent.push({ type: "text", text: `Frame ${i} (t=${frames[i].time.toFixed(2)}s):` });
      userContent.push({ type: "image_url", image_url: { url: frames[i].dataUrl } });
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_track",
            description: "Report tracked player positions in 0-100 percentage units",
            parameters: {
              type: "object",
              properties: {
                positions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      frame_index: { type: "integer", description: "0-indexed frame number" },
                      x: { type: "number", description: "horizontal position 0-100 %" },
                      y: { type: "number", description: "vertical position 0-100 %" },
                      confidence: { type: "number", description: "0-1, where 0 = lost, 1 = certain" },
                    },
                    required: ["frame_index", "x", "y", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["positions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_track" } },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Add funds to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool_call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return positions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    const positions: TrackPoint[] = (args.positions || []).map((p: any) => ({
      time: frames[p.frame_index]?.time ?? 0,
      x: Math.max(0, Math.min(100, p.x)),
      y: Math.max(0, Math.min(100, p.y)),
      confidence: p.confidence ?? 1,
    }));

    return new Response(JSON.stringify({ positions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-track-player error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
