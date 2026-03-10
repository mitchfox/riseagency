const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// SofaScore API helpers
async function parseSofaScoreUrl(url: string) {
  // Extract event ID from URL patterns like:
  // https://www.sofascore.com/team1-team2/XYZ#id:12345,tab:lineup
  // https://www.sofascore.com/...#id:EVENT_ID...
  // or /football/match/...
  let eventId: string | null = null;
  let playerId: string | null = null;

  // Try hash fragment: #id:12345
  const hashIdMatch = url.match(/#.*?id[=:](\d+)/);
  if (hashIdMatch) eventId = hashIdMatch[1];

  // Try path-based: /match/xxx/yyy/ID or similar
  if (!eventId) {
    const pathMatch = url.match(/\/(\d{6,})/);
    if (pathMatch) eventId = pathMatch[1];
  }

  if (!eventId) {
    throw new Error('Could not extract SofaScore event ID from URL. Please use a direct match page URL.');
  }

  // Check if a specific player tab is targeted
  const playerTabMatch = url.match(/tab:lineup/i);

  // Fetch event lineups to get player IDs
  const lineupRes = await fetch(`https://api.sofascore.com/api/v1/event/${eventId}/lineups`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });

  if (!lineupRes.ok) {
    throw new Error(`SofaScore API returned ${lineupRes.status} for lineups`);
  }

  const lineupData = await lineupRes.json();

  // Try to find the player — collect all players from both teams
  const allPlayers: Array<{ id: number; name: string; team: string }> = [];

  for (const teamKey of ['home', 'away']) {
    const team = lineupData[teamKey];
    if (!team?.players) continue;
    const teamName = team.team?.name || teamKey;
    for (const entry of team.players) {
      const p = entry.player;
      if (p?.id) {
        allPlayers.push({ id: p.id, name: p.name || p.shortName || 'Unknown', team: teamName });
      }
    }
  }

  if (allPlayers.length === 0) {
    throw new Error('No players found in SofaScore lineup data');
  }

  // If a player ID is in the URL hash, use that
  const playerHashMatch = url.match(/player[=:](\d+)/i);
  if (playerHashMatch) {
    playerId = playerHashMatch[1];
  }

  // Fetch stats for each player (or just the targeted one)
  const playersToFetch = playerId
    ? allPlayers.filter(p => String(p.id) === playerId)
    : allPlayers;

  if (playersToFetch.length === 0 && playerId) {
    // Player not in lineup — try fetching directly
    playersToFetch.push({ id: parseInt(playerId), name: 'Unknown', team: 'Unknown' });
  }

  // Fetch player statistics from the event
  const statsRes = await fetch(`https://api.sofascore.com/api/v1/event/${eventId}/statistics`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });

  // Also try per-player stats endpoint
  const playerStats: Record<string, any> = {};

  for (const player of playersToFetch.slice(0, 5)) { // Limit to avoid rate limits
    try {
      const pStatsRes = await fetch(
        `https://api.sofascore.com/api/v1/event/${eventId}/player/${player.id}/statistics`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      if (pStatsRes.ok) {
        const pData = await pStatsRes.json();
        if (pData?.statistics) {
          playerStats[player.name] = {
            ...pData.statistics,
            _team: player.team,
            _playerId: player.id,
          };
        }
      }
    } catch {
      // Skip failed player fetches
    }
  }

  return { playerStats, allPlayers, eventId };
}

// Map SofaScore stat keys to our fixture stat keys
function mapSofaScoreStats(stats: Record<string, any>): Record<string, number> {
  const mapped: Record<string, number> = {};

  const mapping: Record<string, string> = {
    goals: 'goals_per90',
    assists: 'assists', // not per90 key — raw count
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

// FBRef parsing (HTML-based, same as before)
async function parseFBRefUrl(url: string, LOVABLE_API_KEY: string) {
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

  const prompt = `You are a football statistics extractor. Given the following web page content from FBRef, extract individual player match statistics.

Page URL: ${url}

Page text content (truncated):
${textContent}

Extract as many of these stats as you can find. Return ONLY a JSON object where keys are from this list and values are numbers:
${statKeys.join(', ')}

Also include a "player_name" field if you can identify the player, and "source" with "FBRef".
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
  let jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

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

    const isSofaScore = url.includes('sofascore.com');
    const isFBRef = url.includes('fbref.com');

    if (isSofaScore) {
      // Use SofaScore API directly
      const { playerStats, allPlayers } = await parseSofaScoreUrl(url);

      if (Object.keys(playerStats).length === 0) {
        return new Response(JSON.stringify({
          error: 'Could not fetch player stats from SofaScore. The match may not have detailed stats yet.',
          availablePlayers: allPlayers.map(p => ({ name: p.name, team: p.team })),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If only one player, return their stats directly
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

      // Multiple players — return all and let frontend pick
      const allMapped: Record<string, { stats: Record<string, number>; team: string }> = {};
      for (const [name, rawStats] of Object.entries(playerStats)) {
        const s = rawStats as any;
        allMapped[name] = { stats: mapSofaScoreStats(s), team: s._team };
      }

      return new Response(JSON.stringify({
        multiplePlayersAvailable: true,
        players: allMapped,
        source: 'SofaScore',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isFBRef) {
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'AI service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const stats = await parseFBRefUrl(url, LOVABLE_API_KEY);

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
        source: 'FBRef',
        statsCount: Object.keys(fixtureStats).length + Object.keys(unmapped).length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown source — try generic HTML + AI approach
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fall back to generic scraping for other sites
    const stats = await parseFBRefUrl(url, LOVABLE_API_KEY);

    const fixtureStats: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (key === 'player_name' || key === 'source') continue;
      const numVal = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(numVal)) fixtureStats[key] = numVal;
    }

    return new Response(JSON.stringify({
      fixtureStats,
      unmapped: {},
      playerName: stats.player_name || null,
      source: stats.source || new URL(url).hostname,
      statsCount: Object.keys(fixtureStats).length,
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
