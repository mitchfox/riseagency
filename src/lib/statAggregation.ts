/**
 * Centralised fixture-stat aggregation rules.
 *
 * Raw count stats: blank/missing values are treated as 0 across the
 * selected fixture window — a missing entry means the action did not
 * occur in that fixture. Percentage stats: blank/missing values are
 * excluded from the average — a blank percentage typically means there
 * were no attempts in that fixture and therefore no rate to average.
 * Explicit 0 always counts.
 *
 * This single source of truth is used across portal, comparisons,
 * transfer reports and performance report views for both outfield and GK.
 */

// Aliases between legacy and current stat keys (e.g. clean_sheets ↔ gk_clean_sheets)
const STAT_KEY_ALIASES: Record<string, string[]> = {
  gk_clean_sheets: ['clean_sheets'],
  clean_sheets: ['gk_clean_sheets'],
  gk_saves_made: ['saves'],
  saves: ['gk_saves_made'],
  gk_save_percentage: ['save_percentage'],
  save_percentage: ['gk_save_percentage'],
  gk_goals_conceded: ['goals_conceded'],
  goals_conceded: ['gk_goals_conceded'],
};

const PERCENTAGE_PATTERNS = [
  '_pct',
  'accuracy',
  'percentage',
  'win_pct',
  'success_pct',
];

/** Returns true if the metric key represents a percentage-type stat */
export const isPercentageMetric = (key: string): boolean => {
  const lower = key.toLowerCase();
  return PERCENTAGE_PATTERNS.some(p => lower.includes(p));
};

/**
 * Per-game raw count stat keys that are always whole numbers when
 * representing a single fixture. Season averages (totals ÷ N) may still
 * be fractional — pass isAggregate=true to formatStat in that case.
 * Includes both outfield and GK keys.
 */
export const INTEGER_STAT_KEYS = new Set<string>([
  // Outfield — counts (per-game fixture_stats stores raw counts under these _per90 keys)
  'goals_per90',
  'shots_on_target_per90',
  'created_own_shot_per90',
  'total_shots_per90',
  'shots_outside_box_per90',
  'shots_inside_box_per90',
  'assists_per90',
  'key_passes_per90',
  'progressive_passes_per90',
  'passes_into_final_3rd_per90',
  'forward_passes_per90',
  'passes_in_opp_half_per90',
  'passes_in_own_half_per90',
  'accurate_passes_per90',
  'accurate_long_balls_per90',
  'accurate_crosses_per90',
  'successful_dribbles_per90',
  'dribble_attempts_per90',
  'progressive_carries_per90',
  'carries_into_final_3rd_per90',
  'touches_in_opp_box_per90',
  'fouls_drawn_per90',
  'tackles_won_per90',
  'aerials_won_per90',
  'duels_won_per90',
  'clearances_per90',
  'interceptions_per90',
  // Goalkeeper — counts
  'gk_clean_sheets',
  'gk_goals_conceded',
  'gk_goals_conceded_inside_box',
  'gk_goals_conceded_outside_box',
  'gk_shots_on_target_faced',
  'gk_saves_made',
  'gk_shots_on_target_faced_inside_box',
  'gk_saves_from_inside_box',
  'gk_shots_on_target_faced_outside_box',
  'gk_saves_from_outside_box',
  'gk_touches',
  'gk_passes_completed',
  'gk_long_passes_completed',
  'gk_passes_completed_opp_half',
  'gk_possession_lost',
  'gk_clearances',
  'gk_ball_recoveries',
  // Legacy aliases also seen in code
  'clean_sheets',
  'goals_conceded',
  'saves',
]);

/** Returns true if this stat must render as a whole integer per game. */
export const isIntegerStatKey = (key: string) => INTEGER_STAT_KEYS.has(key);

/**
 * Format a stat value for display.
 *  - Per-game integer-only stats render as whole numbers (no decimals).
 *  - Everything else (percentages, season averages, scores) renders to 2dp.
 *  - Pass isAggregate=true to force 2dp output even for integer stat keys
 *    (used when showing a season average for an integer stat).
 */
export const formatStat = (
  key: string,
  value: number | null | undefined,
  isAggregate = false,
): string => {
  if (value == null || isNaN(value as number)) return '-';
  if (!isAggregate && INTEGER_STAT_KEYS.has(key)) {
    return Math.round(value as number).toString();
  }
  return (value as number).toFixed(2);
};

/**
 * Get a stat value from an analysis row, checking fixture_stats then striker_stats.
 * Returns the numeric value or null if not present.
 */
export const getStatValue = (analysis: any, key: string): number | null => {
  const fs = analysis?.fixture_stats as Record<string, any> | null;
  const ss = analysis?.striker_stats as Record<string, any> | null;
  const keysToTry = [key, ...(STAT_KEY_ALIASES[key] || [])];
  for (const k of keysToTry) {
    if (fs?.[k] != null) return Number(fs[k]);
    if (ss?.[k] != null) return Number(ss[k]);
  }
  return null;
};

/**
 * Compute the average of a metric across multiple analyses.
 *
 * For raw count stats: null/blank = 0 (every analysis counts).
 * For percentage stats: null/blank is excluded from the average.
 *
 * @param analyses - Array of analysis objects with fixture_stats / striker_stats
 * @param metricKey - The stat key to average
 * @param totalGames - Optional override for total games (defaults to analyses.length)
 * @returns The average value, or null if no data points exist
 */
export const computeStatAverage = (
  analyses: any[],
  metricKey: string,
  _totalGames?: number,
): number | null => {
  if (analyses.length === 0) return null;

  const raw = analyses.map(a => getStatValue(a, metricKey));
  const present = raw.filter((v): v is number => v != null && !isNaN(v));

  if (isPercentageMetric(metricKey)) {
    // Percentages: exclude blanks (no attempts → no rate to include).
    if (present.length === 0) return null;
    return present.reduce((s, v) => s + v, 0) / present.length;
  }

  // Raw / count stats: blanks count as 0 across the full window.
  if (present.length === 0) return null;
  return present.reduce((s, v) => s + v, 0) / analyses.length;
};

/**
 * Compute averages for a full set of metrics across analyses.
 * Returns a record of metric key -> average value (null if no data).
 */
export const computeAllStatAverages = (
  analyses: any[],
  metrics: { key: string }[],
): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  metrics.forEach(m => {
    result[m.key] = computeStatAverage(analyses, m.key);
  });
  return result;
};
