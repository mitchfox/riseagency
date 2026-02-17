

## Fix: Annotation Auto-Resume and Immediate Visibility

### Bug 1: Auto-resume timer gets cancelled immediately

**Root cause**: The playback freeze effect (line 178) sets a `setTimeout` to resume the video, but its cleanup function clears that timer. Because the effect depends on `currentTime`, `visibleElements`, `effectiveOffset`, and `playbackFreezeActive`, when `playbackFreezeActive` changes to `true`, React re-runs the effect. The new run hits the early return (`if (playbackFreezeActive) return`), but React also runs the *cleanup* from the previous render, which clears the timeout before it can fire.

**Fix**: Move the `setTimeout` out of the effect entirely. Instead, start the timer in a *separate* `useEffect` that only runs when `playbackFreezeActive` becomes `true`. This way the timer lives independently and won't be cancelled by the detection effect re-running.

New effect (roughly):
```text
useEffect:
  if playbackFreezeActive is true:
    start setTimeout for maxDuration
    on fire: clear freeze state, resume video
    cleanup: clearTimeout (only runs when playbackFreezeActive changes)
```

The detection effect keeps everything except the setTimeout -- it just sets the state and pauses the video.

### Bug 2: Newly drawn annotations not visible on the freeze frame

**Root cause**: Elements are created with `appearAt: klipOffset`, but during drawing mode, visibility is calculated using `effectiveOffset = drawingTimestamp - activeKlip.startTime`. If there's any tiny timing mismatch, the element sits just outside the visibility window.

**Fix**: When in drawing mode, set `effectiveOffset` to exactly match `klipOffset` so newly placed elements are always within range. The simplest approach is to just use `klipOffset` in both modes during drawing, since the video is paused and `currentTime` is stable.

### Changes (single file: `AnnotationEditor.tsx`)

1. **Split the freeze effect into two**:
   - Effect A (detection): monitors `currentTime` + `visibleElements`, captures frame, pauses video, sets `playbackFreezeActive = true`. Stores the duration in a ref. No timer here.
   - Effect B (resume timer): watches `playbackFreezeActive`. When it becomes true, starts `setTimeout` using the stored duration. When it fires, clears freeze state and resumes playback. Cleanup only clears this single timer.

2. **Fix effectiveOffset**: In drawing mode, use `klipOffset` directly rather than recalculating from `drawingTimestamp`. This ensures new elements whose `appearAt` equals `klipOffset` are always visible.

3. **Store freeze duration in a ref** (`playbackFreezeDurationRef`) so the resume effect can read it without needing it as a dependency.

### What stays the same

- Drawing mode workflow (freeze frame, toolbar, save/cancel) untouched
- Element creation logic in AnnotationCanvas unchanged
- Timeline dots, sidebar controls, keyframes all unchanged

