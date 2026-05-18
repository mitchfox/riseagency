## Goal

Stop the "alien" redesign. The Investor Portal should look and feel like a stripped-down Staff portal — same header, same vertical icon sidebar with categories, same fonts (BBH / Agrandir / Bebas), same risegold accents, same dark marble + smudged-marble backgrounds, same mobile patterns. It should pull live staff data (players with images, flags, contracts, prospects, commission income) and present it without leaving the page.

---

## 1. Shell & Visual Parity with Staff

Rewrite `src/pages/InvestorsPortal.tsx` to use the exact staff shell pattern:

- **Header** (copied from `Staff.tsx` 1198–1410, trimmed):
  - Fixed top, `bg-background/80 backdrop-blur-md border-b`, `pwa-safe-top`
  - Centre RISEWhite/RISEBlack logo (theme-aware), click to collapse to 10px height
  - No "Welcome Levene" / "Sign out" text in header. A single discreet icon menu (top-right) holds Sign out + theme.
  - Black-marble page background image at low opacity, same as staff
- **Sidebar** (copied from `Staff.tsx` 1567–1734):
  - Fixed left, `w-14 md:w-24`, `bg-muted/30 backdrop-blur-sm`, collapsible
  - Vertical category buttons with icon + 2-line uppercase label, gold gradient when active
  - Expanded category reveals stacked section buttons with framer-motion stagger
  - Gold divider between categories
- **Mobile**: Same `isMobile` breakpoint, `pb-[70px]` content padding, narrower sidebar, identical to staff.
- **Tokens**: Use `text-risegold`, `bg-primary`, `border-border`, `font-bbh`, `font-bebas`, `font-agrandir` — drop all hard-coded `#C6A332` and inline gradients. Backgrounds use `smudged-marble-overlay` (via `StaffCardHeader`) behind every card header (Roster, Contracts, Tasks, Spending, Pipeline).

### Investor categories (sidebar)

```text
Dashboard          → Overview, Investment Overview
Roster             → Represented, Mandated, Previously Mandated
Pipeline           → Prospect Board, Player Database (read-only views)
Legal              → Contracts (inline viewer)
Financial          → Spending, Commission Forecast
Activity           → My Tasks, Activity Feed
```

Remove "System Notes". Merge old "Activity Log" and "Tasks" — Activity Feed is the chronological staff-action stream (read-only), Tasks is a separate view that mirrors My Tasks visually.

---

## 2. Player presentation (parity with staff `PlayerList.tsx`)

Replace plain rows in Roster / Pipeline with the staff player card pattern:

- `image_url` avatar (rounded, 2px border, risegold ring for represented)
- Name in `font-bbh uppercase`
- Position abbreviation chip (GK/CF/CB etc.)
- **Flag SVG** from `/flags/{code}.svg` via `getCountryFlagUrl(nationality)` — never the plain text country name
- Age derived from `date_of_birth` via existing `calculateAge`
- Club + club_logo
- Contract end date + expected commission (new fields — see §4)
- Click opens a side drawer with read-only deeper info (no navigation away)

Roster grouped by status using `sortPlayersByRepresentation` / `getStatusLabel`.

Pipeline view embeds a read-only Prospect Board (subset of `ProspectBoard.tsx` props) and a read-only Player Database table.

---

## 3. Contracts inline viewer

`investor-data` already returns `signature_contracts`. Render each as a card with title, counterparty, status, signed/locked dates, and a **"View" button that opens a Dialog with the PDF inline** (`<iframe src={locked_file_url || file_url}>`). Investor never leaves the portal.

---

## 4. Contract & Commission fields on players (Staff write, Investor read)

**Migration**:
```sql
ALTER TABLE public.players
  ADD COLUMN contract_start_date date,
  ADD COLUMN contract_end_date date,
  ADD COLUMN current_salary_annual numeric,
  ADD COLUMN expected_commission_annual numeric,
  ADD COLUMN commission_notes text;
```

**Staff side**:
- Add a "Contract & Commission" block to `AddPlayerDialog` / player edit panel
- Add an inline quick-edit column to **Players** section AND to **Player List** (`PlayerList.tsx`) so commission can be set from either place using `BlurInput` (existing pattern). Editable for any user with player edit permission.

**Investor side**:
- Roster cards show: contract end (with traffic-light: red <6m, amber <12m, green >12m), expected commission
- New **Commission Forecast** card on Dashboard + Financial:
  - Total expected commission across all represented + mandated
  - 12-month rolling projection
  - Breakdown by player (sorted desc)
