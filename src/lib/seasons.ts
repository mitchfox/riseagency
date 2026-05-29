/**
 * Per-player season grouping.
 *
 * Seasons are user-defined via the player_seasons table. A season is a
 * named window with an explicit start match and end match (referencing
 * player_analysis rows). Matches whose date falls between the start and
 * end match dates (inclusive) belong to that season.
 *
 * Matches not covered by any defined season are returned in a trailing
 * "Unassigned" group so they remain visible.
 */

export interface SeasonAnalysis {
  id: string;
  analysis_date: string;
  season_final?: boolean | null;
  [key: string]: any;
}

export interface SeasonRecord {
  id: string;
  player_id: string;
  name: string;
  start_analysis_id: string | null;
  end_analysis_id: string | null;
  sort_order?: number | null;
}

export interface Season<T extends SeasonAnalysis = SeasonAnalysis> {
  /** Stable id for select inputs */
  id: string;
  /** Human label, e.g. "2025/26" or "Unassigned" */
  label: string;
  /** ISO date of first match in this season (oldest) */
  start: string | null;
  /** ISO date of last match in this season (newest) */
  end: string | null;
  /** True for the auto "Unassigned" bucket */
  isCurrent: boolean;
  analyses: T[];
}

/**
 * Build seasons from explicit user records. Returns seasons newest-first
 * by end date, with an "Unassigned" bucket appended for matches outside
 * any defined window. Empty seasons are still returned so the user can
 * see them in selectors.
 */
export const groupBySeasonRecords = <T extends SeasonAnalysis>(
  analyses: T[],
  records: SeasonRecord[]
): Season<T>[] => {
  const byId = new Map(analyses.map(a => [a.id, a]));
  const dateOf = (id: string | null) =>
    id && byId.get(id) ? String(byId.get(id)!.analysis_date) : null;

  // Resolve each record to a date window
  const resolved = records.map(r => {
    const startDate = dateOf(r.start_analysis_id);
    const endDate = dateOf(r.end_analysis_id);
    const lo = startDate && endDate
      ? (startDate < endDate ? startDate : endDate)
      : (startDate || endDate);
    const hi = startDate && endDate
      ? (startDate < endDate ? endDate : startDate)
      : (endDate || startDate);
    return { record: r, lo, hi };
  });

  const assigned = new Set<string>();
  const seasons: Season<T>[] = resolved.map(({ record, lo, hi }) => {
    const rows = (lo && hi)
      ? analyses.filter(a => {
          const d = String(a.analysis_date);
          return d >= lo && d <= hi;
        })
      : [];
    rows.forEach(r => assigned.add(r.id));
    const sorted = [...rows].sort((a, b) =>
      String(a.analysis_date).localeCompare(String(b.analysis_date))
    );
    return {
      id: record.id,
      label: record.name,
      start: sorted[0]?.analysis_date ?? lo,
      end: sorted[sorted.length - 1]?.analysis_date ?? hi,
      isCurrent: false,
      analyses: sorted,
    };
  });

  // Newest-first by end date
  seasons.sort((a, b) => String(b.end || "").localeCompare(String(a.end || "")));

  const unassigned = analyses.filter(a => !assigned.has(a.id));
  if (unassigned.length > 0) {
    const sorted = [...unassigned].sort((a, b) =>
      String(a.analysis_date).localeCompare(String(b.analysis_date))
    );
    seasons.push({
      id: "__unassigned__",
      label: records.length === 0 ? "All Matches" : "Unassigned",
      start: sorted[0]?.analysis_date ?? null,
      end: sorted[sorted.length - 1]?.analysis_date ?? null,
      isCurrent: true,
      analyses: sorted,
    });
  }

  return seasons;
};

/**
 * Back-compat shim — returns a single "All Matches" bucket. Callers
 * should migrate to groupBySeasonRecords once they load season records.
 */
export const groupBySeason = <T extends SeasonAnalysis>(analyses: T[]): Season<T>[] =>
  groupBySeasonRecords(analyses, []);