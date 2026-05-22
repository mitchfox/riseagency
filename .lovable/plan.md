## Goals

Six fixes/additions across the Investors Portal, Staff portal, and Performance Reports — plus a Semrush usage proposal for this project.

---

## 1. Semrush — proposed usage

Semrush is most useful here as an **agency-marketing intelligence layer** for the public-facing Rise sites (risefootballagency.com plus the language and role subdomains). Suggested in-app surfaces, all behind a new staff section `marketing › SEO Intelligence`:

- **Domain dashboard** – pull `domains/domain_ranks` + `seo_trend` for `risefootballagency.com` and selected subdomains; show keywords, organic traffic, AS, and trend sparkline.
- **Top pages tracker** – `domains/domain_organic` to see which pages (player profiles, Stars, Jobs, BetweenTheLines) rank, with weekly diff.
- **Keyword tracking** – `keywords/phrase_this` + `keyword_compare` for terms like "football agent UK", "youth football scout", "request representation", per-database (uk/de/fr/es/pt/it/cz/pl/tr/no/hr/ru).
- **Competitor watch** – `domains/domain_domains` against Stellar, Wasserman, CAA Base, plus regional rivals; surface keyword-gap rows we don't rank for.
- **Backlinks monitor** – `backlinks/backlinks_overview` + `backlinks/backlinks_refdomains` for new referring domains (press hits, club site mentions).
- **Position tracking pipeline** – `projects` + `tracking/v2/reports` for a saved Semrush campaign of priority queries, refreshed nightly via a scheduled edge function writing into a new `seo_snapshots` table.
- **Per-player SEO health** – `url/url_organic` on each represented player's public profile page so staff can see which player pages attract organic search.

Connector wiring uses the gateway (`https://connector-gateway.lovable.dev/semrush/...`) with `LOVABLE_API_KEY` + `SEMRUSH_API_KEY` in a single `semrush-proxy` edge function.

---

## 2. Salary Cap — make every cell editable

Today only `current_salary_annual`, `expected_commission_annual`, `potential_commission_annual` are editable; the per-season columns and contract window are derived. Make every cell on screen editable:

- Add inline-editable cells for **contract start** and **contract end** in the table (date pickers) so the guaranteed calc the user sees can be corrected on the spot.
- Add a new `players.salary_cap_overrides` JSON shape `{ "<season-key>": { guaranteed?, expected?, potential? } }` (column already exists). When a season cell has an override it wins over the calc; otherwise the formula runs.
- Make every season cell click-to-edit per `mode` (Guaranteed / Expected / Potential) — writes into the matching key of `salary_cap_overrides`.
- Clear button per overridden cell to revert to formula.
- Allow editing within the bar-chart row too via a quick "edit totals" popover that proportionally allocates an override across the live players, OR just keep bars read-only mirrors of the editable table (simpler, recommended).
- Persist via existing `investor-write` edge function's `updatePlayerCommission` action — extend payload to accept `contract_start_date`, `contract_end_date`, and `salary_cap_overrides` patches.

---

## 3. Salary Cap & Forecast — include Previously Mandated and reorder

- `SalaryCap.live` and `Forecast.represented` filters currently exclude `previously_mandated`. Include it.
- Sort rows in Salary Cap, Commission Forecast and the Forecast page using `sortPlayersByRepresentation` so the order is: **Represented → Fuel For Football → Mandated → Previously Mandated → others**.
- Keep section dividers in the table (a thin row showing the group label) so the groups read clearly.

---

## 4. Forecast Y-axis showing wrong figures

`tickFormatter={(v) => £${Math.round(v / 1000)}k}` produces `£0k` for sub-thousand values and `£1000k` for millions. Replace with a single helper:

- `< £1k` → `£<value>` (no suffix)
- `£1k–£999k` → `£NNk` with up to 1 decimal where useful
- `≥ £1m` → `£N.Nm`
- Handle negatives (cumulative net can dip below 0 — currently shows `£-0k`).
- Apply the same formatter to both the bar chart and the cumulative-net line chart, and to tooltip labels for consistency.

---

## 5. Move Business Plan into Investors Portal and remove its password

- Add a new investor section `businessPlan` (icon `Briefcase`) in `InvestorsPortal.tsx`, slot it into the existing executive / strategy group.
- Render `<BusinessPlanSection />` inside it.
- Delete the password gate inside `BusinessPlanSection.tsx` (the hard-coded `"Jolon"` check and `SESSION_KEY` unlock screen) — content shows directly.
- Remove the `nplan` / `businessplan` entry from `Staff.tsx` (sidebar + switch case) and from `SectionGridPicker`.
- Cleanup: leave the data table untouched (rows stay editable in the new home).

---

## 6. R90 Performance Report edit — fix broken action layout

The individual-action description box is misaligned in the report editor after the recent changes. Steps:

- Reproduce in the editor (`CreatePerformanceReportDialog` / `PerformanceActionsDialog`) with a represented player + a draft report containing 2-3 actions.
- Identify the regressed wrapper — likely a grid/flex container around `{action row}` + `{description textarea}` whose column spans or `order` got mis-set in the recent edit.
- Restore the original three-zone layout: (a) action chip + score, (b) timestamp + clip controls, (c) full-width description textarea below, spanning the action row.
- Verify on mobile (390px) and desktop.

---

## Technical notes

- Schema: `players.salary_cap_overrides jsonb default '{}'::jsonb` already exists; no migration needed if so — confirm with a read query before building. If missing, add one migration.
- Edge function: extend `supabase/functions/investor-write/index.ts` `updatePlayerCommission` to whitelist `contract_start_date`, `contract_end_date` (validate as ISO dates) and `salary_cap_overrides` (validate as object).
- New `semrush-proxy` edge function with `verify_jwt = true`, body-validated via Zod, returning the gateway JSON.
- New table `seo_snapshots(id, target, kind, snapshot_at, payload jsonb)` for the nightly position-tracking writes (only built if user wants the Position Tracking surface).
- All number formatting goes through one helper exported from `InvestorsPortal.tsx` so the Forecast charts, Salary Cap stats, and tooltips stay in lockstep.

---

## Out of scope for this round

- Building any Semrush UI — this turn is the proposal; I'll wait for a green light before connecting the connector and shipping surfaces.
- Reworking `CapacityPlanner` — already addressed last round.
