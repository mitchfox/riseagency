

## Fix: Match Statistics Not Loading/Persisting on Edit

### Problem
When editing a performance report, saved match statistics (unified stats) are wiped immediately after loading. The root cause is a `useEffect` (line 544) that syncs unified stats from action `recorded_stat` fields. It runs whenever `actions` or `minutesPlayed` change, which happens right after `fetchExistingData` populates the form. Since most actions don't have `recorded_stat` data, this effect rebuilds `unifiedStats` as near-empty and discards the loaded values.

### Solution

**File: `src/components/staff/CreatePerformanceReportDialog.tsx`**

1. **Add a loading guard** to the action-sync `useEffect` (line 544). Skip the sync while `fetchExistingData` is still running (use the existing `loadingData` state) and also skip it during initial edit-mode load by tracking whether the initial data has been loaded.

2. **Add a ref** like `initialLoadCompleteRef` that starts `false` and is set to `true` at the end of `fetchExistingData`. The action-sync effect should only run when this ref is `true` (or when not in edit mode).

3. **Preserve manual stats during sync**: When the effect does run, it should merge with existing manual stats rather than replacing them. The current logic (lines 590-594) only keeps stats where `!stat.isFromActions` — but loaded stats from the database also have `isFromActions: false`, so they should survive. The issue is that the effect runs before the loaded stats are set, so `prevStats` is still empty.

The fix ensures the effect doesn't fire during the initial data load window, preventing the race condition.

### Changes

- **`CreatePerformanceReportDialog.tsx`**: 
  - Add `initialLoadDoneRef = useRef(false)` 
  - Set it to `true` at end of `fetchExistingData`
  - Reset to `false` in `resetForm`
  - Guard the action-sync `useEffect` with `if (!initialLoadDoneRef.current && isEditMode) return;`

