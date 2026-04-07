/**
 * Centralised fixture-stat aggregation rules.
 *
 * - Raw count stats: blank/null counts as 0
 * - Percentage stats (_pct, accuracy, percentage): blank/null is excluded
 *
 * This single source of truth is used across portal, comparisons,
 * transfer reports and performance report views for both outfield and GK.
 */

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
  if (fs?.[key] != null) return Number(fs[key]);
  if (ss?.[key] != null) return Number(ss[key]);
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
  totalGames?: number,
): number | null => {
  if (analyses.length === 0) return null;

  const isPct = isPercentageMetric(metricKey);

  if (isPct) {
    // Percentage stats: only average over games that have an explicit value
    const vals = analyses
      .map(a => getStatValue(a, metricKey))
      .filter((v): v is number => v != null && !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  // Raw count stats: null = 0, average over all games
  const games = totalGames ?? analyses.length;
  const sum = analyses.reduce((acc, a) => {
    const v = getStatValue(a, metricKey);
    return acc + (v != null && !isNaN(v) ? v : 0);
  }, 0);
  return games > 0 ? sum / games : null;
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
