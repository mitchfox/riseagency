## Technical Programming — parallel to Strength, Power & Speed

A new Technical section under Coaching → Programming. Sessions contain drills, drills can have variations (duplicated then edited), each drill/variation can carry a tactical-board diagram. Portal Programming shows SPS by default with a tab to switch to Technical. The weekly schedule is shared across both, so a given day slot can only hold one session (SPS or Technical, never both).

### Staff: new section

- New nav entry under "Programming" group in `src/pages/Staff.tsx`: id `technical`, title "Technical", same Dumbbell-style icon (use `Target` to distinguish).
- New component `src/components/staff/programming/TechnicalSection.tsx`, modelled on `StrengthPowerSpeedSection.tsx`:
  - PlayerCombobox at top with the same represented/mandated grouping.
  - Same timeline (reuse `SPSTimeline` against `technical_programs` rows) so coaches see Technical phases on a year strip.
  - Per-player program list with create/edit/delete, current flag, start/end dates — mirroring `ProgrammingManagement` but trimmed to the Technical data model.

### Technical data model (drills + variations + diagrams)

- A Technical program → many sessions → many drills → many variations.
- Each variation inherits its parent drill's fields and overrides only what changes (description, diagram, reps/sets, load, recovery). "Duplicate variation" copies the previous variation as a starting point.
- Reps/sets fields per drill or variation: `reps`, `sets`, `reps_per_side` (boolean), `load`, `recovery_time`, `notes`. UI shows "× each side" automatically when `reps_per_side` is true.
- Diagram = tactical-board JSON (pitch layout, players, cones, arrows, zones). Stored on the drill OR variation row. "Duplicate variation" copies the diagram JSON so the coach can edit from the same starting frame.

### Diagram editor

- New `src/components/staff/programming/DrillDiagramEditor.tsx` reusing the drawing primitives from `src/components/staff/coaching/TacticsBoard.tsx` (half-pitch + full-pitch options, drag tokens, arrows, labels).
- Opened from the drill/variation row as a wide dialog (per project rule: wide screen, not thin).
- Saves diagram JSON back to the drill/variation row.

### Unified weekly schedule (prevents clash with SPS)

- Both SPS and Technical programs surface their `weekly_schedules` into a single planner view keyed by `player_id` + ISO week + day-of-week.
- When a Technical session is dragged onto a day that already has an SPS session for the same player/week (or vice versa), the planner blocks the drop and shows a toast naming the conflicting session.
- The unified planner is rendered:
  - In the Technical section as a "Weekly Plan" card under the timeline.
  - In the SPS section in the same card slot so both sides see the same canonical schedule.
- Validation also runs on save (server-side check via the migration's `validate_program_day_unique` trigger described in Technical Details) so direct DB writes can't bypass it.

### Player portal

- In `src/pages/Dashboard.tsx` Programming view, add a top-level toggle: `SPS | Technical` (SPS default, matching current behaviour).
- SPS branch keeps today's UI unchanged.
- Technical branch loads from `technical_programs` and renders sessions → drills → variations with their diagrams (read-only). Diagrams render via a lightweight read-only renderer that reuses the same JSON the editor produces.
- Weekly schedule on portal shows both kinds of sessions on the same calendar grid with a small tag (SPS / Technical) per day so players see one combined week.

### Out of scope

- No changes to Nutrition, Psychology, Tactics Board, Athlete Centre.
- No edits to existing SPS data — Technical lives in its own tables.
- No mobile-only redesign; mobile uses the same components.

### Files to create / edit

- new `src/components/staff/programming/TechnicalSection.tsx`
- new `src/components/staff/programming/TechnicalProgramEditor.tsx` (sessions / drills / variations CRUD)
- new `src/components/staff/programming/DrillDiagramEditor.tsx` (tactical-board-style editor)
- new `src/components/staff/programming/DrillDiagramView.tsx` (read-only renderer)
- new `src/components/staff/programming/UnifiedWeeklyPlanner.tsx` (shared by SPS + Technical staff views)
- new `src/components/portal/TechnicalProgramView.tsx`
- edit `src/pages/Staff.tsx` — register section id, search keywords, route to `TechnicalSection`
- edit `src/components/staff/programming/StrengthPowerSpeedSection.tsx` — mount `UnifiedWeeklyPlanner`
- edit `src/pages/Dashboard.tsx` — add SPS/Technical tab in Programming view
- new migration creating Technical tables, RLS, GRANTs, and the day-uniqueness trigger

### Technical Details

Tables (all in `public`, with full GRANTs + RLS + admin/staff manage + player read-own policies):

```text
technical_programs(
  id uuid pk, player_id uuid fk players,
  program_name text, phase_name text, phase_dates text,
  overview_text text, schedule_notes text,
  start_date date, end_date date, is_current bool,
  weekly_schedules jsonb default '[]',
  display_order int default 0,
  created_at, updated_at
)

technical_sessions(
  id uuid pk, program_id uuid fk technical_programs on delete cascade,
  session_key text,            -- 'A', 'B', stable within program
  title text, description text,
  display_order int default 0,
  created_at, updated_at
)

technical_drills(
  id uuid pk, session_id uuid fk technical_sessions on delete cascade,
  name text, description text,
  reps text, sets text, reps_per_side bool default false,
  load text, recovery_time text, notes text,
  diagram jsonb,               -- base diagram
  display_order int default 0,
  created_at, updated_at
)

technical_drill_variations(
  id uuid pk, drill_id uuid fk technical_drills on delete cascade,
  label text,                  -- 'Variation 1', or coach-named
  description text,
  reps text, sets text, reps_per_side bool default false,
  load text, recovery_time text, notes text,
  diagram jsonb,               -- copied from parent or previous variation on duplicate
  display_order int default 0,
  created_at, updated_at
)
```

Diagram JSON shape (shared with TacticsBoard primitives):

```text
{
  pitch: 'full' | 'half',
  orientation: 'horizontal' | 'vertical',
  tokens:   [{ id, kind: 'player' | 'cone' | 'ball' | 'gate', x, y, label?, color? }],
  arrows:   [{ id, from:{x,y}, to:{x,y}, kind: 'pass'|'run'|'dribble'|'shot' }],
  zones:    [{ id, shape: 'rect'|'circle', x, y, w, h, color }],
  notes:    string?
}
```

Day-uniqueness rule across both program types:

- DB trigger `validate_program_day_unique` runs on insert/update of `player_programs.weekly_schedules` and `technical_programs.weekly_schedules`. For each `{ week, day }` it builds the combined set across both tables for the same `player_id`. If a day appears in more than one program with a non-empty session, the trigger raises `Schedule clash on {week} {day}: already used by {other program}.`.
- Client-side guard mirrors this in `UnifiedWeeklyPlanner` so the conflict is surfaced before save.

UI rules:

- "Reps per side" toggle renders as a small "× each side" suffix in displays. Example: `8 × 3  each side`.
- Variations panel inside a drill: list with "Duplicate" button on each row that inserts a sibling variation pre-filled from the source (including diagram JSON, deep-cloned, with a new id).
- Drill rows show a thumbnail of the diagram (small SVG) when present; clicking opens the editor dialog.

Portal:

- Tab state stored in `localStorage` key `portal.programmingTab` so player choice persists between visits.
- Read-only views fetch with `eq('player_id', currentPlayerId)` and rely on the new RLS policy `players can read own technical programs` (joined through `players.email = auth.email()` to match existing patterns in this repo).
