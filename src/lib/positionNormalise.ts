/**
 * Normalise free-form football position strings to the project's
 * standard abbreviations (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LW, RW, CF).
 * Used for display + scoring so legacy "Midfielder"/"Striker" rows behave correctly.
 */

const MAP: Record<string, string> = {
  // Goalkeeper
  goalkeeper: 'GK', keeper: 'GK', gk: 'GK',

  // Defenders
  defender: 'CB', 'centre back': 'CB', 'centre-back': 'CB',
  'center back': 'CB', 'center-back': 'CB', cb: 'CB',
  'left back': 'LB', 'left-back': 'LB', lb: 'LB',
  'right back': 'RB', 'right-back': 'RB', rb: 'RB',
  'left wing back': 'LWB', 'left wing-back': 'LWB', lwb: 'LWB',
  'right wing back': 'RWB', 'right wing-back': 'RWB', rwb: 'RWB',

  // Midfielders
  midfielder: 'CM', 'central midfielder': 'CM', mid: 'CM', cm: 'CM',
  'defensive midfielder': 'CDM', 'holding midfielder': 'CDM',
  'holding mid': 'CDM', cdm: 'CDM',
  'attacking midfielder': 'CAM', 'attacking mid': 'CAM', cam: 'CAM',

  // Forwards
  striker: 'CF', forward: 'CF', 'centre forward': 'CF',
  'centre-forward': 'CF', 'center forward': 'CF', cf: 'CF',
  'left wing': 'LW', 'left winger': 'LW', lw: 'LW',
  'right wing': 'RW', 'right winger': 'RW', rw: 'RW',
  winger: 'LW',
};

export const normalisePosition = (raw?: string | null): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (MAP[lower]) return MAP[lower];
  // If already a known abbreviation in upper-case form, keep it.
  const upper = trimmed.toUpperCase();
  if (['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LW','RW','CF','ST'].includes(upper)) {
    return upper === 'ST' ? 'CF' : upper;
  }
  return trimmed;
};