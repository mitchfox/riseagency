/**
 * Shared session colour map used by the staff editor and the player portal.
 * Keep keys aligned with Dashboard.tsx / Hub.tsx so Session A looks the same
 * everywhere it appears.
 */
export interface SessionColor {
  bg: string;
  text: string;
  hover: string;
}

const COLOR_MAP: Record<string, SessionColor> = {
  A: { bg: "hsl(220, 70%, 35%)", text: "hsl(45, 100%, 60%)", hover: "hsl(220, 70%, 45%)" },
  B: { bg: "hsl(140, 50%, 30%)", text: "hsl(45, 100%, 60%)", hover: "hsl(140, 50%, 40%)" },
  C: { bg: "hsl(0, 50%, 35%)", text: "hsl(45, 100%, 60%)", hover: "hsl(0, 50%, 45%)" },
  D: { bg: "hsl(45, 70%, 45%)", text: "hsl(45, 100%, 60%)", hover: "hsl(45, 70%, 55%)" },
  E: { bg: "hsl(70, 20%, 40%)", text: "hsl(45, 100%, 60%)", hover: "hsl(70, 20%, 50%)" },
  F: { bg: "hsl(270, 60%, 40%)", text: "hsl(45, 100%, 60%)", hover: "hsl(270, 60%, 50%)" },
  G: { bg: "hsl(190, 70%, 45%)", text: "hsl(45, 100%, 60%)", hover: "hsl(190, 70%, 55%)" },
  H: { bg: "hsl(30, 80%, 45%)", text: "hsl(45, 100%, 60%)", hover: "hsl(30, 80%, 55%)" },
  "PRE-A": { bg: "hsl(220, 70%, 22%)", text: "hsl(45, 100%, 60%)", hover: "hsl(220, 70%, 32%)" },
  "PRE-B": { bg: "hsl(140, 50%, 20%)", text: "hsl(45, 100%, 60%)", hover: "hsl(140, 50%, 30%)" },
  "PRE-C": { bg: "hsl(0, 50%, 25%)", text: "hsl(45, 100%, 60%)", hover: "hsl(0, 50%, 35%)" },
  "PRE-D": { bg: "hsl(45, 70%, 35%)", text: "hsl(45, 100%, 60%)", hover: "hsl(45, 70%, 45%)" },
  "PRE-E": { bg: "hsl(70, 20%, 30%)", text: "hsl(45, 100%, 60%)", hover: "hsl(70, 20%, 40%)" },
  "PRE-F": { bg: "hsl(270, 60%, 30%)", text: "hsl(45, 100%, 60%)", hover: "hsl(270, 60%, 40%)" },
  "PRE-G": { bg: "hsl(190, 70%, 35%)", text: "hsl(45, 100%, 60%)", hover: "hsl(190, 70%, 45%)" },
  PREHAB: { bg: "hsl(220, 80%, 20%)", text: "hsl(45, 100%, 60%)", hover: "hsl(220, 80%, 30%)" },
  T: { bg: "hsl(140, 50%, 20%)", text: "hsl(45, 100%, 60%)", hover: "hsl(140, 50%, 30%)" },
  TESTING: { bg: "hsl(140, 50%, 20%)", text: "hsl(45, 100%, 60%)", hover: "hsl(140, 50%, 30%)" },
  R: { bg: "hsl(0, 0%, 85%)", text: "hsl(45, 100%, 45%)", hover: "hsl(0, 0%, 90%)" },
  REST: { bg: "hsl(0, 0%, 85%)", text: "hsl(45, 100%, 45%)", hover: "hsl(0, 0%, 90%)" },
  MATCH: { bg: "hsl(43, 49%, 61%)", text: "hsl(0, 0%, 0%)", hover: "hsl(43, 49%, 71%)" },
  OFF: { bg: "hsl(0, 0%, 20%)", text: "hsl(0, 0%, 100%)", hover: "hsl(0, 0%, 30%)" },
};

const FALLBACK: SessionColor = {
  bg: "hsl(0, 0%, 15%)",
  text: "hsl(0, 0%, 100%)",
  hover: "hsl(0, 0%, 25%)",
};

export const getSessionColor = (sessionKey: string | null | undefined): SessionColor => {
  if (!sessionKey) return FALLBACK;
  const key = sessionKey.toUpperCase().trim();
  return COLOR_MAP[key] || FALLBACK;
};