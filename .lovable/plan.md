Audit result: not complete. Several previous changes were partial, and the largest staff/player features were not built.

What is confirmed working or mostly working:
- `/spq` route exists and loads the public SPQ test.
- Public SPQ intro now explains mental profiling and comparison to professional players.
- Public SPQ no longer shows Positive/Negative or numeric 0-4 beside statements.
- Mobile SPQ answer buttons call `scrollIntoView({ block: 'center' })` for the next statement.
- SPQ saved report uses `MarkdownContent` in the shared report page and staff preview.
- Shared SPQ visuals are stacked full width.
- Page transition wrapper uses `ShaderAnimation`, and route Suspense fallbacks are `null`.
- Stars profile mobile video selector chips are now directly below the video.
- Biography image/text now stack on mobile.
- Read action report and season report dialogs have mobile top padding.

What is missing or failed:
- No `player_hudl_visibility` table exists.
- No `player_form_config` table exists.
- Staff Edit Player has no Hudl Reports tab.
- Staff Edit Player has no Form tab.
- Stars profile does not read or render any saved Form stat banner.
- Stars profile still auto-generates Hudl category chips from top action scores, not staff-selected playlist visibility/order.
- Playlist management has up/down/hash controls, not the requested drag-handle reorder in the Hudl Reports tab.
- SPQ submissions staff tab shows raw sten `/10` values when expanded, not the ordinal out-of-100 display used elsewhere.
- SPQ public results have a desktop-style grid that can overflow on mobile.
- SPQ public results do not include a save/download report action.
- Performance report stats auto-add is mostly removed in create mode, but the code still contains an unused previous-report stat prefill function and action-recorded stats can still automatically populate unified stats.
- Shader audit found unrelated page-level loading text such as `Loading player...` and button `...`, so the transition work was not a full audit.
- Stars main mobile spacing is still visually tall due to hero/action card blocks, even though padding was reduced.

Plan to complete everything:

1. Backend tables for staff-controlled Stars display
- Add `player_hudl_visibility` with player, playlist, optional clip id/url, visible, sort order and metadata.
- Add `player_form_config` with player, selected window and selected stats JSON.
- Add safe access rules: staff can manage, public can read only the display config needed by Stars pages.

2. Staff Edit Player: Hudl Reports tab
- Add a new tab in the existing Edit Player dialog.
- Load that player's playlists from `playlists`.
- Show every playlist with a “Visible on Stars page” toggle.
- Show each clip under the playlist with visibility, action score where it can be matched, and drag-handle reorder using dnd-kit.
- Save visibility/order to `player_hudl_visibility`.

3. Staff Edit Player: Form tab
- Add a new tab in the Edit Player dialog.
- Let staff choose stat window: last 5 or last 10.
- Let staff choose display stats from the requested list: Goals, Passes/game, Pass %, Dribbles/game, Dribble %, plus existing available fixture/player stats where present.
- Save to `player_form_config`.

4. Stars profile rendering
- Fetch `player_form_config` for the profile player.
- Render a slim, horizontally scrollable form banner between the player info block and main video.
- Fetch `player_hudl_visibility` and use it to determine which Hudl playlists/clips appear on the public Stars page.
- Stop showing auto-generated Hudl chips when staff visibility config exists. Fall back only if there is no config, so current pages do not go blank before staff config is set.

5. SPQ completion fixes
- Make public SPQ result rows responsive on mobile so no grid overflow occurs.
- Add a “Save report” button at the end of `/spq` results that downloads or saves a visual/text report for the user.
- Update staff SPQ Submissions expanded results to show ordinal rank out of 100, not raw sten `/10`.
- Reuse the same `stenToRankOf100` helper for consistency.

6. Performance report stat auto-add cleanup
- Remove the unused `fetchPreviousReportStats` function so it cannot be accidentally called later.
- Adjust action-recorded stat sync so recorded action stats only update stats already selected by staff, instead of adding new stats automatically.
- Keep per-90 calculations for stats staff manually selected, because those are real calculations from entered values.

7. Mobile polish and transition audit
- Shorten Stars mobile hero/action area so cards appear sooner.
- Ensure long Highlighted Performance labels use a mobile label map and do not overflow.
- Replace route-change visible loading text/dot fallbacks in the audited public pages with blank or shader-compatible states where appropriate, without removing meaningful in-page loading states for forms/buttons.

8. Verification
- Query the database to confirm both new tables exist.
- Check `/spq` mobile for no numeric scoring labels and no result overflow.
- Check `/stars/tyrese-omotoye` mobile for compact top layout, form banner location when configured, Hudl chips below video, no metric overflow, and closeable report dialogs.
- Check Staff Player Management edit dialog has the new Hudl Reports and Form tabs.