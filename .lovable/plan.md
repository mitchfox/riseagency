# Club outreach proposal polish

## 1. Unblock proof of representation

The `proof-of-representation` bucket is private. Even with a service-role signed URL, opening the link can land on Supabase's auth screen for some browsers, and any legacy rows where `proof_of_representation_path` is a full URL fail silently.

- Flip the `proof-of-representation` bucket to public via `storage_update_bucket` (matches other read-only document buckets like `analysis-files`, and contents are legitimately shareable to the receiving club).
- In `get-club-outreach`, change the URL builder to:
  - if the stored value already starts with `http`, return it as-is
  - otherwise return the public URL via `supabase.storage.from('proof-of-representation').getPublicUrl(path)`
- Keep the staff-only upload/update policy unchanged so only staff/admin can write.

## 2. Use the real Rise Gold everywhere on these screens

The current `#C6A332` is the dull token; the brand bright Rise Gold used everywhere else in the app is `hsl(43, 96%, 56%)` (≈ `#F5C518`). Replace every `#C6A332` reference in:

- `src/pages/ClubOutreachProposal.tsx` (chips, carousel arrows, hero glow, fit card border/eyebrow, card icons, CTA background and shadow, footer accents).
- `src/components/staff/ClubOutreachManager.tsx` — including the staff section's **New Outreach** button, the player selection highlights, the dashed proof panel, the Log update button, the Save defaults button, and any text/icon golds.

Use `hsl(43,96%,56%)` directly (or `text-risegold` where the alias resolves) so it matches the rest of the staff portal.

## 3. Redesign the Key Details card (card 04)

Replace the current label/value list inside `KeyDetailsCard` with a 2x2 grid of equal tiles inside the same card frame:

```text
+---------------------------+
|   [club logo]   |  AGE    |
|   club name     |   17    |
|-----------------+---------|
| [nationality]   | [league |
|  nationality    |  flag]  |
|                 |  league |
+---------------------------+
```

- Tile 1: club crest (`club_image_url` from `players.club` resolved via `useClubMaps`/`club_map_positions` lookup, fall back to first letter), with club name beneath.
- Tile 2: huge age number (≈ `text-5xl font-semibold`) with "yrs" suffix in muted text.
- Tile 3: nationality flag (`/flags/<iso>.svg` via `countryFlags` helper) with nationality label beneath.
- Tile 4: league country flag (derived from `players.league` → country via existing `countryClubTiers`/league-country map, fall back to club country) with the league name beneath.

Position is no longer needed (it already shows under the player name strip); drop it from this card to keep the four-tile grid clean.

## 4. WhatsApp-branded agent contact CTA

Update the agent contact button:

- Background `#25D366` (WhatsApp green), text white, hover slightly darker (`#1ebe57`).
- Replace `lucide-react` `MessageCircle` with an inline WhatsApp SVG logo (white).
- Keep the same shape, padding, and "Agent contact / Rise Football Agency" copy.
- The secondary "Your club contact" CTA stays in the existing outline style so the distinction is sharper.

## 5. Black marble background on the proposal page

The proposal page is currently flat black. Apply the smudged black marble used elsewhere in the brand:

- Add a fixed-position background layer using `@/assets/black-marble-smudged.png`, full viewport, `bg-cover bg-center`, overlaid with a subtle black gradient (≈ 70% opacity) for readability.
- Cards and the Fit & Recommendation block stay on translucent surfaces (`bg-white/[0.04]`, `backdrop-blur-sm`) so the marble shows through.
- Header club logo region gets a soft Rise Gold radial glow on top of the marble.

## Technical notes

- Files touched: `src/pages/ClubOutreachProposal.tsx`, `src/components/staff/ClubOutreachManager.tsx`, `supabase/functions/get-club-outreach/index.ts`.
- Bucket flip via `supabase--storage_update_bucket` (no migration needed).
- League-country resolution: add a small helper that maps league name → ISO country code using the existing `countryClubTiers` data; fall back to `players.country`/`club_map_positions.country` when unknown.
- No schema changes.
