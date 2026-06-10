# Rebuild staff search filtering

## Why the current search struggles

`SearchWithSuggestions` only commits on Enter/blur/suggestion click, so typing feels like "nothing happens" until you press Enter. And every panel does its own naive `.toLowerCase().includes(query)` against a handful of fields, which means:

- **Diacritics break matches**: searching `vaculik` misses `Vaculík`, `jihlava` misses `Jihlava` only when accented variants exist, `omotoye` works but `Tyrése` doesn't.
- **Word order matters**: `omotoye tyrese` returns nothing because the full string doesn't contain that substring.
- **Limited fields**: PlayerDatabase only searches name, club, position; nationality, DOB year, source, etc. are ignored.
- **No live feedback**: parent ignores keystrokes until commit, so the table looks frozen.

## What changes

### 1. New shared matcher: `src/lib/searchMatch.ts`
A single utility used by every staff search:

- `normalise(str)` — lowercase + `String.normalize('NFD').replace(/\p{Diacritic}/gu, '')` + collapse whitespace.
- `tokenise(query)` — split on whitespace, drop empties, normalise each token.
- `matchesQuery(query, fields: (string | null | undefined)[])` — every token must appear (substring) in the concatenated normalised field blob. Returns boolean.
- `scoreMatch(query, primary, secondary?)` — small score used to rank suggestions (exact prefix > word-start > substring).

This gives diacritic-insensitive, multi-token, order-independent matching with no external library.

### 2. Replace `SearchWithSuggestions` behaviour
Same component name and props, rewritten so:

- Typing updates the **committed** value live (debounced ~120ms) instead of waiting for Enter. The table filters as you type.
- The dropdown still shows suggestions (now ranked by `scoreMatch`) and Enter/click still works.
- `useDeferredValue` already present in each parent keeps the heavy table responsive.
- Keep clear (X) and Esc behaviour.

### 3. Swap raw `.includes` filters for `matchesQuery`
In each filter `useMemo`, replace the manual lowercased includes block with a single `matchesQuery` call that includes more fields:

- **`PlayerDatabase.tsx`**: name, current_club, position, nationality, source, date_of_birth (year).
- **`PlayerOutreachPanel.tsx`**: player_name, current_club, position, nationality, agent_name (if present), notes preview.
- **`OutreachPipelineBoard.tsx`**: player name, club name, contact name, stage.
- **`ClubNetworkManagement.tsx`**, **`ClubRatings.tsx`**, **`PlayerManagement.tsx`**, **`MarketingManagement.tsx`**, **`CoachingDatabase.tsx`**, **`DatasetBuilder.tsx`**, **`SiteTextManagement.tsx`**, **`LanguagesManagement.tsx`** — same swap against whatever fields they currently filter on (no new fields unless trivial).

### 4. Suggestion sources
Where the dropdown is used (PlayerDatabase, PlayerOutreachPanel, OutreachPipelineBoard) extend the `sources` array to also feed nationality where it's a useful filter target. Suggestions are deduped and ranked with `scoreMatch`.

### 5. Keep `StaffSearchInput`
Leave the legacy component alone for header/command palette uses. It already debounces and is fine for those.

## Files touched

- `src/lib/searchMatch.ts` — new utility.
- `src/components/staff/SearchWithSuggestions.tsx` — live commit + ranked suggestions.
- `src/components/staff/PlayerDatabase.tsx`, `PlayerOutreachPanel.tsx`, `recruitment/OutreachPipelineBoard.tsx`, `ClubNetworkManagement.tsx`, `ClubRatings.tsx`, `PlayerManagement.tsx`, `MarketingManagement.tsx`, `CoachingDatabase.tsx`, `DatasetBuilder.tsx`, `SiteTextManagement.tsx`, `LanguagesManagement.tsx` — swap filter logic for `matchesQuery`.

No DB migrations. No new dependencies.

## Result

- Typing filters the table immediately (no Enter required).
- `vaculik` finds `Vaculík`; `omotoye tyrese` finds `Tyrese Omotoye`; `cz cb` finds Czech centre-backs in PlayerDatabase.
- Suggestions dropdown still appears and ranks best matches first.
