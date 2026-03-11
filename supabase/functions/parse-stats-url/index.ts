const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Stat keys we want to extract
const SOFASCORE_STAT_KEYS = [
  'goals', 'assists', 'totalShots', 'shotsOnTarget', 'keyPasses',
  'accuratePasses', 'totalPasses', 'passAccuracy', 'successfulDribbles',
  'totalDuels', 'duelsWon', 'aerialDuelsWon', 'totalAerialDuels',
  'tackles', 'interceptions', 'clearances', 'accurateCrosses',
  'totalCrosses', 'accurateLongBalls', 'totalLongBalls', 'foulsDrawn',
  'touches', 'expectedGoals', 'expectedAssists', 'progressivePasses',
  'minutesPlayed', 'rating',
];

// Extract embedded JSON data from SofaScore HTML (Next.js hydration, JSON-LD, inline data)
function extractEmbeddedData(html: string): string {
  const chunks: string[] = [];

  // 1. __NEXT_DATA__ hydration script
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    chunks.push('=== NEXT_DATA hydration ===\n' + nextDataMatch[1].substring(0, 20000));
  }

  // 2. JSON-LD structured data
  const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    chunks.push('=== JSON-LD ===\n' + jsonLdMatch[1].substring(0, 5000));
  }

  // 3. Any script containing stat-like JSON objects (rating, statistics, player)
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const content = scriptMatch[1];
    if (content.length > 50 && content.length < 100000 &&
        (content.includes('"statistics"') || content.includes('"rating"') ||
         content.includes('"player"') || content.includes('"incidents"') ||
         content.includes('"lineups"'))) {
      chunks.push('=== Inline script data ===\n' + content.substring(0, 15000));
    }
  }

  return chunks.join('\n\n');
}

// SofaScore HTML scraping + AI extraction with tool calling
async function parseSofaScoreUrl(url: string, LOVABLE_API_KEY: string) {
  const pageResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch SofaScore page: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();

  // Extract embedded JSON data BEFORE stripping scripts
  const embeddedData = extractEmbeddedData(html);

  // Also get visible text content (strip scripts/styles/tags)
  const visibleText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000);

  const combinedContent = (embeddedData + '\n\n=== Visible page text ===\n' + visibleText).substring(0, 30000);

  console.log('SofaScore content length:', combinedContent.length, 'embedded data length:', embeddedData.length);

  const prompt = `You are a football statistics extractor. Given the following data from a SofaScore match page, extract individual player match statistics.

Page URL: ${url}

Page content (embedded JSON data + visible text):
${combinedContent}

CRITICAL RULES:
- Only include a stat if you find an EXACT numerical value in the data above.
- Do NOT guess or infer any statistic. If you cannot find it, omit it.
- If a player did not score, goals MUST be 0, not omitted.
- passAccuracy should be a percentage (0-100).
- rating should be out of 10.
- Extract stats for ALL players you can find data for.`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      tools: [{
        type: 'function',
        function: {
          name: 'report_player_stats',
          description: 'Report extracted player statistics from a SofaScore match page.',
          parameters: {
            type: 'object',
            properties: {
              players: {
                type: 'object',
                description: 'Map of player name to their stats object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    team: { type: 'string' },
                    goals: { type: 'number' },
                    assists: { type: 'number' },
                    totalShots: { type: 'number' },
                    shotsOnTarget: { type: 'number' },
                    keyPasses: { type: 'number' },
                    accuratePasses: { type: 'number' },
                    totalPasses: { type: 'number' },
                    passAccuracy: { type: 'number' },
                    successfulDribbles: { type: 'number' },
                    totalDuels: { type: 'number' },
                    duelsWon: { type: 'number' },
                    aerialDuelsWon: { type: 'number' },
                    totalAerialDuels: { type: 'number' },
                    tackles: { type: 'number' },
                    interceptions: { type: 'number' },
                    clearances: { type: 'number' },
                    accurateCrosses: { type: 'number' },
                    totalCrosses: { type: 'number' },
                    accurateLongBalls: { type: 'number' },
                    totalLongBalls: { type: 'number' },
                    foulsDrawn: { type: 'number' },
                    touches: { type: 'number' },
                    expectedGoals: { type: 'number' },
                    expectedAssists: { type: 'number' },
                    progressivePasses: { type: 'number' },
                    minutesPlayed: { type: 'number' },
                    rating: { type: 'number' },
                  },
                },
              },
            },
            required: ['players'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'report_player_stats' } },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error('AI extraction failed:', aiResponse.status, errText);
    throw new Error('AI extraction failed');
  }

  const aiData = await aiResponse.json();

  // Extract from tool call response
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  let parsed: { players: Record<string, Record<string, any>> };

  if (toolCall?.function?.arguments) {
    const args = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    parsed = args;
  } else {
    // Fallback: try parsing content directly
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    console.log('No tool call found, raw content:', rawContent.substring(0, 500));
    const jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  }

  if (!parsed.players || Object.keys(parsed.players).length === 0) {
    console.error('No players extracted. Embedded data length:', embeddedData.length);
    throw new Error('No player statistics found on SofaScore page. The match may not have detailed stats available yet.');
  }

  // Validation: check stat density per player
  for (const [name, stats] of Object.entries(parsed.players)) {
    const statCount = Object.keys(stats).filter(k => k !== 'team' && typeof stats[k] === 'number').length;
    console.log(`Player ${name}: ${statCount} stats extracted`);
  }

  return parsed.players;
}

