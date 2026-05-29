/**
 * Centralised "effective" R90 / minutes resolution.
 *
 * When a player_analysis row has visibility_status = 'hidden', the
 * displayed/aggregated R90 score should come from the hidden
 * placeholder values (placeholder_raw_score / placeholder_minutes * 90)
 * rather than the live r90_score. Likewise minutes should use the
 * placeholder when present. Everywhere R90 or minutes are surfaced for
 * any audience the effective values below should be used so that hidden
 * reports remain consistent across the app.
 */

export interface R90Source {
  visibility_status?: string | null;
  r90_score?: number | null;
  minutes_played?: number | null;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
}

export const isHiddenReport = (a: Pick<R90Source, "visibility_status">) =>
  String(a.visibility_status || "").toLowerCase() === "hidden";

export const effectiveR90 = (a: R90Source): number | null => {
  if (
    isHiddenReport(a) &&
    a.placeholder_raw_score != null &&
    a.placeholder_minutes != null &&
    a.placeholder_minutes > 0
  ) {
    return (Number(a.placeholder_raw_score) / Number(a.placeholder_minutes)) * 90;
  }
  return a.r90_score ?? null;
};

export const effectiveMinutes = (a: R90Source): number | null => {
  if (
    isHiddenReport(a) &&
    a.placeholder_minutes != null &&
    a.placeholder_minutes > 0
  ) {
    return Number(a.placeholder_minutes);
  }
  return a.minutes_played ?? null;
};