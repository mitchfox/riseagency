## Mobile typing lag — multi-front investigation

The lag isn't one bug, it's a stack of compounding causes. Each keystroke in `PlayerDatabase`, `PlayerOutreachPanel`, edit dialogs, and similar staff pages re-runs work that on a phone CPU adds up to 100–400ms per keypress. Plan attacks every plausible avenue, then verifies.

### Confirmed hot spots (from code read)

1. **Un-debounced search drives full-list re-filter.** `PlayerDatabase.tsx` line 726 and `PlayerOutreachPanel.tsx` line 792 wire the search `Input` directly to `setSearchQuery`. This invalidates `filteredAndSortedPlayers` (a useMemo over up to ~1000 players running `.filter().sort()` plus nationality/club lookups) on **every keystroke**. The comment on line 794 even says "Use local ref-based debounce" — but the debounce was never implemented.
2. **Edit dialogs spread the entire form on each character.** Every `<Input onChange={e => setFormData({ ...formData, x: e.target.value })}>` re-renders the entire panel (table rows + grouped sections). With 900+ rows mounted underneath the dialog, each keystroke re-renders thousands of nodes.
3. **No list virtualisation.** Tables render every visible row directly; combined with cause #2, the diff cost dominates the input latency.
4. **`spellCheck` + `lang="en-GB"` forced on every Input/Textarea** (`src/components/ui/input.tsx`, `textarea.tsx`). Mobile Safari/Chrome run grammar/suggestion passes per keystroke. Heavy on long textareas (notes/messages).
5. **Translation context churn.** Console shows `[Translation] Loaded 1789 translations` firing 3× per page load. If the LanguageContext re-publishes on any state change, every input update cascades into a context broadcast.
6. **Global mouse / xray / transition contexts** wrap the app — verify none of them subscribe to input state.
7. **Dialog content un-memoised.** The Radix Dialog stays mounted with portal; large sibling content still re-renders.

### Fix plan (ordered by impact)

**Phase 1 — eliminate per-keystroke list re-renders (biggest win)**
- Replace the raw search `<Input>` in `PlayerDatabase.tsx` and `PlayerOutreachPanel.tsx` with the existing `StaffSearchInput` (already has 300ms internal debounce).
- Extract the heavy table render into a memoised child component that only depends on `players` + the debounced `searchQuery` + filters, wrapped in `React.memo`. Use `useDeferredValue(searchQuery)` so typing stays interactive even on first keystroke.

**Phase 2 — isolate dialog form state**
- Pull the Add/Edit form into its own component (`<PlayerEditForm value onSubmit />`) with internal `useState`. Parent only receives the final object on save. This prevents the 900-row sibling tree re-rendering per character.
- Alternative if extraction is too invasive: swap form `<Input>`s for `BlurInput` (already exists in `src/components/staff/BlurInput.tsx`) so the parent only updates on blur.

**Phase 3 — quiet the input primitives on mobile**
- In `src/components/ui/input.tsx` and `textarea.tsx`, make `spellCheck`/`lang` opt-in rather than defaulted-on for non-text fields, and gate spellCheck off for fields with `data-fast` or for short single-line fields where suggestions aren't useful (name, club, IG handle). Keep it on for long-form notes/messages only.
- Add `autoCorrect`, `autoCapitalize`, `autoComplete` sensible defaults so iOS Safari doesn't run name-suggestion lookups (`autoComplete="off"` on filter/search; `autoCapitalize="words"` for name fields, `"none"` for handles).

**Phase 4 — virtualise long tables**
- Add `@tanstack/react-virtual` to the player tables in `PlayerDatabase` and `PlayerOutreachPanel` (>50 visible rows). This caps render cost regardless of list size.

**Phase 5 — translation/context audit**
- Confirm `LanguageContext` value is wrapped in `useMemo`; if it currently constructs a new object each render, every consumer re-renders on every parent re-render. Wrap the provider value and split the context into `state` + `setters` if needed.
- Investigate why `[Translation] Loaded 1789 translations` runs 3× per load (StrictMode duplicate is 2, third is a real refetch) — possibly a missing effect dep.

**Phase 6 — broader sweep**
- Apply the same `StaffSearchInput`/`BlurInput`/memoisation pattern to other places the user mentioned ("etc."): `RecruitmentManagement`, `TransfermarktShortlist`, `ClubRatings`, `AgentNotesManagement`, `PlayerNotesBoard`, and any other staff page with an `Input` driving a filtered list.
- Run `rg "onChange.*setFormData\\(\\{ \\.\\.\\.formData" src/components/staff/` and convert those hotspots.

**Phase 7 — verify**
- Reproduce in mobile preview (375×812) with React DevTools profiler on a typical typing burst. Targets: keystroke commit <50ms, no commit >100ms.
- Sanity-check production build (dev mode includes StrictMode double-render that inflates timings).
- Test on real iOS Safari via the published URL — input lag often disappears once dev overlays are gone.

### Technical notes

- `useDeferredValue` is preferred over manual debounce for filtering: it keeps the input controlled and responsive while the expensive list lags one frame behind.
- `React.memo` on the row component only helps if props are stable — pass primitives or memoised callbacks.
- For Dialog forms, uncontrolled inputs with `defaultValue` + a `ref` (or `react-hook-form`) avoid the parent re-render entirely; this is the gold-standard fix for dialogs.
- Mobile spellcheck cost is well documented; defaulting it off for short fields is standard practice.

### Out of scope
- No DB/schema changes. No backend touched. No design/visual changes.

Order: Phase 1+2 are the 80/20. Phase 3 helps long-form notes specifically. Phases 4–6 finish the job for scale and consistency.