
Goal: eliminate the recurring “Competition not found” failures and make “Birthday today only” trustworthy in all cases.

1) Fix the root cause of recurring 404s (invalid league IDs)
- Update the Transfermarkt league code handling so UI codes are translated to API-valid competition IDs before scraping.
- Add a normalization/alias layer in `supabase/functions/scrape-transfermarkt/index.ts` (example: problematic codes like `CZ1` mapped to the API’s valid equivalent).
- Keep scraping resilient: if one competition code is invalid/unavailable, do not crash the whole search run.

2) Make scraper execution resilient instead of fail-fast
- In `scrape-transfermarkt/index.ts`, change `getClubIds()` so API 404s are handled gracefully (return empty + log), not thrown as a hard function failure.
- In `src/components/staff/TransfermarktScraper.tsx`, make per-league requests fault-tolerant:
  - continue to next league if one request fails
  - only show a hard error if every attempted league fails
  - surface a small warning toast when some leagues were skipped
- Remove stale-result confusion:
  - clear/refresh result state at search start
  - clear results on terminal failure so old non-birthday rows cannot remain visible after an error.

3) Harden “Birthday today only” so wrong rows can’t appear
- Strengthen DOB parsing in the edge function to handle all likely date formats from API payloads (`YYYY-MM-DD`, timestamp forms, etc.).
- Compare birthday against a consistent “today” source (server date) and avoid timezone drift edge cases.
- Add a defensive client-side birthday guard when `birthdayToday` is enabled (final safety net before display).

4) Update league options/random fallback list to valid, tested codes
- In `TransfermarktScraper.tsx`, replace or remap known-bad codes in both:
  - the selectable league list
  - the random “any league” fallback pool
- This prevents broad searches from repeatedly selecting broken IDs and throwing 404.

5) Verification plan (deep checks)
- Edge-function tests via direct invocation:
  - previously failing code path (e.g. `CZ1`) no longer returns 500
  - broad search no longer hard-fails when one league is bad
  - `birthdayToday: true` returns only players whose DOB matches today’s month/day.
- UI verification on `/staff?section=recruitment`:
  - toggle Birthday Today on/off and confirm table rows change correctly
  - confirm no stale results remain after failed attempts
  - confirm search still excludes players already in shortlist/database.

Technical details (implementation touchpoints)
- `supabase/functions/scrape-transfermarkt/index.ts`
  - add competition code normalization/aliases
  - make `getClubIds` non-fatal on “Competition not found”
  - harden birthday parsing/comparison
- `src/components/staff/TransfermarktScraper.tsx`
  - sanitize league pool to valid IDs
  - robust per-league loop with partial-failure handling
  - clear stale results on new search / failure
  - optional defensive birthday filter before render.
