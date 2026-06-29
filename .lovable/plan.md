# Instant Translation for Club Outreach Proposal

## Problem
- Translations fetch only after user clicks the EN ↔ Assigned language pill, so the switch lags several seconds.
- Components further down the page (Match-By-Match, In Numbers, Strengths, Situation, stat labels) request translation on mount/scroll, so strings flip from English to the target language as the visitor scrolls.

## Goal
On a proposal where a non-English language is configured, every dynamic string is translated **before** the user interacts — so toggling the pill is instant and scrolling never reveals an English → localised swap.

## Approach

### 1. Pre-warm on page load (not on toggle)
In `src/pages/ClubOutreachProposal.tsx`:
- Drive `useAutoTranslateStrings` with the proposal's **configured** language as soon as the proposal payload resolves, regardless of `langOverride`. Currently the hook is keyed to `langOverride`, so nothing translates while the page is in default-English mode.
- Keep `langOverride` purely as a *display* switch: `autoT` returns the cached translation when `langOverride === assignedLang`, otherwise returns the English source. The cache is already populated by the time the user clicks.

### 2. Collect every dynamic string upfront
Today `dynamicStringsForTranslation` is built incrementally and some child cards (`MatchByMatchCard`, `KeyDetailsCard`, `StrengthsCard`, `InNumbersCard`, `FormBannerCard`, `SeasonStatsCard`) push their own strings only when rendered. Consolidate:
- Build one memoised `allDynamicStrings` array in the parent that walks the full proposal payload (player rows, opponent names, stat keys/labels, strength bullets, situation text, key-details values, match-by-match column headers, category tabs, "No data" copy, "Per 90 / Raw", view labels, etc.).
- Pass the resulting `autoT` translator down by prop so child cards never trigger their own translation requests.

### 3. Larger, faster batches
In `src/hooks/useAutoTranslateStrings.ts`:
- Increase chunk size from 18 → 60 and fire chunks in parallel with `Promise.all` instead of the current sequential `for` loop. The edge function already handles batches well; the bottleneck is the serial round-trips.
- Persist the cache write after each batch so partial results are reusable on the next visit.

### 4. Edge-function warm path
`supabase/functions/translate-club-outreach/index.ts` already returns the static UI bundle. Extend it (and call it once at mount) so the *static* labels (column headers, tab names, "No data", etc.) arrive in a single round-trip alongside the localised UI strings — no per-label `ai-translate-batch` request needed for those.

### 5. Guard against late renders
Wrap every child card's text with `autoT(...)` consistently and remove any remaining bare English literals in `MatchByMatchCard` and the picker header so there is no path that bypasses the cache.

## Files to edit
- `src/pages/ClubOutreachProposal.tsx` — pre-warm regardless of toggle; consolidate string collection; pass `autoT` everywhere.
- `src/hooks/useAutoTranslateStrings.ts` — parallel batches, bigger chunks.
- `supabase/functions/translate-club-outreach/index.ts` — extend static `UI_BUNDLE` with the remaining Match-By-Match labels so they ship in the initial response.

## Out of scope
- The 11-language curated `POSITION_TRANSLATIONS` / `MBM_STAT_LABELS_BY_LANG` maps already added — those are already instant and stay as-is.
- Visual design of the language pill and proposal layout.
