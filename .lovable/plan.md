## 1. Portal Physical tab — fix and redesign

File: `src/pages/Dashboard.tsx` (the `physical` TabsContent around lines 3463–3700+)

### a. SPS blank-screen fix
When a player has both a Technical programme and SPS, the SPS panel currently renders blank. Root cause: the persisted `programmingMode` and `selectedProgramId` state can leave the SPS branch with no programme matched. Fix:
- When `hasTechnicalPrograms` is true, still ensure `selectedProgramId` defaults to the first non-"Testing Protocol" SPS programme as soon as `programs` loads (if not already set).
- Always render the SPS panel when `programmingMode === "sps"` and there is at least one SPS programme — never depend on the technical branch being chosen.
- If a player has only one of the two, hide the toggle and render that one directly.

### b. Cleaner toggle at top
Replace the current `inline-flex border` toggle with a centred, full-width segmented control matching the rest of the portal (same style as the player-portal tabs: bordered pill, Rise Gold active state, larger hit area, equal-width halves). Only show it when both Technical and SPS exist.

### c. Technical view redesigned to mirror SPS
File: `src/components/portal/TechnicalProgramView.tsx`

Replace the current card list with a layout that matches the SPS session look:
- For each session, render a compact **drill table** with columns: Drill, Reps, Sets, Load, Recovery. Variations appear as indented sub-rows with the same columns.
- Each row is clickable. Click opens a **wide pop-up dialog** (existing `Dialog` component, wide variant) showing the deep detail: full description, notes, diagram, and all variations laid out fully (same depth currently rendered inline).
- Keep the programme header (name, phase, dates) but drop the per-drill inline diagram/notes block — those live in the popup.
- Reuse SPS visual styling (rounded black panels, gold table headers, bebas headings) so the two modes feel identical.

## 2. Staff — bulk save SPS into Coaching DB

File: `src/components/staff/programming/StrengthPowerSpeedSection.tsx` plus a new dialog `SaveAllSpsToCoachingDBDialog.tsx`.

Add three buttons in the SPS section header (visible regardless of selected player — they operate across every SPS programme that has ever existed):

1. **Import all exercises** — pulls every row from `sps_exercises`, dedupes by normalised name, and inserts new rows into `coaching_exercises` (category "Strength, Power & Speed"). Skips any whose normalised name already exists in `coaching_exercises`.
2. **Import all sessions** — pulls every `sps_sessions` row, builds an `exercises` jsonb array from its `sps_exercises`, and inserts into `coaching_sessions`. Dedupe by `(title + programme phase)` against existing `coaching_sessions` titles.
3. **Import all programmes** — pulls every `sps_programs` row, packages its sessions+exercises into an `attachments.sps_sessions` payload, and inserts into `coaching_programmes`. Dedupe by `title`.

Each button:
- Confirms the count first ("This will import 142 new exercises. Continue?").
- Runs the insert in a single batch.
- Toasts the number actually added vs skipped as duplicates.
- Refreshes nothing in the SPS UI (Coaching DB is separate).

Buttons sit in a small "Coaching DB" group at the top of the SPS section, next to the player picker, so they aren't gated on a player being selected.

## Technical notes
- Dedup uses `lower(trim(name))` comparison fetched once at the start of each import.
- All three imports run client-side using the existing `supabase` client and the already-permitted `coaching_*` tables — no migration needed.
- Popup uses the existing `Dialog` (sized `max-w-4xl`) per project rule "If creating pop up, make it wide screen not thin".
- UK English throughout ("programme", "centred").
