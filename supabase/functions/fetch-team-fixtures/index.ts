const LOVABLE_AI_URL = "https://api.lovable.app/v1/ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
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
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Call Lovable AI to fetch upcoming fixtures for the team
    console.log("Calling Lovable AI...");
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
            content: `Find the next 5-10 upcoming fixtures for the football team "${teamName}". Search for their official fixtures including league and cup matches.
            
            Return ONLY a valid JSON array with this exact structure (no markdown, no explanation, no code blocks):
            [
              {
                "home_team": "Team Name",
                "away_team": "Team Name",
                "match_date": "YYYY-MM-DD",
                "competition": "League/Cup Name",
                "venue": "Stadium Name"
              }
            ]
            
            If you cannot find any fixtures, return an empty array: []
            
            Make sure the response is pure JSON without any markdown formatting.`,
          },
        ],
      }),
    });

    console.log("AI Response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Data received:", JSON.stringify(aiData).substring(0, 200));
    
    const content = aiData.choices?.[0]?.message?.content || "[]";
    console.log("Content to parse:", content);
    
    // Parse the AI response - try to extract JSON even if wrapped in markdown
    let fixtures = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      console.log("Cleaned content:", cleanContent);
      fixtures = JSON.parse(cleanContent);
      console.log("Parsed fixtures:", fixtures.length);
    } catch (e) {
      console.error("Failed to parse AI response:", content, e);
      fixtures = [];
    }

    return new Response(
      JSON.stringify({ fixtures }),
      { 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
