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

    // Call Lovable AI Gateway with web search
    console.log("Searching web for fixtures...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are a football fixtures researcher. Use web search to find accurate, real fixture data. Always return valid JSON arrays only."
          },
          {
            role: "user",
            content: `Search the internet and find the next 5-10 REAL upcoming fixtures for "${teamName}". Find their actual scheduled matches from their league website, official team site, or sports news sites.
            
            Return ONLY a valid JSON array (no markdown, no explanation):
            [
              {
                "home_team": "Team Name",
                "away_team": "Team Name", 
                "match_date": "YYYY-MM-DD",
                "competition": "League/Cup Name",
                "venue": "Stadium Name"
              }
            ]
            
            If you cannot find real fixtures, return: []`
          }
        ],
        web_search: true
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
