## Goal

Add a per-band breakdown to the Player Outreach analytics panel so we can see how each AI (fit) score band (0-9, 10-19, ..., 90-100) is actually converting — sent, viewed, replied, interested, signed and the associated rates.

## Where

- `src/components/staff/outreach/OutreachAnalyticsPanel.tsx` — the shared analytics panel used by "Player Outreach Analytics" (Representation Offers) and Club Outreach Manager.
- `src/components/staff/RepresentationOffers.tsx` — the caller that maps players → `AnalyticsRow`; here we compute the fit score per player and pass it in.

## Changes

### 1. `AnalyticsRow` type — add optional AI score

Add `aiScore?: number | null` to the exported `AnalyticsRow` type. Optional so ClubOutreachManager (no per-row AI score) can keep working unchanged.

### 2. Feed the score in `RepresentationOffers.tsx`

Where the panel maps `filtered` → rows, use the same live fit-score logic `FitScoreBadge` uses:

- Reuse `computeFitScore` + `useRecruitmentTargets` + `useScoringSettings` + `useClubMaps().enrichForFit` (already imported elsewhere in that tree).
- For every player, compute `total` once inside the mapper (memoised with `useMemo`) and set `aiScore: total`.

Score is computed live so it always matches the badge shown in the list.

### 3. New "AI score bands" section in the panel

Only render when at least one row has a numeric `aiScore`.

Bands (inclusive-exclusive, top band inclusive):

```
90-100, 80-89, 70-79, 60-69, 50-59, 40-49, 30-39, 20-29, 10-19, 0-9, No score
```

For each band, compute across the rows that fall into it:

- Created
- Sent (same logic already used for `sentRows`)
- Viewed (viewCount > 0 within sent)
- Replied (uses the existing `REPLIED_SET`)
- Interested (`interested | negotiating | offer_made | meeting | signed`)
- Signed (`responseStatus === 'signed'`)
- Rates: view rate = viewed/sent, reply rate = replied/viewed, interest rate = interested/replied, sign rate = signed/sent — all rendered with the existing `pct()` helper (shows `—` when denominator is 0).

Render as a compact table below the existing tiles, styled to match the rest of the panel (dark card, `#cbb96b` accents, `text-[11px]` headers). Each row shows the band label, coloured pip using the same colour ramp from `FitScoreBadge` so the visual language matches, followed by the counts and rates.

### 4. Band filter chips

Add a second row of filter chips (below the current status filters) — "All bands", then one chip per non-empty band. Selecting one narrows the row list and, if useful, the totals tiles down to that band. Chip highlight uses the existing gold-active / muted-inactive treatment.

### 5. CSV export

Extend `exportCsv` with an `AI score` column so exported analytics carry the score for offline analysis.

## Out of scope

- No backend or migration changes — fit score is computed client-side from existing data.
- ClubOutreachManager panel keeps working; no band section renders there because rows carry no `aiScore`.
- No changes to how scores themselves are calculated.
