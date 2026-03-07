

## Plan: Fix Stats Persistence, Rebuild Transfermarkt Scraper

### 1. Match Statistics Persistence Fix

**Root cause**: When re-opening the edit dialog, `initialLoadDoneRef.current` is still `true` from the previous edit session. This means the action sync effect (line 547) is no longer guarded during the async `fetchExistingData` call. If React flushes state updates between awaits (e.g. `setMinutesPlayed` and `setActions` are separated by awaits), the sync effect fires mid-load and overwrites the stats being loaded.

**Fix in `CreatePerformanceReportDialog.tsx`**:
- Reset `initialLoadDoneRef.current = false` at the **start** of `fetchExistingData` (before any state changes or awaits), so the guard is active for the entire duration of the fetch
- Also reset it in the main `useEffect` (line 437) when entering edit mode, before calling `fetchExistingData`
- Add `isEditMode` to the action sync effect's dependency array so it always captures the correct value
- Reset `unifiedStats` to `[]` before loading in edit mode to avoid stale data from previous sessions

### 2. Transfermarkt Scraper - Complete Rebuild

**Why it fails**: The edge function tries to scrape `transfermarkt.com` HTML directly, which is blocked by Cloudflare bot protection. The function times out, hence the "Failed to send a request to the Edge Function" error.

**New approach**: Use Transfermarkt's internal search API endpoint (`/search/quick`) which returns JSON and is more reliable, combined with profile page scraping for agent status checking. Alternatively, use a web search approach to find player data.

**Edge function (`scrape-transfermarkt/index.ts`) changes**:
- Use Transfermarkt's JSON API endpoint for player search instead of HTML scraping
- Add proper error handling and fallback
- Accept `countryPlayingIn` filter and default confederation to UEFA
- Remove the `query` (search name) parameter requirement

**UI changes (`TransfermarktScraper.tsx`)**:
- Remove "Search Name" field
- Add "Nation Playing In" dropdown (country where the player's club is based, e.g. England, Czech Republic, etc.)
- Default confederation to UEFA (pre-set, not changeable or hidden)
- Convert from small `Dialog` to full inline panel (rendered inside the page, not a popup)
- Improve spacing and layout of filter controls and results table
- Better empty/loading states

**`PlayerOutreach.tsx` changes**:
- Toggle scraper visibility inline instead of opening a dialog
- Pass `scraperOpen` as a visibility toggle rather than dialog open state

### 3. Files to Change

- `src/components/staff/CreatePerformanceReportDialog.tsx` - Stats persistence fixes (reset refs, add deps)
- `supabase/functions/scrape-transfermarkt/index.ts` - Rewrite to use reliable API approach
- `src/components/staff/TransfermarktScraper.tsx` - Remove search name, add nation playing in, make inline, improve layout
- `src/components/staff/PlayerOutreach.tsx` - Inline scraper toggle instead of dialog

