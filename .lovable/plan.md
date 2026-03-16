

## Fix: Add Playhead Gate to Prevent Annotation Double-Freeze

### Analysis

The current code correctly tracks triggered element IDs in `triggeredTimesRef`. However, the external AI's analysis points to a subtle timing issue: between the freeze ending (`freezeActiveRef.current = false`) and the video resuming (`video.play()`), there's a window where the RAF tick can evaluate. The `!video.paused` guard on line 191 should catch this, but `video.play()` is async and browser timing varies.

The most robust fix is the **playhead gate** — a simple ref that records the relative time when the last freeze triggered. The detection then requires that an element's `appearAt` is strictly after the last freeze trigger time. This makes double-triggering physically impossible regardless of Set state, RAF timing, or React render cycles.

### Changes — `ReadOnlyAnnotationPlayback.tsx`

1. **Add ref** (near line 64):
   ```typescript
   const lastFreezeTriggerTimeRef = useRef<number>(-1);
   ```

2. **Update detection filter** (line 192-194) — add playhead gate:
   ```typescript
   const newElements = computed.filter(el => {
     return !triggeredTimesRef.current.has(el.id) &&
            el.appearAt > lastFreezeTriggerTimeRef.current;
   });
   ```

3. **Record trigger time** (before line 198-199):
   ```typescript
   lastFreezeTriggerTimeRef.current = relTime;
   newElements.forEach(el => triggeredTimesRef.current.add(el.id));
   ```

4. **Reset on loop** (line 105, add):
   ```typescript
   triggeredTimesRef.current.clear();
   lastFreezeTriggerTimeRef.current = -1;
   ```

Single file change, 4 lines added. The playhead gate ensures that once a freeze fires at time T, no element with `appearAt <= T` can ever trigger again during that playthrough — even if IDs somehow get lost or the set is cleared unexpectedly.

