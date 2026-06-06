## 1. Fix the crash (root cause)

`OutreachPipelineBoard.tsx` has `useMemo` calls for `filtered` and `byStage` AFTER my new early return for the inline Actions panel. React requires the same number of hooks every render — that mismatch is what throws "Rendered fewer hooks than expected" the moment Actions is clicked.

Fix: keep all hooks at the top, and move the conditional render into the JSX (or compute `actionsRow` and branch only after every hook has run). No early `return` before hooks.

## 2. Visual redesign — Outreach Pipeline + Prospect Board

Both share the same problems: cramped Kanban columns, plain bordered cards, no hover life, hidden data, no rhythm.

Concrete moves applied to both boards:

- **Column headers**: pill-shaped, Rise-gold underline on active/loaded column, animated count chip, subtle gradient stripe matching the stage tone (cold = slate, warm = gold, signed = emerald glow).
- **Cards**: 
  - Layered card: faint gradient surface + 1px gold-tinted ring on hover, lift + shadow on hover, "shine" sweep (CSS keyframe across the card on hover).
  - Avatar block on the left: initials in a gold ring (image when we have one).
  - Right-side accent strip colour-coded by fit-score band (90+ glowing gold, 70-89 amber, 50-69 neutral, <50 muted).
  - Key details shown inline: position pill (normalised abbreviation), age, club with country flag, fit score badge, agent badge if top-agency, national-team star, "Overdue Xd" chip.
  - Star toggle gets a soft glow when starred.
- **Drag affordance**: grip dots on hover only; cursor changes; ghost card with stronger shadow while dragging; drop-target column gets gold dashed ring + scale 1.01.
- **Empty columns**: dashed gold-tinted placeholder with a short, real instruction (e.g. "Star players in the table to queue them here").
- **Density**: comfortable 12px gap between cards, 8px inner padding, consistent typography scale; on mobile the columns become a horizontal snap-scroller with one column visible at a time.
- **Micro-polish**: page-load fade/scale on cards (staggered ~30ms each), pulse on overdue chips, smooth FLIP transitions when status changes.

Prospect Board specifically also gets:
- Probability-weighted column header showing weighted EV (already in the data — surface it).
- Player photo where available, otherwise gold-initial avatar.
- Same card system as the pipeline for visual continuity.

## Technical notes

- All colours via existing semantic tokens (`--primary` = Rise gold, `--card`, `--muted`, etc.). No raw hex.
- Hover/shine via Tailwind + a single shared `card-shine` keyframe in `index.css`.
- Card becomes a small shared component used by both boards so they stay consistent.
- No new dependencies. Animations via existing framer-motion patterns already in the project.

## Out of scope

- Backend/scoring logic (untouched).
- Mobile redesign of the rest of recruitment (already done in a previous turn).