
Implementation plan

1. Fix analysis editor spellcheck properly
- Audit every analysis text field that staff actually types into: title, overview, strengths, weaknesses, matchups, point paragraphs, scheme paragraphs and any rename fields inside the annotation workspace
- Add explicit browser text-entry attributes on those inputs and textareas instead of relying on shared defaults only: `spellCheck`, `autoCorrect`, `autoCapitalize`, sensible `lang`
- Check any fullscreen/dialog wrappers that may be preventing native spellcheck UI from appearing and apply the same attributes there

2. Correct comparison stat averaging for goalkeeper and legacy keys
- Rework the comparison aggregation path so it does not blindly average against rows with no usable stat payload for that metric
- Add stat-key normalisation/aliases for goalkeeper data, especially legacy keys such as `clean_sheets` vs `gk_clean_sheets`
- Use that shared normaliser in transfer report comparisons and any other comparison view using `computeAllStatAverages`
- Validate the Matthias Pieklak case specifically so clean sheets resolve from the saved season data instead of showing `0.00`

3. Make the countdown depend on real kick-off time only
- Remove the fake `23:59` fallback from the countdown logic
- If a fixture has no saved kick-off time, do not pretend there is one
- Keep the countdown driven from the fixture record so saved analysis/fixture kick-off time is what controls the countdown

4. Rebuild pre-match image cropping to match the real visible hero area
- Stop using the current square crop for pre-match match images
- Create a dedicated pre-match crop mode that mirrors the actual analysis hero layout from `AnalysisViewer`
- Add visible safe-area guides for the top dark fade and bottom gold arch/name overlay so you can crop to what is genuinely visible on the live page
- Keep post-match and logo crop behaviour separate so only pre-match hero cropping changes

5. Fix the annotation regression in the actual playback path
- The current playback is showing freeze-frame annotations after playback resumes because the recent reveal logic is wrong for this viewer
- Change `ReadOnlyAnnotationPlayback` so freeze-frame annotations render on the frozen frame only, at full opacity, and are not shown again once playback resumes
- Keep the loop reset logic that now works, but separate freeze rendering from resumed-play rendering so repeats stay stable
- Make the freeze frame use a dedicated visible element set with `forceOpacity` so annotations cannot disappear during the pause

6. Keep editor and preview timing aligned
- Reuse the same clip-relative timing rules between the annotation editor and read-only preview
- Preserve the current loop fix, but remove the post-freeze replay behaviour that caused the wrong annotation state
- Verify fullscreen preview and mini preview use the same rendering rules

Files likely to update
- `src/components/staff/analysis/AnalysisPointsSection.tsx`
- `src/components/staff/analysis/AnalysisMatchDetails.tsx`
- `src/components/staff/analysis/AnalysisOverviewSection.tsx`
- `src/components/staff/annotations/AnnotationEditor.tsx`
- `src/components/portal/ReadOnlyAnnotationPlayback.tsx`
- `src/components/portal/NextFixtureCountdown.tsx`
- `src/lib/statAggregation.ts`
- likely one shared stat-normalisation helper used by transfer report/portal comparisons

Technical notes
- The spellcheck issue is not because the shared `Input` and `Textarea` lack `spellCheck` since they already include it. The fix needs to target the actual analysis-editor fields and any browser-level conditions around them.
- The comparison bug is likely a mix of denominator choice and missing legacy GK key mapping, not just a display bug.
- The crop mismatch is real: the editor crops to a square while the live pre-match hero is a fixed-height wide image with overlays hiding part of the frame.
- The annotation bug is also real in code: the current playback marks elements as “revealed” after the freeze, which causes them to appear during resumed playback instead of only on the freeze frame.

Validation after implementation
- Confirm spellcheck suggestions appear in the analysis editor text fields
- Confirm the Matthias Pieklak clean-sheet value matches the saved season data
- Confirm the countdown only runs to an actual saved kick-off time
- Confirm pre-match crop guides match the live hero image and overlays
- Confirm freeze-frame annotations show during the pause, do not show after playback resumes, and still replay correctly on every loop
