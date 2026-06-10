# Transfer Hub: show club contacts inline + full visibility

## Problem

1. **Staff Transfer Hub doesn't show clubs that have been contacted.** The "Club Outreach" tab inside `src/components/staff/TransferHub.tsx` is powered by `ClubOutreachManagement.tsx`, which only reads the legacy `club_outreach` table. The current outreach flow (`ClubOutreachManager.tsx`) writes to the new `club_outreach_links` / `club_outreach_link_players` / `club_outreach_communications` tables. Result: from the staff Transfer Hub it looks like nothing has been logged, even when it has been.
2. **Clicking a row opens a narrow dialog** for both the staff side (`ClubOutreachManagement` detail dialog at line ~106) and a few flows on the player side (`PlayerClubInterest` already uses inline collapse, but logging an update from the staff side uses a dialog). The user wants the row to expand inline so there is room to read history and add updates.
3. **Per‑player visibility is weak.** On the staff Transfer Hub the "Roster" tab lists players but doesn't show how many clubs have been contacted, when the last contact was, who was contacted, and the most recent reply. On the player Transfer Hub the "Club Interest" and "Club Updates" tabs work but are visually thin and don't show counts/last-contact summaries.

## What to build

### 1. Unify the data layer (read from both old and new tables)

Create a small helper `src/lib/transferHubData.ts` that, given a `playerId` (or `null` for "all"), returns a merged, deduplicated list of club contacts with this shape:

```ts
type ClubContactRow = {
  source: "new" | "legacy";
  outreach_id: string;     // links.id or club_outreach.id
  player_id: string;
  player_name: string;
  club_id: string | null;
  club_name: string;
  contact_name: string | null;
  contact_role: string | null;
  status: string;
  created_at: string;
  last_contacted_at: string | null;
  last_summary: string | null;
  last_next_step: string | null;
  communications_count: number;
};
```

Logic:
- Pull `club_outreach_links` joined with `club_outreach_link_players` (filter by `player_id` when given) and resolve `club_id` → `club_name` via `club_map_positions`.
- Pull `club_outreach_communications` for those link ids; compute count + latest per link.
- Pull legacy `club_outreach` (filter by `player_id` when given) and its `club_outreach_updates` for latest update.
- Merge, sort by `last_contacted_at ?? created_at` desc. Keep both rows if a club appears in both sources (don't drop legacy history).

Both staff `ClubOutreachManagement` and the player side already do versions of this; the helper consolidates them.

### 2. Staff Transfer Hub: inline expansion + new data

Update `src/components/staff/ClubOutreachManagement.tsx`:
- Replace the detail `Dialog` (`detailDialogOpen`, `selectedClubGroup`) with an inline expandable row using `Collapsible` (same pattern as `PlayerClubInterest`).
- Source rows from the new helper so links logged via `ClubOutreachManager` appear immediately.
- When expanded, show: full communications timeline (date, contact, channel, summary, next step) and an inline "Add update" form that writes to `club_outreach_communications` for new‑source rows or `club_outreach_updates` for legacy rows.
- Keep the existing "Add club outreach" dialog as is (creation is fine in a modal).

Update `src/components/staff/TransferHub.tsx`:
- "Roster" tab: add columns "Clubs Contacted" (count) and "Last Contact" (date · club · status badge) populated from the helper grouped by `player_id`. Clicking a player row expands inline beneath it showing that player's full club‑contact list (same component used in player Transfer Hub, see step 3) plus quick access to "Add update".
- Remove the modal pattern for per‑player drill‑down.

### 3. Player Transfer Hub: richer visibility

`src/components/player/TransferHub.tsx` tabs stay (Club Interest, Transfer Status, Club Updates, Agent Notes), but:
- Extract the per‑player club‑contact list into a shared component `src/components/transferhub/PlayerClubContactList.tsx` that renders the unified rows with inline collapse. Use it in both `PlayerClubInterest` (RISE‑contacted block) and the staff per‑player expansion in step 2.
- Add a small header summary on the Club Interest tab: "X clubs contacted · last activity {date}".
- "Club Updates" tab keeps the chronological feed but pulls from the same helper so nothing is missed.

### 4. Match the user's wording

When the helper returns at least one contact for a player, label it "Contacted" on both portals so staff and players see the same status. Use Rise Gold (`#C6A332`) for the count badge on the staff roster row, per the project design tokens.

## Out of scope

- No schema/migration changes. Both legacy and new tables remain.
- No edits to `ClubOutreachManager.tsx` logging flow (already done last turn).
- No changes to Transfer Status, Agent Notes, or Contracts tabs.

## Files

- **new** `src/lib/transferHubData.ts` — unified fetch helper.
- **new** `src/components/transferhub/PlayerClubContactList.tsx` — shared inline list.
- **edit** `src/components/staff/ClubOutreachManagement.tsx` — inline expand, use helper.
- **edit** `src/components/staff/TransferHub.tsx` — roster shows contacted counts + inline player drill‑down.
- **edit** `src/components/PlayerClubInterest.tsx` — render via shared list, add summary header.
- **edit** `src/components/player/PlayerOutreachUpdates.tsx` — pull via helper.
