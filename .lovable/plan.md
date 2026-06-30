
## What you'll see

1. Open Scouting → Czech Republic → click an age group (e.g. U19) → click a competition (e.g. 1. Celostátní liga dorostu U19).
2. A **Players** panel slides in showing the cached squad list for that competition (name, team, goals, mins, apps if known).
3. Click any player → their card expands with the freshest stats (apps, minutes, goals, clean sheets if available, season + competition split). If cache is fresh, instant. If stale, you see cached values immediately and they refresh in the background with a subtle "updating" pulse.
4. Each row has a "Refresh now" button and shows "Last checked 2h ago".
5. Video stays exactly where it is — separate Video pills per league, never mixed into player stats.

The existing glossy country dossier modal stays. Players are a new tab inside it alongside the current Data / Video pills.

## Data model (new tables)

- `scouting_competitions` — id, country, name, age_group, level, season, stats_url, organiser_url, source ('fotbal.cz' to start), last_indexed_at.
- `scouting_players` — id, source, source_player_id, player_name, player_url, position, date_of_birth, last_checked_at.
- `scouting_player_stats` — player_id, season, competition_id, team_name, age_group, appearances, minutes, goals, clean_sheets, confidence ('A'|'B'|'C'), source_url, last_checked_at.
- `scouting_videos` stays in the existing `scouting_country_links` table (no change).

RLS: authenticated staff full read/write, service_role full access, no anon.

## Backend (edge functions)

- `scouting-index-competition` — given a competition_id, fetches the Fotbal.cz stats page, parses the player table, upserts `scouting_players` + minimal stats rows. Called on demand when a user opens a competition for the first time, and rate-limited per competition (max once per 12h unless force=true).
- `scouting-refresh-player` — given a source_player_id, fetches the profile page, extracts apps / minutes / goals, derives clean sheets when the player is a GK and we have match data, writes back to `scouting_player_stats` with confidence flag.
- All scraping server-side only. Time-aware cache: 6–24h in season, 7–30d out of season (driven by a `season_active` flag on the competition).

## UI (small additions)

- New "Players" tab inside the country dossier modal, grouped by age group → competition.
- Player row with stat chips and a per-row Refresh button.
- "Add competition" form (staff) → URL + age group + level + season, used to seed the index.

## Out of scope right now

- No client-side scraping.
- No yellow/red cards, refs, lineups, attendance.
- No automatic full re-crawl on a schedule (purely click-to-fetch + opportunistic background refresh on view).
- Non-Czech sources (Transfermarkt etc.) come in a later pass with their own adapter.

## Technical notes

- Single shared `parseFotbalCzPlayer()` and `parseFotbalCzCompetition()` helper in the edge function so the scraping logic isn't duplicated.
- Cheerio via npm specifier inside the edge function for HTML parsing.
- Clean-sheet derivation: only run when position === 'GK' AND we have match-level goals-conceded; otherwise leave blank (confidence C never displayed).
- Confidence flag stored so the UI can later badge derived vs sourced numbers.
- All writes go through service role inside the function; client only reads from the three new tables.

Confirm and I'll build it end to end (tables + RLS + edge functions + the Players tab in the dossier modal).
