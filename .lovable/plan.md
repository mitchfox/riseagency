I’ll fix this by making the Technical Schedule tab read and edit the current SPS programme schedule directly, instead of keeping its own separate technical weekly schedule.

Plan:
1. Replace the current Technical Schedule tab UI with the same SPS weekly schedule controls and layout used in Strength, Power & Speed.
2. Load the selected player’s current SPS programme from `player_programs`, including `weekly_schedules`.
3. Make every schedule edit in Technical update `player_programs.weekly_schedules`, so edits from Technical and SPS affect the same data.
4. Keep technical programme/session management separate, but remove the misleading “No weeks scheduled yet” state when SPS weeks exist.
5. Add a clear empty state only when the player genuinely has no SPS programme/schedule yet.

Technical detail:
- `TechnicalScheduleTab.tsx` will stop saving schedule rows to `technical_programs.weekly_schedules`.
- It will use `player_programs` as the single source of truth for the shared schedule.
- The existing database clash logic becomes irrelevant for this screen because we will not be maintaining two separate schedules for the same days.