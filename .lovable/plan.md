## Problem

The proposal `a9rs5tv3` (to Ústí) lists both Tyrese (FC Vysočina Jihlava) and Mikie (TJ Jiskra Domazlice). The "WhatsApp Key Club Contact" button at the bottom of the proposal currently shows **one** contact, resolved from the **first** attached player's current club — so Mikie inherits Tyrese's Jihlava TD.

In `supabase/functions/get-club-outreach/index.ts` (lines ~88–174) the contact is computed once per link from `primaryPlayerId` (first sort_order) and exposed as `data.club_contact`. `ClubOutreachProposal.tsx` (lines ~530, 1377–1420) renders that single contact button.

## Fix

Make the Key Club Contact per-player when a proposal has multiple players from different clubs.

### Edge function — `supabase/functions/get-club-outreach/index.ts`

1. After resolving `entries`/`playerRows`, for each attached player look up their current club id via `players.club` → `club_map_positions`, then fetch the matching row from `club_outreach_club_contacts` (same logic that exists today for the single player). Build a `playerContactByPlayerId` map keyed by `player_id`.
2. Attach the resolved contact to each player object returned in `data.players` (e.g. `player.club_contact = { contact_name, contact_role, contact_phone, contact_accent, contact_image_url, contact_club_id, contact_club_name, contact_club_logo_url, transfermarkt_url }`).
3. Keep the existing top-level `data.club_contact` for backwards compatibility, but derive it from the primary player only.

### Proposal page — `src/pages/ClubOutreachProposal.tsx`

1. Update the players type to include the optional `club_contact` shape.
2. In the bottom contact block (lines 1377–1420), instead of rendering one button from `data.club_contact`, iterate over the attached players, dedupe by `contact_phone || contact_name`, and render one "WhatsApp Key Club Contact" button per unique club contact. Label each with the player's first name when there is more than one (e.g. "WhatsApp Tyrese's Key Club Contact – Sporting Director").
3. The floating pinned `tmUrl` button stays driven by the primary player's contact (unchanged behaviour).

### Deploy

Deploy `get-club-outreach`.

## Verification

Load `/club-proposal/a9rs5tv3` headlessly and confirm two distinct Key Club Contact buttons render: one for Jihlava (Tyrese) and one for Domazlice (Mikie), each with the correct name/role/image. Re-check a single-player proposal (e.g. `9upg25s5`) to ensure exactly one button still renders.
