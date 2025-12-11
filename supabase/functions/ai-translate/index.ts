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
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional translator for a football agency website. Translate the given English text into Spanish, Portuguese, French, German, Italian, Polish, Czech, Russian, and Turkish. 

Important guidelines:
- Keep the same tone and style as the original
- Preserve any technical football terminology appropriately for each language
- Keep any formatting (uppercase, punctuation) consistent
- If the text contains proper nouns or brand names, keep them unchanged

Return ONLY a valid JSON object with exactly this structure (no markdown, no code blocks):
{
  "spanish": "Spanish translation here",
  "portuguese": "Portuguese translation here",
  "french": "French translation here",
  "german": "German translation here",
  "italian": "Italian translation here",
  "polish": "Polish translation here",
  "czech": "Czech translation here",
  "russian": "Russian translation here",
  "turkish": "Turkish translation here"
}`;

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
          { role: "user", content: `Translate this text: "${text}"` },
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
    let translations;
    try {
      // Clean the response in case it has markdown code blocks
      let cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      // Fix common escape sequence issues (e.g., \\n that should be \n)
      cleanedContent = cleanedContent.replace(/\\\\n/g, "\\n");
      // Fix malformed escapes like \D which should just be D
      cleanedContent = cleanedContent.replace(/\\([^"\\\/bfnrtu])/g, "$1");
      
      translations = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Try to extract JSON from the response as a fallback
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let extracted = jsonMatch[0]
            .replace(/\\\\n/g, "\\n")
            .replace(/\\([^"\\\/bfnrtu])/g, "$1");
          translations = JSON.parse(extracted);
        } catch {
          throw new Error("Failed to parse translation response");
        }
      } else {
        throw new Error("Failed to parse translation response");
      }
    }

    return new Response(
      JSON.stringify(translations),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
