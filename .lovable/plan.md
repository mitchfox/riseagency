

## Plan: Annotation Fixes, Transfer Report Enhancements & Persistent Tool Settings

### Issues Identified

**Annotations — 4 critical bugs:**
1. **Fullscreen:** `AnalysisVideoReports.tsx` line 422 calls `requestFullscreen()` on `videoRef.current?.closest('.relative')` which finds the inner `<div className="relative max-h-full max-w-full">` — this div wraps the video but the `ReadOnlyAnnotationOverlay` is inside it, so it *should* work. However, the `ReadOnlyAnnotationOverlay` renders `null` when `visibleEls.length === 0` (line 63), and in fullscreen the video restarts from 0 — the `loopKey` reset detection may not fire properly because `prevTimeRef` was tracking the old time. The real issue: annotations only show once because SVG `<animate>` elements with `fill="freeze"` only run once and never reset.
2. **Loop replay (all contexts):** SVG `<animate fill="freeze">` elements in `ReadOnlyAnnotationOverlay` run once and never replay. The `loopKey` state is incremented on loop detection but it's never used as a React `key` on the SVG or the elements, so React doesn't remount them.
3. **Timing drift:** `drawingTimestamp` captures `video.currentTime` which is correct, but annotations store `appearAt` relative to the klip start. The `startDrawing` function (line 593) sets `drawingTimestamp = video.currentTime` (absolute), but `effectiveOffset` (line 105) is `drawingTimestamp - activeKlip.startTime`. When new elements are placed, `AnnotationCanvas` sets `appearAt = klipOffset` which is `currentTime - activeKlip.startTime`. This should be correct IF `currentTime` matches `drawingTimestamp`. The issue is that when the video loops and `currentTime` resets, `triggeredTimesRef` still contains old times — annotations won't re-trigger in the editor. Also the `effectiveOffset` calculation is fine but the playback freeze mechanism captures the wrong set of elements.
4. **Editor loop:** The editor video has `loop` attribute but when it loops, `triggeredTimesRef` is never cleared, so annotations never re-trigger on subsequent loops.

**Transfer Report — 5 items:**
1. Data graphics section only shows bar charts — needs varied visualisations
2. Individual stat visibility toggles don't work correctly (wrong items hidden)
3. Recent form colours not reflecting actual performance grade
4. Comparison player names not clickable to swap
5. No quick navigation menu after hero

---

### Implementation

#### 1. Fix Annotation Loop Replay (all contexts)
**`ReadOnlyAnnotationOverlay.tsx`:**
- Use `loopKey` as the `key` on the root SVG element so React remounts all `<animate>` elements on loop
- Remove `fill="freeze"` from draw-once animations (lines, arrows) and replace with `fill="freeze"` but ensure the SVG is keyed properly
- The `key={loopKey}` on the SVG wrapper forces React to destroy and recreate all animate elements

#### 2. Fix Annotation Fullscreen
**`AnalysisVideoReports.tsx`:**
- Add a `ref` to the `<div className="relative max-h-full max-w-full">` container (line 433)
- Use that ref directly for `requestFullscreen()` instead of the fragile `.closest('.relative')` lookup

#### 3. Fix Annotation Loop in Editor
**`AnnotationEditor.tsx`:**
- On video `timeupdate` or the RAF loop, detect when `currentTime` resets (jumps backward significantly) and clear `triggeredTimesRef`
- This ensures annotations re-trigger on every loop iteration

#### 4. Fix Annotation Timing
The timestamp capture looks correct after the previous fix. The remaining issue is that `effectiveOffset` during playback uses `klipOffset = currentTime - activeKlip.startTime`. If `activeKlip.startTime` is 0 (auto-created "Full Video" klip), then `klipOffset = currentTime` which is correct. Annotations with `appearAt` set during drawing should match. I'll add a guard to ensure the drawing timestamp is captured only after the seek has fully settled using `requestVideoFrameCallback` where supported.

#### 5. Persist Last Colour & Stroke
Already implemented (lines 49-65) — `localStorage` stores `annotation-last-colour` and `annotation-last-stroke`. This is working. No change needed.

#### 6. Transfer Report — Data Graphics Visibility Toggles Fix
The `toggleStatVisibility` function (line 306) works correctly — it toggles `hiddenStats[key]`. But the data_graphics section (line 561) checks `hiddenStats[data_${stat.key}]` only for filtering standoutStats *before* render — it doesn't filter. The hidden stats should filter out the stat AND still show it greyed out so it can be toggled back.

**Fix:** In data_graphics section, render ALL stats but grey out hidden ones. Same for form, strengths, and comparison metrics.

#### 7. Transfer Report — Form Colours
Line 641-648: The form grade uses `getFormGrade('r90', r90Val)` which returns a grade object with `.color`. The R90 colour square uses `getR90Color()` which returns Tailwind classes. Check that `getFormGrade` returns accurate grades. The display looks correct in code — will verify the grade thresholds match expectations.

#### 8. Transfer Report — Clickable Comparison Player Names
In the comparison section (line 714-717), player names are shown as `<th>` headers. Make them clickable in both edit and view mode — clicking opens a dropdown of available comparison players to swap that slot.

#### 9. Transfer Report — Quick Navigation Menu
Add a sticky section just after the hero with anchor links to each visible section. Clicking scrolls smoothly to that section. Each section gets an `id` attribute.

#### 10. Transfer Report — Richer Data Visualisations
Replace the simple bar chart layout with a mix of:
- **Radar/spider chart** for the top 6 standout metrics (SVG-based)
- **Horizontal comparison bars** for remaining metrics (current style but improved)
- Individual visibility toggles on each metric row

---

### Files to edit
- `src/components/portal/ReadOnlyAnnotationOverlay.tsx` — key SVG on loopKey
- `src/components/portal/AnalysisVideoReports.tsx` — fullscreen ref fix
- `src/components/staff/annotations/AnnotationEditor.tsx` — clear triggeredTimes on loop, improve timestamp capture
- `src/pages/TransferReportView.tsx` — quick nav, data graphics radar, visibility fix, clickable comparison names, form colour fix

