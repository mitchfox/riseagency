# Plan

Five distinct pieces of work. Each section lists what to build and the key files.

## 1. Czech portal translations parity with French

**Problem:** Most of the portal renders in English for players whose `portal_language = 'cs'`, while `fr` works fine. Cause is missing rows in the `czech` column of `public.translations`.

**Approach:**
- Audit: for every row in `public.translations` where `french` is non-null and non-empty, find rows where `czech` is null/empty and capture the `english` source.
- Bulk-translate the gap (machine translation via the existing AI gateway helper used for other locales, with UK-English-aware football terminology rules from the localization memory).
- Write the results back via `supabase--insert` UPDATEs in chunks. No schema change.
- Spot-check headings on Dashboard, AnalysisViewer, Highlights, Operating Profile, Offer page for a `cs` player.

**Out of scope:** changing how `usePlayerLanguageTranslations` resolves keys (already works for `fr`).

## 2. Schedule shortcut in staff header

- In `src/pages/Staff.tsx`, add a small icon button (Calendar icon) immediately to the left of `<StaffNotificationsDropdown />` at line ~1421.
- Click sets `expandedSection` to `'schedule'` (or `'marketingschedule'` if that tab is currently the open one — preserve whichever schedule tab is already open; otherwise default to `'schedule'`).
- Same permission gate as the existing Schedule sidebar entry.

## 3. Personal Schedule under Team Schedule

In `src/components/staff/StaffAvailabilityManagement.tsx`:
- Default `isScheduleOpen` (Team Schedule) to `false` (currently `true`).
- Add a new collapsible **My Schedule** section, default open, rendering a per-user planner tied to `auth.uid()`.

New planner component `src/components/staff/MyPersonalScheduleBoard.tsx`:
- Week view (7 day columns, hour rows) covering the current week with prev/next week nav.
- Left rail lists items from the existing My Tasks store (open tasks for the signed-in user, fetched the same way `FocusedTasksSection` / the My Tasks system does).
- Drag a task card onto a day/time slot to schedule it; persist to a new table `public.staff_personal_schedule_items` (columns: `id`, `user_id`, `task_id` nullable, `title`, `notes`, `scheduled_date`, `start_time`, `end_time`, `done_at` nullable, timestamps). Migration includes GRANTs and RLS scoped to `auth.uid() = user_id`.
- Inline "quick log to My Tasks" icon on each scheduled item that creates a row in the existing My Tasks table (reuse the same insert path the My Tasks UI uses).
- "Mark done" toggle sets `done_at`; rendered items with `done_at` set get `opacity-50` and a strikethrough so completed work fades on the day it sat in.
- Items render across multiple lanes per day so overlapping entries do not stack on top of each other (mirrors the timeline lane logic).

## 4. Availability hours auto-sync to player portal

- Current `staff_availability` is for staff-internal scheduling. Reuse the same rows: anything the staff member marks as availability becomes visible to players assigned to them.
- In `StaffAvailabilityManagement`, surface a "Visible to my players" toggle per slot (new boolean column `visible_to_players` on `staff_availability`, default `true`). Migration adds the column.
- Player portal: extend the existing Coach Availability widget (`src/components/CoachAvailability.tsx`) to read the assigned staff member's `staff_availability` rows where `visible_to_players = true` and the date is `>= today`. No realtime needed; standard fetch on mount + on portal navigation.
- Free-time computation: any time inside an availability slot that does not collide with a personal-schedule item (step 3) is shown as "free" on the player side. Server side helper RPC `get_player_visible_availability(_staff_id uuid)` to keep the join simple and RLS-safe.

## 5. Video Action Editor fixes (`src/components/staff/VideoActionEditor.tsx` + `ScoreDropdown.tsx`)

**a) Minus button must prepend `-`:**
- `ScoreDropdown` already has `applyNegativePrefix`, but it only fires from the `-` key. Expose an explicit minus button next to the input (or accept the existing minus button source in the editor — confirm location during build) so that pressing it inserts `-` at index 0 of the current value, stripping any existing `-`. Empty input becomes `-` so the next typed digit is negative.
- Push the change through `onChange` immediately so parent state reflects the negative value without needing blur.

**b) R90 search icon must work:**
- The `Search` button currently calls `openR90Viewer(realIndex)` which opens the viewer, but the actual filter input above only filters scores already loaded. Wire the button to (i) focus the `searchFilter` input, and (ii) trigger the existing database lookup used elsewhere (the cached score loader in `ScoreDropdown` / `playerActionFrequency`) so results populate even when the input is empty. Ensure the search input itself filters against the same dataset (currently it only filters cached entries — extend to query Supabase when cache is empty).

## Technical notes

- Migrations needed: `staff_personal_schedule_items` table + GRANTs + RLS; `staff_availability.visible_to_players` column; `get_player_visible_availability` RPC.
- No edits to `src/integrations/supabase/{client,types}.ts` (auto-generated).
- All new UI uses semantic tokens (`bg-card`, `text-foreground`, Rise Gold accents already in `index.css`).
- UK English copy throughout; no em dashes.
