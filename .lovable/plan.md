# Plan

Two builds. (The Mulligan/Omotoye data audit was already delivered above — no code change unless you want a re-usable "report data gaps" view; not included here.)

---

## 1. Totals & averages header on Data → Match Data

**Location:** `src/components/staff/CoachingDataSection.tsx` → "Match Data" tab → above `AnalysisDataTab`.

Add a compact `MatchDataTotalsHeader` component that summarises the player's currently loaded `analyses` list. Two rows of pill stats:

- **Totals row:** matches, minutes, goals, assists, shots, key passes (sum across all analyses where the stat is present, nulls treated as 0 per project rule).
- **Averages row:** the mean for every numeric field that appears in `striker_stats` / `fixture_stats` / GK stats — discovered dynamically from the loaded analyses so it covers every match-statistic recorded on data reports. Percentage fields exclude nulls (existing rule); raw counts treat null as 0; "per 90" cards weight by `minutes_played`.

Implementation:
- New file `src/components/staff/MatchDataTotalsHeader.tsx`. Takes `analyses` + `playerData` (for position → GK vs outfield field set).
- Reuse the field metadata already declared in `AnalysisDataTab` (extract a small `getStatFields(position)` helper into `src/lib/matchStatFields.ts` so both files share it — keeps "stats visibility merging" rules intact).
- Render gold-bordered (`#C6A332`) pill cards, dark theme, em-dash for missing.
- Position-aware (GK gets GK fields), respects the existing hidden-stat rules.

Embedded in CoachingDataSection above `<AnalysisDataTab ... />`. No business-logic change inside `AnalysisDataTab`.

---

## 2. Club Outreach → "Outreach Strategy" tab

**Location:** `src/components/staff/ClubOutreachManager.tsx`.

### UI
Wrap the existing manager body in a top-level Tabs control with two tabs:
1. **Outreach** (current screen, unchanged).
2. **Outreach Strategy** (new).

### Outreach Strategy tab

Single wide screen (per project rule — no thin popup):

**A. Strategy form (top)**
- Player(s) multi-select (uses existing `PlayerCombobox` pattern, excludes Scouted / FFF).
- Target filters: country, league, league level, club name (free text), position fit notes (textarea), and any auto-fill defaults from the existing New Outreach dialog (fit/recommendation template, show toggles).
- "Save strategy" persists for reuse.

**B. Bulk club picker**
- Country → League → Clubs collapsible tree, sourced from `club_network_contacts` (group by `country`, then a `league` field). If no league field exists today, the migration below adds it and we surface a flat "Unknown league" group until populated. Clubs are de-duplicated by `club_name`.
- Each club row has a checkbox; running tally at the bottom. "Confirm selection" creates draft outreaches.

**C. Generation**
On confirm, for each selected club + each selected player, insert a row into `club_outreach_links` with:
- `status = 'draft'`
- `target_type = 'club'`
- Linked player(s) via `club_outreach_link_players`
- `club_contact_name` / club name filled from the picker
- `fit_recommendation` and the show_* toggles inherited from the strategy auto-fill
- New flag `is_pending_strategy_draft = true` so the main Outreach tab can render these with the brown shade + ? badge

### Drafts strip on main Outreach tab
On the existing "Drafts" column in `ClubOutreachManager.tsx`, rows where `is_pending_strategy_draft = true` render with:
- Brown card border / left accent (`hsl(28 45% 35%)`)
- A `?` icon
- Green-tick (Check) and red-X (X) buttons inline

Actions:
- **Green tick:** clears `is_pending_strategy_draft`, opens the existing edit dialog pre-filled so staff can finalise.
- **Red X:** soft-deletes (sets `archived_at`), same as the existing archive flow.

### Strategy persistence

New table `club_outreach_strategies`:
- `name text`
- `player_ids uuid[]`
- `filters jsonb` (country, league, level, position notes, etc.)
- `defaults jsonb` (fit_recommendation template, show_form/show_in_numbers/show_season_stats/show_strengths, prepared_for_name pattern)
- `created_by`, timestamps
- RLS + GRANTs per project rules; authenticated staff only.

Migration also adds:
- `club_outreach_links.is_pending_strategy_draft boolean default false`
- `club_outreach_links.strategy_id uuid` (FK to new table, nullable)
- Optional `club_network_contacts.league text` if not present, so the picker can group by league.

### Files touched
- New: `supabase/migrations/<ts>_outreach_strategy.sql`, `src/components/staff/outreach/OutreachStrategyTab.tsx`, `src/components/staff/outreach/StrategyClubPicker.tsx`, `src/components/staff/MatchDataTotalsHeader.tsx`, `src/lib/matchStatFields.ts`.
- Edited: `src/components/staff/ClubOutreachManager.tsx` (Tabs wrapper, brown-draft rendering, tick/reject buttons), `src/components/staff/CoachingDataSection.tsx` (insert totals header above match data), `src/components/portal/AnalysisDataTab.tsx` (only to import shared field meta — no behaviour change).

### Out of scope
- No change to existing send/translate/PDF flows.
- No change to the public proposal page.
- No automatic AI fill on bulk drafts — they inherit strategy defaults, nothing more, per your answer.
