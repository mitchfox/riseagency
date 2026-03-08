

# Speed-Up Features for Athlete Centre

Four features to implement based on your selections.

---

## 1. Auto-Create Report Shell from Fixture Confirmation

**What exists:** Already partially implemented in `PlayerFixtures.tsx` (line 467) — a draft `player_analysis` row is created when a fixture is saved. Also creates a pre-match analysis shell via batch mode.

**What to add:** Extend this so confirming/saving a fixture also creates a linked pre-match analysis shell (if one doesn't exist) with opponent, date, and competition pre-filled. Surface a toast with a "Go to Report" action that opens the reports section directly.

**Changes:**
- `src/components/staff/PlayerFixtures.tsx` — after fixture creation, also insert an `analyses` row (type: pre-match) if batch mode hasn't already done so
- `src/components/staff/AthleteCentre.tsx` — expose a callback from MatchFlowTab so fixture creation can programmatically open the reports section

---

## 2. Quick-Switch Recent Players

**What to build:** A horizontal row of the last 5 accessed players shown above the main Select dropdown, using avatar thumbnails with names. Clicking one instantly switches context.

**Changes:**
- `src/components/staff/AthleteCentre.tsx`:
  - Store recent player IDs in localStorage (`athleteCentre_recentPlayers`, max 5, most recent first)
  - Update the list each time a player is selected
  - Render a row of clickable avatar chips above the Select, each showing the player's image and first name
  - Clicking a chip sets `selectedPlayer` and updates localStorage

---

## 3. "Continue from Last Session" Resume Button

**What to build:** When a staff member opens Athlete Centre, show a small banner if they were previously editing a specific report or had a specific Match Flow section open. One click resumes that exact state.

**Changes:**
- `src/components/staff/AthleteCentre.tsx`:
  - Persist `openSections` state to localStorage on change (`athleteCentre_openSections`)
  - Persist `mainTab` and `devTab` to localStorage
  - When `inlineReport` is set, save it to localStorage; on mount, if a saved inline report exists, show a banner: "Continue editing [Player]'s report vs [Opponent]?" with Resume/Dismiss buttons
  - Resume restores the player selection, opens the correct section, and sets `inlineReport`

---

## 4. AI Commentary Auto-Clipper (Video Analysis)

**What to build:** A new feature within the Video Analysis module. Staff upload/play a match video. An "AI Commentary Clipper" button sends the audio track to ElevenLabs Speech-to-Text (batch transcription via edge function), which returns timestamped words. The system scans the transcript for the selected player's name (and common variants/surnames). For each mention, it auto-creates a clip spanning 5 seconds before to 5 seconds after the timestamp.

**Changes:**
- **New edge function** `supabase/functions/transcribe-commentary/index.ts`:
  - Accepts a video/audio file URL and player name
  - Downloads the audio, sends to ElevenLabs STT API (`scribe_v2`) with timestamps enabled
  - Scans returned `words[]` for player name matches (surname, full name, common nicknames)
  - Returns an array of `{ start, end, timestamp, context }` clip suggestions
  - Requires `ELEVENLABS_API_KEY` secret (need to check if exists, likely needs adding)

- **New UI component** `src/components/staff/coaching/AICommentaryClipper.tsx`:
  - Button in the Video Analysis detail view: "AI Commentary Clipper"
  - Shows progress while transcribing
  - Displays detected mentions with timestamps and surrounding text context
  - "Accept All" / individual accept/dismiss per mention
  - Accepted mentions are inserted as clips into the video's clip list with label "Commentary mention - [timestamp context]"

- **`src/components/staff/coaching/VideoAnalysis.tsx`** — add the AICommentaryClipper button alongside the existing AI Player Detection button

**Secret required:** `ELEVENLABS_API_KEY` — will need to prompt for this before implementation.

---

## Implementation Order

1. Quick-switch recent players (fastest, pure frontend)
2. Continue from last session (pure frontend)
3. Auto-create report shell (small backend touch)
4. AI Commentary Clipper (new edge function + UI + API key)

