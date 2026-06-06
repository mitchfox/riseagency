## Club Outreach — generate personalised proposal links for clubs

### Where it lives
New section in the staff portal under **Network & Recruitment** called **Club Outreach**, alongside Outreach Pipeline and Prospect Board. Standard SectionGridPicker tile + dedicated route.

### Staff-side flow
1. **Club Outreach dashboard** — list of all generated outreaches (player + club + created date + open/copy link + WhatsApp preview + delete). Search by player/club. Top-right buttons: **New Outreach** and **Settings**.
2. **New Outreach** dialog (wide, mobile-friendly):
   - Step 1 — pick **player** (excludes Scouted/FFF per global rule).
   - Step 2 — pick **club** from `club_map_positions` (existing coaching database clubs). If club has no logo, an inline upload prompts for it; the file is saved into the `club-logos` bucket and written back to `club_map_positions.logo_url` so it's reused everywhere.
   - Step 3 — fill **Fit & Recommendation** (rich text / multiline). This is the only per-outreach personalised content.
3. **Per-player Settings panel** (gear icon on dashboard, also reachable from any outreach):
   - **Stars link**: auto-derived from `/stars/{slug}` (read-only display, with override field if a player needs a custom URL).
   - **Full season highlights link**: auto-derived from the player's existing portal highlights page (read-only display, with override field).
   - **Proof of Representation PDF**: manual upload (PDF, stored in a new `proof-of-representation` private bucket, signed URL on render).
   - Defaults persist per player and are reused on every outreach for that player.
4. **Global Settings** (same gear, "Agency" tab): single configurable **WhatsApp number** used by every outreach's CTA.

### Public link (the proposal page)
- URL: `risefootballagency.com/clubs/{shortid}` (8-char nanoid, unguessable).
- Fully **mobile-first**, dark theme, Rise Gold accents, matches existing public page styling (parity with Stars/PerformanceReport public pages).
- **Header**: club logo prominently at top, "Rise Football Agency presents {Player Name}" beneath. Player headshot + position/age strip.
- **Four cards** (stacked on mobile, 2×2 on desktop), each tappable with hover lift / Rise Gold shine:
  1. **Video & Data** → opens the player's Stars page in new tab.
  2. **Full Season Highlights** → opens the highlights link in new tab.
  3. **Proof of Representation** → opens signed PDF URL in new tab.
  4. **Fit & Recommendation** → expands inline (or modal on mobile) to show the personalised text.
- **WhatsApp CTA** big sticky-ish button below the cards: "Discuss {Player Name} on WhatsApp" → `https://wa.me/{number}?text=...` prefilled with player+club context.
- English only for v1.
- View counter logged to a `club_outreach_visits` table for staff analytics (date, user-agent, referrer) — same pattern as `representation_visitors`.

### Data model
New tables (all under `public`, with grants + RLS):
- `club_outreach_links`
  - `id uuid pk`, `short_id text unique` (8-char), `player_id uuid`, `club_id uuid` (FK `club_map_positions`), `fit_recommendation text`, `created_by uuid`, `created_at`, `updated_at`, `archived_at`.
- `club_outreach_player_defaults`
  - `player_id uuid pk`, `stars_url_override text null`, `highlights_url_override text null`, `proof_of_representation_path text null` (storage path in private bucket), `updated_at`.
- `club_outreach_settings` (singleton row)
  - `id int pk default 1`, `whatsapp_number text`, `updated_at`.
- `club_outreach_visits`
  - `id uuid pk`, `outreach_id uuid`, `visited_at`, `user_agent`, `referrer`, `ip_hash`.

RLS: staff/admin manage all; **anon SELECT** on `club_outreach_links` (by `short_id` only via a security-definer function) and on `club_outreach_settings`; signed URLs for the PoR PDF via an edge function.

Storage:
- New **private** bucket `proof-of-representation`. Edge function `get-club-outreach` returns the resolved proposal payload + a signed URL for the PoR PDF (24h expiry, re-fetched on each page load).
- Reuse existing public `club-logos` bucket for any newly uploaded club logos; on upload, update `club_map_positions.logo_url` for that club.

### Components / files (new)
- `src/pages/ClubOutreachProposal.tsx` — public mobile-first proposal page (route `/clubs/:shortId`).
- `src/components/staff/recruitment/ClubOutreachDashboard.tsx` — staff list + new/edit dialogs.
- `src/components/staff/recruitment/NewClubOutreachDialog.tsx` — player → club → fit text wizard.
- `src/components/staff/recruitment/ClubOutreachSettingsDialog.tsx` — per-player defaults + agency WhatsApp number.
- `src/components/staff/recruitment/ClubLogoUploadInline.tsx` — used when picked club has no logo.
- `supabase/functions/get-club-outreach/index.ts` — resolves `short_id` → full payload (player, club, links, signed PoR URL, fit text).
- Wire route in `App.tsx` and add the section card under Network & Recruitment grid.

### Mobile optimisation specifics
- 100dvh layout, safe-area padding (existing patterns).
- Cards minimum 56px tap targets, large icons, generous spacing.
- WhatsApp CTA full-width on mobile, sticky bottom with safe-area inset.
- Logo scales responsively; player headshot uses existing 16:7 crop pattern.

### Out of scope (for v1, can follow)
- Translation of the proposal page.
- Per-staff WhatsApp sender selection.
- Edit history / versioning of the fit text.
