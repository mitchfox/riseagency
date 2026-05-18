## Goal

Turn the Investor Portal into a live operating dashboard, not a pitch deck. Keep the staff shell (header, sidebar, fonts, marble, risegold). Reuse staff components directly instead of rebuilding. Make all overview content card-based, expandable, data-first, and editable via a hidden lock toggle.

---

## 1. Reuse staff components directly (no rebuilds)

Drop the bespoke "investor" versions of things staff already does well. Mount the staff components in read-only mode where needed.

| Investor section | Component reused from staff | Mode |
|---|---|---|
| My Tasks | `src/components/staff/MyTasks.tsx` | read-only prop |
| Leaderboard | existing staff leaderboard component | read-only |
| Content Strategy | staff `MarketingScheduleBoard` | read-only |
| Prospect Board | staff `ProspectBoard` | drag disabled |
| Player Database | staff `PlayerList` | read-only, edit hidden |
| Activity Feed | staff `ActivityLog` | trimmed to latest distinct entity (one row per entity/entity_name, not one row per edit) |
| Contracts | new `InvestorContracts` panel with inline iframe — no Dialog |

Add a `readOnly?: boolean` prop (or `viewerMode="investor"`) to each staff component above so edit controls/buttons render `null` for investor. No new "InvestorTasks" / "InvestorActivityFeed" / "InvestorPipeline" parallel files — delete them.

Activity feed dedupe rule: group by `(entity_type, entity_id)`, keep only the latest `created_at`, sort desc, paginate (`Load more`, 50 at a time). Container scrolls within section, doesn't lock page scroll.

---

## 2. Sidebar parity with staff

The investor sidebar must match the staff `Staff.tsx` sidebar 1:1 (same widths `w-14 md:w-24`, gold gradient active, framer-motion stagger, gold dividers, expandable categories with sub-items). Categories:

```text
Dashboard      → Overview, Investment Overview
Roster         → Represented, Mandated, Previously Mandated
Pipeline       → Prospect Board, Player Database
Legal          → Contracts
Financial      → Spending, Commission Forecast
Activity       → My Tasks, Leaderboard, Content Strategy, Activity Feed
```

Extract into `src/components/investor/InvestorShell.tsx` mirroring exact Tailwind from `Staff.tsx` lines 1567–1734.

Remove: "System Notes", visible Sign Out button (move to top-right avatar popover), "Levene/RISE" greetings.

---

## 3. Contracts — inline, no popup

Replace the broken Dialog with a two-pane inline viewer inside the Legal section:

- Left: vertical list of contracts (title, counterparty, status badge, signed/locked dates)
- Right: `<iframe src={locked_file_url || completed_pdf_url || file_url}>` filling the panel, `min-h-[80vh]`
- Selecting a contract swaps the iframe src — no modal, no new tab, no navigation

Mobile: list collapses above iframe, iframe `h-[70vh]`.

---

## 4. Investment Overview → editable CMS card system

### 4a. Data model (new table)

