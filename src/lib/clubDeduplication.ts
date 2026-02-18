import { normalizeClubName } from './clubNameUtils';

interface ClubRating {
  id: string;
  club_name: string;
  country: string;
  first_team_rating: string;
  academy_rating: string;
}

// Common youth team suffixes that indicate a team belongs to a parent club
const YOUTH_SUFFIXES = [
  'u19', 'u21', 'u23', 'u18', 'u17', 'u16', 'u15',
  'b team', 'b', 'ii', 'reserves', 'youth', 'academy',
  'juniors', 'jong', 'primavera', 'juvenil', 'castilla',
  'atletico b', 'b'
];

/**
 * Extract the parent club name from a youth/reserve team name.
 * e.g. "FC Barcelona U19" -> "fc barcelona"
 */
export const getParentClubName = (clubName: string): string | null => {
  const norm = normalizeClubName(clubName);
  if (!norm) return null;
  
  for (const suffix of YOUTH_SUFFIXES) {
    if (norm.endsWith(` ${suffix}`)) {
      return norm.slice(0, norm.length - suffix.length - 1).trim();
    }
  }
  return null;
};

/**
 * Find duplicate club groups - clubs that normalize to the same or very similar names.
 * Returns groups of IDs that should be merged.
 */
export const findDuplicateClubs = (clubs: ClubRating[]): Map<string, ClubRating[]> => {
  const normMap = new Map<string, ClubRating[]>();
  
  for (const club of clubs) {
    const norm = normalizeClubName(club.club_name);
    if (!norm) continue;
    
    // Check if this normalised name matches an existing group
    let matched = false;
    for (const [key, group] of normMap) {
      if (key === norm || (key.length > 3 && norm.length > 3 && (key.includes(norm) || norm.includes(key)))) {
        group.push(club);
        matched = true;
        break;
      }
    }
    if (!matched) {
      normMap.set(norm, [club]);
    }
  }
  
  // Only return groups with duplicates
  const dupes = new Map<string, ClubRating[]>();
  for (const [key, group] of normMap) {
    if (group.length > 1) {
      dupes.set(key, group);
    }
  }
  return dupes;
};

/**
 * For a youth team, find the parent club's country from existing ratings.
 */
export const inferYouthTeamCountry = (clubName: string, allClubs: ClubRating[]): string | null => {
  const parentNorm = getParentClubName(clubName);
  if (!parentNorm) return null;
  
  for (const club of allClubs) {
    const norm = normalizeClubName(club.club_name);
    if (norm === parentNorm && club.country && club.country !== 'Unknown') {
      return club.country;
    }
  }
  
  // Fuzzy match
  for (const club of allClubs) {
    const norm = normalizeClubName(club.club_name);
    if (norm.length > 3 && parentNorm.length > 3 && 
        (norm.includes(parentNorm) || parentNorm.includes(norm)) && 
        club.country && club.country !== 'Unknown') {
      return club.country;
    }
  }
  
  return null;
};

/**
 * For a youth team, inherit ratings from its parent club.
 */
export const inferYouthTeamRatings = (clubName: string, allClubs: ClubRating[]): { first_team_rating: string; academy_rating: string } | null => {
  const parentNorm = getParentClubName(clubName);
  if (!parentNorm) return null;
  
  for (const club of allClubs) {
    const norm = normalizeClubName(club.club_name);
    if ((norm === parentNorm || (norm.length > 3 && parentNorm.length > 3 && (norm.includes(parentNorm) || parentNorm.includes(norm))))) {
      return { first_team_rating: club.first_team_rating, academy_rating: club.academy_rating };
    }
  }
  return null;
};
