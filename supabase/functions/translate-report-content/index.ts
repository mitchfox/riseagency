import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  pl: "Polish",
  cs: "Czech",
  ru: "Russian",
  tr: "Turkish",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fields, targetLanguage } = await req.json();

    if (!fields || !targetLanguage || !LANGUAGE_NAMES[targetLanguage]) {
      return new Response(
        JSON.stringify({ error: "fields (object) and targetLanguage (language code) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langName = LANGUAGE_NAMES[targetLanguage];

    // Build a structured prompt with labelled fields
    const fieldEntries = Object.entries(fields).filter(([_, v]) => v && String(v).trim());
    if (fieldEntries.length === 0) {
      return new Response(
        JSON.stringify({ translations: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numberedFields = fieldEntries
      .map(([key, value], i) => `[FIELD_${key}]${value}[/FIELD_${key}]`)
      .join("\n\n");

    const systemPrompt = `You are a professional football/soccer translator. Translate ALL text fields from English into ${langName}.

Important guidelines:
- Translate EVERY field, including football action types like "double team", "pressing", "tackle", "interception", "dribble", etc. into the correct ${langName} football terminology
- Keep the same tone, style, and level of detail
- Use natural ${langName} football vocabulary — do NOT leave English football terms untranslated unless they are universally used in ${langName} football culture (e.g., "corner" in some languages)
- Keep proper nouns, player names, club names, and brand names unchanged
- Keep any numbers, scores, and statistics unchanged
- Preserve formatting (line breaks, punctuation)

You will receive fields wrapped in [FIELD_key]...[/FIELD_key] tags.
Return ONLY a valid JSON object where each key matches the original field key and the value is the ${langName} translation.
No markdown, no code blocks, just the JSON object.`;

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
          { role: "user", content: `Translate these fields into ${langName}:\n\n${numberedFields}` },
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

    let translations;
    try {
      let cleaned = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      cleaned = cleaned.replace(/\\\\n/g, "\\n");
      cleaned = cleaned.replace(/\\([^"\\\/bfnrtu])/g, "$1");
      translations = JSON.parse(cleaned);
    } catch {
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
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
