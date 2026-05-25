## Changes

### 1. Projections — remove costs
- Drop the `Costs` stat, `Costs` input, and the cost subtraction from `total` in the `Projections` component.
- Result becomes pure revenue (player income + extra income).
- Add a header line: **"18-month projection window: 1 June 2026 → 31 December 2027"**.
- Leave existing data in `costs_gbp` column untouched in DB; just stop rendering/using it.

### 2. Forecast — Expected vs Real tabs
Replace the current single Forecast view with a tabbed layout:

**Tab "Expected" (default)**
- Pulls totals from the currently selected (or default "expected" scenario) Projection row: `playerIncome + extraRowsIncome + legacyExtra`.
- Uses fixed 19-month timeline: Jun 2026 → Dec 2027 (the user said 18 months Jun 1 2026 – Dec 31 2027; that's 19 calendar months — clarify in question below).
- **Revenue table** (month-by-month): initially distributes the projection total evenly across all months. Each cell is inline-editable; edits are persisted as monthly overrides.
- **Spend table** (month-by-month): initial baseline = a single "Planned monthly investment" figure (new editable setting, defaults to current avg actual monthly spend rounded). Each month inline-editable.
- "Add row" buttons under both tables to add custom one-off income or expense lines (label + month + amount + notes), persisted alongside.
- Cumulative net chart redrawn from the edited monthly figures.

**Tab "Real"**
- Exactly the existing 12-month actual spend vs invoice-paid revenue chart + cumulative chart (current behaviour, unchanged).

**Persistence (new table)** `investor_forecast`:
- `id`, `kind` ('revenue' | 'spend' | 'extra_income' | 'extra_expense'), `month` (date, first of month), `label` (nullable, for extras), `amount_gbp`, `notes`, timestamps.
- Plus a singleton `investor_forecast_settings` row with `planned_monthly_spend_gbp`.
- Add to `ALLOWED_TABLES` in `investor-write` edge function (or extend `investor-overview-write` similarly).
- RLS: investor session via edge function only (same pattern as existing investor tables).

### 3. Move Business Plan to Dashboard
- In `CATEGORIES`, remove `businessPlan` from `exec` group.
- Add it to `dash` group right after `investment`:
  ```
  { id: "dash", ... sections: [ overview, investment, businessPlan ] }
  ```
- Wiring (`{active === "businessPlan" && <BusinessPlanSection ... />}`) already exists, just stays.

### Files
- `src/pages/InvestorsPortal.tsx` — Projections cleanup + header; new tabbed Forecast component; CATEGORIES reorder.
- `supabase/functions/investor-write/index.ts` — allow new forecast tables.
- New migration — `investor_forecast` + `investor_forecast_settings` tables with RLS.

## One clarification needed
The window "1 June 2026 → 31 December 2027" spans 19 calendar months, not 18. Should I:
- (a) use **Jun 2026 – Dec 2027 (19 months)**, or
- (b) use **Jul 2026 – Dec 2027 (18 months)**, or
- (c) use **Jun 2026 – Nov 2027 (18 months)**?