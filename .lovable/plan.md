
## 1. Annotate a clip from Video Analysis

On each clip row in `src/components/staff/coaching/VideoAnalysis.tsx`, add an "Annotate" action next to Save/Edit. Clicking it opens the existing `AnnotationEditor` (from `src/components/staff/annotations/AnnotationEditor.tsx`) inside a wide-screen dialog, seeded with:
- `project.videoUrl` = the parent `video_analyses.video_url`
- `clipConstraint` = `{ start: clip.start, end: clip.end }` (already supported)
- `initialSeekTime` = `clip.start`, `autoPlay` = true

On save, persist the annotation payload (klips + drawings) back onto the clip as `clip.annotations` inside `video_analyses.clips` via the existing `saveClips()` path — no schema change needed (clips is jsonb). A small badge on the clip row indicates when annotations exist, and the Annotate button reopens them.

## 2. Crop / hide parts of a clip (change output resolution)

Reuse the existing `VideoCropDialog` (`src/components/staff/analysis/VideoCropDialog.tsx`) which already produces a `CropRect` (top/right/bottom/left percentages). Add a "Crop" button to each clip. Store the result as `clip.crop` in the clips jsonb.

Rendering:
- In-app preview (MatchClipPlayer, annotation preview) applies `clip-path: inset(...)` via the existing `getCropStyle` helper so the player sees the cropped frame immediately.
- On export (background export service in `src/lib/backgroundExportService.ts` / `clientClipExtractor.ts`), pass the crop to the canvas-based extractor. `canvasVideoProcessor.ts` already draws frames to a canvas; extend it to size the output canvas to the visible region and draw `drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH)` so the exported MP4 has the new (smaller) resolution baked in. Uncropped clips take the existing fast path unchanged.

## 3. New export destination: Player Outreach

Extend the export dialog in `VideoAnalysis.tsx`:

- Change `exportDestination` union from `"report" | "analysis"` to `"report" | "analysis" | "outreach"` and add a third tab "Player Outreach".
- When `outreach` is selected, show a player picker sourced from `player_outreach_youth` + `player_outreach_pro` (name + club, most recent first) — same lookup pattern already used elsewhere in outreach code.
- For each selected clip, run the same crop-aware extraction pipeline to produce an MP4, upload to the `analysis-videos` bucket (already public), then append an entry to that outreach row's `player_offer_settings.intro_media` array:
  ```
  { id, kind: "video", url, show: true, position: "intro", objectPosition: "50% 50%" }
  ```
  Merging with the existing array so nothing is overwritten (matches the pattern in `PlayerOfferCustomiser.tsx` and `InlinePlayerActionsPanel.tsx`). The RiseWithUs intro cinematic already rotates through `intro_media` where `kind==="video"`, so the clip appears in the videos space with no further wiring.
- Toast on success with a link back to that player's outreach settings.

## Technical notes

- No DB schema changes. `video_analyses.clips` (jsonb) absorbs `annotations` + `crop`. `player_offer_settings.intro_media` (jsonb) absorbs the new video entries.
- Respect the existing `guard_video_analyses` trigger (must not wipe clips/annotations arrays).
- Wide dialogs per project rule (annotation editor dialog uses `max-w-[95vw]`).
- UK English throughout ("Crop", "Annotate", "Player Outreach").

## Files touched

- `src/components/staff/coaching/VideoAnalysis.tsx` — clip row actions, export dialog third tab, outreach upload flow.
- `src/components/staff/analysis/VideoCropDialog.tsx` — used as-is.
- `src/components/staff/annotations/AnnotationEditor.tsx` — used as-is (wrapped in a new dialog).
- `src/lib/clientClipExtractor.ts` / `src/lib/canvasVideoProcessor.ts` — honour `clip.crop` when extracting.
- `src/lib/backgroundExportService.ts` — accept `destination: "outreach"` and target player id.
