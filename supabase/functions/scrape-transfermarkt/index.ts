const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchFilters {
  position?: string;
  ageMin?: number;
  ageMax?: number;
  nationality?: string;
  league?: string;
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
  transfermarktUrl: string;
}

async function searchTransfermarkt(query: string, filters: SearchFilters): Promise<PlayerResult[]> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-GB,en;q=0.9',
    };

    // Build the advanced search URL
    // Transfermarkt detailed search: /detailsuche/spielerdetail/suche
    let searchUrl = `https://www.transfermarkt.com/detailsuche/spielerdetail/suche`;
    const params = new URLSearchParams();
    
    if (query) params.set('Ession_id', ''); // Required param
    if (filters.position) params.set('position', mapPosition(filters.position));
    if (filters.ageMin) params.set('ageMin', filters.ageMin.toString());
    if (filters.ageMax) params.set('ageMax', filters.ageMax.toString());
    if (filters.nationality) params.set('land_id', filters.nationality);
    if (filters.league) params.set('wettbewerb_id', filters.league);
    if (filters.contractUntil) params.set('vertrag_bis', filters.contractUntil);
    
    // Search for players without agent
    params.set('spielerberater', '0'); // 0 = no agent filter in TM

    const fullUrl = `${searchUrl}?${params.toString()}`;
    console.log('Searching Transfermarkt:', fullUrl);

    const response = await fetch(fullUrl, { headers });
    
    if (!response.ok) {
      // Fallback to regular search
      console.log('Advanced search failed, falling back to standard search');
      return await fallbackSearch(query, filters, headers);
    }

    const html = await response.text();
    return parseSearchResults(html, filters);
  } catch (error) {
    console.error('Error searching Transfermarkt:', error);
    return [];
  }
}

async function fallbackSearch(query: string, filters: SearchFilters, headers: Record<string, string>): Promise<PlayerResult[]> {
  const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query || 'player')}`;
  
  const response = await fetch(searchUrl, { headers });
  if (!response.ok) {
    console.error('Fallback search also failed:', response.status);
    return [];
  }
  
  const html = await response.text();
  return parseSearchResults(html, filters);
}

function parseSearchResults(html: string, filters: SearchFilters): PlayerResult[] {
  const results: PlayerResult[] = [];
  
  // Match player rows from search results table
  // Looking for patterns in TM search result pages
  const playerPattern = /<tr[^>]*class=\\"[^\\"]*(?:odd|even)[^\\"]*\\"[^>]*>([\\s\\S]*?)<\\/tr>/gi;
  let match;
  
  while ((match = playerPattern.exec(html)) !== null) {
    const row = match[1];
    
    // Extract player link and name
    const nameMatch = row.match(/<a[^>]*href=\\"(\\/[^\\"]*\\/profil\\/spieler\\/\\d+)\\"[^>]*(?:title=\\"([^\\"]*)\\")?[^>]*>([^<]+)<\\/a>/);
    if (!nameMatch) continue;
    
    const url = nameMatch[1];
    const name = nameMatch[2] || nameMatch[3];
    
    // Extract position
    const posMatch = row.match(/<td[^>]*>([^<]*(?:Forward|Midfielder|Defender|Goalkeeper|Striker|Winger|Centre-Back|Left-Back|Right-Back|Centre Forward|Attacking Midfield|Central Midfield|Defensive Midfield|Left Midfield|Right Midfield|Left Winger|Right Winger|Second Striker)[^<]*)<\\/td>/i);
    const position = posMatch ? posMatch[1].trim() : '';
    
    // Extract age
    const ageMatch = row.match(/>\\s*(\\d{1,2})\\s*<\\/td>/);
    const age = ageMatch ? ageMatch[1] : '';
    
    // Extract nationality (from flag image alt text)
    const natMatch = row.match(/<img[^>]*class=\\"[^\\"]*flaggenrahmen[^\\"]*\\"[^>]*(?:title|alt)=\\"([^\\"]*)\\"[^>]*>/);
    const nationality = natMatch ? natMatch[1] : '';
    
    // Extract club
    const clubMatch = row.match(/<a[^>]*href=\\"\\/[^\\"]*\\/startseite\\/verein\\/\\d+\\"[^>]*(?:title=\\"([^\\"]*)\\")?[^>]*>([^<]*)<\\/a>/);
    const club = clubMatch ? (clubMatch[1] || clubMatch[2] || '').trim() : '';
    
    // Extract market value
    const valueMatch = row.match(/(?:€|£|\\$)\\s*[\\d.,]+[mkMK]?/);
    const marketValue = valueMatch ? valueMatch[0] : '';
    
    // Extract contract end
    const contractMatch = row.match(/(\\d{2}\\/\\d{2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2})/);
    const contractUntil = contractMatch ? contractMatch[1] : '';
    
    // Check agent status from the row HTML
    let agentStatus: 'no_agent' | 'family_agent' | 'unknown' = 'unknown';
    const agentCell = row.match(/<td[^>]*>[^<]*(?:berater|agent|adviser)[^<]*<\\/td>/i);
    const noAgentMatch = row.match(/(?:ohne\\s*berater|no\\s*agent|kein\\s*berater|-\\s*<\\/td>)/i);
    const familyMatch = row.match(/(?:family|father|mother|brother|sister|uncle|relative|parent)/i);
    
    if (noAgentMatch) {
      agentStatus = 'no_agent';
    } else if (familyMatch) {
      agentStatus = 'family_agent';
    }
    
    // Apply age filters
    if (filters.ageMin && parseInt(age) < filters.ageMin) continue;
    if (filters.ageMax && parseInt(age) > filters.ageMax) continue;
    
    results.push({
      name: name.trim(),
      position,
      age,
      nationality,
      club,
      marketValue,
      contractUntil,
      agentStatus,
      transfermarktUrl: `https://www.transfermarkt.com${url}`,
    });
  }
  
  return results;
}

