/**
 * Normalise free-form football position strings to the project's
 * standard abbreviations (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LW, RW, CF).
 * Used for display + scoring so legacy "Midfielder"/"Striker" rows behave correctly.
 */

const MAP: Record<string, string> = {
  // Goalkeeper
  goalkeeper: 'GK', keeper: 'GK', gk: 'GK',

  // Defenders
  defender: 'CB', 'centre back': 'CB', 'centre-back': 'CB', 'central defender': 'CB',
  'center back': 'CB', 'center-back': 'CB', cb: 'CB',
  'left back': 'LB', 'left-back': 'LB', 'left fullback': 'LB', 'left full-back': 'LB', lb: 'LB',
  'right back': 'RB', 'right-back': 'RB', 'right fullback': 'RB', 'right full-back': 'RB', rb: 'RB',
  fullback: 'RB', 'full back': 'RB', 'full-back': 'RB',
  'left wing back': 'LWB', 'left wing-back': 'LWB', lwb: 'LWB',
  'right wing back': 'RWB', 'right wing-back': 'RWB', rwb: 'RWB',

  // Midfielders
  midfielder: 'CM', 'central midfielder': 'CM', 'central midfield': 'CM',
  'centre midfielder': 'CM', 'centre midfield': 'CM',
  mid: 'CM', cm: 'CM',
  'defensive midfielder': 'CDM', 'defensive midfield': 'CDM',
  'holding midfielder': 'CDM', 'holding midfield': 'CDM',
  'holding mid': 'CDM', cdm: 'CDM', dm: 'CDM',
  'attacking midfielder': 'CAM', 'attacking midfield': 'CAM',
  'attacking mid': 'CAM', cam: 'CAM', am: 'CAM',
  'right midfielder': 'RM', 'right midfield': 'RM', rm: 'RM',
  'left midfielder': 'LM', 'left midfield': 'LM', lm: 'LM',

  // Forwards
  striker: 'CF', forward: 'CF', attacker: 'CF', attack: 'CF',
  'centre forward': 'CF', 'centre-forward': 'CF',
  'center forward': 'CF', 'center-forward': 'CF', cf: 'CF', st: 'CF',
  'left wing': 'LW', 'left winger': 'LW', 'left-winger': 'LW', 'left-wing': 'LW', lw: 'LW',
  'right wing': 'RW', 'right winger': 'RW', 'right-winger': 'RW', 'right-wing': 'RW', rw: 'RW',
  winger: 'LW',
};

const VALID = new Set(['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','RM','LM','LW','RW','CF']);

// Strip parenthetical clarifiers and zero-width punctuation, normalise dashes.
const cleanToken = (raw: string) =>
  raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-') // unicode dashes -> '-'
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const lookup = (token: string): string | null => {
  const cleaned = cleanToken(token);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (MAP[lower]) return MAP[lower];
  const upper = cleaned.toUpperCase();
  if (VALID.has(upper)) return upper;
  if (upper === 'ST') return 'CF';
  return null;
};

export const normalisePosition = (raw?: string | null): string => {
  if (!raw) return '';
  const cleaned = cleanToken(raw);
  if (!cleaned) return '';
  // Whole-string match first (covers "Centre-Back", "Attacking Midfield", etc.).
  const whole = lookup(cleaned);
  if (whole) return whole;
  // Split combined values like "Centre-Back / central defender" or
  // "Forward / Right winger" — return the first segment we can map.
  const parts = cleaned.split(/\s*[\/,]\s*|\s+\/\s+/);
  for (const p of parts) {
    const hit = lookup(p);
    if (hit) return hit;
  }
  return cleaned;
};