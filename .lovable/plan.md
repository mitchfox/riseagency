
Goal: fix Performance Report action inputs so (1) action type options are ordered by most used first, and (2) action description suggestions reliably appear as dropdown options for the selected action type.

What I found in the code
1. In `src/components/staff/CreatePerformanceReportDialog.tsx`, action type still uses native `<datalist>` (`list="action-types-list"` at both mobile and desktop rows).
2. `fetchActionTypes` currently does:
   - `.order("action_type")` (alphabetical),
   - no frequency sorting,
   - no normalisation,
   - and is affected by the default 1000-row fetch cap.
3. Description suggestions are keyed by exact `action_type` string (`descriptionsByType[action.action_type]`), so case/spacing mismatches prevent matches.
4. There is already a working pattern in `src/components/staff/PerformanceActionsDialog.tsx` that uses `Popover + Command` for action type selection and frequency sorting logic.
5. Current data confirms this mismatch risk:
   - multiple variants exist (for example `Applied pressure` and `Applied pressure  `),
   - total actions are >1000, so incomplete sampling can distort ordering and suggestions.

Implementation plan

1) Rebuild action-type/source data loading in `CreatePerformanceReportDialog.tsx`
- Replace current `fetchActionTypes` logic with a normalised frequency builder.
- Load enough rows to avoid the 1000-row cap issue (paginated `.range(...)` loop until complete).
- Build:
  - `actionTypeFrequencyMap` keyed by canonical action type,
  - `descriptionsByType` keyed by canonical action type, with descriptions sorted by usage frequency.
- Canonical format:
  - trim,
  - collapse duplicate spaces,
  - title-case via existing `toTitleCase`,
  - preserve punctuation like commas.

2) Replace native datalist for action type with a proper combobox dropdown
- Remove `<datalist id="action-types-list">`.
- For both mobile and desktop action rows, replace action type `<Input list=...>` with `Popover + Command` pattern.
- Sort options by most-used first, then alphabetically for ties.
- Keep “type a new action type” behaviour by allowing free text from search input when no match exists.

3) Make action description suggestions robust and always visible as a dropdown workflow
- Use canonical key lookup so suggestions appear even if user typed case/spacing variants.
- Replace current fragile conditional display with a consistent suggestions dropdown interaction:
  - desktop: popover suggestions linked to the description field,
  - mobile: same dropdown pattern (not hidden behind collapsible-only behaviour).
- Filter suggestions live by current description text.
- Show clear empty state when no historic descriptions exist for chosen type.

4) Normalise values on update/save to prevent future drift
- In action updates for `action_type`, store canonical form immediately.
- On save (`actionsToInsert` mapping), trim `action_description` and `notes`, and persist canonical `action_type`.
- This prevents future duplicates that break ordering and suggestion matching.

5) Keep refresh behaviour correct
- After successful save/update, refresh action type + description cache (`fetchActionTypes`) so newly entered types/descriptions are available without reopening the screen.

6) Regression checks in Athlete Centre flow
- Verify in `Athlete Centre > Match Flow > Performance Reports`:
  - Action Type dropdown starts with top-used types (for example `Pass`, `Applied pressure`, `Defensive positioning`),
  - Description dropdown shows historic options for selected type,
  - Selecting a suggestion populates description correctly,
  - Existing report editing, action reordering, clip upload, and save still work.

Technical details
- Files to change:
  - `src/components/staff/CreatePerformanceReportDialog.tsx` (primary and likely only file needed).
- Reused UI components:
  - `Popover`, `PopoverTrigger`, `PopoverContent`,
  - `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`.
- Reused util:
  - `toTitleCase` from `src/lib/titleCase.ts`.
- No database migration required for this fix.
- No backend function changes required for this fix.
