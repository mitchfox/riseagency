## Plan

Fix the player AI parser so Croatian Transfermarkt players are no longer shown as Costa Rican.

### What I found
- The AI vision prompt is already told not to guess nationality.
- The wrong value is coming from our Transfermarkt enrichment step, not the image model.
- Transfermarkt’s API is returning `nationalityId: 37` for the Croatian players in your screenshot, but our hardcoded map says `37 = Costa Rica` and `38 = Croatia`.
- For those player API responses, `passportName` contains Croatian names and the page is clearly Croatian youth data, so the ID map is misaligned for this API.

### Fix
1. Replace the fragile hardcoded nationality ID lookup with a safer resolver:
   - Prefer nationality names if the Transfermarkt API response includes a readable name field.
   - Add a corrected fallback for the API’s observed IDs, including `37 = Croatia` for this endpoint.
   - Never show Costa Rica for Croatian youth rows just because of the old ID map.

2. Add defensive validation around nationality assignment:
   - If the Transfermarkt nationality cannot be resolved confidently, set nationality to `null` rather than guessing.
   - Keep unmatched players as `nationality: null` and marked for review.

3. Clean up existing stale parsed output behaviour:
   - Ensure accepted Transfermarkt matches overwrite any prior vision nationality.
   - Ensure non-matches wipe hallucinated nationality.

4. Deploy the updated edge function and test it with known names from your screenshot, such as Lovro Trupčević and Luka Posavec, confirming they no longer return Costa Rica.