

## Fix: Edit-mode components playing full match video instead of clips

### Problem
The **view mode** (PerformanceReport.tsx) correctly uses `hasPlayableClip()` and the shared clip player to handle both standalone clip files and clip-window boundaries (`clip_start`/`clip_end`). However, the **edit-mode** components bypass all clip logic and set `vid.src = action.video_url` directly, which loads the full match video when the action hasn't been re-extracted as a standalone file.

Affected components:
- `ActionTypeEditor.tsx` — line 468: `vid.src = action.video_url`
- `ScoreEditMode.tsx` — line 446: `src={action.video_url}`

### Fix approach

**1. Create a shared helper to resolve the correct playback source**

Add a function to `src/lib/clipVideoUtils.ts` that takes an action's `video_url`, `clip_start`, and `clip_end` and returns either:
- The standalone clip URL (if it's already a trimmed clip file), or
- A media fragment URL (`video_url#t=start,end`) for clipped windows, or
- `null` if it's a full match URL with no boundaries (blocked)

```
getEditPlaybackUrl(action) → string | null
```

**2. Update ActionTypeEditor.tsx**

- Import the helper
- Replace `vid.src = action.video_url` with `vid.src = getEditPlaybackUrl(action)`
- For the preload logic (line 478–483), use the same helper to resolve the next clip URL
- Add the `clip_start` and `clip_end` fields to the action interface if not already present (they are — line 102–103)

**3. Update ScoreEditMode.tsx**

- The ScoreEditMode fetches actions but only selects `id, action_type, action_score, minute, video_url, action_number` — it does NOT fetch `clip_start` or `clip_end`
- Add `clip_start, clip_end` to the select query
- Add those fields to the `ScoreAction` interface
- Replace `src={action.video_url}` with `src={getEditPlaybackUrl(action)}`
- Update the preloader URL list to use resolved URLs

**4. MatchClipPlayer.tsx**

- Same issue: fetches `video_url` without `clip_start`/`clip_end` and uses it directly
- Add `clip_start, clip_end` to the query and interface
- Use the helper for the video `src`

### Technical details

The helper function:
```typescript
export const getEditPlaybackUrl = (action: {
  video_url?: string | null;
  clip_start?: number | null;
  clip_end?: number | null;
}): string | null => {
  if (!action.video_url) return null;
  
  // Already a standalone trimmed clip — use directly
  if (isStandaloneTrimmedClip(action.video_url)) return action.video_url;
  
  // Full match URL with boundaries — use media fragment
  const hasBounds = action.clip_start != null && action.clip_end != null 
    && action.clip_end > action.clip_start;
  if (hasBounds && isFullMatchUrl(action.video_url)) {
    return `${action.video_url}#t=${action.clip_start},${action.clip_end}`;
  }
  
  // Full match URL without boundaries — blocked
  if (isFullMatchUrl(action.video_url)) return null;
  
  // Unknown URL type — allow direct playback
  return action.video_url;
};
```

Note: Media fragment URLs (`#t=start,end`) only provide approximate seeking in the browser and won't enforce strict boundaries the way `useSharedClipPlayer` does. For the edit mode this is acceptable since the goal is to show the right clip segment, not to prevent full-match exposure (staff are already authorised to see the full match). If stricter enforcement is wanted in edit mode, the components would need to integrate `useSharedClipPlayer`, but that's a larger refactor.

### Files changed
- `src/lib/clipVideoUtils.ts` — add `getEditPlaybackUrl`
- `src/components/staff/ActionTypeEditor.tsx` — use helper for video src + preload
- `src/components/staff/analysis/ScoreEditMode.tsx` — add clip fields to query/interface, use helper
- `src/components/staff/analysis/MatchClipPlayer.tsx` — add clip fields to query/interface, use helper

