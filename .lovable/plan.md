## What's wrong now

1. **Session colours are gone from the editor.** The unified `ProgrammingWeeksEditor` table just paints every cell gold (SPS) or blue (Technical). The old SPS schedule used a per-session-letter colour map (A = navy, B = green, C = red, D = gold, E = olive, F = purple, G = teal, PRE-x = darker shades, R/Rest = light grey, etc.) and that's what you want back — in the editor and everywhere it's rendered.
2. **Portal is still reading the old data.** The player Dashboard and Hub still read `player_programs.weekly_schedules` (the legacy JSONB field). We migrated everything into `programming_weeks`, so the portal now shows stale data and Technical programmes don't appear in the weekly schedule at all.

## Plan

### 1. Bring back per-session colours (shared)

- Lift the `getSessionColor` map out of `Dashboard.tsx` into a small shared helper `src/lib/sessionColors.ts` so the editor, portal Dashboard, portal Hub, and Technical view all use the exact same colours.
- Keys: `A`–`G`, `PRE-A`–`PRE-G`, `PREHAB`, `T`/`TESTING`, `R`/`REST`, plus a fallback. Same HSL values as today (rise-gold text on coloured backgrounds).
- Update `Dashboard.tsx` and `Hub.tsx` to import from the helper instead of defining it inline (no visual change for them).

### 2. Repaint the editor cells

In `ProgrammingWeeksEditor.tsx` `SlotCell`:
- When a slot points at a session, look up the colour by `ref.sessionKey` (e.g. `A`, `PRE-B`, `T`). Apply it as inline `backgroundColor` + `color` on the cell button so Session A looks the same everywhere.
- Keep the small `SPS` / `T` corner badge so you can still tell programme type at a glance, but the dominant colour comes from the session letter.
- Free-text slots (`Rest`, `Match`, `Off`) use the same map (`REST`, fallback for Match/Off) so a Rest day is always the same light grey.
- The collapsed Master schedule at the top uses the same cells, so colours match there too.

### 3. Connect the portal to `programming_weeks`

- Add a small loader in the portal (new hook `usePlayerProgrammingWeeks(playerId)`) that pulls from `programming_weeks` + joins session info via the same `useProgrammingSessions` ref lookup, returning an array of `{ id, label, week_start_date, slots: { monday: {key, title, type}, … } }`.
- **Portal Dashboard (`src/pages/Dashboard.tsx`)**: replace the `program.weekly_schedules` rendering block (around L3561–3640) with the unified weeks from the hook, rendered as the same week-by-week table with the shared `getSessionColor`. The "today" highlight and click-to-jump-to-session behaviour stays.
- **Portal Hub (`src/components/dashboard/Hub.tsx`)**: replace the "today's session" lookup (L449–466) to find the matching week in `programming_weeks` by `week_start_date` and read today's slot from there, again using the shared colour map.
- **Technical portal view (`src/components/portal/TechnicalProgramView.tsx`)**: add the same weekly table at the top of each technical programme, scoped to that programme's `linked_week_ids` so a player sees the technical schedule alongside the drills.
- Legacy `weekly_schedules` JSONB stays in the database untouched; the portal just stops reading it.

### 4. Click behaviour parity

- In the editor, clicking a coloured cell still opens `SessionQuickEditDialog` (existing behaviour).
- In the portal, clicking a coloured cell still jumps to that session in the programme view (existing Dashboard behaviour, just driven by the new data).

## Files touched

- New: `src/lib/sessionColors.ts`
- New: `src/hooks/usePlayerProgrammingWeeks.ts`
- Edit: `src/components/staff/programming/ProgrammingWeeksEditor.tsx` (colour cells by session key)
- Edit: `src/pages/Dashboard.tsx` (swap data source + shared colour helper)
- Edit: `src/components/dashboard/Hub.tsx` (swap data source + shared colour helper)
- Edit: `src/components/portal/TechnicalProgramView.tsx` (add weekly table)

No database changes — `programming_weeks` is already the source of truth from the previous migration.
