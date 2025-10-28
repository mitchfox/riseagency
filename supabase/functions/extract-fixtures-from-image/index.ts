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
    const { image, teamName } = await req.json();
    console.log("Processing fixture list image for team:", teamName);

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
                text: `Extract ALL football fixtures from this image. Today's date is ${today}.

CRITICAL INSTRUCTIONS:
- Extract EVERY match visible in the image
- Include the home team, away team, and match date for each fixture
- Preserve the exact team names as shown in the image
- If a date is visible, use it exactly as shown (convert to YYYY-MM-DD format)
- If only partial dates are visible (e.g., "07/11"), assume the year is ${currentYear}
- Include the competition name if visible (e.g., FNL, Czech Cup, etc.)
- Include venue if visible

Return ONLY a valid JSON array with NO markdown formatting:
[
  {
    "home_team": "Exact Team Name",
    "away_team": "Exact Team Name",
    "match_date": "YYYY-MM-DD",
    "competition": "League/Competition Name",
    "venue": "Venue Name or TBD"
  }
]

Extract ALL fixtures visible, even if there are many. Do NOT summarize or skip any matches.`
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
      console.log("Successfully parsed fixtures:", fixtures.length);
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
