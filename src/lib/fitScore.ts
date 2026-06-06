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

/**
 * Universal bonus weights applied after the ratio-based base score.
 * Stored in `recruitment_scoring_settings.bonus_weights` and editable
 * in the Fit-score settings UI. Per-target overrides may shadow these.
 */
export type BonusWeights = {
  national_team: number;
  star_of_team: number;
  previous_serious_injury: number; // typically negative
  top_club: number;
  parent_approval: number;
  agent_unrepresented: number;     // free / family agent => boost
  agent_top_agency: number;        // represented by big agency => deduction (negative)
};

export const DEFAULT_BONUS_WEIGHTS: BonusWeights = {
  national_team: 8,
  star_of_team: 6,
  previous_serious_injury: -10,
  top_club: 5,
  parent_approval: 5,
  agent_unrepresented: 8,
  agent_top_agency: -12,
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
  bonus_weights_override?: Partial<BonusWeights> | null;
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
  // Universal bonus toggles
  national_team?: boolean | null;
  star_of_team?: boolean | null;
  previous_serious_injury?: string | null;
  // Agent / representation
  agent_status?: string | null;   // 'unrepresented' | 'family' | 'represented' | 'top_agency' | 'unknown'
  agent_name?: string | null;
}

export interface ScoreBreakdown {
  total: number;
  reasons: string[];
  components: Record<string, number>;
  target_id: string | null;
  target_name: string | null;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

import { countryTier, isEliteClub } from "./countryClubTiers";

const TOP_AGENCIES = [
  "caa stellar", "caa base", "wasserman", "roof", "stellar group",
  "gestifute", "jorge mendes", "pini zahavi", "raiola", "one football agency",
  "icm stellar", "base soccer", "unique sports", "roc nation",
  "key sports", "p&p sport management", "epic sports", "epic management",
  "you first sports", "sem", "soccer entertainment management",
];

export const classifyAgentStatusFromName = (
  name?: string | null,
  fallback?: string | null,
): "unrepresented" | "family" | "represented" | "top_agency" | "unknown" => {
  const status = (fallback || "").toLowerCase().trim();
  if (status === "no_agent" || status === "unrepresented" || status === "free") return "unrepresented";
  if (status === "family_agent" || status === "family") return "family";
  const n = (name || "").toLowerCase().trim();
  if (!n) {
    if (status === "represented") return "represented";
    if (status === "top_agency") return "top_agency";
    return "unknown";
  }
  if (TOP_AGENCIES.some(a => n.includes(a))) return "top_agency";
  return "represented";
};

// Position adjacency — partial credit when player's position is close to the target's
const ADJACENCY: Record<string, string[]> = {
  GK: [],
  CB: ["LB", "RB", "CDM"],
  LB: ["CB", "LWB", "LM"],
  RB: ["CB", "RWB", "RM"],
  LWB: ["LB", "LM", "LW"],
  RWB: ["RB", "RM", "RW"],
  CDM: ["CM", "CB"],
  CM: ["CDM", "CAM", "LM", "RM"],
  CAM: ["CM", "CF", "LW", "RW"],
  LM: ["LW", "CM", "LB", "LWB"],
  RM: ["RW", "CM", "RB", "RWB"],
  LW: ["LM", "RW", "CAM", "CF", "LWB"],
  RW: ["RM", "LW", "CAM", "CF", "RWB"],
  CF: ["CAM", "LW", "RW"],
};
const isAdjacent = (pos: string, target: string) =>
  pos !== target && (ADJACENCY[pos]?.includes(target) || ADJACENCY[target]?.includes(pos) || false);

const normalisePosLocal = (raw?: string | null): string => {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    midfielder: "CM", "central midfielder": "CM", mid: "CM",
    "defensive midfielder": "CDM", "holding midfielder": "CDM",
    "attacking midfielder": "CAM",
    "centre back": "CB", "center back": "CB", defender: "CB", "centre-back": "CB",
    "left back": "LB", "right back": "RB",
    "left wing back": "LWB", "right wing back": "RWB",
    striker: "CF", forward: "CF", "centre forward": "CF", "center forward": "CF",
    "left wing": "LW", "right wing": "RW", winger: "LW",
    goalkeeper: "GK",
  };
  if (map[s]) return map[s];
  return raw.trim().toUpperCase();
};

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
  adjacencyFactor: number,
  positionWeights: Record<string, number> = {},
): { score: number; reasons: string[]; components: Record<string, number>; maxComponents: Record<string, number> } => {
  const components: Record<string, number> = {};
  // Position weight may be overridden per-position via the settings map.
  // If a player matches a target position, that role's specific weight (if set > 0)
  // is used as both the cap and the awarded value. Otherwise fall back to weights.position.
  const posKey = normalisePosLocal(player.position);
  const posOverride = posKey && positionWeights && typeof positionWeights[posKey] === "number" && positionWeights[posKey] > 0
    ? positionWeights[posKey]
    : null;
  const positionPoints = posOverride ?? weights.position;
  const maxComponents: Record<string, number> = {
    position: positionPoints,
    age: weights.age,
    nationality: weights.nationality,
    club_country: weights.club_country,
    club_rating: weights.club_rating,
    outreach: weights.outreach,
  };
  const reasons: string[] = [];

  // Position match
  const pos = normalisePosLocal(player.position);
  if (target.positions.length > 0) {
    const targetPositions = target.positions.map(p => normalisePosLocal(p));
    if (pos && targetPositions.includes(pos)) {
      components.position = positionPoints;
      reasons.push(`+${positionPoints} position match (${pos})`);
    } else if (pos && targetPositions.some(tp => isAdjacent(pos, tp))) {
      const partial = Math.round(positionPoints * Math.max(0, Math.min(1, adjacencyFactor)));
      components.position = partial;
      reasons.push(`+${partial} adjacent position (${pos})`);
    } else {
      components.position = 0;
    }
  } else {
    components.position = positionPoints * 0.5; // no constraint = neutral
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
      // Country still fits the target, but tier it: tier 1 = full, tier 2 = 80%, tier 3 = 60%.
      const tier = countryTier(cc);
      const tierFactor = tier === 1 ? 1 : tier === 2 ? 0.8 : 0.6;
      const awarded = Math.round(weights.club_country * tierFactor);
      components.club_country = awarded;
      const label = tier === 1 ? "tier-1 country" : tier === 2 ? "tier-2 country" : "country in target";
      reasons.push(`+${awarded} ${label}`);
    } else {
      components.club_country = 0;
    }
  } else {
    // No country constraint — still reward tier-1/2 countries proportionally.
    const tier = countryTier(cc);
    const factor = tier === 1 ? 0.9 : tier === 2 ? 0.7 : 0.4;
    components.club_country = Math.round(weights.club_country * factor);
  }

  // Club rating (R1 highest → numerically lowest)
  const playerRating = ratingValue(player.club_first_team_rating);
  const minR = ratingValue(target.min_club_rating);
  const maxR = ratingValue(target.max_club_rating);
  const clubName = player.club || player.current_club || null;
  const elite = isEliteClub(clubName);
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
  // Elite super-club nudge: never breaks the per-component cap, but pushes
  // borderline R1s up so Real Madrid scores above a generic R1 side.
  if (elite) {
    const boosted = Math.min(weights.club_rating, Math.round((components.club_rating || 0) + weights.club_rating * 0.15));
    if (boosted > (components.club_rating || 0)) {
      const delta = boosted - (components.club_rating || 0);
      components.club_rating = boosted;
      reasons.push(`+${delta} elite super-club`);
    }
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
  return { score: subtotal, reasons, components, maxComponents };
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
  bonusWeights: BonusWeights = DEFAULT_BONUS_WEIGHTS,
  adjacencyFactor = 0.5,
  leagueStrengthWeight = 0,
  positionWeights: Record<string, number> = {},
): ScoreBreakdown => {
  const candidates = targets.filter(t => t.active && (scope ? t.scope === scope || t.scope === "both" : true));
  if (candidates.length === 0) {
    return { total: 0, reasons: ["No active targets configured"], components: {}, target_id: null, target_name: null };
  }
  let best: { target: RecruitmentTargetLite; res: ReturnType<typeof scoreAgainstTarget>; effectiveWeights: ScoringWeights } | null = null;
  for (const t of candidates) {
    const effectiveWeights: ScoringWeights = { ...weights, ...(t.weights_override || {}) } as ScoringWeights;
    const res = scoreAgainstTarget(player, t, effectiveWeights, ageBand, adjacencyFactor, positionWeights);
    if (!best || res.score > best.res.score) best = { target: t, res, effectiveWeights };
  }
  if (!best) return { total: 0, reasons: [], components: {}, target_id: null, target_name: null };

  // ---- Ratio-based base score (0..85) ----
  // Sum of achieved component points / sum of max component points × 85
  // Reserves 15 headroom for AI nudge + bonuses so a perfect base still leaves
  // room for upside but is always capped at 100 below.
  const maxSum = Object.values(best.res.maxComponents).reduce((s, v) => s + v, 0) || 1;
  const achievedSum = Object.values(best.res.components).reduce((s, v) => s + v, 0);
  const baseScaled = (achievedSum / maxSum) * 85;

  // AI nudge — scaled the same ratio way using its dedicated weight.
  const aiAllowed = best.target.ai_nudge_enabled !== false;
  const aiRaw = aiAllowed ? clamp(player.ai_bonus ?? 0, 0, best.effectiveWeights.ai_nudge) : 0;
  const aiScaled = best.effectiveWeights.ai_nudge > 0
    ? (aiRaw / best.effectiveWeights.ai_nudge) * 10
    : 0;

  // Universal bonuses — applied additively, per-target override merges over global.
  const bonusEff: BonusWeights = { ...bonusWeights, ...(best.target.bonus_weights_override || {}) };
  const bonuses: Array<{ key: string; value: number; reason: string }> = [];
  if (player.national_team) bonuses.push({ key: "national_team", value: bonusEff.national_team, reason: `${signed(bonusEff.national_team)} national team player` });
  if (player.star_of_team) bonuses.push({ key: "star_of_team", value: bonusEff.star_of_team, reason: `${signed(bonusEff.star_of_team)} star of the team` });
  if (player.previous_serious_injury && player.previous_serious_injury.trim().length > 0)
    bonuses.push({ key: "previous_serious_injury", value: bonusEff.previous_serious_injury, reason: `${signed(bonusEff.previous_serious_injury)} previous serious injury (${player.previous_serious_injury.trim()})` });
  const playerRatingNum = ratingValue(player.club_first_team_rating);
  if (playerRatingNum === 1) bonuses.push({ key: "top_club", value: bonusEff.top_club, reason: `${signed(bonusEff.top_club)} top-tier club (R1)` });
  if (player.parent_approval) bonuses.push({ key: "parent_approval", value: bonusEff.parent_approval, reason: `${signed(bonusEff.parent_approval)} parent approval` });

  const bonusSum = bonuses.reduce((s, b) => s + b.value, 0);

  // League strength multiplier — extra points based on country tier of the player's club country.
  let leagueStrengthBonus = 0;
  const playerCountry = player.club_country || "";
  if (leagueStrengthWeight > 0 && playerCountry) {
    const tier = countryTier(playerCountry);
    const factor = tier === 1 ? 1 : tier === 2 ? 0.6 : 0;
    leagueStrengthBonus = Math.round(leagueStrengthWeight * factor);
  }

  // Agent / representation
  const agentStatus = classifyAgentStatusFromName(player.agent_name, player.agent_status);
  let agentBonus = 0;
  let agentReason = "";
  if (agentStatus === "unrepresented" || agentStatus === "family") {
    agentBonus = bonusEff.agent_unrepresented;
    if (agentBonus !== 0) agentReason = `${signed(agentBonus)} ${agentStatus === "family" ? "family agent" : "unrepresented"}`;
  } else if (agentStatus === "top_agency") {
    agentBonus = bonusEff.agent_top_agency;
    if (agentBonus !== 0) agentReason = `${signed(agentBonus)} top-tier agency (${player.agent_name || ""})`;
  }

  const total = clamp(Math.round(baseScaled + aiScaled + bonusSum + leagueStrengthBonus + agentBonus), 0, 100);

  const reasons = [...best.res.reasons];
  if (aiScaled > 0) reasons.push(`+${Math.round(aiScaled)} AI nudge`);
  for (const b of bonuses) reasons.push(b.reason);
  if (leagueStrengthBonus > 0) reasons.push(`+${leagueStrengthBonus} league strength (${playerCountry})`);
  if (agentReason) reasons.push(agentReason);

  return {
    total,
    reasons,
    components: {
      ...best.res.components,
      ai_nudge: Math.round(aiScaled),
      ...Object.fromEntries(bonuses.map(b => [b.key, b.value])),
      league_strength: leagueStrengthBonus,
      agent: agentBonus,
    },
    target_id: best.target.id,
    target_name: best.target.name,
  };
};

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);