

# Fix Notifications, Complete Unfinished Features, and Polish

This plan addresses all the outstanding issues: broken notifications, missing marketing notification category, the page transition recorder, and several other items that were previously promised but not fully delivered.

---

## 1. Fix Staff Notifications (Not Receiving Anything)

**Root cause**: The database has trigger functions defined (`log_form_submission_notification`, `log_playlist_change_notification`, `log_clip_upload_notification`, `log_site_visit_notification`) but **no actual triggers are attached to the tables**. Site visitor notifications work because they are inserted directly by the `track-visit` edge function, not via a trigger.

**Fix**:
- Create database triggers connecting the existing functions to their tables:
  - `site_visits` INSERT -> `log_site_visit_notification()`
  - `form_submissions` INSERT -> `log_form_submission_notification()`
  - `playlists` INSERT/UPDATE/DELETE -> `log_playlist_change_notification()`
  - `players` UPDATE (for highlights/clips) -> `log_clip_upload_notification()`

- Add `performance_improvement` to the `CATEGORY_CONFIG` in `StaffNotificationsDropdown.tsx` so it appears with a proper label and icon when inserted
- Add `contract_signed`, `comparison_request`, and `player_birthday` to `CATEGORY_CONFIG` as well - these event types exist in the database but have no display configuration

---

## 2. Add Marketing Performance Improvement Notification

**Current state**: The code in `CreatePerformanceReportDialog.tsx` already inserts `performance_improvement` events, but the `StaffNotificationsDropdown` doesn't recognise the event type (falls through to "Other" with a generic bell icon).

**Fix**:
- Add to `CATEGORY_CONFIG`:
  - `performance_improvement` with label "Performance Improvements" and a trending-up icon
  - `contract_signed` with label "Contracts Signed"
  - `comparison_request` with label "Comparison Requests"
  - `player_birthday` with label "Player Birthdays"
- Update `getNotificationBody` to render improvement data nicely (showing the R90 change and stat improvements)

---

## 3. Fix Page Transition Shader Recording

**Current state**: The recorder in `DatabaseExport.tsx` uses the correct shader code from `ShaderAnimation`, but:
- Only records 75 frames (~2.5s) which is too short
- Does not include the Rise logo overlay that appears during the real transition
- May produce low quality output

**Fix**:
- Extend recording to 120 frames (4 seconds) to capture the full transition cycle
- Draw the Rise logo centred on the canvas at the appropriate timing (fade in at 0.4s, pulse at 0.8s, fade out at 1.3s) matching the real `PageTransition` component's animation timings
- Ensure the canvas resolution and shader parameters match the live component

---

## 4. Best Actions Video Player on Player Profile

**Current state**: Videos are `.webm` files from storage. The current implementation opens a modal with a raw video element. Videos take 30+ seconds to appear.

**Fix**:
- Add `preload="auto"` and remove the redundant `onLoadStart` -> `load()` call which may be causing a reload loop
- Pre-fetch the first video URL when the category button is clicked before opening the modal
- Add a loading spinner overlay while the video is buffering
- Keep the existing playlist navigation (Prev/Next, auto-advance on ended)

---

## 5. Remaining Items Previously Promised

### a. Activity Logger Coverage
Currently only logging report creation and player creation. Extend to:
- Report deletion and editing
- Player deletion
- Analysis creation/deletion
- Blog post creation/editing/deletion

### b. Video Compressor Performance
The existing video compressor likely uses a CPU-bound approach. Add a note/toast that compression can take several minutes for larger files, and consider adding a progress indicator or switching to a web worker approach.

### c. Kit Description Field for AI Player Detection
Already implemented in `AIPlayerDetection.tsx` as `kitDescription` state with localStorage persistence. No further changes needed.

### d. AI Player Detection - Previous Report Clips as Tags
Already implemented - the component fetches previous `performance_report_actions` clips for the selected player. No further changes needed.

---

## Technical Details

### Database Migration (SQL)
```text
-- Create triggers for existing trigger functions
CREATE TRIGGER trg_form_submission_notification
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_form_submission_notification();

CREATE TRIGGER trg_playlist_change_notification
  AFTER INSERT OR UPDATE OR DELETE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.log_playlist_change_notification();

CREATE TRIGGER trg_clip_upload_notification
  AFTER UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.log_clip_upload_notification();
```

(Site visit trigger is not needed as notifications are already inserted directly by the track-visit edge function.)

### Files to Modify
- `src/components/staff/StaffNotificationsDropdown.tsx` - Add missing event type categories and body formatters
- `src/components/staff/DatabaseExport.tsx` - Fix shader recorder (longer duration, logo overlay)
- `src/pages/PlayerDetail.tsx` - Fix video player loading (preload, spinner, remove reload loop)
- `src/lib/activityLogger.ts` - No changes needed (logger utility works, just needs more call sites)
- Various staff components - Add `logActivity()` calls for delete/edit operations

### Files Unchanged (Already Working)
- `src/components/staff/coaching/AIPlayerDetection.tsx` - Kit description, persistence, and previous clip tags all present
- `src/components/staff/CreatePerformanceReportDialog.tsx` - Performance improvement notification insert already works

