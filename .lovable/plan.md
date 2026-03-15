
Goal: make video crop truly freeform (independent width/height) so you can drag any side/corner and crop exactly the shape you want.

1) Root-cause fix (why it feels “grid locked” now)
- The current crop UI uses `react-easy-crop`, which keeps a fixed crop area model (aspect defaults to 4:3 when unset and no true drag-to-resize handles).
- I’ll remove this cropper from `VideoCropDialog.tsx` and replace it with a real freeform selection box.

2) Replace crop UI with true freeform selector
- Build a custom crop overlay on top of the captured video frame:
  - draggable crop rectangle
  - 8 resize handles (`n, ne, e, se, s, sw, w, nw`)
  - no aspect lock by default (width and height change independently)
- Keep movement/resizing clamped to image bounds, with a small minimum crop size to prevent invalid crops.

3) Keep current encoding/upload flow, but feed it the new freeform box
- Convert crop box from displayed-frame coordinates to source-video pixel coordinates.
- Reuse existing canvas + MediaRecorder pipeline so output behavior stays the same (just with correct freeform dimensions).
- Preserve existing time-fragment handling (`#t=start,end`) so cropped clips still respect trimmed ranges.

4) UX improvements so it’s obvious and controllable
- Show live crop dimensions (e.g., `W x H`) while resizing.
- Add a “Reset crop” action (full frame) for quick retry.
- Remove misleading “grid-crop” feel and update helper text to explicitly say “drag sides/corners for any width/height”.

5) Scope of code changes
- Primary file: `src/components/staff/analysis/VideoCropDialog.tsx`
- Keep integration points in `AnalysisPointsSection.tsx` unchanged unless minor prop updates are needed.

Technical details
- New state in dialog: `cropRect` (x,y,width,height as percentages), interaction state (`mode`, `handle`, pointer origin).
- Pointer math:
  - convert pointer delta px -> percent using rendered image width/height
  - apply per-handle resize rules
  - clamp rect into `[0..100]` bounds with min size constraint
- Export math:
  - `cropX = round((xPct/100) * video.videoWidth)`, same for `Y/W/H`
  - guard against 0 or negative dimensions before encoding.

Acceptance checks
- Can resize only height (top/bottom handles) without forcing width changes.
- Can resize only width (left/right handles) without forcing height changes.
- Can freely drag rectangle anywhere inside frame.
- Saved output reflects exact selected rectangle (no forced ratio).
- End-to-end test in both pre/post-match analysis clip flow to confirm behavior in real usage.
