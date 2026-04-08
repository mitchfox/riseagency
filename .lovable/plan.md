
## Fix: Score Edit stability, zero-score handling, and data tab persistence

### Problems identified

**1. Runtime crash: "Cannot access 'pageActions' before initialization"**
`pageActions` is a plain `const` derived inline (line 197). Several `useEffect` hooks reference it in their dependency arrays, creating new array references every render. While the declaration order looks correct, the transpiled output may cause a TDZ issue. Fix: wrap `pageActions` in `useMemo` to stabilise the reference and guarantee initialisation order.

**2. Score "0" or "0.00" treated as empty**
Multiple places use `a.action_score && ...` which is falsy for numeric `0`. The DB column may return numeric `0` rather than string `"0"`.
- Line 199: `scoredCount` filter — `a.action_score && a.action_score !== ""` → numeric 0 fails
- Line 265: `handleUpdateReport` filter — `a.action_score` → numeric 0 excluded from save
- Line 297: auto-advance check — `a.action_score && a.action_score !== ""` → never auto-advances
- Line 529: display — `action.action_score || ""` → shows empty for numeric 0

Fix: change all checks to `a.action_score != null && String(a.action_score) !== ""`. Coerce to string consistently.

**3. Auto-advance / save resets page index**
The `onSave` callback is correctly empty, but the `onClose` handler calls `fetchExistingData()` which re-renders the parent. If a save triggers `onClose` instead of `onSave` (e.g. via keyboard shortcut or the Update button flow), the component remounts and `pageIndex` resets to 0. Ensure `handleUpdateReport` never calls `onClose`.

**4. Data tab resets to home screen**
`CoachingDataSection` is conditionally rendered via `{expandedSection === 'coachingdata' && <CoachingDataSection />}`. Switching to another tab unmounts it, losing `inlineReport` state. Fix: persist `inlineReport` to localStorage (using the existing session persistence pattern) and restore on mount.

### Changes

**File 1: `src/components/staff/analysis/ScoreEditMode.tsx`**
- Wrap `pageActions` in `useMemo(() => actions.slice(pageIndex * 4, pageIndex * 4 + 4), [actions, pageIndex])`
- Change `scoredCount` filter to `a.action_score != null && String(a.action_score) !== ""`
- Change `handleUpdateReport` filter to `a.action_score != null && String(a.action_score) !== ""`
- Change auto-advance check to same pattern
- Change score display from `action.action_score || ""` to `action.action_score != null ? String(action.action_score) : ""`

**File 2: `src/components/staff/CoachingDataSection.tsx`**
- On `inlineReport` change, persist to `localStorage` key `coachingdata_inline_report`
- On mount, restore from that key
- On close/success, clear the key
- This ensures switching tabs and coming back preserves the open report
