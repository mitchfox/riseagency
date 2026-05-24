## Goals

Three independent issues to address.

### 1. Fixtures merging when opponent name matches but dates differ

Sweep every place fixtures/reports/analyses are grouped or matched on opponent alone and make the key/match include `match_date` (and `home_team` where relevant). Two fixtures vs the same opponent on different dates must remain distinct.

Files to audit and fix:
- `src/pages/PlayerDetail.tsx` (`highlightedAnalysis` lookup currently falls back to opponent-only — add date equality).
- `src/components/staff/PlayerFixtures.tsx`, `PlayerFixtureStats.tsx`, `HighlightedMatchForm.tsx`, `HighlightCompiler.tsx` — verify any grouping/dedupe uses `match_date + opponent`, not opponent alone.
- `src/components/staff/widgets/useWidgetData.ts`, `StaffOverview.tsx`, `AthleteCentre.tsx` — same audit.
- `src/components/staff/CreatePerformanceReportDialog.tsx` — fixture stats merging keyed by composite key, not opponent.
- `src/pages/InvestorsPortal.tsx` `buildFixtureFeed` already keys on date+opponent; confirm no further collapse downstream.

Approach: introduce a single helper `fixtureMatchKey({ match_date, opponent, home_team?, away_team? })` in `src/lib/` and reuse it everywhere a fixture is matched/grouped. When `fixture_id` exists on both sides, use that as the strong key.

### 2. Capacity Planner reloads / loses input after typing in staff filter

Symptoms: pressing a letter in the staff filter (or related field) causes a full reload and no save.

Investigation plan:
- Reproduce in preview with the staff Select open (Radix typeahead) and the staff initial-chip buttons.
- Check whether any ancestor wraps the planner in a `<form>` (none found in `InvestorsPortal.tsx`, but verify `SectionShell`).
- Confirm every `<Button>` and `<button>` inside `CapacityPlanner.tsx` and `AddAllocationInline` has `type="button"` — the shadcn `Button` defaults to `submit` and the Save/Cancel buttons in `AddAllocationInline` are missing it.
- Verify `invokeEdgeFunction("investor-overview-write", ...)` is not throwing → triggering an ErrorBoundary remount that looks like a reload.
- Verify the hours `<Input>` `key={`${a.id}-${staffFilter}-${hoursFor(a)}`}` does not remount-during-typing (drop `hoursFor(a)` from the key — only `${a.id}-${staffFilter}`).

Fixes to apply once root cause confirmed:
- Add `type="button"` to all action buttons in `CapacityPlanner.tsx` and `AddAllocationInline`.
- Stabilise the hours input key so typing isn't interrupted.
- Ensure the staff filter change does not trigger a `call()` (it currently doesn't, but confirm no `onBlur` fires on the weekly-limit input when focus shifts to the Select).

### 3. Investors Portal mobile layout

Sweep the portal at 390px width and fix sections that overflow or stack badly. Likely offenders based on recent additions:
- Commission Cap table (date cells with "Rep. exp." / "Contract" labels) — make horizontally scrollable on small screens or stack vertically.
- Projections section — players list, extra-income rows, header controls; ensure inputs and buttons wrap.
- Capacity Planner — battery row, allocation columns, staff chips, day chips.
- Business Plan section now embedded in portal.
- Section header / tab controls with long labels.

Approach: per section, add responsive utilities (`flex-wrap`, `grid-cols-1 md:grid-cols-*`, `overflow-x-auto` on wide tables, smaller text/padding under `sm:`), keep desktop layout untouched.

## Out of scope

- No schema changes.
- No new features beyond what's needed to fix the three reported issues.

## Verification

- Manually create two fixtures vs the same opponent on different dates and confirm they remain separate in PlayerDetail, Dashboard, performance reports, and the investor feed.
- In Capacity Planner: open the staff Select, type a letter, click a staff chip on an allocation, edit hours — no reload, value saves.
- Resize preview to 390px and walk each Investors Portal section; no horizontal overflow or hidden controls.
