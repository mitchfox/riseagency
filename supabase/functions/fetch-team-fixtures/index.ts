import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_AI_URL = "https://api.lovable.app/v1/ai";

Deno.serve(async (req) => {
  try {
    const { teamName } = await req.json();

    if (!teamName) {
      return new Response(
        JSON.stringify({ error: "Team name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI to fetch upcoming fixtures for the team
    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Find the next 5-10 upcoming fixtures for the football team "${teamName}". 
            
            Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
            [
              {
                "home_team": "Team Name",
                "away_team": "Team Name",
                "match_date": "YYYY-MM-DD",
                "competition": "League/Cup Name",
                "venue": "Stadium Name"
              }
            ]
            
            If you cannot find any fixtures, return an empty array: []`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse the AI response - try to extract JSON even if wrapped in markdown
    let fixtures = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      fixtures = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      fixtures = [];
    }

    return new Response(
      JSON.stringify({ fixtures }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching fixtures:", error);
    return new Response(
      JSON.stringify({ error: error.message, fixtures: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
