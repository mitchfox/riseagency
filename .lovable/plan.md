
Implementation plan

1) Replace the viewer overlay path with the same playback logic used in the annotation editor
- Create a shared read-only playback component that uses:
  - `computeVisibleElements(...)`
  - freeze/pause timing logic (triggered timestamps + max visible duration)
  - `AnnotationCanvas` for rendering, not the limited SVG switch renderer
- Use this component in:
  - `src/pages/AnalysisViewer.tsx` (`AnnotatedPointVideo`)
  - `src/components/staff/analysis/AnalysisPointsSection.tsx` (point video preview card)

2) Make clip time handling deterministic for all point videos
- Parse `#t=start,end` fragments for point videos.
- On metadata load:
  - seek to `start`
  - store a normalised clip start marker on the video element
- On `timeupdate`:
  - loop back to `start` at `end`
- Feed relative clip time into annotation visibility calculations so timing matches the editor exactly.

3) Fix render parity by removing unsupported-shape gaps
- Stop relying on `ReadOnlyAnnotationOverlay` for point video playback because it does not support all annotation types (eg `space-oval`, `distance`, `linked-line`, `magnifier`, `image-layer`).
- Use `AnnotationCanvas` read-only rendering so all tools drawn in editor are rendered in viewer and preview.

4) Fix in-editor preview staleness after saving annotation
- In `VideoItem`, render annotation overlay on the point video preview (currently raw video only).
- After annotation save:
  - keep local `annotationProject` state updated
  - trigger a reload key/refetch for that video preview even when annotation id stays the same
- Keep the annotation dialog open state controlled, but prevent stale cached render after save.

5) Persist annotation mapping immediately and robustly
- Add an immediate point persistence callback from `AnalysisPointsSection` to `AnalysisManagement` for annotation mapping updates, so annotation link persistence does not depend on clicking “Save Analysis”.
- When saving annotation, persist updated `points` JSON to backend for edited analyses.
- Keep current full save button flow as a fallback.

6) Preserve annotation links when videos are moved, trimmed, or removed
- Update point mutation handlers in `AnalysisPointsSection`:
  - Trim: move mapping key from old URL to new URL.
  - Move to point: move annotation id mapping along with video URL.
  - Remove: remove orphaned mapping entry for removed URL.

7) Final kit parity correction in viewer
- Update `AnalysisViewer` kit rendering to include collar colour parity with editor:
  - include `kit_collar_color` in viewer analysis typing/usage
  - pass collar colour into `PlayerKit`
  - use collar colour in collar SVG instead of hard-coding secondary colour

8) Accessibility warning cleanup (same touch area)
- Add `DialogTitle` and optional description to annotation dialog content in point editor to resolve Radix warning spam while touching the same component.

Technical details to implement
- Files to update:
  - `src/components/staff/analysis/AnalysisPointsSection.tsx`
  - `src/pages/AnalysisViewer.tsx`
  - `src/components/portal/ReadOnlyAnnotationOverlay.tsx` (either retire for this flow or keep only for legacy usages)
  - `src/components/staff/AnalysisManagement.tsx`
- Shared utility/component target:
  - new reusable read-only annotation playback component under `src/components/portal/` or `src/components/shared/` that encapsulates:
    - clip fragment parsing
    - relative time normalisation
    - freeze/pause sequencing
    - read-only `AnnotationCanvas` rendering
- Data safety:
  - preserve existing `points[].annotation_ids` schema, no migration required.
  - update in-memory and persisted `points` atomically when mutating `video_urls`.

Verification steps
1. In analysis editor, annotate a point clip using `space-oval` and one line/arrow.
2. Save annotation and close dialog:
- preview thumbnail in the same point must show overlays immediately.
3. Open the player analysis viewer:
- overlays must appear with correct timing and position.
- video must pause/freeze when annotations appear, then resume.
4. Test a `#t=` clip and a trimmed clip:
- both must show identical timing behaviour.
5. Move and trim annotated clips between points:
- annotation must stay attached after each action.
6. Confirm kit parity:
- collar, stripes, and number colour match editor exactly.