```sql
create table public.investor_overview_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.investor_overview_cards (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.investor_overview_sections(id) on delete cascade,
  title text not null,
  summary text,                -- collapsed line
  content text,                -- expanded markdown
  metrics jsonb default '[]'::jsonb,  -- [{label,value,unit}]
  tags text[] default '{}',
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS: select allowed to anyone with a valid investor session (via edge function, service role) AND to staff (`has_role(auth.uid(),'staff')` OR admin). Write only to staff/admin. Investor write path goes through a dedicated edge function `investor-overview-write` that validates the investor session token and admin flag (see §5).

Seed the table from the spec the user pasted (Core Vision, Investment Purpose, Operating Model, Use of Funds, Cost Structure, Systems & Infrastructure, Technology Stack, Outreach & Growth, Market Expansion, Player Pipeline, Revenue Model, Transparency, Return Model, Key Constraint, Differentiation) with their summaries, expanded content and metrics (£40k–£60k, £7.2k/player, etc.) as initial rows.

### 4b. Card UI (data-first, expandable)

`InvestmentOverviewCard.tsx`:

- Collapsed row: number, title (font-bbh uppercase), summary, **KPI chips on the right** (e.g. `£40k–£60k`, `£7.2k / player`) always visible
- Expand on click → framer-motion height auto, 350ms cubic-bezier
- Expanded: markdown content + metric grid + tag chips
- Card style: `border border-primary/20 bg-card`, hover `bg-primary/5`, gold chevron rotates 180°
- Mobile: KPIs wrap below title

Group cards by section, each section a sticky `font-bbh` header.

### 4c. Inline editing (only in unlocked mode)

When unlocked, every card and section gains:

- Edit title (inline `BlurInput`)
- Edit summary
- Edit full content (textarea with markdown preview)
- Edit metrics (repeater of label/value/unit)
- Add card below (`+` button between cards)
- Delete card (with confirm)
- Reorder via drag handle (dnd-kit, already in project)
- Section: add new section, rename, delete, reorder

All edits save on blur via `investor-overview-write` edge function.

---

## 5. Hidden lock toggle (admin/edit mode)

- Default state on every login/refresh: **locked**. Never persisted across reload.
- Stored in component state only (`useState`), never localStorage.
- Toggle: tiny icon (Lock/Unlock from lucide), bottom-right of footer, `opacity-20 hover:opacity-100 transition`, no label.
- Click → password prompt (one-shot, validated against a new `is_admin` boolean on `investor_users`). On success, flip to unlocked, show editing affordances everywhere, show a thin gold ribbon at top "Edit mode — changes save automatically".
- All edit UI conditionally rendered behind `if (unlocked && user.is_admin)`. When locked, edit buttons render `null` (not just disabled).
- Server-side: `investor-overview-write` re-validates `is_admin` on the session token for every request. UI lock is presentation only — security comes from the edge function check.

Migration: `alter table public.investor_users add column is_admin boolean default false;` and flip Levene's row to true via insert tool.

---

## 6. Roster, Pipeline, Financial — keep current direction, polish

- Roster cards: player avatar, name, position chip, **flag SVG** via `getCountryFlagUrl` (never raw country text), age from `date_of_birth`, club + club_logo, contract end traffic-light, expected commission. Already migrated in last loop — verify wiring.
- Pipeline: mount staff `ProspectBoard` with `readOnly` prop + tab to staff `PlayerList` (read-only). Drop the placeholder cards.
- Commission Forecast: keep, link totals into Return Model card on the Investment Overview.

---

## 7. Edge function update

`supabase/functions/investor-data/index.ts`:

- Add `overviewSections` and `overviewCards` to the response (joined and sorted by `display_order`)
- Return `is_admin` on the user object
- Activity feed: dedupe server-side via `distinct on (entity_type, entity_id)` ordered by created_at desc, limit 100

New function `supabase/functions/investor-overview-write/index.ts`:

- Validates token + `is_admin`
- Accepts `{action: 'upsertCard'|'deleteCard'|'upsertSection'|'deleteSection'|'reorder', payload}`
- Uses service role for writes

---

## 8. Remove clutter from the portal

- Delete the bespoke "Live Tasks", "Activity Log (investor flavour)", "System Notes" components
- Drop visible Sign Out (avatar popover only)
- No "Welcome Levene", no "RISE Investor Portal" wordmarks repeated in section headers
- All section headers use `StaffCardHeader` with marble overlay for visual parity

---

## 9. Files touched

**Migrations**
- new table `investor_overview_sections`
- new table `investor_overview_cards`
- `investor_users.is_admin` column
- RLS policies as above

**Edge functions**
- `supabase/functions/investor-data/index.ts` — add overview tables, dedup activity, return `is_admin`
- `supabase/functions/investor-overview-write/index.ts` — new

**Frontend**
- `src/pages/InvestorsPortal.tsx` — slim to a router; delegate to shell
- `src/components/investor/InvestorShell.tsx` — copy of staff header/sidebar
- `src/components/investor/InvestmentOverview.tsx` — rewrite to read from DB
- `src/components/investor/InvestmentOverviewCard.tsx` — new (collapsed+expanded+edit modes)
- `src/components/investor/InvestmentOverviewEditor.tsx` — new (admin add/edit/reorder)
- `src/components/investor/InvestorContracts.tsx` — inline iframe viewer (no Dialog)
- `src/components/investor/InvestorLockToggle.tsx` — new (footer icon + password prompt)
- `src/components/investor/InvestorContext.tsx` — provides `{unlocked, isAdmin, data}` to children
- Delete: `InvestorTasks.tsx`, `InvestorActivityFeed.tsx`, `InvestorPipeline.tsx` (bespoke shells)
- Staff components touched to add `readOnly` prop: `MyTasks.tsx`, `ProspectBoard.tsx`, `MarketingScheduleBoard.tsx`, `PlayerList.tsx`, `ActivityLog.tsx`, leaderboard component
- Seed insert for the 15 overview cards from the user's spec

---

Ready to implement on approval.