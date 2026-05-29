## 1. Integer-only per-game stats

Per-game raw count stats (listed below) are always whole numbers. Strip `.toFixed(2)` so they render as `3` not `3.00` in **every** display: performance reports, portal (Hub, Form, Performance, Data, Comparisons), staff data tab, transfer reports, dashboard. Season averages (totals ÷ N) keep their decimals.

**Integer stat keys** (centralised):
- GK: shots_on_target_faced, saves_made, sot_faced_inside_box, saves_inside_box, sot_faced_outside_box, saves_outside_box, touches, passes_completed, long_passes_completed, passes_completed_opp_half, possession_lost, clearances, ball_recoveries
- Outfield: goals, shots_on_target, created_own_shot, shots_outside_box, assists, key_passes, progressive_passes, passes_into_final_third, forward_passes, passes_opp_half, passes_own_half, accurate_passes, accurate_long_balls, accurate_crosses, successful_dribbles, dribble_attempts, progressive_carries, carries_into_final_third, tackles_won, aerials_won, duels_won, clearances, interceptions

I will add a helper in `src/lib/statAggregation.ts`:
```ts
export const INTEGER_STAT_KEYS = new Set([...]);
export const formatStat = (key: string, value: number | null, isAggregate = false) =>
  value == null ? '-' : (!isAggregate && INTEGER_STAT_KEYS.has(key)) ? Math.round(value).toString() : value.toFixed(2);
```
Then replace `val.toFixed(2)` call sites that render per-game stat values with `formatStat(key, val)`. Aggregate/season-average renders pass `isAggregate=true` to keep two decimals. (Key alias map in `statAggregation.ts` is reused so e.g. `clean_sheets`/`gk_clean_sheets` match.)

Files touched: `AnalysisDataTab.tsx`, `Dashboard.tsx`, `Hub.tsx`, performance report components, `TransferReportView.tsx`, `QuickStatsComparison.tsx`, and any other stat tables.

## 2. Use Hidden R90 everywhere when report is hidden

Hidden R90 already exists as `placeholder_raw_score / placeholder_minutes * 90` (already used in `Dashboard.tsx` and `Hub.tsx`). I'll centralise it:
```ts
// src/lib/r90.ts
export const effectiveR90 = (a: { visibility_status?: string|null; r90_score?: number|null;
  placeholder_raw_score?: number|null; placeholder_minutes?: number|null }) => {
  const hidden = String(a.visibility_status||'').toLowerCase() === 'hidden';
  if (hidden && a.placeholder_raw_score != null && (a.placeholder_minutes ?? 0) > 0) {
    return (a.placeholder_raw_score / a.placeholder_minutes!) * 90;
  }
  return a.r90_score ?? null;
};
export const effectiveMinutes = (a) => hidden && placeholder_minutes>0 ? placeholder_minutes : minutes_played;
```
Replace direct `r90_score` reads in season averages, R90 bar chart, form, performance graphs, comparisons, transfer reports. Update SELECTs to include `placeholder_raw_score`, `placeholder_minutes` where missing.

## 3. Player Summary fix on staff Data tab

`AnalysisDataTab.tsx` Player Summary is reused by staff and portal. Fix it to:
- **Season R90** — average of `effectiveR90(a)` (not `r90_score` directly) across selected analyses.
- **Minutes Played** — sum of `effectiveMinutes(a)`.
- **Age** — from `playerData.age` (already wired; verify staff caller passes it).
- **Club** — from `playerData.club`.
- **Matches** — count of analyses (current behaviour, fine).

Add a "**Set as final game of season**" action button at the bottom of the summary card, then a Rise Gold divider (`<div className="h-px bg-[hsl(43,49%,61%)] my-6" />`) before the Match-by-Match section.

## 4. Season boundary model

New schema:
```sql
ALTER TABLE public.player_analysis
  ADD COLUMN season_final boolean NOT NULL DEFAULT false;
CREATE INDEX idx_player_analysis_season_final
  ON public.player_analysis(player_id, analysis_date) WHERE season_final;
```
A match flagged `season_final = true` marks the **last game of that season** for the player. Seasons are then derived per-player by walking the analyses ordered by date: everything up to and including a season-final row is one season; the next row starts the next season.

Helper:
```ts
// src/lib/seasons.ts
export const groupBySeason = (analyses) => { /* returns [{label, start, end, analyses[]}] */ };
```
Labels: by default `"Season N"` newest-first, or "Current Season" for the open trailing group. (No season-year name needed unless user wants one — happy to extend.)

## 5. Season selector in Form / Performance

In Hub Form widget and Performance graphs, add a small season dropdown sourced from `groupBySeason()`. Default = current season; selecting a past season filters the data window accordingly. Season averages then compute against the selected season's analyses using the integer/hidden-R90 helpers above.

## Technical notes

- One migration: adds `season_final` column + index.
- Two new utils: `src/lib/r90.ts`, `src/lib/seasons.ts`. Extend `src/lib/statAggregation.ts` with `INTEGER_STAT_KEYS` and `formatStat`.
- Staff data Player Summary gets the new button which calls a small `update player_analysis set season_final = true where id = ?` (after un-setting any other season_final flag within the same season cluster to keep one final per season — actually allow multiple if user re-marks; simplest is just toggle this row).
- Toggle behaviour: clicking the button when already final un-marks it.
- No edge-function changes required.

## Out of scope

- Renaming seasons (auto-labelled).
- Cross-player season alignment (per-player only, as data is per-player).
