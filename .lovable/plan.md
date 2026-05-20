## Goals for this turn

Ship three big pieces deliberately, in this order:

1. **Stats updater scoping** — make the staff portal actually show only the players a stats updater is assigned to, everywhere they can reach.
2. **Long-Term Vision** block on the player portal hub (after Comparisons), pulling from the Athlete Centre.
3. **Player Operating Profile** questionnaire — one-time pop-up on the portal that feeds the Athlete Centre.

---

## 1. Stats updater player scoping

Right now `useStatsUpdaterAssignments` exists but isn't enforced in most lists. Apply it as a single, consistent filter in every section a stats updater can reach.

Sections to scope (verified via `role_permissions` + sidebar):
- Overview / Recent players / Search results
- Focused Tasks (`FocusedTasksSection`)
- Coaching Data → Performance Reports, Match Data, Comparisons (`CoachingDataSection`, `ActionReportsList`)
- Video Analysis (`coaching/VideoAnalysis`, `AnalysisManagement`)
- Vision Board / Athlete Centre player picker (`AthleteCentre`)
- Any global player combobox / recent players bar

Approach:
- Add a small `scopePlayersToStatsUpdater(players, scope)` helper next to the hook.
- In each list/grid, call `useStatsUpdaterAssignments()` once and filter the players array before render.
- For queries that hit Supabase by `player_id` (analyses, reports, video), add `.in("player_id", [...allowedIds])` when `isScoped` is true. If `allowedIds` is empty, short-circuit to an empty result and show a "No assigned players yet" empty state (no spinner).
- Block deep links: in `PerformanceReport.tsx` and any report/edit route, if `isScoped && !allowedIds.has(reportPlayerId)` redirect back to overview with a toast.
- Default landing: `Staff.tsx` already lands stats updater on first viewable section — keep that, but ensure overview is in their viewable set or pick `coaching-data` instead.

Test matrix: log in as a stats updater with 0, 1, and 3 assignments and walk each section.

---

## 2. Portal hub: Long-Term Vision block

Placement: in `src/pages/Dashboard.tsx`, immediately after the `comparisons` TabsContent (line ~2627), inside the same hub flow. Render only if at least one of the four parts has content.

Layout: 2x2 grid on desktop (`md:grid-cols-2`), single column on mobile, with the existing marble Card chrome and Rise Gold top border to match the rest of the hub.

The four parts (titles localised, content from Athlete Centre):

```text
+---------------------------+---------------------------+
| 1. Skillset & Potential   | 2. Per-90 Targets         |
|    written eval           |    list of metrics + goal |
+---------------------------+---------------------------+
| 3. Development Road Map   | 4. Players to Watch       |
|    6 / 18 / 36 months     |    glassy cards + play    |
+---------------------------+---------------------------+
```

Each tile: glossy glass surface (`bg-card/60 backdrop-blur border border-white/10 rounded-2xl`), Rise Gold accent heading, content-aware empty handling (a missing part collapses, doesn't show "—").

Part 4 cards: name (heading), reason (body), and a circular play button linking out via `openExternalUrl`. Stack vertically inside the tile, glassy chip per player.

Data source: extend `player_athlete_profile` (existing table backing Athlete Centre) — see Technical section for schema.

Trigger to staff: in Athlete Centre, the existing "Long-Term Plan" tab becomes "Long-Term Vision" with four sub-fields matching the portal tiles. Save persists; the portal reads the same row.

---

## 3. Player Operating Profile questionnaire

A one-time pop-up on the portal (wide, not thin — per project convention) the first time a player lands after release. Once submitted, it never re-opens; staff can clear it from the Athlete Centre to re-trigger.

Pop-up shell:
- Reuse `Dialog` with `max-w-4xl`, scrollable body, "Save and continue later" + "Submit" footer.
- 6 sections as accordion steps with a progress bar (Communication, Engagement, Discipline, Energy, Match Prep, Reflection).
- Ranking questions: drag-to-reorder list (use `@dnd-kit` already in the project) with numbered chips.
- Single-select: `RadioGroup`. Multi-select up to N: checkbox grid with counter.
- Open responses: `Textarea`.
- Autosave draft every 10s into `player_operating_profile_drafts` keyed by player id so they don't lose progress.

Staff side: new tab in Athlete Centre → Development → "Operating Profile" rendering the answers read-only, grouped by section, with a "Reset questionnaire" button. This becomes the opening section of Development for that player.

Localisation: all question text goes through `t()` with keys under `operatingProfile.*` so the 12 portal languages pick it up. English source first, then run the existing auto-translate pass.

---

## Technical notes

### DB migrations
- Extend `player_athlete_profile` (or create if missing) with:
  - `vision_skillset text`
  - `vision_per90_targets jsonb`  // `[{metric, target, unit}]`
  - `vision_roadmap jsonb`  // `{ six_months, eighteen_months, thirty_six_months }`
  - `vision_players_to_watch jsonb`  // `[{name, reason, url}]`
- New table `player_operating_profile`:
  - `player_id uuid PK FK players(id)`
  - `answers jsonb not null` (sectioned)
  - `submitted_at timestamptz`
  - `updated_at timestamptz default now()`
  - RLS: select/update by the player's own email match (existing portal pattern), full access to admin/staff. Stats updater: no access.
- New table `player_operating_profile_drafts` mirroring the above for autosave.

### Edge functions
- `operating-profile-save` — accepts `{playerEmail, answers, submit}`, validates with zod, upserts draft or final row using service role. Mirrors the `playlist-manage` auth pattern.

### Files likely touched
- `src/hooks/useStatsUpdaterAssignments.ts` (+ helper)
- `src/pages/Staff.tsx`, `Dashboard.tsx`, `PerformanceReport.tsx`
- `src/components/staff/{FocusedTasksSection,CoachingDataSection,AthleteCentre,AnalysisManagement}.tsx` and `analysis/ActionReportsList.tsx`, `coaching/VideoAnalysis.tsx`
- `src/components/portal/LongTermVisionSection.tsx` (new)
- `src/components/portal/OperatingProfileDialog.tsx` (new) + step components
- `src/components/staff/AthleteCentre.tsx` long-term vision editor + operating profile viewer
- `supabase/functions/operating-profile-save/index.ts` (new)
- One migration file for the schema changes above

### Out of scope (will not touch this turn)
- Re-styling existing hub sections
- Auto-translation runs beyond English source strings (kicks off separately)
- Investor portal, Rise With Us, playlists — already shipped previously

---

## Order of execution

1. Stats updater scoping (most-asked, smallest UI surface)
2. DB migration for vision + operating profile
3. Long-Term Vision tiles (staff editor → portal renderer)
4. Operating Profile dialog + autosave + staff viewer
5. Smoke test all three as a stats updater and as a player
