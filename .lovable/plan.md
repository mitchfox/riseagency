
Goal: fix the stuck Performance Report edit loader and make report clips load reliably again.

What I found
- The edit screen is still doing heavy, broad fetches on open. `CreatePerformanceReportDialog` kicks off multiple requests at once, and `fetchExistingData()` uses `select("*")` for both the report and all actions while the main UI is blocked behind `loadingData`.
- The current edit loader has no strong “fail open” path. If the core fetch stalls or becomes slow, the whole editor stays on the spinner.
- Clip playback is inconsistent across report viewers:
  - `ActionVideoPopup` uses direct `src`/`key`
  - `ClippedActionsPlayer` and `RankedActionsPlayer` still depend on ref/effect-driven source assignment
- In the editor load mapping, existing actions are reloaded without preserving `clip_start` / `clip_end`. That makes clip metadata fragile once a report is edited again.
- The latest report in the database already has 158 actions, all pointing to the same full match video URL, so the frontend must treat that as one reusable media source, not as many fresh loads.

Implementation plan

1. Unblock the Performance Report editor
- Refactor `fetchExistingData()` in `CreatePerformanceReportDialog.tsx` so only the truly blocking data controls `loadingData`.
- Fetch the report row and actions in parallel with narrow column selects instead of `select("*")`.
- Move non-essential fetches (fixtures, prior stats, ratings, club metadata) out of the blocking path so the editor can render as soon as the report core is ready.
- Add a hard error/empty state for edit mode so a failed fetch cannot leave a permanent spinner.

2. Preserve all clip timing data in edit mode
- When existing actions are mapped back into local state, include `clip_start` and `clip_end` alongside `video_url`.
- Audit save/update paths so editing a report never strips clip timing from already-exported actions.

3. Make report clip playback deterministic
- Rework `ClippedActionsPlayer.tsx` and `RankedActionsPlayer.tsx` to use a stable single-video-source flow for the full-match URL:
  - load the source once when the player opens
  - seek on clip changes
  - stop/advance using `clip_end`
  - do not rely on remount timing to attach the source
- Keep the player mounted around a single reusable `<video>` element per viewer session so the full match file is not reloaded over and over.

4. Reduce report query weight everywhere clips are shown
- In `PerformanceReport.tsx`, `PerformanceReportDialog.tsx`, and the editor fetch, replace `select("*")` on `performance_report_actions` with only the columns actually used for display/playback.
- This keeps large reports responsive and lowers the chance of “nothing loads” states.

5. Add playback-safe fallbacks
- If a clip has a `video_url` but the player cannot seek/play, show a clear per-clip error state instead of a blank player.
- Ensure dialogs used by video players include proper title/description markup so the current Radix dialog errors stop interfering with diagnostics.

6. Verification
- Test the currently failing report edit flow for the latest Luton draft report until it opens without hanging.
- Test:
  - edit existing report
  - open single action clip
  - open “all clips” player
  - open ranked/noted players
- Confirm the same full-match video is reused within a viewer session and clip changes only seek, not full-reload.
