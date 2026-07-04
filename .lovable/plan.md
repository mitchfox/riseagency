# Fix "Refresh all Transfermarkt" for 3000+ players

## Problems today

1. Every batch re-fetches up to 5000 youth outreach rows + 5000 pro outreach rows just to filter them by `skipIds`. Wasted work on every one of ~120 batches.
2. Batches are driven from the browser — closing the tab or losing network kills the refresh half-way through.
3. Progress toast only reflects what the current browser session has processed.

## What to build

### 1. Progress table for background refresh

New table `transfermarkt_refresh_jobs`:

- `id uuid pk`
- `status text` (`pending`, `running`, `complete`, `failed`, `cancelled`)
- `total_players int`, `total_outreach int`
- `processed int`, `updated int`, `with_stats int`
- `last_processed_id uuid` (cursor into `players` ordered by `name`)
- `outreach_done bool` (one-shot flag so outreach only ever runs once per job)
- `started_at`, `updated_at`, `finished_at`, `error text`
- Grants for `authenticated` + `service_role`, RLS: staff/admin can select+insert.
- Realtime enabled on this table.

### 2. Rework `parse-players-bulk` `refresh_all` mode

- Accept `{ mode: 'refresh_all', jobId, batchSize }`.
- Look up the job row, fetch the next `batchSize` (default 25, max 50) `players` rows with a TM URL after `last_processed_id`, excluding Scouted / FFF. Uses keyset pagination via `.order('name').gt('name', last_name)` so we never re-scan.
- If the job's `outreach_done` is false, process outreach youth + pro once, then flip `outreach_done = true`. Never fetched again after that.
- After processing the batch, update job row with new counters + `last_processed_id`.
- Return `{ done: bool, remaining_estimate }`. Before returning, if `!done` and there is time left in the invocation, self-invoke via `fetch` to `${SUPABASE_URL}/functions/v1/parse-players-bulk` with the same `jobId` so the chain continues server-side without the browser.
- On error, mark job `failed` with the error message and stop chaining.

### 3. New `refresh-transfermarkt-start` edge function

Small function the UI calls once:

- Counts eligible `players` (TM URL + not excluded) and outreach rows to seed totals.
- Inserts a `transfermarkt_refresh_jobs` row with `status='running'`.
- Kicks off the first `parse-players-bulk` invocation with the new `jobId` (fire and forget).
- Returns the `jobId`.

### 4. UI changes in `PlayerDatabaseManagement.tsx`

- "Refresh all Transfermarkt data" button now calls `refresh-transfermarkt-start`, gets a `jobId`, stores it in `localStorage`.
- Replace the browser `while` loop with a realtime subscription to the job row. Toast shows `processed / total · updated · with_stats · outreach done? · X remaining`.
- On mount, if `localStorage` has an in-flight `jobId` whose row is still `running`, reattach the subscription so refreshing or reopening the tab keeps showing progress.
- When the job flips to `complete`, show the final toast and dispatch `player-database-refresh` once.
- Add a small "Cancel" affordance that sets `status='cancelled'`; the edge function checks this before each batch and stops chaining.

### 5. Cleanup

- Remove the client-side `processedIds` set and the `skipIds` request field once the server-side cursor is live.
- Keep the old `mode:'enrich'` path unchanged — it targets a different problem.

## Result

- Outreach rows are fetched and processed exactly once per full refresh, not on every batch.
- The refresh keeps running server-side even if the tab is closed; reopening reattaches to live progress.
- All 3000+ players are covered via a keyset cursor with no duplicates and no 10k row cap.
- Progress numbers reflect real work done, not inflated re-scans.
