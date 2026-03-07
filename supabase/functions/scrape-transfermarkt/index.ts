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

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Referer': 'https://www.transfermarkt.co.uk/detailsuche/spielerdetail',
  'Origin': 'https://www.transfermarkt.co.uk',
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
  // Build form data for POST submission
  const formData = new URLSearchParams();

  // Required hidden fields from the TM form
  formData.set('Ession_id', '');

  if (filters.position) {
    const mapped = mapPosition(filters.position);
    if (mapped) formData.set('position', mapped);
  }
  if (filters.ageMin) formData.set('ageMin', filters.ageMin.toString());
  if (filters.ageMax) formData.set('ageMax', filters.ageMax.toString());
  if (filters.nationality) formData.set('land_id', filters.nationality);
  if (filters.countryPlayingIn) formData.set('wettbewerb_id', filters.countryPlayingIn);
  if (filters.contractUntil) formData.set('vertrag_bis', filters.contractUntil);

  // Filter for players without agent
  formData.set('spielerberater', '0');

  const searchUrl = 'https://www.transfermarkt.co.uk/detailsuche/spielerdetail/suche';
  console.log('POST search to:', searchUrl, 'with body:', formData.toString());

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'follow',
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.log('Primary POST failed with status:', response.status);
      return await searchFallback(filters);
    }

    const html = await response.text();
    console.log('Got HTML response, length:', html.length);

    // Debug: log a snippet to check if we got results or just the form
    const hasItemsTable = html.includes('class="items"');
    const hasResultRows = html.includes('spielprofil_tooltip');
    console.log('Has items table:', hasItemsTable, '| Has result rows:', hasResultRows);

    // Log a small snippet around the items table if found
    if (hasItemsTable) {
      const idx = html.indexOf('class="items"');
      console.log('Items table snippet:', html.substring(idx, idx + 500));
    }

    const players = parseResults(html);
    console.log('Parsed players:', players.length);

    return { players, totalFound: players.length };
  } catch (error) {
    console.error('Primary search failed:', error);
    return await searchFallback(filters);
  }
}

async function searchFallback(filters: SearchFilters): Promise<{ players: PlayerResult[]; totalFound: number }> {
  // Fallback: try .com domain with POST
  const formData = new URLSearchParams();
  formData.set('Ession_id', '');
  if (filters.position) {
    const mapped = mapPosition(filters.position);
    if (mapped) formData.set('position', mapped);
  }
  if (filters.ageMin) formData.set('ageMin', filters.ageMin.toString());
  if (filters.ageMax) formData.set('ageMax', filters.ageMax.toString());
  if (filters.nationality) formData.set('land_id', filters.nationality);
  if (filters.countryPlayingIn) formData.set('wettbewerb_id', filters.countryPlayingIn);
  formData.set('spielerberater', '0');

  const searchUrl = 'https://www.transfermarkt.com/detailsuche/spielerdetail/suche';
  console.log('Fallback POST search:', searchUrl);

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.transfermarkt.com/detailsuche/spielerdetail',
        'Origin': 'https://www.transfermarkt.com',
      },
      body: formData.toString(),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log('Fallback also failed:', response.status);
      return { players: [], totalFound: 0 };
    }
    const html = await response.text();
    console.log('Fallback HTML length:', html.length, '| Has items:', html.includes('class="items"'));
    const players = parseResults(html);
    console.log('Fallback parsed players:', players.length);
    return { players, totalFound: players.length };
  } catch (error) {
    console.error('Fallback search failed:', error);
    return { players: [], totalFound: 0 };
  }
}

