## Problem

In `PlayerAddMode.saveAccepted` the `player-database-refresh` event only fires once after the whole batch finishes (line 214). While AI bulk-add is processing dozens/hundreds of players, the count in the footer stays frozen, making it look like nothing is being added.

## Fix

Make the count update live as each player is saved:

1. **`src/components/staff/PlayerAddMode.tsx`** — inside the per-player loop in `saveAccepted` (and the equivalent manual-add save path), dispatch `window.dispatchEvent(new CustomEvent('player-database-refresh'))` immediately after every successful insert/update, not only at the end. Throttle to at most one dispatch per ~400ms so we don't refetch on every single row when the batch is huge.

2. **`src/components/staff/PlayerDatabase.tsx`** — the existing `player-database-refresh` listener already refetches. Ensure the refetch updates `players.length` and `sourceRecordCount` without blocking (it already does via `setState`). Add a light debounce on the listener (~300ms trailing) so rapid events during a big bulk import coalesce into smooth updates instead of hammering the DB.

3. Keep the final toast `${added} added, ${merged} merged` and the final refresh dispatch as-is so the closing state is always accurate.

No schema, RLS, or parser changes — this is purely a UI live-update fix.
