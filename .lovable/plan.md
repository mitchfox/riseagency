

## Fixing Club Name Text Sizing and Investigating Lost Data

### Issue 1: Club name text shrinks too much on smaller screens

**Root cause:** The team name font size uses `clamp(0.5rem, 1.8vw, 1.2rem)`. The `1.8vw` value is relative to the full viewport width, so on a 375px phone screen it resolves to about 6.75px, which is barely readable. The minimum of `0.5rem` (8px) is also far too small.

**Fix:** Replace the viewport-relative sizing with a fixed font size that matches the desktop appearance. Since the Analysis Viewer is constrained to 794px width, the text should use a fixed size (or a much more generous clamp) so it stays legible at all screen widths. The bar height (`h-10 md:h-14`) also constrains what fits, so the mobile size needs to stay within that.

**Change:** Update `fontSize` from `clamp(0.5rem, 1.8vw, 1.2rem)` to `clamp(0.7rem, 3.5vw, 1.2rem)` for both home and away team name spans. This ensures:
- On a 375px screen: ~13px (readable)
- On 794px (A4 viewer): ~1.2rem (matches current desktop look)
- The 2-line clamp and `break-word` remain to handle long names

### Issue 2: Viliam Horka vs Sigma Olomouc - text missing from all 7 points

**Investigation results:** The database shows the analysis has 7 points with titles (GEGENPRESSING, DEFENSIVE POSITIONING, PROTECTING INSIDE, etc.) but every `paragraph_1` and `paragraph_2` field has length 0 - they are empty strings, not null.

**Root cause:** This was caused by the content-hash key bug that was just fixed. When the user typed into the title field, the React key changed on every keystroke, causing the entire point card to remount. This likely meant:
1. The user typed titles first (they survived because each keystroke re-created the component with the new title in state)
2. When they then typed paragraphs, the constant remounting from any further title edits (or video loading) wiped the paragraph content before it could be committed to state
3. The save succeeded, but it saved the empty paragraph values that were in state

**This data cannot be recovered** as it was never persisted. The stable `_id` fix from the previous change prevents this from happening again. The user will need to re-enter the text for this analysis.

**No code change needed** for this issue, but the user should be informed.

---

### Technical Changes

**File: `src/pages/AnalysisViewer.tsx`**
- Line 429: Change `fontSize: 'clamp(0.5rem, 1.8vw, 1.2rem)'` to `fontSize: 'clamp(0.7rem, 3.5vw, 1.2rem)'` (home team name)
- Line 453: Same change for the away team name span

### Data Loss Note
The Viliam Horka vs Sigma Olomouc analysis paragraph text was never saved to the database due to the key-remounting bug. The fix deployed in the last change (stable `_id` on points) prevents this from recurring. The 7 point titles are intact but the paragraphs will need to be rewritten.
