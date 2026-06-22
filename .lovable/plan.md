## Hard guards: never silently wipe player data again

A blanket rule across the database and the app: destructive writes to player-owned content (programmes, sessions, exercises, weekly schedules, performance reports, analyses, stats) must either be an explicit user-initiated delete or they get rejected loudly. No trigger, no sync job, no "convenience" update is ever allowed to turn non-empty content into empty content.

### 1. Database-level guards (triggers)

Add `BEFORE UPDATE` guard triggers on every table that stores irreplaceable player content. Each one raises an exception if the update would shrink non-empty content to empty without an explicit `allow_clear = true` flag set in the same transaction (via `set_config('app.allow_clear','on', true)`).

Tables covered:
- `player_programs` — guard `sessions` and `weekly_schedules` (jsonb non-empty → empty blocked).
- `sps_programs` — block deletes that would orphan a non-empty `sps_sessions` set.
- `sps_sessions`, `sps_exercises` — block bulk delete unless the parent programme is being explicitly deleted.
- `technical_programs`, `technical_sessions`, `technical_drills`, `technical_drill_variations` — same pattern.
- `programming_weeks` — guard `slots` jsonb shrink-to-empty.
- `performance_report_actions` — block UPDATE that nulls out `action_type`/`timestamp` or sets `is_deleted` without user context; block bulk DELETE (>1 row in a single statement) unless explicit flag set.
- `analyses`, `player_analysis`, `player_other_analysis` — same shrink-to-empty guard on their content jsonb columns.
- `video_analyses` — block clearing `annotations` / `clips` when they currently have entries (the existing cleanup function is the only legitimate caller; it sets the flag).
- `performance_statistics`, `player_stats`, `r90_ratings` — block UPDATE that nulls/zeros a previously set numeric column unless flag set.
- `scouting_reports`, `transfer_reports` — block clearing body/summary fields.

Pattern (one helper function reused everywhere):
```text
create function public.guard_no_silent_wipe(col_old, col_new, table_label, col_label) …
  if current_setting('app.allow_clear', true) = 'on' then return; end if;
  if col_old is non-empty and col_new is empty then
    raise exception 'Refusing to wipe % on %. Set app.allow_clear = on in this transaction if intentional.', col_label, table_label;
```

Existing `sync_sps_program_to_legacy` already has a soft guard; convert it to call this helper so the rule is uniform.

### 2. Sync/trigger discipline

Rewrite every sync trigger to follow these rules — they're the class of code that caused the Tyrone wipe:

- A sync trigger may only write the columns its source row actually owns. Metadata updates on `sps_programs` (dates, name, phase, linked_week_ids) must never touch `player_programs.sessions`. Sessions only flow through when `sps_sessions` / `sps_exercises` actually change.
- A sync trigger that derives content from another table must short-circuit when the source is empty — never write `{}` over real data, ever.
- No trigger may DELETE from a player-content table; deletes are app-layer only.

Audit list to update now: `trg_sync_sps_program`, `trg_sync_sps_session`, `trg_sync_sps_exercise`, `trg_cleanup_legacy_after_sps_delete`.

### 3. App-level guards

- Add a small `safeMutate` helper around every UPDATE that writes a jsonb content column. It compares the prior row before writing; if the new payload is empty and the prior was non-empty, it aborts and toasts "Refusing to clear existing content — use the explicit Delete action."
- Any "delete programme/session/exercise/report" action must go through a confirm dialog that names what's being deleted and how many child rows go with it. No silent cascades from a side-effect handler.
- Remove every code path that writes `sessions: {}` or `weekly_schedules: []` as part of a metadata update. Metadata updates send only the metadata columns.

### 4. Daily backup snapshot (defence in depth)

Add a scheduled edge function `backup-player-content` that runs daily and writes JSON snapshots of `player_programs`, `sps_programs`, `sps_sessions`, `sps_exercises`, `technical_*`, `programming_weeks`, `performance_report_actions`, `analyses`, `player_analysis`, `video_analyses`, `scouting_reports`, `transfer_reports` to a private storage bucket `data-backups/YYYY-MM-DD/`. 14-day retention. If a wipe ever slips through, yesterday's snapshot is one click away.

### 5. Recovery path for Tyrone

Same plan as before — A: re-enter, B: paste the content here and I script it back in, or C: copy from another player as a template. Tell me which.

## Why this catches the next one

The Tyrone wipe required all of: a trigger that wrote derived content, an empty derived source, and a metadata-only edit. Each guard above breaks the chain independently:
- The DB trigger guard refuses the wipe even if the trigger is buggy.
- The sync discipline stops metadata edits from touching content columns in the first place.
- The app-layer `safeMutate` catches client-side mistakes before they reach the DB.
- The daily snapshot covers anything that bypasses all three.

## Technical details

- The helper uses `current_setting('app.allow_clear', true)` so legitimate clearers (explicit user delete, the existing video cleanup function) opt in with `perform set_config('app.allow_clear','on', true);` at the top of their transaction. Default behaviour is "refuse".
- "Non-empty → empty" for jsonb is defined as `(old is not null and old <> '{}'::jsonb and old <> '[]'::jsonb) and (new is null or new = '{}'::jsonb or new = '[]'::jsonb)`.
- For row-count-based tables (`performance_report_actions`, `sps_sessions`, etc.) the guard is a `BEFORE DELETE` statement-level trigger that counts affected rows and blocks bulk deletes without the flag.
- All guards are `SECURITY DEFINER`, `search_path = public`, raise with a clear English message that names the table and column so the source of the rejection is obvious in logs and toasts.
- Backups bucket is private, service-role-only, with a lifecycle rule that prunes objects older than 14 days.

Approve and I'll ship the migration, the app-layer helper, and the backup function in one pass, then we sort Tyrone's recovery.