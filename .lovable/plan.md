## Real root cause (you were right to push back)

Source video size has nothing to do with this. The actual failure is at the database insert step.

The Barcelona Leg 1 clips were created back in February using the old `mm:ss` (colon) format for `minute` — e.g. `"0:35"`, `"2:55"`, `"3:15"`. Since then we standardised to `mm.ss` (dot), e.g. `"45.30"`. The `performance_report_actions.minute` column is **`numeric`**, and Postgres rejects `"0:35"` with `invalid input syntax for type numeric`. I confirmed this directly against the DB.

In `backgroundExportService.ts` the export does:
```ts
minute: clip.minute || getMatchMinute(...)
```
Because every old clip already has a `minute` string set, the colon value is used as-is and every single insert fails — exactly the symptom you described. The clip file probably gets trimmed and uploaded successfully first, but the row insert blows up, so nothing lands on the report.

## Plan

1. **Sanitise `minute` at the export boundary** in `src/lib/backgroundExportService.ts`:
   - Add a `normaliseMinute()` helper: if the value is already a finite number or matches `^\d+(\.\d+)?$`, pass it through. If it matches `^\d+:\d+$`, convert `mm:ss` → `mm.ss` (snapping seconds to the nearest 5 to match `fmtClipMinute`). Otherwise fall back to `getMatchMinute(clip.start, ...)`.
   - Apply it to `clip.minute` before the insert, replacing the current `clip.minute || getMatchMinute(...)`.
   - This single fix unblocks Barcelona Leg 1 and any other legacy video analysis with colon minutes.

2. **Backfill the underlying `video_analyses.clips` JSON** so the colons don't keep haunting the rest of the UI (clip list labels, dedup, etc.). One-off SQL migration that walks `clips` and rewrites any element whose `minute` matches `^\d+:\d+$` into `mm.ss`. The `label` field uses the same colon (`"Clip 0:35"`) — rewrite that too. Scoped to rows where at least one clip has a colon minute, so we don't touch healthy data.

3. **Surface the real error in the export progress widget** so this kind of failure isn't silent next time:
   - In `backgroundExportService.ts`, capture the per-clip error message into the `statuses` map (extend it from `"error"` to `{ status: "error", message: string }`) and include it in `notify`.
   - In `ExportProgressFloat.tsx`, render the message under the failed clip row with a small "Copy" affordance. No layout overhaul, just a one-line tooltip-style line.

4. **Verify** by re-running the Barcelona Leg 1 export end-to-end after the fix and confirming the 62 actions land on the report with playable `/clips/*.webm` URLs.

## Files to change

- `src/lib/backgroundExportService.ts` — add `normaliseMinute()`, use it in the insert; widen the per-clip status to carry an error message.
- `src/components/staff/ExportProgressFloat.tsx` — show the per-clip error message.
- New migration to backfill `video_analyses.clips[*].minute` and `clips[*].label` colon → dot.

## What I'm NOT changing

- The trim pipeline / size limits — they're working fine for everything else and weren't the problem.
- The `minute` column type — staying `numeric` is correct; `mm.ss` (e.g. `2.35`) parses cleanly as `2.35`.
- Existing rows on already-exported reports — only the source `video_analyses.clips` data needs the colon cleanup.

Approve and I'll implement, deploy, and walk you through retrying the Barcelona Leg 1 export.
