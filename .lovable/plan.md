
## 1. Finish stats_updater scoping

Apply `useStatsUpdaterAssignments` + `applyStatsUpdaterScope` consistently across the remaining staff surfaces, plus add a deep-link guard.

- **FocusedTasksSection** — hide `Player Networking` task entirely for `stats_updater` (their outreach lists shouldn't span unassigned players). Filter `PlayerOutreach` player dropdowns/lists by allowed IDs when shown.
- **CoachingDataSection / Coaching subsections** — already filters player list; extend to any nested player pickers (program assign, exercise assign) so unassigned players never appear.
- **VideoAnalysis** + **AnalysisManagement** — filter player selector and the analyses query (`.in("player_id", [...allowedIds])`). Hide team-wide analyses unless the assigned roster includes a player on that team.
- **ActionReportsList** — already filtered; double-check the "all reports" tab.
- **AthleteCentre** — already filtered.
- **PerformanceReport deep-link guard** — in `src/pages/PerformanceReport.tsx`, after resolving the analysis, if the visitor is an authenticated staff user with `stats_updater` only, look up `staff_player_assignments` and 404 (or redirect to `/staff`) when `player_id` not in their set. Team reports: allow only if at least one assigned player belongs to that team.

Edge case: when `allowedIds` is empty, render an empty-state with "No players assigned yet" rather than the full dataset.

## 2. Auto-translate Operating Profile questionnaire

- Move all English strings in `src/components/portal/operatingProfileQuestions.ts` and `OperatingProfileDialog.tsx` into the existing localisation pipeline (`usePlayerLanguageTranslations` / `useAutoTranslate`), under a new `operatingProfile.*` namespace.
- On first render in a non-English language, fire one batched translation request covering: section titles, question prompts, option labels, helper copy, button labels. Cache per language in the existing translations table so we don't re-translate.
- Football/position terms stay English per Core memory.

## 3. Investors Portal — Executive Support category

New top-level category alongside Operations / Investment etc.

**Sections inside Executive Support:**

a. **Thought Wall** (main)
   - Sticky-note board (masonry). Anyone with portal access (admin or investor) can post a note.
   - Each note: author, body (text or voice clip), created_at, status (open / resolved).
   - Reply chain underneath each note. Replies support text OR voice recording (reuse existing `audio commentary` recorder pattern; upload to `marketing-gallery` or a new `exec-support-audio` bucket).
   - Realtime updates so a new reply appears without refresh.

b. **Scripts**
   - Repository of conversation scripts. Each script: title, scenario, body (rich text), tags.
   - Comment thread per script encouraging advice (same text/voice reply primitive as Thought Wall).
   - Linked **Message Templates** panel: pulls from existing `quick_messages` (Staff → Templates), but only those an admin has starred as "investor visible". Investors see them read-only as examples of tone.

c. **Workflow**
   - Same primitive as Scripts: title, description, ordered steps, comment thread.

**Staff side changes:**
- `QuickMessageSection` (templates): add a star/favourite toggle per template — column `show_on_investor_portal boolean default false` on `quick_messages`.
- Admin-only toggle.

**DB (new tables):**
- `exec_support_categories` (kind: 'note' | 'script' | 'workflow') — or three lean tables, prefer one `exec_support_items` with `kind` + `metadata jsonb` for steps/tags.
- `exec_support_replies` (item_id, author_type, author_id, body_text, audio_url, created_at).
- `quick_messages.show_on_investor_portal` column.
- RLS: read = active investor session OR admin; write = admin OR active investor (notes/replies only). Voice uploads via service-role edge function (mirror `investor-overview-write` pattern).

**Edge function:** `exec-support-write` for create/reply/upload-audio actions, auth via investor session token (like `investor-overview-write`).

## 4. Investors Portal — Capacity (under Operations)

New section beneath the existing Time Management + Priorities cards.

**Data model:**
- `investor_capacity_settings` — one row: `mode` ('week' | 'day'), `weekly_hours_total int`, `daily_hours jsonb` ({mon:8, tue:8,...}), `max_youth_per_player_hours numeric`, `max_pro_per_player_hours numeric`.
- `investor_capacity_allocations` — `id`, `time_item_id` (FK to `investor_time_items`), `player_type` ('youth' | 'pro'), `hours_per_week numeric`, `day_of_week` nullable (when mode = day).

**UI:**
- Big horizontal cylinder/bar at the top of the section showing:
  - filled portion = currently allocated hours
  - dashed marker = projected (allocations × players)
  - end cap = maximum capacity
  - legend with totals + "Players you can support: N youth / M pro"
- Toggle: **Week ↔ Day**. Day view shows 7 mini cylinders (one per weekday) with per-day allocations and per-day max.
- Below the cylinder: two columns "Youth Player" and "Pro Player". Admin can drag tasks from a left-hand picker (sourced from `investor_time_items`) into either column and set hours per task per week (or per day).
- Compute capacity:
  - `hours_per_player_youth = sum(youth allocations)` ; `players_youth = floor(weekly_hours_total / hours_per_player_youth)` (same for pro).
  - When mixing, show a small calculator: "If 60% youth / 40% pro → x youth + y pro".
- Investors see read-only view; admin sees edit controls (reuse `getAdminUser` pattern).

**Edge function:** extend `investor-overview-write` with `upsertCapacitySettings`, `upsertCapacityAllocation`, `deleteCapacityAllocation`.

## 5. Out of scope (this turn)
- Restyling Time Management / Priorities cards themselves
- Voice-note transcription
- Investor-facing notifications for new Thought Wall replies (future)

## Technical summary

New files:
- `src/components/investor/ExecutiveSupportSection.tsx`
- `src/components/investor/ThoughtWall.tsx`
- `src/components/investor/ScriptsPanel.tsx`
- `src/components/investor/WorkflowPanel.tsx`
- `src/components/investor/CapacityPlanner.tsx`
- `src/components/investor/CapacityCylinder.tsx`
- `supabase/functions/exec-support-write/index.ts`
- migration: `exec_support_items`, `exec_support_replies`, `investor_capacity_settings`, `investor_capacity_allocations`, `quick_messages.show_on_investor_portal`, `player_operating_profile_translations` (cache).

Edited:
- `src/components/staff/QuickMessageSection.tsx` (star toggle)
- `src/components/staff/FocusedTasksSection.tsx` (hide Player Networking for stats_updater)
- `src/components/staff/PlayerOutreach.tsx`, `VideoAnalysis.tsx`, `AnalysisManagement.tsx` (scope filters)
- `src/pages/PerformanceReport.tsx` (deep-link guard)
- `src/components/portal/operatingProfileQuestions.ts` + `OperatingProfileDialog.tsx` (auto-translate)
- `src/pages/InvestorsPortal.tsx` (mount Executive Support category, Capacity section)
- `supabase/functions/investor-overview-write/index.ts` (capacity actions)
