## Goal
Cut false positives substantially (currently ~3× real actions) while keeping recall on confirmed clips. Approach: layer cheap filters in front of and behind the AI, instead of just turning the model stricter.

## Why it's currently noisy
- Single-pass detection: the model decides in one shot from a small batch, with no second look.
- "Recall over precision" rule encourages flagging anything that *could* be relevant — fine for GK threats, harmful for outfield "in the area of play".
- No structured evidence requirement — the model can flag with prose like "moves towards opponent" without committing to ball involvement, action mechanic, or contact.
- Duplicate suppression is described to the model but not enforced after the fact across batch boundaries.
- Rejection feedback is global; types with chronic FPs (e.g. Defending Cross, Applied Pressure) are not penalised more than well-behaving types.

## Plan

### 1. Two-pass detection (recall pass → verifier pass)
- Keep the current call as the **candidate** pass — same recall-leaning prompt.
- Add a second **verifier** pass on each candidate: send a tighter window (the candidate frame ±1 sample) to `gemini-2.5-flash` with a strict prompt that must answer:
  - Is the target player visibly the primary actor? (yes/no + evidence)
  - For outfield: is there ball involvement OR a direct decisive off-ball action? (yes/no + which)
  - Does the action match the chosen type's visual cues? (yes/no + which cue)
  - Final verdict: keep / drop / change-action-type.
- Drop anything the verifier rejects. Replace `actionType` if it suggests a better one. Keep verifier reasoning in the description so coaches see *why*.
- Verifier runs on ~the candidate count, not all frames, so cost stays roughly flat.

### 2. Structured evidence in the candidate pass
Extend the tool schema so the model has to commit, not narrate:
- `ballInvolvement`: `on_ball` | `direct_off_ball` | `gk_threat` | `none`
- `visualCueMatched`: short string from the action's visual_cues
- `primaryActor`: boolean
Server-side rules:
- Outfield + `none` → drop.
- `direct_off_ball` is only allowed for the action types that explicitly support it (press, mark receiver, decisive run) — others drop.
- `gk_threat` only allowed when player is a goalkeeper.

### 3. Per-action-type calibration from the rejection corpus
- Compute, per action type, the rolling rejection rate (false_positive count / total flags) from `ai_player_detection_corrections` and the latest backtest.
- For types above a threshold (e.g. >50% FP), require `confidence === "high"` AND verifier "keep". For low-FP types, keep medium allowed.
- Surface these per-type thresholds in the dialog (e.g. "Defending Cross — strict mode, 73% rejection history").

### 4. Cross-batch dedupe & passage merging (server-side, post-verifier)
Currently the model is told "one passage = one moment", but batch boundaries break that. Add a deterministic merger:
- Group surviving detections within a 5s sliding window for the same player.
- Merge into one comma-separated `actionType` (matches existing rule).
- Keep the highest-confidence frame as the anchor.

### 5. Use confirmed examples as a similarity gate, not just calibration
- For each candidate, embed a tiny "is this similar in nature to the confirmed examples?" check inside the verifier prompt — the verifier has the confirmed list and must say whether the new flag matches that bar.
- A flag the verifier judges materially less involved than the *least* involved confirmed example is dropped.

### 6. Backtest reports precision per action type
- Extend backtest summary to show: per type → matched / missed / false-positive / type-mismatch counts.
- Add a "tighten this type" action that sets that type to high-only for the next scan automatically.
- This gives a feedback loop that visibly drives FPs down without you needing to change the global setting.

### 7. Smaller cheap filters (low effort, immediate)
- Drop any detection where the description is generic ("moves towards", "adjusts position") with no verb of action — regex on the `visualCueMatched` field once (2) lands.
- Cap detections per minute per player at a sane number (e.g. 8) — the model occasionally floods one passage; keep top by confidence + verifier score.
- Penalise the same `actionType` flagged 3× in 10s without a confirmed example nearby — almost always a FP loop.

## Rollout order (so we can measure)
1. Ship **(2) structured evidence** + **(7) cheap filters** — safest, immediate FP cut, no extra model calls.
2. Ship **(4) cross-batch dedupe** — pure server logic.
3. Ship **(1) verifier pass** behind a toggle, default ON. Run a backtest, compare.
4. Ship **(3) per-type calibration** + **(6) per-type backtest report** — closes the loop.
5. Ship **(5) similarity gate** last — refinement once the pipeline is stable.

## Technical notes
- All changes localised to `supabase/functions/detect-player-actions/index.ts` and `src/components/staff/coaching/AIPlayerDetection.tsx`. Backtest report extension touches the backtest summary builder in the same component.
- Verifier uses the same model (`google/gemini-2.5-flash`) — no new secrets, no new providers.
- No DB migrations required; per-type FP rates are derived on the fly from existing `ai_player_detection_corrections`.
- Persisted scan state (already in place) carries through unchanged; verifier runs inline with each batch so resume still works.

## Expected outcome
Based on the symptoms you described (167 FPs, ~50 real), I'd expect:
- (2)+(7) alone: ~30–40% FP reduction with no recall loss.
- Adding (1) verifier pass: a further ~40–50% FP reduction, ≤5% recall loss on confirmed clips.
- (3)+(6) then drives the long-tail problem types (Defending Cross, Applied Pressure) down specifically.