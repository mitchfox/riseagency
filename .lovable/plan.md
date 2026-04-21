
Fix the incomplete Highlights implementation and annotation editor issues properly.

### 1. Make “Highlights” a real data report mode

**In `CreatePerformanceReportDialog.tsx`:**

- Add a clear `isHighlightsReport = reportCategory === "highlights"` branch.
- When Highlights is selected:
  - Hide fixture selection entirely.
  - Hide opponent, result, club logo and opposition colour.
  - Hide R90 score, minutes played and additional statistics.
  - Hide match graphics/stat tooling that only makes sense for match reports.
  - Add a required-looking but flexible **Highlights Title** field near the top.
  - Store that title in the existing `player_analysis.notes` field to avoid needing a schema change.
  - Use today’s date for `analysis_date` when there is no fixture.
  - Save `fixture_id: null`, `opponent: null`, `result: null`, `r90_score: null`, `minutes_played: null`, `striker_stats: null`, `fixture_stats: null`.
  - Do not block saving because no fixture is selected.

### 2. Manual action ordering for Highlights

**In `CreatePerformanceReportDialog.tsx`:**

- Stop auto-sorting Highlights actions by minute.
- Make `handleMinuteBlur` do nothing when the report is Highlights.
- Keep the existing up/down arrows visible and make them the primary ordering method.
- Hide the minute field in Highlights mode.
- Hide score entry and R90 score helpers in Highlights mode, while still allowing imported action scores to exist internally for staff reference and colour coding.
- Rename the actions section to **Highlight Clips** when in Highlights mode.
- Use `action_number` as the manual reel order.

### 3. Add clips from existing reports

**In `CreatePerformanceReportDialog.tsx`:**

- Add an **Add from Existing Report** button for Highlights mode.
- Open a wide dialog, not a narrow popup.
- First select one of the same player’s existing non-highlight data reports.
- Then show that report’s actions with:
  - action number
  - opponent/date
  - action type
  - description
  - action score with the existing score colour logic
  - clip availability indicator
- Clicking an action imports it into the Highlights report:
  - Copies `action_type`
  - Copies `action_description`
  - Copies `notes`
  - Copies `video_url`
  - Copies `clip_start`
  - Copies `clip_end`
  - Copies `action_score` for staff reference
  - Leaves `minute` blank
  - Gives it the next manual `action_number`
- Add duplicate prevention so the same source clip is not accidentally added twice.

### 4. Staff report list display

**In `ActionReportsList.tsx`:**

- Show Highlights reports with a distinct **Highlights** badge.
- For Highlights reports:
  - Display the saved title instead of `vs opponent`.
  - Hide the R90 panel if no R90 exists.
  - Hide minutes/result rows when empty.
  - Keep Edit/View/Play/Score buttons working where applicable.

### 5. Live report view support for Highlights

**In `PerformanceReportDialog.tsx`:**

- Fetch `category` and `notes` from `player_analysis`.
- Detect `isHighlightsReport`.
- If Highlights:
  - Title the dialog as a Highlights report.
  - Show the Highlights title from `notes`.
  - Hide opponent/result/R90/minutes/raw score sections.
  - Hide match-only visualisation buttons such as R90 Flow, heatmaps, match timelapse, chance creation, zone performance and shot map unless still relevant later.
  - Show clips in manual `action_number` order.
  - In the action list, hide minute and score columns for Highlights.
  - Keep the full-screen clip player working from the same existing player components.

### 6. Put Highlights reports on the portal Highlights tab only

**In `Dashboard.tsx`:**

- Split player analyses into:
  - regular performance reports: `category !== "highlights"`
  - highlights reports: `category === "highlights"`
- Exclude Highlights reports from:
  - Performance reports tab
  - Data tab
  - Comparisons
  - Video reports
- Add Highlights reports to the portal **Highlights** section, likely under a new sub-tab or section labelled **RISE Highlights**.
- Each Highlights report card will show:
  - title
  - date
  - number of clips if available
  - Watch button
  - Download all clips button
- Opening a Highlights report uses the same `PerformanceReportDialog`, but in Highlights mode.

### 7. Download this clip and all clips from live report view

**In `PerformanceReportDialog.tsx` and the shared video player components:**

- Add `showDownloads`, `onDownloadCurrent` and `onDownloadAll` support to the live report player path, not just portal video reports.
- Use clearer buttons:
  - **Download current clip** with `Download`
  - **Download all clips (.zip)** with `DownloadCloud`
- Add a reusable ZIP download helper using `JSZip`, following the existing Highlight Compiler export pattern.
- For all clips:
  - Fetch each clip URL
  - Strip `#t=` fragments before fetching
  - Use real file extension from content type where possible
  - Save as a ZIP named after the report or Highlights title
- For current clip:
  - Use direct download where the clip is already a standalone extracted file.
  - If only a media-fragment range exists on a full match URL, clearly download the source clip URL route available rather than pretending the browser can download only the fragment as a file. If needed, use the existing trimming function in a follow-up to produce physical clips.

### 8. Annotation editor play button and layout fixes

**In `AnnotationEditor.tsx`:**

- Fix the play button so it resumes from the current `video.currentTime`.
- Do not seek to 0 or restart unless the user presses the skip-to-start button.
- Increase the central overlay play button hit area and z-index so it is always easy to click.
- Increase the bottom transport play button size from the tiny 8x8 icon button to a larger 10x10 or equivalent control.
- Ensure the click target is not blocked by timeline markers or overlays.
- Increase the video area height without changing the video width:
  - Keep the 16:9 video ratio.
  - Give the video/canvas region more vertical space.
  - Reduce the height/padding of the lower toolbar/control area to compensate.
- Keep the existing width and overall editor structure intact.

### 9. Move selected annotation colour controls higher

**In `AnnotationEditor.tsx`:**

- When an annotation is selected, move the Colour controls above Timing.
- Keep Delete/Duplicate immediately accessible.
- Then show Colour.
- Then show Timing.
- Then show Size/shape-specific controls.
- This makes colour changes reachable without scrolling down the side panel.

### 10. Annotation timestamp precision protection

**In `AnnotationEditor.tsx`:**

- Tighten the existing freeze-frame grouping so separate annotations are only grouped when they are effectively the exact same timestamp.
- Use a tolerance below 0.1s, so even a 0.1s difference creates a separate freeze frame.
- Update trigger tracking to avoid rounding collisions that merge annotations close together.
- Preserve the behaviour where annotations created at the same instant can still appear together.

### Technical notes

- No new database schema is required for the Highlights title because `player_analysis.notes` already exists.
- The existing `category` field will be used with values: `match`, `training`, `highlights`.
- Existing RLS/auth rules remain unchanged.
- The implementation will avoid editing generated backend client/type files directly.
- All UI copy will use UK English and the existing dark Rise Gold styling.
