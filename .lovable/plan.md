

# Fix SofaScore Stat Extraction - Keep Embedded Data

## Problem
SofaScore is a JavaScript SPA. The current code strips ALL `<script>` tags from the HTML before sending to AI, which **removes the actual data** — SofaScore embeds match/player data as JSON inside script tags (e.g., `__NEXT_DATA__`, inline JSON-LD, or hydration state). The AI then receives near-empty text and hallucinates stats.

## Solution

Two changes to `supabase/functions/parse-stats-url/index.ts`:

### 1. Extract embedded JSON data from scripts instead of removing them
Before stripping HTML, scan for:
- `__NEXT_DATA__` script tags (Next.js hydration data containing match stats)
- JSON-LD `<script type="application/ld+json">` blocks (SEO structured data)
- Any `<script>` containing stat-like JSON objects

Extract this JSON content and include it in what gets sent to the AI, instead of deleting it.

### 2. Improve the prompt to prevent hallucination
- Use tool calling (structured output) instead of asking for raw JSON, which forces the AI to return only defined fields
- Add explicit instructions: "Only include a stat if you find an exact numerical value. Do NOT guess or infer. If a player did not score, goals must be 0. If you cannot find a stat, omit it entirely."
- Increase text truncation limit from 15K to 30K chars since the embedded JSON data is where the real stats live

### 3. Add response validation
- After AI returns stats, validate that the response contains more than just 1-2 fields — if it only found "goals: 1" and nothing else, that's likely hallucination
- Log the raw AI response and the text content sent, so we can debug future issues

## Files to Edit
- `supabase/functions/parse-stats-url/index.ts` — rewrite `parseSofaScoreUrl` to preserve script JSON data, improve prompt, add tool calling, add validation

