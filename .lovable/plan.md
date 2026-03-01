

## Hybrid Upload Flow for 4GB+ Videos

### Problem
Lovable Cloud has an infrastructure-level upload cap (likely ~2GB) that rejects large files during the TUS creation handshake. This cannot be changed via code or bucket settings.

### Solution
A two-stage hybrid flow: compress first, then auto-split if the result still exceeds the cap. Parts are grouped under a single analysis record with multi-part playback controls.

---

### Technical Design

**1. Auto-detect and trigger hybrid flow**

In `VideoAnalysis.tsx`, `AnalysisManagement.tsx`, and `PlayerMatchClipper.tsx`, before starting TUS upload:
- If file size > 1.8GB, show a processing modal and route through the hybrid pipeline
- If file size <= 1.8GB, upload normally via TUS (existing flow)

**2. In-browser compression stage** (reuse existing `VideoCompressor` logic)

- Use the canvas + MediaRecorder approach already in `VideoCompressor.tsx`
- Apply "Balanced" preset (2.5Mbps video, keeps quality reasonable)
- If the compressed output is under 1.8GB, upload it directly via TUS as a single file — done

**3. In-browser splitting stage** (if compressed file still > 1.8GB)

- Use the video element's `currentTime` + MediaRecorder to split into sequential parts
- Each part targets ~1.5GB or ~45 minutes (whichever boundary comes first)
- Parts are numbered sequentially (Part 1, Part 2, etc.)
- Each part is uploaded individually via the existing TUS flow

**4. Grouped multi-part analysis record**

Database changes to `video_analyses` table:
- Add `part_number INTEGER DEFAULT NULL` column
- Add `group_id UUID DEFAULT NULL` column (links parts together)
- Add `total_parts INTEGER DEFAULT NULL` column

When a video is split:
- Generate a shared `group_id` UUID
- Insert one row per part with `part_number = 1, 2, 3...` and `total_parts = N`
- All parts share the same `title`, `player_id`, `opponent`, `match_date`

**5. Multi-part playback UI**

In the video analysis workspace (selected video view):
- If `group_id` is set and `total_parts > 1`, show part navigation controls: `< Part 1 of 3 >`
- Clicking next/previous swaps the video source and loads that part's clips/annotations
- The list view groups parts under a single entry showing "3 parts" badge

**6. New shared utility: `src/lib/videoSplitUpload.ts`**

```text
splitAndUpload(file, options) → Promise<{ groupId, parts[] }>

Steps:
  1. Compress via canvas (Balanced preset)
  2. Check size → if under cap, return single-part result
  3. Split into N parts using timed MediaRecorder segments
  4. Upload each part via TUS
  5. Return groupId + array of { partNumber, storagePath }
```

**7. Processing modal component**

New component `src/components/staff/coaching/LargeVideoProcessingModal.tsx`:
- Shows current stage: "Compressing..." / "Splitting part 2 of 3..." / "Uploading part 1..."
- Progress bar for each stage
- Cancel button
- Runs entirely in-browser, no edge function needed

---

### Files to create
- `src/lib/videoSplitUpload.ts` — hybrid compress + split + upload logic
- `src/components/staff/coaching/LargeVideoProcessingModal.tsx` — processing UI
- Migration to add `part_number`, `group_id`, `total_parts` columns to `video_analyses`

### Files to modify
- `src/components/staff/coaching/VideoAnalysis.tsx` — integrate hybrid flow on upload, add multi-part playback controls
- `src/components/staff/AnalysisManagement.tsx` — integrate hybrid flow for analysis video uploads
- `src/components/portal/PlayerMatchClipper.tsx` — integrate hybrid flow for player uploads

### Limitations
- Canvas re-encoding outputs WebM (not MP4), which is acceptable for analysis playback
- Processing a 4GB file in-browser will take several minutes depending on device performance
- The 1.8GB threshold is conservative to stay safely under the platform cap

