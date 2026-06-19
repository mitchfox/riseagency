## What you actually want

There is ONE schedule per player. It lives at the player level (`programming_weeks`).

Each programme (SPS or Technical) does not own its own schedule. It just says "I run across Week 3, Week 4, Week 5" and then those weeks from the global schedule are shown inside the programme. Editing a slot inside a programme edits the global week — there is only ever one copy.

```text
Player
 └── Programming Weeks  (global, single source of truth)
       Week 1, Week 2, Week 3, Week 4, ...
       Each week has Mon–Sun slots
       Each slot points at a real session

 ├── SPS Programme A
 │     linked weeks: [Week 3, Week 4, Week 5]
 │     → shows those same weeks inline, fully editable
 │
 └── Technical Programme A
       linked weeks: [Week 4, Week 5]
       → shows those same weeks inline, fully editable
```

Adding a session to a slot from inside the SPS programme writes to the global week, so Technical (and the player-level view) see it instantly. Same the other way around.

## Why this keeps failing

1. **Existing per-programme schedules were never migrated.** Every SPS programme has a real, correct `weekly_schedules` array sitting inside `player_programs`. None of it has been promoted into `programming_weeks`, so the new global schedule is empty and nothing shows in Technical.
2. **Programmes have no UI for "which weeks do I run across".** `linked_week_ids` columns exist on `player_programs` and `technical_programs` but nothing reads or writes them, so a programme has no way to declare its weeks.
3. **Inside a programme, the global weeks are not rendered.** SPS shows its own legacy week editor; Technical shows nothing. Neither pulls from `programming_weeks` filtered by `linked_week_ids`.
4. **Two schedule surfaces still exist for SPS.** The legacy `weekly_schedules` editor in `ProgrammingManagement` and the new `ProgrammingWeeksEditor` both write to different stores, so edits diverge.

## Fix

### 1. Migrate existing per-programme schedules into the global player schedule

For every existing SPS programme (`player_programs.weekly_schedules`) and Technical programme (`technical_programs.weekly_schedules`):

```text
for each week row:
  - create a programming_weeks row for that player
    (label = week.week || "Week N", week_start_date = week.week_start_date)
  - convert each day field (monday..sunday) into a slot:
      * if the value matches an SPS session key (A, B, ...) for that programme
        → slot.refId = sps:<programmeId>:session<Letter>
      * if it matches a technical_sessions.session_key for that programme
        → slot.refId = tech:<sessionId>
      * otherwise → slot.free_text = the raw value (Rest, Match, etc.)
  - push the new programming_weeks.id into that programme's linked_week_ids
```

Done via a SQL migration that runs once. After this, every programme already shows the right weeks under the new model, with zero data loss.

### 2. Add a "weeks this programme runs across" picker on each programme

Inside the SPS programme editor and inside each Technical programme:

```text
[ Week 3 (15 Jan) ] [ Week 4 (22 Jan) ] [ Week 5 (29 Jan) ]  [+ Add week]
```

- Add week opens the existing global weeks list (or creates a new one) and pushes its id into `linked_week_ids`.
- Removing a chip removes from `linked_week_ids` only (never deletes the underlying week).

### 3. Render the linked weeks inline inside the programme

Use the existing `ProgrammingWeeksEditor` but filtered to only the weeks in `linked_week_ids`. Same component, same data, same edit path. Editing a slot writes straight to `programming_weeks.slots` — no per-programme copy is kept.

This is the part that closes the loop: a slot edited inside SPS programme A is the same row Technical programme A reads.

### 4. Slot reference model (already in place, kept)

```text
slot = { refId: "sps:<programmeId>:sessionA" }
slot = { refId: "tech:<technicalSessionId>" }
slot = { free_text: "Rest" }
```

Clicking a populated slot opens the correct inline editor (SPS exercises or Technical drills/variations) — already implemented in `SessionQuickEditDialog`.

### 5. Remove the legacy SPS weekly schedule editor

The old `weeklySchedules` tab inside `ProgrammingManagement` is replaced by the linked-weeks view from step 3. The underlying `player_programs.weekly_schedules` column stays in place for safety but is no longer written to from the UI. Same for `technical_programs.weekly_schedules`.

### 6. Top of the player section: the full global schedule

At the player level (above the programme list) the `ProgrammingWeeksEditor` still shows every week the player has, unfiltered. This is the master view. Programmes are just windows into a subset of these weeks.

## Result

- One schedule per player. No duplication.
- All existing programme schedules preserved and visible everywhere.
- Each programme says which weeks it runs and shows them inline.
- Adding a session inside a programme appears immediately on the global view and any other programme that links the same week.
- Switching a session between SPS and Technical (via the existing toggle on Technical sessions) instantly reflects in both programmes that share that week.