Five separate fixes. Grouped so you can approve in one go.

## 1. Video analysis freezing on long videos near the end

Cause: heavy work runs on the main thread (frame extraction, base64 encoding, repeated full-video seeking). On larger videos the tab stalls, the iframe shows the "wait/exit page" prompt and never recovers.

Fix:
- Stop blocking the main thread during scans. Move frame sampling into chunked async passes with `await new Promise(r => setTimeout(r, 0))` between frames so the UI stays responsive.
- Cap frame size (downscale to ~640px wide before base64) to reduce memory.
- Cap concurrent frames in flight.
- Convert the single long edge function call into a job pattern: insert a `video_analysis_jobs` row, kick off the work with `EdgeRuntime.waitUntil`, return the job id immediately, then poll the row from the client. No more 60s+ hanging requests killing the page.
- Add a hard client-side abort (AbortController) bound to the scan, so closing the panel cancels everything cleanly.

New table `video_analysis_jobs` (id, status, progress, result jsonb, error, created_at, updated_at) with RLS for authenticated staff.

## 2. Speed/clip buttons unclickable because video click toggles play

In `VideoAnalysis.tsx` the click-to-pause handler is on the video container and swallows clicks on the overlay buttons.

Fix: stop propagation on the overlay control buttons (speed selector, clip buttons, scrub controls) so clicks on them never reach the play/pause handler. Click anywhere else on the video still toggles play/pause.

## 3. Rise Action Spotter player search dropdown hidden behind popup

The PlayerCombobox popover is rendering below the Action Spotter dialog because the dialog has a higher z-index / different stacking context.

Fix: render the combobox popover in a portal at the dialog layer, and bump its z-index above the dialog (`z-[60]` or matching). Verified by opening the dropdown inside the spotter dialog.

## 4. Action Spotter accuracy (Save / Pass etc. being missed or mislabelled)

Current model is over-indexing on "Clearance" and "Defensive Positioning" because the prompt lets it free-label. The historical examples are loaded but not used as a hard shortlist.

Fix to `detect-player-actions/index.ts`:
- For each frame candidate, **constrain the answer to a shortlist** of the action types the player actually has confirmed examples of in feedback history (e.g. for a GK: Save, Defending Cross, Defending Corner, Defending Shot, Long-Range Pass, Rolled Pass, Recovery, Defensive Positioning, Goal Conceded, Pass, Throw, Punch, Claim, Clearance). The model returns one of these or "none".
- Block "Defensive Positioning" unless no other action fits and the player is clearly stationary — it is currently the dominant false positive.
- Add explicit per-position priors: if player is GK, ball trajectory toward goal + arms/dive cue → Save, not Clearance. Hands on ball → Claim/Punch/Throw, not Clearance.
- For combo labels (e.g. "Defending Cross, Punch") match if the primary type matches the expected primary type, instead of requiring exact string equality. This kills most "type mismatch" noise.
- Lower the confidence threshold for Save/Pass specifically so obvious ones aren't dropped.
- Reuse the cross-video learning records as **few-shot examples in the shortlist prompt**, not just as text rules.

This is logic + prompt, no schema changes.

## 5. Business Plan section on dashboard

Add a new section after Vision Board on the staff dashboard.
- Sidebar/expanded entry `businessplan` placed directly after `visionboard` in `Staff.tsx`.
- New component `BusinessPlanSection.tsx` with the 8 headed sections from your brief:
  1. Executive Summary
  2. Description of the Business
  3. Markets
  4. SWOT Analysis (4 sub-fields: Strengths, Weaknesses, Opportunities, Threats)
  5. Management Team and Personnel
  6. Products or Services Offered
  7. Marketing
  8. Financial Plan
- Each section is a long-form textarea with blur-to-save (matches existing data-entry standards).
- **Password gate**: section content is hidden until user enters `Jolon`. Password check happens client-side against a constant; once unlocked it stays unlocked for the session only (sessionStorage flag, cleared on reload). Same lightweight pattern used on contracts.
- Storage: single row in new `business_plan` table (singleton, id fixed), columns for each of the 8 fields as text. RLS: only authenticated staff can select/update.

Wide-screen layout (full width inside the staff section), dark theme, Rise Gold accents, UK English copy throughout.

## Files

Edit:
- `src/components/staff/coaching/VideoAnalysis.tsx` (button click propagation, scan abort, chunked frame work)
- `src/components/staff/coaching/AIPlayerDetection.tsx` (combobox portal/z-index, job-based polling, abort)
- `supabase/functions/detect-player-actions/index.ts` (job pattern, shortlist prompt, position priors, combo matching, per-action thresholds)
- `src/pages/Staff.tsx` (new `businessplan` section after `visionboard`)

Create:
- `src/components/staff/BusinessPlanSection.tsx`
- migration: `video_analysis_jobs` table + RLS, `business_plan` table + RLS

No secrets needed (Roboflow keys already configured).
