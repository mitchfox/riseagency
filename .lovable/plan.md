## Root cause

When you add a category or item on Priorities / Time Management, the write succeeds but the follow-up reload is silently dropped, so nothing appears.

In `src/pages/InvestorsPortal.tsx` the `refresh()` function has this guard:

```
if (refreshInFlightRef.current) return; // collapse duplicate concurrent calls
```

`OpsBoard.createCategory` calls `onRefresh()` immediately after the write. The initial portal-load refresh is often still in flight, so the post-save refresh is dropped entirely. The new row exists in the DB but the UI never re-fetches it. Editing items has the same problem — the save works but the page state never updates, so it looks like "editing didn't save".

The DB confirms it (`investor_priority_categories` is empty after your attempt — meaning either the refresh was dropped, OR the write itself failed with a generic `"Edge Function returned a non-2xx status code"` and was swallowed). Both paths need fixing.

Also: `OpsBoard` only shows a toast on error, never on success, so there's no feedback when things do save.

## Plan

### 1. Fix the refresh-dropping bug (`src/pages/InvestorsPortal.tsx`)
Replace the "drop if in flight" guard with a "queue one more refresh" pattern, so a write-triggered refresh after the initial load always runs:

- Keep `refreshInFlightRef` but instead of `return`, set a `refreshPendingRef = true`.
- In the `finally` block, if `refreshPendingRef` is true, clear it and call `refresh()` again.
- This guarantees the user-triggered refresh after `createCategory` / `upsertOpsItem` / `deleteOpsItem` / `reorderOpsItems` actually runs.

### 2. Surface real edge function errors (`src/components/investor/OpsBoard.tsx`)
Swap the raw `supabase.functions.invoke` call inside `callWrite` for the existing `invokeEdgeFunction` helper from `src/lib/edgeFunctionHelper.ts`. That helper unwraps `FunctionsHttpError` and returns the real message (e.g. "Unauthorized", RLS errors) instead of "Edge Function returned a non-2xx status code".

### 3. Add success toasts (`src/components/investor/OpsBoard.tsx`)
Add `toast.success(...)` after each successful write so the user gets confirmation:
- `createCategory` → `toast.success("Category added")`
- Category rename → `toast.success("Category renamed")`
- Category delete → `toast.success("Category deleted")`
- Item save (new) → `toast.success("Task added")`
- Item save (edit) → `toast.success("Task updated")` (distinguish via `item?.id` presence)
- Item delete → `toast.success("Task deleted")` (already exists, keep)
- Reorder → `toast.success("Reordered")`

### 4. Verify persistence across page refresh
Since the writes hit the DB via the edge function and `refresh()` re-fetches from `investor-data`, fixing #1 means edits persist visually immediately AND after a hard reload. No schema changes needed.

## Files touched

- `src/pages/InvestorsPortal.tsx` — refresh queue fix
- `src/components/investor/OpsBoard.tsx` — use `invokeEdgeFunction`, add success toasts

No DB migration, no edge function redeploy needed.