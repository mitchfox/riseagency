

## Plan

### 1. Analysis viewer annotations — restore freeze-only + per-timestamp tracking
Two real bugs in `ReadOnlyAnnotationPlayback.tsx`:

**A)** I previously broke the freeze-only contract by ungating the SVG (`renderedVisibleEls = visibleEls`). Revert: render the SVG ONLY while `freezeActive` is true.

**B)** Multiple annotations at different timestamps on the same clip currently bleed into each other because `lastFreezeTriggerTimeRef` advances to the latest `appearAt` of ALL currently visible elements (line 239), so a later annotation's window never opens cleanly. Fix the freeze trigger so each annotation triggers its OWN freeze on its OWN timestamp:
- Track triggered IDs per loop, NOT a "last trigger time" gate.
- On each tick, find any annotation whose `relTime` has reached `appearAt` and is not yet in `triggeredTimesRef` and not in `consumedIdsRef` — start a freeze containing only those whose `appearAt` is within ~0.2s of each other (so genuinely simultaneous ones group, but separated ones each get their own freeze).
- Remove the `el.appearAt > lastFreezeTriggerTimeRef.current` filter (root cause of the bleed).
- Keep `consumedIdsRef` so a triggered annotation does not refire mid-loop.
- On loop reset (backward jump), clear consumed + triggered (already done).

### 2. AnnotationEditor — clear triggered/freeze on entering drawing mode
In `AnnotationEditor.tsx`, when drawing mode is entered (and on `seek`), clear `triggeredTimesRef` AND `freezeElementIdsRef` AND reset `playbackFreezePhase` to idle. Also clear `freezeElementIdsRef` inside the `seek` callback (currently only `triggeredTimesRef` is cleared).

### 3. Toast auto-dismiss after 15s
Change the success toast in `VideoAnalysis.tsx` line 1762 to `toast.success("New action created with clip attached", { id: toastId, duration: 15000 })`.

### 4. Last-used colour persisted PER tool
In `AnnotationEditor.tsx`:
- Replace single `annotation-last-colour` localStorage key with a JSON map: `annotation-last-colour-by-tool` = `{ line: '#fff', arrow: '#C6A332', ... }`.
- When `activeTool` changes, read the saved colour for that tool (fallback to last used global, then Rise Gold) and `setActiveColor`.
- When user picks a colour, persist it under the current tool key in the map.

### 5. FAQs as a card section (not a separate area) on Request Representation
In `src/pages/RequestRepresentation.tsx`:
- Remove the standalone bottom block (lines 431-452) that re-renders all FAQs under the hub.
- Keep FAQs only as a card in the grid (already exists as `faqs` in `CARD_META`) — clicking it opens the detail view that already handles FAQ rendering at lines 292-308.
- Result: hub view shows just the 8-card grid, no separate FAQ section.

### 6. Searchable Player Combobox across staff
Build new shared component `src/components/staff/PlayerCombobox.tsx`:
- Wraps `cmdk`-based `Command` inside a `Popover`.
- Props: `players`, `value`, `onChange`, `groupedByStatus?`, `placeholder?`, `className?`.
- Type-to-filter (case-insensitive on name + position + club).
- Auto-opens dropdown when input is focused or has text.
- Enter key auto-selects when filtered list has exactly one player.
- Renders avatar + name + position chip identical to current `Select` items.
- Keeps grouping headers (Represented / Mandated / Trial / etc.) when `groupedByStatus` is true.

Roll out replacing existing `Select` player pickers in:
1. `AthleteCentre.tsx` (line 376)
2. `PlayerManagement.tsx` (sidebar player list — already custom, skip if not a Select)
3. `PortalManagement.tsx`
4. `HighlightMaker.tsx`
5. `HighlightCompiler.tsx`
6. `MarketingManagement.tsx` (any player Select usage)
7. `analysis/AnalysisQuickLink.tsx` (line ~341)
8. `programming/StrengthPowerSpeedSection.tsx`
9. `programming/NutritionSection.tsx`
10. `CoachingDataSection.tsx`
11. `ProgrammingManagement.tsx` fixture-player select

Verification: short list confirmed — quick scan during implementation will replace each.

### Files edited
- `src/components/portal/ReadOnlyAnnotationPlayback.tsx` — freeze-only render + per-annotation trigger
- `src/components/staff/annotations/AnnotationEditor.tsx` — clear refs on draw enter + per-tool colour persistence
- `src/components/staff/coaching/VideoAnalysis.tsx` — toast duration 15s
- `src/pages/RequestRepresentation.tsx` — remove standalone FAQ block
- `src/components/staff/PlayerCombobox.tsx` — NEW shared component
- ~10 staff files — swap Select for PlayerCombobox

### Validation
- Open analysis with multiple annotations at different timestamps: each triggers its own freeze at the correct time, nothing shows during normal playback. On loop, each fires again.
- Editor: scrub to a different timestamp, enter draw mode — no leftover annotations flash.
- Annotation editor: pick green for arrows, switch to line, pick white, switch back to arrow — green is restored.
- Create a new action in Video Analysis, the green toast disappears after 15 seconds.
- Request Representation hub: no separate FAQ block at the bottom; FAQs card opens the same FAQ view as before.
- Any staff player picker: type a few letters, dropdown filters, press Enter when one match remains.

