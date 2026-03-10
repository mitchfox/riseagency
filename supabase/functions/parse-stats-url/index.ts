const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the page HTML
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch page: ${pageResponse.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await pageResponse.text();

    // Extract text content - strip tags but keep structure
    const textContent = html
      .replace(/<script[^>]*>[\\s\\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\\s\\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit to prevent token overflow

    // Also try to extract JSON-LD or embedded data
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\\s\\S]*?)<\/script>/gi);
    const jsonLdData = jsonLdMatches?.map(m => {
      try {
        const content = m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        return JSON.parse(content);
      } catch { return null; }
    }).filter(Boolean) || [];

    // Extract any embedded JSON data blocks (common on SofaScore, FBRef)
    const dataBlocks: string[] = [];
    const jsonRegex = /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/;
    const nextMatch = html.match(jsonRegex);
    if (nextMatch) {
      try {
        const parsed = JSON.parse(nextMatch[1]);
        dataBlocks.push(JSON.stringify(parsed).substring(0, 8000));
      } catch { }
    }

    // Look for SofaScore-style data
    const sofascoreDataRegex = /\\\"statistics\\\":\s*(\\[[\s\S]*?\\])\s*[,}]/;
    const sofaMatch = html.match(sofascoreDataRegex);
    if (sofaMatch) {
      dataBlocks.push(sofaMatch[1].substring(0, 5000));
    }

    // Now use AI to extract stats from the page content
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statKeys = [
      'goals', 'assists', 'shots_on_target', 'shots', 'progressive_passes',
      'key_passes', 'dribbles_completed', 'progressive_carries', 'carries_into_final_third',
      'touches_in_box', 'fouls_won', 'tackles_won', 'aerial_duels_won', 'duels_won',
      'clearances', 'interceptions', 'crosses_completed', 'long_passes_completed',
      'npxg', 'xa', 'pass_completion_pct', 'chances_created', 'ground_duels_won',
      'blocked_shots', 'recoveries', 'dispossessed', 'fouls_committed',
    ];

    const prompt = `You are a football statistics extractor. Given the following web page content from a match statistics site (likely SofaScore or FBRef), extract individual player match statistics.

Page URL: ${url}
${dataBlocks.length > 0 ? `\nEmbedded data:\n${dataBlocks.join('\n')}` : ''}
${jsonLdData.length > 0 ? `\nStructured data:\n${JSON.stringify(jsonLdData).substring(0, 3000)}` : ''}

Page text content (truncated):
${textContent}

Extract as many of these stats as you can find. Return ONLY a JSON object where keys are from this list and values are numbers:
${statKeys.join(', ')}

Also include a "player_name" field if you can identify the player, and "source" with the site name.

If you cannot find a particular stat, omit it. Return ONLY valid JSON, no explanation.`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', errText);
      return new Response(JSON.stringify({ error: 'AI extraction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (may be wrapped in markdown code blocks)
    let stats: Record<string, any> = {};
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      stats = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', rawContent);
      return new Response(JSON.stringify({ error: 'Could not parse statistics from the page' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map unified stat keys to fixture stat keys
    const UNIFIED_TO_FIXTURE: Record<string, string> = {
      goals: 'goals_per90',
      assists: 'assists_per90',
      shots_on_target: 'shots_on_target_per90',
      shots: 'total_shots_per90',
      progressive_passes: 'progressive_passes_per90',
      key_passes: 'key_passes_per90',
      dribbles_completed: 'successful_dribbles_per90',
      progressive_carries: 'progressive_carries_per90',
      carries_into_final_third: 'carries_into_final_3rd_per90',
      touches_in_box: 'touches_in_opp_box_per90',
      fouls_won: 'fouls_drawn_per90',
      tackles_won: 'tackles_won_per90',
      aerial_duels_won: 'aerials_won_per90',
      duels_won: 'duels_won_per90',
      clearances: 'clearances_per90',
      interceptions: 'interceptions_per90',
      crosses_completed: 'accurate_crosses_per90',
      long_passes_completed: 'accurate_long_balls_per90',
      npxg: 'npxg_per90',
      xa: 'xa_per90',
    };

    const fixtureStats: Record<string, number> = {};
    const unmapped: Record<string, number> = {};

    for (const [key, value] of Object.entries(stats)) {
      if (key === 'player_name' || key === 'source') continue;
      const numVal = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numVal)) continue;

      if (UNIFIED_TO_FIXTURE[key]) {
        fixtureStats[UNIFIED_TO_FIXTURE[key]] = numVal;
      } else {
        unmapped[key] = numVal;
      }
    }

    return new Response(JSON.stringify({
      fixtureStats,
      unmapped,
      playerName: stats.player_name || null,
      source: stats.source || new URL(url).hostname,
      statsCount: Object.keys(fixtureStats).length + Object.keys(unmapped).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('parse-stats-url error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
