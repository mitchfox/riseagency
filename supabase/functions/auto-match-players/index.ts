import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MatchResult {
  player_id: string;
  player_name: string;
  status: 'matched' | 'not_found' | 'multiple' | 'already_set' | 'error';
  external_id?: string;
  tm_name?: string;
  tm_club?: string;
  tm_position?: string;
  tm_market_value?: string;
  error?: string;
}

async function searchTransfermarkt(playerName: string): Promise<{
  id: string;
  name: string;
  club: string;
  position: string;
  marketValue: string;
}[] | null> {
  const query = encodeURIComponent(playerName.trim());
  const url = `https://www.transfermarkt.co.uk/schnellsuche/ergebnis/schnellsuche?query=${query}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`Search HTTP ${response.status} for "${playerName}"`);
      return null;
    }

    const html = await response.text();

    const playerSection = html.match(/Search results for players[\s\S]*?<table class="items">([\s\S]*?)<\/table>/);
    if (!playerSection) return [];

    const tableHtml = playerSection[1];
    const results: Array<{ id: string; name: string; club: string; position: string; marketValue: string }> = [];

    const rowRegex = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const row = rowMatch[1];
      const idMatch = row.match(/\/profil\/spieler\/(\d+)/);
      if (!idMatch) continue;

      const nameMatch = row.match(/title="([^"]+)"[^>]*href="[^"]*\/profil\/spieler/);
      const clubMatch = row.match(/title="([^"]+)"[^>]*href="[^"]*\/startseite\/verein/);
      const posMatch = row.match(/<td class="zentriert">([A-Z]{1,3})<\/td>/);
      const mvMatch = row.match(/<td class="rechts hauptlink">([^<]*)<\/td>/);

      results.push({
        id: idMatch[1],
        name: nameMatch?.[1] || 'Unknown',
        club: clubMatch?.[1] || 'Unknown',
        position: posMatch?.[1] || '',
        marketValue: mvMatch?.[1] || '',
      });
    }

    return results;
  } catch (e) {
    console.error(`Search failed for "${playerName}":`, e);
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

    const body = await req.json().catch(() => ({}));

    // MODE 1: Apply matches
    if (body.apply && typeof body.apply === 'object') {
      console.log(`Applying ${Object.keys(body.apply).length} matches...`);
      let applied = 0;

      for (const [playerId, externalId] of Object.entries(body.apply)) {
        const { data: existing } = await supabase
          .from('player_stats')
          .select('id')
          .eq('player_id', playerId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('player_stats')
            .update({ external_player_id: externalId as string, updated_at: new Date().toISOString() })
            .eq('player_id', playerId);
        } else {
          await supabase
            .from('player_stats')
            .insert({ player_id: playerId, external_player_id: externalId as string });
        }
        applied++;
      }

      return new Response(
        JSON.stringify({ success: true, applied }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 2: Search a batch of players
    // Expects { players: [{ id, name }], offset?: number }
    const playerBatch: Array<{ id: string; name: string }> = body.players || [];
    
    if (playerBatch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: [], message: 'No players to search' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process max 10 players per call to stay within timeout
    const batch = playerBatch.slice(0, 10);
    const results: MatchResult[] = [];

    for (const player of batch) {
      const searchResults = await searchTransfermarkt(player.name);

      if (searchResults === null) {
        results.push({ player_id: player.id, player_name: player.name, status: 'error', error: 'Search request failed' });
      } else if (searchResults.length === 0) {
        results.push({ player_id: player.id, player_name: player.name, status: 'not_found' });
      } else {
        const best = searchResults[0];
        const lastName = player.name.toLowerCase().split(' ').pop() || '';
        const tmLastName = best.name.toLowerCase().split(' ').pop() || '';
        const nameMatch = best.name.toLowerCase().includes(lastName) || player.name.toLowerCase().includes(tmLastName);

        results.push({
          player_id: player.id,
          player_name: player.name,
          status: nameMatch ? 'matched' : 'multiple',
          external_id: best.id,
          tm_name: best.name,
          tm_club: best.club,
          tm_position: best.position,
          tm_market_value: best.marketValue,
        });
      }

      // Rate limit between searches
      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`Batch complete: ${results.filter(r => r.status === 'matched').length} matched out of ${batch.length}`);

    return new Response(
      JSON.stringify({ success: true, results }),
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
