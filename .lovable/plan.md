

## Fix: Annotation Freeze Triggering Twice

### Root Cause

The current system tracks triggered annotations by **rounded `appearAt` times** (`Math.round(el.appearAt * 4) / 4`). After the freeze ends and the video resumes, the annotation is still within its visibility window. If there's any floating-point rounding edge case or if multiple elements share close-but-not-identical `appearAt` values that round differently between the `startFreeze` write and the `tick` check, the element passes the filter again and triggers a second freeze.

### Fix

Switch from tracking **rounded times** to tracking **element IDs**. Element IDs are unique and deterministic — no rounding ambiguity.

**Changes in `ReadOnlyAnnotationPlayback.tsx`:**

1. Change `triggeredTimesRef` from `Set<number>` to `Set<string>`
2. In `startFreeze` (line 120-122): add `el.id` instead of rounded `appearAt`
3. In `tick` filter (line 188-191): check `!triggeredTimesRef.current.has(el.id)` instead of rounded time lookup
4. Loop/seek reset (line 104) stays the same — `.clear()` works regardless of type

This is a ~6 line change across 3 locations in the same file. No other files affected.

