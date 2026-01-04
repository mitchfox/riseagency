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
    const { content, gameType, title } = await req.json();
    
    if (!content || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Content is required and must be substantial" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert football coach creating challenging scenario-based questions to test a player's tactical understanding.

CRITICAL REQUIREMENTS:
1. Read the provided content CAREFULLY and extract specific tactical principles
2. Create a realistic match scenario where the player must apply THAT SPECIFIC content
3. All 4 answer options must be plausible football decisions that a player might consider
4. Only ONE answer should be definitively correct based on the source content
5. The explanation MUST quote or reference specific phrases from the source material
6. Questions should test APPLICATION and DECISION-MAKING, not just recall

Game type context:
- "schemes": Questions about when/how to execute specific tactical movements based on formation matchups
- "positional-guides": Questions about role-specific responsibilities and positioning decisions
- "concepts": Questions about applying football principles in match situations
- "pre-match": Questions about exploiting opponent weaknesses or countering their strengths

QUALITY STANDARDS:
- The scenario should be specific (e.g., "It's the 35th minute, you're playing as a right winger...")
- Wrong answers should be reasonable alternatives a less-informed player might choose
- The correct answer should require understanding the specific content, not just general football knowledge

Return ONLY valid JSON in this exact format:
{
  "question": "Specific match scenario question requiring application of the content",
  "options": ["Option A - specific action", "Option B - specific action", "Option C - specific action", "Option D - specific action"],
  "correctIndex": 0,
  "explanation": "Detailed explanation with direct reference to the source material: '[quote from content]' - this tells us that..."
}`;

    const userPrompt = `Create a challenging scenario-based question based on this ${gameType.replace('-', ' ')} content.

Title: ${title || 'Tactical Content'}

SOURCE CONTENT (you MUST base your question on specific details from this):
---
${content}
---

Requirements:
1. Extract a KEY PRINCIPLE from the source content above
2. Create a match scenario where that principle must be applied
3. The correct answer must be clearly supported by quotes from the source
4. Wrong answers should be reasonable football alternatives`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI response:", aiContent);
      throw new Error("Could not parse AI response as JSON");
    }

    const questionData = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!questionData.question || !Array.isArray(questionData.options) || 
        questionData.options.length !== 4 || typeof questionData.correctIndex !== 'number' || 
        !questionData.explanation) {
      throw new Error("Invalid question structure from AI");
    }

    return new Response(
      JSON.stringify(questionData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating question:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate question" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
