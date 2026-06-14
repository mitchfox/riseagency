## AI schedule import

Add an "AI import" button on the My Schedule board that lets a staff member paste text, upload an image, or take a camera photo of a schedule. AI extracts day, time, and event for each row, then bulk-adds them to a chosen staff member's `staff_personal_schedule_items`.

### UI (`MyPersonalScheduleBoard.tsx` header)
- New button "AI import" next to the existing prev/next/today controls.
- Opens a wide dialog (not narrow) with:
  1. **Target staff** dropdown (admins see all staff from `profiles` joined to `user_roles` admin/staff; non-admins are locked to themselves).
  2. Tabs: **Text**, **Upload image**, **Camera** (uses `<input type="file" accept="image/*" capture="environment">` on mobile).
  3. "Parse with AI" button → calls edge function.
  4. Preview table of parsed rows (date, start, end, title) with inline edit + per-row remove.
  5. "Add to schedule" button → bulk insert.

### Edge function `parse-schedule-ai`
- Lovable AI Gateway, model `google/gemini-3-flash-preview` (handles text + image).
- Input: `{ mode: "text" | "image", text?: string, imageBase64?: string, referenceDate: string }`.
- Uses `Output.object` schema:
  ```
  { items: [{ date: "YYYY-MM-DD", start_time: "HH:MM", end_time: "HH:MM", title: string }] }
  ```
- System prompt: UK English, interpret day names relative to `referenceDate` (next occurrence), default 1-hour duration when only a start time is given, omit rows missing a time, keep `title` concise.
- Returns the parsed items array.

### Insert flow
- For each previewed row, insert into `staff_personal_schedule_items` with `user_id = target staff id`, `title`, `scheduled_date`, `start_time`, `end_time`.
- Refresh board, toast count added.

### Permissions
- Reuse existing RLS. Only admins can pick a staff member other than themselves; gate the dropdown with `has_role(..., 'admin')` check via `user_roles`.

### Files touched
- `src/components/staff/MyPersonalScheduleBoard.tsx` — add button + dialog component (or a new `AiScheduleImportDialog.tsx` for cleanliness).
- New `src/components/staff/AiScheduleImportDialog.tsx`.
- New `supabase/functions/parse-schedule-ai/index.ts` (verify_jwt default, CORS, Lovable AI Gateway).
- No DB schema changes.
