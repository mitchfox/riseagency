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
    const { image, teamName, playerName } = await req.json();
    console.log("Processing fixture list image for team:", teamName, "player:", playerName);

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const today = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    console.log("Sending image to AI for fixture extraction");
    
    // Call Lovable AI with vision to extract fixtures from image
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
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL football fixtures from this image for the player's team: ${teamName}. Today's date is ${today}.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- The player plays for ${teamName} - this is THEIR team
- Extract EVERY match visible in the image
- **TEAM IDENTIFICATION**: Figure out which team in each match is ${teamName} (the player's team) and which is the opponent
- **COLOR CODING**: The image likely uses color coding for results:
  * GREEN background/highlight = WIN (${teamName} scored more)
  * BLUE background/highlight = DRAW (equal scores)
  * RED background/highlight = LOSS (${teamName} scored less)
- **SCORES/RESULTS**: Extract the score. Use the color to verify who won:
  * If GREEN and score shows "2-1", ${teamName} scored 2, opponent scored 1
  * If RED and score shows "0-1", ${teamName} scored 0, opponent scored 1
  * If BLUE and score shows "1-1", it's a draw
- **MINUTES PLAYED**: If the image shows minutes played for ${playerName || 'the player'} (like "90 min", "45 min", "60'"), extract it
- Preserve exact team names as shown
- Convert dates to YYYY-MM-DD format (if only "07/11" shown, assume ${currentYear})
- Include competition name if visible (FNL, Czech Cup, etc.)

Return ONLY a valid JSON array with NO markdown formatting:
[
  {
    "home_team": "Team Name",
    "away_team": "Team Name",
    "match_date": "YYYY-MM-DD",
    "competition": "League Name",
    "venue": "Venue Name or TBD",
    "home_score": number or null,
    "away_score": number or null,
    "minutes_played": number or null
  }
]

CRITICAL: Make sure home_team and away_team are assigned correctly. One of them should be ${teamName}. Use the color coding and score to determine which team won.

Extract ALL fixtures visible. Do NOT skip any matches.`
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
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
    
    // Parse the AI response
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
      
      // CRITICAL: Replace "For" with actual team name
      // The AI sometimes extracts "For" as a placeholder instead of the team name
      fixtures = fixtures.map((fixture: any) => ({
        ...fixture,
        home_team: fixture.home_team === "For" || fixture.home_team.toLowerCase() === "for" 
          ? teamName 
          : fixture.home_team,
        away_team: fixture.away_team === "For" || fixture.away_team.toLowerCase() === "for"
          ? teamName
          : fixture.away_team,
      }));
      
      console.log("Successfully parsed and processed fixtures:", fixtures.length);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      console.error("Content was:", content);
      fixtures = [];
    }

    return new Response(
      JSON.stringify({ 
        fixtures,
        rawResponse,
        teamName,
        source: "Extracted from uploaded image using AI vision"
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        } 
      }
    );
  } catch (error) {
    console.error("Error processing image:", error);
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
