## Plan

Fix the proposal hero video so it never gets stuck on the loading frame.

1. **Remove the fragile indefinite gate**
   - The current code only renders the video after the full `fetch()` blob succeeds or fails.
   - If that fetch hangs, the page stays on “Preparing video” forever.

2. **Render the video immediately but hide playback until ready**
   - Mount the `<video>` as soon as there is a highlight URL, using the normal video URL first.
   - Keep the black loading overlay on top while the browser loads.
   - If the full blob prefetch succeeds, swap the video source to the blob URL and play from memory.

3. **Add a timeout fallback**
   - If full prefetch has not completed quickly enough, stop waiting for it and let the normal video source load with `preload="auto"`.
   - Use `loadeddata`, `canplay`, `canplaythrough` and `error` events so the video appears even if `canplaythrough` never fires.

4. **Keep the seamless-playback intent**
   - Prefer the blob URL when available, so Mulligan’s video plays from memory where possible.
   - Fall back safely rather than blocking the video completely.
   - Clean up blob URLs and abort pending prefetches when the selected player changes.

5. **Verify**
   - Check that the proposal page no longer stays on the loading state and that the hero video element appears with controls.