## Issue

In Technical, the shared schedule is hidden behind a "Schedule" tab inside `TechnicalSection`, so it looks like nothing is there. In SPS the same editor renders directly under the timeline, which is why you can edit it from SPS but never see it from Technical. The data is shared — it's purely a UI placement issue.

## Fix

1. **`TechnicalSection.tsx`** — remove the `Tabs` wrapper. Render the page like SPS:
   - Timeline
   - `<ProgrammingWeeksEditor playerId={...} />` (always visible, same component SPS uses)
   - Technical Programmes list (current "Programmes" tab content, ungated)
   - Delete the now-unused `tab` state and `TabsList`/`TabsTrigger` imports.

2. **`TechnicalScheduleTab.tsx`** — keep as a thin wrapper for back-compat or delete it (it's only referenced from `TechnicalSection`). I'll delete it since nothing else imports it.

3. **Consistency check** — both sections will now show the identical `ProgrammingWeeksEditor` in the same spot, so a week added/edited in SPS appears instantly in Technical and vice versa (already wired through the shared `programming_weeks` table; this just makes it visible).

No schema changes, no behaviour changes to the editor itself — just surfacing it in Technical the same way SPS surfaces it.
