/**
 * Normalise a club name by stripping accents, lowercasing, and removing special chars.
 * This handles Fenerbahçe -> fenerbahce, Vitória -> vitoria, Saint-Étienne -> saint etienne, etc.
 */
export const normalizeClubName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[''`\-]/g, ' ')        // replace apostrophes/hyphens with space
    .replace(/[^a-z0-9 ]/g, '')      // remove remaining special chars
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim();
};

const CLUB_ALIASES: Record<string, string> = {
  psg: 'paris saint germain',
  'paris sg': 'paris saint germain',
  'paris saint germain fc': 'paris saint germain',
  'paris saint-germain': 'paris saint germain',
};

export const canonicalClubName = (name: string | null | undefined): string => {
  const normalised = normalizeClubName(name || '');
  return CLUB_ALIASES[normalised] || normalised;
};

// Common youth team suffixes
const YOUTH_SUFFIXES = ['u19', 'u21', 'u23', 'u18', 'u17', 'u16', 'u15', 'b team', 'b', 'ii', 'reserves', 'youth', 'academy', 'juniors', 'jong', 'primavera', 'juvenil', 'castilla'];

/**
 * Extract the parent club name from a youth/reserve team name.
 */
const getParentName = (norm: string): string | null => {
  for (const suffix of YOUTH_SUFFIXES) {
    if (norm.endsWith(` ${suffix}`)) {
      return norm.slice(0, norm.length - suffix.length - 1).trim();
    }
  }
  return null;
};

/**
 * Find a club's country from the country map using fuzzy matching.
 * Also checks youth team parent clubs.
 */
export const findClubCountry = (clubName: string | null, clubCountryMap: Record<string, string>): string | null => {
  if (!clubName) return null;
  const lower = clubName.toLowerCase().trim();
  if (clubCountryMap[lower]) return clubCountryMap[lower];

  const normalized = canonicalClubName(clubName);
  if (!normalized) return null;

  // Check normalised key in map
  if (clubCountryMap[normalized]) return clubCountryMap[normalized];

  // Fuzzy match
  for (const [key, country] of Object.entries(clubCountryMap)) {
    const normKey = normalizeClubName(key);
    if (normKey === normalized) return country;
    if (normKey.length > 3 && normalized.length > 3 && (normKey.includes(normalized) || normalized.includes(normKey))) return country;
  }

  // Try parent club name for youth teams
  const parentName = getParentName(normalized);
  if (parentName) {
    for (const [key, country] of Object.entries(clubCountryMap)) {
      const normKey = normalizeClubName(key);
      if (normKey === parentName) return country;
      if (normKey.length > 3 && parentName.length > 3 && (normKey.includes(parentName) || parentName.includes(normKey))) return country;
    }
  }

  return null;
};

/**
 * Find a club's rating from the ratings list using fuzzy matching.
 */
export const findClubRating = (
  clubName: string | null,
  ratings: { club_name: string; first_team_rating: string; academy_rating: string }[],
  isYouth: boolean
): string | null => {
  if (!clubName || ratings.length === 0) return null;
  const normalized = canonicalClubName(clubName);
  if (!normalized) return null;
  const rank = (rating: string | null | undefined) => {
    const match = rating?.toUpperCase().match(/^R(\d)$/);
    return match ? Number(match[1]) : 99;
  };
  let best: string | null = null;
  for (const rating of ratings) {
    const normRating = canonicalClubName(rating.club_name);
    if (normRating === normalized || normRating.includes(normalized) || normalized.includes(normRating)) {
      const value = isYouth ? rating.academy_rating : rating.first_team_rating;
      if (value && (!best || rank(value) < rank(best))) best = value;
    }
  }
  return best;
};
