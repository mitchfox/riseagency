I found the likely break point: the per-staff weekly limit input saves, then `call()` immediately runs a full `load()` which sets `loading=true`. That can blank/remount the capacity section after every blur, making it feel like the page breaks and causing input instability. I’ll also tighten the backend payload so the new `staff_weekly_limits` field never sends unsafe/undefined values.

Plan:
1. Change capacity saves to update local state optimistically and refresh silently, not flip the whole component into its loading state after each save.
2. Add a dedicated `saveStaffWeeklyLimit(staffId, hours)` handler that updates `settings.staff_weekly_limits` immediately, recalculates the combined total in place and only calls the existing `investor-overview-write` function once.
3. Keep `All staff` read-only and derived from the sum of individual limits. Individual staff views will show and save only that person’s weekly limit.
4. Make allocation hour edits stable in the same way: save via the existing edge function, update the changed allocation locally, and avoid full reload/remount after blur.
5. Add defensive backend handling in `investor-overview-write` so `staff_weekly_limits` only merges plain numeric entries and cannot fail on malformed input.
6. Verify the capacity save path by checking the relevant network/console signals after implementation.