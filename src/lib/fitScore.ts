/**
 * Deterministic recruitment fit score (0-100).
 * Pure functions — safe to run anywhere (client or edge).
 * Optional `aiBonus` (0-20) is added on top when AI nudge has been computed.
 */

export type ScoringWeights = {
  position: number;
  age: number;
  nationality: number;
  club_country: number;
  club_rating: number;
  outreach: number;
  ai_nudge: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  position: 20,
  age: 15,
  nationality: 10,
  club_country: 5,
  club_rating: 15,
  outreach: 15,
  ai_nudge: 20,
};

export interface RecruitmentTargetLite {
  id: string;
  name: string;
  scope: "youth" | "pro" | "both";
  positions: string[];
  min_age: number | null;
  max_age: number | null;
  nationalities: string[];
  countries_of_club: string[];
  min_club_rating: string | null; // R1/R2/R3 — R1 highest
  max_club_rating: string | null;
  priority: number;
  active: boolean;
  weights_override?: Partial<ScoringWeights> | null;
  ai_nudge_enabled?: boolean | null;
}

export interface PlayerLike {
  position?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  club?: string | null;
  current_club?: string | null;
  club_country?: string | null;
  club_first_team_rating?: string | null;
  // Outreach signals
  messaged?: boolean | null;
  response_received?: boolean | null;
  response_status?: string | null;
  parent_approval?: boolean | null;
  last_contact_at?: string | null;
  // AI nudge cached on row
  ai_bonus?: number | null;
}

