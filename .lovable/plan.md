

## Notification System Diagnosis

### The Problem

The notifications system has two layers, and most event types are completely missing their insertion logic:

**Working (have DB triggers inserting into `staff_notification_events`):**
- `visitor` - trigger `trigger_site_visit_notification` on `site_visits`
- `form_submission` - trigger `trg_form_submission_notification` on `form_submissions`
- `clip_upload` - trigger `trg_clip_upload_notification` on `players` (highlights change)
- `playlist_change` - trigger `trg_playlist_change_notification` on `playlists`

**Working (have manual JS inserts):**
- `contract_signed` - inserted from `SignContract.tsx`
- `comparison_request` - inserted from `AnalysisComparisons.tsx`
- `performance_improvement` - inserted from `CreatePerformanceReportDialog.tsx`
- `player_birthday` - inserted via the daily cron edge function

**Completely missing (no trigger, no JS insert, nothing):**
- `portal_login` - no code inserts this when a player logs in
- `portal_performance_view` - no code inserts this when a player views reports
- `portal_analysis_view` - no code inserts this when a player views analysis
- `portal_transfer_submission` - no code inserts this when a transfer hub submission happens
- `portal_club_submission` - no code inserts this for club suggestions
- `calendar_event` - no insert logic
- `task_assigned` / `task_completed` - no insert logic
- `goal_added` - no insert logic

Additionally, the `useStaffNotifications` hook (which listens via realtime and calls the `notify-staff` edge function for web push) requires the browser tab to be open with the staff page loaded. If nobody has the staff page open, those realtime-based push notifications never fire. The DB triggers are the reliable path since they run server-side regardless.

### Plan

#### 1. Add notification inserts for portal activity

Insert `staff_notification_events` rows from the player-facing pages:

- **`Login.tsx`**: After a player successfully logs in, insert a `portal_login` event with the player's name
- **`Dashboard.tsx`**: When performance reports tab is viewed, insert `portal_performance_view`. When analysis tab is viewed, insert `portal_analysis_view`
- **`Dashboard.tsx` (Transfer Hub)**: When a transfer hub submission happens, insert `portal_transfer_submission`
- **`Dashboard.tsx` (Club suggestion)**: If there is a club suggestion flow, insert `portal_club_submission`

Each insert will include the player name and relevant metadata in `event_data`.

#### 2. Add notification inserts for staff actions

- **Goal tracking**: When a goal is created, insert `goal_added`
- **Task system**: When a task is assigned or completed, insert the corresponding event (if these features exist in the codebase)
- **Calendar**: When an event is created, insert `calendar_event` (if the calendar supports creation)

#### 3. Deduplicate portal view notifications

To avoid spamming (e.g. a player refreshing their portal 10 times), add a simple guard: only insert a `portal_login` or view event if there isn't already one from the same player within the last hour. This can be done with a quick select before insert.

### Files to modify

- `src/pages/Login.tsx` - add `portal_login` notification insert
- `src/pages/Dashboard.tsx` - add `portal_performance_view`, `portal_analysis_view`, `portal_transfer_submission`, `portal_club_submission` inserts at the relevant interaction points
- Potentially other component files depending on where goal/task/calendar creation happens

### Technical detail

All inserts use the existing pattern:
```typescript
await supabase.from('staff_notification_events').insert({
  event_type: 'portal_login',
  title: 'Portal Login',
  body: `${playerName} logged in`,
  event_data: { player_name: playerName, player_id: playerId }
});
```

No database changes needed - the `staff_notification_events` table already accepts any `event_type` string and the dropdown UI already handles all these categories.

