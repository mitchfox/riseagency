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
  tm_portrait_url?: string;
  error?: string;
}

async function searchTransfermarkt(playerName: string): Promise<{
  id: string;
  name: string;
  club: string;
  position: string;
  marketValue: string;
  portraitUrl: string;
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

    // Check for player results section
    const playerSection = html.match(/Search results for players[\s\S]*?<table class="items">([\s\S]*?)<\/table>/);
    if (!playerSection) {
      return [];
    }

    const tableHtml = playerSection[1];
    const results: Array<{
      id: string;
      name: string;
      club: string;
      position: string;
      marketValue: string;
      portraitUrl: string;
    }> = [];

    // Extract player rows from tbody
    const rowRegex = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const row = rowMatch[1];

      // Extract player ID from profile link
      const idMatch = row.match(/\/profil\/spieler\/(\d+)/);
      if (!idMatch) continue;

      // Extract player name from title attribute
      const nameMatch = row.match(/title="([^"]+)"[^>]*href="[^"]*\/profil\/spieler/);
      
      // Extract club name
      const clubMatch = row.match(/title="([^"]+)"[^>]*href="[^"]*\/startseite\/verein/);
      
      // Extract position
      const posMatch = row.match(/<td class="zentriert">([A-Z]{1,3})<\/td>/);
      
      // Extract market value
      const mvMatch = row.match(/<td class="rechts hauptlink">([^<]*)<\/td>/);

      // Extract portrait URL
      const portraitMatch = row.match(/src="(https:\/\/img\.a\.transfermarkt\.technology\/portrait[^"]+)"/);

      results.push({
        id: idMatch[1],
        name: nameMatch?.[1] || 'Unknown',
        club: clubMatch?.[1] || 'Unknown',
        position: posMatch?.[1] || '',
        marketValue: mvMatch?.[1] || '',
        portraitUrl: portraitMatch?.[1] || '',
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

    let applyMatches: Record<string, string> | null = null;
    try {
      const body = await req.json();
      applyMatches = body?.apply || null;
    } catch { /* no body */ }

    // If applying matches, update the database
    if (applyMatches && typeof applyMatches === 'object') {
      console.log(`Applying ${Object.keys(applyMatches).length} matches...`);
      let applied = 0;
      let errors = 0;

      for (const [playerId, externalId] of Object.entries(applyMatches)) {
        // Ensure player_stats row exists
        const { data: existing } = await supabase
          .from('player_stats')
          .select('id')
          .eq('player_id', playerId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('player_stats')
            .update({ external_player_id: externalId, updated_at: new Date().toISOString() })
            .eq('player_id', playerId);
          if (error) { errors++; console.error(`Update error for ${playerId}:`, error); }
          else { applied++; }
        } else {
          const { error } = await supabase
            .from('player_stats')
            .insert({ player_id: playerId, external_player_id: externalId });
          if (error) { errors++; console.error(`Insert error for ${playerId}:`, error); }
          else { applied++; }
        }
      }

      return new Response(
        JSON.stringify({ success: true, applied, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, search and match players
    const { data: players, error: fetchError } = await supabase
      .from('players')
      .select('id, name')
      .order('name');

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch players' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing external IDs
    const { data: existingStats } = await supabase
      .from('player_stats')
      .select('player_id, external_player_id');

    const existingMap: Record<string, string> = {};
    existingStats?.forEach(s => {
      if (s.external_player_id) existingMap[s.player_id] = s.external_player_id;
    });

    const results: MatchResult[] = [];
    let searchCount = 0;

    for (const player of players || []) {
      // Skip players who already have an external ID
      if (existingMap[player.id]) {
        results.push({
          player_id: player.id,
          player_name: player.name,
          status: 'already_set',
          external_id: existingMap[player.id],
        });
        continue;
      }

      const searchResults = await searchTransfermarkt(player.name);
      searchCount++;

      if (searchResults === null) {
        results.push({
          player_id: player.id,
          player_name: player.name,
          status: 'error',
          error: 'Search request failed',
        });
      } else if (searchResults.length === 0) {
        results.push({
          player_id: player.id,
          player_name: player.name,
          status: 'not_found',
        });
      } else if (searchResults.length === 1) {
        results.push({
          player_id: player.id,
          player_name: player.name,
          status: 'matched',
          external_id: searchResults[0].id,
          tm_name: searchResults[0].name,
          tm_club: searchResults[0].club,
          tm_position: searchResults[0].position,
          tm_market_value: searchResults[0].marketValue,
          tm_portrait_url: searchResults[0].portraitUrl,
        });
      } else {
        // Multiple results - use the first one but flag it
        const best = searchResults[0];
        // Check if the first result name closely matches
        const nameMatch = best.name.toLowerCase().includes(player.name.toLowerCase().split(' ').pop() || '') ||
                          player.name.toLowerCase().includes(best.name.toLowerCase().split(' ').pop() || '');
        
        results.push({
          player_id: player.id,
          player_name: player.name,
          status: nameMatch ? 'matched' : 'multiple',
          external_id: best.id,
          tm_name: best.name,
          tm_club: best.club,
          tm_position: best.position,
          tm_market_value: best.marketValue,
          tm_portrait_url: best.portraitUrl,
        });
      }

      // Rate limit: 500ms between searches
      if (searchCount % 5 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`Auto-match complete: ${results.filter(r => r.status === 'matched').length} matched, ${results.filter(r => r.status === 'not_found').length} not found`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          matched: results.filter(r => r.status === 'matched').length,
          not_found: results.filter(r => r.status === 'not_found').length,
          multiple: results.filter(r => r.status === 'multiple').length,
          already_set: results.filter(r => r.status === 'already_set').length,
          errors: results.filter(r => r.status === 'error').length,
        },
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
