/**
 * Per-player season grouping.
 *
 * A player_analysis row flagged season_final = true marks the LAST game
 * of that season for that player. Walking the player's analyses in
 * chronological order, every row up to and including a season_final
 * row belongs to one season; the next row begins the next season. The
 * trailing group (after the most recent season_final) is the current
 * season.
 */

export interface SeasonAnalysis {
  id: string;
  analysis_date: string;
  season_final?: boolean | null;
  [key: string]: any;
}

export interface Season<T extends SeasonAnalysis = SeasonAnalysis> {
  /** Stable id for select inputs */
  id: string;
  /** Human label, e.g. "Current Season", "Season 1" */
  label: string;
  /** ISO date of first match in this season (oldest) */
  start: string | null;
  /** ISO date of last match in this season (newest) */
  end: string | null;
  /** Whether this is the open trailing season (no season_final yet) */
  isCurrent: boolean;
  analyses: T[];
}

/**
 * Groups analyses into seasons newest-first. Index 0 is always the
 * current/most-recent season.
 */
export const groupBySeason = <T extends SeasonAnalysis>(analyses: T[]): Season<T>[] => {
  if (analyses.length === 0) return [];

  // Sort chronologically (oldest first) so we can split on season_final.
  const chrono = [...analyses].sort((a, b) =>
    String(a.analysis_date).localeCompare(String(b.analysis_date))
  );

  const buckets: T[][] = [[]];
  for (const row of chrono) {
    buckets[buckets.length - 1].push(row);
    if (row.season_final) buckets.push([]);
  }
  // Drop trailing empty bucket if last row was a season_final
  if (buckets.length > 1 && buckets[buckets.length - 1].length === 0) {
    buckets.pop();
  }

  // Reverse so newest season is first
  const newestFirst = buckets.reverse();
  const totalCount = newestFirst.length;

  return newestFirst.map((rows, idx) => {
    const isCurrent = idx === 0 && !rows[rows.length - 1]?.season_final;
    const start = rows[0]?.analysis_date ?? null;
    const end = rows[rows.length - 1]?.analysis_date ?? null;
    const seasonNumberFromOldest = totalCount - idx;
    return {
      id: `season-${seasonNumberFromOldest}`,
      label: isCurrent ? "Current Season" : `Season ${seasonNumberFromOldest}`,
      start,
      end,
      isCurrent,
      analyses: rows,
    };
  });
};