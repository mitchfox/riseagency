

## Fix: Annotations Randomly Reappearing After Freeze

### Root cause

When the freeze cycle completes (showing -> fading -> idle), the video resumes from the same `currentTime`. Since the annotation's time window spans `appearAt` to `appearAt + duration`, `currentTime` is still within that window. The `visibleElements` memo still includes those elements, and the render condition `visibleElements.length > 0` evaluates true, so the annotations reappear on the live video.

The `triggeredTimesRef` only prevents the freeze from re-triggering -- it doesn't prevent the annotations from rendering.

### Fix

During normal playback (not drawing mode, not in a playback freeze), annotations should only render while a freeze is active. They should never appear floating over a playing video.

**Change the render condition** on line 501 from:

```
{activeKlip && (drawingMode || visibleElements.length > 0) && (
```

to:

```
{activeKlip && (drawingMode || (visibleElements.length > 0 && playbackFreezeActive)) && (
```

This ensures the annotation canvas overlay only renders in two cases:
1. Drawing mode (manual editing)
2. During a playback freeze (the intended display window)

Once the freeze ends and `playbackFreezeActive` becomes false, the overlay disappears regardless of whether `visibleElements` still contains elements.

### What stays the same

- All freeze detection, timing, and phase logic unchanged
- Drawing mode workflow unaffected
- The `visibleElements` memo itself unchanged
- Timeline dots, sidebar, keyframes all unchanged

### Single change

One line in `AnnotationEditor.tsx` (line 501).

