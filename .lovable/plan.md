Plan to fix the Investor Portal properly against the staff portal patterns:

1. Replace the investor sidebar behaviour with the staff behaviour
- Use the same category toggle logic as Staff.tsx: clicking an already expanded category collapses it back to the full category list.
- Remove the custom investor-only logic that sets the active section to null when a category is clicked.
- Keep the selected section active while category navigation opens and closes, the same as staff.
- Match the staff sidebar classes, timings, search button placement and collapse toggle behaviour rather than the current half-copy.

2. Make tabs work like staff tabs
- Stop rendering only the first three tabs with no usable overflow.
- Add the same visible-tab plus overflow dialog pattern from staff: 2 visible on mobile, 3 on desktop, the rest available through a +N button.
- Add the staff-style tab close behaviour, active fallback behaviour and persistent localStorage state.
- Keep the add-tab grid picker, but make it behave like staff’s section picker.

3. Fix the header to follow staff structure
- Keep the centred RISE logo, left-side open tabs and right-side action cluster.
- Remove the investor-only odd layout differences.
- Keep refresh, notifications, edit lock and sign out, but position and style them in the same header structure as staff.
- Add the missing accessible dialog title/description to the section picker so the console warning is resolved.

4. Remove the Edge-blocked contract iframe/object preview
- Do not embed contract PDFs inline in the investor page because Edge is blocking that page load.
- Replace the preview panel with staff-style contract cards, readable metadata and clear Open/Download actions.
- Keep the signed/private contract URL resolution from the backend, but only use it for direct opening or downloading.
- This avoids the blank white/blocked contract screen while keeping contracts accessible.

5. Make body text readable and remove unnecessary uppercase styling
- Audit the investor page components and remove `font-bbh uppercase tracking` from body text, tables, feed rows, player cards and status text.
- Keep uppercase only for tiny labels/badges where staff already does it.
- Use staff-like readable weights: normal sentence case for feed text, table content and card descriptions, stronger weight only for names/titles.
- Replace the remaining hard-to-read em dash activity sentence with simpler sentence-style copy.

6. Improve investor portal reaction time
- Remove expensive page-wide animation where it is not used on staff.
- Reduce staggered sidebar animation cost and avoid remounting large sections unnecessarily.
- Memoise heavier derived lists like player database, activity feed and invoice totals where needed.
- Prevent smooth-scroll and repeated full refresh calls from making every navigation feel delayed.
- Keep data loading broad enough to show the portal, but avoid unnecessary render work on each sidebar/tab click.

7. Keep existing investor data work intact
- Do not re-add Live Tasks or Contracts cards to the overview.
- Keep task completions in Recent Activity.
- Keep the invoice-linked commission logic already added.
- Keep the network/player database source work already in place, but make the UI readable and responsive.

Technical target files
- `src/pages/InvestorsPortal.tsx` for header, tabs, sidebar, contracts UI, activity text and performance cleanup.
- `supabase/functions/investor-data/index.ts` only if the contract URL or player database payload needs a small adjustment after the UI change.