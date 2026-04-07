
1. Fix the goalkeeper issue first, from the end of the flow backwards
- In `CreatePerformanceReportDialog.tsx`, pass `playerPosition={playerPosition}` into `FixtureStatsEditor`. Right now the editor is rendered without it, so it falls back to outfield categories.
- Keep the existing position-aware helpers in `ComparisonPlayerData.tsx` and use that single source of truth everywhere fixture stat categories are chosen.
- Verify the same position is used when loading existing reports and when opening score/action edit from a report, so GK logic is not lost on refresh.
- Expected result: Matthias Pieklak’s performance report editor shows GK fixture stats immediately, not outfield ones.

2. Fix the actual missing-data side of keeper comparisons
- The database check shows Matthias is stored as `GK`, but his latest `player_analysis.fixture_stats` is null, so even correct GK UI will still show no comparison values until data exists.
- Make the UI correctly show GK metrics and also improve empty-state messaging so it is obvious whether the problem is “wrong stat set” or “no fixture stats entered yet”.
- Ensure portal comparisons and staff player-data views both read GK fixture keys from `fixture_stats` first, matching the existing consistency rule.

3. Fix score edit so it stops throwing you out and losing a score
- In `ScoreEditMode.tsx`, remove the dependency on parent refresh during normal page-to-page scoring.
- Right now `CreatePerformanceReportDialog` passes `onSave={() => fetchExistingData()}` and `ActionReportsList` passes `onSave={() => fetchReports()}`. Those refreshes are the likely reason the overlay reopens and state drops.
- Split behaviour into:
  - silent background persistence for each score input
  - local auto-advance after 4 scores are completed
  - manual “Update report” action for parent refresh only when explicitly clicked
  - close action that refreshes once at exit if needed
- Keep `pendingWriteCount`, but harden auto-advance so it only advances after all 4 saves settle successfully.

4. Make minus-entry work consistently everywhere
- Keep the existing `-` interception in `ScoreDropdown.tsx`.
- Apply the same normalised minus-prefix behaviour to every direct score input that is not using `ScoreDropdown`, especially the `Input` in `ScoreEditMode.tsx`.
- Ensure pressing `-` always prepends/remains at the start, regardless of cursor position or current value.

5. Rebuild transfer report logic around real configuration instead of placeholders
- `TransferReportView.tsx` is still ignoring `content_config`, using hardcoded defaults, and still reading `r90_average` in Recent Form.
- Update it to:
  - read `report.content_config`
  - respect per-section visibility and options
  - use `r90_score` for grades and displayed score values
  - render configured comparison players instead of `comparisonPlayers.slice(0, 3)`
  - render configured graphics selections rather than only automatic standout bars
- This is the main reason sections appear toggled on in staff but do not appear properly on the live report.

6. Bring the transfer report visuals into line with what you asked for
- Replace the current basic highlights/video block with the same player style and control pattern used on the stars profile player.
- Switch all gold text styling to the project’s Rise gold tokens instead of the current hardcoded yellow-like values.
- Use black marble only as an accent in smaller areas and keep the main background dark black.
- Make Biography, Recent Form and similar sections support shortened preview plus expand.
- Replace Tactical History cards with the existing `FormationDisplay`-based scheme presentation so it matches the stars profile format.

7. Build the missing transfer report features that are still effectively absent
- Add proper `contract_info` and `physical_profile` rendering in `TransferReportView.tsx` since those cases do not exist at all now.
- Add the exclusive representation banner directly under the hero header.
- Build actual data graphics/visualisations from player fixture stats versus comparison data rather than a single simple bar list.
- Build real comparison controls in the editor so you can choose exactly which players are compared for each category/section.

8. Expand the transfer report editor so it actually controls the report
- Extend `TransferReportEditor.tsx` beyond section toggles and notes.
- Add per-section controls into `content_config`, such as:
  - chosen comparison players by category
  - chosen graphics/cards to include
  - visible fields inside physical profile and contract info
  - whether a section is collapsed by default
  - custom section titles if needed
- Keep drag-and-drop ordering, but make the saved order and options drive the public view fully.

9. Rework staff accountability to the level you described
- Keep the 5 fixed core staff columns visible together, but tighten layout so all fit cleanly without horizontal scrolling.
- Separate task types more clearly: recurring, one-off, overdue, active, done today.
- Expand task creation with much more detail: category, recurrence cadence, richer description, deadline, task type and optional notes.
- Add autofill helpers pulling likely tasks from existing staff areas where obvious, but as suggestions not hardcoded replacements.

10. Fix reminders and add staff customisation properly
- Move reminders from person-level to task-level for incomplete tasks only.
- Add profile image upload and header colour per staff member, likely stored against profile metadata or dedicated profile fields.
- Highlight the logged-in user with the stronger Rise gold border as requested.

11. Fix the default staff landing behaviour cleanly
- In `Staff.tsx`, keep `overview` above `dashboard` and make it the true default for most roles.
- Preserve the special-case Trusted Network routing.
- Prevent any flash to the wrong section by deriving the initial section only after role permissions and role-specific defaults are resolved.

Technical details
- Confirmed root cause for Pieklak: `CreatePerformanceReportDialog.tsx` renders `FixtureStatsEditor` without `playerPosition`, so the editor defaults to outfield metrics.
- Confirmed data state: Matthias Pieklak exists as `position = 'GK'`, but his latest `player_analysis.fixture_stats` is null, so comparisons also need real data handling and clearer empty states.
- Confirmed score edit root cause: parent refresh callbacks are still wired into `ScoreEditMode`, which can force re-fetch/reopen behaviour during editing.
- Confirmed transfer report gaps:
  - `TransferReportView.tsx` still uses `r90_average`
  - `content_config` is not used
  - `contract_info` and `physical_profile` are not rendered
  - video player is a plain `<video>` block, not the stars-profile style player
- Confirmed staff accountability gaps:
  - reminders are person-level, not task-level
  - profile image/header colour support is absent
  - the board is still too shallow in task structure for recurring operational work

Implementation order I would use
1. Score edit stability and save-loss bug
2. GK fixture stats wiring and GK comparison empty-state clarity
3. Transfer report data/rendering correctness
4. Transfer report editor controls and visuals
5. Staff accountability rebuild and routing polish
