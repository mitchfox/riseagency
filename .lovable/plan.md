# Rise With Us — alignment fixes with Representation

All changes are on `src/pages/RiseWithUs.tsx` plus two small component files. No business logic changes — purely presentation and ordering.

## 1. Scouting database card shows wrong details
`ScoutingDatabaseCard` is currently fed straight from the `player` record on the outreach link, which is the staff-typed prospect data, not what's actually in our database. Update `src/components/risewithus/ScoutingDatabaseCard.tsx` (or the parent) to look the prospect up in `prospects` / `players` by id (or name + club fallback) and render name, position, club, nationality, image and fit score from that record. Fall back to the existing props only if no match is found, so nothing ever goes blank.

## 2. "Why not you?" must match the Representation version
The `BallonDorVisionCard` on Rise With Us renders inline with a slanted gold block; the Representation page renders the same idea inside a standard `rise-slant-card` section with eyebrow, headline, body, urgency line and CTA. Replace the bespoke `BallonDorVisionCard` markup with the same card structure used on `RequestRepresentation.tsx` (matching wrapper, paddings, typography and CTA button). Keep the same translation keys so copy stays in one place.

## 3. Move "Why not you?" to the very bottom
Remove the `<BallonDorVisionCard />` call from above `PlayersWeWorkWith`. Render it after the last `GROUPS.map(...)` block (just before the fixed "Explore Player Portal" footer button), so it's the final section on the hub.

## 4. "Who we've worked with" should match Representation
On Representation the carousel sits inside a slanted card with body copy plus the "context" disclaimer paragraph. Wrap `<PlayersWeWorkWith />` in the same `rise-slant-card` shell used on Representation, and add the two paragraphs (`representation.worked_with_body` and `representation.worked_with_context`) underneath using the same translation keys, so both pages stay in sync.

## 5. Intro images appearing throughout, not only on the final slide
In `IntroCinematic`, the extra intro media is gated behind `phase === 3`. Change the gating so that whenever `extraIntro.length > 0` images render during phases 1, 2 and 3 as well. Behaviour:

- Pick a random position from a small set of left/right anchor frames (e.g. top-left, mid-left, bottom-left, top-right, mid-right, bottom-right) — never centred over the logo/text.
- One image at a time, ~3.5–4.5 s on screen with a 600 ms fade in / fade out.
- On change, swap to the next image and a different side from the previous one so it visibly alternates left/right.
- Videos in the intro pool keep current behaviour (muted, autoplay, loop) — only their placement uses the new alternating frames.

Final-slide behaviour is unchanged; this just makes earlier phases also show imagery.

## 6. CTA copy
Change `t("vision.cta", "Set up our meeting")` to `t("vision.cta", "Let's Meet")`. The translation key stays the same so existing locales still resolve; only the English fallback updates.

## 7. WhatsApp widget hover legibility
In `src/components/WhatsAppWidget.tsx` the hover state currently keeps the gold background but the text inherits a colour that becomes unreadable. Lock the text to `text-black` in both states and keep the gold background on hover, so the label stays high-contrast through the expand animation.

## Technical notes
- All edits scoped to: `src/pages/RiseWithUs.tsx`, `src/components/risewithus/ScoutingDatabaseCard.tsx`, `src/components/WhatsAppWidget.tsx`.
- No DB schema changes, no edge functions touched.
- No changes to `RequestRepresentation.tsx` — it's already correct and is the reference.
- Reuse existing translation keys (`vision.*`, `representation.worked_with_*`) so localisation doesn't regress.
