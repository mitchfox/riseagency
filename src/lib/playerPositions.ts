// Canonical position abbreviations used across the player database.
// The player database filter, edit form and AI parser all use this list —
// storing anything outside these codes means the row won't be reachable via
// the position filter, so keep everything normalised on the way in.

export const PLAYER_POSITIONS = [
  'GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'CF',
] as const;

export type PlayerPosition = typeof PLAYER_POSITIONS[number];

const clean = (raw: string) =>
  raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[\/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Map every free-text variant we've seen in the DB / from Transfermarkt to
// one of the 10 canonical codes. Keys are lowercase and punctuation-stripped.
const MAP: Record<string, PlayerPosition> = {
  // GK
  gk: 'GK', goalkeeper: 'GK', keeper: 'GK',

  // CB
  cb: 'CB', 'centre-back': 'CB', 'centre back': 'CB', 'center back': 'CB',
  'center-back': 'CB', 'central defender': 'CB', defender: 'CB',
  'crntre-back': 'CB', lcb: 'CB', rcb: 'CB',
  'centre-back defender': 'CB', 'centre-back defensive midfielder': 'CB',

  // RB
  rb: 'RB', 'right-back': 'RB', 'right back': 'RB',
  'right-back defender': 'RB', 'right back defender': 'RB',

  // LB
  lb: 'LB', 'left-back': 'LB', 'left back': 'LB',
  lwb: 'LB', 'left wing-back': 'LB', 'left wing back': 'LB',

  // Right wing-back → RB (user list only allows RB)
  rwb: 'RB', 'right wing-back': 'RB', 'right wing back': 'RB',

  // CDM
  cdm: 'CDM', dm: 'CDM', 'defensive midfielder': 'CDM', 'defensive midfield': 'CDM',
  'defensive mid': 'CDM', 'holding midfielder': 'CDM',

  // CM
  cm: 'CM', rcm: 'CM', lcm: 'CM',
  'central midfielder': 'CM', 'central midfield': 'CM',
  'centra midfielder': 'CM', 'centre midfielder': 'CM',
  'central midfielder can also play attacking defensive midfield': 'CM',

  // CAM
  cam: 'CAM', am: 'CAM',
  'attacking midfielder': 'CAM', 'attacking midfield': 'CAM',
  'attacking midfielder forward': 'CAM',
  'winger attacking midfielder': 'CAM',
  'central midfielder attacking midfielder': 'CAM',
  'attacker midfielder': 'CAM',

  // LW
  lw: 'LW', 'left winger': 'LW', 'left-winger': 'LW',
  lm: 'LW', 'left midfielder': 'LW', 'left midfield': 'LW',
  'left midfielder left winger': 'LW',

  // RW
  rw: 'RW', 'right winger': 'RW', 'right-winger': 'RW',
  rm: 'RW', 'right midfielder': 'RW', 'right midfield': 'RW',
  winger: 'RW', w: 'RW',
  'forward winger': 'RW',

  // CF
  cf: 'CF', st: 'CF', ss: 'CF',
  'centre-forward': 'CF', 'centre forward': 'CF',
  'center-forward': 'CF', 'center forward': 'CF',
  'centre-forward striker': 'CF',
  'centre-forward defender': 'CF',
  striker: 'CF', 'second striker': 'CF',
  'striker forward': 'CF', forward: 'CF',
  'forward attack': 'CF', 'forward attacker': 'CF',
  'forward attacking player': 'CF', 'attacking player forward': 'CF',
  'forward striker': 'CF', 'forward defender': 'CF',
  attacker: 'CF', attack: 'CF',
};

// Normalise any free-form position value into one of the 10 canonical codes.
// Returns null when we can't confidently map it (non-position labels like
// "Manager", "Retired", "Unknown" are intentionally left unmapped).
export const normalisePosition = (raw?: string | null): PlayerPosition | null => {
  if (!raw) return null;
  const cleaned = clean(String(raw));
  if (!cleaned) return null;
  if (MAP[cleaned]) return MAP[cleaned];
  // Split combined values like "attacking midfielder forward" and match parts.
  const parts = cleaned.split(' ');
  for (let i = parts.length; i >= 1; i--) {
    for (let j = 0; j + i <= parts.length; j++) {
      const slice = parts.slice(j, j + i).join(' ');
      if (MAP[slice]) return MAP[slice];
    }
  }
  return null;
};

export const POSITION_OPTIONS = PLAYER_POSITIONS.map((code) => ({ label: code, value: code }));