## Problem

The AI player parser in `PlayerAddMode.tsx` → `parse-players-bulk` currently does three passes:

1. Vision extraction from screenshots/text (Gemini reads names, DOB, positions, shirt numbers).
2. `webLookupPlayer` — asks Gemini "who is this player?" from initial+surname + context.
3. `enrichFromTransfermarkt` — searches TM only when club/league/DOB/nationality are missing.

Step 2 is the source of the wrong details you're seeing: it's pure LLM guessing with no ground truth, so it invents clubs, DOBs and nationalities and marks them "web-enriched". Step 3 is skipped whenever the vision pass already returned a value (even a wrong one from step 2), so TM never gets a chance to correct.

Screenshots like the Croatia U17 one you just shared already contain the full name, DOB, age and a club badge — plenty to look the player up on Transfermarkt directly and get the real club name, league, nationality and position.

## Fix

Make Transfermarkt the source of truth for identity, drop the hallucinating LLM lookup, and keep the vision pass only for what it can see on screen.

### 1. `supabase/functions/parse-players-bulk/index.ts`

- Remove `webLookupPlayer`, `LOOKUP_SYSTEM_PROMPT` and the `_web_enriched` flag entirely. Any "who is this?" guessing goes.
- Rewrite `enrichFromTransfermarkt` into a stricter `matchOnTransfermarkt`:
  - Run for every parsed player that has at least a surname (not only when fields are missing).
  - Search `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=<name>` and parse **all** candidate profile URLs from the results, not just the first regex hit.
  - For each candidate, fetch `${TM_API}/player/{id}` and score against the parsed data:
    - +3 exact DOB match (normalised)
    - +2 birth year match
    - +2 nationality match
    - +1 position family match (GK / DEF / MID / FWD)
    - +1 age within ±1
    - +1 name similarity (normalised, diacritic-insensitive Levenshtein ratio ≥ 0.85)
  - Require a minimum score (e.g. ≥ 4) OR an exact DOB match to accept. Otherwise leave the player as-is and add `_needs_review: true` for the UI.
  - When accepted, TM values **overwrite** the vision values for `date_of_birth`, `nationality`, `club`, `league`, `position` and expand the name if it was a stub. Keep whatever the vision saw for shirt number, team side, notes.
  - Add a `_matched_source: 'transfermarkt'` flag and a `transfermarkt_id` on the returned player so the UI can show provenance.
- Add a proper nationality map (short ISO / country name lookup, same shape as the one already used elsewhere) so nationality from TM comes back as a clean country name in English.
- Keep the concurrency limit and the existing `findExistingPlayer` merge (that one is safe — it only reads our own DB).

### 2. `src/components/staff/PlayerAddMode.tsx`

- Replace the `_web_enriched` banner ("Web-enriched — double-check") with either:
  - `Matched on Transfermarkt` (green, with the TM id if we have it), or
  - `Not matched — please verify` (amber) when `_needs_review` is set.
- Default `_accepted` to `true` only when matched, `false` when `_needs_review` is set, so unmatched rows require a manual tick before they save.
- Everything else about the review UI (per-row inputs, accept-all, save loop) stays the same.

### 3. `ParsedPlayer` type

Add optional `_matched_source?: 'transfermarkt'`, `_needs_review?: boolean`, `transfermarkt_id?: string` and drop `_web_enriched`.

## Out of scope

- No changes to the manual add flow.
- No new DB columns; `transfermarkt_id` stays a client-only display field until you ask to persist it.
- No changes to Squad view, Player Database table, or other consumers.

## Why this works for the shared image

The Croatia U17 screenshot has: full name, DOB (DD/MM/YYYY), age, club badge. Vision extracts name + DOB reliably; the DOB then locks the TM match to a single profile, so club, league, nationality and position all come from TM instead of Gemini's guess.
