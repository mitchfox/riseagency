## Plan

### 1. Make the First Half toggle actually control ordering
- Replace the local action-sorting logic in the performance report editor with the shared chronological sorter so edit mode and published/shared report views use the same rules.
- Extend the action type editor data model to include `is_first_half` so the toggle state is not lost when actions are edited in that modal.
- Add the H1 toggle beside the minute input inside the action type editor, not only on the main action list, so it works wherever the action is being edited.
- Fix sorting so any action marked first half sorts before second-half actions in the 45.00 to 51.00 overlap window, even if its raw time is numerically higher than an early second-half time.
- Keep the `action_number` renumbering after sorting so every displayed list, clip list, flow chart and shared report follows the corrected order.

### 2. Treat blank raw stats as 0, but keep blank percentages excluded
- Update the central stat aggregation helper so:
  - percentage metrics still exclude blank/null values
  - non-percentage/raw metrics count blank/null as 0 across the selected fixture window
  - explicit `0` remains valid everywhere
- Make `getStatValue` return the right value based on metric type so tables and averages stop dropping blank raw stats.
- Update inline comments to match the intended rule, as the current comment says raw blanks are 0 but the code currently excludes them.

### 3. Apply the same stat rule to comparison views
- Update portal comparison charts, radar, percentile views and transfer report comparisons so missing comparison-player raw metrics are treated as 0, while missing percentage metrics stay excluded.
- Update the quick stats comparison card to use the central stat aggregation rules instead of its own local lookup.
- Keep percentage display and percentage averaging unchanged where no attempts were recorded.

### 4. Verify the affected flows
- Run targeted checks for the sorting helper and stat aggregation helper.
- Confirm the code paths that fetch `is_first_half` also pass it into every chronological display that relies on shared sorting.
- Confirm no database migration is needed because the `is_first_half` column already exists.