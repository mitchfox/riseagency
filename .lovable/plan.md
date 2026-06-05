I will fix the three issues directly, with the following changes:

1. Investor recent achievements
- Update the achievement log so a saved update is added to the visible list immediately from the saved row returned by the backend, instead of waiting for the whole investor portal refresh.
- Keep the full portal refresh in the background so the main dashboard still stays in sync.
- Make delete behave the same way so removed achievements disappear immediately.
- This addresses the current problem where the backend save can succeed but the UI continues showing “No updates” because the full investor data load is slow.

2. Fit sorting on outreach and player database tables
- Change the Fit header toggle so the first click sorts highest fit first, then the second click reverses it.
- Ensure the sorted list is built before pagination, so page 1 really contains the highest fit players when descending, and the reverse when ascending.
- Use the same computed score source for both sorting and the visible Fit badge so the order matches what is displayed.
- Reset the visible/page position when sorting changes so the user lands at the correct first page of the new order.

3. Position normalisation everywhere in these tables
- Expand the position normaliser to handle the messy real-world values currently in the database, including examples like `Centre-Back / central defender`, `Centre‑back (Defender)`, `Central / attacking midfielder`, `Forward / Striker`, `Winger / Right Winger`, and similar slash/parenthesis variants.
- Apply the normalised abbreviation consistently in desktop and mobile outreach/database table cells and position filters.
- Update the stored database values in `players`, `player_outreach_youth`, `player_outreach_pro`, and `scouting_reports` so these tables no longer contain long-form position labels where they can be confidently converted.

Technical notes
- Frontend files to update: `InvestorHighlineLog.tsx`, `PlayerOutreachPanel.tsx`, `PlayerDatabase.tsx`, `positionNormalise.ts`, and possibly `fitScore.ts` so scoring uses the same normaliser.
- Database cleanup will be a targeted data update, not a schema change.
- I will verify the investor updates table, fit sort code path, and a sample such as Mattia Paolantoni after the changes.