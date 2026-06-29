## Fix three Club/Player Outreach failures

### 1. Market Table clubs missing from Club Outreach search (e.g. "Slezský FC Opava")

**Cause:** The outreach club picker fetches `market_table_entries` with Supabase's default 1,000-row cap, and the search compares raw strings, so diacritics ("Slezský") don't match plain typing ("Slezsky").

**Fix in `src/components/staff/ClubOutreachManager.tsx` (and the shared picker it uses):**
- Replace the single `select()` call with a paginated loop (`range(0,999)`, `range(1000,1999)`…) until all rows are returned, cached in React Query.
- Add a `normaliseSearch(str)` helper that lowercases and strips diacritics via `String.prototype.normalize('NFD').replace(/\p{Diacritic}/gu, '')`, applied to both the club name and the query.
- When opening outreach from Market Tables ("Outreach Mode" → Create Outreach), pass the chosen club id straight into the picker's `value`, and render the selected club label at the top of the dialog so it's clearly pre-selected.
- If the club id isn't yet in the cached list (rare), fetch that single row by id and inject it so it's always visible as selected.

### 2. Player Outreach template links not swapped

**Cause:** `TemplatePickerInline` only rewrites Club Outreach URLs. The Player Outreach path uses the same component but the regex only matches `/club/...`, so the generic `risefootballagency.com` link in a player template is left untouched.

**Fix in `src/components/staff/recruitment/TemplatePickerInline.tsx` (or the player-outreach equivalent):**
- Detect context (`type: 'player' | 'club'`) and, for player templates, replace any URL matching `https?://(www\.)?risefootballagency\.com\S*` (and bare `risefootballagency.com/...`) with the current player's `risewithus` link built from their slug/id, the same way Club Outreach already does.
- Keep the existing club-link behaviour unchanged.
- Also strip a trailing punctuation char from the match so links followed by `.` or `,` aren't broken.

### 3. Instagram usernames not displayed on Player Outreach cards

**Cause:** The card reads `players.instagram_handle`, which is null for most records. The handle actually lives in one of: `player_outreach_pro.ig_handle`, `player_outreach_youth.ig_handle`, or the linked `players.instagram_handle`. Diacritic-insensitive name matching previously added still doesn't help when the field source itself is wrong.

**Fix in `src/components/staff/RepresentationOffers.tsx` and the card component:**
- When loading an offer row, resolve the handle in this order and use the first non-empty value:
  1. The outreach row's own `ig_handle` (pro or youth table, whichever the offer came from).
  2. The matched `players.instagram_handle`.
  3. Any handle stored on `player_outreach_pro` / `player_outreach_youth` for the same normalised name + DOB.
- Normalise the displayed handle (strip leading `@`, lowercase) and render it as small copyable text directly under the player name, with a click-to-copy toast.
- Add a tiny defensive log (dev only) when none of the three sources have a handle so we can spot future data gaps without affecting UX.

### Verification
- Open Club Outreach → search "Opava" and "Slezsky" → confirm Slezský FC Opava appears; trigger Outreach Mode from Market Tables for that club and confirm it's pre-selected in the dialog.
- Send a Player Outreach template containing `risefootballagency.com` and confirm the sent message contains the player's `risewithus` URL.
- Open three Player Outreach cards with known IG handles (one pro, one youth, one only on `players`) and confirm the @handle shows under the name and copies on click.

No database migrations required.
