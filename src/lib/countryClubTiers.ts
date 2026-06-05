/**
 * Country and club tiering used by the recruitment fit score.
 *
 * The recruitment system used to treat every country and every R1 club as
 * equal — in reality the top five leagues and the European super-clubs sit a
 * clear notch above the rest. These constants give the scorer a way to
 * express that without forcing staff to hand-curate weights per target.
 *
 * All matching is case-insensitive and tolerates common aliases.
 */

export type CountryTier = 1 | 2 | 3;

// Tier 1 — the five biggest leagues.
const TIER_1_COUNTRIES = new Set([
  "england", "great britain", "uk", "united kingdom",
  "france",
  "spain", "españa",
  "germany", "deutschland",
  "italy", "italia",
]);

// Tier 2 — strong European producers immediately behind the top five.
const TIER_2_COUNTRIES = new Set([
  "portugal",
  "netherlands", "holland",
  "belgium",
  "norway",
  "czechia", "czech republic",
  "turkey", "türkiye", "turkiye",
]);

export const countryTier = (raw?: string | null): CountryTier => {
  if (!raw) return 3;
  const s = raw.toLowerCase().trim();
  if (TIER_1_COUNTRIES.has(s)) return 1;
  if (TIER_2_COUNTRIES.has(s)) return 2;
  return 3;
};

/**
 * Elite clubs — sit above the wider R1 bracket. Champions League regulars
 * with the biggest budgets where any player automatically deserves an
 * extra rating nudge. Staff can refine via club_ratings if needed.
 */
const ELITE_CLUBS = new Set([
  "real madrid",
  "barcelona", "fc barcelona",
  "bayern munich", "bayern münchen", "bayern muenchen", "fc bayern",
  "manchester city", "man city",
  "chelsea", "chelsea fc",
  "paris saint-germain", "paris saint germain", "psg",
  "liverpool", "liverpool fc",
  "manchester united", "man united", "man utd",
  "arsenal", "arsenal fc",
  "juventus",
  "inter milan", "internazionale",
  "ac milan",
  "atletico madrid", "atlético madrid",
  "borussia dortmund", "dortmund",
  "tottenham", "tottenham hotspur",
]);

export const isEliteClub = (raw?: string | null): boolean => {
  if (!raw) return false;
  return ELITE_CLUBS.has(raw.toLowerCase().trim());
};