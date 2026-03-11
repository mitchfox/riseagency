const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOFASCORE_STAT_KEYS = [
  'goals', 'assists', 'totalShots', 'shotsOnTarget', 'keyPasses',
  'accuratePasses', 'totalPasses', 'passAccuracy', 'successfulDribbles',
  'totalDuels', 'duelsWon', 'aerialDuelsWon', 'totalAerialDuels',
  'tackles', 'interceptions', 'clearances', 'accurateCrosses',
  'totalCrosses', 'accurateLongBalls', 'totalLongBalls', 'foulsDrawn',
  'touches', 'expectedGoals', 'expectedAssists', 'progressivePasses',
  'minutesPlayed', 'rating',
] as const;

type SofaStatKey = (typeof SOFASCORE_STAT_KEYS)[number];
type SofaPlayerStats = Record<string, Record<string, any>>;

const SOFA_KEY_ALIASES: Record<SofaStatKey, string[]> = {
  goals: ['goals', 'goal'],
  assists: ['assists', 'assist'],
  totalShots: ['totalshots', 'shots', 'shotstotal', 'totshots'],
  shotsOnTarget: ['shotsontarget', 'ontargetshots', 'shots_on_target', 'sot'],
  keyPasses: ['keypasses', 'keypass'],
  accuratePasses: ['accuratepasses', 'successfulpasses', 'completedpasses'],
  totalPasses: ['totalpasses', 'passes', 'passesattempted'],
  passAccuracy: ['passaccuracy', 'passcompletion', 'passaccuracypercent'],
  successfulDribbles: ['successfuldribbles', 'dribblescompleted', 'completeddribbles'],
  totalDuels: ['totalduels', 'duels'],
  duelsWon: ['duelswon', 'wonduels'],
  aerialDuelsWon: ['aerialduelswon', 'aerialswon', 'wonduelsaerial'],
  totalAerialDuels: ['totalaerialduels', 'aerialduels'],
  tackles: ['tackles', 'tackleswon'],
  interceptions: ['interceptions', 'interception'],
  clearances: ['clearances', 'clearance'],
  accurateCrosses: ['accuratecrosses', 'crossescompleted', 'successfulcrosses'],
  totalCrosses: ['totalcrosses', 'crosses'],
  accurateLongBalls: ['accuratelongballs', 'successfullongballs', 'longballscompleted'],
  totalLongBalls: ['totallongballs', 'longballs'],
  foulsDrawn: ['foulsdrawn', 'foulswon'],
  touches: ['touches', 'balltouches'],
  expectedGoals: ['expectedgoals', 'xg'],
  expectedAssists: ['expectedassists', 'xa'],
  progressivePasses: ['progressivepasses', 'progpasses'],
  minutesPlayed: ['minutesplayed', 'minutes', 'minsplayed'],
  rating: ['rating', 'sofascorerating', 'sofascoreratingvalue'],
};

const normaliseToken = (input: string) =>
  input.toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIAS_TO_STAT_KEY: Record<string, SofaStatKey> = Object.entries(SOFA_KEY_ALIASES)
  .flatMap(([statKey, aliases]) => aliases.map((alias) => [normaliseToken(alias), statKey as SofaStatKey] as const))
  .reduce((acc, [alias, statKey]) => {
    acc[alias] = statKey;
    return acc;
  }, {} as Record<string, SofaStatKey>);

function tryMapStatKey(rawKey: string): SofaStatKey | null {
  const mapped = ALIAS_TO_STAT_KEY[normaliseToken(rawKey)];
  return mapped || null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function extractStatsFromNode(node: unknown, target: Record<string, number>) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) extractStatsFromNode(item, target);
    return;
  }

  if (typeof node !== 'object') return;

  const obj = node as Record<string, any>;

  // Pattern: { name: "Key passes", value: 3 }
  const label = obj.name || obj.label || obj.title || obj.statName;
  const value = obj.value ?? obj.statValue ?? obj.totalValue;
  if (typeof label === 'string') {
    const mappedKey = tryMapStatKey(label);
    const numValue = coerceNumber(value);
    if (mappedKey && numValue !== null) {
      target[mappedKey] = numValue;
    }
  }

  for (const [key, raw] of Object.entries(obj)) {
    const mappedKey = tryMapStatKey(key);

    if (mappedKey) {
      const directValue = coerceNumber(raw);
      if (directValue !== null) {
        target[mappedKey] = directValue;
      } else if (raw && typeof raw === 'object') {
        const nestedValue = coerceNumber((raw as any).value ?? (raw as any).total ?? (raw as any).count);
        if (nestedValue !== null) {
          target[mappedKey] = nestedValue;
        }
      }
    }

    if (raw && typeof raw === 'object') {
      extractStatsFromNode(raw, target);
    }
  }
}

function isLikelyPlayerName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 60) return false;
  if (/^(team|match|lineup|home|away|statistics)$/i.test(name.trim())) return false;
  return /[a-zA-Z]/.test(name);
}

