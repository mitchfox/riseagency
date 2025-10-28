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

    // Get current date and date range for filtering
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDay = now.getDate();
    const today = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    
    // Calculate one month ago and one month ahead
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const oneMonthAhead = new Date(now);
    oneMonthAhead.setMonth(now.getMonth() + 1);
    
    const startDate = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}-${String(oneMonthAgo.getDate()).padStart(2, '0')}`;
    const endDate = `${oneMonthAhead.getFullYear()}-${String(oneMonthAhead.getMonth() + 1).padStart(2, '0')}-${String(oneMonthAhead.getDate()).padStart(2, '0')}`;

    console.log(`Generating fixtures for team: ${teamName} between ${startDate} and ${endDate}`);
    
    // Call Lovable AI to generate fixtures based on team knowledge
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
            content: `You are a football fixtures data formatter with access to current football league schedules.
Today's date is ${today}. We are in the year ${currentYear}.
Generate realistic fixtures for teams based on their current league schedules.
Always return valid JSON - NEVER return "failed to fetch" or error messages.`
          },
          {
            role: "user",
            content: `Generate realistic fixtures for "${teamName}" between ${startDate} and ${endDate}.

CRITICAL REQUIREMENTS:
- Today is ${today}
- We are in ${currentYear} 
- ALL match dates MUST be in ${currentYear} (not 2024 or earlier!)
- Generate fixtures between ${startDate} and ${endDate}
- Mix of recent past matches and upcoming matches around today's date

For Czech teams like Jihlava:
- Current season is ${currentYear-1}-${currentYear} (e.g., 2024-2025)
- They play in FNL (Czech second division)
- Common opponents: Zbrojovka Brno, Dukla Prague, Sigma Olomouc B, Chrudim, Opava, Varnsdorf, etc.
- Matches typically on weekends

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

CRITICAL: Use dates from ${currentYear} ONLY, specifically between ${startDate} and ${endDate}. Generate 5-10 fixtures.`
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
      const parsedFixtures = JSON.parse(cleanContent);
      
      // Filter fixtures to only include those within our date range
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      const oneMonthAhead = new Date(now);
      oneMonthAhead.setMonth(now.getMonth() + 1);
      
      fixtures = parsedFixtures.filter((fixture: any) => {
        const fixtureDate = new Date(fixture.match_date);
        return fixtureDate >= oneMonthAgo && fixtureDate <= oneMonthAhead;
      });
      
      console.log(`Filtered to ${fixtures.length} fixtures within date range (from ${parsedFixtures.length} total)`);
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
        dateRange: { start: startDate, end: endDate, today },
        source: "AI-generated based on team knowledge, filtered to recent/upcoming matches"
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
