
## 1. Complete remaining translations (Representation page)

**Diagnosis**: 93 keys across `representation.*`, `scouting_network.*` and `positions.*` are still English-only (FAQ Q&A blocks for U18/Over18, Fees/Agreement/Expectations paragraphs, plus a few stragglers). Total 217 keys, 93 missing in every non-English language → 1023 cells to fill.

**Approach**:
- Run a script (Node + Lovable AI Gateway, model `google/gemini-2.5-flash`) that batches all 93 English source strings in one call per language, requesting a JSON map back, then UPSERTs the 11 language columns directly via the service role key.
- Single batched approach (one round-trip per language, 11 total) is far cheaper on credits than the existing per-row worker and finishes in seconds.
- If the AI gateway returns 402 mid-run, fall back to manually authoring the FAQ + paragraph blocks for the remaining languages (these are well-bounded football/legal copy I can translate directly via SQL inserts).
- Verify with a `SELECT COUNT(*) FILTER (WHERE <lang> IS NULL OR <lang> = '')` for each language afterwards — must be 0 across the three domains.

## 2. Fix Tyrese Omotoye's Video Reports access

**Root cause** (verified): `src/pages/Dashboard.tsx` builds the `analyses` array by merging real `player_analysis` rows with **synthetic placeholder rows for fixtures without a report**, using IDs in the form `fixture-${uuid}` (line 1089). `AnalysisVideoReports` then does:

```ts
const ids = analyses.map(a => a.id);
supabase.from('performance_report_actions').select('*').in('analysis_id', ids)
```

Because `fixture-…` is not a valid UUID, PostgREST rejects the entire `IN` filter with a 400 and zero actions are returned — so the Video Reports tab appears empty for any player with at least one fixture-without-report (Tyrese has plenty: confirmed 589 actions exist in the DB but the request fails). Same bug affects every player in the same situation.

**Fix**: in `src/components/portal/AnalysisVideoReports.tsx`, filter `ids` to only valid UUIDs (or to `analyses.filter(a => !a.id.startsWith('fixture-'))`) before the `.in()` call. Add a `playerId` fallback query path: if the filtered list is empty, skip the request.

## 3. Play icon on Form for clipped/live games next to R90

**Where**: the Form section bar chart in `src/pages/Dashboard.tsx` (the `LabelList` that currently renders the grade letter above each bar, lines ~3140-3168, and the X-axis tick that renders result/opponent, lines ~2996-3025).

**Implementation**:
- Enrich `chartData` (line 2768) with `visibilityStatus: a.visibility_status` and `analysisId` (already there).
- Determine playable status: `isPlayable = visibilityStatus === 'live' || visibilityStatus === 'clipped'` AND the analysis exists in the real `player_analysis` set (skip synthetic `fixture-` rows).
- Render a small Play icon (Lucide `Play`, filled, Rise Gold) inside the X-axis tick group, just below the result text (or as an SVG `<g>` overlaid on the bar top). Make it clickable: `onClick` → `navigate('/analysis/' + analysisId)` (existing route already used at line 2166/3205).
- Keep it dark-mode safe (Rise Gold #C6A332) and only render when `isPlayable`.

## Technical details

- **Files touched**:
  - `src/components/portal/AnalysisVideoReports.tsx` — UUID-filter fix.
  - `src/pages/Dashboard.tsx` — add Play icon to Form chart axis ticks (and propagate `visibility_status` into `chartData`).
  - DB: `translations` table — UPDATEs only, no schema change.
- **No migrations needed.**
- **No new dependencies.**

## Out of scope

- The translation worker function rewrite (the existing `fill-missing-translations` keeps working once credits are restored; we're just bypassing it once to clear the backlog).
- Any UI redesign of the Form chart beyond the new Play affordance.
