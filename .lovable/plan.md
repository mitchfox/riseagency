## Plan: fix the Investor Portal properly using staff code, not rebuilt approximations

### What is wrong now
- The Investor Portal still has bespoke `Prospects`, `PlayerDatabase`, `TasksView`, `ActivityFeed`, `ContractsView` and sidebar/header code in `InvestorsPortal.tsx`.
- That is why the Prospect Board and Player Database do not match staff. They are not the staff components.
- Annual commission is currently just `players.expected_commission_annual`; it is not connected to invoice revenue.
- Recent Activity only shows `staff_activity_log`, so task completions from My Tasks are missing because staff tasks mainly write to `staff_notification_events` and `staff_tasks.completion_log`.
- Contracts use private file URLs directly in an iframe, so the private `signature-contracts` bucket can render as a blank white screen.
- The sidebar is an imitation of staff and is missing staff behaviour: tabs, search, back/breadcrumb flow, notification button and reliable category collapse.

### Implementation plan

#### 1. Stop rebuilding staff sections inside the Investor Portal
Replace the bespoke investor versions with actual staff components in viewer mode:

- Prospect Board: use `src/components/staff/ProspectBoard.tsx` directly with `isAdmin={false}` so drag, add, edit and delete are disabled but the board looks identical to staff.
- Player Database: use `src/components/staff/PlayerDatabaseManagement.tsx` or `PlayerDatabase.tsx` directly so it pulls from the real scouting, youth outreach and pro outreach tables, not the represented players list.
- My Tasks: use `src/components/staff/StaffAccountabilityOverview.tsx` as the live task view, with a new `readOnly` mode if needed so investors can view the real Tasks, Schedule and Leaderboard tabs without editing.
- Content Strategy: use the existing staff marketing schedule component in read-only mode if mounted in the Activity category.
- Activity Log: either reuse `ActivityLog` with an investor-safe data source, or build a small adapter that combines staff activity plus task events while preserving staff styling.

#### 2. Add read-only props where staff components need them
Thread `readOnly?: boolean` through only where required:

- `StaffAccountabilityOverview`: hide Add Task, edit, drag/drop assignment, completion buttons and reminder buttons when `readOnly` is true. Keep tabs, staff slider, task cards, schedule and leaderboard visible.
- `ProspectBoard`: it already gates most controls behind `isAdmin`; pass `false`.
- `PlayerDatabase`: add `readOnly?: boolean` only if any edit dialog/action is exposed. Otherwise mount as-is.
- Marketing schedule component: add `readOnly` or `canManage={false}` depending on its current API.

#### 3. Fix Recent Activity so My Tasks is included
Update the Investor Portal data layer so Recent Activity is a merged live feed:

- `staff_activity_log` entries, deduped as already intended.
- `staff_tasks` active and recently completed tasks, using `updated_at`, `last_completed_at` and `completion_log`.
- `staff_notification_events` rows with `event_type` in `task_assigned`, `task_completed`, `task_reminder`.

Display the merged feed sorted by timestamp, with task rows labelled as task activity rather than hidden under generic activity.

#### 4. Link annual commission to invoices
Extend `investor-data` to fetch `invoices` joined to players:

- Total invoiced amount.
- Total paid amount.
- Outstanding amount.
- Revenue in the current 12-month window.
- Player-level invoice totals.

Update Commission Forecast so the headline figure prioritises real invoice data and then clearly separates:

- Real invoiced revenue.
- Paid revenue.
- Outstanding revenue.
- Expected annual commission editable forecast.

The existing `expected_commission_annual` remains a forecast field, but the dashboard will no longer pretend it is real invoice revenue.

#### 5. Allow unlocked inline editing of expected commission per year
When the hidden lock is unlocked and the investor user is admin:

- Make the `£-/yr expected` value editable directly on roster and commission rows.
- Save to `players.expected_commission_annual` through a secured backend function, not direct client writes.
- Keep the UI read-only when locked.

#### 6. Fix contracts properly
Replace the current iframe URL logic with a signed URL resolver:

