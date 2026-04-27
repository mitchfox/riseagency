## The bug

The magnifier annotation works in the **editor** (`AnnotationCanvas.tsx`) but renders the **entire frame squashed into the lens circle** in the read-only playback used on the portal, analysis viewer, public reports, etc. (`ReadOnlyAnnotationPlayback.tsx`).

## Root cause

In `ReadOnlyAnnotationPlayback.tsx` (lines 691–747) the magnifier's sample-region maths is wrong. It samples a region sized to the **entire video divided by zoom**, ignoring the lens radius:

```
regionW = vw / zoom    // e.g. 1920 / 1.5 = 1280 px  (~85% of frame)
regionH = vh / zoom    // e.g. 1080 / 1.5 =  720 px
```

The editor (`AnnotationCanvas.tsx` lines 918–921) does it correctly — sample-region is sized to **lens diameter / zoom**:

```
regionW = (radiusPxW * 2) / zoom    // e.g. (60 * 2) / 1.5 = 80 px  (~lens-sized window)
regionH = (radiusPxH * 2) / zoom
```

The read-only version effectively shows almost the whole frame, squashed into a small circle, which is exactly the "full image not the zoom" symptom.

A secondary issue: the read-only path doesn't honour the `panX`/`panY` offset that the editor supports.

## Fix

Replace the magnifier sample-region maths in `ReadOnlyAnnotationPlayback.tsx` to mirror the editor exactly:

- Use the lens radius (in source-video pixels) as the sample-window size, not the whole frame.
- Honour `panX` / `panY` so saved magnifiers with an offset stay correct on playback.
- Keep the existing `outSize = 256` canvas, `xMidYMid slice` clipping, and animation loop unchanged.

Also apply the same correction to `ReadOnlyAnnotationOverlay.tsx`'s magnifier branch (lines 437–497) so any future use of that component matches.

## Files to change

- `src/components/portal/ReadOnlyAnnotationPlayback.tsx` — magnifier case in `renderElement`
- `src/components/portal/ReadOnlyAnnotationOverlay.tsx` — magnifier case in `renderElement` (already has the right `panX`/`panY` reads, just verify region maths matches editor)

No changes to the editor, no DB changes, no schema changes. After this fix the magnifier in playback will sample only the lens-sized window of the underlying frame and zoom it, identical to what's shown in the editor.
