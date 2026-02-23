
## Plan: Fix Video Loading, Add Drag-and-Drop Clips, and AI Fixture Stats Suggestions

### Issue 1: Videos not loading in Analysis Viewer

**Root cause**: `LazyVideo.tsx` hardcodes `type="video/mp4"` on the `<source>` element (line 82). Many clips are `.webm` files (extracted via `MediaRecorder` in `clientClipExtractor.ts`). Browsers won't play a source with the wrong MIME type, so these videos silently fail to load.

**Fix**: Detect the file extension from the `src` URL and set the correct MIME type (`video/webm` for `.webm`, `video/mp4` for `.mp4`, or omit `type` entirely to let the browser auto-detect).

---

### Issue 2: Drag-and-drop clip upload on Performance Report actions

**What**: Allow dragging a video file onto an action row in the performance report editor to upload it as the clip for that action.

**Approach**: 
- Wrap each action row in `CreatePerformanceReportDialog.tsx` with a drop zone that listens for `onDragOver` and `onDrop` events
- On drop, extract the video file and run the same upload logic as `ActionVideoUpload.handleFileSelect`
- Show a visual highlight (border glow) when dragging over an action row
- The existing Upload/Clip popover menu remains as the alternative

---

### Issue 3: Drag-and-drop video on Analysis point editor

**What**: Allow dragging a video file onto a point card in `AnalysisPointsSection.tsx` to add it to that point's videos.

**Approach**:
- Add drop zone handling to `SortablePointCard` in `AnalysisPointsSection.tsx`
- On drop, call the existing `handleVideoUploadForPoint` function
- Show a visual drag-over indicator

---

### Issue 4: AI suggestions for Fixture Stats

**What**: An AI button on the Fixture Stats editor that analyses all performance report actions for that fixture and suggests stat values. Each stat box shows a small suggested number underneath with a "+" button. Clicking "+" opens a tooltip showing which actions the AI thinks contribute to that stat. The AI should be lenient (inclusive rather than exclusive).

**Approach**:
- Add a "Suggest with AI" button to `FixtureStatsEditor.tsx`
- The component needs access to the performance actions for the current fixture/report -- pass them as a new prop
- Create a new edge function `suggest-fixture-stats` that:
  - Receives the list of actions (type, description, notes, minute) and the list of stat keys with labels
  - Uses Lovable AI (gemini-3-flash-preview) with tool calling to return structured suggestions
  - The prompt instructs the model to be lenient and inclusive
- Display suggestions as small numbers below each input with a "+" button
- Clicking "+" shows a popover listing which actions the AI thinks contributed
- Accepting a suggestion populates the input field

---

### Technical Details

**File: `src/components/LazyVideo.tsx`**
- Replace hardcoded `type="video/mp4"` with dynamic MIME detection based on file extension
- Helper function: if URL contains `.webm` use `video/webm`, if `.mp4` use `video/mp4`, otherwise omit type attribute

**File: `src/components/staff/CreatePerformanceReportDialog.tsx`**
- Add `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers to each action row
- Track which action is being dragged over for visual feedback (highlight border)
- On drop: upload the file to `analysis-files` storage, update the action's `video_url`, and call the callback

**File: `src/components/staff/analysis/AnalysisPointsSection.tsx`**
- Add drag-and-drop handlers to the `SortablePointCard` component
- On drop: trigger the existing `handleVideoUploadForPoint` flow by creating a synthetic change event or extracting the file and calling the upload function directly

**File: `src/components/staff/FixtureStatsEditor.tsx`**
- Add new props: `actions` (array of performance actions) and `fixtureId` (optional)
- Add "Suggest with AI" button next to the header
- State for AI suggestions: `Record<string, { value: number; reasoning: string; actions: string[] }>`
- Display suggestion below each stat input as a small chip with the suggested value and a "+" to accept
- Clicking the chip shows a popover with the AI's reasoning and contributing actions

**File: `supabase/functions/suggest-fixture-stats/index.ts`** (New)
- Edge function that receives actions and stat definitions
- Calls Lovable AI with tool calling to extract structured stat suggestions
- Uses lenient prompting: "When in doubt, include the action as contributing to the stat"
- Returns `Record<string, { value: number; reasoning: string; contributing_actions: string[] }>`

**File: `supabase/config.toml`**
- Add `[functions.suggest-fixture-stats]` with `verify_jwt = false`

**File: `src/components/staff/CreatePerformanceReportDialog.tsx`** (additional)
- Pass the current actions array to `FixtureStatsEditor` as a prop so AI can analyse them
