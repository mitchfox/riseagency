
# Round 2 — proposal & outreach upgrades

Scoped strictly to your latest feedback. Each section also flags my best understanding so you can correct before I cut code.

## 1. Rise With Us — intro media (clips + images, with layouts)

Today: `player_offer_settings.section_images` is a flat `Record<string, string>` of image URLs that appear on the final RISE-logo beat of the intro. Fixed layouts exist for 1–6 images.

Build:
- Migrate the store to `intro_media: Array<{ id, kind: "image" | "video", url, show: boolean, position: "intro" | "hub" | "both" }>` (keeping a back-compat reader for the old `section_images` shape so nothing breaks).
- Staff editor (in `PlayerOfferCustomiser`): per-item toggle for **Show**, dropdown for **Where** (Intro / Hub Why-Us strip / Both), and a small thumbnail preview. Add an "Add video clip" button alongside the existing image upload.
- Intro renderer: rotate the active items in/out (3–4s per beat, crossfade) instead of all appearing at once. Videos play muted/looped while on screen; images get a subtle Ken-Burns. Keep the existing 1/2/3/4/5/6 frame layouts but reuse them for whichever items are visible at any one time, so a single visible item still anchors centre-right rather than looking lost.
- Hub: items flagged `position: "hub"` (or `both`) feed into the Why Us / Stars strip instead of the current hard-coded FFF imagery.

## 2. Rise With Us — intro text alignment per language

Today: phase 1/2 paragraphs use `text-justify` + negative `wordSpacing`, which leaves the orphaned single-word line you're seeing.

Build:
- Drop `text-justify`, switch to `text-pretty` (CSS `text-wrap: pretty`) with a per-language `max-w-*` lookup so each language gets a measure tuned to its average word length (e.g. DE/RU wider, EN/IT narrower).
- Add a `widont` helper that swaps the last space in each paragraph for a non-breaking space to kill single-word orphans across every language.
- Same treatment for the name + invitation lines on phase 0.

## 3. "Stack in rating system" — clarification

You marked this auto-done on the note. In the codebase the proposal already shows the player's R90 ranking inside the "In Numbers" card. **Please confirm that's what you meant**; if you meant something else (e.g. a visible ladder of where they sit vs other Rise players), I'll scope it separately.

## 4. Why Us — proper build

Today: three credibility cards (FIFA / Network / Performance-led) and a 6-image strip pulled from the FFF project assets.

Build (this pass, with FFF content as the seed):
- Replace the static `WHY_US_IMAGERY` import with a curated FFF-style **"Players we've worked with"** strip: name + age-at-signing + headline outcome per face. Source content from the FFF project's player records.
- Add a **track record** mini-block under the three credibility cards (clubs reached, trials secured, retention rate) using the same FFF data while we wait for your richer source.
- All boxes pick up the slant motif (item 9 below) so this section reads as a single Why-Us slab.
- Leave a `whyUs.imagery` config hook so when you send the updated images/copy I swap them in without restructuring.

## 5. Club Outreach — multiple videos, Stars-style

Today: hero uses `player.first_highlight_url` only.

Build:
- New per-link field `selected_video_ids: string[]` on `club_outreach_links` (defaulting to `[first_highlight_url]`).
- Staff editor: multi-select chip picker listing all of the player's highlight clips. Order is drag-to-reorder.
- Proposal hero: render the same multi-clip carousel pattern used on the Stars profiles (auto-rotate, thumb dots, tap to switch). Single-clip case stays identical to today.

## 6. Club Outreach — Alternate Profiles link block

Build:
- New per-link field `alternate_profile_link_ids: string[]` plus `alternate_profiles_blurb: text`.
- Staff editor: search-and-add other outreach links to attach as alternates, plus a free-text blurb ("If budget is tight, here are free options…").
- Proposal renderer: bottom-of-page **Alternate Profiles** section — a button + the blurb + a horizontal strip of mini-cards (player face, name, position, age) each linking to the alternate outreach link.

## 7. Club Outreach — data popup vs Stars link

Today: Video & Data card opens the player's Stars profile in a new tab.

Build:
- New per-link toggle `season_data_mode: "popup" | "link"` (default `popup`).
- When `popup`: clicking the Video & Data tile opens a wide in-page sheet (full-screen on mobile, max-w-5xl on desktop) showing the same season stats / in-numbers / form blocks already on the Stars profile, with no navigation away from the outreach proposal.
- When `link`: existing behaviour.

## 8. Club Outreach — per-player saved defaults

New table `club_outreach_player_defaults` (one row per player) holding:
- `default_position` (auto-applies to new outreach links so you don't reset it each time)
- `default_selected_video_ids`
- `default_alternate_profile_link_ids` + `default_alternate_profiles_blurb`
- `default_season_data_mode`
- `default_key_details` override

When you add a player to a new club outreach link, these defaults seed the link. Manual overrides on a specific link don't write back to the defaults unless you tick "Save as default for this player".

## 9. Ballon d'Or vision — dedicated card

Today: lives as one pillar box with a "FOMO" badge.

Build:
- Pull it out into its own full-width card on the Rise With Us hub, above the existing pillar grid, with: a short ambition statement, the "why not you" framing, an urgency line ("we pick a small group — and the seats are filling"), and a CTA to the meeting booker. No badge — the urgency reads from copy + visual weight.
- Translation keys: `vision.headline`, `vision.body`, `vision.urgency`, `vision.cta`.

## 10. Auto-select position on Club Outreach

- The per-player default (item 8 above) sets the position when a new outreach link is created.
- Editor: position field shows a "Save as player default" toggle so you can pin it once.

## 11. Slant motif everywhere

Today: slant clip applied only to pillar boxes and the Stars showcase.

Build:
- Promote the `slantClip` polygon + `solidBlackSectionStyle` from `RiseWithUs.tsx` into a shared `src/components/SlantedBox.tsx`.
- Replace the rounded card containers in:
  - Club Outreach: hero metadata, Key Details tiles, Why Rise block, each section card, brand signature band, Alternate Profiles strip.
  - Rise With Us: scouting card, performance card, form/numbers/season-stats/strengths cards, meeting booker CTA.
- Keep border + shadow tokens identical so theming stays consistent; only the corner geometry changes.

---

## Order of build
1. **3** confirm with you (no code).
2. **9** Ballon d'Or card, **11** slant component rollout (visual foundations).
3. **2** intro text alignment, **1** intro media model + editor + renderer.
4. **4** Why Us proper build using FFF content.
5. **8** per-player defaults table + editor, then **10** auto position, **5** multi-video, **6** alternate profiles, **7** data popup all writing/reading through the defaults.

## Questions before I start

- **Item 3** — is "stack in rating system" the existing R90 ranking on In Numbers, or something more visible / different?
- **Item 4** — happy for me to pull seed Why-Us copy + faces from the FFF project now, with a clean swap-in once you send the new material?
- **Item 7** — popup as new default, OK to migrate existing links to `popup` automatically, or leave existing ones on `link` and only default new ones to popup?
- **Item 1** — intro rotation pace: 3–4s per beat with crossfade sound right, or do you want it slower / faster?
