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

const TM_API = 'https://tmapi-alpha.transfermarkt.technology';

// Nationality ID to name mapping
const NATIONALITY_NAMES: Record<number, string> = {
  189: 'England', 190: 'Scotland', 191: 'Wales', 192: 'Northern Ireland',
  193: 'Republic of Ireland', 50: 'France', 157: 'Spain', 40: 'Germany',
  75: 'Italy', 122: 'Netherlands', 136: 'Portugal', 24: 'Brazil',
  9: 'Argentina', 125: 'Nigeria', 152: 'Senegal', 54: 'Ghana',
  31: 'Cameroon', 68: 'Jamaica', 185: 'USA', 32: 'Canada',
  14: 'Australia', 39: 'Belgium', 10: 'Armenia', 15: 'Austria',
  22: 'Bosnia-Herzegovina', 25: 'Bulgaria', 34: 'Chile', 36: 'Colombia',
  37: 'Costa Rica', 38: 'Croatia', 41: 'Czech Republic', 42: 'Denmark',
  43: 'Ecuador', 44: 'Egypt', 46: 'Estonia', 48: 'Finland',
  51: 'Gabon', 55: 'Greece', 57: 'Guinea', 59: 'Honduras',
  60: 'Hungary', 62: 'Iceland', 63: 'Iran', 64: 'Iraq',
  66: 'Ivory Coast', 67: 'Japan', 69: 'South Korea', 70: 'Kosovo',
  72: 'Latvia', 76: 'Lithuania', 78: 'Luxembourg', 80: 'Mali',
  84: 'Mexico', 86: 'Montenegro', 87: 'Morocco', 95: 'New Zealand',
  100: 'Norway', 107: 'Paraguay', 108: 'Peru', 110: 'Poland',
  113: 'DR Congo', 114: 'Romania', 115: 'Russia', 120: 'Serbia',
  126: 'Slovakia', 127: 'Slovenia', 128: 'South Africa', 140: 'Sweden',
  141: 'Switzerland', 160: 'Tunisia', 161: 'Turkey', 163: 'Ukraine',
  170: 'Uruguay', 171: 'Uzbekistan', 172: 'Venezuela', 176: 'Zimbabwe',
};

// Position group mapping
const POSITION_FILTERS: Record<string, string[]> = {
  'goalkeeper': ['Goalkeeper'],
  'centre-back': ['Centre-Back'],
  'left-back': ['Left-Back'],
  'right-back': ['Right-Back'],
  'defensive midfield': ['Defensive Midfield'],
  'central midfield': ['Central Midfield'],
  'attacking midfield': ['Attacking Midfield'],
  'left winger': ['Left Winger'],
  'right winger': ['Right Winger'],
  'centre-forward': ['Centre-Forward'],
};