export interface ScoreBreakdown {
  total: number;
  reasons: string[];
  components: Record<string, number>;
  target_id: string | null;
  target_name: string | null;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const computeAge = (p: PlayerLike): number | null => {
  if (typeof p.age === "number") return p.age;
  if (p.date_of_birth) {
    const dob = new Date(p.date_of_birth);
    if (!isNaN(dob.getTime())) {
      const diff = Date.now() - dob.getTime();
      return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    }
  }
  return null;
};

const ratingValue = (r?: string | null): number | null => {
  if (!r) return null;
  const m = r.toUpperCase().match(/^R(\d)$/);
  return m ? parseInt(m[1], 10) : null;
};

/**
 * Score a player vs a single target.
 * Returns 0-80 (without AI nudge). Caller adds aiBonus if present.
 */
const scoreAgainstTarget = (
  player: PlayerLike,
  target: RecruitmentTargetLite,
  weights: ScoringWeights,
  ageBand: number,
): { score: number; reasons: string[]; components: Record<string, number> } => {
  const components: Record<string, number> = {};
  const reasons: string[] = [];

  // Position match
  const pos = (player.position || "").toUpperCase().trim();
  if (target.positions.length > 0) {
    if (pos && target.positions.map(p => p.toUpperCase()).includes(pos)) {
      components.position = weights.position;
      reasons.push(`+${weights.position} position match (${pos})`);
    } else {
      components.position = 0;
    }
  } else {
    components.position = weights.position * 0.5; // no constraint = neutral
  }

  // Age fit (peak at midpoint, falls off across band)
  const age = computeAge(player);
  if (age !== null && (target.min_age !== null || target.max_age !== null)) {
    const lo = target.min_age ?? age;
    const hi = target.max_age ?? age;
    if (age >= lo && age <= hi) {
      components.age = weights.age;
      reasons.push(`+${weights.age} age in target band`);
    } else {
      const dist = age < lo ? lo - age : age - hi;
      if (dist <= ageBand) {
        const v = Math.round(weights.age * (1 - dist / (ageBand + 1)));
        components.age = v;
        reasons.push(`+${v} age within ${ageBand}y of band`);
      } else {
        components.age = 0;
      }
    }
  } else {
    components.age = age !== null ? weights.age * 0.5 : 0;
  }

  // Nationality
  const nat = (player.nationality || "").toLowerCase().trim();
  if (target.nationalities.length > 0) {
    if (nat && target.nationalities.map(n => n.toLowerCase()).includes(nat)) {
      components.nationality = weights.nationality;
      reasons.push(`+${weights.nationality} nationality fit`);
    } else {
      components.nationality = 0;
    }
  } else {
    components.nationality = weights.nationality * 0.5;
  }

  // Club country
  const cc = (player.club_country || "").toLowerCase().trim();
  if (target.countries_of_club.length > 0) {
    if (cc && target.countries_of_club.map(n => n.toLowerCase()).includes(cc)) {
      components.club_country = weights.club_country;
      reasons.push(`+${weights.club_country} club country fit`);
    } else {
      components.club_country = 0;
    }
  } else {
    components.club_country = weights.club_country * 0.5;
  }

  // Club rating (R1 highest → numerically lowest)
  const playerRating = ratingValue(player.club_first_team_rating);
  const minR = ratingValue(target.min_club_rating);
  const maxR = ratingValue(target.max_club_rating);
  if (playerRating !== null && (minR !== null || maxR !== null)) {
    const lo = maxR ?? playerRating; // higher tier = lower number, so "min rating" in UI = best, becomes upper bound on number
    const hi = minR ?? playerRating;
    if (playerRating >= lo && playerRating <= hi) {
      components.club_rating = weights.club_rating;
      reasons.push(`+${weights.club_rating} club rating (R${playerRating})`);
    } else {
      components.club_rating = Math.round(weights.club_rating * 0.3);
    }
  } else {
    components.club_rating = playerRating !== null ? weights.club_rating * 0.5 : 0;
  }

  // Outreach signal
  let outreach = 0;
  if (player.response_status === "signed") outreach = weights.outreach;
  else if (player.response_status === "interested") outreach = Math.round(weights.outreach * 0.9);
  else if (player.response_status === "replied" || player.response_received) outreach = Math.round(weights.outreach * 0.7);
  else if (player.messaged) outreach = Math.round(weights.outreach * 0.3);
  if (player.parent_approval) outreach = Math.min(weights.outreach, outreach + Math.round(weights.outreach * 0.2));
  if (player.response_status === "not_interested" || player.response_status === "lost") outreach = 0;
  components.outreach = outreach;
  if (outreach > 0) reasons.push(`+${outreach} outreach traction`);

  const subtotal = Object.values(components).reduce((s, v) => s + v, 0);
  return { score: subtotal, reasons, components };
};

/**
 * Compute the best-fit score for a player across all active targets.
 * The "winning" target becomes the player's primary target.
 */
export const computeFitScore = (
  player: PlayerLike,
  targets: RecruitmentTargetLite[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  ageBand = 2,
  scope?: "youth" | "pro",
): ScoreBreakdown => {
  const candidates = targets.filter(t => t.active && (scope ? t.scope === scope || t.scope === "both" : true));
  if (candidates.length === 0) {
    return { total: 0, reasons: ["No active targets configured"], components: {}, target_id: null, target_name: null };
  }
  let best: { target: RecruitmentTargetLite; res: ReturnType<typeof scoreAgainstTarget>; effectiveWeights: ScoringWeights } | null = null;
  for (const t of candidates) {
    const effectiveWeights: ScoringWeights = { ...weights, ...(t.weights_override || {}) } as ScoringWeights;
    const res = scoreAgainstTarget(player, t, effectiveWeights, ageBand);
    if (!best || res.score > best.res.score) best = { target: t, res, effectiveWeights };
  }
  if (!best) return { total: 0, reasons: [], components: {}, target_id: null, target_name: null };

  // AI nudge (0..weights.ai_nudge) added on top if pre-computed and not disabled for this target
  const aiAllowed = best.target.ai_nudge_enabled !== false;
  const aiBonus = aiAllowed ? clamp(player.ai_bonus ?? 0, 0, best.effectiveWeights.ai_nudge) : 0;
  const total = clamp(Math.round(best.res.score + aiBonus), 0, 100);

  const reasons = [...best.res.reasons];
  if (aiBonus > 0) reasons.push(`+${aiBonus} AI nudge`);

  return {
    total,
    reasons,
    components: { ...best.res.components, ai_nudge: aiBonus },
    target_id: best.target.id,
    target_name: best.target.name,
  };
};