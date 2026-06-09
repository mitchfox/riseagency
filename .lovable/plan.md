## Plan

**1. Replace the current thin "player info strip" on the club proposal with a Stars-style info card.**

In `src/pages/ClubOutreachProposal.tsx`, the block at lines 278-310 currently shows a single faded row of small text (position, age, flag+nationality, club logo+club). Replace it with a card that mirrors the Stars header at `src/pages/PlayerDetail.tsx` lines 634-680:

- Wrap in a `border-2 border-[#cbb96b] rounded-lg bg-secondary/20 backdrop-blur-sm` container, `p-4 md:p-5`, same width as every other section on the page (`max-w-3xl mx-auto px-6`).
- Inside: flex-wrap row with `gap-4 md:gap-6 lg:gap-8`, items vertically centred.
- Order of fields, all in `font-bebas uppercase tracking-wide whitespace-nowrap`:
  1. Player name as `<h1>` with the gold gloss backdrop (`text-2xl md:text-3xl text-white`).
  2. Position (`text-lg md:text-xl text-white/70`).
  3. Date of birth + `(age)` when DOB available, otherwise just the age (same styling).
  4. Flag image (`w-6 h-4 object-cover rounded`) + nationality.
  5. Club logo (`w-6 h-6 md:w-8 md:h-8 object-contain`) + club name.
- Drop the now-redundant carousel name caption from the controls block; keep just the position counter `1 / N` (the name now lives in the card).

**2. Confirm width parity.**

Every other section on the page (controls, hero video, sections, footer) is `max-w-3xl mx-auto px-6`. The new info card uses the same wrapper, so it lines up exactly.

**3. Increase the RISE white logo at the bottom.**

In the footer at line 477-479 of the same file, change the logo `className` from `h-8 w-auto opacity-70` to `h-16 md:h-20 w-auto opacity-80` so it reads as a proper sign-off rather than a small mark.

### Files changed
- `src/pages/ClubOutreachProposal.tsx` — replace info strip with Stars-style card, simplify carousel caption, enlarge footer logo.