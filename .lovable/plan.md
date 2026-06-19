## Goal

Make Strength/Power/Speed and Technical programming share one schedule, so clicking any day-cell session opens the owning session in an inline popup — no matter which section you're viewing.

## New architecture

```text
Programming Weeks (standalone, per player)
   ├── Week 1 (label + start date + per-day metadata)
   ├── Week 2
   └── ...
        ↑
   Programmes link to weeks (SPS programme OR Technical programme)
        ↑
   Sessions inside a programme each have a TYPE toggle: SPS | Technical
        ↑
   A day-cell holds a reference: { programme_id, session_id, label: "A" }
   The cell's colour/badge comes from that session's type toggle.
```

A single source of truth: **programming_weeks** per player. SPS and Technical programmes both reference the same weeks table. Day-cells store a typed reference to a session, not a free-text letter.

## Steps

1. **Schema**
   - New table `programming_weeks(player_id, label, week_start_date, display_order, slots jsonb)`. `slots` shape: `{ monday: { session_id, label } | { free_text: "Rest" } | null, … }`.
   - Add `session_type` column to `technical_sessions` ('sps' | 'technical', default 'technical').
   - Add `session_type` to SPS sessions (in `player_programs.weekly_schedules` we already have per-session objects — extend with `type`).
   - Add `linked_week_ids uuid[]` to `player_programs` and `technical_programs` so a programme inherits the weeks it runs across.
   - Keep legacy `player_programs.weekly_schedules` readable for back-compat; new edits write to `programming_weeks`.

2. **Shared `ProgrammingWeeksEditor` component**
   - Lists weeks for the current player. Add/remove/reorder.
   - Each day-cell is a picker: choose any session from any linked programme (SPS or Technical), or type free text (Rest/Match), or leave blank.
   - Session pills coloured by type (SPS = gold, Technical = blue) with a small SPS/T badge.
   - Used inside both `StrengthPowerSpeedSection` and `TechnicalSection`. Edits sync live via a shared query key.

3. **Per-session SPS/Technical toggle**
   - In `TechnicalProgramEditor`, add a Switch on each session card: "Type: SPS · Technical". Default Technical.
   - In SPS programme editor (`ProgrammingManagement`), add the same toggle. Default SPS.
   - Toggle just flips `session_type`; the cell pill colour updates immediately.

4. **Programme ↔ Weeks linkage**
   - On each programme card add a multi-select "Runs across weeks…" populated from `programming_weeks`. Saving updates `linked_week_ids`.
   - Schedule view filters to weeks linked to the visible programme, but the underlying weeks data is shared.

5. **Inline session popup (cross-section jump)**
   - New `<SessionQuickEditDialog>` — wide dialog (per project rule).
   - Clicking any day-cell pill opens the dialog with that session loaded (drills/variations editor for Technical, exercise list editor for SPS) — regardless of whether you're in the SPS or Technical section.
   - Save persists back to the owning table. Closing returns to the schedule untouched.

6. **Migration of existing data**
   - On first load per player, if `programming_weeks` is empty but `player_programs.weekly_schedules` has rows, seed `programming_weeks` from the SPS weeks and tag every existing letter as an SPS session (best-effort match by letter). User can re-tag via the picker.

7. **Cleanup**
   - Remove the read-only "shared schedule" notice in `TechnicalScheduleTab` — both sections now render the full shared editor.
   - Remove the day-clash trigger `validate_program_day_unique` (it becomes redundant; cell-level enforcement is structural — one slot, one reference).

## Technical notes

- All new tables get standard GRANT + RLS for `authenticated` (staff-only via `has_role`).
- `programming_weeks.slots` stays JSON for flexibility; FK-style integrity is enforced in the picker UI plus a server-side sanity trigger that nulls dangling `session_id`s when a session is deleted.
- One shared TanStack Query key `['programming-weeks', playerId]` so SPS and Technical views update each other instantly.
- Dialog uses existing `<Dialog>` wide variant (`max-w-5xl`).
