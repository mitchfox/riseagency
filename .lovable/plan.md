## Club Outreach — fixes + expansion

### 1. Fix the 404 on the proposal link
The route `/clubs/:shortId` is registered in `App.tsx` but `risefootballagency.com/clubs/...` 404s. Two fixes:

- **Move the proposal route off the `/clubs` namespace** to remove any collision with the localised `/clubs` marketing page and the `clubs.` role subdomain. New canonical path: `/club-proposal/:shortId` (kept short and unambiguous). Old `/clubs/:shortId` will stay registered as an alias so any previously copied links keep working.
- Update `ClubOutreachManager` link generator to output `https://risefootballagency.com/club-proposal/{shortid}`.
- Note for the user: the published site needs a re-publish after the change, since the existing live build predates the route.

### 2. Multi-player proposals per club
A single outreach can now contain **one or many players** for the same club, picked by position.

- Schema change: add `club_outreach_link_players` (link_id, player_id, position_slot text, sort_order int, fit_recommendation text — moved here so each player gets their own personalised text). `club_outreach_links.player_id` is kept for backward compatibility but no longer required.
- Staff dialog (New / Edit Outreach):
  - Pick **club** (unchanged).
  - Add players one at a time: pick player → assign a **position slot** (free-text suggested list: GK, CB, FB, DM, CM, AM, W, CF — using existing position abbreviations memory). Repeat for as many players as needed.
  - Per-player **Fit & Recommendation** textarea (full-width).
- Public proposal page:
  - If only one player → existing single-player layout (no carousel).
  - If multiple players → top of page shows **position chips** (GK / CB / W …). Tapping a chip filters the carousel. Within a position with >1 player, a horizontal swipe carousel (snap, mobile-first) lets the club flip between players. Each slide renders the player block (hero image, name, key details, fit text, the four cards).

### 3. Card changes
- **Personalised "Fit & Recommendation" moves out of the 4-card grid** and becomes a **full-width card above** the four cards (per active player on the carousel).
- **4th card becomes "Key Details"** — Nationality (with flag), Age, Position, Current Club, League. Static info card, no link out. Pulled from `players` table.
- Cards 1–3 unchanged: Video & Data (Stars), Full Season Highlights, Proof of Representation.

### 4. Two contact options (agent + club official)
- New per-outreach fields on `club_outreach_links`: `club_contact_name text`, `club_contact_role text` (e.g. Technical Director), `club_contact_phone text` (E.164). Optional.
- Bottom of proposal page shows **two visually distinct WhatsApp/contact buttons**:
  - **Rise Football Agency** (existing global WhatsApp number, gold accent).
  - **{Club Contact Name} — {Role}** (e.g. "John Smith — Technical Director"), only rendered if filled in. Different styling (white/outline) so the distinction is unmistakable.
- Staff dialog gains a "Club Contact (optional)" section with three fields.

### 5. Outreach updates log ("File to Club Outreach")
Lets staff log who at the club was contacted, when, and what was said, so it can be surfaced on the player's **Portal → Transfer Hub** later.

- New table `club_outreach_communications`:
  - `id`, `outreach_id` (fk `club_outreach_links`), `player_id` (fk, nullable — to scope to a specific player on multi-player outreaches), `contacted_at timestamptz`, `contact_name text`, `contact_role text`, `channel text` (WhatsApp / Email / Call / Meeting / Other), `summary text`, `next_step text`, `created_by`, `created_at`.
- Staff dashboard: each outreach row gets a **"Log update"** button → opens dialog with the above fields + dropdown of players in that outreach. List of prior updates shown inline (collapsed).
- Player Portal → Transfer Hub: read-only feed of all communications where `player_id` matches the logged-in player, grouped by club. RLS allows the player to see only their own.

### 6. Data model summary

```text
club_outreach_links
  id, short_id, club_id, fit_recommendation (legacy), player_id (legacy nullable),
  club_contact_name, club_contact_role, club_contact_phone,
  created_by, created_at, updated_at, archived_at

club_outreach_link_players  (new)
  id, link_id fk, player_id fk, position_slot, fit_recommendation, sort_order

club_outreach_communications  (new)
  id, outreach_id fk, player_id fk nullable, contacted_at,
  contact_name, contact_role, channel, summary, next_step,
  created_by, created_at
```

All three tables: `GRANT` to authenticated + service_role, RLS:
- staff/admin manage all,
- anon SELECT on `club_outreach_link_players` only via the existing `get-club-outreach` edge function (no direct anon table grant needed — edge function uses service role),
- players: SELECT on `club_outreach_communications` where `player_id = (the player linked to auth.uid())` via `has_role` / existing player-auth pattern.

### 7. Edge function `get-club-outreach`
Returns:
- `link` (with new contact fields)
- `players[]` (each: player object, position_slot, fit_recommendation, signed PoR URL, highlights URL, stars URL)
- `whatsapp_number` (agency)
- Visit log unchanged.

### 8. Files touched / added

- `supabase/migrations/<new>` — schema for the 3 changes + RLS + grants.
- `supabase/functions/get-club-outreach/index.ts` — return multi-player payload + contact fields.
- `src/App.tsx` — add `/club-proposal/:shortId` route (keep `/clubs/:shortId` alias).
- `src/pages/ClubOutreachProposal.tsx` — full rewrite for: position chips, carousel, full-width fit card, Key Details card, dual contact buttons.
- `src/components/staff/ClubOutreachManager.tsx` — multi-player picker, position slot, per-player fit text, club contact fields, "Log update" dialog + history list. Link URL switched to `/club-proposal/...`.
- `src/components/portal/TransferHub*.tsx` (existing) — new section "Club outreach communications" reading from `club_outreach_communications`.

### Out of scope (v1)
- Translation of the proposal page (still English).
- Editing existing communications log entries (delete only).
- Notifying players automatically when a new communication is logged (can follow).
