I checked the backend data directly. The rows are there:

- Spain: 69 resources
- Sweden: 153 resources
- Turkey: 145 resources
- Ukraine: 43 resources

So the problem is the staff Scouting UI is not reliably normalising and loading those resources into the country tiles, not that the resources are missing.

Plan:

1. **Make country matching bulletproof**
   - Normalise country names when grouping resources, so casing, accents, whitespace, `Türkiye` vs `Turkey`, and other small differences cannot split rows away from the visible country tile.
   - Keep the visible label as the standard UI country name.

2. **Remove the fragile all-rows fetch assumption**
   - Replace the single `.range(0, 9999)` fetch with paged loading until no more rows are returned.
   - This prevents the same issue coming back when resources exceed 10,000.

3. **Add a visible loaded-count sanity check in Scouting**
   - Show a small total resources count at the top, so we can immediately see if the UI loaded the backend rows.
   - If the backend returns an error or partial data, show the actual load issue instead of silently showing `0 resources`.

4. **Verify against the exact affected countries**
   - Confirm Spain, Sweden, Turkey and Ukraine render with non-zero counts after the code change.
   - Also check Portugal and Hungary since they were recently added too.

Technical notes:
- No resource rows need to be re-added. The data exists.
- This is a frontend data-loading/grouping fix in `ScoutingByCountry.tsx`, with no destructive database changes.