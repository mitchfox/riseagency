## Site-wide audit plan

Goal: produce a single written report of every issue with links, text, formatting, layout, and copy across the public site, player portal, staff portal, investors portal, scouts portal, agents portal — on desktop and mobile, in all 12 languages. Nothing gets fixed until you've reviewed and approved the report.

### Realistic scoping note

The full project has roughly 50 public routes plus the portals. Multiplied by 12 languages and 2 viewports that's well over 1,000 page renders. I'll get full coverage of English desktop + mobile, then sample the other 11 languages on the high-traffic pages and any page that uses dynamic copy, rather than rendering every locale of every page. If something is broken structurally on a page it will be broken in every language; if it's a translation overflow or missing key, the sample will catch it. I'll call out anything skipped at the end of the report so you can ask me to re-audit specific pages if needed.

### What I check on every page

Links and routing
- 404s, redirect loops, dead internal links, anchors that don't scroll
- External links open correctly (target/rel)
- Localized routes work (e.g. `/es/jugadores` resolves)
- Buttons that say "Coming soon" or are wired to dead handlers
- Hash links that don't match an `id`

Text and copy
- Untranslated keys (literal `header.foo` strings rendering)
- Strings that fell back to English in a non-English locale
- UK English compliance (defence, optimised, organise, em-dash usage)
- Football term localization vs position abbreviations (GK, CF, CB, LW)
- Typos, double spaces, stray punctuation, unclosed brackets
- Placeholder/lorem text, "TODO", "test", "John Doe"
- Numbers and times formatted per project rules (mm.ss, 0/0.00 inputs)
- Sentence case vs Title Case consistency
- Date locale formatting

Layout and formatting
- Overflow on 360-414px viewports, horizontal scroll, content cut off
- Text clipping or ellipses on labels that should wrap
- Buttons that wrap awkwardly or collapse to icons-only without aria-label
- Headers sticking, z-index conflicts, safe-area padding on iOS-sized viewports
- Images broken, wrong aspect ratio, missing alt
- Cards/sections misaligned, inconsistent spacing
- Skipped heading levels, multiple `<main>` elements
- Tap targets under 44×44 on primary mobile CTAs
- Dark mode bleed on staff portal (must be strictly dark)
- Rise Gold (#C6A332) accent compliance on staff portal

Things that don't make sense
- Empty states that look like errors
- Counters showing "0" where data should exist
- Tooltips/popovers that hide behind other elements
- Login-required pages that render half the UI for logged-out users
- Forms with no validation feedback
- CTAs that go to the wrong place ("Contact" → home)
- Duplicated nav items, inconsistent footer between pages

Interactive (forms/CTAs)
- Submit a representative input on each public form (Contact, Request Representation, Realise Potential, Jobs apply, etc.) and confirm it either posts to the backend or shows a clear validation error
- Click primary CTAs on each landing section and confirm they navigate correctly
- Test language switcher on every top-level page
- Test mobile menu open/close on each layout

### What I do NOT touch in this audit

- Authenticated portals beyond a logged-out smoke test (you said you want CTAs/forms but not authenticated flows). For staff/player/scout/agent/investor portals I'll audit only the login screen and any public-facing surface; the gated content stays out of scope unless you log in and ask for a follow-up sweep.
- Performance, SEO scoring, accessibility WCAG audits (separate skills exist for those — happy to run after).
- Backend logic, RLS, data correctness.

### Execution order

1. Enumerate every route from `src/App.tsx` and the localized-route helpers. Produce a route inventory grouped by area (Public marketing / Player portal / Staff / Scouts / Agents / Investors / Reports & shared).
2. Static pass: ripgrep for known smells — untranslated keys, hardcoded English in localized contexts, `TODO`, `placeholder`, `console.log`, broken `href`/`to` (relative paths starting with letters, `#`-only anchors, `javascript:`), `target="_blank"` without `rel`, `h-screen` outside expected places, custom color classes that bypass the design system, multiple `<main>` tags, missing alt attributes on `<img>`, icon-only `<Button size="icon">` without `aria-label`.
3. Dynamic pass — English desktop (1440×900): render every public route + each portal login screen. Capture a screenshot, scan for visible issues, click language switcher, mobile menu, primary CTAs.
4. Dynamic pass — English mobile (390×844): same sweep at iPhone width.
5. Locale sweep: cycle the language switcher through ES, FR, DE, IT, PT, RU, PL, CZ, NO, TR, HR (the 11 non-English locales) on the Home, About, Players, Stars, Contact, Request Representation, and Footer. Look for overflow, missing keys, and football-term localization issues.
6. Form/CTA pass: submit one valid and one invalid attempt on each public form; click every primary landing CTA and confirm destination.
7. Compile findings.

### Report format

You'll get a single report grouped by severity, then by area:

```text
CRITICAL  (blocks user / broken)
  - <area> · <page> · <viewport/lang> — <issue> — <file:line if known>
HIGH      (visibly wrong, looks unprofessional)
  - ...
MEDIUM    (copy, polish, consistency)
  - ...
LOW       (nit, optional)
  - ...
SKIPPED   (out of scope or needs your input)
  - ...
```

Each finding has: where, what, why it matters, suggested fix in one line. Where the same issue repeats across many pages (e.g. a shared component bug), it's collapsed into one finding with the affected list.

### After the report

Once you've read it, tell me which items to fix (or "fix all of severity X and above"). I'll batch fixes by shared component to avoid touching the same file multiple times, then run a verification pass on the changed surfaces before handing back.

### Approximate effort

- Static pass + route inventory: small.
- Dynamic English desktop + mobile sweep: medium-large, the bulk of the work.
- Locale sample: medium.
- Form/CTA pass: small-medium.
- Report compilation: small.

If anything in this scope should be wider or narrower — for example, you do want me to log in and audit the staff portal proper, or you'd rather I cover only 3 languages and go deeper instead of 12 — say so and I'll adjust before kicking off.
