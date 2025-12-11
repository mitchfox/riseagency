import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "texts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    if (texts.length > 20) {
      return new Response(
        JSON.stringify({ error: "Maximum 20 texts per batch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create numbered text format for batch translation
    const numberedTexts = texts.map((text, i) => `[TEXT_${i}]${text}[/TEXT_${i}]`).join("\n");

    const systemPrompt = `You are a professional translator for a football agency website. You will receive multiple texts marked with [TEXT_N]...[/TEXT_N] tags.

Translate ALL texts into Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, and Turkish.

Important guidelines:
- Keep the same tone and style as the original
- Preserve any technical football terminology appropriately for each language
- Keep any formatting consistent
- If text contains proper nouns or brand names, keep them unchanged

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks):
{
  "translations": [
    {
      "spanish": "translation",
      "portuguese": "translation",
      "french": "translation",
      "german": "translation",
      "italian": "translation",
      "polish": "translation",
      "czech": "translation",
      "russian": "translation",
      "turkish": "translation"
    }
  ]
}

The translations array MUST have exactly ${texts.length} items, one for each input text in order.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate these texts:\n${numberedTexts}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI translation service unavailable");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No translation content received");
    }

    // Parse the JSON response
    let parsed;
    try {
      let cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      cleanedContent = cleanedContent.replace(/\\\\n/g, "\\n");
      cleanedContent = cleanedContent.replace(/\\([^"\\\/bfnrtu])/g, "$1");
      
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let extracted = jsonMatch[0]
            .replace(/\\\\n/g, "\\n")
            .replace(/\\([^"\\\/bfnrtu])/g, "$1");
          parsed = JSON.parse(extracted);
        } catch {
          throw new Error("Failed to parse batch translation response");
        }
      } else {
        throw new Error("Failed to parse batch translation response");
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Batch translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Batch translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
