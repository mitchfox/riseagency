## 1. Normalise SPS (Strength · Power · Speed)

Today SPS programmes live as one giant `player_programs.sessions` JSONB blob (plus `weekly_schedules` JSONB). That's why edits need a Save button while Technical (row-per-session/drill) autosaves on blur. We'll mirror the Technical schema for SPS so every field writes immediately.

### New tables (mirror of Technical)

- `sps_programs` — id, player_id, program_name, phase_name, start_date, end_date, overview_text, is_current, display_order, linked_week_ids (uuid[])
- `sps_sessions` — id, program_id, session_key ("A"–"H"), session_kind ('main' | 'pre'), title, description, staff_notes, display_order
- `sps_exercises` — id, session_id, name, description, reps, sets, load, recovery_time, video_url, display_order
- All four with `GRANT … TO authenticated/service_role`, RLS scoped via existing staff role helpers, and `updated_at` triggers.

`programming_weeks.slots[*].refId` already supports `sps:<programId>:<sessionField>`. We extend the parser in `useProgrammingSessions` / `composeWeeklySchedules` to also resolve `sps:<sessionRowId>` for the new tables, so weekly schedules keep working unchanged from a slot-cell perspective.

### Editor rewrite

Replace the giant `ProgrammingManagement.tsx` SPS editor with a new `SpsProgramEditor` modelled exactly on `TechnicalProgramEditor.tsx`:
- Programme header row (name, phase, start/end, current, delete) using onBlur direct writes.
- Sessions as collapsibles (A/B/C… plus a "Pre-session" toggle on each).
- Exercises as drag-orderable rows; each field onBlur-saves to `sps_exercises`.
- Existing dialogs ("Save to coaching DB", "Exercise database selector", "Session database selector", paste/AI parse) get rewired to insert rows instead of mutating JSON.
- Remove `hasUnsavedChanges`, `saveProgrammingData`, the localStorage backup and the visible Save button. Show the same subtle "Saving…/Saved" toast pattern Technical uses.

### Data migration

One-off SQL inside the migration:
```text
For each row in player_programs:
  insert sps_programs (copy phase/overview/dates/linked_week_ids)
  for each session field A..H (+ preA..H):
    if sessions[field].exercises is non-empty:
      insert sps_sessions (session_key, session_kind)
      for each exercise: insert sps_exercises
  for each weekly_schedules entry:
    if a programming_weeks row doesn't already exist for that date:
      insert programming_weeks with slots derived from the legacy day strings
```
After back-fill, `player_programs` rows are kept read-only as a legacy fallback for one release, then dropped in a follow-up.

### Portal / renderer compatibility

Three places read the legacy shape today: `composeWeeklySchedulesForPlayer`, the player Dashboard, and `TechnicalProgramView` (SPS sibling). We update them in this order:
1. `useProgrammingSessions` and `composeWeeklySchedulesForPlayer` read from `sps_programs/sessions/exercises` first, falling back to `player_programs` only if no SPS rows exist for the player.
2. Portal SPS view (`SPSSessionView` / Dashboard "today" lookup) reads the new tables.
3. `replace-program` edge function + CSV importer + AI paste now insert into the new tables.

### Files touched (high-level)

- New: `supabase/migrations/<ts>_sps_normalise.sql`, `src/components/staff/programming/SpsProgramEditor.tsx`, small helpers next to it
- Edited: `ProgrammingManagement.tsx` (shrunk to a thin shell that lists programmes and embeds the new editor + weeks editor), `useProgrammingSessions.ts`, `composeWeeklySchedules.ts`, `StrengthPowerSpeedSection.tsx`, portal SPS renderers, `replace-program/index.ts`, `import-exercises*` scripts left untouched (developer scripts only).

## 2. Technical programme — clearer dates & layout

In `TechnicalSection.tsx`, the programme card header currently dumps name / phase / two unlabelled date inputs / buttons into one wrapping flex row. Fix:

- Two-row header: top row = programme name + phase + Current/Save/Delete buttons; second row = small captioned fields `Start date`, `End date` with `type="date"` inputs and a derived "Duration: 6 weeks" badge.
- Above each date input, a tiny uppercase label ("Start" / "End"). On hover, tooltip "Used to filter which weeks appear under this programme."
- Validation: if end_date < start_date, highlight the end date red and toast.

## 3. Show weeks that fit the programme's date period

In `ProgrammingWeeksEditor` when `programmeLink` is set:

- After loading `weeks` (currently just `linked_week_ids` resolved in order), look up the parent programme's `start_date` / `end_date`.
- If both are present, filter the displayed weeks to those whose `week_start_date` is between start_date and end_date (inclusive of the Monday containing start_date and the Monday on/before end_date).
- Show a small banner above the table: `Showing 6 weeks between 1 Sep 2026 and 12 Oct 2026.` with an "Outside this period (2)" toggle that re-includes the rest.
- New button `Generate weeks for this period` — creates one `programming_weeks` row per Monday in the range that isn't already linked, then links them. Reuses the existing date-math in `addNextWeek`.
- Sort the visible rows by `week_start_date` ascending so they line up chronologically regardless of `display_order`.

## Technical details

- All new tables follow the project's grant + RLS pattern (admin/staff write; players read only their own via `players.id = auth.uid()` join — same as Technical).
- The `slots.refId` format gains a second SPS variant `sps:<sessionRowId>`; the legacy `sps:<programId>:<field>` form keeps resolving via fallback until the legacy data is dropped.
- Date filtering uses UTC-safe parsing identical to `addNextWeek` to avoid BST/CET off-by-one.
- No changes to `technical_*` tables — only the header UI for programmes.

## Out of scope (flag for a later pass)

- Dropping `player_programs` JSONB columns — defer one release so we can confirm portal renderers are stable on the new tables.
- Reworking the AI paste/Excel importers to fully bypass the legacy shape — they'll keep building the JSON, then a small adapter splits it into the new tables.