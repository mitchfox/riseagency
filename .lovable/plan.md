## Plan: capacity saves and totals

### What I’ll fix
1. **Stop reloads from losing new tasks**
   - When adding a Youth Player, Pro Player, or Ongoing Task allocation, the UI will insert the saved row returned by the backend into local state immediately.
   - Reload will show the same rows because the backend save will return the real stored row, including its id, hours, days, and assigned staff.

2. **Stop staff limits resetting to 0**
   - Staff weekly limits will be treated as their own persistent setting and never recalculated from task assignments.
   - Adding or editing a task will not overwrite `staff_weekly_limits`.
   - “All staff” weekly limit will be the sum of every individual staff member’s saved weekly limit.

3. **Fix broken assignment logic**
   - New tasks added in a staff view will assign all task hours to that staff member.
   - New tasks added in All Staff will keep the task total and distribute it only for contribution display, without touching weekly limits.
   - Existing tasks with missing `assigned_staff` will be displayed safely, but the loader will not fake assignments that look saved and then disappear.

4. **Keep player capacity based on firm totals**
   - Youth player capacity and Pro player capacity will always use combined firm-wide totals.
   - The bars will still respect the current staff filter for individual workload views.

5. **Make save feedback reliable**
   - Each save path will update local state optimistically and only roll back if the backend returns an error.
   - I’ll avoid parent portal refreshes for capacity edits, so the capacity component does not remount and wipe draft state.

### Technical details
- Update `CapacityPlanner.tsx` so `call()` can return the saved backend row and no longer blindly reloads after every capacity edit.
- Update add/edit/delete handlers to mutate `allocations` and `settings` locally after successful saves.
- Adjust `load()` so empty `assigned_staff` stays empty unless a task is being actively edited or created.
- Update `supabase/functions/investor-overview-write/index.ts` so capacity allocation saves return the inserted or updated row, and settings saves return the saved settings row.
- After implementation, verify by checking the database rows for capacity settings and allocations, and by confirming the recent saved rows survive reload logic.