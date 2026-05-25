## 1. New "Timeline" section in Dashboard

Add a Timeline section right after Business Plan in the `dash` category for tracking key dates, income, expenses, and transfer window periods on a single chronological view.

**Database** — new migration:
- `investor_timeline` table: `id`, `kind` (text: `event` | `income` | `expense` | `transfer_window`), `title`, `start_date` (date), `end_date` (date, nullable — only used for transfer windows / multi-day spans), `amount_gbp` (numeric, nullable), `notes` (text), `created_at`, `updated_at`.
- RLS: deny direct access; all reads/writes go through edge functions (same pattern as `investor_forecast`).

**Edge functions**:
- `investor-data`: fetch `investor_timeline` ordered by `start_date asc` and return as `timeline`.
- `investor-write`: add `investor_timeline` to `ALLOWED_TABLES`.

**UI** (`src/pages/InvestorsPortal.tsx`):
- Add `"timeline"` to `SectionId` union and to the `dash` category after `businessPlan`.
- New `Timeline` component:
  - Chronological list grouped by month, colour-coded by `kind` (event = neutral, income = green, expense = red, transfer_window = gold band spanning start→end).
  - "Add entry" inline form: kind selector, title, start date, optional end date (only enabled for `transfer_window`), optional amount, notes. Save calls `investor-write` insert.
  - Each row inline-editable (blur-to-save) and deletable.
- **No page reload**: after every insert/update/delete, update local `timeline` state in place (push/replace/filter). Do not call any refetch-and-reload pattern. Follows the same `setData(d => ({ ...d, timeline: [...] }))` approach already used elsewhere on the page.

## 2. Network section showing staff's club network

The current `clubnetwork` section renders `<ClubNetworkManagement />`, which queries `club_network_contacts` directly via the supabase client. Investor users are not Supabase-authenticated (custom investor session), so RLS returns zero rows and the list looks empty.

Fix: render the existing `ClubNetworkView` component (already defined at line 2363) and feed it `data.clubContacts` — which the `investor-data` edge function already loads via the service role. Read-only view is appropriate since investors aren't managing the network.

Change at line 2915:
```tsx
{active === "clubnetwork" && <ClubNetworkView rows={data.clubContacts} />}
```

## Files touched
- New migration: `investor_timeline` table + RLS.
- `supabase/functions/investor-data/index.ts` — fetch timeline.
- `supabase/functions/investor-write/index.ts` — allow `investor_timeline`.
- `src/pages/InvestorsPortal.tsx` — new `Timeline` component + section wiring + Network fix. All state updates done in-place, no `window.location.reload()` or full refetch.
