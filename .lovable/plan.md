## 1. Fix "Video & Data" inline more-videos list

**File:** `src/pages/ClubOutreachProposal.tsx` (around line 616-641)

Currently when a player has an explicit video selection (`videos_explicitly_selected`), the inline "Match-By-Match Video" card returns `null` so no other clips show. That's why the inline player looks empty after clicking Video & Data.

Change: remove the early `if (current?.videos_explicitly_selected) return null;` guard. Keep the rest of the logic — it already builds `remaining` from `stars_ordered_videos` (which the edge function `get-club-outreach/index.ts` already restricts to `matchHighlights` only, never `bestClips` or portal clips) and excludes whatever the hero is showing. Result: the main hero plays the chosen video; the inline card lists the player's other Stars-profile match highlights.

No edge-function changes needed — `stars_ordered_videos` is already scoped to Stars match highlights only.

## 2. Language toggle on the proposal header

**File:** `src/pages/ClubOutreachProposal.tsx`

Mirror the Phase-0 EN ↔ assigned-language ovular pill we already ship on `RiseWithUs.tsx` (lines ~1750-1810), but inline directly under the "To {contactName}" line in the proposal header (lines 731 and 899) so it sits exactly where the user asked.

Changes:
- Add `const [langOverride, setLangOverride] = useState<string>("en");` so the proposal **defaults to English** regardless of the link's saved language.
- Replace the existing `const lang = (data.link.language as string) || "en";` (line 521) and the document-lang effect (335-338) to use `langOverride` as the active language.
- Resolve `assignedLang = data.link.language` and only render the toggle when `assignedLang && assignedLang !== "en"` (otherwise there's nothing to switch to).
- Render the pill right below the `To <name>` line, both on the players-grid header (~731) and on the single-player header (~899). Two buttons inside a rounded pill: left = English (gb flag), right = assigned language (flag + native name from the existing language map used by RiseWithUs). Active side gets the gold tint exactly like RiseWithUs.
- Switching updates `langOverride`, which flows into the existing `tr(...)` translation lookup and `document.documentElement.lang` effect — so every translated string on the proposal updates instantly, same as on player outreach.

No backend or schema changes; reuses the link's existing `language` value and the proposal's existing translation map.

## Out of scope
Only the two items above. No other proposal behaviour, styling, or data changes.
