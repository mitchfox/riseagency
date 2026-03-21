

## Plan: Fix Video Export Issues & Add Clip Selection

### Problems Identified

1. **Money burn on data calls**: `fetchVideos()` uses `select("*")` which pulls ALL data (annotations, clips JSON) for every video on every load. This is wasteful — the list view only needs metadata.

2. **Full video showing instead of clip**: When server-side trim fails, the fallback at line 147 of `backgroundExportService.ts` sets `clipUrl = \`\${job.videoUrl}#t=\${clip.start},\${clip.end}\`\``. The `#t=` fragment hint is unreliable — many players/browsers ignore it, so the full video plays. Additionally, client-side trim can also fail silently, and the catch block swallows the error.

3. **Specific exports failing (e.g. Bilbao leg 2)**: Likely caused by the server-side trim downloading the entire source video into memory (edge function RAM limit). Large or multi-part videos exceed the 200MB limit or timeout, and the client-side fallback also fails (CORS, timeout, or codec issues), causing every clip to error.

4. **No clip selection**: Currently exports ALL clips — no UI to pick which ones.

5. **Dedup only checks clip_id**: If a clip was exported then its details changed in video analysis, re-export is skipped because `clip_id` already exists. This is correct per user's request — skip if already on report regardless of changes.

### Changes

#### 1. Optimize data loading (reduce bandwidth/cost)
**File: `src/components/staff/coaching/VideoAnalysis.tsx`**
- Change `fetchVideos()` to use `select("id, title, video_url, player_id, match_date, opponent, auto_delete_at, created_at, match_minute_offset, second_half_offset, second_half_video_time, part_number, group_id, total_parts")` — exclude `annotations` and `clips` JSON blobs from the list query.
- Load `annotations` and `clips` only when a specific video is selected (on click), with a separate `select("annotations, clips")` call.
- This dramatically reduces the payload for the video list.

#### 2. Fix "full video instead of clip" bug
**File: `src/lib/backgroundExportService.ts`**
- Remove the fallback that sets `clipUrl` to the full video URL with `#t=` fragment. If trimming fails completely, mark the clip as `error` instead of silently inserting a link to the full video.
- Add a check: if the returned URL still contains the original video filename (not `clips/`), treat it as a failure.

**File: `src/lib/clientClipExtractor.ts`**
- Add a timeout to the client-side trim (e.g. 120s) so it doesn't hang indefinitely on large files.
- Add better error logging so failures are visible.

#### 3. Fix exports failing on specific videos
**File: `src/lib/backgroundExportService.ts`**
- Before attempting trim, check if a trimmed clip already exists in storage (`clips/{clipId}.mp4` or `.webm`). If it does, reuse the existing URL — skip re-trimming entirely.
- This handles retries efficiently and avoids re-downloading large source videos.

#### 4. Add clip selection UI to export dialog
**File: `src/components/staff/coaching/VideoAnalysis.tsx`**
- Add a `selectedClipIds` state (Set) in the export dialog.
- Show checkboxes next to each clip in the export dialog with select all/none toggle.
- Pre-check all clips by default; clips already on the report are shown as disabled/checked with "Already added" label.
- Only pass selected clips to `startExportJob()`.

#### 5. Skip clips already on report (pre-filter in UI)
**File: `src/components/staff/coaching/VideoAnalysis.tsx`**
- When a report is selected in the export dialog, fetch existing `clip_id` values from `performance_report_actions` for that report.
- Show those clips as greyed out / already exported in the selection list.
- Exclude them from the export job entirely (don't even send them to the background service).

### Summary of file changes
- `src/components/staff/coaching/VideoAnalysis.tsx` — optimize query, add clip selection UI, pre-filter existing clips
- `src/lib/backgroundExportService.ts` — remove dangerous `#t=` fallback, add storage existence check
- `src/lib/clientClipExtractor.ts` — add timeout guard

