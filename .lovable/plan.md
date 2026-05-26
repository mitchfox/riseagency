## Investigation — what is already in place vs what is actually broken

I went through every item from your last two messages and checked the current files. Most of the wiring landed, but several pieces are silently inert or are still hardcoded, which is why on Ondrej's portal and on your schedule it looks like nothing happened. Breakdown:

### Already shipped and verified in code

- Portal quick-open uses `?staff_login=...` (`PlayerPortalQuickOpenDialog.tsx`).
- `OperatingProfileDialog` and `OperatingProfileReminder` both call `t(portalLanguage, ...)` and `Dashboard.tsx` passes `playerData.portal_language` to both.
- `useTranslatedOperatingProfile` accepts a `portalLanguageOverride` and uses it before falling back to context.
- `get_player_visible_availability` RPC is filtered to `lower(full_name) LIKE 'jolon%'`.
- `MyPersonalScheduleBoard` has a 9 AM – 9 PM grid, `image_url`, `Repeat` toggle, weekly cloning, "Now" marker.
- `HighlightCompiler` exposes `moveClipTo`/`onReorder`; `HighlightReelPlayer` has the `#` reorder input and the `AddToPlaylistButton`.
- `PerformanceReport.tsx` hides `Header` and `Footer` when `isMobile`.
- `AnalysisDataTab` formats dates via `dateLocale(playerData?.portal_language)`.
- `Hub.tsx` uses `t(portalLanguage, "no_active_program_schedule")`.

### Real bugs found

1. **Operating Profile auto-opens unprompted.** `Dashboard.tsx` lines 213–215 set `setOperatingProfileOpen(true)` whenever the player has seen the welcome modal but has not answered anything. You asked for the reminder banner only — the full modal should never pop on its own. Fix: drop the auto-open; let the banner be the only entry point.

2. **My Schedule action buttons are invisible.** Recurring, image, log, delete buttons sit under `opacity-0 group-hover:opacity-100`. On touch and at a glance you can't see them. Fix: make the row of buttons always visible (subtle), and put a persistent Repeat pill on the card when recurring is on.

3. **Task cards are too short to read.** Title uses `text-xs` + `line-clamp-2` and minimum height defaults to ~30 min. Fix: bump font sizes, drop the line clamp, raise the minimum rendered height (e.g. 50 px), and prefer wrapping over truncating. Also widen the hour gutter from 48 px and label every hour clearly (currently shaved off the top of each row).

4. **`useTranslatedOperatingProfile` only kicks in when `LanguageContext.language` matches.** Override works but the staff/portal context defaults to `en` and the hook only triggers when `effectiveLanguage` changes — verified working. No fix needed beyond #1 above, but I want to double-check on Ondrej's portal post-fix that the cache key for `cs` is populated (clearing `localStorage` once may be required if a stale `en` map was cached).

5. **POST (Post-Match) button is hardcoded.** No translation key exists. Add `post_match_short` ("POST" / "POZÁP" or "POZ") to `portalTranslations.ts` and wire wherever the badge is rendered (search for the literal string in `Hub.tsx` and elsewhere — current grep didn't surface it, so the badge text lives in another component I need to locate).

6. **Database-sourced content is still English on Czech portal.** Action descriptions, action notes, performance report overview, comparison/stats labels, and aphorisms are stored in the DB in English. They need on-the-fly translation, the same pattern `useTranslatedOperatingProfile` uses (cache-then-`ai-translate-batch`). I'll add a small reusable `useAutoTranslateStrings(strings, lang)` and apply it to:
   - action `description` and `notes` in the performance report view
   - the performance report overview paragraph
   - comparison stat labels in the comparisons section
   - `coaching_aphorisms` text in `Dashboard.tsx` (fetch then translate)

7. **Czech month names not always applied.** `AnalysisDataTab` is fixed, but other date renders still use bare `toLocaleDateString()` or `format(..., "MMM d")` from `date-fns`. I'll grep all `toLocaleDateString(` and `format(.*MMM` callers in portal-rendered components and route them through `formatDate(..., playerData?.portal_language)`.

8. **Coach Availability dialog itself still uses English `EEEE (dd/MM)` via `date-fns/format`.** Switch to localized format.

## Plan

1. Remove the auto-open of the Operating Profile modal in `Dashboard.tsx`; keep only the reminder banner.
2. `MyPersonalScheduleBoard.tsx`:
   - Always-visible compact action row on each card (Repeat / Image / Log / Delete).
   - Persistent Repeat badge on recurring cards.
   - Widen hour gutter to 64 px, render every hour label aligned to its line, bigger font.
   - Card text → `text-sm` for title, remove `line-clamp-2`, raise min rendered height to 50 px.
3. `CoachAvailability.tsx`: replace `format(dateObj, "EEEE (dd/MM)")` with localized formatter.
4. Add `post_match_short` key (and Czech value) and localize the POST badge wherever it renders.
5. Create `src/hooks/useAutoTranslateStrings.ts` (cache + `ai-translate-batch`), then apply to:
   - performance report action description / notes
   - performance report overview text
   - comparison stat labels
   - aphorism text in `Dashboard.tsx`
6. Sweep remaining `toLocaleDateString(` / `format(date, "MMM d")` in portal-facing components and switch to `formatDate(date, playerData?.portal_language)`.

### Files to touch

`src/pages/Dashboard.tsx`, `src/components/staff/MyPersonalScheduleBoard.tsx`, `src/components/CoachAvailability.tsx`, `src/components/dashboard/Hub.tsx`, `src/components/portal/PerformanceReportView*.tsx` (find on action description/notes/overview), `src/components/portal/ComparisonsTab*.tsx` (find), `src/hooks/useAutoTranslateStrings.ts` (new), `src/lib/portalTranslations.ts`.

No database migrations required.
