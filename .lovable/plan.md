
## Physical tab restructure

### 1. Top toggle (three pills, default Schedule)
- Replace the current two-pill toggle in `src/pages/Dashboard.tsx` with **Schedule | Strength, Power & Speed | Technical**.
- Toggle is rendered whenever the player has any SPS programme OR any technical programme (not just when both exist).
- Default tab on open is **Schedule**. The persisted `portal.programmingTab` keeps subsequent visits on the user's last choice, but if no value is stored, Schedule loads.
- Pill type widened to `"schedule" | "sps" | "technical"`.

### 2. Schedule tab
- Renders the existing weekly schedule block (the current Schedule accordion content) from the current SPS programme, plus any `schedule_notes`.
- No overview, no SPS sessions, no programme picker, no full-width card breakout. Rendered inside `container mx-auto px-4` so margins stay readable when other tabs sit alongside.

### 3. SPS tab
- Renders only the current SPS programme's **Overview** + **Sessions** accordions. The Schedule accordion item is removed from this tab (it lives in the Schedule tab now).
- The full-width card breakout (`w-screen -ml-[50vw]`) is removed so the layout stays inside the page container and no longer becomes squeezed/illegible when the toggle is present.

### 4. Technical tab
Rewrite `src/components/portal/TechnicalProgramView.tsx` to match SPS look and behaviour:
- Render **only the current technical programme** (`is_current === true`); fall back to the first programme if none flagged current. Stop listing every programme.
- Session selector row at top: one button per session, styled via `getSessionColor(session.session_key)` exactly like SPS Session A/B/C buttons. Only the selected session's table is rendered.
- One central table per selected session (same 5-column gold-header layout as SPS), with drills as rows and variations as indented rows beneath their parent. Clicking a row still opens the existing detail dialog.
- Reps cell formatting matches SPS: show `exercise.reps` directly (no truncation), append `each side` when `reps_per_side` is true. Cell uses `whitespace-normal break-words` so longer values like "30 each side" aren't clipped.

### 5. Active-only filter
- SPS tab continues to show only the selected SPS programme (existing behaviour) — confirmed not to leak Testing Protocol or technical programmes.
- Technical tab shows only the current technical programme as described above.

### Technical notes
- Files touched:
  - `src/pages/Dashboard.tsx` — toggle, Schedule tab block, SPS tab wrapper.
  - `src/components/portal/TechnicalProgramView.tsx` — single-programme + session-button + central table refactor.
- No DB changes. No edge function changes. No changes outside the player portal Physical tab.
