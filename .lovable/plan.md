### 1. LinkedIn button per contact on Market Tables
- In `MarketTablesTab.tsx`, beside each named technical director / chief scout / role contact, render a LinkedIn icon button.
- Blue brand colour when a `linkedin_url` exists on the contact (opens it in a new tab via `openExternalUrl`).
- Greyscale (muted) when missing — click opens a small inline prompt to paste a LinkedIn URL, saved straight back to the same row (`club_map_positions` for named TD/CS, `club_network_contacts` for network role contacts) via partial upsert so we don't clobber concurrent edits.

### 2. Green tick on clubs with an existing outreach
- Load all active `club_outreach_links` for the current season once (already partly fetched for Outreach Mode).
- Build a `Set<club_id>` of clubs that have at least one non-archived link.
- Render a small green check next to the club name in the Market Tables list (and keep the existing "Create club outreach" button working).

### 3. Fix "Unknown club" on Club Outreach
- Audit the resolver in `ClubOutreachManager.tsx` (`row.club = clubMap.get(r.club_id)`).
- Even though all current `club_id` values resolve in the DB, the card still falls back to "Unknown club" when:
  - `target_type` is `club` but `club_id` is null and only `prepared_for_name` is set (legacy / strategy drafts), or
  - the cached `clubMap` is stale because `load()` hasn't refreshed after a new club was created in this session.
- Fix by:
  - Falling back through `row.club?.club_name → row.prepared_for_name → "Unknown club"`.
  - Re-running `load()` (or merging the new club into `clubs`) immediately after the Create-Club flow returns, so newly created clubs resolve without a refresh.
- Apply the same fallback in `OutreachStrategyTab.tsx` (line ~302).

### 4. Auto-created outreach from Market Tables → show selected club in the picker
- When `MarketTablesTab.tsx` triggers "Create club outreach" for a known club, pass the `club_id` through to the new-outreach dialog and pre-select it in the Club selector so it visibly appears highlighted, not blank.
- The same pre-selection flows into the prepared-for / club_id fields on save.

### 5. Create-club-first flow when the club isn't in the outreach system
- Currently every market-tables club has an `id` in `club_map_positions`, but some lack a logo / image.
- New flow: when the user hits "Create club outreach" from Market Tables and the club has no `image_url` (or any minimum-info gap we define — logo missing is the practical case), first open the existing Create/Edit Club dialog in `ClubOutreachManager.tsx` pre-filled with the club name and id, so the user can upload a logo and confirm details.
- On save of that dialog, automatically open the New Outreach dialog with that club pre-selected (item 4).
- If a market-tables row truly has no `club_map_positions` entry yet, insert a stub row first using the same Create Club dialog, then continue into outreach creation.

### 6. Manual Relationships list
- `RelationshipsTab.tsx` currently lists every contact. Change behaviour:
  - Default view shows only relationships the user has explicitly added (existing `outreach_relationships` rows are already the right table — we just stop auto-seeding from network contacts).
  - Remove / disable any auto-population logic that mirrors all named TD / CS into relationships.
  - On Market Tables, add a small "Add to Relationships" action next to each named contact (TD, CS, role contacts). Clicking it inserts an `outreach_relationships` row keyed to that contact (storing club_id + role + name + any phone/email/linkedin we already have) so the Relationships tab picks it up.
  - Existing auto-populated rows that the user hasn't interacted with stay visible but can be removed individually; we don't bulk-delete them.

### Technical notes
- All Supabase fetches that span clubs continue to use `.limit(10000)` to avoid the 1000-row default.
- LinkedIn URL writes use partial upsert (only the `linkedin_url` column) so concurrent staff edits to other columns are preserved, consistent with the existing Market Tables concurrency model.
- New "Add to Relationships" inserts are idempotent by `(club_id, contact_name, role)` to avoid duplicates.
- No schema migrations expected if `club_network_contacts` and `club_map_positions` already have a `linkedin_url` column; I'll confirm in build mode and add a column via migration only if missing.
