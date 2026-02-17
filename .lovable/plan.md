

## Unified Annotation Render Pipeline — COMPLETED

### What was done

1. **Created `src/lib/annotationRenderUtils.ts`** — Pure, deterministic render evaluation:
   - `computeVisibleElements(elements, time, config?)` — filters by time window, interpolates keyframes (exact time, not frame count), applies animateIn/animateOut. Returns `ComputedAnnotationElement[]` with final x, y, opacity, scale. Never mutates originals.
   - `renderElementsToSVGString(elements, width, height)` — generates SVG markup from computed state for canvas compositing during export. No DOM dependency.
   - `waitForSeek(video, targetTime)` — proper promise-based seek with `seeked` event + 200ms fallback + 16ms decode delay.

2. **Refactored `AnnotationEditor.tsx`**:
   - `visibleElements` useMemo now calls `computeVisibleElements` with `forceOpacity: 1` during freeze/drawing.
   - Export pipeline completely rewritten: seeks frame-by-frame using `waitForSeek`, calls `computeVisibleElements(allElements, offset)` per frame, generates SVG via `renderElementsToSVGString`, draws to canvas. **Zero DOM references during export.**
   - Removed the old `interpolateKeyframes` function (moved to shared utils).

3. **Fixed `VideoAnalysis.tsx` freeze-frame system**:
   - Added `overlayFreezeUntilRef` for time-driven freeze tracking.
   - Effect A now uses `computeVisibleElements` for annotation detection.
   - End-check listener guarded: won't interfere during active freeze.
   - Overlay rendering uses `computeVisibleElements` instead of inline filtering.
   - Both playback and export now call the same pure function.

### Architecture

```
computeVisibleElements(elements, T)
         ↓
  ComputedAnnotationElement[]
       ↓              ↓
  Playback          Export
  (AnnotationCanvas)  (renderElementsToSVGString → canvas)
```

Both paths receive identical computed arrays. If they differ, the system is broken.

### What stays unchanged

- AnnotationCanvas rendering (SVG elements, resize handles, interaction)
- Drawing mode workflow
- Timeline dots, sidebar, keyframe editing
- localStorage persistence (flagged for future database migration)

### Strategic follow-ups

- [ ] Database persistence for annotation projects (replace localStorage with JSONB table)
- [ ] JSON export button for annotation metadata
- [ ] Deterministic render consistency test (snapshot comparison)
