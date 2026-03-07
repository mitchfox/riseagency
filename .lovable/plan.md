

## Fix: Transfermarkt Scraper Returns No Results

### Root Cause
The edge function sends a **GET** request to the detailed search URL, which only returns the empty search form (182KB of form HTML with dropdowns). Transfermarkt requires the search to be submitted as a **POST** request with form-encoded data to return actual player results.

### Solution

**Rewrite `supabase/functions/scrape-transfermarkt/index.ts`** to:

1. **Submit the form as POST** with `Content-Type: application/x-www-form-urlencoded` - this is how the actual Transfermarkt form works when you click "Search" in the browser
2. **Use correct form field names** from the actual HTML form (the field names we saw in the HTML like `land_id`, `ageMin`, `ageMax`, `wettbewerb_id`, `spielerberater`)
3. **Add debug logging** - log a snippet of the HTML response so we can verify we're getting results table HTML, not just the form
4. **Fix the HTML parser** - update regex patterns to match the actual Transfermarkt results table structure, which uses `<table class="items">` with `<tbody>` rows, not `<tr class="odd/even">` directly. Add a fallback parser that looks for `spielprofil_tooltip` links (the class TM uses for player profile links in results)
5. **Add pagination support** - the results page shows 25 players per page by default; fetch the first page initially

### Files to Change

- **`supabase/functions/scrape-transfermarkt/index.ts`** - Complete rewrite of the fetch logic (GET → POST) and parser to match actual TM HTML structure. Add HTML snippet logging to debug future issues.

### No UI changes needed
The `TransfermarktScraper.tsx` component is already correctly structured. The fix is entirely server-side.

