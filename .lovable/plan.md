## Goal

Make the internal AI detection (currently called "Roboflow" / "AI Player Detection") more accurate and lower-friction by auto-injecting player identity, adding a permanent identification field on the player record, layering in stronger recognition signals, and renaming the system to an internal RISE name.

---

## 1. Player identification field (permanent, reusable)

Add to `players` table:

- `identification_description` (text) — free text: kit colour, hair, skin tone, build, boots, shirt number, distinguishing marks. Written once, reused everywhere AI runs.
- `identification_reference_image_url` (text, optional) — a single still of the player used as a visual anchor for the AI.
- `not_to_confuse_with` (text, optional) — names/descriptions of teammates that look similar.

Surface these in **Player Management → Edit Player** in a new "AI Identification" section, with:
- Textarea for description (with a short helper: "Describe shirt colour, number, hair, skin tone, build, boots — anything that helps the AI find this player in match footage.")
- Image upload (reuses existing player photo bucket pattern).
- Textarea for confusables.

A "Generate description from photo" button calls Lovable AI (Gemini vision) on the player's existing portrait/highlight thumbnail to draft the description, which staff then edit.

## 2. Auto-feed identity to detection

Currently `AIPlayerDetection.tsx` requires the operator to type description / not-confuse-with each time. Change to:

- When a player is selected (via report, analysis link, or manual pick), auto-populate `playerInfo.description` and `playerInfo.notPlayer` from the player record.
- Auto-populate **team kit colour** for the relevant match: pull from the fixture's team record (home/away kit) so the AI knows "today this player is in the white kit, not their usual red".
- Show the identity card the AI will use (description, kit, confusables, reference image) above the Run button so staff can verify/override before running.
- Allow per-run overrides without overwriting the saved player record.

## 3. Stronger recognition pipeline

Layered signals passed into `detect-player-actions`:

a. **Team-first, then player.** Two-stage prompt: first identify which players on screen belong to the target team (kit colour for this match), then narrow to the target player. Reduces wrong-team false positives.

b. **Reference image as a vision input.** Include the player's `identification_reference_image_url` as the first image in the multimodal call, labelled "REFERENCE: this is the player". Gemini handles visual anchoring well.

c. **Confirmed-clip few-shot.** Already partly in place (global corpus). Extend it:
- Pull up to 8 confirmed action clip thumbnails for *this specific player* and include them as labelled image examples ("This is X performing a Pass").
- Pull up to 8 thumbnails of confirmed actions for *this action type from any player* as visual definition of the action.

d. **Frame density controls.** Add UI controls for: frame interval (1s / 2s / 3s / 5s), confidence floor (medium/high), and a "second-pass verification" toggle that re-sends only flagged frames with a stricter prompt for confirmation before showing them to staff.

e. **Temporal grouping.** Server-side: collapse detections of the same action within a 6-second window into one (already partly done — extend to per-action-type window using `typical_duration_seconds`).

f. **Reasoning audit.** Store the AI's per-frame reasoning alongside each suggestion so staff can see *why* it flagged something. Already partly there via `description` — surface it in the review UI as expandable "AI reasoning".

g. **Reject-and-learn loop.** Already partly in place via `rejectionHistory`. Make it persistent per player + per action type so feedback compounds across sessions, not just within one run.

## 4. Internal renaming

Roboflow-branded things → internal RISE names:

- "Roboflow Dataset Builder" → **RISE Vision Trainer**
- "AI Player Detection" → **RISE Action Spotter**
- `roboflow-upload-training` edge function → keep filename (avoids breaking deploys) but relabel UI references.
- Dataset Builder UI copy: remove "Roboflow" mentions; reframe as "training data for the RISE Action Spotter".
- Keep the actual Roboflow API integration available behind the scenes for staff who want to push to Roboflow as an external backup, but it's no longer the primary framing.

## 5. Review UI improvements

In the detection review screen:
- Show identity card used (description + reference image thumbnail).
- Each suggestion shows: thumbnail, AI reasoning, confidence, suggested action type, suggested clip in/out — all editable inline before accepting.
- "Wrong player" and "Wrong action" buttons (separate from generic reject) so the rejection feedback is structured and feeds the learning loop more usefully.
- Bulk accept / bulk reject by confidence band.

---

## Technical section

**Migration**
```sql
ALTER TABLE players
  ADD COLUMN identification_description text,
  ADD COLUMN identification_reference_image_url text,
  ADD COLUMN not_to_confuse_with text;

CREATE TABLE ai_detection_feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  action_type text,
  feedback_type text check (feedback_type in ('wrong_player','wrong_action','not_involved','confirmed')),
  reason text,
  created_by uuid,
  created_at timestamptz default now()
);
-- RLS: staff/admin can read+write; restrict by has_role.
```

**Files to edit**
- `src/components/staff/PlayerEditDialog.tsx` (or equivalent player edit form): add AI Identification section.
- `src/components/staff/coaching/AIPlayerDetection.tsx`:
  - Auto-load identity from player record.
  - Pass reference image + per-player confirmed clip thumbnails into the call.
  - Add frame-interval / confidence / second-pass controls.
  - Structured reject buttons writing to `ai_detection_feedback`.
  - Rename to "RISE Action Spotter".
- `supabase/functions/detect-player-actions/index.ts`:
  - Accept `referenceImageUrl`, `teamKitDescription`, `perPlayerExamples`, `perActionExamples`.
  - Two-stage prompt (team filter → player filter → action).
  - Optional second-pass verification on flagged frames only.
  - Pull persistent `ai_detection_feedback` for the player+action when building rejection history.
- `src/components/staff/DatasetBuilder.tsx`: rename UI strings to "RISE Vision Trainer".
- New helper `src/lib/aiDetectionContext.ts`: builds the identity payload from a player id + fixture id.

**Cost note**
Reference image + per-player examples + per-action examples adds tokens per run. Default to thumbnails (≤256px) to keep cost down; cap examples at 8 each.

---

## Out of scope for this plan
- Building our own model training/hosting (covered previously — staying on Lovable AI Gemini).
- Real-time live-stream detection.
- Multi-player simultaneous tracking in one run.