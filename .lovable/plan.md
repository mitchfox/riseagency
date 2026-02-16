

# Implementation Plan

This plan covers 10 features across the portal, staff, and infrastructure layers. Work is grouped into logical batches.

---

## 1. Goal Tracking on Portal Comparisons Section

**Where:** `src/components/portal/AnalysisComparisons.tsx`

**What:**
- Add a "Goals" sub-tab alongside the existing Percentile and Player Comparison tabs
- Players can set numeric targets for any metric already in the comparisons system (goals per game, assists per game, etc.)
- Each target shows current average (from fixture_stats) vs target, with a progress bar
- Targets stored in a new `player_goals` database table

**Database:**
- New table `player_goals` with columns: `id`, `player_id` (text), `metric_key` (text), `target_value` (numeric), `created_at`, `updated_at`
- RLS: players can read/write their own goals

---

## 2. Injury Log on Portal Programming Section

**Where:** `src/pages/Dashboard.tsx` (within the `physical` tab content)

**What:**
- Add an "Injury Log" accordion section below the existing programming content
- Simple timeline UI: date, body area, description, severity (minor/moderate/severe), status (active/recovered)
- Players can add new entries and mark existing ones as recovered
- Staff can view these in the Athlete Centre programming tab

**Database:**
- New table `player_injury_log` with columns: `id`, `player_id` (text), `date` (date), `body_area` (text), `description` (text), `severity` (text), `status` (text, default 'active'), `created_at`
- RLS: players can CRUD their own entries; staff can read all

---

## 3. Global Search with Promise.all

**Where:** `src/pages/Staff.tsx` -- `performGlobalSearch` function (lines ~317-613)

**What:**
- Refactor all sequential `await supabase.from(...)` calls into a single `Promise.all([...])` block
- Currently there are ~12 sequential queries; running them in parallel will make search 3-4x faster
- No UI changes needed, purely a performance improvement

---

## 4. Activity Log in Admin and Legal

**Where:** New component `src/components/staff/ActivityLog.tsx`, registered in `Staff.tsx`

**What:**
- New section under Admin and Legal, visible only to admins
- Displays a chronological feed of staff actions: who did what and when
- Each entry shows: timestamp, staff email, action type (created/updated/deleted), entity type (player, analysis, report, etc.), entity name
- Filter by action type, staff member, and date range
- Uses the existing `audit_log_entries` table (already exists but appears empty/unused) or a new `staff_activity_log` table

**Database:**
- New table `staff_activity_log` with columns: `id`, `user_id` (uuid), `user_email` (text), `action` (text), `entity_type` (text), `entity_id` (text), `entity_name` (text), `details` (jsonb), `created_at`
- RLS: only admins can read
- Edge function or client-side helper to log actions from key operations (creating reports, editing players, etc.)

**Sidebar:** Add `{ id: 'activitylog', title: 'Activity Log', icon: ClipboardList }` to the admin section, gated behind `isAdmin`

---

## 5. Deeper Sidebar Filter / Global Search

**Where:** `src/pages/Staff.tsx` -- the sidebar filter logic (line ~971-976)

**What:**
- Currently the sidebar `searchQuery` only filters section titles
- Extend it to also search within section descriptions and content keywords
- Add a keyword map per section (e.g., "coaching" section maps to keywords like "drills", "sessions", "exercises", "database")
- When sidebar filter is active, matching sections highlight and non-matching ones dim rather than disappear entirely
- Typing in the sidebar filter also triggers the global search dialog if the query is 3+ characters, showing a "See all results" link

---

## 6. Video Analysis Section on Coaching

**Where:** New component `src/components/staff/coaching/VideoAnalysis.tsx`, registered in `Staff.tsx`

**What:**
- New section under Coaching in the sidebar
- Upload or link match footage (stored in `analysis-videos` bucket)
- Video player with timestamp annotations: click to add a note at the current timestamp
- Annotations stored as JSONB array: `[{ timestamp: 45.2, text: "Good pressing trigger", action_type: "pressing" }]`
- Each annotation can be linked to a performance report action
- Filter annotations by action type
- Click an annotation to jump to that timestamp in the video

**Database:**
- New table `video_analyses` with columns: `id`, `title` (text), `video_url` (text), `player_id` (text, nullable), `match_date` (date, nullable), `opponent` (text, nullable), `annotations` (jsonb, default '[]'), `created_by` (uuid), `created_at`
- RLS: staff can CRUD

**Sidebar:** Add `{ id: 'videoanalysis', title: 'Video Analysis', icon: Film }` to the coaching category

---

## 7. Periodisation Planner on Athlete Centre

**Where:** `src/components/staff/AthleteCentre.tsx` -- add new tab

