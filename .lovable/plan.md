Plan:

1. Get Staff opening on Club Outreach, not Team Performance
- Make `/staff` always resolve to `section=cluboutreach` on first staff load.
- Ignore stale `teamperformance` and `overview` values from URL/local storage on initial load, so old cached links cannot keep forcing the wrong section.
- Keep direct clicks in the staff sidebar working after the page is already open.

2. Fix the dynamic import failure across staff sections
- Add a safe lazy-load retry for staff section chunks so a stale published asset hash does not leave Staff broken.
- If a dynamic import fails, clear app caches/service workers and reload once rather than showing a dead staff section.
- Keep this scoped to staff chunk loading, not hosting redirects.

3. Put Club Outreach forms inline properly
- Ensure Settings, Create New Outreach and Edit Outreach render as in-page panels, not popups.
- Place the inline panel directly under the action buttons so it is visible immediately after clicking.
- Keep Communications/logging as its own dialog only if it is not part of the settings/create/edit flow.

4. Rebuild Market Tables around saved Strategy leagues and nations
- Use saved strategies as the source of truth for which countries/leagues appear in Market Tables.
- Use each strategy’s saved `club_ids`, `country`, `league` and `league_level` to build the table rows.
- Display all clubs attached to every saved strategy, including Conference League, Europa League and Champions League where saved.
- Support both `league` and `league_level` filters so saved strategy values do not disappear because the wrong field is read.
- Remove the previous behaviour that shows unrelated full-club-database rows by default.

5. Repair specific missing strategy and league data paths
- Check Tyrese Conference League, Czech Republic 2nd and the Belgium 1st/2nd strategies from the saved strategy records.
- Ensure each saved strategy produces a non-zero club list if it has saved clubs.
- If a saved strategy has filters but no club IDs, derive the club list from the matching saved country/league fields instead of showing 0.

6. Fix Market Tables contacts in expanded club rows
- Show actual contact name, role, email, phone and link details instead of repeating the club name.
- Keep the Add Additional Contact button visible after expanding a club.
- Add a button on existing contacts to add missing number/contact/link details.
- When a contact is added to Network, carry club, role, name and contact details with it.

7. Verify Quick Log ordering
- Confirm Quick Log is sorted by number of completions, highest first.
- Keep the completion count visible on each quick-log action.

8. Verify in preview before reporting back
- Load `/staff` and confirm it opens Club Outreach.
- Open Club Outreach without the dynamic import error.
- Open Market Tables and confirm saved strategy countries/leagues show clubs instead of 0 results.
- Expand a club and confirm additional contacts display the right fields and edit/add buttons.