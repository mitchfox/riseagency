import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SeasonStats {
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
}

/**
 * Determine the current football season year.
 * Seasons run July-June, so Jan-June = previous year, July-Dec = current year.
 * e.g. March 2026 => 25/26 season => year 2025
 */
function getCurrentSeasonYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  return month < 7 ? year - 1 : year;
}

/**
 * Scrape the Transfermarkt stats page for a player and extract the season totals
 * from the <tfoot> of the compact stats table.
 * 
 * URL: https://www.transfermarkt.co.uk/x/leistungsdaten/spieler/{id}/saison/{year}
 * The tfoot contains: Total label | hidden | Appearances | Goals | Assists | Yellow | 2nd Yellow | Red | Minutes
 */
async function fetchPlayerSeasonStats(externalId: string): Promise<SeasonStats | null> {
  const seasonYear = getCurrentSeasonYear();
  const url = `https://www.transfermarkt.co.uk/x/leistungsdaten/spieler/${externalId}/saison/${seasonYear}`;
  
  console.log(`Fetching stats from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();

    // Find the <table class="items"> ... <tfoot> ... </tfoot> section
    // The tfoot total row has this structure:
    // <td colspan="2">Total XX/XX:</td><td class="hide">&nbsp;</td>
    // <td>Appearances</td><td>Goals</td><td>Assists</td><td>Yellow</td><td>2ndYellow</td><td>Red</td><td>Minutes'</td>
    
    const tfootMatch = html.match(/<table class="items">[\s\S]*?<tfoot>([\s\S]*?)<\/tfoot>/);
    if (!tfootMatch) {
      console.log(`No tfoot found in stats page for player ${externalId}`);
      return null;
    }

    const tfootHtml = tfootMatch[1];
    
    // Extract all <td> values from the tfoot row
    const tdValues: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let match;
    while ((match = tdRegex.exec(tfootHtml)) !== null) {
      // Strip HTML tags and trim
      const text = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
      tdValues.push(text);
    }

    console.log(`Parsed tfoot values for ${externalId}:`, JSON.stringify(tdValues));

    // Expected layout: [0]=Total label, [1]=hidden, [2]=Appearances, [3]=Goals, [4]=Assists, [5]=Yellow, [6]=2ndYellow, [7]=Red, [8]=Minutes
    if (tdValues.length < 9) {
      console.log(`Unexpected tfoot structure (${tdValues.length} cells) for player ${externalId}`);
      return null;
    }

    const parseVal = (v: string): number => {
      const cleaned = v.replace(/'/g, '').replace(/-/g, '0').replace(/\./g, '').trim();
      return parseInt(cleaned, 10) || 0;
    };

    const stats: SeasonStats = {
      matches: parseVal(tdValues[2]),
      goals: parseVal(tdValues[3]),
      assists: parseVal(tdValues[4]),
      minutes: parseVal(tdValues[8]),
    };

    console.log(`Stats for ${externalId}: ${stats.matches} apps, ${stats.goals} goals, ${stats.assists} assists, ${stats.minutes} mins`);
    return stats;
  } catch (e) {
    console.error(`Failed to fetch stats for player ${externalId}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let previewOnly = false;
    try {
      const body = await req.json();
      previewOnly = body?.preview === true;
    } catch { /* no body is fine */ }

    console.log(`Starting player stats sync (preview: ${previewOnly})...`);

    const { data: playerStats, error: fetchError } = await supabase
      .from('player_stats')
      .select('id, player_id, external_player_id, goals, assists, matches, minutes')
      .not('external_player_id', 'is', null)
      .neq('external_player_id', '');

    if (fetchError) {
      console.error('Failed to fetch player stats:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch player list' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!playerStats || playerStats.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No players with external IDs configured', updated: 0, failed: 0, total: 0, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerIds = playerStats.map(ps => ps.player_id);
    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .in('id', playerIds);

    const nameMap: Record<string, string> = {};
    players?.forEach(p => { nameMap[p.id] = p.name; });

    console.log(`Found ${playerStats.length} players to sync`);

    let updated = 0;
    let failed = 0;
    const results: Array<{
      player_id: string;
      player_name: string;
      status: string;
      error?: string;
      old_stats?: SeasonStats;
      new_stats?: SeasonStats;
    }> = [];

    for (const ps of playerStats) {
      const playerName = nameMap[ps.player_id] || 'Unknown';
      const stats = await fetchPlayerSeasonStats(ps.external_player_id!);

      if (stats) {
        const oldStats: SeasonStats = {
          goals: ps.goals || 0,
          assists: ps.assists || 0,
          matches: ps.matches || 0,
          minutes: ps.minutes || 0,
        };

        const hasChange =
          stats.goals !== oldStats.goals ||
          stats.assists !== oldStats.assists ||
          stats.matches !== oldStats.matches ||
          stats.minutes !== oldStats.minutes;

        if (hasChange) {
          if (!previewOnly) {
            const { error: updateError } = await supabase
              .from('player_stats')
              .update({
                goals: stats.goals,
                assists: stats.assists,
                matches: stats.matches,
                minutes: stats.minutes,
                updated_at: new Date().toISOString(),
              })
              .eq('id', ps.id);

            if (updateError) {
              failed++;
              results.push({ player_id: ps.player_id, player_name: playerName, status: 'db_error', error: updateError.message, old_stats: oldStats, new_stats: stats });
              continue;
            }
          }
          updated++;
          results.push({ player_id: ps.player_id, player_name: playerName, status: 'changed', old_stats: oldStats, new_stats: stats });
        } else {
          results.push({ player_id: ps.player_id, player_name: playerName, status: 'no_change', old_stats: oldStats, new_stats: stats });
        }
      } else {
        failed++;
        results.push({ player_id: ps.player_id, player_name: playerName, status: 'fetch_failed', error: 'Could not retrieve stats from external source' });
      }

      // Rate limit: wait between requests to avoid being blocked
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Sync complete: ${updated} changed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        failed,
        total: playerStats.length,
        results,
        preview: previewOnly,
        synced_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
