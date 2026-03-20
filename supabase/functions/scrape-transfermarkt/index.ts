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
  birthdayToday?: boolean;
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
  isLoan: boolean;
  dateOfBirth?: string;
}

const TM_API = 'https://tmapi-alpha.transfermarkt.technology';

// Map UI league codes to actual TM API competition IDs where they differ
const COMPETITION_ALIASES: Record<string, string> = {
  'CZ1': 'TS1C',   // Czech First League
  'CZ2': 'TS2C',
  'TR2': 'TUR2',
  'TR3': 'TUR3',
  'KR1': 'KR1',
  'KR2': 'KR2',
  'SER1': 'SER1',
  'SER2': 'SER2',
  'BUL1': 'BU1',
  'UNG1': 'UNG1',
  'UNG2': 'UNG2',
  'SLOWK1': 'SLK1',
  'BOS1': 'BOS1',
  'MNE1': 'MNE1',
  'MKD1': 'MAZ1',
  'ALB1': 'ALB1',
  'MOL1': 'MOL1',
  'LIT1': 'LI1',
  'LET1': 'LET1',
  'EST1': 'EST1',
  'BLR1': 'WER1',
  'WAL1': 'WAL1',
  'NI1': 'NIR1',
  'IR1': 'IR1',
  'FAR1': 'FAR1',
  'GIB1': 'GIB1',
  'SMR1': 'SMR1',
  'KOS1': 'KOS1',
  'AND1': 'AND1',
  'GEO1': 'GEO1',
  'KAZ1': 'KAS1',
  'AZE1': 'AZ1',
  'ISR1': 'ISR1',
  'CYP1': 'ZYP1',
};

function resolveCompetitionId(code: string): string {
  return COMPETITION_ALIASES[code] || code;
}

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
  52: 'Georgia', 11: 'Azerbaijan', 4: 'Albania', 79: 'Malta',
  1: 'Afghanistan', 82: 'Moldova', 83: 'North Macedonia',
};

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
  try {
    const resolved = resolveCompetitionId(competitionId);
    const data = await fetchJSON(`${TM_API}/competition/${resolved}/table?seasonId=2025`);
    if (!data.success || !data.data?.tables?.[0]?.clubs) {
      console.log('No table data for competition:', resolved);
      return [];
    }
    return data.data.tables[0].clubs.map((c: any) => c.clubId);
  } catch (e: any) {
    // Gracefully handle 404s and other errors — don't crash the whole search
    console.error(`getClubIds failed for ${competitionId}:`, e.message || e);
    return [];
  }
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
  dateOfBirth: string;
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
  isLoan: boolean;
}

async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  try {
    const data = await fetchJSON(`${TM_API}/player/${playerId}`);
    if (!data.success || !data.data) return null;

    const p = data.data;
    const attrs = p.attributes || {};
    const agency = attrs.consultantAgency;
    const agencyId = attrs.consultantAgencyId;

    let agentStatus: 'no_agent' | 'family_agent' | 'unknown' = 'unknown';
    let agentName = '';

    if (!agencyId || agencyId === 0) {
      agentStatus = 'no_agent';
    } else if (agency?.isSpecialConsultantAgency) {
      agentStatus = 'family_agent';
      agentName = agency.name || '';
    } else {
      agentStatus = 'unknown';
      agentName = agency?.name || '';
    }

    let clubName = '';
    let isLoan = false;
    const currentClub = p.clubAssignments?.find((a: any) => a.type === 'current');
    if (currentClub) {
      clubName = currentClub.clubId;
      if (currentClub.isLoan === true || currentClub.transferType === 'loan' || currentClub.loanFrom) {
        isLoan = true;
      }
    }

    let marketValue = '';
    if (p.marketValueDetails?.current?.compact) {
      const mv = p.marketValueDetails.current.compact;
      marketValue = `${mv.prefix}${mv.content}${mv.suffix}`;
    }

    let contractUntil = '';
    if (attrs.contractUntil) {
      const d = new Date(attrs.contractUntil);
      contractUntil = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    // Extract date of birth — try multiple paths
    let dateOfBirth = '';
    if (p.lifeDates?.dateOfBirth) {
      dateOfBirth = p.lifeDates.dateOfBirth;
    } else if (attrs.dateOfBirth) {
      dateOfBirth = attrs.dateOfBirth;
    } else if (p.dateOfBirth) {
      dateOfBirth = p.dateOfBirth;
    }

    // Normalise DOB to YYYY-MM-DD if it contains a T (timestamp)
    if (dateOfBirth && dateOfBirth.includes('T')) {
      dateOfBirth = dateOfBirth.split('T')[0];
    }

    return {
      id: p.id,
      name: p.name || '',
      age: p.lifeDates?.age || 0,
      dateOfBirth,
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
      isLoan,
    };
  } catch (e) {
    console.error(`Failed to get player ${playerId}:`, e);
    return null;
  }
}

