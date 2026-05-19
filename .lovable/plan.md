## Scope
Two related changes to the staff performance report system: (1) better minute/score inputs on every action, and (2) a new "team" report variant that records which players were involved in each action.

---

## Part 1 — Flywheel minute & default-from-previous-action

Applies to every action minute input in `CreatePerformanceReportDialog.tsx` (lines ~2498, ~2730) and the new team-report editor.

- **Default minute on add**: when adding a new action, prefill `minute` with the chronologically previous action's minute (instead of empty). Click-to-edit still works as today.
- **Flywheel behaviour** on the minute field, always snapped to 5-second steps formatted as `mm.ss` (00, 05, 10, 15, …, 55):
  - Desktop: wheel up = +5s, wheel down = −5s. Use `onWheel` with `preventDefault` and pointer/hover gating so it only fires when the field is hovered/focused (avoid hijacking page scroll).
  - Mobile: vertical touch drag (touchstart/touchmove) on the field — every ~8 px of drag = 1 step (5s). `touch-action: none` on the field while dragging.
  - Existing click-to-edit text input retains current behaviour; blur snaps the value to the nearest 5s and re-formats as `mm.ss`.
- **Score field**: same flywheel pattern with sensible 0.05 increments (keeps existing typing behaviour). *(Optional — confirm if wanted; the spec only explicitly requested flywheel on minute. I'll include score only if you confirm.)*
- Wrap the behaviour in a small reusable `FlywheelInput` (or a `useFlywheel` hook) so both the player and team editors share it.

---

## Part 2 — Team Performance Reports

### Data model
Add a new migration:
- `player_analysis.report_type text not null default 'player'` with values `'player' | 'team'`. All existing rows become `player`.
- `player_analysis.team_roster jsonb default '[]'` — array of `{ number: int, name?: string, player_id?: uuid }`. Used only when `report_type = 'team'`. `player_id` lets us link to real `players` rows so a per-player breakdown can be generated; free entries (no link) are allowed.
- `player_analysis.is_scouting_report boolean not null default false` — marks the report as scouting so it surfaces in the scouting sections.
- `performance_report_actions.involved_players jsonb default '[]'` — array of `{ roster_id: string, score?: numeric }`. `score` is only set when the per-action score differs per player; otherwise each tagged player inherits the action's main `action_score`.

No changes to RLS policies needed (existing policies already cover the columns).

### Create / Edit flow (staff)
In the report creation flow:
- Choose **Player report** or **Team report** before opening the report editor. Existing reports keep their saved type and the editor only displays the type.
- When *Team report* is selected:
  - Hide the single-player picker; show a collapsible **Team roster** panel where staff add rows of `{ number, optional name, optional linked player }`. Drag-to-reorder; rosters persist on save.
  - The default action-entry mode becomes **Quick tag mode** (new): each action row shows the roster as a strip of small "number" chips; tapping a chip toggles that player as involved. The existing free-form fields (action type, zone, score, notes, etc.) stay below. A toggle exposes the original "classic" entry layout for power users.
  - **Minute**: uses the flywheel from Part 1, prefilled from previous action's minute.
  - **Score**: a single score input applies to every selected player. A "Set individual scores" button opens a popover listing each selected player with their own score input; once any differ, the main score input shows "Mixed" and the popover becomes the source of truth.
- **Mobile**: the action editor is rendered as a sticky bottom sheet pinned to the viewport with safe-area top/bottom padding so the active action row + roster chips + flywheel are always reachable.
- A **Scouting report** checkbox at the top of the dialog writes to `is_scouting_report`.

### Live report view (`PerformanceReport.tsx`)
- If `report_type = 'team'`:
  - Header shows the team roster in a collapsible tab (numbers, optional names).
  - Each action row shows the chips/numbers of the involved players inline.
  - Add a **Players** tab that lets the viewer pick any roster entry to see a generated per-player view: their actions only, their per-player scores (using `involved_players.score` when set, else the parent `action_score`), their own R90/totals computed from those filtered actions.
- For `report_type = 'player'`, the page renders exactly as today.

### Scouting integration
- Where the scouting sections currently list player analyses or scouted reports (e.g. `ScoutedPlayersSection.tsx`, scout portal views), include team reports where `is_scouting_report = true`. They appear as team-level scouting reports; clicking the linked roster entries (those with a `player_id`) deep-links into that player's per-player view of the team report.

### Sharing
- Team reports are shared via the same public URL as player reports — no player-tagging in the description text, as requested.

---

## Files affected
- new: `src/components/staff/flywheel/FlywheelMinuteInput.tsx` (+ optional `useFlywheel` hook)
- edit: `src/components/staff/CreatePerformanceReportDialog.tsx` — chosen report type display, roster, quick-tag mode, mobile sticky layout, flywheel + prev-action default, individual-score popover, scouting checkbox
- edit: report creation entry points — pre-create player/team choice and wide-screen pop-up
- edit: `src/pages/PerformanceReport.tsx` — team roster header, per-action player chips, Players tab
- edit: `src/components/staff/AllReportsSection.tsx` — filter/badge for team vs player and scouting
- edit: scouting surfaces (`ScoutedPlayersSection.tsx`, scout portal pages) — include team scouting reports
- new migration: `report_type`, `team_roster`, `is_scouting_report`, `involved_players`

---

## Open questions
1. Should the **score flywheel** also apply (5-something step), or is flywheel minute-only? (Spec said minute; I'll do minute only unless told otherwise.)
2. For a team report's overall `r90_score` and aggregate stats, do you want it computed (e.g. sum/average across roster) or left blank in favour of the per-player tab?
3. When a roster entry has no linked `player_id` (free entry, e.g. trialist #14), the per-player view should still work but can't link out — confirm OK.