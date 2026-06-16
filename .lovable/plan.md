I will make these targeted fixes:

1. **Mandate proof document**
   - Add separate mandate proof storage on outreach links, so mandated proposals can use their own uploaded proof document.
   - In the staff outreach editor, show an upload field for **Proof of Mandate** when mandated is enabled.
   - On the proposal card:
     - Normal proposals show **Proof of Representation** and **Signed agreement with Rise Football Agency**.
     - Mandated proposals show **Proof of Mandate** with copy that clearly refers to a mandate, not RISE representing the player.

2. **Correct mandate wording everywhere**
   - Header stays as: **AGENT / AGENCY NAME PRESENTS**.
   - Sub-line stays as: **Mandated by RISE Football Agency**.
   - Remove the incorrect bottom text about RISE being formally instructed to negotiate.
   - Replace it with copy that makes clear RISE has granted / provided the mandate to the named external agent or agency to act on the player’s behalf.

3. **Correct mandate contacts and WhatsApp routing**
   - If a proposal is mandated and a mandated agent WhatsApp number exists, the main contact CTA and pinned WhatsApp button will go to that external mandated agent.
   - Hide the RISE agent WhatsApp CTA on mandated proposals when a mandated agent contact is provided, so it does not show you as Michael’s mandated agent.
   - Keep RISE contact only as a fallback if no mandated agent WhatsApp has been entered.

4. **Fix “For” display**
   - Keep the existing behaviour where an empty **Prepared for** field does not render the “For” line at all.

5. **Improve In Numbers formatting**
   - Restyle **In Numbers** to match the other stat cards: balanced grid tiles, gold values, compact labels and clean wrapping instead of the current awkward vertical list.

6. **Fix Michael Mulligan cropped video controls**
   - Keep the top and bottom eleventh cropped from view.
   - Move the custom controls into the visible safe area of the cropped video so seek, sound and fullscreen controls align properly and do not sit where the crop hides them.

7. **Fix scheme history formation rendering**
   - Add proper `4-2-1-3` support to `FormationDisplay`.
   - Add a formation normaliser so strings like `4-2-1-3` and close variants do not silently fall back to `4-3-3`.
   - Ensure TJ Jiskra Domažlice showing **CURRENT CLUB • 4-2-1-3** renders a real 4-2-1-3 layout on screen.

Technical notes:
- This needs one database migration for the separate mandate proof document path/url on `club_outreach_links`, with the required grants preserved.
- I will update the existing public proposal edge function to return that new field.
- I will only touch the proposal, outreach editor, video crop helper and formation display code needed for these issues.