async function batchFetch<T>(items: string[], fn: (id: string) => Promise<T | null>, batchSize = 10): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    for (const r of batchResults) {
      if (r) results.push(r);
    }
    // Small delay between batches to reduce http2 connection errors
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return results;
}

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

/**
 * Check if a DOB string matches today's month and day.
 * Parses the string directly to avoid any timezone drift.
 */
function isBirthdayToday(dob: string): boolean {
  if (!dob) return false;

  // Strip any timestamp portion
  const dateOnly = dob.includes('T') ? dob.split('T')[0] : dob;
  const parts = dateOnly.split('-');
  if (parts.length < 3) return false;

  const dobMonth = parseInt(parts[1], 10);
  const dobDay = parseInt(parts[2], 10);

  if (isNaN(dobMonth) || isNaN(dobDay)) return false;

  // Use UTC to be consistent with server time
  const now = new Date();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay = now.getUTCDate();

  console.log(`Birthday check: DOB=${dob} => month=${dobMonth} day=${dobDay}, today => month=${todayMonth} day=${todayDay}, match=${dobMonth === todayMonth && dobDay === todayDay}`);

  return dobMonth === todayMonth && dobDay === todayDay;
}

async function searchPlayers(filters: SearchFilters): Promise<{ players: PlayerResult[]; totalFound: number; processLog: string[] }> {
  const processLog: string[] = [];
  const log = (msg: string) => { console.log(msg); processLog.push(msg); };

  const competitionId = filters.countryPlayingIn || 'GB1';
  log(`Searching competition: ${competitionId} (resolved: ${resolveCompetitionId(competitionId)})`);

  const clubIds = await getClubIds(competitionId);
  log(`Found ${clubIds.length} clubs`);
  if (clubIds.length === 0) {
    log('No clubs found - returning empty');
    return { players: [], totalFound: 0, processLog };
  }

  const squadResults = await Promise.all(clubIds.map(getSquadPlayerIds));
  const allPlayerIds = [...new Set(squadResults.flat())];
  log(`Total unique players: ${allPlayerIds.length}`);

  const profiles = await batchFetch(allPlayerIds, getPlayerProfile, 10);
  log(`Fetched ${profiles.length} profiles`);

  let filtered = profiles.filter(p => p.agentStatus === 'no_agent' || p.agentStatus === 'family_agent');
  log(`Unrepresented players: ${filtered.length}`);

  // Birthday today filter
  if (filters.birthdayToday) {
    log(`Applying birthday filter. Sample DOBs: ${filtered.slice(0, 5).map(p => `${p.name}: ${p.dateOfBirth}`).join(', ')}`);
    filtered = filtered.filter(p => isBirthdayToday(p.dateOfBirth));
    log(`Birthday today matches: ${filtered.length}`);
  }

  if (filters.ageMin) {
    filtered = filtered.filter(p => p.age >= filters.ageMin!);
    log(`After age min (${filters.ageMin}): ${filtered.length}`);
  }
  if (filters.ageMax) {
    filtered = filtered.filter(p => p.age <= filters.ageMax!);
    log(`After age max (${filters.ageMax}): ${filtered.length}`);
  }
  if (filters.nationality) {
    const natId = parseInt(filters.nationality);
    filtered = filtered.filter(p => p.nationalityId === natId || p.secondNationalityId === natId);
    log(`After nationality filter: ${filtered.length}`);
  }
  if (filters.position) {
    const posNames = POSITION_FILTERS[filters.position.toLowerCase()];
    if (posNames) {
      filtered = filtered.filter(p => posNames.some(pn => p.position.toLowerCase().includes(pn.toLowerCase())));
    }
    log(`After position filter: ${filtered.length}`);
  }

  log(`Final filtered count: ${filtered.length}`);

  const uniqueClubIds = [...new Set(filtered.map(p => p.clubId).filter(Boolean))];
  await Promise.all(uniqueClubIds.map(getClubName));

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
    isLoan: p.isLoan,
    dateOfBirth: p.dateOfBirth,
  }));

  return { players, totalFound: allPlayerIds.length, processLog };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters } = await req.json();
    const searchFilters: SearchFilters = filters || {};

    console.log('Received filters:', JSON.stringify(searchFilters));

    const { players, totalFound, processLog } = await searchPlayers(searchFilters);

    return new Response(
      JSON.stringify({
        success: true,
        players,
        totalFound,
        filteredCount: players.length,
        processLog,
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
