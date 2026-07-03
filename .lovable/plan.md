## Goal
Fill missing first_team_rating and academy_rating on clubs so player AI ratings compute correctly. AI proposes, you approve, then commit.

## Scope of clubs processed
1. Clubs already in `club_ratings` where `first_team_rating` or `academy_rating` is blank.
2. Clubs referenced by any player's `current_club` (excluding Scouted / FFF) that have no row in `club_ratings` at all — new rows created with country auto-detected from `club_map_positions`.

## How it works

1. **New staging table** `club_rating_suggestions` (id, club_name, country, current_first, current_academy, suggested_first, suggested_academy, reasoning, confidence, status: pending/approved/rejected, created_at). RLS: admin/staff only.

2. **New edge function** `suggest-club-ratings`
   - Gathers the two sets of unrated clubs above.
   - Batches ~25 clubs per AI call to `google/gemini-2.5-flash` via Lovable AI gateway.
   - Prompt gives the AI: the R1-R5 scale definition (R1 = elite European, R2 = strong top-5 league, R3 = solid top-flight / promoted, R4 = second tier, R5 = lower divisions / semi-pro), the club name, and country. Returns first-team R, academy R, one-line reasoning, confidence (high/medium/low).
   - Writes results into `club_rating_suggestions` with status = pending.
   - Idempotent: skips clubs already pending.

3. **New review UI** — button "Suggest club ratings" on the Player Database Actions card, next to the analytics button. Opens a wide dialog listing pending suggestions with: club, country, current vs suggested first/academy R, reasoning, confidence badge. Actions per row: approve, edit R, reject. Bulk actions: approve all high-confidence, reject all.

4. **Apply** — on approval, writes to `club_ratings` (upserts row if missing) and marks suggestion approved. On reject, marks rejected and hides.

5. **Live counter** on the dialog: X pending, Y approved, Z clubs still unrated.

## Technical notes
- Country resolved via existing `clubCountryMap` (`club_map_positions` + `club_ratings.country`) before sending to AI so it has geographic context.
- Player-club matching uses existing `canonicalClubName` from `src/lib/clubNameUtils.ts` to avoid duplicate suggestions for accent/alias variants.
- Cache-invalidate `useClubMaps` (sessionStorage key `rise.clubMaps.v1`) after any approval so player fit-scores recompute immediately.
- No changes to fit-score logic itself.

## Files
- Migration: create `club_rating_suggestions` table + RLS + grants.
- New: `supabase/functions/suggest-club-ratings/index.ts`
- New: `src/components/staff/ClubRatingSuggestionsDialog.tsx`
- Edit: `src/components/staff/PlayerDatabaseManagement.tsx` — add "Suggest club ratings" button.
- Edit: `src/hooks/useClubMaps.ts` — expose a `refresh()` that clears the sessionStorage cache.
