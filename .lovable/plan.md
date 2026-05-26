# Plan

A focused pass across staff scheduling, portal localisation, and the performance report editor.

## 1. Automatic availability from My Schedule

- Treat 09:00–21:00 across the next 7 days as the default "available" window for every staff member.
- Compute busy blocks from each staff's `staff_personal_schedule_items` (and any all-day items) for that user, then subtract them from the default window per day.
- Replace the player portal `CoachAvailability.tsx` data source: instead of relying on rows in `staff_availability` flagged `visible_to_players`, call a new RPC `get_player_visible_availability(_player_id)` that:
  - Resolves which staff the player belongs to (existing player→staff link).
  - Returns free 09:00–21:00 slices minus that staff's personal schedule items for the next 7 days.
  - Returns only start/end ranges — never task titles, notes, or item types, so players never see what staff are doing.
- Keep the manual `staff_availability` rows as optional overrides (admin-set or holidays) but stop requiring staff to add them.

## 2. Collapse Availability Hours card

- In `StaffAvailabilityManagement.tsx`, wrap the "Your Availability Hours" card in a `Collapsible` defaulting to closed. The auto rules in step 1 make this card optional, so it stays out of the way.

## 3. Staff header — Players quick-open shortcut

- Add a new icon button in `Staff.tsx` header, immediately left of the schedule/calendar icon (which itself sits left of notifications).
- Clicking opens a widescreen dialog (`PlayerPortalQuickOpenDialog`) reusing the same quick-open row component used in Player Management.
- Order: most-used portal first. Sort by total logins per player, descending. Source = count of `player_portal_logins` (or equivalent existing login-tracking table) grouped by player_id. If no dedicated table exists, derive from `player_portal_settings.last_login` ordering as fallback and add a `login_count` column via migration.

## 4. My Schedule redesign + behaviour

- Collapse the "My Tasks" rail by default (expand on click), still draggable when expanded.
- Each task card gets a "Repeat weekly" toggle. New column `recurring_weekly boolean` and `recurrence_group_id uuid` on `staff_personal_schedule_items`.
  - When toggled on: clone the item forward for the next N weeks (cap 12) sharing the same `recurrence_group_id`.
  - Deleting a single instance only deletes that row. A separate "Delete series" affordance removes all rows with the same `recurrence_group_id`.
- Visual redesign of `MyPersonalScheduleBoard.tsx`:
  - Glassy, glossy aesthetic — translucent card surfaces with backdrop blur, subtle Rise Gold accent borders, soft inner highlights. All via semantic tokens / existing dark theme.
  - Increase task text contrast and size so titles are clearly legible (no faded text on faded glass).
  - "Now" awareness: a live time marker line across today's column, and the current hour's tasks get a Rise Gold glow + "Now" pill so the user sees what they should be working on. Updates every minute.

## 5. Operating Profile popup + portal lines — translations & first-run rule

- In `Dashboard.tsx`, suppress the Operating Profile reminder when the player has never opened the portal before (use the same flag that controls the intro popup, e.g. `player_portal_settings.has_seen_welcome_modal = false`). Only show it from the second session onward, and only if not already submitted.
- Add translation keys for all strings in `OperatingProfileReminder.tsx` and the Operating Profile modal itself (titles, descriptions, button labels, question prompts, completion states).
- Add Czech values for every new key in `portalTranslations.ts` (and any other supported languages already populated for these strings).

## 6. Czech translation gaps

Add Czech (`cs`) translations for the strings still leaking English in the portal:

- `"No active program schedule"` and surrounding programme empty-state copy.
- Action descriptions, action notes, and the performance report overview — wire these through the existing AI translation path used for French reports (`reportTranslations.ts` / report translation edge function). Ensure the Czech locale is included in the trigger list so reports are auto-translated on view if no `cs` translation exists yet.
- Comparison data stat labels (all metric names + units in the comparison screen).
- All aphorisms.
- Date formatting: switch the Czech locale month formatter from hard-coded `en-GB` to `cs-CZ` via `getReportLocale` / `toLocaleDateString` so "Apr 24" renders as "dub 24".
- POST button (Post-Match) label — add `post_match_short` key with `cs` value.

## 7. Performance Report edit — mobile chrome hidden

- In `PerformanceReport.tsx` and the in-portal editor route, when the report is in edit mode AND viewport width < `md`, hide the staff `Header` and `Footer`. Use a `useIsMobile` + edit-mode check and conditionally render. Desktop is unchanged.

## Technical notes

- **Migrations needed**:
  - `staff_personal_schedule_items` → add `recurring_weekly boolean default false`, `recurrence_group_id uuid`.
  - New RPC `get_player_visible_availability(_player_id uuid)` — SECURITY DEFINER, returns `(date, start_time, end_time)[]`. Grant to `authenticated`.
  - Optional: `player_portal_logins` table or `login_count` on `player_portal_settings` if not already tracked.
- **Files most likely touched**: `StaffAvailabilityManagement.tsx`, `MyPersonalScheduleBoard.tsx` (heavy redesign), `CoachAvailability.tsx`, `Staff.tsx` (header), new `PlayerPortalQuickOpenDialog.tsx`, `Dashboard.tsx`, `OperatingProfileReminder.tsx`, operating profile modal, `portalTranslations.ts` (large `csExtended` additions), `reportTranslations.ts`, performance report edit pages.
- All new UI uses semantic tokens — no raw hex outside the existing Rise Gold variable.
- UK English throughout, no em dashes.
