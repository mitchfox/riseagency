import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TM_API = 'https://tmapi-alpha.transfermarkt.technology';

interface SeasonStats {
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
}

async function fetchJSON(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text.substring(0, 200)}`);
  }
  return response.json();
}

async function fetchPlayerSeasonStats(externalId: string): Promise<SeasonStats | null> {
  // Try multiple endpoint patterns for the TM API
  const endpoints = [
    `${TM_API}/player/${externalId}/stats?seasonId=2025`,
    `${TM_API}/player/${externalId}/performance?seasonId=2025`,
    `${TM_API}/player/${externalId}/season-stats?seasonId=2025`,
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchJSON(endpoint);
      if (!data.success || !data.data) continue;

      let totalGoals = 0;
      let totalAssists = 0;
      let totalMatches = 0;
      let totalMinutes = 0;

      // Try various data shapes the API might return
      const competitions = data.data.competitionPerformances || data.data.competitions || data.data.competitionStats || [];
      
      for (const comp of competitions) {
        const stats = comp.performance || comp.stats || comp;
        totalGoals += parseInt(stats.goals || stats.goalsScored || '0', 10) || 0;
        totalAssists += parseInt(stats.assists || '0', 10) || 0;
        totalMatches += parseInt(stats.appearances || stats.matches || '0', 10) || 0;
        totalMinutes += parseInt(stats.minutesPlayed || stats.minutes || '0', 10) || 0;
      }

      if (competitions.length === 0 && data.data.total) {
        const t = data.data.total;
        totalGoals = parseInt(t.goals || t.goalsScored || '0', 10) || 0;
        totalAssists = parseInt(t.assists || '0', 10) || 0;
        totalMatches = parseInt(t.appearances || t.matches || '0', 10) || 0;
        totalMinutes = parseInt(t.minutesPlayed || t.minutes || '0', 10) || 0;
      }

      // Also try flat data shape
      if (totalMatches === 0 && data.data.appearances) {
        totalGoals = parseInt(data.data.goals || '0', 10) || 0;
        totalAssists = parseInt(data.data.assists || '0', 10) || 0;
        totalMatches = parseInt(data.data.appearances || '0', 10) || 0;
        totalMinutes = parseInt(data.data.minutesPlayed || '0', 10) || 0;
      }

      if (totalMatches > 0 || totalGoals > 0) {
        return { goals: totalGoals, assists: totalAssists, matches: totalMatches, minutes: totalMinutes };
      }
    } catch (e) {
      console.log(`Endpoint ${endpoint} failed: ${e}`);
      continue;
    }
  }

  // Fallback: try the base player profile which we know works
  try {
    const data = await fetchJSON(`${TM_API}/player/${externalId}`);
    if (data.success && data.data) {
      const p = data.data;
      // Some profiles include season performance summary
      const perf = p.performance || p.seasonStats || p.stats;
      if (perf) {
        return {
          goals: parseInt(perf.goals || '0', 10) || 0,
          assists: parseInt(perf.assists || '0', 10) || 0,
          matches: parseInt(perf.appearances || perf.matches || '0', 10) || 0,
          minutes: parseInt(perf.minutesPlayed || perf.minutes || '0', 10) || 0,
        };
      }
    }
  } catch (e) {
    console.error(`Profile fallback failed for ${externalId}:`, e);
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a preview-only request (don't apply changes)
    let previewOnly = false;
    try {
      const body = await req.json();
      previewOnly = body?.preview === true;
    } catch { /* no body is fine */ }

    console.log(`Starting player stats sync (preview: ${previewOnly})...`);

    // Get all players who have an external ID configured
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

    // Get player names
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
      old_stats?: { goals: number; assists: number; matches: number; minutes: number };
      new_stats?: { goals: number; assists: number; matches: number; minutes: number };
    }> = [];

    for (const ps of playerStats) {
      const playerName = nameMap[ps.player_id] || 'Unknown';
      const stats = await fetchPlayerSeasonStats(ps.external_player_id!);

      if (stats) {
        const oldStats = {
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

      await new Promise(r => setTimeout(r, 300));
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
