Priority order is fixed:

1. Page transitions first
2. Stat options and Stars form banner second
3. Hudl playlists/player last

Plan:

1. Fix page transitions before anything else
   - Replace `PageLoading` so it uses `ShaderAnimation` directly with the RISE logo overlay.
   - Use that shader loader for route `Suspense` fallback.
   - Replace the Stars profile loading state with the shader loader instead of text.
   - Replace the Stars main page loading state with the shader loader instead of `Loading players...`.
   - Remove the login button `...` loading text and use a proper loading icon/state.
   - Search afterwards for remaining route/page-level `...`, `Loading...`, and `Loading…` surfaces tied to navigation.

2. Fix stat options and the Stars form banner not showing
   - Keep the form banner exactly between the key info block and the video player on the Stars profile.
   - Change the banner so it does not disappear just because automatic data is missing.
   - Add manual stat mode in staff form config using the existing `player_form_config.stats` JSON field.
   - Let each stat be set to either:
     - automatic value from recent reports
     - manual value entered by staff
   - Keep drag ordering for the shown form stats.
   - Add missing stat options including passes per 90, progressive passes per 90, accurate passes per 90, forward passes per 90, passes into final third per 90, long balls/crosses, touches in box, npxG/xA/xG Chain, xT and the existing xC movement stats.
   - Preserve support for `0` and `0.00` manual values.
   - Render a dash only for an enabled automatic stat with no data, not hide the full banner.

3. Fix Hudl save failure and available playlist options
   - Migrate `player_hudl_visibility.playlist_id` away from forced UUID-only storage so staff can save named playlist/action-type groups without errors.
   - Fetch all available clipped video report actions for the player, not only the last 10 reports and not only the top 4 categories.
   - Exclude negative and zero R90/action-score clips from playlist options entirely.
   - Start every action-type group toggled off by default when there is no saved config.
   - When an action type is toggled on, automatically turn all clips in that action type on.
   - Still allow individual clips inside that enabled action type to be manually deselected.

4. Merge duplicated action-type groups
   - Normalise action type labels before grouping.
   - Merge variants that mean the same thing, including punctuation and spacing differences such as `flick-on` and `flick on`.
   - Apply the same normalisation on both staff configuration and Stars display so saved settings match what appears publicly.
   - Keep the visible label clean and title-cased.

5. Fix Stars Hudl display and mobile layout
   - Remove the public Stars cap that limits Hudl categories to 5.
   - Show only staff-enabled action-type groups and enabled clips.
   - On mobile, make playlist buttons wrap across multiple lines so all selected options are visible.
   - Keep category order and clip order from staff config.

6. Replace the Stars Hudl player
   - Reuse the existing staff-style `ClippedActionsPlayer` for Stars Hudl playlists.
   - Open the selected playlist with a full clip list, previous/next controls and easy skipping.
   - Pass the ordered visible clips into the player so it behaves like the staff video reports player.

7. Verify before completion
   - Query Tyrese’s positive clipped actions and merged action-type groups to confirm all valid options exist.
   - Confirm the Hudl visibility schema accepts saved action-type keys.
   - Search code for remaining page-transition ellipsis/loading fallbacks.
   - Confirm the Stars form banner render path handles manual values and missing automatic data.