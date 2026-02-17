

# Migrate Site-Wide Local Storage Data to the Database

## The problem

Across the entire site, important data is being saved in the browser's local storage instead of the database. This means if you clear your browser, switch devices, or use a different browser, the data is gone. Here is everything currently at risk.

## Full audit of localStorage usage

### Data that MUST be migrated (would be lost if browser is cleared)

| Feature | localStorage key(s) | What it stores |
|---|---|---|
| Annotation Projects | `annotation_projects_v3` | Full project data with klips and elements |
| Video Analysis Annotations | `va_annotations_{clipId}` | Per-clip annotation data |
| Design Studio | `design_projects`, `design_folders` | Design projects with elements, folders |
| Tactics Board Templates | `tactics_board_templates` | Saved tactics board templates |
| Ideas and Notes | `ideas_notes` | Staff notes and ideas |
| Kanban Board | `kanban_items` | To-do/doing/done task items |
| Priority Matrix | `priority_matrix_items` | Prioritised task items |
| Daily Habits | `daily_habits_{date}` | Daily habit checklists (per day) |
| AI Chat Settings | `coaching_ai_settings` | Writing style, personality, banned phrases |
| Streams Credentials | `streams_credentials` | Social media login credentials |
| Dashboard Widget Layout | `staff_overview_{userId}` | Widget positions and visibility |
| Staff Pinned Sections | `staff_pinned_sections` | Which sidebar sections are pinned |
| Staff Open Tabs | `staff_open_tabs` | Which tabs are open |

### Data that SHOULD stay in localStorage (UI preferences, caches, session tokens)

These are either temporary, device-specific, or caches that regenerate themselves:

- `preferred_language` -- device-specific preference
- `landing-static-mode` -- device performance preference
- `devMode` -- development toggle
- `intro-modal-seen` -- one-time modal flag
- `col-widths-*` -- column width preferences (device-specific)
- `streams_active_tab`, `streams_expanded` -- UI state
- `annotation-recent-colours` -- colour palette preference
- `staff_email`, `staff_user_id` -- session tokens (set after login)
- `player_email`, `scout_email` -- session tokens
- `player_saved_email`, `scout_saved_email` -- remember-me convenience
- `staff_saved_email`, `staff_remember_me` -- remember-me convenience
- `translation_*`, `stat_desc_*` -- translation caches
- `APP_VERSION`, `LAST_CHECK` -- version management

## Safety approach

Your concern about data loss is completely valid. The migration will follow this pattern for every feature:

1. Create the database table first
2. On first load, check if localStorage has data
3. If yes, write it to the database
4. Only clear localStorage after confirming the write succeeded
5. If the write fails, keep localStorage intact and show a warning
6. Going forward, read/write from the database only

## Plan

### Step 1 -- Create database tables

Seven new tables to cover all the data:

```text
staff_widget_data
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  widget_type    text (e.g. 'kanban', 'priority_matrix', 'ideas_notes', 'daily_habits')
  data_key       text (e.g. date string for daily habits, or 'default')
  data           jsonb
  created_at     timestamptz
  updated_at     timestamptz
  UNIQUE(user_id, widget_type, data_key)

annotation_projects
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  name           text
  video_url      text
  video_name     text
  klips          jsonb
  created_at     timestamptz
  updated_at     timestamptz

design_projects
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  name           text
  width          integer
  height         integer
  background     text
  elements       jsonb
  thumbnail      text
  folder_id      text
  created_at     timestamptz
  updated_at     timestamptz

design_folders
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  name           text
  color          text
  created_at     timestamptz

tactics_board_templates
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  name           text
  items          jsonb
  arrows         jsonb
  paths          jsonb
  created_at     timestamptz

staff_preferences
  id             uuid (PK)
  user_id        uuid (references auth.users, NOT NULL)
  preference_key text (e.g. 'overview_layout', 'pinned_sections', 'open_tabs', 'ai_chat_settings')
  value          jsonb
  updated_at     timestamptz
  UNIQUE(user_id, preference_key)
```

All tables get RLS policies: authenticated users can SELECT, INSERT, UPDATE, DELETE their own rows only. Staff/admin can view all rows.

### Step 2 -- Create a shared migration utility

A helper function used by all components:

```text
migrateFromLocalStorage(key, writeFn) =>
  1. Read localStorage[key]
  2. If data exists, call writeFn(data) to save to database
  3. If writeFn succeeds, remove localStorage[key]
  4. If writeFn fails, log warning and keep localStorage intact
```

### Step 3 -- Update each component

For each feature, the pattern is the same:
- Replace `localStorage.getItem` with a database fetch on mount
- Replace `localStorage.setItem` with a database upsert on save
- Add the one-time migration call on mount

**Files to update:**

1. `src/components/staff/annotations/AnnotationProjects.tsx` -- annotation projects
2. `src/components/staff/coaching/VideoAnalysis.tsx` -- per-clip annotations
3. `src/components/staff/design/DesignProjects.tsx` -- design projects and folders
4. `src/components/staff/coaching/TacticsBoard.tsx` -- tactics templates
5. `src/components/staff/widgets/IdeasNotesWidget.tsx` -- notes
6. `src/components/staff/widgets/KanbanWidget.tsx` -- kanban items
7. `src/components/staff/widgets/PriorityMatrixWidget.tsx` -- priority items
8. `src/components/staff/widgets/DailyHabitsWidget.tsx` -- daily habits
9. `src/components/staff/coaching/CoachingAIChat.tsx` -- AI chat settings
10. `src/components/staff/StaffOverview.tsx` -- widget layout preferences
11. `src/pages/Staff.tsx` -- pinned sections, open tabs
12. `src/components/staff/StreamsSection.tsx` -- streams credentials (these should absolutely be in the database, not localStorage)

### Step 4 -- Remove sharedSupabase client

Delete `src/integrations/supabase/sharedClient.ts` as it duplicates the main client and serves no distinct purpose.

### Step 5 -- Create a shared migration hook

A reusable `useCloudStorage` hook that wraps the fetch/save/migrate pattern so each widget doesn't need to repeat the same boilerplate.

## What stays in localStorage

- Language, performance mode, dev mode, intro modal -- device preferences
- Column widths -- device-specific layout
- Recent annotation colours -- minor UI preference
- Session tokens (player_email, staff_user_id etc.) -- login state
- Translation caches -- regenerate automatically
- Remember-me saved emails -- convenience, device-specific

## Order of work

The migration will be done in this sequence to minimise risk:

1. Create all database tables in a single migration
2. Build the shared migration utility/hook
3. Update widgets one at a time (smallest first: kanban, priority matrix, ideas, habits)
4. Update larger features (design studio, annotations, tactics board)
5. Update preferences (overview layout, tabs, AI settings, streams credentials)
6. Remove sharedSupabase client
7. Test each feature to confirm data persists across sessions

