

## Annotations System — Full Architecture Explanation

### How It Works End-to-End

**1. Data Model**
- `annotation_projects` table stores annotation data with columns: `id`, `name`, `video_url`, `video_name`, `klips` (JSONB), `user_id`, `created_at`
- Each "klip" in the `klips` array contains an `elements` array of `AnnotationElement` objects
- Each element has: `type` (line, arrow, circle, rect, spotlight, player-marker, etc.), `x/y` coordinates (0-100 normalised), `appearAt` (seconds), `duration`, `color`, `strokeWidth`, keyframes, animation settings, etc.
- Analysis points link to annotations via `annotation_ids`: a JSON map of `{ video_url: annotation_project_id }`

**2. Creation Flow (Editor)**
- In `AnalysisPointsSection.tsx`, clicking the pen icon on a video calls `handleOpenAnnotate()`
- This either loads an existing `AnnotationProject` from the database (if `existingAnnotationId` is set) or creates a new one in memory
- Opens `AnnotationEditor` — the full annotation workspace with `AnnotationCanvas` for drawing and `AnnotationToolbar` for tool selection
- The editor uses `object-fit: fill` on the video and a `viewBox="0 0 100 100"` SVG overlay for coordinate parity
- On save, `handleSaveAnnotation()` upserts the project to `annotation_projects` table, then calls `onAnnotationSaved(projectId)` which writes the ID into the point's `annotation_ids` map
- The analysis must then be saved separately to persist the `annotation_ids` link

**3. Playback Flow (ReadOnlyAnnotationPlayback)**
- Used in both the analysis editor preview AND the public `AnalysisViewer`
- Loads elements from `annotation_projects.klips` via the `annotationProjectId`, or accepts `preloadedElements` directly
- Runs a `requestAnimationFrame` loop that calls `computeVisibleElements()` from `annotationRenderUtils.ts`
- `computeVisibleElements()` checks each element's `appearAt` and `duration` to determine visibility at the current relative time (`video.currentTime - clipStart`)
- When new annotations become visible, triggers a **freeze sequence**: captures a canvas frame, pauses the video, shows annotations for a calculated duration (1.5s–8s), then fades out and resumes playback
- Renders via an SVG overlay with `viewBox="0 0 100 100"` and `preserveAspectRatio="none"` to match the video

**4. Key Files**
- `src/components/staff/annotations/AnnotationEditor.tsx` — the drawing/editing workspace
- `src/components/staff/annotations/AnnotationCanvas.tsx` — SVG drawing surface
- `src/components/staff/annotations/AnnotationProjects.tsx` — project management + types
- `src/lib/annotationRenderUtils.ts` — pure functions: `computeVisibleElements()`, keyframe interpolation, SVG string export
- `src/components/portal/ReadOnlyAnnotationPlayback.tsx` — shared playback component (editor preview + viewer)
- `src/components/portal/ReadOnlyAnnotationOverlay.tsx` — simpler overlay used in Video Reports (no freeze logic)
- `src/components/staff/analysis/AnalysisPointsSection.tsx` — wires annotations to analysis points

---

## Issues Identified

### Issue 1: Annotations look different in playback vs editor
**Root cause**: The `AnnotationCanvas` (editor) and `ReadOnlyAnnotationPlayback` (viewer) render elements with different SVG approaches:
- The editor canvas renders elements interactively with React state, selection handles, and live coordinate updates
- `ReadOnlyAnnotationPlayback` re-implements every element type independently in its `renderElement()` function — any visual difference (stroke widths, marker sizes, dash patterns, fill opacities, coordinate handling) between these two renderers causes visual mismatch
- Specific discrepancies likely include: draw-on animations using `strokeDasharray`/`strokeDashoffset` in the readonly renderer that don't exist in the editor's static view, and percentage-based vs absolute coordinate handling differences

### Issue 2: Video doesn't pause/freeze when annotations appear
**Root cause**: The freeze logic in `ReadOnlyAnnotationPlayback` (lines 125-174) depends on several conditions that can fail:

1. **`triggeredTimesRef` persistence**: The triggered times set persists across the component lifecycle. If the video loops (it has `loop` attribute), the `triggeredTimesRef` never resets, so annotations only freeze on the first playthrough. On subsequent loops, all `appearAt` times are already in the set and the freeze never triggers again.

2. **`freezeActive` guard**: When `freezeActive` is true, the RAF loop just re-requests without computing — this is correct. But the `useEffect` dependency array for the main loop is `[elements, clipStart, freezeActive]`. When `freezeActive` toggles, the entire effect re-runs, creating a new RAF loop. The old one may not be properly cancelled if timing is tight.

3. **Video `autoPlay` + `loop`**: The video auto-plays and loops. The freeze logic checks `!video.paused` before freezing. If the video hasn't started playing yet (autoplay blocked by browser), no freeze will ever trigger.

4. **0.25s epsilon grouping**: The rounding to 0.25s resolution (`Math.round(el.appearAt * 4) / 4`) means annotations within 0.25s of each other are treated as one group — but if the RAF tick misses the exact window, annotations may be computed as visible but already marked as triggered.

### Plan to Fix

**Fix 1 — Reset triggered times on video loop**: Add a `timeupdate` or `seeked` listener that detects when `currentTime` jumps backward (loop restart) and clears `triggeredTimesRef`.

**Fix 2 — Ensure freeze works reliably**: The freeze trigger should not depend on the RAF tick happening at exactly the right moment. Instead of checking "new elements that haven't been triggered", compare current visible set against previous visible set to detect transitions.

**Fix 3 — Visual parity**: Audit the `renderElement` function in `ReadOnlyAnnotationPlayback` against `AnnotationCanvas` rendering to ensure matching stroke widths, colors, coordinate usage, and shapes. The draw-on animations (strokeDashoffset) may need to be optional or match the editor's static appearance.

