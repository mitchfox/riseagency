## Problem

Sergej Savic (and every other outreach-only player) never shows up in the "Create offer" autocomplete on Player Outreach.

The fetch in `src/components/staff/RepresentationOffers.tsx` does:

```ts
supabase.from("player_outreach_pro").select("id, player_name, position, club_name, nationality, date_of_birth")
supabase.from("player_outreach_youth").select("id, player_name, position, club_name, nationality, date_of_birth")
```

Neither table has a `club_name` column — the actual column is `current_club`. PostgREST rejects the whole select, so the `pro` and `youth` arrays come back empty and none of those players ever make it into `allPlayers`.

Confirmed via DB inspection: Sergej Savic exists in `player_outreach_pro` with `current_club` populated, and `player_outreach_pro` / `player_outreach_youth` have no `club_name` column.

## Fix

In `src/components/staff/RepresentationOffers.tsx`, in the `useEffect` that loads `allPlayers`:

1. Change the `player_outreach_pro` and `player_outreach_youth` selects from `club_name` to `current_club`.
2. Update the corresponding `push({ ... club: p.club_name ... })` calls to read `p.current_club`.
3. Wrap each per-table call so a single bad query doesn't silently drop the others (log the error to console for future debugging).

No other files change. Behaviour: typing "Sergej" (or any outreach-only player's name) in the Create Offer dialog will now surface them as a suggestion, with position/club/nationality pre-filled from the outreach record.
