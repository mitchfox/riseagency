

# Clip Persistence, Annotation Delivery, and Comparison Dropdown

## Overview

Three workstreams: (1) ensure clips are saved as independent storage files and original full videos can safely expire; (2) persist clip annotations to the database so they render on the portal; (3) replace the comparison player picker with a searchable dropdown and "request player" feature.

---

## 1. Clips as Independent Storage Files

### Problem
Currently, clips are stored as media fragment URLs (`video.mp4#t=10,20`) referencing the full source video. When the source video's 7-day `auto_delete_at` expires, the cleanup function deletes it from storage, breaking all clips that reference it.

### Solution
Create a new edge function `extract-clip` that:
- Receives `sourceVideoUrl`, `start`, `end`, and `clipId`
- Downloads the source video bytes for the relevant range (or full file if range requests aren't viable)
- Re-uploads just the clipped segment as a new file in the `analysis-videos` bucket under a clip-specific path (e.g. `clips/{clipId}.mp4`)
- Returns the new public URL for the independent clip file

When a clip is attached to a performance report (via `handleAttachClipToAction`, `handleExportToReport`, or `handleInsertNewActionWithClip`), the code will:
1. Call the `extract-clip` function to create an independent file
2. Store the returned URL (not a `#t=` fragment URL) in `performance_report_actions.video_url`
3. Leave the source `video_analyses` record and its `auto_delete_at` untouched so the full video is cleaned up as normal

**Why an edge function?** The source video may be hundreds of megabytes. Server-side extraction avoids downloading the full file to the browser. The edge function can use FFmpeg via WASM or, more practically, simply copy the full file to a new path and store the clip boundaries as metadata. Given edge function constraints, the pragmatic approach is:
- Copy the source file to `clips/{clipId}.mp4` in storage
- Store `#t=start,end` on the new URL so the browser only plays the segment
- The key difference: this copied file lives in `clips/` prefix and is never subject to `auto_delete_at` cleanup

The `cleanup_expired_video_analyses` database function will be updated to skip files in the `clips/` prefix.

### Data repair
- For the existing Kristiansund report actions (analysis_id `2b85f7ef-...`), the clip URLs already use `#t=` fragments correctly. These source videos need their clips extracted to independent files before the `auto_delete_at` (25 Feb) expires.

---

## 2. Annotation Persistence to Database

### Problem
Annotations on video analysis clips are stored in `localStorage` (`va_annotations_{clipId}`). This means they only exist on the staff member's browser and never reach the portal.

### Solution

**Database column**: Add a `clip_annotations` JSONB column to `performance_report_actions`. This stores the annotation elements array for each clip.

**Save flow**:
- When annotations are saved in `AnnotationEditor` (the `onSave` callback at line 1262), continue saving to `localStorage` for the editing workflow
- When a clip is attached to a report action (`handleAttachClipToAction`, `handleExportToReport`, `handleInsertNewActionWithClip`), read the `localStorage` annotations for that `clip_id` and include them in the database insert/update as `clip_annotations`

**Render flow on portal**:
- In `AnalysisVideoReports.tsx`, fetch `clip_annotations` alongside existing fields
- When playing a clip in the compilation modal, overlay an `AnnotationCanvas` (read-only, no interaction) on top of the video, passing the stored annotation elements
- The canvas uses `computeVisibleElements` to determine which annotations to show at the current playback time, relative to the clip start time
- This is the same rendering pipeline used in `VideoAnalysis.tsx` playback, ensuring visual parity

**Portal playback changes** (`AnalysisVideoReports.tsx`):
- Wrap the `<video>` element in a relative container
- Add `<AnnotationCanvas>` as an absolute overlay with `pointer-events: none`
- Feed it the `clip_annotations` elements and current video time via a `timeupdate` listener

---

## 3. Comparison Dropdown with Player Request

### Current state
`AnalysisComparisons.tsx` lines 158-185: pill buttons listing all comparison players for the position.

### Changes
- Replace the pill buttons with a searchable `Command`/`Popover` dropdown (already available as UI components)
- Selected players appear as removable badges below the dropdown
- Below the dropdown, add a "Can't find a player? Request one" link
- Clicking it opens a small dialog with a single text input for the player name
- On submit, insert a row into `staff_notification_events` with `event_type: 'comparison_request'`, `title: 'Player Request'`, `body: '{playerName}'`, and relevant `event_data`
- No database migration needed; reuses existing table

---

## Technical Details

### New edge function
`supabase/functions/extract-clip/index.ts`
- Accepts POST with `{ sourceUrl, clipId }`
- Downloads the source video from the `analysis-videos` bucket
- Re-uploads to `analysis-videos/clips/{clipId}.mp4`
- Returns new public URL

### Database migration
```sql
ALTER TABLE performance_report_actions
ADD COLUMN clip_annotations jsonb DEFAULT NULL;
```

### Updated database function
Update `cleanup_expired_video_analyses` to NOT delete storage objects whose path starts with `clips/`.

### Files to modify

| File | Changes |
|------|---------|
| `supabase/functions/extract-clip/index.ts` | New edge function for copying source video to independent clip path |
| `supabase/config.toml` | Add `[functions.extract-clip]` with `verify_jwt = true` |
| `src/components/staff/coaching/VideoAnalysis.tsx` | In `handleExportToReport`, `handleAttachClipToAction`, `handleInsertNewActionWithClip`: call `extract-clip`, use returned URL, read localStorage annotations and include as `clip_annotations` |
| `src/components/portal/AnalysisVideoReports.tsx` | Fetch `clip_annotations` column. Add `AnnotationCanvas` overlay in the compilation modal video player. Wire `timeupdate` to drive annotation rendering. |
| `src/components/portal/AnalysisComparisons.tsx` | Replace pill buttons with searchable Command/Popover dropdown. Add "Request a player" dialog that inserts into `staff_notification_events`. |

### Data fixes (via insert tool after implementation)
1. Clear `auto_delete_at` on the video analyses linked to the Kristiansund report so existing clips survive until the extraction flow is live
2. Once the extract-clip function is deployed, run extraction for existing report actions that still use `#t=` fragment URLs on source videos

