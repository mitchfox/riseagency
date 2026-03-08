import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTERNAL_API = 'https://tmapi-alpha.transfermarkt.technology';

interface SeasonStats {
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
}

async function fetchPlayerSeasonStats(externalId: string): Promise<SeasonStats | null> {
  try {
    const response = await fetch(`${EXTERNAL_API}/player/${externalId}/performance?seasonId=2025`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to fetch stats for player ${externalId}: ${response.status} - ${text.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      console.log(`No performance data for player ${externalId}`);
      return null;
    }

    // Aggregate stats across all competitions for the current season
    let totalGoals = 0;
    let totalAssists = 0;
    let totalMatches = 0;
    let totalMinutes = 0;

    const competitions = data.data.competitionPerformances || data.data.competitions || [];

    for (const comp of competitions) {
      const stats = comp.performance || comp.stats || comp;
      totalGoals += parseInt(stats.goals || stats.goalsScored || '0', 10) || 0;
      totalAssists += parseInt(stats.assists || '0', 10) || 0;
      totalMatches += parseInt(stats.appearances || stats.matches || '0', 10) || 0;
      totalMinutes += parseInt(stats.minutesPlayed || stats.minutes || '0', 10) || 0;
    }

    // If no competition-level data, try the totals/summary
    if (competitions.length === 0 && data.data.total) {
      const t = data.data.total;
      totalGoals = parseInt(t.goals || t.goalsScored || '0', 10) || 0;
      totalAssists = parseInt(t.assists || '0', 10) || 0;
      totalMatches = parseInt(t.appearances || t.matches || '0', 10) || 0;
      totalMinutes = parseInt(t.minutesPlayed || t.minutes || '0', 10) || 0;
    }

    return {
      goals: totalGoals,
      assists: totalAssists,
      matches: totalMatches,
      minutes: totalMinutes,
    };
  } catch (error) {
    console.error(`Error fetching stats for player ${externalId}:`, error);
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

    console.log('Starting scheduled player stats sync...');

    // Get all players who have an external ID configured
    const { data: playerStats, error: fetchError } = await supabase
      .from('player_stats')
      .select('id, player_id, external_player_id')
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
      console.log('No players with external IDs configured');
      return new Response(
        JSON.stringify({ success: true, message: 'No players to sync', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${playerStats.length} players to sync`);

    let updated = 0;
    let failed = 0;
    const results: Array<{ player_id: string; status: string }> = [];

    // Process sequentially to avoid rate limits
    for (const ps of playerStats) {
      const stats = await fetchPlayerSeasonStats(ps.external_player_id!);

      if (stats) {
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
          console.error(`Failed to update stats for ${ps.player_id}:`, updateError);
          failed++;
          results.push({ player_id: ps.player_id, status: 'db_error' });
        } else {
          updated++;
          results.push({ player_id: ps.player_id, status: 'updated' });
          console.log(`Updated stats for ${ps.player_id}: ${stats.matches} apps, ${stats.goals} goals, ${stats.assists} assists, ${stats.minutes} mins`);
        }
      } else {
        failed++;
        results.push({ player_id: ps.player_id, status: 'fetch_failed' });
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`Sync complete: ${updated} updated, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        failed,
        total: playerStats.length,
        results,
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
