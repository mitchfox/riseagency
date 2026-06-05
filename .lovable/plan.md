## 1. Paginate Youth / Pro outreach tables

In `PlayerOutreachPanel.tsx`, switch each section from "show all" to fixed pages of 50.

- Add `pageSize = 50` and a per-section `page` state.
- Render only `rows.slice(page*50, page*50+50)`.
- Show a pagination bar (Prev · "Page X of Y" · Next, with first/last) at the **top and bottom** of each section table, using the existing `ui/pagination` component.
- Keep the current fetch (single query) but defer expensive cell work (e.g. country/club enrichments) to the visible slice only — most of the perceived slowness is React rendering 500+ rows, not the network call.
- Reset `page` to 0 when search/filter/sort changes.

(Server-side range fetching is overkill here — the dataset is bounded and a single query keeps search/sort working without extra round-trips. We can switch to `.range()` later if it grows.)

## 2. Recruitment Targets: inline + comma fix

Replace the dialog in `OutreachTargetsManager.tsx` with an in-page editor.

- One expandable card per target. Header shows name + scope + priority + match counts (as today). Clicking "Edit" expands the card inline with all fields visible; no modal.
- **Comma fix**: store list fields (positions, nationalities, club countries) as **raw strings** in local edit state. Only call `parseList` on Save. This lets the user type `Spain, Portugal` without the comma being eaten mid-typing.
- "New target" appends a fresh inline card at the top in edit mode.
- Save button per card; toast on success, reload on success, and surface the actual error message on failure so we know if RLS or grants are blocking.

## 3. Per-target scoring weights

Today `recruitment_scoring_settings` holds one global weights row. Add per-target overrides.

- Migration: add `weights_override jsonb` (nullable) and `ai_nudge_enabled boolean` (nullable) to `recruitment_targets`.
- Update `scoreAgainstTarget` in `src/lib/fitScore.ts` to accept an optional per-target weight override and merge it over the global weights before scoring. `computeFitScore` already iterates all targets and keeps the highest — that behaviour stays, so the player automatically takes the score from the target they best match.
- Update `useRecruitmentScoring`/`useRecruitmentTargets` to fetch `weights_override` and pass it through.
- In the inline target editor, add a collapsible "Scoring weights for this target" panel with the same sliders as `ScoringSettings`, plus a "Use global defaults" toggle that clears the override.
- Cache invalidation: call `invalidateScoringCaches()` after any target save so badges across Player Database / Player Outreach refresh.

## 4. Saving reliability

- Targets and scoring settings currently call `.update(...).eq("id", "singleton")` / `.update(...).eq("id", id)` without surfacing errors. Add explicit error toasts with `error.message`, and after a successful save call `invalidateScoringCaches()` and re-fetch the local list so the UI reflects the saved state immediately.
- Verify the existing RLS policies allow authenticated staff to write to `recruitment_targets` and `recruitment_scoring_settings`. If a save fails because of policies we will tighten them in the same migration.

## 5. Investor update "non-2xx" save failure

Two likely causes — fix both:

- `investor-write` was edited to add `investor_updates` to `ALLOWED_TABLES`, but the deployed copy may be stale or the row payload (`title`, `body`, `achieved_on`) may hit a not-null we don't see. We will: (a) redeploy the function, (b) make the function echo the underlying Postgres error in the JSON response so the toast shows a useful message, and (c) in `InvestorHighlineLog.save`, fall back to reading `data.error` even when `error` is null.
- Confirm the table has the columns we insert into and that the service role can write (it should — service role bypasses the deny-all policy).

After the fix, retry add-update from the unlocked Investors Portal and confirm the toast says "Update logged".

## Files touched

- `src/components/staff/PlayerOutreachPanel.tsx` — pagination (50/page, top+bottom).
- `src/components/staff/recruitment/OutreachTargetsManager.tsx` — inline editor, raw-string list inputs, per-target weight sliders, error surfacing.
- `src/components/staff/recruitment/ScoringSettings.tsx` — minor: shared weight-slider sub-component pulled out so the target editor can reuse it.
- `src/lib/fitScore.ts` + `src/hooks/useRecruitmentScoring.ts` — per-target weight override plumbing.
- `supabase/migrations/<new>.sql` — add `weights_override jsonb`, `ai_nudge_enabled boolean` to `recruitment_targets`.
- `supabase/functions/investor-write/index.ts` — better error payload; redeploy.
- `src/components/investor/InvestorHighlineLog.tsx` — surface the server error message in the toast.

## Out of scope

- Server-side pagination / virtualised tables (only if the dataset grows past a few thousand).
- Reworking the fit-score AI nudge — only the weights plumbing changes.
