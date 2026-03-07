const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchFilters {
  position?: string;
  ageMin?: number;
  ageMax?: number;
  nationality?: string;
  countryPlayingIn?: string;
  contractUntil?: string;
}

interface PlayerResult {
  name: string;
  position: string;
  age: string;
  nationality: string;
  club: string;
  marketValue: string;
  contractUntil: string;
  agentStatus: 'no_agent' | 'family_agent' | 'unknown';
  agentName?: string;
  transfermarktUrl: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'Referer': 'https://www.transfermarkt.co.uk/',
};

function mapPosition(position: string): string {
  const positionMap: Record<string, string> = {
    'goalkeeper': '1',
    'centre-back': '3',
    'left-back': '4',
    'right-back': '2',
    'defensive midfield': '6',
    'central midfield': '8',
    'attacking midfield': '10',
    'left winger': '7',
    'right winger': '11',
    'centre-forward': '9',
    'striker': '9',
    'defender': '3,4,2',
    'midfielder': '6,8,10',
    'forward': '7,9,11',
    'winger': '7,11',
  };
  return positionMap[position.toLowerCase()] || '';
}

async function searchTransfermarkt(filters: SearchFilters): Promise<{ players: PlayerResult[]; totalFound: number }> {
  // Use transfermarkt.co.uk (English version) detailed search
  const params = new URLSearchParams();
  
  // Required params for the search form
  params.set('Ession_id', '');
  
  if (filters.position) {
    const mapped = mapPosition(filters.position);
    if (mapped) params.set('position', mapped);
  }
  if (filters.ageMin) params.set('ageMin', filters.ageMin.toString());
  if (filters.ageMax) params.set('ageMax', filters.ageMax.toString());
  if (filters.nationality) params.set('land_id', filters.nationality);
  if (filters.countryPlayingIn) params.set('wettbewerb_id', filters.countryPlayingIn);
  if (filters.contractUntil) params.set('vertrag_bis', filters.contractUntil);
  
  // Filter for players without agent
  params.set('spielerberater', '0');

  const searchUrl = `https://www.transfermarkt.co.uk/detailsuche/spielerdetail/suche?${params.toString()}`;
  console.log('Searching:', searchUrl);

  try {
    const response = await fetch(searchUrl, { headers: HEADERS, redirect: 'follow' });
    
    if (!response.ok) {
      console.log('Search returned status:', response.status);
      // Try alternative: use the .com domain
      return await searchFallback(filters);
    }

    const html = await response.text();
    console.log('Got HTML response, length:', html.length);
    
    const players = parseResults(html);
    console.log('Parsed players:', players.length);
    
    return { players, totalFound: players.length };
  } catch (error) {
    console.error('Primary search failed:', error);
    return await searchFallback(filters);
  }
}

async function searchFallback(filters: SearchFilters): Promise<{ players: PlayerResult[]; totalFound: number }> {
  // Fallback: try .com domain
  const params = new URLSearchParams();
  params.set('Ession_id', '');
  if (filters.position) {
    const mapped = mapPosition(filters.position);
    if (mapped) params.set('position', mapped);
  }
  if (filters.ageMin) params.set('ageMin', filters.ageMin.toString());
  if (filters.ageMax) params.set('ageMax', filters.ageMax.toString());
  if (filters.nationality) params.set('land_id', filters.nationality);
  if (filters.countryPlayingIn) params.set('wettbewerb_id', filters.countryPlayingIn);
  params.set('spielerberater', '0');

  const searchUrl = `https://www.transfermarkt.com/detailsuche/spielerdetail/suche?${params.toString()}`;
  console.log('Fallback search:', searchUrl);

  try {
    const response = await fetch(searchUrl, { headers: HEADERS, redirect: 'follow' });
    if (!response.ok) {
      console.log('Fallback also failed:', response.status);
      return { players: [], totalFound: 0 };
    }
    const html = await response.text();
    const players = parseResults(html);
    return { players, totalFound: players.length };
  } catch (error) {
    console.error('Fallback search failed:', error);
    return { players: [], totalFound: 0 };
  }
}

function parseResults(html: string): PlayerResult[] {
  const results: PlayerResult[] = [];
  
  // Parse player rows from the detailed search results table
  // TM uses <tr class="odd"> and <tr class="even"> for result rows
  const rowPattern = /<tr[^>]*class="[^"]*(?:odd|even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = rowPattern.exec(html)) !== null) {
    const row = match[1];
    
    // Extract player link and name
    const nameMatch = row.match(/<a[^>]*href="(\/[^"]*\/profil\/spieler\/\d+)"[^>]*(?:title="([^"]*)")?[^>]*>([^<]+)<\/a>/);
    if (!nameMatch) continue;
    
    const url = nameMatch[1];
    const name = (nameMatch[2] || nameMatch[3] || '').trim();
    if (!name) continue;
    
    // Extract position
    const posMatch = row.match(/<td[^>]*>([^<]*(?:Forward|Midfielder|Defender|Goalkeeper|Striker|Winger|Centre-Back|Left-Back|Right-Back|Centre Forward|Attacking Midfield|Central Midfield|Defensive Midfield|Left Midfield|Right Midfield|Left Winger|Right Winger|Second Striker)[^<]*)<\/td>/i);
    const position = posMatch ? posMatch[1].trim() : '';
    
    // Extract age
    const ageMatch = row.match(/>\s*(\d{1,2})\s*<\/td>/);
    const age = ageMatch ? ageMatch[1] : '';
    
    // Extract nationality from flag
    const natMatch = row.match(/<img[^>]*class="[^"]*flaggenrahmen[^"]*"[^>]*(?:title|alt)="([^"]*)"[^>]*>/);
    const nationality = natMatch ? natMatch[1] : '';
    
    // Extract club
    const clubMatch = row.match(/<a[^>]*href="\/[^"]*\/startseite\/verein\/\d+"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/);
    const club = clubMatch ? (clubMatch[1] || clubMatch[2] || '').trim() : '';
    
    // Extract market value
    const valueMatch = row.match(/(?:€|£|\$)\s*[\d.,]+[mkMK]?/);
    const marketValue = valueMatch ? valueMatch[0] : '';
    
    // Extract contract end
    const contractMatch = row.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
    const contractUntil = contractMatch ? contractMatch[1] : '';
    
    // Check agent status
    let agentStatus: 'no_agent' | 'family_agent' | 'unknown' = 'unknown';
    const noAgentMatch = row.match(/(?:ohne\s*berater|no\s*agent|kein\s*berater|-\s*<\/td>)/i);
    const familyMatch = row.match(/(?:family|father|mother|brother|sister|uncle|relative|parent)/i);
    
    if (noAgentMatch) {
      agentStatus = 'no_agent';
    } else if (familyMatch) {
      agentStatus = 'family_agent';
    } else {
      // Since we searched with spielerberater=0 (no agent filter), mark as no_agent by default
      agentStatus = 'no_agent';
    }
    
    results.push({
      name,
      position,
      age,
      nationality,
      club,
      marketValue,
      contractUntil,
      agentStatus,
      transfermarktUrl: `https://www.transfermarkt.co.uk${url}`,
    });
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters } = await req.json();
    const searchFilters: SearchFilters = filters || {};
    
    console.log('Received filters:', JSON.stringify(searchFilters));
    
    const { players, totalFound } = await searchTransfermarkt(searchFilters);

    // Filter to only show players without agents or with family agents
    const filteredPlayers = players.filter(
      p => p.agentStatus === 'no_agent' || p.agentStatus === 'family_agent'
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        players: filteredPlayers,
        totalFound,
        filteredCount: filteredPlayers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Scraper failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
