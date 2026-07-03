## Why the counter "resets"

`fetchLivePlayerCount` in `PlayerDatabaseManagement.tsx` runs ~900ms after each add (and on a debounce), and it does two things that fight the optimistic `+1`:

1. **It dedupes across four tables** (`players`, `scouting_reports`, `player_outreach_youth`, `player_outreach_pro`) using a `name::club` key. If a newly added player already exists as a scouting report or outreach row with the same name+club, the merged total does not go up by 1 — so the number visibly ticks up, then "snaps back" when the real fetch lands.
2. **It uses `.range(0, 9999)`** on every source, silently capping at 10k rows. As the DB grows past that on any single source, the merged count becomes wrong and unstable.

So the players *are* being inserted — the counter is just measuring something different from what the label promises ("live database players").

## Fix

Make the header counter mean exactly what it says — rows in `public.players`, minus the globally excluded categories — and make it authoritative so the optimistic tick and the refetch agree.

### Changes to `src/components/staff/PlayerDatabaseManagement.tsx`

1. Replace `fetchLivePlayerCount` with a single exact-count query:
   ```ts
   supabase
     .from('players')
     .select('*', { count: 'exact', head: true })
     .not('category', 'in', '("Scouted","Fuel For Football","FFF")')
     .not('representation_status', 'in', '("Scouted","Fuel For Football","FFF")');
   ```
   Use the returned `count` directly. No `.range`, no client-side dedup, no 10k cap.
2. Drop the cross-table merge helpers (`normaliseCountValue`, `mergedPlayerCountKey`, the scouting/outreach fetches) — they belonged to the old "source records" line that we already removed.
3. Keep the optimistic `+increment` on the `player-database-refresh` event, but shorten the debounce to ~250ms so the authoritative refetch lands almost immediately after the tick and can only ever confirm or correct by ±1, never snap by hundreds.
4. Update the label copy to match the new meaning: `"{n} players in database"` (excluded categories already filtered), so it's obvious what the number represents.

### No other files need changing

`PlayerAddMode.tsx` already dispatches `player-database-refresh` with `{ increment: 1 }` per successful insert — that stays as-is and will now agree with the refetch.

### Verification

- Add a player via AI bulk add → counter ticks +1, refetch confirms same number (no snap-back).
- Add a player whose name+club already exists in scouting_reports → counter still ticks +1 and stays (previously it snapped back).
- Reload page → number matches `select count(*) from players where category not in (...)`.
