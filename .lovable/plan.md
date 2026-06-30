## Problem

The uploaded image is a two-team formation graphic with shirt numbers + "Initial. Surname" labels (e.g. `10 B. Szywała`). The current `parse-players-bulk` function returns only the visible token (`B. Szywała`) with everything else null because:

1. The Gemini prompt does not push the model to (a) split left vs right team, (b) infer position from the formation layout when no position label exists, or (c) flag that a name is an "initial + surname" stub.
2. The only enrichment is a direct Transfermarkt quick-search by the literal name. `B. Szywała` does not resolve, so club/league/DOB stay empty.
3. There is no real web search step — nothing ever tries to expand `B. Szywała` into `Bartosz Szywała` (Polish youth international) or find the U19/U17 club he plays for.

## Fix

### 1. Stronger image extraction (no model change)

Update `SYSTEM_PROMPT` and the per-image user instructions in `supabase/functions/parse-players-bulk/index.ts` so the model:

- Detects formation graphics with a vertical centre line and emits two team groups (`team_side: "left" | "right"`), even when team names are not printed.
- Infers position from spatial role for every named player (GK closest to own goal, then back line, midfield bands, attack — keepers on the touchline of each half).
- Records `name_is_initial: true` when the label is `X. Surname` so the enrichment step knows to expand it.
- Captures the shirt number into `notes` (e.g. `#10`) so later lookups have one more disambiguator.

### 2. Real web lookup per player (new step)

Add a `webEnrichPlayer` step that runs before the existing Transfermarkt enrichment. It uses Perplexity `sonar` (suggest connector if not present) with a strict JSON schema:

```text
Input: { surname, initial?, shirt_number?, team_side?, context_hint? }
Output: { full_name, date_of_birth, nationality, current_club, current_league, position, confidence }
```

Prompt instructs Perplexity to find the most likely professional/youth footballer matching the surname + initial (+ shirt + team side if provided), prefer Transfermarkt / national federation / Wikipedia / Sofascore as sources, and return `null` fields rather than guessing. If `confidence < 0.6`, discard.

The returned `full_name` then replaces the stub `name`, and missing fields are filled (never overwriting anything the model already extracted).

If Perplexity is not connected, fall back to a Gemini call with Google Search grounding (`google/gemini-2.5-flash` + `tools: [{ google_search: {} }]`) doing the same lookup — so the feature degrades but still tries the web.

### 3. Re-run Transfermarkt enrichment with the expanded name

After web enrichment runs, the existing `enrichFromTransfermarkt` call already fills any remaining gaps (DOB, club, league, position) using the now-full name. Keep it unchanged, just runs second.

### 4. UI surfacing

In `src/components/staff/PlayerAddMode.tsx` (or wherever the parsed rows render), show a small "web-enriched" pill on rows where the full name was expanded so the user can sanity-check before saving.

## Technical notes

- Concurrency: keep `runWithConcurrency` at 4 for the web step too; Perplexity tolerates this.
- Caching: memoise web lookups by `${surname}|${initial}|${shirt_number}` within a single request so duplicated rows do not double-charge.
- Errors: any web lookup failure is swallowed per-player; the row still returns with whatever the image gave us.
- No schema changes, no DB migrations.

## Files to change

- `supabase/functions/parse-players-bulk/index.ts` — prompt rewrite, new `webEnrichPlayer`, pipeline reorder.
- `src/components/staff/PlayerAddMode.tsx` — small "web-enriched" badge.
- If Perplexity isn't already linked, prompt to connect it once the plan is approved.

## Out of scope

- No change to manual add flow.
- No change to player database schema or RLS.
