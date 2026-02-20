

# Client-Side Clip Extraction, Data Repair, and Portal Playback Fix

## The Problem

1. The `extract-clip` edge function has **never worked** (auth uses non-existent `getClaims`), so clips fall back to `#t=` fragment URLs on the full source video. The portal plays the entire file, not just the clip.
2. Even if it did work, it copies the **entire source video** (500MB+) to `clips/` -- wasteful and defeats the purpose.
3. Existing Kristiansund, Barcelona, and Bilbao report actions all point to full source video URLs with `#t=` fragments (or no fragments at all for some Barcelona actions).

## The Fix

### 1. Client-side clip trimming (replace the edge function approach)

Replace `extractClipFile` in `VideoAnalysis.tsx` with a client-side function that uses the **same canvas + MediaRecorder pattern** already working in `VideoTrimmerDialog.tsx`:

- Create an offscreen `<video>` element, seek to `clip.start`
- Use a `<canvas>` + `MediaRecorder` to capture frames from `start` to `end`
- Capture audio via `AudioContext.createMediaElementSource`
- Result: a small webm blob (2-5MB for a 10s clip vs 500MB+ for the full file)
- Upload to `analysis-videos/clips/{clipId}.webm`
- Store the clean public URL (no `#t=` fragment needed) in `performance_report_actions.video_url`

This runs entirely in the browser. No edge function needed for clip extraction.

### 2. Portal playback fix

In `AnalysisVideoReports.tsx`, since clips are now independent small files, the video simply plays the whole file. Add the `loop` attribute so clips repeat. For any legacy `#t=` URLs that haven't been migrated yet, parse the fragment and enforce boundaries via `onTimeUpdate` + `onLoadedMetadata` as a fallback.

### 3. Data repair for existing reports

After deploying the code changes, run the client-side extraction on all existing report actions for:
- **Loris Mettler vs Kristiansund** (analysis `2b85f7ef`): 20 actions across 2 source videos
- **Cristiano Ronaldo vs FC Barcelona** (analyses `9bf728f5` and `0d632a2b`): ~30 actions from 1 source video
- **Cristiano Ronaldo vs Athletic de Bilbao** (analysis `a0c73ad7`): actions from its source video

Since I cannot run client-side trimming from here, I will add a **one-off "Re-extract clips" button** visible to staff on the performance report editor. Clicking it will loop through all actions with non-`clips/` URLs, trim each one client-side, upload to `clips/`, and update the database. Once run on these reports, the button can be removed in a follow-up.

### 4. Cleanup safety

The existing `cleanup_expired_video_analyses` database function already skips files in the `clips/` prefix (updated in the previous migration). Source videos with `auto_delete_at` will still be cleaned up as normal. Clips in `clips/` prefix persist forever.

### 5. Delete the broken edge function

Remove `supabase/functions/extract-clip/index.ts` and its config entry. It is no longer needed.

---

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/components/staff/coaching/VideoAnalysis.tsx` | Replace `extractClipFile` with client-side canvas+MediaRecorder trim. Upload blob to `clips/{clipId}.webm`. All three attachment functions (`handleExportToReport`, `handleAttachClipToAction`, `handleInsertNewActionWithClip`) use this new function. Add a "Re-extract clips" utility for migrating existing data. |
| `src/components/portal/AnalysisVideoReports.tsx` | Add `loop` attribute to video player. Add fallback `#t=` boundary enforcement for legacy URLs. |
| `supabase/functions/extract-clip/index.ts` | Delete this file |
| `supabase/config.toml` | Remove `[functions.extract-clip]` entry |

### Client-side trim function (core logic)

```text
async function trimAndUploadClip(sourceUrl, clipId, start, end):
  1. Create offscreen <video> with src = sourceUrl (stripped of any #t=)
  2. Wait for loadedmetadata
  3. Create <canvas> matching video dimensions
  4. Seek video to start, wait for seeked event
  5. Set up MediaRecorder on canvas.captureStream(30)
  6. Capture audio via AudioContext if available
  7. Start recording, play video
  8. On each animationFrame: draw video to canvas
  9. When currentTime >= end: pause video, stop recorder
  10. Collect blob chunks into final webm blob
  11. Upload to supabase storage at clips/{clipId}.webm
  12. Return public URL (clean, no fragment)
```

### Storage impact

- 10s clip from a 500MB source: ~2-5MB (webm) instead of 500MB (full copy)
- Source videos continue their 7-day auto-delete cycle
- Clips in `clips/` prefix persist indefinitely

### Data migration approach

A temporary "Re-extract all clips" button on the performance report edit dialog will:
1. Query all actions for that report where `video_url` does NOT contain `/clips/`
2. For each action, parse the `#t=start,end` from the URL (or use the clip metadata)
3. Run the client-side trim function
4. Update the action's `video_url` to the new clean URL
5. Show progress (e.g. "Extracting clip 3/20...")

This needs to be run manually on the Kristiansund, Barcelona, and Bilbao reports.
