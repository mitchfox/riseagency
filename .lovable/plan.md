I will rebuild the Rise With Us invitation flow around the exact representation page experience, not a separate approximation.

Plan:

1. **First screen becomes a video-style intro**
   - Replace the current static offer hero with a cinematic intro sequence like the representation page.
   - Reveal the invitation text slide by slide before opening into the page.
   - Use the player image plus uploaded offer images creatively in this intro only, so the visual feel happens early rather than on later section cards.

2. **Second screen copies the representation card hub**
   - Use the same grouped representation card structure from `/representation`: Who We Select, How We Work, What Are The Terms.
   - Copy the card grid styling, grouping, animations, dividers, titles and detail-screen behaviour from `RequestRepresentation.tsx`.
   - Add only the required persistent **THE NEXT STEP** button so the invitation can progress.

3. **Remove the incorrect custom card section imagery**
   - Stop rendering uploaded images on the later detail/section cards.
   - Keep staff uploads, but treat them as intro visuals rather than per-section card images.

4. **Make the portal its own full-screen part**
   - Replace the boxed portal preview with a full-screen portal section.
   - The embedded Tyrese portal fills the viewport width and height like its own page.
   - Keep only the bottom padded **THE NEXT STEP** overlay to move past it.
   - Use the direct portal login URL with `staff_login=tyelanders%40gmail.com` and preserve the hidden invoices parameter.

5. **Final screen copy cleanup**
   - Remove the “No pressure, no pitch…” sales copy entirely.
   - Leave only the requested message: “We’d love to hear what you think and any questions you have.”
   - Keep the WhatsApp button to `+447508342901`.

6. **Keep privacy safeguards**
   - Keep `/risewithus` without a player slug inaccessible.
   - Keep `noindex, nofollow` on invitation pages.

Technical files to update:
- `src/pages/RiseWithUs.tsx`: main flow, intro, representation card hub copy, full-screen portal, final copy.
- Potentially extract or reuse representation card constants/components from `src/pages/RequestRepresentation.tsx` only if needed to avoid duplicated mistakes, but the output will visually match the current representation hub and card detail behaviour.