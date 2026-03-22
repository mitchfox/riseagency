

## Plan: Fix Video/Clip Caching to Eliminate Redundant Network Requests

### The Problem

Your platform is treating every video clip like a live stream — re-fetching from storage on every view, replay, remount, and tab switch. The cost driver is not the number of clips but the number of times they're requested.

**Root causes identified:**

1. **Low cache headers on uploads**: Most files are uploaded with `cacheControl: '3600'` (1 hour). Clips in `clientClipExtractor.ts` and `trim-video-clip` use `'31536000'` (1 year) — but all other uploads (analysis files, images, player data) use 1 hour, causing frequent re-fetches.

2. **Ghost video preloader creates duplicate requests**: `useVideoPreloader.ts` creates hidden `<video>` elements that fully buffer AND play each clip for 1.2 seconds. This doubles the network traffic — the actual visible video element also loads the same URL independently. The browser cache may or may not deduplicate these depending on timing.

3. **Hidden prefetch video in ClippedActionsPlayer**: Line 147-155 renders a hidden `<video>` with `preload="auto"` for the next clip. This triggers a full download in parallel with the current clip, doubling bandwidth.

4. **`key={currentClip.video_url}` forces remounting**: In `ClippedActionsPlayer.tsx` (line 134) and `ActionVideoPopup.tsx` (line 83), using the URL as the React key destroys and recreates the video element on every clip change, discarding any buffered data and forcing a fresh network fetch.

5. **No CDN or browser-level caching layer**: Storage URLs are served directly. Without strong `Cache-Control` headers, browsers re-validate on every request (generating `/info` and `/public` calls).

---

### Changes

#### 1. Set aggressive cache headers on all uploads
**Files:** `src/components/staff/AnalysisManagement.tsx`, `src/components/staff/analysis/AnalysisPointsSection.tsx`, `src/components/staff/InlineVideoUpload.tsx`, `src/components/staff/PlayerManagement.tsx`, `src/components/staff/ActionVideoUpload.tsx`, `src/components/staff/EditHighlightDialog.tsx`, `src/components/staff/CreatePerformanceReportDialog.tsx`, `src/components/staff/marketing/ImageCreator.tsx`, `src/components/staff/analysis/VideoTrimmerDialog.tsx`

- Change all `cacheControl: '3600'` → `cacheControl: '31536000'` (1 year)
- These are immutable assets (unique filenames with timestamps/random strings) — they never change at the same URL

#### 2. Replace ghost video preloader with lightweight fetch-based warming
**File:** `src/hooks/useVideoPreloader.ts`

- Remove the hidden `<video>` element approach that creates, plays, and pauses ghost videos
- Replace with simple `fetch()` requests using `{ cache: 'force-cache' }` — this warms the browser's HTTP cache without creating media elements or triggering duplicate range-request chains
- This alone should cut preload traffic roughly in half

#### 3. Fix ClippedActionsPlayer to reuse video elements
**File:** `src/components/ClippedActionsPlayer.tsx`

- Remove the hidden prefetch `<video>` element (lines 146-155)
- Change `key={currentClip.video_url}` to a stable key and update `src` via ref instead of remounting — prevents destroying buffered data
- Use the fetch-based preloader from the hook for the next clip

#### 4. Fix ActionVideoPopup similarly
**File:** `src/components/ActionVideoPopup.tsx`

- Remove `key={videoUrl}` from the video element — update src via ref when URL changes to avoid remount

#### 5. Add storage-level cache headers via migration
**Database migration (SQL)**

- Update existing objects in `analysis-videos` and `analysis-files` buckets to have proper cache-control metadata. This ensures the storage layer returns `Cache-Control: public, max-age=31536000, immutable` on responses for clips.

#### 6. Add CDN-friendly headers to deployment configs
**Files:** `vercel.json`, `netlify.toml`, `public/_headers`

- Add cache headers for storage proxy patterns if applicable (primarily documentation — the real fix is at the storage upload level)

---

### Impact Estimate

- **Cache headers fix**: Eliminates all repeat-visit re-fetches (~60-70% of redundant traffic)
- **Ghost preloader fix**: Eliminates duplicate video element downloads (~20% reduction)
- **Remount fix**: Eliminates re-fetch on clip navigation within a session (~10% reduction)
- Combined: a viewed clip goes from 10-30 requests down to 1-2 (initial load + one range request)

