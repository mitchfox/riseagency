## Goal

Fix the remaining English text on `/club-proposal/...` when the viewer switches language: position abbreviations on the multi-player picker, the "To" preposition, the entire Video & Data (inline) view, and all Match-By-Match Data labels.

## Issues to fix

1. **Position abbreviations stay in English on the multi-player cards.** `autoT(p?.position)` is called on values like "RW"/"CF"/"CB". The runtime AI translator doesn't translate two-letter codes, so they pass through unchanged.
2. **"To" stays in English before a player is selected.** The `hdr.to` key was added to `UI_BUNDLE` but existing `club_outreach_links` rows have an older `translations.ui` snapshot that doesn't include it, and the runtime `autoT` fallback for "To" is producing the wrong output in step 3 anyway.
3. **"To" in Czech is rendering as "Pro (k)".** The AI batch translator gives a literal/dictionary answer for the bare word "To" with a parenthetical hint. We need a curated map per language for this single short word.
4. **Video & Data (inline) view is fully English.** The `MatchByMatchCard` component (Match-By-Match Data title, the Possession/Passing/Shooting/Defending tabs, the Per 90 / Raw toggle, all column labels like "Dribbles /90", the "Match" header, "No data available", and the tooltip "Play video report") never receives `tr`/`autoT` and renders hardcoded English. The "Match-By-Match Video" card title and `card.openFull` ("View Full Stars Profile") also rely on bundle keys that aren't in `UI_BUNDLE`.

## Plan

### 1. Add a curated position + preposition map

Create a small lookup table in `src/pages/ClubOutreachProposal.tsx` (or extend `src/lib/portalTranslations.ts` if it already houses similar data) covering:

- All 14 position abbreviations (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, RM, LM, LW, RW, CF) for each of the 11 non-English languages.
- The single word "To" used before the contact name, translated as the natural short preposition only (cs: "Pro", es: "Para", pt: "Para", fr: "À l'attention de" → too long, use "Pour", de: "An", it: "A", pl: "Do", ru: "Кому:", tr: "Sayın", hr: "Za", no: "Til").

Strategy is map-first, AI-last:

- New helper `translatePosition(code, lang)` returns the mapped value when `code` matches an abbreviation; otherwise falls through to `autoT`.
- New helper `translateToWord(lang)` returns the curated preposition directly; the JSX stops using `tr("hdr.to", ...)` for this string and uses the helper, so it works on old links too.

### 2. Wire the helpers into the multi-player picker and single-player header

In `src/pages/ClubOutreachProposal.tsx`:

- Replace `autoT(p?.position)` on the multi-player card subtitle (around line 935) with `translatePosition(p?.position, lang)`.
- Replace both `tr("hdr.to", "To")` call sites (lines 888 and 1057) with `translateToWord(lang)`.
- Also pass `translatePosition` to anywhere position chips render in the single-player view (the `slots.map` chip row and any `position_slot` rendering) so they localise consistently.

### 3. Localise the entire Video & Data (inline) view and Match-By-Match Data

Add the missing pieces to the proposal's translation surface so the inline view is no longer English:

a. **Extend `UI_BUNDLE` in `supabase/functions/translate-club-outreach/index.ts`** with the static labels currently rendered as English literals:

- `inline.title` → "Video & Data"
- `inline.back` → "Back to proposal"
- `inline.moreVideos` → "Match-By-Match Video"
- `card.openFull` → "View Full Stars Profile"
- `mbm.title` → "Match-By-Match Data"
- `mbm.cat.possession`, `mbm.cat.passing`, `mbm.cat.shooting`, `mbm.cat.defending`
- `mbm.viewPer90` → "Per 90", `mbm.viewRaw` → "Raw"
- `mbm.match` → "Match", `mbm.noData` → "No data available.", `mbm.playReport` → "Play video report"
- `mbm.stat.<key>` for every metric key listed in the Possession/Passing/Shooting/Defending arrays in `MatchByMatchCard` (~30 keys, e.g. `dribbles_per90` → "Dribbles /90").

b. **Trigger a one-shot backfill loop** (small inline migration or a script) that calls `translate-club-outreach` for every existing `club_outreach_links` row with a non-`en` language, so old links pick up the new bundle keys without each one being re-saved.

c. **Pass `tr` and `autoT` into `MatchByMatchCard`** from the call sites (the inline view around line 809). Inside the component:

- Replace the hardcoded `"Match-By-Match Data"`, `"Match"`, `"No data available."`, `"Play video report"`, `"Per 90"`, `"Raw"`, and each tab's `c.category` label with `tr("mbm.…", english)`.
- Replace each `m.label` in the column header with `tr(\`mbm.stat.${m.key}\`, m.label)` so freeform keys still fall through to AI via `tr`'s autoT fallback.
- Wrap `a.opponent` and `a.result` in `autoT` so opponent names + result text translate.

d. **Wire `autoT`'s dynamic-string collection** (`dynamicStringsForTranslation` around line 580) to also include every `m.label` from the active player's `match_by_match` rows and every `a.opponent` / `a.result`, so the AI fallback warms before render.

### 4. Verify

- Open the Slezský FC Opava proposal route and the Tyrese Omotoye proposal route used in the user's reproduction.
- Toggle the language pill to Czech (and a second language, e.g. Spanish):
  - Multi-player cards: position abbreviations show as Czech words (e.g. "Pravé křídlo" or the chosen short form), "To" reads as "Pro".
  - Single player Video & Data inline view: section title, "Back to proposal", "Match-By-Match Video", "View Full Stars Profile", Match-By-Match Data title, the four category tabs, Per 90/Raw toggle, table column labels, "Match" header, opponent + result text, "No data available." all switch language.
- Toggle back to English: everything returns to the original copy.
- Reload: translated copy appears immediately (AI fallback hits localStorage cache; bundle keys ship pre-translated).

## Technical notes

- The new helpers live in `src/pages/ClubOutreachProposal.tsx` (or `src/lib/portalTranslations.ts` if a shared map already exists there) and stay map-first so we never blow AI credits on stable strings.
- The backfill loop should be idempotent: skip rows whose `translations.ui` already contains the new keys.
- No schema changes required.