- Add contract file path resolution to `investor-data` or a small `investor-contract-url` backend function.
- Use the same private bucket handling as staff contract code: create signed URLs for `signature-contracts` files.
- Prefer `completed_pdf_url`, then `locked_file_url`, then `file_url`.
- Show a proper viewer fallback if the browser cannot display the PDF: `Open PDF`, `Download`, and an error state instead of a blank white panel.
- Keep the two-pane inline contract layout, but make the PDF source valid.

#### 7. Copy staff shell behaviours into the Investor Portal
Refactor the portal shell so it uses the same patterns as `Staff.tsx`:

- Header tabs with open tab chips, close buttons, overflow dialog and plus picker.
- Notification button using staff notification dropdown styling. For investor users, create a stable pseudo user id from the investor user id, or adapt the dropdown to accept a `readById` string.
- Sidebar category behaviour copied from staff: clicking an open category closes it, selecting a section opens it, and the category grid view gives a way back out.
- Staff breadcrumb/back behaviour: clicking the category breadcrumb exits the section back to the category section picker.
- Add the sidebar search dialog copied from staff, scoped to investor sections.
- Keep the same widths and mobile offsets as staff: `w-14 md:w-24`, `ml-14 md:ml-24`, mobile safe-area padding.

#### 8. Use category pages and back paths so users are not trapped
When a category is open but no section is selected, show a staff-style category grid:

- Dashboard: Overview, Investment Overview.
- Roster: Represented, Mandated, Previously Mandated.
- Pipeline: Prospect Board, Player Database.
- Legal: Contracts.
- Financial: Spending, Commission Forecast, Invoices snapshot.
- Activity: My Tasks, Leaderboard, Content Strategy, Recent Activity.

Every section gets a breadcrumb back to its category. Closing the active tab returns to overview or the previous tab.

#### 9. Clean up the oversized page component
Split `InvestorsPortal.tsx` into focused components so it stops becoming a fragile one-file rebuild:

- `InvestorShell.tsx`: staff-parity header, tabs, sidebar, search and category picker.
- `InvestorDashboardOverview.tsx`: KPI cards and recent activity preview.
- `InvestorContracts.tsx`: signed-url PDF viewer.
- `InvestorCommission.tsx`: invoice-linked commission view and inline forecast editing.
- `InvestorRecentActivity.tsx`: merged activity/task feed.
- Keep `InvestmentOverview.tsx` as the CMS card section.

### Technical changes

#### Backend functions
- Update `supabase/functions/investor-data/index.ts` to return:
  - invoices and invoice totals
  - signed or resolvable contract URLs
  - merged task activity data
  - staff notifications relevant to tasks
- Update or extend `investor-overview-write` or `investor-write` with a secure admin action for editing `players.expected_commission_annual`.

#### Database
- No schema change is required for invoice linking if the existing `invoices` table is sufficient.
- No schema change is required for task activity if `staff_tasks.completion_log`, `last_completed_at` and `staff_notification_events` are used.
- If a contract signed URL helper needs stored metadata, avoid schema changes unless absolutely required.

#### Frontend files to update
- `src/pages/InvestorsPortal.tsx`
- `src/components/investor/InvestorShell.tsx` new
- `src/components/investor/InvestorContracts.tsx` new or extracted
- `src/components/investor/InvestorCommission.tsx` new or extracted
- `src/components/investor/InvestorRecentActivity.tsx` new or extracted
- `src/components/staff/StaffAccountabilityOverview.tsx` add read-only mode
- `src/components/staff/PlayerDatabase.tsx` only if edit controls need hiding
- Marketing schedule component only if it needs a read-only prop
- `supabase/functions/investor-data/index.ts`
- `supabase/functions/investor-write/index.ts` or a dedicated secure investor admin write function

### Validation
- Log in to `/investors-portal`.
- Confirm the sidebar opens and closes categories exactly like staff.
- Confirm category pages and breadcrumbs provide a way back.
- Confirm header tabs and notifications appear like staff.
- Confirm Prospect Board visually matches staff.
- Confirm Player Database shows the real networking/scouting database, not only represented players.
- Confirm My Tasks is the live staff My Tasks view with tabs and leaderboard.
- Confirm Recent Activity includes task completions and task assignment events.
- Confirm contracts display actual PDFs or a clear fallback, not a blank white screen.
- Confirm commission totals show invoice-linked paid/outstanding/invoiced data and editable forecast values only when unlocked.