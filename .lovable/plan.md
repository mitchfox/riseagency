I traced the actual staff Form and Hudl tabs against Tyrese Omotoye. The public Stars page is wired to read `player_form_config` and `player_hudl_visibility`, but Tyrese currently has no saved rows in either table despite 29 analyses and 484 positive video actions. So the issue is not the Stars page “choosing not to show” them. The staff edit tabs are not leaving saved configuration behind.

Plan:

1. Fix staff tab persistence first
- Make the Form and Hudl tabs save independently from the main edit profile form.
- Stop the parent “Save Changes” form/dialog from swallowing or clearing those tab saves.
- Add hard error handling so failed saves show the real database error and successful saves immediately re-read the row count before saying saved.

2. Make Form on Stars profile resilient
- Keep the Form banner tied to the Form tab config on player edit profile.
- Render the banner whenever selected stats exist, including manual values and automatic stats with missing data shown as a dash.
- Confirm it appears between the key info panel and the main video player on the public Stars profile.

3. Fix Hudl/video report visibility end-to-end
- Keep all positive R90 video report actions available in the Hudl tab.
- Keep merged action groups for spelling variants like “flick-on” and “flick on”.
- Save category rows and clip rows reliably, defaulting all groups off until toggled on.
- On Stars, only show saved visible groups/clips and preserve their staff-defined order.

4. Verify with Tyrese specifically
- Query Tyrese’s Form and Hudl config after saving path fixes.
- If there are still no rows because the earlier saves never persisted, seed the current intended visible config only where it is safe to do so from existing positive actions, then verify the Stars profile has both sections available.

Technical details:
- Files involved: `PlayerManagement.tsx`, `PlayerFormConfigTab.tsx`, `PlayerHudlVisibilityTab.tsx`, `PlayerFormBanner.tsx`, `PlayerDetail.tsx`.
- Database tables involved: `player_form_config`, `player_hudl_visibility`, `player_analysis`, `performance_report_actions`.
- No dummy data will be used. Only existing Tyrese player data and existing positive R90 video report actions will be read or shown.