function extractPlayersFromEmbeddedData(html: string): SofaPlayerStats {
  const players: SofaPlayerStats = {};
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!nextDataMatch) return players;

  let root: any;
  try {
    root = JSON.parse(nextDataMatch[1]);
  } catch {
    return players;
  }

  const walk = (node: unknown, inheritedTeam?: string) => {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, inheritedTeam);
      return;
    }

    if (typeof node !== 'object') return;
    const obj = node as Record<string, any>;

    const possibleTeam =
      (typeof obj.team === 'object' && obj.team && typeof obj.team.name === 'string' ? obj.team.name : undefined) ||
      (typeof obj.teamName === 'string' ? obj.teamName : undefined) ||
      inheritedTeam;

    const candidateName =
      (typeof obj.player === 'object' && obj.player && typeof obj.player.name === 'string' ? obj.player.name : undefined) ||
      (typeof obj.name === 'string' ? obj.name : undefined);

    const statsSeed =
      obj.statistics ||
      obj.stats ||
      obj.playerStatistics ||
      (obj.player && obj.player.statistics ? obj.player.statistics : null) ||
      obj;

    if (candidateName && isLikelyPlayerName(candidateName)) {
      const extracted: Record<string, number> = {};
      extractStatsFromNode(statsSeed, extracted);

      const statCount = Object.keys(extracted).length;
      if (statCount >= 2) {
        players[candidateName] = {
          team: possibleTeam || 'Unknown',
          ...players[candidateName],
          ...extracted,
        };
      }
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        walk(value, possibleTeam);
      }
    }
  };

  walk(root);
  return players;
}

function extractEmbeddedContent(html: string): string {
  const chunks: string[] = [];

  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    chunks.push(`NEXT_DATA JSON:\n${nextDataMatch[1].substring(0, 25000)}`);
  }

  const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
    chunks.push(`JSON-LD:\n${ldMatch[1].substring(0, 5000)}`);
  }

  const visibleText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000);

  chunks.push(`Visible text:\n${visibleText}`);
  return chunks.join('\n\n').substring(0, 40000);
}

async function parseSofaScoreWithAI(url: string, content: string, LOVABLE_API_KEY: string): Promise<SofaPlayerStats> {
  const prompt = `Extract per-player SofaScore match stats from the content below.

URL: ${url}

Rules:
- Return only players with at least 2 numerical stats.
- Only include numbers explicitly found in the content.
- Do not guess.
- If a player has no goal evidence, goals must be 0 or omitted.
- passAccuracy is 0-100.
- rating is out of 10.

Content:\n${content}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      tools: [
        {
          type: 'function',
          function: {
            name: 'report_player_stats',
            description: 'Return extracted player match statistics',
            parameters: {
              type: 'object',
              properties: {
                players: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
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
                    required: ['name', 'team'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['players'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'report_player_stats' } },
    }),
  });

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    throw new Error(`AI extraction failed: ${aiResponse.status} ${err}`);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return {};

  const parsedArgs = typeof toolCall.function.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  const result: SofaPlayerStats = {};
  for (const player of parsedArgs.players || []) {
    if (!player?.name) continue;
    const cleaned: Record<string, any> = { team: player.team || 'Unknown' };

    for (const key of SOFASCORE_STAT_KEYS) {
      const num = coerceNumber(player[key]);
      if (num !== null) cleaned[key] = num;
    }

    if (Object.keys(cleaned).filter(k => k !== 'team').length >= 2) {
      result[player.name] = cleaned;
    }
  }

  return result;
}

async function parseSofaScoreUrl(url: string, LOVABLE_API_KEY: string): Promise<SofaPlayerStats> {
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

  // 1) Deterministic extraction from embedded JSON first
  const structuredPlayers = extractPlayersFromEmbeddedData(html);
  const structuredCount = Object.keys(structuredPlayers).length;

  if (structuredCount > 0) {
    return structuredPlayers;
  }

  // 2) AI fallback using embedded data + visible text
  const embeddedContent = extractEmbeddedContent(html);
  const aiPlayers = await parseSofaScoreWithAI(url, embeddedContent, LOVABLE_API_KEY);

  if (Object.keys(aiPlayers).length === 0) {
    throw new Error('No player statistics found on SofaScore page. The match may not have detailed stats available yet.');
  }

  return aiPlayers;
}

function mapSofaScoreStats(stats: Record<string, any>): Record<string, number> {
  const mapped: Record<string, number> = {};

  const mapping: Record<string, string> = {
    goals: 'goals_per90',
    assists: 'assists_per90',
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
    const value = coerceNumber(stats[sofaKey]);
    if (value !== null) mapped[fixtureKey] = value;
  }

  return mapped;
}

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
      model: 'google/gemini-3-flash-preview',
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

      const allMapped: Record<string, { stats: Record<string, number>; team: string }> = {};
      for (const [name, rawStats] of Object.entries(playerStats)) {
        const stats = mapSofaScoreStats(rawStats);
        if (Object.keys(stats).length > 0) {
          allMapped[name] = {
            stats,
            team: rawStats.team || 'Unknown',
          };
        }
      }

      const playerNames = Object.keys(allMapped);
      if (playerNames.length === 0) {
        throw new Error('No mappable SofaScore stats were found for players on this page.');
      }

      if (playerNames.length === 1) {
        const name = playerNames[0];
        return new Response(JSON.stringify({
          fixtureStats: allMapped[name].stats,
          unmapped: {},
          playerName: name,
          source: 'SofaScore',
          statsCount: Object.keys(allMapped[name].stats).length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        multiplePlayersAvailable: true,
        players: allMapped,
        source: 'SofaScore',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stats = await parseHtmlWithAI(url, LOVABLE_API_KEY);

    const fixtureStats: Record<string, number> = {};
    const unmapped: Record<string, number> = {};

    for (const [key, value] of Object.entries(stats)) {
      if (key === 'player_name' || key === 'source') continue;
      const numVal = coerceNumber(value);
      if (numVal === null) continue;

      if (FBREF_MAPPING[key]) {
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
