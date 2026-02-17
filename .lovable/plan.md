

## Fix: Annotation Fade Timing During Playback Freeze

### Current behaviour

1. Annotation timestamp reached -- video pauses, freeze frame captured
2. During the freeze, `currentTime` doesn't advance, so `effectiveOffset` stays right at `appearAt`
3. The `animateIn` logic computes `elapsed = effectiveOffset - appearAt` which is near zero, keeping opacity very low throughout the freeze
4. When the video resumes, time finally advances and the fade-in plays out -- but the moment has passed

### Desired behaviour

1. Annotation fades in briefly as the freeze starts
2. During the freeze, annotation shows at **full opacity** for the set duration
3. When the freeze ends, annotation fades out quickly as the video resumes

### Changes (single file: `AnnotationEditor.tsx`)

**1. Override opacity during playback freeze**

In the `visibleElements` memo (lines 91-117), add a check: when `playbackFreezeActive` is true, skip the `animateIn` and `animateOut` calculations entirely and return the element at full opacity. This ensures annotations are fully visible during the freeze frame.

```text
visibleElements memo:
  if playbackFreezeActive:
    return element at full opacity (skip animateIn/animateOut)
  else:
    existing animateIn/animateOut logic as-is
```

**2. Add a brief fade-out when the freeze ends**

Instead of instantly hiding annotations when the timer fires, introduce a short fade-out transition:

- New state: `playbackFreezePhase` with values `'idle' | 'showing' | 'fading'`
- When freeze activates: set phase to `'showing'`
- When the timer fires: set phase to `'fading'` (don't clear the freeze frame yet)
- After a short delay (e.g. 400ms), clear everything and resume the video
- The annotation overlay container gets a CSS transition on opacity, driven by the phase

```text
Effect B (resume timer):
  setTimeout(duration):
    set phase = 'fading'
    setTimeout(400ms):
      clear freeze frame
      set phase = 'idle'
      video.play()
```

**3. Render with transition**

The annotation overlay wrapper during playback freeze gets:
- `opacity: 1` when phase is `'showing'`
- `opacity: 0` with `transition: opacity 0.4s` when phase is `'fading'`

This gives a smooth fade-out as the video resumes.

### Dependencies on `visibleElements` memo

Add `playbackFreezeActive` to the memo's dependency array so it recalculates when the freeze starts/ends.

### What stays the same

- Drawing mode workflow untouched
- Effect A (detection) unchanged
- Element creation, timeline dots, sidebar controls all unchanged
