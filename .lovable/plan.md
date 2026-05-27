## 1. Personal Schedule card improvements

In `src/components/staff/MyPersonalScheduleBoard.tsx`:

- Remove the "tick/complete" button from each task card (it currently does nothing useful and wastes space).
- Increase card minimum height (raise `HOUR_PX` slightly and bump min height from 50px to ~72px) so titles, time and meta are clearly visible without hover.
- Make the whole card clickable. Clicking opens a new `TaskDetailDialog` (wide popup, `max-w-2xl`) showing:
  - Editable title, notes/description
  - Date picker (change day)
  - Start time + end time pickers (change time)
  - Repeat weekly toggle (on = create/maintain recurrence_group_id for 12 weeks; off = detach this instance)
  - Image attach/replace/remove
  - Delete button (with option "delete this only" vs "delete this and all future occurrences" when part of a recurrence group)
  - Save / Cancel
- Keep the inline drag-to-reschedule behaviour; only the inline icon row is removed, replaced by an "Open" affordance (the card itself).

No DB migration needed — schema already supports `recurrence_group_id`, `image_url`, `scheduled_date`, `start_time`, `end_time`.

## 2. Operating Profile — translate options and answers

Currently `useTranslatedOperatingProfile.ts` deliberately keeps `options` in English ("used as storage keys") and only `labelFor` translates titles/question labels. Result: every radio/checkbox/rank option still renders English.

Fix:
- In `OperatingProfileDialog.tsx`, always render option text via `labelFor(opt)` (already done) — verify all three input types (`RadioGroup`, `MultiInput`, `RankInput`) use `labelFor` for display while the underlying value stored in `answers` remains the English key. Confirmed they do; the real gap is that the translation cache does not include option strings for some questions where `collectStrings()` skips them — re-check and ensure every `q.options` entry is added to the batch. Also include the static UI strings ("Choose up to", placeholder copy already keyed via `t()`).
- In `OperatingProfileViewer.tsx` (staff side) keep English (staff portal is English-only).
- For previously cached translations, bump `CACHE_VERSION` from `v1` to `v2` so clients refetch with options included.

## 3. Hub comparisons — translate stat labels and player phrasing

In `src/components/dashboard/Hub.tsx` (and the comparisons card it renders), strings like `"Last 5 games avg vs Finn Jelsch"`, stat row labels (e.g. "Shots", "Pass accuracy", "xG"), and section headings are currently hardcoded English.

Fix:
- Add the static fragments to `portalTranslations.ts`: `comparison_last_n_games_avg_vs` ("Last {n} games avg vs {name}"), section heading keys, etc.
- For dynamic stat labels coming from the database/derived metric list, route them through the existing `useAutoTranslateStrings` hook (same pattern already used for aphorisms) so they are translated on the fly and cached.
- Player names stay untranslated (proper nouns).

## 4. Hub dates — localise "Apr 24 2026"

Audit the In Form and Performance widgets on Hub for `format(..., "MMM d yyyy")` / `toLocaleDateString()` calls. Replace each with `formatDate(date, playerData?.portal_language, { day: "numeric", month: "short", year: "numeric" })` from `src/lib/dateLocale.ts`. Czech will then render "dub 24 2026", etc.

Likely files: `src/components/dashboard/Hub.tsx`, the in-form card component, the performance summary card, and any comparison subcomponents.

## Out of scope

- No backend schema changes.
- Staff portal stays English.
- No changes to the existing welcome/intro flow.

## Files to touch

- `src/components/staff/MyPersonalScheduleBoard.tsx` (remove tick, taller cards, click-to-open)
- `src/components/staff/TaskDetailDialog.tsx` (new — wide edit popup)
- `src/components/portal/useTranslatedOperatingProfile.ts` (bump cache version; ensure options included)
- `src/components/portal/OperatingProfileDialog.tsx` (verify `labelFor` on all option renderers)
- `src/lib/portalTranslations.ts` (add comparison/hub keys)
- `src/components/dashboard/Hub.tsx` and comparisons subcomponents (translate labels via `t()` + `useAutoTranslateStrings`; localise dates via `formatDate`)
