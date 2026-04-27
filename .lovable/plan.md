## 1. Fix the intro text "loading to the right then moving" issue

**Root cause** (deep investigation): The `RepresentationIntro` component renders text in the `font-bebas` family with very wide letter-spacing (`tracking-[0.22em]`). Bebas Neue is loaded via Google Fonts using `display=swap` with a deferred stylesheet (`media="print" onload="this.media='all'"` in `index.html`). On first mount the lines are painted with the **fallback sans-serif** (which is narrower per-glyph than Bebas at the same point size). When the Bebas stylesheet finally arrives the text reflows wider, and because the lines are horizontally centred inside a flex slot, the centre point shifts — visually the line appears to start offset to the right and then "snap" to its correct position. Nothing about the framer-motion animation is moving on the X axis; the shift is caused entirely by the late font swap.

**Fix**

- In `index.html`: stop loading Bebas Neue via the `media="print" onload=…` trick. Load it as a normal blocking stylesheet (it's a single small webfont, the cost is negligible), so the first paint already uses the correct font.
- In `RepresentationIntro.tsx`: gate the entire intro behind `document.fonts.ready` (or specifically `document.fonts.load('1em "Bebas Neue"')`). While the font is still loading, show the existing pre-intro pulse / black background. Only flip to the line-1 phase once the font is guaranteed to be ready. This eliminates any chance of a swap mid-animation, even on slow connections.
- Add a short timeout (e.g. 1500 ms) so the intro still starts even if the fonts API rejects, to avoid hanging on browsers that block third-party fonts.

This combination removes the horizontal "settle" entirely, and also removes the same subtle shift on lines 2–5 because the font is guaranteed loaded before any of them mount.

## 2. Duplicate analysis on Staff → Analysis

Add a "Duplicate" action button next to the existing Eye / Pencil / Trash actions in `AnalysisManagement.tsx` (around line 1872). Behaviour:

- Reads the full row from the `analyses` table by `id` (deep clone, including all JSONB fields: `points`, `matchups`, `key_details`, `opposition_strengths`, `opposition_weaknesses`, scheme data, score data, video URLs, image URLs, colours, logos, etc.).
- Strips `id`, `created_at`, `updated_at` and any other auto-managed columns.
- Appends " (Copy)" to the title (or to `home_team` / `away_team` derived label) so it is distinguishable in the list.
- Inserts the new row, then `fetchAnalyses()` to refresh the list.
- Logs the activity via `logActivity({ action: 'duplicated', entityType: 'analysis', ... })`.
- Uses the `Copy` icon already imported from `lucide-react`.
- Same workflow used for the Concepts list (uses the same `analyses` table with `analysis_type = 'concept'`), so the Duplicate button is added in both places (next to the existing Pencil/Trash on concepts as well, around line 1915), keeping a consistent UX.

Videos are stored as URLs on the row, so the duplicate keeps the same playable URLs without copying any storage objects.

## 3. Duplicate programme on Staff → SPS Programming

Add a "Duplicate" button to each program card in `ProgrammingManagement.tsx` (around line 1568, next to "Make Current" / "Edit" / Delete). Behaviour:

- Reads the full `player_programs` row.
- Deep clones every field: `phase_name`, `phase_dates`, `overview_text`, `sessions` (all A–H and PRE-A–PRE-H session arrays with every exercise), `weekly_schedules` (all weeks with day text, colours, fixtures, images, teams, notes), and any other JSONB content.
- Strips `id`, `created_at`, `updated_at`, sets `is_current = false` (so the duplicate never silently replaces the current programme), assigns a new `display_order` (max + 1).
- Appends " (Copy)" to `program_name`.
- Inserts and refreshes the list.
- Uses the `Copy` icon already imported.

## 4. Stop fallback that exports the entire match video when a clip trim fails

**Where the bug lives**: `src/lib/backgroundExportService.ts` inside `startExportJob`. When `trimAndUploadClip` throws, the current code logs a warning and then **inserts the action row anyway, using the un-trimmed `sourceVideoUrl` (the full match) and the original `clip.start` / `clip.end` boundaries**. That is what the user is seeing: the report receives a row whose `video_url` is the entire video analysis source.

**Fix**

- Remove the "fall back to bounded full match URL" branch entirely. If `trimAndUploadClip` throws or returns no URL, mark `statuses[clip.id] = "error"`, `notify(...)`, and `continue` to the next clip. **Do not** insert any row for that clip.
- Adjust the toast summary to also report failures (e.g. `"5 exported, 1 failed — retry from the export progress widget"`), reusing the existing `restartCurrentExport` path which already retries clips that are not `done` / `skipped`.
- The `ReExtractClipsButton` already exists for the legacy migration case where a row has a full-video URL with `#t=` fragment. Behaviour there is fine and is unrelated to the new export path — left alone.
- No client-side fallback removal in `clientClipExtractor.ts` is needed; the canvas/MediaRecorder fallback inside `trimAndUploadClip` is still useful because it produces a real standalone clip. We only remove the *bad* fallback that wrote the full match URL into the report when both server-side and client-side trims failed.

The result: failed clips are visibly flagged as errors in the export progress widget, the corresponding action rows are simply not created, and the user can click "Restart" to retry only the failed ones — exactly the behaviour requested.

## Files touched

- `index.html` — load Bebas Neue as a normal stylesheet (no async swap).
- `src/components/RepresentationIntro.tsx` — wait for `document.fonts.ready` (with a safety timeout) before starting the line sequence.
- `src/components/staff/AnalysisManagement.tsx` — add Duplicate handler + button on analyses and concepts lists.
- `src/components/staff/ProgrammingManagement.tsx` — add Duplicate handler + button on each program card.
- `src/lib/backgroundExportService.ts` — remove the full-match-URL fallback; mark failed clips as `error` and skip insertion; surface failure count in the final toast.
