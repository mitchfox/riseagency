

# Fix Site Visitors: Duration Tracking and Hide Controls

## Problem 1: All durations recorded as 0

**Root cause:** Race condition in `usePageTracking.ts`. When the user navigates away, the cleanup function awaits the tracking promise then reads `visitIdRef.current`. But the new page's effect has already run and reset `visitIdRef.current = null` before the async cleanup gets to read it.

**Fix:** Store the visit ID in a local variable scoped to each effect instance instead of reading from the shared ref after an await.

```
File: src/hooks/usePageTracking.ts

Change the trackPageView function to return the visitId, and
store it in a local variable that the cleanup closure captures
directly, avoiding the ref race condition.
```

Specifically:
- Make `trackPageView` return the visitId string
- Store the returned value in a local `let localVisitId` variable
- In the cleanup, use `localVisitId` directly instead of reading `visitIdRef.current`
- Remove the `visitIdRef` entirely since it is no longer needed

## Problem 2: Hide by IP / Hide by Location

This already exists in the code (lines 238-278 and 362-407 in `SiteVisitorsManagement.tsx`). The "Hide IP" and "Hide by Location" buttons are only visible when viewing a specific visitor's details. No changes needed here -- this is already working.

---

## Technical Details

### File: `src/hooks/usePageTracking.ts`

Current broken flow:
```text
Effect runs -> visitIdRef = null -> trackPageView() starts async
Cleanup runs -> captures promise -> awaits it -> reads visitIdRef (already null from next effect)
```

Fixed flow:
```text
Effect runs -> trackPageView() starts, returns visitId into local var
Cleanup runs -> uses local var directly (immune to next effect resetting anything)
```

The key change: replace the shared mutable ref with a per-effect-instance local variable that gets set when the tracking promise resolves, and read in the cleanup closure without any ref indirection.

