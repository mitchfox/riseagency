
# Unifying Player Data, Fixing Links, and Mobile Schedule

This plan addresses five areas: feature parity between Player Database and Recruitment Outreach, DOB column sorting, club nation flags and contact ages, Club Network improvements, WhatsApp/email link fixes for Firefox/Edge, and Marketing Schedule mobile UI.

---

## 1. Feature Parity: Player Database Outreach Tabs

**Problem:** The Player Database's Youth/Pro tabs (using `PlayerOutreachPanel`) and Recruitment's Outreach tab (using `PlayerOutreach`) each have features the other lacks. `PlayerOutreach` has desktop table views, club ratings, and status grouping. `PlayerOutreachPanel` has eligibility badges, age calculations, nationality/position fields, and auto-promotion.

**Solution:** Upgrade both `PlayerOutreachPanel` and `PlayerOutreach` to share the same feature set:

- **`PlayerOutreachPanel.tsx`** (used by Player Database): Add search/filter bar, sortable columns (name, age, club, position, nationality, DOB), nation flags via `getCountryFlagUrl`, club nation flag alongside club name, min contact age display from rules, and desktop table view (not just card view).
- **`PlayerOutreach.tsx`** (used by Recruitment): Add eligibility badges (green tick, gold star, clock, question mark), dynamic age from DOB, nationality column with flag, position column, DOB column, auto-promotion of 18+ youth to pro, and the same search/sort/filter capabilities.
- Both will display: player name, position, age (from DOB), nationality flag, club + club country flag + contact age from rules, IG link, parent info (youth), messaged/response/approval checkboxes, notes, club rating badge.

## 2. DOB Sortable Column on Tables

- Add a `date_of_birth` sort option to both the main Player Database table and the outreach tables.
- The column header will be clickable to sort ascending/descending (youngest first or oldest first).
- DOB will display as a formatted date alongside the calculated age.

## 3. Club Nation Flag and Contact Age Display

- For every club shown in any table, look up the club's country from `club_map_positions`.
- Display the country's flag (from `flagcdn.com` via `getCountryFlagUrl`) next to the club name.
- If the country has a `min_contact_age` rule in `recruitment_age_rules`, show it as a small badge (e.g. "15.5") next to the flag.
- This applies to: Player Database main table, PlayerOutreachPanel, PlayerOutreach, and Club Network contacts.

## 4. Club Network Improvements

- Add club/organisation column display for each contact (already has `club_name`, just needs better prominence).
- Add country flag next to each contact's country using `getCountryFlagUrl`.
- Add search bar to filter contacts by name, club, or country.
- Add country filter dropdown.
- Add sorting by country, club name, name.

## 5. WhatsApp and Email Links (Firefox/Edge Fix)

**Problem:** `<a href="mailto:...">` and `<a href="https://wa.me/...">` with `target="_blank"` are blocked as pop-ups in Firefox and Edge.

**Solution:**
- For `mailto:` links: Use `window.location.href = 'mailto:...'` via an `onClick` handler instead of an `<a>` tag with `target="_blank"`. This navigates the current context to the mail handler without opening a new tab.
- For WhatsApp (`wa.me`) links: Use the `openExternalUrl` utility from `src/utils/openExternalUrl.ts` which creates a temporary anchor element and programmatically clicks it, bypassing pop-up blockers.
- Apply across: `ClubNetworkManagement.tsx`, `FormSubmissionsManagement.tsx`, `PlayerOutreachPanel.tsx`, and any other component using these link patterns.

## 6. Marketing Schedule Mobile UI Fix

**Problem:** The `react-big-calendar` Calendar component in `ScheduleManager.tsx` has a fixed height of 500px and no mobile-specific adjustments. The toolbar, headers, and event text are too small/cramped on mobile.

**Solution:**
- Default to `agenda` view on mobile instead of `month` (agenda is a list view, much better on small screens).
- Reduce calendar height on mobile (e.g. 350px).
- Add mobile-specific CSS overrides in `marketing-calendar.css` for smaller toolbar buttons, stacked toolbar layout, and readable font sizes.
- Make the "Schedule Post" button smaller on mobile.

---

## Technical Details

### Files to Create
- None

### Files to Modify
1. **`src/components/staff/PlayerOutreachPanel.tsx`** -- Add search, sortable table view, nation flags, club country flag + contact age, DOB column
2. **`src/components/staff/PlayerOutreach.tsx`** -- Add eligibility badges, dynamic age from DOB, nationality/position/DOB columns, auto-promotion, nation flags, club country flag + contact age, search/sort
3. **`src/components/staff/PlayerDatabase.tsx`** -- Add DOB as sortable column, club country flag + contact age next to club names
4. **`src/components/staff/ClubNetworkManagement.tsx`** -- Add search, country filter, sorting, country flags, club/org display
5. **`src/components/staff/marketing/ScheduleManager.tsx`** -- Mobile-responsive calendar (agenda default, reduced height)
6. **`src/components/staff/marketing-calendar.css`** -- Mobile media queries for toolbar/headers
7. **`src/components/staff/FormSubmissionsManagement.tsx`** -- Fix WhatsApp/email links for Firefox/Edge
8. **`src/utils/openExternalUrl.ts`** -- May add a `openMailto` helper

### Database Changes
- None required (all data already exists in `club_map_positions.country` and `recruitment_age_rules`)
