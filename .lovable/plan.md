Plan:

1. **Fix the immediate Tyrone issue**
   - Correct the Technical Schedule loader so it reads Tyrone Omotoye’s existing SPS programme from `player_programs` without querying fields that do not exist.
   - The Technical tab will show the same week that SPS shows: Monday A, Tuesday D, Wednesday B, Friday C, Thursday E, Saturday F for the current Base Phase.

2. **Create one shared schedule component**
   - Extract the SPS weekly schedule UI into a reusable shared component.
   - Use that exact component in both Strength, Power and Speed and Technical.
   - Same controls, same week layout, same add week, remove week, date, team session, fixture, logo and notes behaviour.

3. **Make `player_programs.weekly_schedules` the single source of truth**
   - All week and day edits from either SPS or Technical will update the same `player_programs.weekly_schedules` value.
   - Technical will no longer keep or display a separate `technical_programs.weekly_schedules` schedule.
   - The old Technical schedule empty state will only show if the player genuinely has no SPS/shared programme weeks.

4. **Link Technical sessions to the shared schedule slots**
   - Technical sessions will no longer be independent letters that can clash with SPS.
   - Each shared day slot can hold one individual assignment only: SPS session, Technical session, Rest, Match or blank.
   - If Monday is already SPS A, Technical cannot also assign Technical A to Monday. It must edit that same Monday slot or choose another free slot.

5. **Add clear slot ownership in the schedule UI**
   - Schedule day cells will show whether the slot is SPS or Technical.
   - From Technical, SPS-owned slots are visible but protected unless changing the shared slot intentionally.
   - From SPS, Technical-owned slots are visible so the coach cannot accidentally double-book the day.

6. **Keep existing player portal display working**
   - Existing SPS schedule strings will still render correctly for players.
   - The portal will understand new shared slot metadata where present, while remaining compatible with older weeks.

Technical details:
- Reuse the existing SPS week shape for backwards compatibility, but add normalised per-day metadata in each week when a slot is assigned from Technical.
- Update `TechnicalScheduleTab.tsx` to load the current player’s `player_programs` rows correctly and use the shared schedule editor.
- Update `ProgrammingManagement.tsx` so the SPS schedule editor is the same shared editor, not a separate implementation.
- Update `TechnicalProgramEditor.tsx` so technical sessions can be assigned through the shared schedule instead of existing as unlinked, clash-prone labels.
- No backend schema change is required unless the existing JSON structure proves too restrictive during implementation; if it does, I will use a migration before code changes.