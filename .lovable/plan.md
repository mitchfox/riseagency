
Goal: stop report clips behaving like full-match players, and make report edit load reliably.

What I found
- Your diagnosis is right: the report still uses separate player components that each own their own `<video>` and imperatively reassign `video.src` (`ActionVideoPopup`, `ClippedActionsPlayer`, `RankedActionsPlayer`). That architecture is exactly why playback leaks back to 0:00 and reloads unpredictably.
- The current players only enforce clip windows after load. They do not make the shared video itself the source of truth, so the browser still briefly behaves like a normal full-match player.
- The edit flow is still too heavy and fragile:
  - `fetchExistingData()` blocks the editor while doing extra work
  - `refreshActions()` still uses `select("*")`
  - `refreshActions()` drops `clip_start` / `clip_end`, so timing can be lost after refreshes.

Implementation plan

1. Replace per-component playback with a shared report clip player
- Create one shared report video controller at the report-view level and one at the report-dialog level.
- Mount exactly one reusable `<video>` element per viewer session for report clip playback.
- Keep one loaded source per match video URL and let actions call a shared `playClip({ videoUrl, clipStart, clipEnd, ... })` function instead of owning their own video element.
- For reports containing a single full-match URL across many actions, this means load once, then seek only.

2. Convert clip UIs into controllers, not video owners
- Refactor `ActionVideoPopup`, `ClippedActionsPlayer`, and `RankedActionsPlayer` so they become UI shells around the shared player state instead of each assigning `vid.src`.
- Remove repeated `video.src` assignment logic from those components.
- If a clip belongs to the currently loaded source, only:
  - pause
  - seek to `clip_start`
  - play
  - stop at `clip_end`
- If the source changes, swap once in the shared parent, then reuse again for all clips on that source.

3. Enforce true clip-only playback
- Keep native controls off for clipped playback everywhere.
- Clamp seeking at the shared-player level, not separately in three components.
- Only expose a custom progress bar based on clip duration, never the full match timeline.
- Add a strict stop/reset rule at `clip_end` so the user cannot drift before or after the clip window.

4. Fix the edit loader and preserve timing metadata
- Refactor `fetchExistingData()` so only the core report row + action list block the editor.
- Fetch those with narrow selects in parallel, and move non-essential fixture/stat lookups out of the blocking path.
- Update `refreshActions()` to select explicit columns and preserve `clip_start` / `clip_end`.
- Add a fail-open error state so edit mode cannot sit on a permanent spinner.

5. Reduce query and player duplication across report views
- Reuse the same shared-player approach in both:
  - `src/pages/PerformanceReport.tsx`
  - `src/components/PerformanceReportDialog.tsx`
- Keep action queries narrow everywhere actions are loaded for playback/editing.

6. Verification
- Test the known broken Sandra Martins vs Luton case specifically.
- Confirm:
  - edit screen opens without endless spinner
  - single clip opens at the correct start
  - all-clips player advances clip to clip without reloading the full match each time
  - ranked/noted player uses the same loaded source
  - no clip ever exposes the full match timeline or starts from kickoff unless it truly has no clip window

Technical touchpoints
- `src/pages/PerformanceReport.tsx`
- `src/components/PerformanceReportDialog.tsx`
- `src/components/ActionVideoPopup.tsx`
- `src/components/ClippedActionsPlayer.tsx`
- `src/components/report/RankedActionsPlayer.tsx`
- `src/components/staff/CreatePerformanceReportDialog.tsx`
