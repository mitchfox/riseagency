
## Why current parsing fails

The existing `scouting-index-competition` edge function does a plain `fetch()` + Cheerio parse of the competition stats URL. Fotbal.cz renders the actual stats table client-side (the initial HTML only contains the page shell, navigation, and the "Statistiky" tab marker), so Cheerio sees no `<tr>` rows with player data — the function "succeeds" but indexes 0 players, which surfaces to the user as failure.

The same is true for individual player profile pages on Fotbal.cz: the season/competition splits are loaded by JS or by an internal JSON endpoint after the shell loads.

## Strategy

Switch the source of truth from "competition stats table" to **player profile pages**, with a backend that can either (a) call Fotbal.cz's underlying JSON endpoints directly once we discover them, or (b) fall back to a headless-rendered DOM scrape. Players in our database already have or can have a Fotbal.cz profile URL, so we don't need to parse messy ranked tables for the use cases that matter.

## Build steps

### 1. Discovery pass (one-off, in the edge function logs)

Add a temporary discovery mode to `scouting-refresh-player`:
- Fetch the player profile HTML.
- Log every `<script>` block containing JSON-ish payloads (look for `window.__NUXT__`, `__NEXT_DATA__`, `window.__INITIAL_STATE__`, or inline `application/json`).
- Log any URLs matching `/api/`, `/graphql`, `is.fotbal.cz`, or `souteze/`/`hraci/` JSON endpoints found in scripts.

This tells us whether stats are in embedded JSON (cheap) or only available after JS execution (needs headless).

### 2. Parser, in priority order

Rewrite `scouting-refresh-player` to try these in sequence and stop at the first that yields rows:

1. **Embedded JSON** — if step 1 found a hydration payload, parse it for `appearances`, `minutes`, `goals`, season, team, competition.
2. **Internal JSON endpoint** — if step 1 found an XHR like `https://www.fotbal.cz/api/.../hrac/{id}/statistiky`, call it server-side with the right `Accept`/`Referer`/`Cookie` headers.
3. **Headless render fallback** — call a small Playwright/Browserless render (via a `RENDER_URL` secret pointing at browserless.io or similar) and parse the resulting DOM with Cheerio. Only used if 1 and 2 fail.

Cache HTML/JSON for the player for 6h in-season, 7d out-of-season (already in the function — keep).

### 3. Schema additions

`scouting_player_stats` already covers what we need. Add:
- `clean_sheets` derivation rule: only set for GK rows where match-by-match shows 90 minutes with goals_against = 0. Otherwise leave null (do not guess for outfielders).
- `source_confidence` text: `'A'` for JSON, `'B'` for rendered DOM, `'C'` for table-row guess.

Add a `players.fotbal_profile_url` text column (nullable) so represented players in our DB can be linked directly to a Fotbal.cz profile without going through a competition table.

### 4. Competition page demotion

`scouting-index-competition` stays but is reframed as **discovery only**:
- Tries to extract `/hraci/{slug}` links from the rendered HTML; if none found, falls back to the headless render path.
- Creates `scouting_players` rows with `player_url` set, but does NOT pretend it has goals/minutes. Real stats only come from the per-player refresh.

This removes the current "indexed 0 players, looks broken" failure mode — the UI will show "Discovering…" then "Click a player to load stats", which is honest about what's happening.

### 5. UI behaviour in `ScoutingPlayersPanel.tsx` and the Stats tab

- When opening a league's Stats panel: list represented DB players for that country/age-band first (we already have `fotbal_profile_url` for them after step 3), each with a "Refresh" button that calls `scouting-refresh-player`.
- Below that, show the discovered (non-represented) players from `scouting-index-competition`, also click-to-refresh.
- Show `last_checked_at` and the `source_confidence` letter as a small badge so we can see at a glance whether a row came from JSON, render, or guess.
- Show clear empty-state copy: "No stats cached yet — click Refresh to fetch from Fotbal.cz" instead of a blank table.

### 6. Secrets

If the headless fallback ends up needed, we will need a render endpoint. Options to confirm with you before I add anything:
- Browserless.io (`BROWSERLESS_TOKEN`) — simplest, paid.
- ScrapingBee / ScraperAPI — similar.
- Self-hosted Playwright on another edge — not viable inside Supabase Edge Functions.

I will not add a secret without asking.

## Files touched

- `supabase/functions/scouting-refresh-player/index.ts` — rewrite as described.
- `supabase/functions/scouting-index-competition/index.ts` — demote to discovery + headless fallback.
- New migration: add `players.fotbal_profile_url` (nullable text). No other schema changes — `scouting_player_stats` already has all needed columns.
- `src/components/staff/ScoutingPlayersPanel.tsx` — represented-players-first list, confidence badge, clearer empty/loading states.
- Possibly `src/components/staff/ScoutingByCountry.tsx` Stats tab to pass the country/age-band into the panel for represented-player matching.

## Out of scope

- Yellow/red cards (you said no).
- Clean sheets for outfielders (left null).
- Scraping from the user's browser (always server-side).
- Any change to non-Czechia countries until this pattern is proven on Czechia.

## Open questions

1. Are you OK adding a headless-render secret (Browserless) **only if** the discovery pass shows Fotbal.cz has no usable embedded JSON or internal JSON endpoint? I'll report back after step 1 before spending on it.
2. For represented players, do you want me to auto-populate `fotbal_profile_url` by matching name + DOB against the Czechia competition discovery results, or will you paste the URLs yourself for the first batch?
