## Problem

The DOB and position ARE being recorded — the database has rows with this data. The staff "Visitor Tracking" panel just isn't showing them.

The UI starts from `site_visits` and only shows representation_visitors entries whose `visitor_id` exists in `site_visits`. Several recorded entries (including the ones with DOB and position) have a different `visitor_id` value from what `site_visits` stored for the same person, so they get silently dropped from the panel.

Root cause for the mismatched IDs: a few visitors arrive with a `visitor_id` already in `localStorage` that doesn't follow the `visitor_TIMESTAMP_xxx` pattern (e.g. UUIDs left over from other tabs / sessions / browsers). The shared key works for most users but not all, and when it diverges the panel hides the row entirely.

## Fix

### 1. Staff panel: show every recorded entry, joined when possible

Rewrite `RepresentationVisitorsTracker.tsx` so the **base list is `representation_visitors`**, not `site_visits`:

- Pull all recent `representation_visitors` rows (last 200, ordered by `updated_at`).
- Pull recent `site_visits` rows for representation paths and index by `visitor_id`.
- For each rep_visitor row, attach city / country / IP from the matching site_visit if one exists; otherwise show just the country_code that the rep tracker recorded.
- Also include site_visits visitors who landed on the rep page but never triggered the tracker (so we still see "page entered, no details yet"), shown below the ones with details.

Result: every row currently in the database (the BG-CM-2007 row, the BA-RB row, etc.) shows up immediately, with whatever location info we can attach.

### 2. Harden the shared visitor id

In `usePageTracking.ts` and `representationVisitorTracker.ts`, treat the `visitor_id` key as authoritative only if it matches the expected `visitor_*` shape. If the stored value is anything else (a stray UUID or empty), overwrite it with a freshly generated `visitor_*` id and use that everywhere. This guarantees future rep_visitor rows and site_visit rows always share the same id and join cleanly.

### 3. Make sure DOB / position pings actually fire from the form

Verify in `RepresentationDialog.tsx` that `trackRepresentationVisitor({ position, dob, ageGroup, language })` is called:

- on every position change in the form
- on every DOB blur in the form
- on dialog open with the prefilled values

If any of these are missing or only fire on submit, add them so partially-filled forms still record DOB/position.

### 4. Verify after deploy

- Open the rep page in a fresh browser → confirm a new row appears with city/country.
- Pick a position → confirm the same row updates with `position`.
- Enter a DOB in the dialog → confirm the same row updates with `dob` and `age_group`.
- Confirm the existing 2 historical rows (BG-CM and BA-RB) now appear in the staff panel.

## Files to change

- `src/components/staff/RepresentationVisitorsTracker.tsx` — rewrite the data join so rep_visitors is the base list.
- `src/lib/representationVisitorTracker.ts` — sanitize/normalize the shared visitor_id.
- `src/hooks/usePageTracking.ts` — same sanitisation, so both writers agree.
- `src/components/RepresentationDialog.tsx` — ensure tracker fires on position change, DOB blur, and dialog open.

No database migration or edge function change needed — the data is already being written correctly, the panel just wasn't surfacing it.