/**
 * Centralised fixture-stat aggregation rules.
 *
 * Both raw count stats and percentage stats now exclude rows where the
 * metric key is missing entirely (i.e. the fixture wasn't coded for that
 * metric at all). An explicit value of 0 IS counted — only true absence
 * is excluded. This avoids dragging averages down to 0 for goalkeeper
 * metrics like clean sheets when older fixtures predate the metric set.
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

  // Both raw and percentage averages now use only rows that actually have a
  // value for this metric. Explicit 0 still counts; only missing keys are
  // excluded. This prevents older fixtures (which never tracked the metric)
  // from dragging the average to zero.
  const vals = analyses
    .map(a => getStatValue(a, metricKey))
    .filter((v): v is number => v != null && !isNaN(v));

  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
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
