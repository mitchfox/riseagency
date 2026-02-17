

# Export Performance: Replace Seek-Per-Frame with Playback-Driven Capture

## Problem

A 20-second clip at 30fps requires 600 frames. The current approach seeks to each frame individually, waits for decode, waits 50ms, then gates through `requestAnimationFrame`. Each frame costs roughly 150-200ms, producing a 90-140 second export for 20 seconds of footage. This is because every seek resets the hardware decoder pipeline.

## Solution

Replace the seek-per-frame loop with `requestVideoFrameCallback`. Instead of fighting the decoder, let the video play naturally at 1x speed. Each decoded frame triggers a callback with the exact `mediaTime`, which is used to compute annotations and composite to the canvas. A 20-second clip then takes roughly 20 seconds to export.

## Changes

### 1. Rewrite `exportClip` in `AnnotationEditor.tsx`

Replace the `for` loop with a playback-driven approach:

```text
Current flow (per frame):
  set currentTime -> await seeked -> poll readyState -> 50ms -> rAF -> draw -> 50ms
  ~150ms per frame, 600 frames = 90-140 seconds

New flow:
  video.play() from klipStart
  requestVideoFrameCallback fires per decoded frame:
    draw video frame
    compute annotations at metadata.mediaTime
    composite SVG
  stop when mediaTime >= klipEnd
  ~20 seconds for 20 seconds of footage
```

Specific steps:
- Keep the metadata readiness check and dimension validation (already correct)
- Keep MediaRecorder setup with explicit `videoBitsPerSecond: 8_000_000`
- Set `video.currentTime = klipStart`, await seeked once (just the starting position)
- Start MediaRecorder
- Start playback with `video.play()`
- Register `requestVideoFrameCallback` handler that:
  - Checks if `metadata.mediaTime >= klipEnd`, if so stops
  - Draws the video frame to the export canvas
  - Calls `computeVisibleElements(allElements, metadata.mediaTime - klipStart)`
  - Renders SVG overlay if elements exist
  - Re-registers itself for the next frame
- On completion, stop MediaRecorder and trigger download

### 2. Fallback for unsupported browsers

`requestVideoFrameCallback` is supported in Chrome 83+, Edge 83+, and Safari 15.4+. Firefox added it in version 130. For older browsers, fall back to the existing seek-per-frame method but with reduced delays. Check via:

```text
if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
  // fast path
} else {
  // existing seek loop as fallback
}
```

### 3. Progress reporting

Replace the frame-index-based progress (`i / totalFrames`) with time-based progress:

```text
progress = (metadata.mediaTime - klipStart) / klipDuration
```

Toast updates at roughly 10% intervals.

### 4. Keep `waitForSeek` for the initial seek only

The hardened `waitForSeek` is still needed for the single initial seek to `klipStart`. It remains unchanged in `annotationRenderUtils.ts`.

### 5. Keep `isExportingRef` isolation

The playback-driven approach still needs the export guard. Playback effects must not interfere. The `isExportingRef` pattern stays as-is.

## Files affected

- **`src/components/staff/annotations/AnnotationEditor.tsx`** -- rewrite `exportClip` to use `requestVideoFrameCallback` with seek-loop fallback

## What does not change

- `annotationRenderUtils.ts` -- `waitForSeek`, `computeVisibleElements`, `renderElementsToSVGString` all stay as they are
- `AnnotationCanvas.tsx` -- playback rendering untouched
- `VideoAnalysis.tsx` -- untouched

