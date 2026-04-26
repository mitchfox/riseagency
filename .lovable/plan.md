Plan to fix these properly:

1. Replace the current moving 3D player implementation
   - Remove the translate/drift logic that is physically moving the player images across the screen.
   - Rebuild the Representation 3D effect to work like the successful landing page effect: the player stays locked in place and only the texture/parallax/depth changes make it look like it bends or moves on the spot.
   - Use a stable orthographic Three.js setup rather than the current displaced moving plane approach.

2. Show all intended player images in the intro
   - Lines 1 and 2 will use their own uploaded player image and maps.
   - Lines 3 and 4 will use their own uploaded player image and maps.
   - Both sets will stay centred and stationary, with only subtle depth/parallax movement.
   - Each set will fade out cleanly during its final second.
   - The loading/pulse screen will not reappear between intro lines.

3. Restore the main Representation home player image
   - Put back the actual original Representation player image that was there before: `representation-ty.png`.
   - Apply the 3D depth/roughness/alpha treatment to that real image rather than replacing it with the wrong `home-player` image.
   - Keep the home player positioned as the original hero layer, stationary on the page, with only the 3D bend/parallax effect running.

4. Use the landing page method as the reference
   - Keep the same principle as `LazyPlayer3D` / `Player3DEffect`: image fills a fixed container, Three.js renders into that container, and the shader/parallax does the visual movement.
   - Strip out cursor-controlled x-ray behaviour for this page, since Representation only needs automatic subtle motion.
   - Use a gentle automated virtual cursor/parallax target so the player appears to breathe, bend and catch light without actually travelling.

5. Fix the sitewide page transition
   - Replace the current shader/full-screen transition with the correct central pulse-out transition.
   - Make the pulse expand from the centre of the viewport and reveal/cover cleanly.
   - Keep the RISE logo centred during the transition.
   - Remove the incorrect shader animation overlay currently hiding the intended pulse effect.

6. Align the intro logo with the actual Representation page logo
   - Match the intro logo’s final resting position to the real logo location on the Representation page.
   - Use the same logo asset and responsive size logic so it does not jump to a different place when the main page appears.
   - If needed, finish the intro with the logo fade/hand-off rather than animating it to an inaccurate coordinate.

Technical details
- Files to update:
  - `src/components/Player3DPop.tsx`
  - `src/components/RepresentationIntro.tsx`
  - `src/pages/RequestRepresentation.tsx`
  - `src/components/PageTransition.tsx`
- Assets to use:
  - Intro pair 1: existing uploaded pair 1 player/depth/roughness layers
  - Intro pair 2: existing uploaded pair 2 player/depth/roughness/alpha layers
  - Main Representation home: `src/assets/representation-ty.png` as the actual visible player image, with the uploaded home maps applied where useful
- The final result should keep every player visually anchored in place. No player image should slide up, right, or across the viewport.