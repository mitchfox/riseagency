

## Fix: Annotation Playback - Freeze Frame, Display, Auto-Resume

### Problem

Three bugs are creating a broken playback experience:

1. **No freeze frame captured** during playback. When an annotation's time is reached, the video pauses but no screenshot is taken, so the annotation may overlay an incorrect or blank frame.
2. **Deadlock**: The auto-resume logic waits for `hasVisibleAnnotations` to become false, but since the video is paused, `currentTime` never advances, so visibility never changes. The video stays paused indefinitely.
3. **No timer**: There is no `setTimeout` to resume playback after the annotation's duration (typically 3 seconds).

### Solution

Replace the current reactive pause/resume approach with an explicit freeze-frame-and-timer system during playback.

### Changes (single file: `AnnotationEditor.tsx`)

**1. Add a "playback freeze" state**

New state variables:
- `playbackFreezeUrl` (string | null) - the captured frame image during playback
- `playbackFreezeActive` (boolean) - whether we are currently in a playback freeze

This is separate from the existing `drawingMode` / `freezeFrameUrl` which is for the manual drawing workflow.

**2. Replace the pause/resume effects (lines 173-195)**

Remove the two `useEffect` hooks that check `hasVisibleAnnotations`. Replace with a single effect that:

- Monitors `currentTime` during playback
- When annotations become visible and the video is playing:
  1. Captures a freeze frame (canvas screenshot of the video element)
  2. Pauses the video
  3. Sets `playbackFreezeActive = true`
  4. Starts a `setTimeout` for the longest visible annotation's remaining duration
- When the timer fires:
  1. Clears `playbackFreezeUrl` and `playbackFreezeActive`
  2. Resumes the video from where it was paused

**3. Render the playback freeze frame**

Add a conditional render block (similar to the drawing mode freeze frame) that shows the captured frame image when `playbackFreezeActive` is true. The annotation canvas overlay already renders when `visibleElements.length > 0`, so annotations will appear on top of this frozen image.

**4. Prevent re-triggering**

Track which annotation times have already been triggered during this playback session using a `Set` ref (`triggeredTimesRef`). Reset the set when the user manually seeks or starts a new playback session.

### Technical Detail

```text
Playback Flow:
  Video playing --> currentTime hits annotation.appearAt
    --> Capture freeze frame (canvas.toDataURL)
    --> video.pause()
    --> Show freeze frame image + annotation overlay
    --> setTimeout(annotation.duration)
        --> Hide freeze frame
        --> video.play() (resume from same point)
        --> Continue until next annotation
```

### What stays the same

- Drawing mode workflow (manual freeze frame, toolbar, save/cancel) is untouched
- Element visibility filtering logic remains the same
- Timeline dots, keyframes, and all sidebar controls unchanged

