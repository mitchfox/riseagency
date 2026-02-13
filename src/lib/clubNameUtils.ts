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

/**
 * Find a club's country from the country map using fuzzy matching.
 */
export const findClubCountry = (clubName: string | null, clubCountryMap: Record<string, string>): string | null => {
  if (!clubName) return null;
  const lower = clubName.toLowerCase().trim();
  if (clubCountryMap[lower]) return clubCountryMap[lower];

  const normalized = normalizeClubName(clubName);
  if (!normalized) return null;

  for (const [key, country] of Object.entries(clubCountryMap)) {
    const normKey = normalizeClubName(key);
    if (normKey === normalized) return country;
    if (normKey.includes(normalized) || normalized.includes(normKey)) return country;
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
  const normalized = normalizeClubName(clubName);
  if (!normalized) return null;
  for (const rating of ratings) {
    const normRating = normalizeClubName(rating.club_name);
    if (normRating === normalized || normRating.includes(normalized) || normalized.includes(normRating)) {
      return isYouth ? rating.academy_rating : rating.first_team_rating;
    }
  }
  return null;
};
