## Why the counter is stuck at 0/3090

The edge function logs show `parse-players-bulk` dying with **"CPU Time exceeded"** on the very first invocation. The refresh job row is created and the first batch is kicked off, but that batch never finishes because the outreach "one-shot" pass tries to pull **up to 10,000 outreach rows** (5,000 youth + 5,000 pro) and hit Transfermarkt for each one that has no `transfermarkt_url`. It runs out of CPU before it can write any progress or chain to the next batch, so the job row stays at 0/0/0 forever and nothing else ever runs.

The keyset-pagination logic for the `players` table itself is fine — it just never gets a chance to run because outreach is blocking the whole first invocation.

## Fix

Two changes: (1) skip anyone already refreshed in the last 24h so we never redo the same work; (2) process everything — players and outreach — through the same small chained batches so no single invocation exceeds CPU.

### 1. Track "refreshed today" on the source rows

Add a `last_tm_refreshed_at timestamptz` column to:
- `players`
- `player_outreach_youth`
- `player_outreach_pro`

Every time a row is processed in `refresh_all`, stamp `last_tm_refreshed_at = now()`. When picking candidates, skip any row where `last_tm_refreshed_at > now() - interval '24 hours'`. This is the "skip already done today" the user asked for and it also means a resumed / retried job never re-scrapes the same player.

### 2. Turn outreach into cursor-paged batches (like players)

Replace the current one-shot outreach block with the same keyset-pagination shape used for `players`:
- Add `last_processed_outreach_youth_id uuid` and `last_processed_outreach_pro_id uuid` cursors on `transfermarkt_refresh_jobs`.
- Remove the `outreach_done` boolean and the `.range(0, 4999)` fetch.
- Each invocation pulls the next slab (ordered by `id`) after the cursor, filters out rows already refreshed today, takes up to N, processes them, advances the cursor.
- Job order per invocation: process a slice of `players`, then a slice of `player_outreach_youth`, then a slice of `player_outreach_pro`. When all three cursors are exhausted, mark the job `complete`.

### 3. Batch sizing that fits in CPU budget

Keep per-invocation CPU small so the first batch actually completes and chains:
- Per-invocation slice: **20 players + 15 youth + 15 pro = ~50 rows**, `runWithConcurrency` unchanged at 3.
- Interpret the user's "batches of 300" as the **outer progress window** — the UI shows `processed / total`, chaining continues automatically until the whole 3,090+ set is done. Real batch size stays small enough to survive Deno's CPU limit.
- If we want a bigger visible chunk, we can raise the slice a little, but each individual TM fetch is what costs CPU; going higher is what killed the current run.

### 4. Recompute `total_*` up front to exclude already-fresh rows

When `refresh-transfermarkt-start` seeds the job, count only rows where `last_tm_refreshed_at is null or last_tm_refreshed_at < now() - interval '24 hours'`. That way "0 / 3090" means 3,090 rows *left to do today*, and re-clicking the button after a completed run correctly shows "nothing to refresh" instead of restarting from scratch.

### 5. UI

`PlayerDatabaseManagement.tsx` doesn't need behavioural changes — it already subscribes to the job row over realtime and shows `processed / total_players`. The counter will start moving as soon as the first small batch completes and writes progress.

## Files touched

- **New migration**
  - `players.last_tm_refreshed_at timestamptz null` (+ index)
  - `player_outreach_youth.last_tm_refreshed_at timestamptz null` (+ index)
  - `player_outreach_pro.last_tm_refreshed_at timestamptz null` (+ index)
  - `transfermarkt_refresh_jobs`: add `last_processed_outreach_youth_id uuid`, `last_processed_outreach_pro_id uuid`; drop / stop using `outreach_done`.
- **`supabase/functions/parse-players-bulk/index.ts`** — rewrite the `refresh_all` block: skip-if-fresh filter on all three sources, per-source cursors, small slice per invocation, stamp `last_tm_refreshed_at` after each processed row, mark job complete only when every cursor is exhausted.
- **`supabase/functions/refresh-transfermarkt-start/index.ts`** — count only "not fresh in last 24h" for `total_players` and `total_outreach`.

## Result

- First invocation returns in seconds, writes progress, chains itself.
- Counter climbs steadily from 0 → 3,090+ over successive batches.
- Nothing gets refreshed twice in the same 24h window, so re-clicking is safe and cheap.
- Outreach no longer blocks the players refresh.
