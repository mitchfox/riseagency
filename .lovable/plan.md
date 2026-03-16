

## Plan: Fix Annotation Double-Freeze + Audio Re-record Failure

### 1. Annotation Double-Freeze Fix

**Root cause identified:** `startFreeze` is in the RAF effect's dependency array (line 207). `startFreeze` is a `useCallback` that creates a new function reference whenever its dependencies change. When React recreates the effect, the cleanup cancels the RAF and starts a new loop. While `triggeredTimesRef` persists (it's a ref), the timing of effect teardown/recreation during the freeze→resume transition can cause a brief window where the tick evaluates before the triggered set is fully respected.

Additionally, the `onTimeUpdate` handler (line 97-107) sets `video.currentTime = clipStart` when clip end is reached, which triggers a backward time jump that clears `triggeredTimesRef` — this can happen right after a freeze resumes near clip boundaries.

**Fix — 3 changes in `ReadOnlyAnnotationPlayback.tsx`:**

1. **Move `startFreeze` to a ref** so the RAF effect has zero changing dependencies beyond `elements` and `clipStart`:
   - Create `startFreezeRef = useRef(startFreeze)` and keep it synced
   - Effect deps become `[elements, clipStart]` only — no more teardown/recreation from callback identity changes

2. **Guard the loop-reset logic**: Only clear `triggeredTimesRef` on backward seek when freeze is NOT active:
   ```
   if (!freezeActiveRef.current && lastTimeRef.current > 0 && now < lastTimeRef.current - 0.5) {
     triggeredTimesRef.current.clear();
   }
   ```

3. **Add element IDs to triggered set BEFORE calling freeze logic** (already the case, but make the ordering explicit and add the return immediately after):
   ```
   newElements.forEach(el => triggeredTimesRef.current.add(el.id));
   startFreezeRef.current(computed, video);
   ```

### 2. Audio Re-record Fix

**Root cause:** `rerecordAudio` calls `onAudioChange(undefined)` then `await startRecording()`. The parent state change from `onAudioChange` triggers a re-render that can remount the `AudioRecorder` component. The unmount cleanup effect (line 97-102) increments `sessionRef` and calls `resetRecorderState(true)`, which kills the just-started recording session because all callbacks check `sessionRef.current !== sessionId`.

**Fix in `AudioRecorder.tsx`:**

1. **Don't call `onAudioChange(undefined)` during re-record.** Instead, just reset local state and start recording. Only clear the parent audio URL when the NEW recording is saved (or explicitly discarded):
   ```typescript
   const rerecordAudio = useCallback(async () => {
     // Don't notify parent yet — avoid remount
     sessionRef.current += 1;
     resetRecorderState(true);
     // Small delay to let state settle before getUserMedia
     await new Promise(r => setTimeout(r, 50));
     await startRecording();
   }, [resetRecorderState, startRecording]);
   ```

2. **Update the `removeAudio` flow** to handle the case where `audioUrl` exists but user is mid-recording — the parent notification happens on explicit delete only.

**Files changed:** 2 files
- `src/components/portal/ReadOnlyAnnotationPlayback.tsx` — ref-ify startFreeze, guard triggered-set clearing
- `src/components/staff/analysis/AudioRecorder.tsx` — decouple re-record from parent state update

