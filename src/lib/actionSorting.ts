/**
 * Parse a "MM.SS" game-time string into total seconds for chronological sorting.
 * e.g. "2.30" → 150, "11.30" → 690, "0.45" → 45
 * Empty/invalid values return Infinity so they sort to the end.
 */
export const parseMinuteToSeconds = (minuteStr: string | number | null | undefined): number => {
  if (minuteStr === null || minuteStr === undefined) return Infinity;
  const str = String(minuteStr);
  if (str.trim() === "") return Infinity;
  const parts = str.split(".");
  const mins = parseInt(parts[0] || "0", 10);
  const secs = parseInt(parts[1] || "0", 10);
  if (isNaN(mins) && isNaN(secs)) return Infinity;
  return (isNaN(mins) ? 0 : mins) * 60 + (isNaN(secs) ? 0 : secs);
};

/**
 * Sort an array of actions chronologically by game time (minute field).
 * Works with any object that has a `minute` property (string or number).
 * Actions without a minute value are placed at the end.
 */
export const sortActionsByMinute = <T extends { minute?: string | number | null }>(actions: T[]): T[] => {
  return [...actions].sort((a, b) => parseMinuteToSeconds(a.minute) - parseMinuteToSeconds(b.minute));
};
