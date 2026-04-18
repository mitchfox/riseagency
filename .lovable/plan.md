

Three distinct features. Let me explore the relevant areas before proposing implementation.

## 1. Annotation editor on performance report clips

**Current state:**
- Performance reports have actions, each with a clip (video segment).
- Analysis editor has a "Annotate Video" button that opens an annotation editor capturing the current frame.
- Analysis viewer shows annotations correctly (uses 0-100 coordinate system, 16:9 object-fit: fill).
- Performance report players also show annotations.
- `annotation_projects` table now has anon SELECT policy.

**Need to investigate:**
- How action clips are rendered in performance report edit (Action Edit / Score Edit components).
- How the annotation editor is opened from analysis editor — what component, what props.
- How annotations are persisted and linked back to the clip/action so they render in the viewer.

**Plan:**
- Add an "A" icon button next to each clip in the performance report action edit interface.
- Clicking it opens the same annotation editor used in analysis editor, pre-loaded with that clip's video and current frame.
- Annotations save to the same store the viewer reads from (likely `annotation_projects` keyed by video_url + timestamp, or a new field on the action).
- RLS: ensure anon can SELECT annotations linked to performance reports (the migration already covers `annotation_projects`).

### Open question
**Where do annotations attach?** Two options:
- (A) On the action row itself (new `annotations` JSONB column on `performance_report_actions`).
- (B) Reuse `annotation_projects` keyed by clip URL, same as analysis editor.

Option B keeps parity with analysis editor exactly and means the viewer already works. Option A is cleaner data-wise but duplicates annotation logic. I'll go with **Option B** since the user said "exact same settings as annotation editor usually has".

## 2. Weekly hub on My Tasks — day-by-day, recurring tasks, represented players only

**Current state:**
- I added `renderUpcomingStrip` to `StaffAccountabilityOverview.tsx`.
- The user says: (a) it doesn't look as good as the portal hub, (b) it must show day-by-day Mon-Sun, (c) recurring tasks should appear on every matching day (weekly = every Mon if assigned Mon; monthly = once per month), (d) fixtures only for players with `representation_status = 'represented'` (or similar represented category).

**Need to investigate:**
- The portal hub component for visual reference.
- The staff tasks table — does it have recurrence fields (`recurrence_type`, `recurrence_day`, etc.)?
- The representation status field name and the value(s) considered "represented".

**Plan:**
- Build a new `StaffWeeklyHub.tsx` styled like the portal hub (card per day, gold accents, clean grid).
- For each day Mon-Sun: list fixtures for represented players that day + recurring tasks for the selected staff member that hit that day.
- Recurrence logic:
  - `weekly` + `recurrence_day = 'monday'` → appears every Monday.
  - `monthly` → appears once that week if the month-day falls in it (or shows monthly indicator).
  - One-off → appears on its specific date if within current week.

## 3. FFF Package editing + service catalogue from Fuel For Football project

**Current state:**
- `FFFPackageHeader.tsx` shows current package and lets staff start a new package or mark a game.
- The user wants:
  - Ability to **edit** the current package (size, contents).
  - Pull **services from the Fuel For Football project** as selectable options (cross-project read).
  - Allow manual entries too.

**Need to investigate:**
- The Fuel For Football project (id `ac8f5c3b-6b5b-4f19-9b61-6f9621e5d7ab` per memory) — what table/list holds "services".
- Whether we can read from that project's DB from this project.

**Plan:**
- Cross-project lookup: read services from FFF project (likely a `services` or `programmes` table). If readable via `cross_project--read_project_file`/cross-project DB, use it. Otherwise we need a public endpoint or to mirror data.
- New `EditFFFPackageDialog.tsx`: edit package size, add line-items (service from FFF or manual text), persist into a new column on `fff_packages` (e.g. `package_items JSONB`) or a new `fff_package_items` table.
- Add an "Edit" button next to "New package" in `FFFPackageHeader.tsx`.

### Open question
The two Lovable projects each have their own Supabase project. To pull FFF services we either need:
- A cross-project public API/edge function on the FFF side, OR
- Mirror the catalogue into this project's DB (manual/scheduled sync), OR
- Hard-code a service list (worst).

I'll first check whether the FFF project has a readable services table I can mirror or query via an edge function.

## Investigation questions before I start

I need a couple of decisions from you to keep this on track:

**Q1. Annotations storage for performance report clips.** Reuse the existing `annotation_projects` table (one project per clip URL — same mechanism the analysis editor uses, viewer already renders it) — or store annotations as JSONB directly on `performance_report_actions` (cleaner data model but duplicate render code)?

**Q2. FFF service catalogue source.** Should I (a) call a small public read-only edge function on the Fuel For Football project to fetch the live service list, or (b) mirror the catalogue once into this project's DB and let staff refresh it manually?

**Q3. Recurring task semantics.** A weekly task assigned to "Monday" should show on every Monday in the hub — confirmed. For monthly tasks, do you want them on (a) the 1st of the month only, (b) the day-of-month they were created, or (c) every Monday of the first week of the month? Same for fortnightly/daily tasks if those exist.

**Q4. "Represented" filter for fixtures.** Should fixtures show for players where `representation_status = 'represented'` only, or also include `fuel_for_football` and other paid statuses?

Once you answer (or say "you decide" for any of them) I'll build all three and verify.

