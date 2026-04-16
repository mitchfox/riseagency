

## Plan: Fix Shot Map, My Tasks, Annotations & Remaining UI

### 1. Shot Map — Stop Auto-Displaying
Both `PerformanceReport.tsx` and `PerformanceReportDialog.tsx` set `showShotMap` to `true` by default. Change both to `false`. The button already only appears when shot map data exists — this just stops it opening automatically.

### 2. Shot Map — Visual Overhaul (Look Like a Real Goal)
Rewrite the rendering in `ShotMapGraphic.tsx`:
- Replace grid squares with a proper **white goal frame** (crossbar + posts) around the 15 in-goal zones, with a subtle net grid pattern inside
- Off-target zones (16-31) shown as a lighter area outside the frame
- **Outcome colours:** Goal = red, Saved = Rise Gold, Missed = grey, Blocked = blue (#3b82f6)
- **Selected shot:** white border ring. No shot selected by default (detail card only renders when one is clicked)
- Clicking a marker reveals action score, minute, type, description and notes

### 3. Shot Map — Goal Conceded Actions
In `ShotMapSelector.tsx`, extend the eligible action check so any action containing "Goal Conceded" in its type also gets the shot map option.

### 4. My Tasks — Drag & Drop Reassignment
In `StaffAccountabilityOverview.tsx`:
- Make `TaskCard` draggable (`draggable`, `onDragStart` stores task/schedule item ID and type)
- Make staff member tabs droppable (`onDragOver`, `onDrop`). On drop: update `assigned_to` for tasks or `owner_id` for schedule items in the database, then refresh
- Admin-only: add a **"Manage People"** settings dialog to hide staff members or set display aliases (persisted in `localStorage`)
- Fix the schedule Edit button: currently navigates to `/staff?section=...` which refreshes the page. Switch to programmatic section switching via state or proper `navigate` with `replace`

### 5. Annotation Scaling Audit
All renderers use `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` and `absolute inset-0`. This scales correctly as long as the parent container matches the video dimensions. Audit all 5 places annotations render:
- **AnnotationEditor** — has `aspect-video` container with `object-fill` video. Fine.
- **MatchClipPlayer** — `aspect-video` container, `object-fill` video, annotation div `absolute inset-0`. Fine.
- **VideoAnalysis** — Same pattern. Fine.
- **ReadOnlyAnnotationPlayback** — Self-contained component with its own video. Will verify container sizing.
- **ReadOnlyAnnotationOverlay** (in `AnalysisVideoReports.tsx`) — Overlays on the portal video player. Verify the parent is `relative` and sized to the video. Fix if needed.
- **ActionVideoPopup** — Currently has NO annotation overlay at all. If clips have annotations, they won't show here. Will add `ReadOnlyAnnotationOverlay` if clip has annotation data.

### 6. Request Representation — Final Fixes
- Remove the "Request Representation" eyebrow text on the hub page (line 287)
- Subtitle text and button widths already align within `max-w-sm`. Confirmed correct.
- Over 18 button already uses marble background. Confirmed.

### 7. Performance Report — Back to Top Button
Already exists with Rise Gold primary styling. Confirmed working.

### 8. Match Statistics — Collapsible
`showMatchStats` state already exists defaulting to `false` in the dialog. Verify the collapsible toggle is properly wired in both the dialog and public report.

---

**Files to edit:**
- `src/components/report/ShotMapGraphic.tsx`
- `src/pages/PerformanceReport.tsx`
- `src/components/PerformanceReportDialog.tsx`
- `src/components/report/ShotMapSelector.tsx`
- `src/components/staff/StaffAccountabilityOverview.tsx`
- `src/pages/RequestRepresentation.tsx`
- `src/components/portal/ReadOnlyAnnotationOverlay.tsx` (audit)
- `src/components/portal/AnalysisVideoReports.tsx` (audit)
- `src/components/ActionVideoPopup.tsx` (add annotation overlay if needed)

