
Audit findings:
- Transfer report editing is only partially done. Some per-stat toggles exist, but not for all requested items. Comparison player selection exists only in the top settings panel, not as an easy inline picker. Section reordering is not implemented. Corner rounding is still inconsistent. Some gold styling is using invalid dynamic Tailwind strings, so it will not reliably render as Rise Gold.
- Existing staff accounts still have no name edit UI. `StaffAccountManagement.tsx` only allows phone, role, reset password and delete.
- Analysis editor preview mode is still not implemented. `AnnotationEditor.tsx` still loads as a live video player and toggles playback directly on the video.
- The annotation drift is very likely timing-related, not size-related. Two concrete causes are visible in code:
  1. `computeVisibleElements()` shows annotations up to 0.25s early, which is enough to make moving annotations look misplaced.
  2. `ReadOnlyAnnotationOverlay.tsx` is using a broken `__clipStartTime` path that is never set, so clip-relative timing is not reliable.
  3. `AnnotationEditor.tsx` captures `drawingTimestamp` from `video.currentTime` without waiting for the exact displayed frame after seek/pause, so the saved annotation time can be slightly off from the frame the user thinks they paused on.

Implementation plan:

1. Fix annotation timing at the source
- In `src/lib/annotationRenderUtils.ts`, remove the built-in 0.25s early-visibility tolerance from normal rendering.
- Split “exact visibility” from “group freeze/reveal” logic so playback uses exact `appearAt`, while freeze batching still works separately if needed.
- Keep all viewers and export using the same exact timing path.

2. Lock annotation capture to the exact paused frame
- In `src/components/staff/annotations/AnnotationEditor.tsx`, change seek/freeze flow so annotation mode only starts after the video has actually landed on the requested frame (`seeked` or `requestVideoFrameCallback`).
- When opening from analysis editor with `initialSeekTime`, wait for the seek to settle before setting `drawingTimestamp`.
- When entering drawing mode, capture the displayed frame first, then store that exact media time as the annotation timestamp.
- This removes the “I paused here but the annotation saved slightly earlier/later” problem.

3. Fix read-only annotation playback alignment everywhere
- In `src/components/portal/ReadOnlyAnnotationOverlay.tsx`, stop relying on `__clipStartTime`.
- Pass real clip-relative timing in explicitly from the player, or parse the clip start consistently from the playback source.
- Update `AnalysisVideoReports.tsx` and any annotation-enabled popup/player to provide the correct clip start context so saved annotation times line up with the actual clip frame.
- Recheck fullscreen playback after this so the same timing/render path is used in normal and fullscreen states.

4. Add analysis editor preview mode
- In `src/components/staff/annotations/AnnotationEditor.tsx`, switch the default experience to a poster/preview frame.
- The clip should stay paused until clicked, then play on loop until clicked again.
- Keep annotation tools and frame stepping intact once the user starts editing.
- If needed, adjust the caller in `src/components/staff/analysis/AnalysisPointsSection.tsx` so it opens into this paused-preview state consistently.

5. Finish transfer report improvements
- In `src/pages/TransferReportView.tsx`:
  - increase corner rounding on highlights, biography, profile and similar content cards
  - extend individual visibility toggles to the remaining requested items: specific recent-form matches, specific strengths/play-style items and any remaining stat rows
  - move comparison-player changing into the comparison section itself so it is easy to swap players there while editing
  - add up/down reorder buttons beside the section visibility controls in `SectionEditWrapper`
  - replace invalid dynamic Tailwind gold classes with inline styles or valid class tokens so every gold accent uses exact Rise Gold `#C6A332`

6. Add existing staff account name editing
- In `src/components/staff/StaffAccountManagement.tsx`, add inline editing for `profiles.full_name` on existing accounts, matching the current phone edit pattern.
- Keep it admin-only and refresh the list after save.
- This will give you a proper edit path on existing staff accounts rather than only during account creation.

Files to update:
- `src/lib/annotationRenderUtils.ts`
- `src/components/staff/annotations/AnnotationEditor.tsx`
- `src/components/portal/ReadOnlyAnnotationOverlay.tsx`
- `src/components/portal/AnalysisVideoReports.tsx`
- `src/components/staff/analysis/AnalysisPointsSection.tsx`
- `src/pages/TransferReportView.tsx`
- `src/components/staff/StaffAccountManagement.tsx`

Validation after implementation:
- Compare the paused frame in the analysis editor against the saved annotation frame and verify there is no visible drift
- Verify the same annotation sits in the same place in editor, normal playback and fullscreen playback
- Check moving/keyframed annotations specifically, since they are most sensitive to timing errors
- Test transfer report editing end to end: hide/show single stats, swap comparison players, reorder sections, confirm rounding and confirm all gold is exact Rise Gold
- Test editing an existing staff account name and confirm the update persists on reload
