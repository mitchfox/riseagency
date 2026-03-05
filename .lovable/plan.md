

## Fix: Laggy Clip Playback in Performance Reports

### Root Causes

1. **No preloading** - Both `ActionVideoPopup` and `ClippedActionsPlayer` set `src` directly without `preload="auto"`, so every clip starts downloading only when it becomes active.
2. **No next-clip prefetching** - `ClippedActionsPlayer` swaps `src` on index change with no lookahead buffering, causing a visible stall between clips.
3. **No `key` prop sync** - Without `key={videoUrl}`, React reuses the same `<video>` element and the browser may not trigger a fresh load cycle, causing grey frames (per the project's established video playback standard).

### Plan

#### 1. `ClippedActionsPlayer.tsx` - Prefetch + instant switching
- Add `preload="auto"` and `key={currentClip.video_url}` to the main video element.
- Add a hidden prefetch `<video>` element that loads `clips[currentIndex + 1]` in the background while the current clip plays. This means the next clip's data is already cached by the browser when the user advances.
- Use `onCanPlay` to trigger autoplay instead of the current `useEffect` + `setTimeout` approach.

#### 2. `ActionVideoPopup.tsx` - Preload and key sync
- Add `preload="auto"` and `key={videoUrl}` to the video element so source switches are immediate and the browser starts buffering as soon as the dialog opens.

#### 3. Both components - `crossOrigin="anonymous"`
- Add to prevent any CORS-related fetch issues with the public storage URLs, consistent with project conventions.

### Technical Detail

The prefetch approach uses a standard hidden `<video preload="auto">` element for the next clip. The browser downloads and buffers the media data in advance. When the active index increments, the new `key` forces a fresh `<video>` mount with a URL that's already in the browser's HTTP cache, resulting in near-instant playback start. This avoids complex service worker or blob-based solutions.

