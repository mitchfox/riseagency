# Staff atmosphere + recruitment polish

## 1. Staff "night light" + atmosphere

**Header night glow (7pm–7am local time)**
- Add a 2px thin Rise Gold bar pinned to the very top of the staff header (above existing content) with a soft outward glow (`box-shadow: 0 0 12px hsl(var(--risegold) / 0.6), 0 0 24px hsl(var(--risegold) / 0.35)`).
- Visibility driven by a small `useNightMode()` hook (re-checks every minute) returning true when local hour ≥ 19 or < 7.
- Subtle pulse via a new `night-glow` keyframe (3s ease-in-out alternate) so it breathes.

**Other ambient touches (only at night, all opt-out via existing dev mode flag — kept tasteful)**
- Slightly warmer page background tint: overlay `radial-gradient` at top using `hsl(var(--risegold) / 0.03)` behind the header.
- Section headings get a faint risegold underline glow at night.
- All purely cosmetic, no layout shifts, no perf impact.

## 2. Coherent star / shortlist system

**Schema**
- Add `is_starred boolean default false` to `player_outreach_youth`, `player_outreach_pro`, and `players` (players probably already has a similar concept — if so, reuse; otherwise add).
- Add `starred_at timestamptz` on each so we can sort by most-recently shortlisted.

**UI**
- Reusable `<StarToggle row={…} table={…} />` component (filled gold star vs hollow). Click toggles instantly with optimistic update + toast on failure.
- Show the star control as the first cell on every recruitment table row (Player Database, Player Outreach Youth/Pro, Pipeline cards).
- Add a "Starred only" filter chip above each table.

**Pipeline impact**
- "Not contacted" column shows **only starred** players. The Offer-link and Template buttons are hidden on non-starred cards elsewhere too.
- All other pipeline columns continue to show everyone with outreach history.

## 3. Pagination on the pipeline board
- Mirror the 50-per-stage pagination used on the outreach tables: per-stage `page` state, Prev / Next at top and bottom of each column, reset on search/filter changes.
- Single fetch unchanged; only the rendered slice is paginated.

## 4. Fit score column = first column, with filtering

**Tables affected**: `PlayerDatabase.tsx`, `PlayerOutreachPanel.tsx` (Youth + Pro).

- Move the Fit badge to column 1 (before Player name) on every relevant table.
- Header is clickable to sort ascending/descending (tri-state: none → desc → asc → none). Persist per-table sort in component state.
- Above each table, add a "Min fit score" slider/number input (0–100, defaults 0) that filters rows in place. Reset button clears.
- The slider lives next to the existing search/filters.

## 5. Universal bonus weighting (caps at 100, ratio-based)

**Schema** — add to `recruitment_scoring_settings` (jsonb `bonus_weights`) and per-target override on `recruitment_targets.weights_override`:
- Bonus toggles per player (stored as new boolean/text fields on player rows where relevant — see §7).

**Bonus categories** (universal — apply to global score and to per-target overrides as additive contributions):
- `national_team_player` (default +8)
- `star_of_team` (default +6)
- `previous_serious_injury` e.g. ACL (default −10, configurable)
- `top_club` (e.g. R1) auto-detected (default +5)
- `parent_approval` already exists — fold into bonus framework
- Each weight editable in `ScoringSettings.tsx` and per-target.

**Ratio-based scoring rewrite** in `src/lib/fitScore.ts`:
- Base score per target = `Σ achieved_component / Σ max_component × 80` (rather than summing raw weight values that can be partial).
- AI nudge contribution = `clamp(ai_bonus, 0, weights.ai_nudge) × (weights.ai_nudge / Σmax)` proportionally.
- Bonuses applied after ratio scaling, then `clamp(total, 0, 100)` — guarantees 100 cap and "more ratio based but shown as a whole integer".
- Update breakdown reasons to show "X/Y in category" rather than raw +N where helpful.

## 6. Position normalisation
- New `src/lib/positionNormalise.ts` with a map:
  - Midfielder / Central Midfielder / Mid → CM
  - Defensive Midfielder / Holding Mid → CDM
  - Attacking Midfielder → CAM
  - Centre Back / Center Back / Defender → CB
  - Left/Right Back → LB/RB; Left/Right Wing Back → LWB/RWB
  - Striker / Forward / Centre Forward → CF
  - Left/Right Wing / Winger → LW/RW
  - Goalkeeper → GK
- Applied in three places:
  1. On read in outreach tables and player database (display only).
  2. In fit-score comparisons (so legacy rows score correctly without backfill).
  3. One-off normalising backfill migration to update existing rows for cleanliness.

## 7. Player detail toggles + club rating fixes

**On player outreach row drawer + player database edit pane**, add toggle switches for:
- National team player
- Star of the team
- Previous serious injury (free text field for type, e.g. "ACL 2023")
- Parent approval (youth only — already present)

These persist to the row and feed §5 bonus weighting.

**Club rating data**
- Add a curated alias map (and a small migration to seed obvious ones) so PSG → Paris Saint-Germain → R1. Lookup happens in `fitScore.ts` via `clubNameUtils` before rating fetch.
- Extend `club_ratings` with a few high-profile entries via data insert (PSG, Real Madrid, Man City, Bayern, etc. = R1; can be edited later by staff).

---

## Technical notes (for the AI implementing)

- Files touched: `src/components/staff/StaffHeader.tsx` (or wherever the staff header is), new `src/hooks/useNightMode.ts`, `src/index.css` (keyframes + risegold glow utilities), `src/components/staff/PlayerDatabase.tsx`, `src/components/staff/PlayerOutreachPanel.tsx`, `src/components/staff/recruitment/OutreachPipelineBoard.tsx`, `src/components/staff/recruitment/OutreachInteractionDrawer.tsx`, `src/components/staff/recruitment/ScoringSettings.tsx`, `src/components/staff/recruitment/OutreachTargetsManager.tsx`, `src/lib/fitScore.ts`, new `src/lib/positionNormalise.ts`, new `src/components/staff/recruitment/StarToggle.tsx`.
- Migrations:
  1. Add `is_starred`, `starred_at`, `national_team`, `star_of_team`, `previous_serious_injury` to both outreach tables and `players` (where missing).
  2. Add `bonus_weights jsonb` to `recruitment_scoring_settings` and extend `weights_override` usage on `recruitment_targets`.
  3. Seed `club_ratings` with a starter set of R1 clubs + alias map.
  4. Backfill normalised positions on `players` and both outreach tables.
- Cache invalidation via existing `invalidateScoringCaches()` after settings/targets/bonus toggles change.

## Out of scope
- Reworking the AI nudge prompt itself.
- Server-side pagination or virtualisation.
- Importing a full clubs-rating dataset (only seed obvious high-tier ones).
