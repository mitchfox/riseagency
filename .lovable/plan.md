# Representation page — full refresh

All changes scoped to `src/pages/RequestRepresentation.tsx` plus the existing `SmokeOverlay`, `SectionSliderWheel` and `RiseBrandedLoader` components, with the language picker swapped to the existing `LanguageMapSelector`.

## What changes (user-facing)

### 1. Language selector
Swap the dropdown for the existing map-based picker (`LanguageMapSelector`) used elsewhere on the site, pinned top-right with a subtle pill backdrop.

### 2. Smoke overlay — much more visible
- Increase opacity from ~0.2 to **~0.85** on the white layer and **~0.7** on the gold layer.
- Make the texture cover the whole viewport (full bleed, mid-layer position) rather than a faint footer band.
- Larger background-size, lighter blur, brighter blend so the drift is obvious. Speed unchanged.

### 3. Age bracket screen
- Remove all-caps lockup on the helper line. Copy becomes:
  *"Choose your age bracket for a more personalised breakdown of what representation will look like for you."*
- Visually tie the line to the two buttons (sits directly above with a thin gold rule).
- Tablet/desktop: proper 2-column hero (image left, copy + buttons right), no stretched fills.

### 4. Hub screen (after age picked)
- Remove the two intent buttons ("I want to be signed…" and "What do I get from RISE?").
- Cleaner centred header: "REPRESENTATION" with the agency mission/bio (the same one used on the site footer) centred underneath. No oversized hero image.
- Hub background becomes plain dark black; the marble texture is **only** used as a backdrop behind the section icon/title cards (so it never stretches or tiles awkwardly).
- Cards reordered and grouped by three labelled dividers:
  - **Who We Select** — Scouting, Expectations
  - **How We Work** — Performance, Club Network, Brand
  - **What Are The Terms** — Fees, Agreement, FAQs
- Layout sized so the first divider's cards land within the first viewport on mobile and desktop, with a clear "scroll for more" cue.

### 5. Section detail (drilldown) — full screen takeover
- Tapping a section opens its own full screen view (replaces the whole hub, not an inline panel below).
- Each section keeps its own back arrow that returns all the way to the hub.
- The section title is shown **once** (next to the icon) — the duplicate large heading underneath is removed.
- Marble appears only behind the icon/title plate, the rest of the page is dark black.

### 6. Scouting → Position drilldown
- Tapping a position takes over the full screen with the four domain breakdowns (Physical, Mental, Technical, Tactical) and a back arrow returning to the Scouting section. Position stays selected (not reset).

### 7. Performance — proper sub-sections
- Performance opens to a tile grid of sub-sections (Analysis, Action Reports, SPS, Nutrition, Technique, Psychology) with a clear "tap for more" affordance. The footer slider is hidden at this level.
- Tapping a sub-section opens its own full screen with title, longer descriptive copy and (for Action Reports) the Ronaldo example link. Back arrow returns to the Performance grid.

### 8. Section slider (footer)
- Only visible while inside a category section (not on the hub or on Performance's grid).
- Above the slider: small "← Back to all" pill.
- Slider only shows the **siblings within the current group** (Who We Select / How We Work / What Are The Terms) so labels never collide.
- Add real spacing between visible items; allow neighbours to clip off-screen so the centre item always has clear padding around it. Bullet separators stay in Rise Gold.

### 9. Sticky CTA buttons
- Both buttons become two-line stacks with a small icon centred above them:
  - Primary: small arrow icon top, then `REQUEST` / `REPRESENTATION` on two lines.
  - Secondary: small WhatsApp icon top, then `CONTACT` / `US` on two lines (no "for representation").
- After the user scrolls past ~120px both buttons collapse to a single line, the icons disappear, and the height/font shrink as they already do.

### 10. Loader
- Remove the `RiseBrandedLoader` boot screen and any other loaders shown on this route.
- The only loader is the global page transition: white-logo centre + gold reveal sliding from centre out to both edges (already implemented in `PageTransition.tsx` as the rise-slider variant — extend that variant so the gold band opens from centre rather than left→right while on `/request-representation`).

### 11. RISE white logo + shine
- Add the `RISEWhite.png` logo bottom-centre of the age screen (below the buttons, respecting safe-area).
- One-shot diagonal "shine" sweep across the logo on first reveal after the page transition (CSS gradient mask animation, ~1.4s, runs once).

### 12. Tablet & desktop sizing
Add real `md:` and `lg:` rules across:
- Header: larger type, wider centred bio, more vertical breathing room.
- Tile grid: `md:grid-cols-3 lg:grid-cols-4` with bigger tiles, larger icons, generous padding.
- Detail screens: two-column layout (icon plate left, content right) at `lg+`, capped at `max-w-6xl`.
- Sticky footer: max width `md:max-w-2xl` so buttons don't stretch across the screen.
- Position/sub-section drilldowns: multi-column lists at `md+`.

## Technical notes (for implementation)

- **Files edited:** `src/pages/RequestRepresentation.tsx`, `src/components/SmokeOverlay.tsx`, `src/components/SectionSliderWheel.tsx`, `src/components/PageTransition.tsx`.
- **Files removed from this route:** `RiseBrandedLoader` import + the `bootLoading` state and effect.
- **State additions:** `activeGroup` (`who | how | terms | null`) to drive the grouped slider scope, plus a `performanceSubActive: PerformanceSub | null` for the Performance drilldown level.
- **Card metadata:** add a `group` field to `CARD_META` and reorder by group; render dividers between groups on the hub.
- **Slider scope:** in `SectionSliderWheel`, accept the filtered list (group siblings) and add `gap` + neighbour clipping so labels never overlap. Use `min-w` per slot and `overflow-hidden` on the rail.
- **CTA buttons:** rebuild as `flex-col` with icon `h-3 w-3` on top and two `<span>` lines (`leading-[0.95]`); switch to `flex-row` once `scrollY > 120` via `useTransform` boolean.
- **Shine:** wrap the white logo `<img>` in a `relative overflow-hidden` div with a pseudo-element animated by Tailwind keyframe `bg-gradient-to-r from-transparent via-white/70 to-transparent` translated `-translate-x-full → translate-x-full` over 1.4s, `animation-iteration-count: 1`.
- **Page transition:** add a `useRiseSliderTransitionCenter` branch using two halves (`left-1/2 origin-right` and `left-1/2 origin-left`) that scale out from the centre, with the white logo on top.
- **Smoke overlay:** raise opacity, drop the `mixBlendMode: screen` for white (use `normal`), keep gold on `overlay` but increase saturation; use `backgroundSize: 700px` so each puff is large and visible. Z-index above the marble but below content (`z-0`, content stays `z-10`).
- **Language picker:** import `LanguageMapSelector` from `@/components/LanguageMapSelector` and replace the existing `LanguageSelector` JSX in the top-right pill.
- **Mission/bio copy:** reuse the exact string from `src/components/Footer.tsx` so the wording stays in sync.

## Out of scope
- No backend or schema changes.
- No changes to `RepresentationDialog` form fields (already updated previously).
- No changes to other pages or the global header/footer.