// Map SofaScore stat keys to our fixture stat keys
function mapSofaScoreStats(stats: Record<string, any>): Record<string, number> {
  const mapped: Record<string, number> = {};

  const mapping: Record<string, string> = {
    goals: 'goals_per90',
    assists: 'assists',
    totalShots: 'total_shots_per90',
    shotsOnTarget: 'shots_on_target_per90',
    keyPasses: 'key_passes_per90',
    accuratePasses: 'accurate_passes_per90',
    totalPasses: 'passes_total',
    passAccuracy: 'pass_accuracy_pct',
    successfulDribbles: 'successful_dribbles_per90',
    totalDuels: 'duels_total',
    duelsWon: 'duels_won_per90',
    aerialDuelsWon: 'aerials_won_per90',
    totalAerialDuels: 'aerials_total',
    tackles: 'tackles_won_per90',
    interceptions: 'interceptions_per90',
    clearances: 'clearances_per90',
    accurateCrosses: 'accurate_crosses_per90',
    totalCrosses: 'crosses_total',
    accurateLongBalls: 'accurate_long_balls_per90',
    totalLongBalls: 'long_balls_total',
    foulsDrawn: 'fouls_drawn_per90',
    touches: 'touches',
    expectedGoals: 'npxg_per90',
    expectedAssists: 'xa_per90',
    progressivePasses: 'progressive_passes_per90',
  };

  for (const [sofaKey, fixtureKey] of Object.entries(mapping)) {
    if (stats[sofaKey] !== undefined && typeof stats[sofaKey] === 'number') {
      mapped[fixtureKey] = stats[sofaKey];
    }
  }

  return mapped;
}

// FBRef / generic HTML parsing via AI
async function parseHtmlWithAI(url: string, LOVABLE_API_KEY: string) {
  const pageResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch page: ${pageResponse.status}`);
  }

  const html = await pageResponse.text();
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15000);

  const statKeys = [
    'goals', 'assists', 'shots_on_target', 'shots', 'progressive_passes',
    'key_passes', 'dribbles_completed', 'progressive_carries', 'carries_into_final_third',
    'touches_in_box', 'fouls_won', 'tackles_won', 'aerial_duels_won', 'duels_won',
    'clearances', 'interceptions', 'crosses_completed', 'long_passes_completed',
    'npxg', 'xa', 'pass_completion_pct', 'chances_created', 'ground_duels_won',
    'blocked_shots', 'recoveries', 'dispossessed', 'fouls_committed',
  ];

  const prompt = `You are a football statistics extractor. Given the following web page content, extract individual player match statistics.

Page URL: ${url}

Page text content (truncated):
${textContent}

Extract as many of these stats as you can find. Return ONLY a JSON object where keys are from this list and values are numbers:
${statKeys.join(', ')}

Also include a "player_name" field if you can identify the player, and "source" with the site name.
If you cannot find a particular stat, omit it. Return ONLY valid JSON, no explanation.`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    throw new Error('AI extraction failed');
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || '';
  const jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

const FBREF_MAPPING: Record<string, string> = {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSofaScore = url.includes('sofascore.com');
    const isFBRef = url.includes('fbref.com');

    if (isSofaScore) {
      const playerStats = await parseSofaScoreUrl(url, LOVABLE_API_KEY);
      const playerNames = Object.keys(playerStats);

      if (playerNames.length === 1) {
        const name = playerNames[0];
        const mapped = mapSofaScoreStats(playerStats[name]);
        return new Response(JSON.stringify({
          fixtureStats: mapped,
          unmapped: {},
          playerName: name,
          source: 'SofaScore',
          statsCount: Object.keys(mapped).length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Multiple players — return all for frontend picker
      const allMapped: Record<string, { stats: Record<string, number>; team: string }> = {};
      for (const [name, rawStats] of Object.entries(playerStats)) {
        allMapped[name] = {
          stats: mapSofaScoreStats(rawStats),
          team: rawStats.team || 'Unknown',
        };
      }

      return new Response(JSON.stringify({
        multiplePlayersAvailable: true,
        players: allMapped,
        source: 'SofaScore',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FBRef or generic site — use AI HTML extraction
    const stats = await parseHtmlWithAI(url, LOVABLE_API_KEY);

    const fixtureStats: Record<string, number> = {};
    const unmapped: Record<string, number> = {};

    for (const [key, value] of Object.entries(stats)) {
      if (key === 'player_name' || key === 'source') continue;
      const numVal = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numVal)) continue;

      if (isFBRef && FBREF_MAPPING[key]) {
        fixtureStats[FBREF_MAPPING[key]] = numVal;
      } else if (FBREF_MAPPING[key]) {
        fixtureStats[FBREF_MAPPING[key]] = numVal;
      } else {
        unmapped[key] = numVal;
      }
    }

    return new Response(JSON.stringify({
      fixtureStats,
      unmapped,
      playerName: stats.player_name || null,
      source: isFBRef ? 'FBRef' : (stats.source || new URL(url).hostname),
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
