

## Plan: Fix 4 Issues — Mobile Lag, Video Loading, Export Failures, Outreach Visibility

### 1. Mobile typing lag on Staff

**Root cause**: Every keystroke in any `StaffSearchInput` or search `Input` triggers `onChange` which calls `setState`, causing the entire parent component tree to re-render. On Staff (a massive page), this creates visible lag on mobile.

**Fix**: Debounce the search inputs.

**File: `src/components/staff/StaffSearchInput.tsx`**
- Convert to an uncontrolled-internally / debounced pattern: maintain a local `inputValue` state for immediate display, but only call the parent `onChange` after a 300ms debounce using `useRef` + `setTimeout`.
- This keeps typing instant while deferring expensive re-renders.

**File: `src/components/staff/PlayerOutreachPanel.tsx`** (line 782)
- Same fix for the inline search Input — wrap with debounced local state.

---

### 2. Sandra Martins vs Luton videos not loading

**Finding**: The video file exists in storage (`ef604f37-c0a8-4b9a-8a27-85ef1991b426.mp4`), auto-delete is March 30, 157 clips exist. The URL is valid. The file is not deleted.

**Likely cause**: The lazy-loading change from the previous optimization (partial `select()` excludes `clips` and `annotations` from list view). When the video is selected, `loadVideoDetail` must be called to fetch clips. If there's a code path where `selectedVideo` is set without calling `loadVideoDetail`, the video metadata loads but clips/annotations are empty, and the component may error or show nothing.

**Fix in `src/components/staff/coaching/VideoAnalysis.tsx`**:
- Ensure that when a video is selected (clicked), `loadVideoDetail` is always called before setting it as the active video.
- Add a loading indicator while detail data is being fetched.
- If `loadVideoDetail` fails, show an error state instead of silently rendering empty.

---

### 3. Clips failing on export to performance report

**Finding**: The `trim-video-clip` edge function has ZERO logs — it's not executing at all. The FFmpeg WASM import (`npm:@ffmpeg/core@0.12.6`) is crashing the edge function on boot, so every server-side trim silently fails. The client-side fallback then runs, which must download the entire source video, seek, and record in real-time. For large videos (like Luton with 157 clips), this regularly hits the 120s timeout.

**Root cause**: FFmpeg WASM is incompatible with the Deno edge runtime — the WASM binary is too large and the import crashes silently.

**Fix**:
- **File: `supabase/functions/trim-video-clip/index.ts`** — Replace FFmpeg WASM with a byte-range download + direct upload approach. Instead of downloading the entire video and running FFmpeg, use HTTP range requests to download only the relevant portion of the video and upload that segment directly. For MP4 files this won't produce a perfectly trimmed clip (no moov atom rewrite), so instead:
  - Download the full source video (kept as-is since it's needed)
  - Use a simpler approach: just upload the full source URL reference with start/end metadata, and let the client-side player handle the seeking (which it already does via `#t=` but as a stored reference rather than fallback)
  - OR: Fix the FFmpeg import by using a known-working CDN approach with explicit fetch of the WASM binary

- **Better approach**: Since the edge function FFmpeg is fundamentally broken, make the client-side trim more reliable:
  - **File: `src/lib/clientClipExtractor.ts`** — Instead of real-time recording (which takes as long as the clip), use the `MediaRecorder` with `video.playbackRate = 4` to speed up capture, reducing the effective time by 4x.
  - Add retry logic (up to 2 retries) before marking a clip as failed.
  - For the storage reuse check (line 146-155 of backgroundExportService.ts), the HEAD request checks for `.webm` but the server uploads `.mp4`. Fix: check both extensions.

**File: `src/lib/backgroundExportService.ts`** (line 146)
- Check for both `clips/${clipId}.webm` AND `clips/${clipId}.mp4` since server uploads .mp4 and client uploads .webm.

---

### 4. Player outreach — added but not found when searching

**Finding**: The insert succeeds (toast confirms). RLS policies are correct. `fetchData()` is called after insert. The data is split into 3 sections: "Not Messaged", "Awaiting Response", "Responded".

**Likely cause**: New entries default to `messaged: false`, so they appear in "Not Messaged". If that section is collapsed or the user scrolls past it, the player appears invisible. Also, if any filter is active (age, nationality, position, DOB range), a newly added player may be filtered out.

**Fix in `src/components/staff/PlayerOutreachPanel.tsx`**:
- After successful insert (line 362), auto-expand the "Not Messaged" section: `setExpandedSections(prev => ({ ...prev, notMessaged: true }))`.
- Clear the search query after insert: `setSearchQuery('')`.
- Clear all active filters after insert: `clearAllFilters()`.
- Scroll the new entry into view by adding a brief timeout and scrolling to top of the list.
- Add a highlighted "Just Added" indicator that fades after 3 seconds so the user can visually locate the new entry.

---

### Summary of file changes
- `src/components/staff/StaffSearchInput.tsx` — add debounce (300ms)
- `src/components/staff/PlayerOutreachPanel.tsx` — debounce inline search, auto-expand/clear after add
- `src/components/staff/coaching/VideoAnalysis.tsx` — ensure loadVideoDetail always runs on selection
- `src/lib/backgroundExportService.ts` — check both .webm and .mp4 for storage reuse
- `src/lib/clientClipExtractor.ts` — speed up capture with playbackRate, add retry
- `supabase/functions/trim-video-clip/index.ts` — fix FFmpeg WASM loading or replace approach

