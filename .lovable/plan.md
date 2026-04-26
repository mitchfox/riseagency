I’ll fix the representation page as a single, controlled sequence instead of multiple loaders fighting each other.

## What I will change

1. **Representation loading sequence**
   - Add a dedicated pre-intro loading phase for `/request-representation`.
   - It will show only the central RISE pulse and wave-out transition.
   - The intro video/animation will not mount underneath it until that transition has fully finished.
   - Remove the branded loader, Suspense loader, intro and age screen overlap on this route so it cannot flash several things for 0.5 seconds.

2. **Use the correct central pulse and wave-out visual**
   - Keep the existing page transition style that uses the central logo pulse and shader/wave effect.
   - Make it deterministic for the representation entry: fixed minimum duration, full opacity, no early reveal.
   - Avoid `RiseBrandedLoader` on this page entry because you specifically want the page transition overlay here, not the black marble loader.

3. **Intro RISEWhite logo visibility**
   - Remove the low-opacity RISEWhite logo sitting behind the intro text.
   - The logo will appear only in the intended logo phase after the intro lines have played.
   - It will then pulse and travel to the top logo position without being visible throughout the whole intro background.

4. **Flip the background/player direction correctly**
   - Player overlay: move from the left into position.
   - Background blur/ambience: move from the left side only, not the right.
   - Keep the large smoke streak travelling right to left across the screen.

5. **Move “Representation” into the tagline rectangle**
   - Remove the “REPRESENTATION” heading from the top of the home screen.
   - Keep the top area as the RISEWhite logo only.
   - Add “Representation” inside the glass tagline rectangle above the sentence:
     - Rise Gold styling
     - a contained pop/pulse effect so it stands out without breaking the layout
     - text remains above smoke/player layers

6. **Fix CTA button wrapping properly**
   - Force the two footer CTAs into a constrained vertical layout:
     - icon on top
     - text underneath
     - two-line wrapping allowed
     - no nowrap inherited from button internals
   - Use tighter tracking on small screens so “Request Representation” can wrap naturally instead of clipping or staying on one line.
   - Ensure both normal and scrolled footer states use the same wrapping rules.

## Technical files to update

- `src/pages/RequestRepresentation.tsx`
  - Add route-specific transition gating before `RepresentationIntro`.
  - Flip player/blur direction.
  - Move the Representation heading into the tagline plate.
  - Fix footer CTA wrapping classes and structure.

- `src/components/RepresentationIntro.tsx`
  - Remove persistent background logo.
  - Show the logo only during logo/descent phases.
  - Keep the existing text reveal sequence intact.

- `src/components/PageTransition.tsx` or a small reusable transition variant
  - Reuse the central pulse and wave-out animation for the representation entry with a guaranteed full play duration.
  - Avoid showing any competing loader during this sequence.

I will not change the branded loader globally except to ensure it does not appear over this representation entry sequence.