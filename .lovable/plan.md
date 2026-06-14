## 1. Credit Usage This Month (May 24 → Jun 24)

Workspace has used **666.45 of 2,060** granted credits. Cloud is NOT the problem — it's a tiny slice. Build-mode messages dominate.

| Bucket | Credits | % of spend |
|---|---|---|
| Build mode messages | 582.90 | 87.5% |
| Plan mode messages | 60.70 | 9.1% |
| Cloud (all sub-items combined) | 22.61 | 3.4% |
| AI Gateway (Gemini 2.5 Flash) | 0.24 | <0.1% |

Cloud breakdown: cached egress 9.86, file storage 6.09, egress 4.05, compute pico 2.58, functions 0.02, realtime 0.01.

### Ways to keep this down

**Biggest lever — build mode (87.5%):**
- Batch related changes into one message instead of several follow-ups. Each round-trip costs credits regardless of size.
- Reply to the same thread rather than re-stating context in a new message.
- Avoid "try again" / "make it nicer" loops — give one consolidated brief with all tweaks.
- Use plan mode (1 credit flat) for anything design-y or ambiguous before committing build credits.
- "Try to fix" on errors is free — use it before asking for a manual fix.

**Plan mode (9.1%):** fine as-is, but skip plan mode for tiny, unambiguous edits.

**Cloud (3.4%):** small but trimmable:
- Cached/raw egress (13.9c) is dominated by large media. Lazy-load video/PDF previews and ensure heatmaps/match clips use the existing CDN cache headers.
- File storage (6.1c) — purge expired `analysis-videos` clips faster (the cleanup function already exists; schedule it daily).
- Compute pico (2.6c) — review heaviest edge functions for unnecessary cold starts.

Most impactful single change: consolidate requests. Cutting build messages 25% saves ~145 credits/month.

## 2. Match-by-Match Action Data (Mulligan & Omotoye)

This is the final readable copy you asked for. Pulled live from `player_analysis` + `performance_report_actions`.

### Michael Mulligan

**Missing actions entirely (0 logged):**
- 2023-05-21 FC Gießen, 2023-05-27 RW Hadamar, 2023-09-01 1862 Weinheim, 2023-09-09 VfB Eppingen, 2023-09-24 Zuzenhausen, 2023-10-13 Bruchsal, 2023-10-21 Spielberg, 2023-11-25 Germania Friedrichstal, 2024-01-28 Gonsenheim, 2024-03-10 Weinheim, 2025-01-18 TG Friedberg, 2025-09-24 Bohemians 1905 (12 fixtures)

**Actions logged but zero descriptions, descriptions hidden (`show_descriptions=false`):** intentional, not missing
- 2026-04-04 Pribram II (81), 2026-05-01 Slavia C (74), 2026-05-20 Aritma (104), 2026-05-24 Dukla B (105)

**Actions logged, descriptions empty, descriptions still toggled on:** these are the real gaps
- 2026-03-28 Admira Praha (1/0, draft)
- 2026-04-25 Motorlet Praha (68/0)
- 2026-05-10 SK Petrin (50/0, draft)
- 2026-05-16 Kladno (102/0)

**Partial — only a sliver have descriptions:**
- 2026-02-28 Králův Dvůr (68/66), 2026-03-07 SK Dynamo Č. Budějovice B (97/96), 2026-04-18 Pisek (48/2), 2026-05-30 Viktoria Plzeň B (77/2)

### Tyrese Omotoye

**Missing actions entirely (0 logged):**
- 2025-07-25 SILON Taborsko, 2025-07-30 Artis Brno, 2025-08-03 Pribram, 2025-08-08 Chrudim, 2025-08-16 SFC Opava, 2025-08-22 1.SK Prostejov, 2025-08-31 Viktoria Zizkov, 2025-09-12 Slavia Prague B, 2025-09-20 Zbrojovka Brno, 2025-09-26 Banik Ostrava B, 2025-10-05 Vlasim (11 fixtures)

**Actions logged but zero descriptions, descriptions hidden (`show_descriptions=false`):** intentional
- 2026-04-04 Prostejov (65), 2026-04-15 Slavia Praha (99), 2026-04-19 Zbrojovka Brno (44), 2026-04-24 Baník Ostrava B (97), 2026-05-06 SK Dynamo (71), 2026-05-10 Slavia Kromeriz (84), 2026-05-16 Sparta Prague B (102)

**Actions logged, descriptions empty, descriptions still toggled on:** real gaps
- 2026-05-23 Ústi nad Labem (63/0, draft)

**Partial:**
- 2026-03-06 Pribram (44/43), 2026-03-19 Opava (29/28)

## 3. Relationships Tab on Club Outreach

Add a third tab `Relationships` to `ClubOutreachManager` alongside the existing Outreach and Strategy tabs.

**Scope:** track our relationship with individual staff members at clubs (sporting directors, scouts, coaches, agents-of-agents), generate random weekly nudges, log conversation notes, tag rapport level.

### Migration
New table `outreach_relationships`:
- `contact_id` (FK → `club_network_contacts`, unique) — source of name/club/role/country
- `rapport_level` enum: `cold`, `warming`, `friendly`, `trusted`, `champion`
- `weekly_trigger_count` smallint default random 3–5, regenerated each Monday
- `last_outreach_at`, `next_nudge_at`
- `is_archived` bool
- standard timestamps

New table `outreach_relationship_notes`:
- `relationship_id` FK
- `body` text
- `author_id` uuid
- `created_at`

RLS: admin + staff with `outreach` permission can manage; service_role full. Grants for authenticated and service_role.

Trigger on insert into `outreach_relationship_notes`: bump `relationships.last_outreach_at = now()` and clear `next_nudge_at` so a new trigger picks a new day.

A daily edge function (or pg_cron) `regenerate-relationship-triggers` runs at 00:05 each Monday: for each non-archived relationship, set `weekly_trigger_count` to a random 3–5 and schedule that many `next_nudge_at` dates spread across the week (stored as a `nudge_dates date[]`).

### UI — `src/components/staff/outreach/RelationshipsTab.tsx`

- Header: search + rapport filter + "Add relationship" (picks existing contact from `club_network_contacts` or quick-adds new).
- Card grid (one card per relationship):
  - Contact photo, name, role, club (with logo), country flag.
  - Rapport pill (colour-coded per level) — click to cycle/select.
  - "Nudge" badge if `today ∈ nudge_dates`, brown highlight just like strategy drafts.
  - Days-since-last-contact.
  - Inline note composer (textarea + Save) — saves to `outreach_relationship_notes`, optimistic UI, auto-updates `last_outreach_at` via the trigger.
  - Collapsible note history (most recent first, author + relative time).
- Top strip: "This week's nudges" — list of cards due today/this week, click-through to focus the card.
- Empty state explains the random 3–5 weekly trigger system.

### Files

- New migration: tables, grants, RLS, trigger, optional cron.
- New `src/components/staff/outreach/RelationshipsTab.tsx`.
- New `src/components/staff/outreach/RelationshipCard.tsx`.
- New edge function `regenerate-relationship-triggers` + cron entry.
- Edit `src/components/staff/ClubOutreachManager.tsx` — add the third tab.

### Out of scope

No email/WhatsApp send from this tab (notes only), no AI-suggested message drafts, no calendar sync — those can come later.
