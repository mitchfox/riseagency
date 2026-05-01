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
 *
 * If the action also carries an `is_first_half` flag, it is used as a
 * tiebreaker for the 45.00–51.00 minute window: an action marked as first
 * half always sorts before one not marked, regardless of its raw minute
 * value within that window. This reflects the fact that the second half
 * actually starts at 45.00 minutes from kick-off, so early second-half
 * clips at e.g. 45.30 should still appear after first-half stoppage-time
 * clips at e.g. 47.10.
 */
export const sortActionsByMinute = <
  T extends { minute?: string | number | null; is_first_half?: boolean | null }
>(actions: T[]): T[] => {
  return [...actions].sort((a, b) => {
    const aSecs = parseMinuteToSeconds(a.minute);
    const bSecs = parseMinuteToSeconds(b.minute);
    const aHalf = halfBucket(aSecs, a.is_first_half);
    const bHalf = halfBucket(bSecs, b.is_first_half);
    if (aHalf !== bHalf) return aHalf - bHalf;
    return aSecs - bSecs;
  });
};

/**
 * Bucket an action into 0 = first half, 1 = second half so that first-half
 * stoppage-time clips (45.00–51.00 marked H1) always come before second-half
 * action that happens to fall in the same minute window.
 */
const halfBucket = (
  seconds: number,
  isFirstHalf: boolean | null | undefined,
): number => {
  if (seconds === Infinity) return 2; // unknown minute always last
  // Below 45.00 is unambiguous first half; at/above 51.00 is unambiguous
  // second half. The 45.00–51.00 window is the only ambiguous zone.
  if (seconds < 45 * 60) return 0;
  if (seconds >= 51 * 60) return 1;
  return isFirstHalf ? 0 : 1;
};
