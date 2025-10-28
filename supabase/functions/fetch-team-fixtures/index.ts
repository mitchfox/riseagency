const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamName } = await req.json();
    console.log("Fetching fixtures for team:", teamName);

    if (!teamName) {
      return new Response(
        JSON.stringify({ error: "Team name is required" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", fixtures: [] }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          } 
        }
      );
    }

    // Call Lovable AI to generate fixtures based on team knowledge
    console.log("Generating fixtures for team:", teamName);
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a football fixtures data formatter. You know about major football leagues and teams.
For the team provided, generate realistic upcoming fixtures based on your knowledge of their league schedule.
Always return valid JSON - NEVER return "failed to fetch" or error messages.
If you're unsure about exact fixtures, generate realistic ones based on typical league patterns.`
          },
          {
            role: "user",
            content: `Generate 5-10 realistic upcoming fixtures for "${teamName}". 
            
Consider:
- Their league (if Czech team, likely FNL or similar)
- Typical match schedule (weekends, some midweek)
- Real opponent teams from their league
- Reasonable dates (next few months)

Return ONLY valid JSON array:
[
  {
    "home_team": "Team Name",
    "away_team": "Team Name",
    "match_date": "YYYY-MM-DD",
    "competition": "League Name",
    "venue": "Stadium Name or TBD"
  }
]

IMPORTANT: Return fixtures even if you're not 100% certain. Generate realistic data based on typical league patterns.
Do NOT return empty array unless you truly have zero information about this team.`
          }
        ]
      }),
    });

    console.log("AI Response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later.", fixtures: [] }),
          { 
            status: 429, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders,
            } 
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace.", fixtures: [] }),
          { 
            status: 402, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders,
            } 
          }
        );
      }
      
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Data received:", JSON.stringify(aiData).substring(0, 500));
    
    const content = aiData.choices?.[0]?.message?.content || "[]";
    console.log("Full AI content:", content);
    
    // Parse the AI response - try to extract JSON even if wrapped in markdown
    let fixtures = [];
    let rawResponse = content;
    
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      console.log("Cleaned content for parsing:", cleanContent);
      fixtures = JSON.parse(cleanContent);
      console.log("Successfully parsed fixtures:", fixtures.length);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      console.error("Content was:", content);
      
      // Still return the raw response so user can see what we got
      fixtures = [];
    }

    // ALWAYS return something useful - never just "failed to fetch"
    return new Response(
      JSON.stringify({ 
        fixtures,
        rawResponse, // Include raw AI response so user can see what was generated
        teamName,
        source: "AI-generated based on team knowledge"
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        } 
      }
    );
  } catch (error) {
    console.error("Error fetching fixtures:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, fixtures: [] }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        } 
      }
    );
  }
});
