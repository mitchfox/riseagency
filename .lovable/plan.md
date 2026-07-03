## Plan

1. **Remove the useless suggestions feature**
   - Remove the “Suggest club ratings” button from Player Database actions.
   - Remove the suggestions dialog import and render from the staff player database screen.
   - Leave the old staging table alone unless you want it removed later, because removing database objects is riskier and not needed to fix this.

2. **Fix the actual club rating gaps directly in the database**
   - Insert ratings for every current player club that is missing from `club_ratings`.
   - Use the real player club field, `players.club`, not the incorrect `current_club` field used by the broken edge function.
   - Populate both `first_team_rating` and `academy_rating` for each missing club.
   - Avoid placeholders by ignoring obvious non-clubs like `---`, `Unknown`, and `The Game` unless they are required for a real player record.

3. **Handle messy club-name variants**
   - Add ratings for exact missing names such as `Birmingham City`, `Brentford`, `Toronto FC`, `Kilmarnock`, `Lommel SK`, etc.
   - Where the player club value contains noise like `(loan)`, `(On Loan)`, or `(parent club)`, add the exact stored value too so the current fit-score lookup works immediately.
   - This is a direct coverage patch, not an AI suggestion queue.

4. **Verify coverage after the fix**
   - Re-run the coverage query against current non-Scouted and non-Fuel For Football player clubs.
   - Confirm there are no missing ratings for real club names.
   - Check the remaining unmatched rows, if any, are only non-club placeholders or malformed values that should not affect ratings.

## Technical notes

- The current `club_ratings` table has 1,501 rows and no rows missing R values.
- The problem is not empty ratings, it is 48 player club strings that do not exact-match a `club_ratings.club_name` row.
- The broken suggestions edge function queries `players.current_club`, but the real column is `players.club`, so it can never find the player clubs correctly.
- The UI button then shows no pending suggestions because the staging table is empty.