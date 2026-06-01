## Plan

Rebuild the **My Schedule** staff calendar as a 3-day planner instead of the current cramped 7-day week view.

### What will change

1. **Replace the 7-day layout with a 3-day window**
   - Show 3 wider day columns at a time.
   - Previous/next buttons move by 3 days.
   - Add a clear **Today** button.
   - Keep My Tasks rail available, but stop it from squeezing the calendar too aggressively.

2. **Make scrolling actually work**
   - Put the calendar body in its own fixed-height scroll area.
   - Allow vertical scrolling from early morning to late night.
   - Allow horizontal scrolling on small screens if the 3-day layout is wider than the viewport.
   - Stop parent containers from trapping the scroll.

3. **Click empty calendar space to add a task**
   - Remove the awkward “Quick add then click a day” input workflow.
   - Clicking an empty time slot opens a wide task popup.
   - The popup will be prefilled with the clicked date and nearest 15-minute time.
   - Saving creates the task directly.

4. **Fix task sizing and positioning**
   - Use a full 24-hour coordinate system, not the current 9am-9pm clamp.
   - Position cards by exact start and end time.
   - Make short tasks readable without breaking their actual time placement.
   - Prevent cards from visually overflowing out of their day column.

5. **Make drag and drop reliable**
   - Replace HTML drag/drop with pointer-based movement inside the calendar.
   - Drag tasks up/down to change time.
   - Drag left/right into another visible day.
   - Snap to 15-minute increments.
   - Preserve task duration when moving.

6. **Handle overlapping tasks properly**
   - If tasks overlap, show a compact **N+ tasks** block at that time.
   - Clicking it opens a wide popover/dialog showing all overlapping tasks.
   - Each task can still be opened for editing.

7. **Improve the visual design**
   - Give the planner a richer dark staff-portal look with Rise Gold accents.
   - Add stronger time rulers, current-time marker, current-day highlight, better task cards and clearer empty-slot affordances.
   - Keep semantic theme tokens where possible and avoid hard-coded one-off colours.

### Files likely to change

- `src/components/staff/MyPersonalScheduleBoard.tsx`
- `src/components/staff/TaskDetailDialog.tsx`

### Technical notes

- The existing database table can stay as-is.
- The edit dialog can be reused for both creating and editing by allowing a draft item before insert.
- Schedule items will use exact `scheduled_date`, `start_time` and `end_time` values already stored in Lovable Cloud.
- No backend migration should be needed.