# Club Outreach polish — round 3

## 1. Use the real sitewide Rise Gold `#C6A332`

The brand gold used everywhere else in the app (Stars icons, PlaylistManager, TransferReportView, AnnotationToolbar, MatchClipPlayer, ShotMapGraphic, etc.) is the hex constant `#C6A332`. The previous pass swapped to `hsl(43,96%,56%)` which is a brighter yellow and does not match. Revert every occurrence to `#C6A332` (and `rgba(198,163,50,…)` for shadows) in:

- `src/pages/ClubOutreachProposal.tsx` — loader spinner, hero eyebrow, slot pills, carousel arrows, fit recommendation block (border, background, eyebrow), card hovers, card icon tiles, card footer arrows, "Key Details" eyebrow, marble background club glow, footer accents.
- `src/components/staff/ClubOutreachManager.tsx` — New Outreach button, section divider gradients, card hover ring/shadow, status toggle selected state, player select highlight, dashed proof panel, Save defaults button, Log update button, contact icons, status icon tints.

Apply via a Tailwind constant pattern: introduce a local `const RG = "#C6A332"` at the top of each file and reuse with bracket classes (`bg-[#C6A332]`, `text-[#C6A332]`, `border-[#C6A332]`, `hover:border-[#C6A332]/60`, `hover:shadow-[0_10px_40px_-15px_rgba(198,163,50,0.4)]`). Status toggle "selected" pill becomes `bg-[#C6A332] text-black`.

## 2. Key Details card — correct club logo and league country

Current code uses the outreached club's `image_url` for the club tile (wrong — that's the destination club, not the player's current club) and the destination club's country for the league flag (wrong — should be the league's own country).

Changes:

- **Club tile**: resolve the player's current club logo from `club_map_positions` using `players.club`. Easiest place is the edge function `supabase/functions/get-club-outreach/index.ts`: after loading players, run a second `club_map_positions` query with `.in('club_name', uniqueClubNames)` and attach `player_club_image_url` + `player_club_country` to each player entry. Front-end then renders `entry.player_club_image_url` here, falling back to the first letter of `player.club`.
- **League tile**: derive country from the league string itself. Add a small helper `leagueCountryFromName(league)` in `src/lib/countryFlags.ts` that scans `countryCodeMap` keys (countries + demonyms) for the first whole-word match against the league string (case-insensitive). Examples: "Czech Liga" → `cz`, "Norwegian Eliteserien" → `no`, "Liga Portugal 2" → `pt`, "Bundesliga" stays unmatched and falls back to the player's club country (from step above) then nationality. Render that flag.

Drop the current `leagueCountry = club?.country` line entirely.

## 3. Club contact accent colour (manager dialogs)

Add an optional `club_contact_accent` colour per outreach link so staff can match the destination club's brand:

- Migration: add nullable `club_contact_accent text` to `club_outreach_links` (hex string, no constraint).
- `ClubOutreachManager.tsx` New Outreach + Edit dialogs: add a small native `<input type="color">` next to the contact name field labelled "Contact button colour". Persist on save.
- `get-club-outreach` edge function: include `club_contact_accent` in the returned `link` payload.
- `ClubOutreachProposal.tsx` "Your club contact" CTA: when set, use the picked hex as background and pick black/white text automatically using a luminance helper (`(0.299*r + 0.587*g + 0.114*b) > 150 ? '#000' : '#fff'`). When unset, keep the current outline style.

The WhatsApp CTA stays branded green regardless.

## 4. WhatsApp CTA label

Update the WhatsApp button label in `ClubOutreachProposal.tsx` from "WhatsApp the agent / Rise Football Agency" to:

- Primary line: **WhatsApp the Agent**
- Sub line: **Jolon Levene — RISE Football**

(use an en-dash, not an em-dash, per project prose rules).

## 5. New Outreach + status pill highlight

Already covered in step 1 — the selected pill in the three-state status toggle (`Ready/Drafts/Sent`) and the staff "New Outreach" button both move to `#C6A332` with black text.

## Files touched

- `src/pages/ClubOutreachProposal.tsx`
- `src/components/staff/ClubOutreachManager.tsx`
- `src/lib/countryFlags.ts` (new `leagueCountryFromName` helper)
- `supabase/functions/get-club-outreach/index.ts` (player club lookup + `club_contact_accent`)
- New migration: add `club_contact_accent` column on `club_outreach_links`.

No other behaviour changes.