- This is how investor return is justified — feed directly into Investment Overview "Return Logic" card

---

## 5. Tasks (mirror My Tasks visually)

- Drop the "completed / outstanding %" framing entirely.
- Reuse the visual layout of the staff `MyTasks` / `FocusedTasksSection` (cards, columns, priorities, deadlines) in read-only mode.
- Investor sees what staff are actively working on, grouped exactly as staff sees it. No completion percentage.
- `investor-data` already fetches `staff_tasks`; just reshape to match the My Tasks grouping (by category / priority / deadline).

---

## 6. Activity Feed

Show real `staff_activity_log` entries (entity, action, user, time) in a clean chronological stream, styled like staff's `ActivityLog.tsx` but trimmed (no filters needed, last 200, "Load more"). Add `staff_activity_log` to `investor-data` fetches.

---

## 7. Spending — richer detail

Current `investor_spending` rendering is bare. Upgrade to:
- Filters: date range, category, vendor
- Grouped totals by category with sparkline per month
- Table view with receipt link, payment method, recorded by
- Monthly summary chart (recharts bar) — already a project dep
- Tie totals to "Use of Funds" card in Investment Overview so numbers stay consistent

---

## 8. Pipeline → Prospect Board + Player Database

- Replace generic "investor_pipeline" placeholder cards with a **read-only ProspectBoard** (same columns, drag disabled, same player cards with images + flags)
- Add tabbed sub-view "Player Database" showing the full scout-style database in read-only mode (search, filter by position/nationality, paginated)
- Excludes Scouted + FFF per global rule (already enforced)

---

## 9. Remove clutter

- Delete "System Notes" section entirely
- Remove "Levene" / "RISE" text greetings scattered around
- Remove the visible Sign Out button — move into a small avatar dropdown top-right (icon only)
- Drop the redundant Activity Log section (merged into Activity Feed)

---

## Technical notes

- **Edge function**: extend `supabase/functions/investor-data/index.ts` to also fetch `staff_activity_log` (last 200) and to include the new player columns (`contract_end_date`, `expected_commission_annual`, etc.)
- **Sidebar/header**: extract into `src/components/investor/InvestorShell.tsx` so InvestorsPortal stays under ~400 LOC. Mirror exact Tailwind classes from Staff.tsx so any future restyle of staff cascades visually.
- **Fonts**: ensure `font-bbh`, `font-agrandir`, `font-bebas` classes are applied (already in `tailwind.config.ts`)
- **Flags**: use existing `getCountryFlagUrl` from `src/lib/countryFlags.ts` everywhere — never raw text
- **Player avatars**: reuse `Avatar` + `image_url`, identical sizing to staff PlayerList
- **Marble**: import `smudged-marble-overlay.png` from `@/assets`, used via `StaffCardHeader` pattern (rename to `MarbleCardHeader` and re-export, or use staff one directly)
- **Mobile**: copy the `useIsMobile` + `pb-[70px]` + `w-14` patterns 1:1
- **No business logic changes** to existing investor write/login functions
- **Code stays in frontend + one migration + one edge function update**

---

## Files touched

- **migration**: add 5 columns to `players`
- `supabase/functions/investor-data/index.ts` — add activity log fetch + new player columns
- `src/pages/InvestorsPortal.tsx` — full rewrite using new shell
- `src/components/investor/InvestorShell.tsx` (new) — header + sidebar
- `src/components/investor/InvestorRoster.tsx` (new) — player cards with flags/avatars
- `src/components/investor/InvestorContracts.tsx` (new) — inline PDF viewer
- `src/components/investor/InvestorTasks.tsx` (new) — My Tasks visual mirror
- `src/components/investor/InvestorActivityFeed.tsx` (new)
- `src/components/investor/InvestorSpending.tsx` (new) — filters + chart
- `src/components/investor/InvestorPipeline.tsx` (new) — read-only prospect board + DB
- `src/components/investor/InvestorCommissionForecast.tsx` (new)
- `src/components/investor/InvestmentOverview.tsx` — restyle to match staff cards
- `src/components/staff/PlayerList.tsx` — add inline contract end + commission editor
- `src/components/staff/AddPlayerDialog.tsx` (or player edit panel) — add Contract & Commission block

Ready to implement on approval.