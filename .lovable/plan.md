I’ll fix the Club Outreach settings so per-player customisation actually exists as a complete editable panel, not just partial defaults.

Plan:
1. Expand the per-player section in Club Outreach Settings into a clear selected-player editor matching the fields staff expect:
   - Stars page URL override
   - Full season highlights URL
   - Default fit / recommendation
   - Default position
   - Default season data mode: popup or Stars link
   - Default season to show from that player’s existing seasons
   - Default video selection where possible
   - Proof of Representation PDF
2. Load all of those saved values when a player is selected, including the new season/mode/position/video defaults that currently exist in the data layer but are not properly exposed in the settings UI.
3. Save all per-player defaults in one “Save defaults” action so changes persist and are applied when that player is added to a new outreach.
4. Keep the proposal creation/edit dialog behaviour aligned with the settings defaults:
   - first player in a new outreach gets their per-player defaults
   - global defaults only fill gaps
   - existing outreach-specific choices are not overwritten when editing.
5. Keep the proof card hidden on public proposals when no proof URL exists, and do not touch unrelated report/data logic.

Technical notes:
- Main file: `src/components/staff/ClubOutreachManager.tsx`.
- Existing columns already support most of this: `default_position`, `default_fit_recommendation`, `default_season_data_mode`, `default_season_id`, `default_selected_video_ids`, URL fields and proof path.
- No schema change should be needed unless I find a missing field during implementation.