**What:**
- New "Periodisation" tab on the Athlete Centre, positioned between Long-Term Plan and Dev Focuses
- Visual macro/meso/micro cycle planner: a horizontal timeline showing training phases
- Each phase block has: name, start/end dates, type (pre-season, in-season, recovery, etc.), colour coding
- Drag to resize phase duration
- Links to existing programming data for that player
- Simple implementation using a table/grid layout with coloured blocks

**Database:**
- New table `periodisation_plans` with columns: `id`, `player_id` (text), `phases` (jsonb -- array of phase objects with name, start_date, end_date, type, colour), `season` (text), `created_at`, `updated_at`
- RLS: staff can CRUD

---

## 8. Improved Offline Mode / Cache Manager

**Where:** `src/lib/cacheManager.ts`, `src/components/OfflineContentManager.tsx`, `src/components/staff/StaffOfflineManager.tsx`

**What:**
- Add TTL (time-to-live) support: cached items include a timestamp and are automatically refreshed when stale (e.g., 24 hours)
- Add selective sync: when coming back online, only fetch items that changed since last cache (using `updated_at` timestamps)
- Cache more aggressively for the portal: programs, exercises, schedules, cognisance content
- Add a "Last synced" indicator to the offline manager UI
- Add background sync: when online, silently update stale cache entries without blocking the UI
- Skip video files from caching (already done) but add PDF caching for analysis reports

**Changes:**
- Extend `CacheManager` with `setCachedWithTTL()` and `isCacheStale()` methods
- Add `lastSyncedAt` tracking per category
- Update `downloadForOffline` to batch fetch with `Promise.all` for faster downloads
- Add `syncStaleContent()` method that checks `updated_at` against last sync time

---

## 9. Database Backup/Export in Admin and Legal

**Where:** New component `src/components/staff/DatabaseExport.tsx`, registered in `Staff.tsx`

**What:**
- New section under Admin and Legal, admin-only
- "Export All Data" button that fetches all tables and downloads as a ZIP containing CSV files
- Category-based export options:
  - Players (players, player_analysis, player_programs)
  - Coaching (coaching_drills, coaching_sessions, coaching_exercises, coaching_concepts)
  - Financial (invoices, expenses, payments, tax_records)
  - Scouting (scouting_reports, prospects)
  - Marketing (marketing_campaigns, blog_posts)
  - Legal (legal_documents, contracts)
  - Network (club_network_contacts)
- Uses the `jszip` package (already installed) to create ZIP files
- Uses `jspdf` (already installed) for optional PDF summary reports
- Progress indicator during export

**Sidebar:** Add `{ id: 'dataexport', title: 'Data Export', icon: Download }` to the admin section, gated behind `isAdmin`

---

## 10. Summary of Staff.tsx Sidebar Changes

The sidebar categories will be updated as follows:

**Coaching category** gains:
- `videoanalysis` -- Video Analysis (new section)

**Admin and Legal category** gains:
- `activitylog` -- Activity Log (admin-only)
- `dataexport` -- Data Export (admin-only)

**Expanded section type** union updated to include: `'videoanalysis' | 'activitylog' | 'dataexport'`

---

## Technical Details

### New Database Tables (5 total)
1. `player_goals` -- player target tracking
2. `player_injury_log` -- injury/availability timeline
3. `staff_activity_log` -- admin audit trail
4. `video_analyses` -- timestamped video annotations
5. `periodisation_plans` -- macro/meso/micro cycle planning

### New Components (4 total)
1. `src/components/staff/ActivityLog.tsx`
2. `src/components/staff/coaching/VideoAnalysis.tsx`
3. `src/components/staff/DatabaseExport.tsx`
4. `src/components/portal/GoalTracking.tsx`

### Modified Files
- `src/pages/Dashboard.tsx` -- injury log in programming section, goal tracking import
- `src/pages/Staff.tsx` -- Promise.all search, new sidebar sections, deeper filter
- `src/components/portal/AnalysisComparisons.tsx` -- goal tracking tab
- `src/components/staff/AthleteCentre.tsx` -- periodisation tab, injury log view
- `src/lib/cacheManager.ts` -- TTL, stale sync, background refresh
- `src/components/OfflineContentManager.tsx` -- last synced indicator
- `src/components/staff/StaffOfflineManager.tsx` -- improved UI

### Execution Order
1. Database migrations (all 5 tables + RLS policies)
2. Goal tracking + Injury log (portal features)
3. Promise.all search refactor + deeper sidebar filter
4. Activity log + Database export (admin features)
5. Video Analysis section (coaching)
6. Periodisation planner (athlete centre)
7. Offline mode improvements (cache manager)

