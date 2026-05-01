# Fix three staff issues

## 1. Matthias Pieklak vs Beerschot — laggy clips

**Cause:** Every clip in this report (`analysis_id 2368ad7e-…`) is a real-time, client-recorded `.webm` file in `analysis-videos/clips/` with VP9 at 25–40Mbps and no faststart/keyframe control. Other reports use server-trimmed `.mp4` (or `.mp4#t=` ranges from the master file), which play smoothly. The Beerschot report fell back to `clientSideTrim` in `src/lib/clientClipExtractor.ts` because the server `trim-video-clip` call failed for that source video. The bitrate is so high and the format so unfriendly that the browser stutters trying to decode it, especially on mobile.

**Fix:**
- Force these specific clips to be re-trimmed by the server. Add a one-shot script/button path that, for each Beerschot action, re-runs `trim-video-clip` against the original source video used in Video Analysis (looked up via the matching `video_analysis_actions` clip, or from `clip_start`/`clip_end` if available) and replaces the `video_url` with the new MP4.
- Lower the client fallback bitrate from 25–40Mbps to a sane ~6–10Mbps and prefer H.264 (`video/mp4;codecs=avc1`) when supported, falling back to VP8 then VP9. H.264 is hardware-decoded everywhere; VP9 at 40Mbps is not.
- Surface a clearer error toast when the server trim fails so we don't silently produce a stuttery WebM.

For the Beerschot report specifically I'll run the server re-trim once after the code is in, so the user sees smooth playback immediately.

## 2. "This week" still shows Loris Mettler

**Cause:** `StaffAccountabilityOverview.tsx` (line 203) pulls fixtures for any player whose `representation_status` is `represented` **or** `mandated`. Loris Mettler is `mandated` (HamKam), so his upcoming match keeps appearing.

**Fix:** Restrict the "This week" fixtures query to `representation_status = 'represented'` only. `mandated` and other statuses will no longer drive the widget. (No change to the rest of the staff dashboard.)

## 3. The H1 (first half) button does nothing

**Cause:** The `is_first_half` flag exists only on the local React state in `CreatePerformanceReportDialog.tsx`. The column does **not** exist on `performance_report_actions` in the database, so:
- toggling H1 is never persisted,
- it has no effect on the live report,
- on reload the flag is lost.

The sort function `sortActionsChronologically` already knows how to use it (45–51 minute actions tagged `is_first_half=true` come before untagged actions at the same time), so once it persists end-to-end, ordering will work.

**Fix:**
1. **Migration:** add `is_first_half boolean not null default false` to `performance_report_actions`.
2. **Edit mode persistence:** include `is_first_half` in the insert/update payload when saving actions; load it when fetching.
3. **Live report ordering:** in the live performance report renderer, sort actions using the same chronological + first-half tiebreak rule (so an action at 45.30 marked H1 sorts before an action at 46.10 not marked, and any 45–51 min action *not* marked H1 is treated as second half). Apply this on every screen that lists actions for the report (action list, action-by-type dialog, navigation, etc.).
4. Keep the H1 button visible only for actions whose minute is between 45.00 and 51.00 (current behaviour).
5. After saving, the live and edit views should reflect the same ordering.

## Technical notes
- Files touched: `src/lib/clientClipExtractor.ts`, `src/components/staff/ReExtractClipsButton.tsx` (or a new one-shot for Beerschot), `src/components/staff/StaffAccountabilityOverview.tsx`, `src/components/staff/CreatePerformanceReportDialog.tsx`, the live performance report renderer (`src/components/PerformanceReportDialog.tsx` and any helpers reading actions for display), plus a new SQL migration for the `is_first_half` column.
- No schema changes needed for issues 1 and 2.
- For issue 1 I'll re-run server trims for the Beerschot report after deploy so the user sees smooth playback without manual action.