function parseResults(html: string): PlayerResult[] {
  const results: PlayerResult[] = [];

  // Strategy 1: Parse from <table class="items"> tbody rows
  const tableMatch = html.match(/<table[^>]*class="[^"]*items[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    console.log('Found items table, parsing rows...');
    const tableHtml = tableMatch[1];
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    const rowsHtml = tbodyMatch ? tbodyMatch[1] : tableHtml;

    // Each player is in a <tr> row
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowPattern.exec(rowsHtml)) !== null) {
      const row = match[1];
      const player = parsePlayerRow(row);
      if (player) results.push(player);
    }
  }

  // Strategy 2: Fallback - find all spielprofil_tooltip links
  if (results.length === 0) {
    console.log('Items table parsing found 0, trying spielprofil_tooltip fallback...');
    const linkPattern = /<a[^>]*class="[^"]*spielprofil_tooltip[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    const seen = new Set<string>();
    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();
      if (!name || seen.has(url)) continue;
      seen.add(url);

      results.push({
        name,
        position: '',
        age: '',
        nationality: '',
        club: '',
        marketValue: '',
        contractUntil: '',
        agentStatus: 'no_agent',
        transfermarktUrl: url.startsWith('http') ? url : `https://www.transfermarkt.co.uk${url}`,
      });
    }
  }

  // Strategy 3: Even more generic - find any player profile links
  if (results.length === 0) {
    console.log('spielprofil_tooltip fallback found 0, trying generic profile link fallback...');
    const profilePattern = /<a[^>]*href="(\/[^"]*\/profil\/spieler\/\d+)"[^>]*(?:title="([^"]*)")?[^>]*>/gi;
    let match;
    const seen = new Set<string>();
    while ((match = profilePattern.exec(html)) !== null) {
      const url = match[1];
      const name = (match[2] || '').trim();
      if (!name || seen.has(url)) continue;
      seen.add(url);

      results.push({
        name,
        position: '',
        age: '',
        nationality: '',
        club: '',
        marketValue: '',
        contractUntil: '',
        agentStatus: 'no_agent',
        transfermarktUrl: `https://www.transfermarkt.co.uk${url}`,
      });
    }
  }

  return results;
}

function parsePlayerRow(row: string): PlayerResult | null {
  // Extract player link and name - TM uses various link patterns
  const nameMatch = row.match(/<a[^>]*href="(\/[^"]*\/(?:profil|spieler)\/[^"]*)"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/);
  if (!nameMatch) return null;

  const url = nameMatch[1];
  const name = (nameMatch[2] || nameMatch[3] || '').trim();
  if (!name || name.length < 2) return null;

  // Extract all table cells
  const cells: string[] = [];
  const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  while ((cellMatch = cellPattern.exec(row)) !== null) {
    cells.push(cellMatch[1].trim());
  }

  // Extract position from cells
  let position = '';
  const posKeywords = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'Striker', 'Winger',
    'Centre-Back', 'Left-Back', 'Right-Back', 'Centre Forward', 'Attacking Midfield',
    'Central Midfield', 'Defensive Midfield', 'Left Midfield', 'Right Midfield',
    'Left Winger', 'Right Winger', 'Second Striker'];
  for (const cell of cells) {
    const cleanCell = cell.replace(/<[^>]+>/g, '').trim();
    for (const kw of posKeywords) {
      if (cleanCell.toLowerCase().includes(kw.toLowerCase())) {
        position = cleanCell;
        break;
      }
    }
    if (position) break;
  }

  // Extract age - look for a 2-digit number in its own cell
  let age = '';
  for (const cell of cells) {
    const cleanCell = cell.replace(/<[^>]+>/g, '').trim();
    if (/^\d{1,2}$/.test(cleanCell) && parseInt(cleanCell) >= 14 && parseInt(cleanCell) <= 45) {
      age = cleanCell;
      break;
    }
  }

  // Extract nationality from flag image
  const natMatch = row.match(/<img[^>]*class="[^"]*flaggenrahmen[^"]*"[^>]*(?:title|alt)="([^"]*)"[^>]*>/);
  const nationality = natMatch ? natMatch[1] : '';

  // Extract club
  const clubMatch = row.match(/<a[^>]*href="\/[^"]*\/startseite\/verein\/\d+"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/);
  const club = clubMatch ? (clubMatch[1] || clubMatch[2] || '').trim() : '';

  // Extract market value
  const valueMatch = row.match(/(?:€|£|\$)\s*[\d.,]+\s*[mkMK]?/);
  const marketValue = valueMatch ? valueMatch[0].trim() : '';

  // Extract contract end date
  const contractMatch = row.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w{3}\s+\d{1,2},\s+\d{4})/);
  const contractUntil = contractMatch ? contractMatch[1] : '';

  // Agent status - since we filter with spielerberater=0, default to no_agent
  let agentStatus: 'no_agent' | 'family_agent' | 'unknown' = 'no_agent';
  const familyMatch = row.match(/(?:family|father|mother|brother|sister|uncle|relative|parent)/i);
  if (familyMatch) {
    agentStatus = 'family_agent';
  }

  return {
    name,
    position,
    age,
    nationality,
    club,
    marketValue,
    contractUntil,
    agentStatus,
    transfermarktUrl: `https://www.transfermarkt.co.uk${url}`,
  };
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
