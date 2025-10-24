import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerStats {
  minutes: number;
  matches: number;
  goals: number;
  assists: number;
}

async function scrapeTransfermarktStats(url: string): Promise<PlayerStats | null> {
  try {
    console.log('Fetching Transfermarkt page:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch page:', response.status);
      return null;
    }

    const html = await response.text();
    console.log('Page fetched successfully, parsing stats...');

    // Parse the HTML to extract stats
    // Looking for the "Total" row in the performance data table
    const stats: PlayerStats = {
      minutes: 0,
      matches: 0,
      goals: 0,
      assists: 0
    };

    // Extract minutes played - looking for patterns like "839" followed by minutes indicator
    const minutesMatch = html.match(/(\d+)'\s*<\/td>/);
    if (minutesMatch) {
      stats.minutes = parseInt(minutesMatch[1]);
    }

    // Extract matches - looking for appearances
    const matchesMatch = html.match(/<td[^>]*class="[^"]*zentriert[^"]*"[^>]*>(\d+)<\/td>/);
    if (matchesMatch) {
      stats.matches = parseInt(matchesMatch[1]);
    }

    // Extract goals and assists from the table
    // These typically appear in specific columns
    const goalMatches = html.match(/<a[^>]*title="Goals"[^>]*>(\d+)<\/a>/);
    if (goalMatches) {
      stats.goals = parseInt(goalMatches[1]);
    }

    const assistMatches = html.match(/<a[^>]*title="Assists"[^>]*>(\d+)<\/a>/);
    if (assistMatches) {
      stats.assists = parseInt(assistMatches[1]);
    }

    console.log('Extracted stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error scraping Transfermarkt:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting player stats update...');

    // Tyrese Omotoye's player ID and Transfermarkt URL
    const playerId = 'b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e';
    const transfermarktUrl = 'https://www.transfermarkt.co.uk/tyrese-omotoye/leistungsdaten/spieler/551309';

    // Scrape the stats
    const stats = await scrapeTransfermarktStats(transfermarktUrl);

    if (!stats) {
      console.error('Failed to scrape stats');
      return new Response(
        JSON.stringify({ error: 'Failed to scrape stats from Transfermarkt' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the player_stats table
    const { data, error } = await supabase
      .from('player_stats')
      .update({
        minutes: stats.minutes,
        matches: stats.matches,
        goals: stats.goals,
        assists: stats.assists,
        updated_at: new Date().toISOString()
      })
      .eq('player_id', playerId)
      .select();

    if (error) {
      console.error('Error updating stats:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update stats in database', details: error }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Stats updated successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Player stats updated successfully',
        stats: stats,
        updated_at: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
