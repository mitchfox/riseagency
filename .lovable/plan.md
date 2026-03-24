
Goal: fix performance report clips so they play only the intended clip window in both Edit and View, and stop blaming export when the stored data is already correct.

What I verified
- The export is not storing “everything as the full video” by mistake. It is intentionally storing:
  - `video_url` = full match file
  - `clip_start` / `clip_end` = exact clip boundaries
- The latest Sandra Martins vs Luton report rows already contain valid timing data in the database.
- Both report View and dialog View do fetch `clip_start` / `clip_end` and pass them into the popup/player components.
- The actual problem is frontend playback:
  1. `useSharedClipPlayer.ts` is race-prone: it sets `currentTime` before attaching the `seeked` listener, so playback can miss the seek lifecycle and fall back to normal full-video behavior.
  2. The “shared player” is not truly shared at report level. `ActionVideoPopup`, `ClippedActionsPlayer`, and `RankedActionsPlayer` each create their own `useSharedClipPlayer()` instance, so there is still no single source of truth across the report.
  3. Edit “working” vs View “not working” is because they are using different viewer paths/components and timing behavior, not because export data differs.

Implementation plan

1. Fix the playback race in the shared clip hook
- Refactor `src/hooks/useSharedClipPlayer.ts` so clip playback is deterministic:
  - attach readiness/seek listeners before mutating `currentTime`
  - wait for `loadedmetadata` / `seeked` correctly
  - only call `play()` after the seek is confirmed
- Add hard guards for invalid clip windows (`clip_end <= clip_start`) and fail visibly instead of playing full match.

2. Make the report actually use one shared player per viewer
- Lift the shared player instance up into:
  - `src/pages/PerformanceReport.tsx`
  - `src/components/PerformanceReportDialog.tsx`
- Pass the player/controller into:
  - `src/components/ActionVideoPopup.tsx`
  - `src/components/ClippedActionsPlayer.tsx`
  - `src/components/report/RankedActionsPlayer.tsx`
- Remove per-component `useSharedClipPlayer()` creation so all clip actions in one report session control the same loaded video instance.

3. Enforce clip-only viewing instead of full-match behavior
- Keep the full match URL under the hood, but lock playback to the selected clip:
  - seek to `clip_start`
  - stop at `clip_end`
  - prevent playback from starting at 0:00
  - keep native controls off for clipped playback
  - expose only custom clip progress UI
- If no valid clip window exists, show a clear unavailable state instead of silently playing the full match.

4. Unify Edit and View behavior
- Ensure single-action popup, all-clips player, and ranked/noted player all use the same clip-control logic in both:
  - public report page
  - report dialog / portal view
- This removes the current “only opens on edit, never on view” inconsistency.

5. Keep timing preservation intact in the editor
- Retain the recent fixes in `src/components/staff/CreatePerformanceReportDialog.tsx` that preserve `clip_start` / `clip_end`.
- Audit refresh/save paths once more so editing a report cannot strip timing metadata and reintroduce fallback behavior.

6. Verify against the exact broken case
- Test the Sandra Martins vs Luton report specifically in:
  - Edit
  - View report page
  - Report dialog / portal view
- Confirm each clip:
  - opens in both edit and view
  - starts at its stored `clip_start`
  - stops at `clip_end`
  - never exposes kickoff or the full match timeline

Technical touchpoints
- `src/hooks/useSharedClipPlayer.ts`
- `src/pages/PerformanceReport.tsx`
- `src/components/PerformanceReportDialog.tsx`
- `src/components/ActionVideoPopup.tsx`
- `src/components/ClippedActionsPlayer.tsx`
- `src/components/report/RankedActionsPlayer.tsx`
- `src/components/staff/CreatePerformanceReportDialog.tsx`

Key conclusion
- I do not plan to change the export format first, because the stored report data is already correct.
- The proper fix is to repair playback architecture so the full match file is reused once but only the clip window is ever shown.
