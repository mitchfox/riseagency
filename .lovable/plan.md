## Changes

**1. Collapse Quick Filters card**
In `src/components/staff/PlayerDatabase.tsx`, wrap the Quick Filters card (Missing Info toggles, Age Group, Nationality, Birth Month, DOB range, Min Fit, Position list) in a collapsed-by-default section. Header stays visible with a chevron + active-filter count badge; body only mounts when expanded so filter widgets don't cost render time on page load.

**2. Speed up player dialog open**
Current lag comes from the dialog eagerly rendering the full player detail (scouting reports, fit calc, tabs, images) as soon as a row is clicked.

- Split the dialog into a lightweight shell (name, club, DOB, position, action buttons) that renders instantly, and lazy-load the heavy detail panels (`React.lazy` + `Suspense`) so scouting reports / video / stats fetch after the shell paints.
- Defer Supabase fetches for related data (reports, media) until after the dialog is visible using `requestIdleCallback` / `useEffect` with a microtask, instead of blocking the open.
- Memoise derived data (fit score, filtered reports) with `useMemo` keyed on player id to avoid recompute on every keystroke elsewhere.

**3. Speed up Edit mode**
Edit currently re-mounts a large form with many controlled inputs and dropdowns populated from full option lists.

- Switch Edit into the same dialog shell (no unmount/remount) — toggle a local `isEditing` flag and swap only the fields section.
- Convert heavy `<Select>` option lists (clubs, leagues, nationalities) to virtualised or on-demand fetched pickers so the edit form doesn't build thousands of `<option>` nodes on open.
- Use uncontrolled inputs with `defaultValue` + refs (matching existing data-entry pattern) so typing doesn't rerender the whole form.

## Out of scope
No changes to filter logic, player data model, or edit save behaviour — purely collapse UI + render/perf optimisations.
