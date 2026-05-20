## Scope

A round of fixes across the Staff portal, Highlights portal, Player portal, Rise With Us flow and the Investors portal. No new features beyond what's asked.

---

## 1. Staff portal — Stats Updater profile

**Problem:** Sidebar shows no options and opens onto "my tasks" (a section the role can't access).

**Fix in `src/pages/Staff.tsx` + `src/hooks/useRolePermissions.ts`:**
- Wait for `permissionsLoading` before resolving `defaultSection` for ALL permission-managed roles (already partially there) and additionally guard against the stale `staff_active_tab` / `staff_open_tabs` in localStorage by validating each saved tab against `canView()` and stripping any that fail.
- New default-resolution order for stats_updater: first viewable section in role order, NOT `my-tasks`. Confirm `my-tasks` is removed from `getViewableSections()` for the role (it shouldn't be in `role_permissions` at all — verify via read_query and clean up if it is).
- Render the sidebar category list only after permissions resolve; show a small loading state instead of an empty list (prevents the "no options" flash that persists).

**Stats Updater player scoping:**
- Already handled by `useStatsUpdaterAssignments` — verify it's applied wherever the role lands by default (the section it opens on). If the default section reads players without applying `allowedIds`, wire the filter in.

---

## 2. Highlights login titles

**Fix in `src/pages/HighlightsLogin.tsx` (and the playlist titles surfaced after login):**
- Convert playlist / category labels to Title Case at render using existing `toTitleCase` from `src/lib/titleCase.ts` so e.g. "Performance reports" becomes "Performance Reports". Source data stays untouched.

---

## 3. Player portal — duplicate playlist on Highlights

**Fix in the player highlights view (find the playlist card component under `src/components/player/...`):**
- Add a "Duplicate" button next to each playlist. On click it copies the playlist row + all clip mappings via a new edge function action `duplicate-playlist` (or extend the existing one) and refreshes the list. Toast "Playlist duplicated".

---

## 4. Rise With Us → portal screen

All changes in `src/pages/RiseWithUs.tsx` + translation files under `src/lib/portalTranslations.ts` (or wherever Rise With Us keys live).

- **Welcome overlay popup:** Closable overlay shown once per visit on the portal screen with copy: "See a real preview of the work we do with our Stars to make the difference on the pitch." Add translation key `riseWithUs.portalOverlay.body` (+ title + dismiss) and add translations for all 12 supported languages.
- **Optional second paragraph:** Add a field `representation_subtitle_secondary` (text, nullable) on the players table via migration. Surface it on the staff player profile editor so it can be filled in. Render it on the Rise With Us "stood out" screen below the existing paragraph when present.
- **RiseWhite logo with gold star (not blue):** Replace the broken/filtered logo usage with the standard RiseWhite import already used elsewhere (search for the canonical import path and reuse). Remove any `filter`/`hue-rotate`/CSS recolour applied.
- **Under-18 toggle in settings:** Add a boolean `is_under_18` (default false) to the relevant settings table (likely `player_portal_settings` or per-player settings used by Rise With Us). Add a toggle in the settings page. When true, render the under-18 card variants that clearly state "no commission". 18+ keeps existing cards.

---

## 5. Investors portal — Priorities / Time Management

All changes in `src/components/investor/OpsBoard.tsx`, `src/pages/InvestorsPortal.tsx`, and edge function if needed.

- **Add-category typing doesn't work:** Bug in `OpsBoard.tsx` — the Input inside the popover / collapsible likely loses focus or its parent intercepts the keydown. Investigate and fix (likely a parent `onClick`/Popover focus trap or AnimatePresence remounting on every keystroke because of an unstable parent key). Ensure controlled `<Input>` updates `newCategoryTitle` on each keystroke without the parent re-rendering it.
- **Card spacing + bold position number:** Redesign `ItemCard` header. Layout: `[big bold white number] [▲ ▼ small buttons stacked] [title block] [actions]`. Number is the live `idx + 1` in `list`, font-size ~`text-3xl font-extrabold text-white/90`, fixed width column. Buttons sit immediately right of the number. Properly spaced via `gap-4`.
- **Reorder actually reorders:** Current `moveItem` only swaps `display_order` of two adjacent rows but the local optimistic state map in `OpsBoard` keeps the old `display_order` from the merged `items` list, so the sorted view doesn't change. Fix by ALSO patching `localItems` with the two swapped rows (set their new `display_order`) before/with the server call, so `visibleItems.sort(...)` reflects the change immediately. Verify the persisted update sticks via read_query after a reorder.
- **Persistence on reload:** Confirmed in DB that rows DO persist (6 categories, 4 items). The "lost on reload" symptom is the UI not rendering them — verify that `InvestorsPortal` passes `data.timeCategories` / `data.priorityCategories` into `OpsBoard` correctly AND that the initial `localCategories` / `localItems` state doesn't accidentally hide server rows (the merge map dedupes by id, but if a deletedCategoryIds entry persists from a prior session via any storage, server rows would be filtered out). Ensure `deletedCategoryIds` / `deletedItemIds` are not persisted between mounts. Also confirm `investor-data` edge function isn't being short-circuited by an old cache header — set `Cache-Control: no-store` on its response.

---

## 6. Stars content translations

**Audit pass across Stars-related pages (`src/pages/Stars.tsx`, `src/pages/stars/*`, `public/stars/*`, and any star component):**
- Find hard-coded English strings and route them through the existing translation system (likely `useTranslation` / `t()` from `LanguageContext`).
- Add missing keys to all 12 language files. Where AI translation is needed, follow the existing AI-mimic constraint memory (preserve facts, UK English styles).
- Verify by switching language and walking each Stars screen.

---

## Technical notes

- New migration: `players.representation_subtitle_secondary text`, `player_portal_settings.is_under_18 boolean default false` (or equivalent table).
- Edge function additions: `duplicate-playlist` action on the highlights/player-data writer; no other backend changes needed (ops writes already work).
- Translation keys to add (non-exhaustive): `riseWithUs.portalOverlay.title`, `riseWithUs.portalOverlay.body`, `riseWithUs.portalOverlay.dismiss`, settings toggle label `settings.under18.label`, settings toggle help text, and all newly externalised Stars strings.
- No design system / token changes. All new UI uses existing semantic tokens (`primary`, `foreground`, `card`, `muted-foreground`, etc.).
- Persistence is verified server-side; ops-board fixes are purely frontend rendering/state.

---

## Out of scope

- Reworking the staff portal sidebar architecture beyond fixing the stats_updater default.
- Any change to action timing / flywheel inputs (already shipped in prior turn).
