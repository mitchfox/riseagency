## What I got wrong

- Built the wrong "alternate" feature on the proposal: a strip of mini player cards (pulling other outreach links + their player photos). That's the "AI images of other players" you've been telling me to kill. Those cards have to go.
- Removed the season-mode and season-id from the per-player settings panel after you told me the per-player stuff was perfect. Putting them back exactly as they were.

## What I will change

### 1. Club outreach proposal page (`src/pages/ClubOutreachProposal.tsx`)

Delete the entire "Alternate Profiles" mini-card strip (the section that renders `data.alternate_profiles.map(...)` with player photo / name / position / age / club tiles linking to other proposals).

In its place, add one wide thin card just above the closing contact CTAs:

```
┌──────────────────────────────────────────────────────────────┐
│ ALTERNATE OPTIONS                                            │
│ <free-text body — whatever the staffer wrote in the editor>  │
└──────────────────────────────────────────────────────────────┘
```

- Full max-width of the proposal column, thin vertical padding (matches the slim hairline cards already on the page).
- Heading: "Alternate Options" in the same gold eyebrow style used elsewhere on the proposal.
- Body: renders the existing `alternate_profiles_blurb` field as plain text (whitespace preserved). No images. No links. No cards. No player references unless the staffer types them in.
- Card only appears when the blurb is non-empty.

### 2. Club outreach editor (`src/components/staff/ClubOutreachManager.tsx`)

In the per-outreach edit dialog, the "Alternate profiles" section becomes a simple block:

- Label: "Alternate Options (optional)"
- Helper: "A wide thin card at the bottom of the proposal where you add extra detail — e.g. free-transfer alternatives, loan options, budget profiles."
- One `Textarea` bound to `alternate_profiles_blurb` (already exists).

Delete the "attach other outreach links" picker, the selected/available link lists, the "Save defaults for this player" button tied to link IDs, and all `altLinkIds` state and save paths.

Keep the column `alternate_profile_link_ids` in the DB untouched — just stop reading or writing it from the UI. No migration needed.

### 3. Per-player settings panel (same file)

Restore the two blocks I removed, exactly as they were:

- "Default season data display" pill group (Use global default / In-page popup / Link to Stars profile) bound to `playerDefaultSeasonMode`.
- "Default season to show" select bound to `playerDefaultSeasonId`, populated from `player_seasons` for the selected player.

Re-add the state (`playerDefaultSeasonMode`, `playerDefaultSeasonId`, `playerSeasonsForDefaults`), the loader effect, and the two fields in the `saveDefaults` upsert (`default_season_data_mode`, `default_season_id`).

### 4. Edge function (`supabase/functions/get-club-outreach/index.ts`)

No code path change required — the `alternate_profiles` array it returns will just be ignored by the new proposal UI. Leave it alone to avoid risk to other consumers.

## What I will NOT touch

- The "Players we've worked with" slider on /representation and /rise-with-us — that one pulls real photos from the `players` table and is staying.
- Anything else in the per-player panel.
- Any database schema.
