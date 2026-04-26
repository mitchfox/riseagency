# Representation Page — Full Redesign Plan

A large rebuild of `src/pages/RequestRepresentation.tsx` plus a couple of small new components. Everything below is mobile-first then refined for tablet/desktop.

---

## 1. Naming, framing, and copy

- Rename route label and headings from "Request Representation" → **"Representation"** (page title, header copy, nav links pointing here, SEO title).
- Re-frame copy so it reads from the player's POV. Two clear angles surfaced as primary entry buttons on the hub:
  - **"I want to be signed — what do you need from me?"**
  - **"What do I get from RISE?"**
- Insert a Rise Gold horizontal divider (1px, `bg-primary/40`) between every section group on the hub: Intro · Sign-with-us · What-you-get · Scouting · Performance · Network · Brand · Fees/Agreement/FAQs.

## 2. Age-bracket screen

- Above the Under 18 / Over 18 buttons add a short line: *"Choose your age bracket so we can show you a personalised breakdown of what representation looks like for you."*
- Fix Over-18 hover: text already turns Rise Gold, but the contrast issue is the disappearing border — confirm `hover:bg-primary/10 hover:text-primary` keeps text readable. Re-check with the gold class and add `hover:border-primary`.
- Add the existing `LanguageSelector` (and optional `LanguageMapSelector` button) pinned **top-right** of this screen (and persisted on every state of the page). IP-based auto-detection already runs from `LanguageContext` so no new geo work is needed.

## 3. Mobile hero — Ty image overlay animation

- Background: replace the current hero with `user-uploads://off_Ty_page.png` copied to `src/assets/representation-bg-rise.png` (the RISE / Realise Potential black backdrop).
- Overlay: `user-uploads://on_Ty_page.png` copied to `src/assets/representation-ty.png` (cut-out player).
- Animation (mobile only, `md:hidden`): Ty starts at `translateX(-100px)` then framer-motion animates to `translateX(0)` over ~1.4s ease-out and locks in place so he aligns into the same composition as the original combined photo. No looping.
- Tablet/desktop keeps the contained marble layout already in place.

## 4. Smoke effects (all hub/detail screens)

- New file `src/components/SmokeOverlay.tsx`: two stacked SVG/PNG smoke layers (white at 20%, Rise Gold at 20%) animated horizontally left → right via framer-motion `animate={{ x: ['-30%', '30%'] }}` with `repeat: Infinity, repeatType: 'mirror'` and `ease: 'linear'`, durations 38s and 52s so they never visibly stop. `pointer-events-none`, `mix-blend-screen` for the white, `mix-blend-overlay` for the gold.
- Mounted once at the page root, behind content (`z-0`) and above background (`z-1` for content wrapper).

## 5. RISE branded loader

- Extract the existing `AnalysisViewer` loader (logo pulse + gold gradient line + dot bounce) into `src/components/RiseBrandedLoader.tsx`.
- Show it on first mount of `/request-representation` for ~700ms (fast — user requested as fast as possible) before the age-bracket screen fades in. `AnimatePresence` handles the swap.

## 6. Hub layout (after age selected)

Vertical order with Rise-Gold dividers between groups:

1. **Header strip** — keeps the marble panel; title becomes "RISE WITH US".
2. **Two intent buttons** (full-width primary cards):
   - "How do I get signed by RISE?" → opens form with prefilled context.
   - "What do I get from RISE?" → scrolls to the value sections.
3. **Scouting** card promoted to **first** value tile.
4. Value tiles in this new order: Scouting · Performance · Club Network · Brand · Fees · Agreement · Expectations · FAQs.

## 7. Scouting deep-dive (per-position)

When the Scouting tile is opened:

- Show a position picker grid using `SCOUTING_POSITIONS` from `src/data/scoutingSkills.ts` (already defines GK, CB, FB, DM, CM, AM, W, ST etc.).
- After picking a position, render the 16 attributes from `POSITION_SKILLS[position]` grouped by domain (Physical / Mental / Technical / Tactical) using the icon + colour map already used on `Scouts.tsx`.
- Each attribute card includes its short description so it doubles as a "what we look for from an analysis and player insight POV" explainer.
- Reuse the `domainConfig` styling for visual parity with the existing scouting page.

## 8. Performance deep-dive (sub-sections)

Performance card opens a sub-grid with six tiles (each with its own short description + image):

- Analysis
- Action Reports (use a small preview image of an existing report instead of a generic icon — replace the current `MarbleIconPanel` placeholder with `<img src={performanceReportPreview} />`)
- Strength, Power & Speed
- Nutrition
- Technique
- Psychology

Pull copy snippets from `RealisePotential.tsx` translation keys (`realise.step1_*`…`realise.step5_*`) and from existing performance/analysis blurbs to populate each tile.

## 9. Club Network deep-dive

- Embed the existing `ScoutingNetworkMap` component inside the Club Network detail view (shrunk to fit, with `pointer-events: auto` so users can interact). Add a one-line caption above it.

## 10. Sticky footer CTAs (shrink on scroll)

- New sticky bottom bar (only on hub + detail screens, not on age-bracket screen):
  - Left button: **"Request Representation"** (opens form).
  - Right button: **"Contact Us For Representation"** (opens WhatsApp `+447508342901`).
  - Both use `HoverText` reveal effect.
- Use `useScroll` + `useTransform` from framer-motion (or a small `useEffect` listener) to shrink height (`h-16` → `h-9`) and font size (`text-base` → `text-xs`) by ~50% once `scrollY > 80`.

## 11. Section slider wheel (above sticky footer)

- New component `src/components/SectionSliderWheel.tsx`:
  - Horizontal wheel showing current section name centred in **Rise Gold** at 100% opacity, previous and next labels at 60% opacity, separated by Rise Gold bullet `•`.
  - 3D cylinder feel via `perspective: 800px` on the container and `rotateY` on each item: centre at 0deg, neighbours at ±35deg, fade past that. Items beyond ±2 are hidden, giving the impression they continue off-screen.
  - Left and right chevron taps move by 1 and instantly switch `activeCard`. Touch swipe also wired up.
  - Sits directly above the sticky footer CTAs.

## 12. Form changes (already aligned with under-18 rules)

- `RepresentationDialog` already conditionally shows parent-name and parent-phone when DOB makes the user under 18 — confirm both the button text on the hub and the dialog header read "Request Representation".

## 13. Files

- **Edit:** `src/pages/RequestRepresentation.tsx` (large), `src/App.tsx` (route label only if needed), any nav link components pointing to "Request Representation" → "Representation".
- **New:** `src/components/SmokeOverlay.tsx`, `src/components/RiseBrandedLoader.tsx`, `src/components/SectionSliderWheel.tsx`.
- **New assets:** `src/assets/representation-bg-rise.png` (from `off_Ty_page.png`), `src/assets/representation-ty.png` (from `on_Ty_page.png`), `src/assets/performance-report-preview.png` (a screenshot already in the repo or reuse an existing example image).
- **Reuse:** `SCOUTING_POSITIONS`, `POSITION_SKILLS`, `ScoutingNetworkMap`, `LanguageSelector`, `HoverText`, framer-motion patterns from `AnalysisViewer`.

## 14. Out of scope (so the PR stays focused)

- No backend or database changes.
- No edits to global Header/Footer (the page is intentionally standalone, per memory `mem://features/public/request-representation-page`).
- No new translations beyond simple English copy now; i18n keys can be added later if you want the page fully localised.

---

Approve and I will implement everything above in one pass.
