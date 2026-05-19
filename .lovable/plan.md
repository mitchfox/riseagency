Implement the missing team-report Option B workflow and fix the fullscreen action-type dropdown.

1. Team report Option A vs Option B
- Keep Option A as the existing full report editor: standard action rows with one score per action, plus simple involved-player tagging.
- Rebuild Option B as the default team-report writing mode, not just a small extra panel:
  - A compact action-by-action layout focused on team actions.
  - Roster chips/buttons shown directly on each action for fast involved-player selection.
  - Minute input remains a flywheel with 5-second intervals only.
  - New actions inherit the previous action’s minute as the starting point.
  - Score entered once on the action is credited to every selected player by default.
  - Add a clear “different scores” control that expands per-player score inputs only when needed.
  - Keep the roster in a collapsible section at the top with number and optional name.
  - Keep scouting report toggle available for team reports.

2. Flywheel time behaviour
- Ensure all performance-report action minute fields use the flywheel, including team Option B.
- Desktop: wheel up/down on the minute adjusts by 5 seconds.
- Mobile: vertical scroll/drag on the minute adjusts by 5 seconds.
- Preserve click-to-edit and mm.ss formatting.

3. Save and display structure
- Persist involved players and per-player override scores in the existing `involved_players` action data.
- Keep `team_scoring_method` as the saved mode so reopening the report restores the correct editor.
- Avoid fixture, minutes played, fixture stats and additional player stats for team reports.

4. Fullscreen action-type dropdown
- Fix the fullscreen quick-tag action-type control so clicking it actually opens while in fullscreen.
- The likely issue is the popover being portalled outside the fullscreen element or the video click overlay intercepting it.
- Make the overlay control explicitly interactive above the video layer, stop pointer events properly, and render the popover within the fullscreen overlay context instead of somewhere the browser fullscreen mode blocks.
- Keep hotkeys intact: `a` opens action type, `s` focuses score, `n` focuses coach’s note, `Tab` cycles fields, and existing video-analysis hotkeys remain while typing is protected.