async function fetchJSON(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.substring(0, 200)}`);
  }
  return response.json();
}

async function getClubIds(competitionId: string): Promise<string[]> {
  const data = await fetchJSON(`${TM_API}/competition/${competitionId}/table?seasonId=2025`);
  if (!data.success || !data.data?.tables?.[0]?.clubs) {
    console.log('No table data for competition:', competitionId);
    return [];
  }
  return data.data.tables[0].clubs.map((c: any) => c.clubId);
}

async function getSquadPlayerIds(clubId: string): Promise<string[]> {
  try {
    const data = await fetchJSON(`${TM_API}/club/${clubId}/squad?seasonId=2025`);
    if (!data.success || !data.data?.playerIds) return [];
    return data.data.playerIds;
  } catch (e) {
    console.error(`Failed to get squad for club ${clubId}:`, e);
    return [];
  }
}

interface PlayerProfile {
  id: string;
  name: string;
  age: number;
  position: string;
  positionGroup: string;
  nationalityId: number;
  secondNationalityId: number;
  clubId: string;
  clubName: string;
  marketValue: string;
  contractUntil: string;
  agentStatus: 'no_agent' | 'family_agent' | 'unknown';
  agentName: string;
  relativeUrl: string;
}

async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  try {
    const data = await fetchJSON(`${TM_API}/player/${playerId}`);
    if (!data.success || !data.data) return null;

    const p = data.data;
    const attrs = p.attributes || {};
    const agency = attrs.consultantAgency;
    const agencyId = attrs.consultantAgencyId;

    // Determine agent status
    let agentStatus: 'no_agent' | 'family_agent' | 'unknown' = 'unknown';
    let agentName = '';

    if (!agencyId || agencyId === 0) {
      agentStatus = 'no_agent';
    } else if (agency?.isSpecialConsultantAgency) {
      // Special agencies include "Relatives" / family members
      agentStatus = 'family_agent';
      agentName = agency.name || '';
    } else {
      agentStatus = 'unknown'; // Has a professional agent
      agentName = agency?.name || '';
    }

    // Get club name from assignments
    let clubName = '';
    const currentClub = p.clubAssignments?.find((a: any) => a.type === 'current');
    if (currentClub) {
      clubName = currentClub.clubId; // We'll resolve later if needed
    }

    // Format market value
    let marketValue = '';
    if (p.marketValueDetails?.current?.compact) {
      const mv = p.marketValueDetails.current.compact;
      marketValue = `${mv.prefix}${mv.content}${mv.suffix}`;
    }

    // Format contract
    let contractUntil = '';
    if (attrs.contractUntil) {
      const d = new Date(attrs.contractUntil);
      contractUntil = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    return {
      id: p.id,
      name: p.name || '',
      age: p.lifeDates?.age || 0,
      position: attrs.position?.name || attrs.positionGroupName || '',
      positionGroup: attrs.positionGroup || '',
      nationalityId: p.nationalityDetails?.nationalities?.nationalityId || 0,
      secondNationalityId: p.nationalityDetails?.nationalities?.secondNationalityId || 0,
      clubId: currentClub?.clubId || '',
      clubName,
      marketValue,
      contractUntil,
      agentStatus,
      agentName,
      relativeUrl: p.relativeUrl || '',
    };
  } catch (e) {
    console.error(`Failed to get player ${playerId}:`, e);
    return null;
  }
}

// Fetch in parallel batches to avoid overwhelming the API
async function batchFetch<T>(items: string[], fn: (id: string) => Promise<T | null>, batchSize = 25): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }
  return results;
}

// Get club names by fetching club data
const clubNameCache = new Map<string, string>();
async function getClubName(clubId: string): Promise<string> {
  if (clubNameCache.has(clubId)) return clubNameCache.get(clubId)!;
  try {
    const data = await fetchJSON(`${TM_API}/club/${clubId}`);
    const name = data.data?.name || clubId;
    clubNameCache.set(clubId, name);
    return name;
  } catch {
    return clubId;
  }
}

async function searchPlayers(filters: SearchFilters): Promise<{ players: PlayerResult[]; totalFound: number }> {
  const competitionId = filters.countryPlayingIn || 'GB1';
  console.log('Searching competition:', competitionId);

  // Step 1: Get all club IDs from the league table
  const clubIds = await getClubIds(competitionId);
  console.log('Found clubs:', clubIds.length);
  if (clubIds.length === 0) {
    return { players: [], totalFound: 0 };
  }

  // Step 2: Get all player IDs from all clubs (parallel)
  const squadResults = await Promise.all(clubIds.map(getSquadPlayerIds));
  const allPlayerIds = [...new Set(squadResults.flat())];
  console.log('Total unique players:', allPlayerIds.length);

  // Step 3: Get player profiles (batched parallel)
  const profiles = await batchFetch(allPlayerIds, getPlayerProfile, 25);
  console.log('Fetched profiles:', profiles.length);

  // Step 4: Filter for unrepresented players
  let filtered = profiles.filter(p => p.agentStatus === 'no_agent' || p.agentStatus === 'family_agent');
  console.log('Unrepresented players:', filtered.length);

  // Apply additional filters
  if (filters.ageMin) {
    filtered = filtered.filter(p => p.age >= filters.ageMin!);
  }
  if (filters.ageMax) {
    filtered = filtered.filter(p => p.age <= filters.ageMax!);
  }
  if (filters.nationality) {
    const natId = parseInt(filters.nationality);
    filtered = filtered.filter(p => p.nationalityId === natId || p.secondNationalityId === natId);
  }
  if (filters.position) {
    const posNames = POSITION_FILTERS[filters.position.toLowerCase()];
    if (posNames) {
      filtered = filtered.filter(p => posNames.some(pn => p.position.toLowerCase().includes(pn.toLowerCase())));
    }
  }

  console.log('After filters:', filtered.length);

  // Get club names for filtered players
  const uniqueClubIds = [...new Set(filtered.map(p => p.clubId).filter(Boolean))];
  await Promise.all(uniqueClubIds.map(getClubName));

  // Convert to result format
  const players: PlayerResult[] = filtered.map(p => ({
    name: p.name,
    position: p.position,
    age: p.age.toString(),
    nationality: NATIONALITY_NAMES[p.nationalityId] || '',
    club: clubNameCache.get(p.clubId) || p.clubId,
    marketValue: p.marketValue,
    contractUntil: p.contractUntil,
    agentStatus: p.agentStatus,
    agentName: p.agentName,
    transfermarktUrl: p.relativeUrl ? `https://www.transfermarkt.co.uk${p.relativeUrl}` : '',
  }));

  return { players, totalFound: allPlayerIds.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters } = await req.json();
    const searchFilters: SearchFilters = filters || {};

    console.log('Received filters:', JSON.stringify(searchFilters));

    const { players, totalFound } = await searchPlayers(searchFilters);

    return new Response(
      JSON.stringify({
        success: true,
        players,
        totalFound,
        filteredCount: players.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
