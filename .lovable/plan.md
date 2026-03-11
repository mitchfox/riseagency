

# Fix SofaScore 403 API Block

## Problem
The SofaScore public API (`api.sofascore.com/api/v1/...`) now returns **403 Forbidden** for direct server-side requests. This blocks the lineups and player statistics endpoints used by the `parse-stats-url` edge function. This is a common issue — SofaScore actively blocks non-browser requests to their API.

## Solution
Replace the direct SofaScore API calls with an **AI-powered HTML scraping approach** (same pattern already used for FBRef). The edge function will:

1. Fetch the SofaScore match page HTML directly (the public website, not the API)
2. Pass the extracted text content to Gemini Flash to extract player statistics
3. Map the AI-extracted stats to the existing fixture stat keys

This is resilient because the public HTML pages are accessible (they need to be for SEO/browsers), and the AI model can adapt to HTML structure changes automatically.

## Changes

### `supabase/functions/parse-stats-url/index.ts`
- Replace `parseSofaScoreUrl()` — instead of calling `api.sofascore.com` endpoints, fetch the match page HTML from `www.sofascore.com`
- Use the same AI extraction pattern as `parseFBRefUrl()`: strip HTML tags, truncate, send to Gemini Flash with stat extraction prompt
- Keep the existing `mapSofaScoreStats()` mapping for consistent output format
- The AI prompt will be tailored for SofaScore's page structure (player names, match stats tables)
- Maintain the multi-player return format so the frontend player picker still works

### Approach Details
- Fetch URL with browser-like User-Agent headers
- Extract text content (strip scripts/styles/tags), truncate to ~15K chars
- Send to `google/gemini-2.5-flash` with a prompt asking for per-player stats in JSON format
- Map extracted stats through existing `mapSofaScoreStats` function
- Falls back gracefully with clear error messages if extraction fails

