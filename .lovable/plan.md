
Four connected fixes across Player Database and the Transfermarkt bulk parser.

## 1. Anyone 18+ always shows a gold star

File: `src/components/staff/PlayerDatabase.tsx` — `EligibilityBadge`.

Right now a player only gets the gold star if `source === 'pro_outreach'`. Everyone else falls through to the age-rules block and ends up as `?` (no club country / no rule) or green tick / date pill even when they are already 18.

Change: as the very first check after computing `preciseAge`, if `preciseAge >= 18` return the gold star with tooltip "Adult — can be contacted directly", regardless of country, club, or rules. The country-specific parent-contact logic only runs for under-18s.

## 2. Representation status filter must read `agent_status`, not `representation_status`

The players table has two independent columns:

- `agent_status` — set by the Transfermarkt parser: `represented` / `family` / `unrepresented`. This is what the "Player details" panel edits.
- `representation_status` — legacy Rise pipeline stage (prospect, mandated, Other, Top Agency, scouted, fuel_for_football, etc). Currently the filter reads this, which is why it never matches what staff expect.

In `PlayerDatabase.tsx`:

- Extend `PlayerData` and every source mapping (`players`, `scouting_reports`, `player_outreach_youth`, `player_outreach_pro`) to carry `agent_status` alongside `representation_status`. Fetch `agent_status` from `players` in the base select.
- Replace `canonRepresentation(player.representation_status)` in the filter/facet logic with a new helper that resolves the canonical label from `agent_status` first, then upgrades to `Top Agency` when `representation_status` is `Top Agency` (that tier lives on the legacy column). Order: `Top Agency` > `Represented` > `Family` > `Unrepresented` > `Unknown`.
- Keep the same five canonical filter chips; only the underlying data source changes.

## 3. Filling `agent_name` via the Transfermarkt parser must set `agent_status`

Two places:

**a. `supabase/functions/parse-players-bulk/index.ts` (refresh_all + enrich):**  
Today it only sets `agent_status` when TM returns a recognised agency. Tighten so that whenever we write `agent_name` we also write `agent_status`:

- If the agency matches the tier-one list → `agent_status='represented'` and `representation_status='Top Agency'` (already done, keep).
- If any other agency name → `agent_status='represented'`.
- If TM confirms no agent (agencyId 0) → `agent_status='unrepresented'` (only when previously empty, do not overwrite manual `family`).

**b. One-off backfill via `supabase--insert`:**  
`UPDATE public.players SET agent_status='represented' WHERE agent_status IS NULL AND agent_name IS NOT NULL AND btrim(agent_name) <> '';` — then a second update to promote known top agencies (CAA, Wasserman, Stellar, Roc Nation, Base, ICM, Epic, Unique) to `representation_status='Top Agency'` when currently blank/Other.

**c. `PlayerDetailDialog.tsx`:**  
When the user types an `agent_name` and leaves `agent_status` empty, default `agent_status` to `represented` on save. Preserve any explicit choice.

## 4. Season stats actually populate for players with a Transfermarkt URL

Root cause of "most players still empty":

1. `refresh_all` in `parse-players-bulk` only runs stats for rows whose `links` contains a Transfermarkt URL AND whose category/representation is not excluded. Many represented players qualify but `fetchTmSeasonStats` (ceapi/performance-game) returns `null` (empty perf array, or all games filtered as national/friendly).
2. There is no fallback to the HTML `/leistungsdaten/spieler/{id}/saison/{year}` page that the older `sync-player-stats` function scraped successfully.
3. The `player_stats` row is never created for these players, so the UI reads "no stats".

Fixes in `supabase/functions/parse-players-bulk/index.ts`:

- **HTML fallback**: add `fetchTmSeasonStatsHtml(tmId)` that reproduces the `<tfoot>` scrape from `supabase/functions/sync-player-stats/index.ts` (Total row: appearances, goals, assists, minutes; goals_conceded/clean_sheets = 0). Call it whenever `fetchTmSeasonStats` (ceapi) returns null.
- **Always upsert a stats row** when a valid TM id exists, even if both sources return null — write zeros with `external_player_id=tmId` so the next run has a keyed row and the UI stops showing "No stats stored yet".
- **Widen the refresh_all candidate set** so a player is picked even when they only have a `transfermarkt_url` column (not just inside `links`). Union both extraction paths (`extractTransfermarktLink(links)` OR `players.transfermarkt_url` if the column exists on the row).
- **Concurrency**: keep at 3 workers, add per-player logging of `stats_source: 'ceapi' | 'html' | 'empty'` in the result so the toast can surface how many actually got stats.

Frontend `PlayerDatabaseManagement.tsx` toast: append `· N with stats` using the new counter returned from the function.

## Technical notes

- No schema changes; `agent_status`, `representation_status`, `agent_name`, `transfermarkt_url` all exist on `players`.
- The rep-status change is filter-only; the on-card badge stays as-is (it already shows what's editable in Player Details).
- Backfill runs once via `supabase--insert` — safe idempotent UPDATE.
- HTML fallback uses the same UA/headers already proven in `sync-player-stats`.

## Files to touch

```text
src/components/staff/PlayerDatabase.tsx           # star @18+, rep filter → agent_status
src/components/staff/PlayerDetailDialog.tsx       # default agent_status when agent_name set
src/components/staff/PlayerDatabaseManagement.tsx # surface "with stats" counter in toast
supabase/functions/parse-players-bulk/index.ts    # HTML fallback, always-upsert, wider candidate set, always-set agent_status
```

Plus a one-off backfill UPDATE on `public.players`.
