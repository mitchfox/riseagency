# Audit fixes

## 1. SPQ public test (`/spq`)

`src/pages/SpqPublicTest.tsx`
- Add an intro paragraph explaining the SPQ assesses where the player is mentally vs professional player profiles, and is used to identify which mental skills to work on.
- Remove every "Positive / Negative" indicator and the visible 0–4 scale next to each statement. Show only the five answer labels (Never / Almost never, Occasionally, Fairly often, Very often, Nearly always / Always). The scoring stays internal.
- After answering on mobile, smooth-scroll the next statement into the vertical centre of the viewport (`scrollIntoView({ block: 'center', behavior: 'smooth' })`).

## 2. SPQ saved report (staff `PsychologySection.tsx` + `SharedSpqReport.tsx`)

- Render the AI-generated report through `MarkdownContent` (it currently still ships through a plain `whitespace-pre-wrap` block in `SharedSpqReport.tsx`, which is why `**bold**` shows asterisks). Apply the same to any block in `PsychologySection` that still uses raw text.
- Scale Scores card:
  - Drop the "Raw X/32" line entirely.
  - Convert each sten to a percentile rank using `percentile = round((1 - stenToPercentile(sten)) * 100)` with the same lookup already used for the lineup, then display as e.g. "22nd" with a small caption "out of 100".
- Sten Profile and SPQ Matrix:
  - Stack vertically (one per row, full width) on the saved report layout; remove the `md:grid-cols-2` that puts them side-by-side. Each visual rendered at full container width so they read large.
- Scale Bands strip:
  - Replace `13/100` labels with ordinal `13th`.
  - Reverse the axis so 100 sits on the left and 1 on the right (further right = better). Update the header legend accordingly ("Worst in 100 ← → Best in 100"), and mirror marker positions (`left = (100 - percentile)%`).

## 3. Stars profile page name

`src/pages/PlayerDetail.tsx` (or wherever the SEO/page title is built) — currently outputs `$CF` before the name. Remove the stray `$` from the template literal so it renders as just `CF Tyrese Omotoye`.

## 4. Player edit (Staff → Management → Edit player)

Add two new tabs to the existing edit dialog/page:

### Hudl Reports tab
- Lists every Hudl playlist linked to the player.
- Toggle per playlist: "Visible on Stars page".
- Inside each playlist, list the clips with:
  - Visibility toggle.
  - Drag-handle reorder (dnd-kit, same pattern used elsewhere in the app).
  - Action score badge shown beside each clip when one exists.
- Persist to a new `player_hudl_visibility` table (playlist_id, clip_id, visible, sort_order, player_id) via Lovable Cloud migration.

### Form tab
- Lets staff pick which form stats to show (Goals, Passes/game, Pass %, Dribbles/game, Dribble %, etc.) and which window (last 5 / last 10).
- Saved selection rendered on the public stars profile as a slim banner between the key info block and the video player at the top of the page (`PlayerDetail.tsx`). Banner is short height, horizontally scrollable on mobile.
- Persist to `player_form_config` (player_id, window, stats jsonb).

## 5. Page transition — restore shader

`src/components/PageTransition.tsx` already renders `ShaderAnimation`, so the "..." the user is seeing is coming from a Suspense fallback or a separate loading element. Audit:
- `src/App.tsx` `<Suspense fallback={null}>` — confirm nothing else (e.g. `LoadingSpinner`, dot text) is rendering during route changes.
- Search `src/` for any component still rendering "..." or a dot loader during navigation and remove it.
- Ensure `PageTransition` overlay always mounts `ShaderAnimation` (no conditional that falls back to a text loader).
- Verify in preview by navigating between pages that only the shader+logo overlay shows.

## 6. Stars main page (mobile)

`src/pages/Stars.tsx`
- Reduce vertical spacing on the hero/intro/filter rows above the player cards on mobile only (`py-*` / `mt-*` → smaller `sm:` values, e.g. `py-4 md:py-12`). Goal: cards visible within roughly one swipe.

## 7. Stars profile page (mobile)

`src/pages/PlayerDetail.tsx`
- Move the "which video to show" selector chips to **directly below** the video player on mobile (`order-*` flex utilities). Desktop layout unchanged.
- Biography section on mobile: image becomes full-width, with the bio paragraph stacked underneath it.
- Highlighted Performance metrics card: stat keys like `crossing_movement_xc` overflow. Apply `break-words`, smaller mobile font, and on `<sm` either:
  - Abbreviate via a label map (`crossing_movement_xc → xC Crossing`), or
  - Break key/value onto two lines (`flex-col sm:flex-row`).
- "Read action report" popup (`Dialog`): add `pt-12` (or `mt-12`) to the content so the sticky "Enquire about Tyrese Omotoye" header doesn't cover the close button.
- "View full season report" popup: add full mobile responsive styles — `max-w-[100vw] sm:max-w-3xl`, `max-h-[90dvh] overflow-y-auto`, internal padding `p-4 sm:p-6`, same `pt-12` top spacing for the close button.

## Technical notes

- All UI uses semantic tokens; no hardcoded colours.
- New tables: standard RLS (staff full access, public read for `player_form_config` + `player_hudl_visibility` so the Stars page can render).
- Percentile formula already exists in `src/lib/spqScoring.ts` — reuse, don't reinvent.
- Stick to UK English throughout copy.