// Fetch individual player page to check agent status
async function checkPlayerAgent(playerUrl: string): Promise<{ agentStatus: 'no_agent' | 'family_agent' | 'has_agent'; agentName: string }> {
  try {
    const response = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      }
    });
    
    if (!response.ok) return { agentStatus: 'has_agent', agentName: 'Unknown' };
    
    const html = await response.text();
    
    // Check for agent information on profile page
    const agentSection = html.match(/(?:Player\\s*agent|Berater|Agent)[:\\s]*<[^>]*>([^<]+)<\\/[^>]*>/i);
    
    if (!agentSection) {
      // Look for "no agent" indicators
      const noAgent = html.match(/(?:ohne\\s*berater|no\\s*agent|kein\\s*berater|---)/i);
      if (noAgent) return { agentStatus: 'no_agent', agentName: '' };
      
      return { agentStatus: 'no_agent', agentName: '' };
    }
    
    const agentName = agentSection[1].trim();
    
    // Check if agent is a family member
    const familyTerms = ['father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'parent', 'family', 'relative',
      'vater', 'mutter', 'bruder', 'schwester', 'onkel', 'tante', 'eltern', 'familie'];
    
    const agentLower = agentName.toLowerCase();
    const isFamily = familyTerms.some(term => agentLower.includes(term));
    
    if (isFamily || agentName === '-' || agentName === '---' || !agentName) {
      return { agentStatus: isFamily ? 'family_agent' : 'no_agent', agentName };
    }
    
    return { agentStatus: 'has_agent', agentName };
  } catch {
    return { agentStatus: 'has_agent', agentName: 'Unknown' };
  }
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, playerUrls } = await req.json();

    // If playerUrls provided, check agent status for each
    if (playerUrls && Array.isArray(playerUrls)) {
      const results = await Promise.all(
        playerUrls.slice(0, 10).map(async (url: string) => {
          const agentInfo = await checkPlayerAgent(url);
          return { url, ...agentInfo };
        })
      );
      
      return new Response(
        JSON.stringify({ success: true, agentChecks: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, do a search
    const searchFilters: SearchFilters = filters || {};
    const players = await searchTransfermarkt(query || '', searchFilters);

    // For each player found, check their agent status on their profile page
    // Limit to first 15 to avoid rate limiting
    const enrichedPlayers = await Promise.all(
      players.slice(0, 15).map(async (player) => {
        try {
          const agentInfo = await checkPlayerAgent(player.transfermarktUrl);
          return { ...player, agentStatus: agentInfo.agentStatus, agentName: agentInfo.agentName };
        } catch {
          return player;
        }
      })
    );

    // Filter to only show players without agents or with family agents
    const filteredPlayers = enrichedPlayers.filter(
      p => p.agentStatus === 'no_agent' || p.agentStatus === 'family_agent'
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        players: filteredPlayers,
        totalFound: players.length,
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
