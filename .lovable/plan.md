I will fix the two concrete breaks now:

1. Separate Form and Hudl tabs again
- Remove the `forceMount` behaviour that is currently making Hudl Reports render inside the Form tab.
- Keep the previous “do not overwrite inactive tabs” protection by only saving tab configs when that tab has actually been changed.

2. Fix Hudl visibility on Stars
- Change the Stars page Hudl reader so visibility is category-specific, not global per video URL.
- A clip hidden in one action-type group will no longer hide the same clip from a visible group such as Best Actions.
- Preserve the saved category order and clip order from Edit Player.

3. Keep Form connected only to the Form tab
- Leave the Form banner reading only `player_form_config`.
- Preserve manual values, selected stats and ordering.
- Keep Passes /90 available using real match data only.

4. Verify Tyrese end to end
- Check the saved database rows for Tyrese.
- Open `/stars/tyrese-omotoye` and confirm the Form banner shows Form stats only.
- Confirm Hudl action buttons appear below the main video when visible Hudl categories/clips exist.