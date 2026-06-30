I found the problem: the button exists in the code, but it is inside the Player Database content area after the loading/data fetch path. If that section is still loading, scrolled, clipped, or hidden by the staff card layout, you will not see it. I will move the entry point to the staff page header itself so it is visible before the database table loads.

Plan:
1. Add a staff-level `Add players` state for the Player Database section in `Staff.tsx`.
2. Render a gold `Add players` button directly in the visible section header/breadcrumb area when `section=playerdatabase`, above the card that contains the database.
3. When clicked, show `PlayerAddMode` at the top staff level instead of relying on the nested database header.
4. Keep the existing internal buttons as fallback, but the new one will be impossible to miss in the currently visible header area.
5. Verify the route `/staff?section=playerdatabase` contains the visible gold button in the rendered DOM.