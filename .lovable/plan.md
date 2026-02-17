

# Export Pipeline Hardening

## Summary

Apply six targeted refinements to the export pipeline to eliminate flicker, ensure frame accuracy, and isolate export from playback state.

---

## Changes

### 1. Frame decode readiness check (`annotationRenderUtils.ts`)

Update `waitForSeek` to check `video.readyState >= 2` (HAVE_CURRENT_DATA) after the `seeked` event fires, polling briefly if needed. Increase post-seek delay to 50ms and add a `requestAnimationFrame` gate for compositor flush. Increase fallback timeout to 300ms.

```
Current flow:
  seeked -> 16ms delay -> resolve (200ms fallback)

New flow:
  seeked -> poll readyState >= 2 (up to 100ms) -> 50ms delay -> rAF -> resolve (300ms fallback)
```

### 2. Frame stepping precision (`AnnotationEditor.tsx`)

Replace floating-point accumulation with index-based time calculation to prevent drift:

```
Current:  time = klipStart + (i / fps)    // already index-based, correct
Verify:   offset = i / fps                // not i * frameStep
```

The current code already uses `i / fps` which is correct. Will verify no `t += frameStep` pattern exists elsewhere.

### 3. Metadata readiness before export (`AnnotationEditor.tsx`)

Before reading `videoWidth`/`videoHeight`, await `loadedmetadata` if `readyState < 1`. Fail explicitly if dimensions are zero rather than silently falling back to 1920x1080.

```
Current:  const vw = video.videoWidth || 1920

New:
  if (video.readyState < 1) await loadedmetadata event
  if (!video.videoWidth || !video.videoHeight) throw + toast error
  const vw = video.videoWidth
  const vh = video.videoHeight
```

### 4. Frame pacing adjustment (`AnnotationEditor.tsx`)

Replace `setTimeout(r, 1000 / fps)` with `setTimeout(r, 50)`. This is a pragmatic compromise -- enough for MediaRecorder to ingest each frame without tying pacing to wall-clock time. Effective FPS won't be mathematically exact but will be stable enough for analysis output.

### 5. Isolate export from playback state (`AnnotationEditor.tsx`)

Add an `isExportingRef` guard. When true:
- Effect A (freeze detection) short-circuits immediately
- Effect B (freeze resume timer) short-circuits immediately
- No playback freeze state is set or cleared during export

This prevents any playback listener from interfering with the export's explicit time control.

```
const isExportingRef = useRef(false);

// In exportClip:
isExportingRef.current = true;
try { ... } finally { isExportingRef.current = false; }

// In Effect A:
if (isExportingRef.current) return;

// In Effect B:
if (isExportingRef.current) return;
```

### 6. Remove redundant `clearRect` (`AnnotationEditor.tsx`)

Remove `ctx.clearRect(0, 0, vw, vh)` before `ctx.drawImage(video, ...)` since the video frame draw overwrites the entire buffer.

---

## Files affected

- **`src/lib/annotationRenderUtils.ts`** -- harden `waitForSeek` with readyState polling, longer delay, rAF gate, 300ms fallback
- **`src/components/staff/annotations/AnnotationEditor.tsx`** -- metadata check, explicit dimension failure, frame pacing fix, isExportingRef isolation, remove clearRect

## What this does not change

- `computeVisibleElements` -- already pure, already deterministic
- `renderElementsToSVGString` -- already DOM-free
- Playback rendering -- untouched
- Drawing mode -- untouched
- localStorage persistence -- separate concern for a future migration

