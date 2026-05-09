## You're right — the prompt is the wrong shape

The current prompt is full of position-specific rules (especially for goalkeepers) and "ball involvement" gates. That's why GKs flood and outfielders sometimes get under-flagged. The actual task is much simpler and is the same for every position:

> For each frame, is this specific player performing one of the listed actions? If yes, which one?

Two questions. Nothing about ball involvement categories, nothing about "threats", nothing about position-specific carve-outs. The action definitions in the database already say what counts as that action — the model's only job is to match what it sees against those definitions.

## Plan

### 1. Rewrite the prompt around the actual task

Strip the prompt back to:

- **Step 1 — Player identification.** Use the reference image, kit description and shirt number. If you cannot confidently identify this player in this frame, skip the frame. Same for every position.
- **Step 2 — Action match.** From the supplied list of action types (with their definitions and visual cues), is this player performing exactly one of them in this frame? If yes, name it. If no, skip.

Remove all of:
- The goalkeeper carve-outs ("threat is a trigger", "constantly in the action", etc.)
- The `ballInvolvement` enum and the server-side gate built on it
- "Recall over precision" — replaced with "only flag what you can name from the list"
- The generic-prose regex (it was a workaround for the bad prompt)

The only structured field the model still has to return is `visualCueMatched`: one short phrase from that action type's `visual_cues` that the model can actually see in the frame. Empty string → drop. This is position-agnostic and forces the model to ground every flag in the action's own definition.

### 2. Use the corrections corpus properly — as data, not prose

You already have thousands of confirmed examples and rejections sitting in `ai_player_detection_corrections`. Right now the function takes the last 20, formats them as English bullet points and pastes them into the prompt. That's why "learning records" feels fake — it is.

Two real uses:

**a. Hard blocklist for repeat false positives.** Before returning detections, the function queries `ai_player_detection_corrections` for this video + this player + status `false_positive` and `not_involved`. Any new candidate within ±3s of a known FP timestamp is dropped. This is the change that makes re-running a backtest visibly different from the first run.

**b. Positive examples per action type, drawn from across all videos.** For each action type the player is being scanned for, fetch up to 5 confirmed examples for that action type (any player) and include their `description` text in the prompt under that action type. So when the model considers "Pass", it sees: the database definition + visual cues + 5 real coach-confirmed descriptions of "Pass" looking the way they do. This is the closest honest version of "thousands of examples teaching it".

Cap total prompt growth at a sensible budget so we don't blow context (5 examples × ~25 types = ~125 short lines, fine).

### 3. Surface that the loop is real

In the live counter, alongside "Saved N learning records":
- "Blocked N candidates from past corrections"
- "Loaded N example actions" and "Loaded N past rejections for this video"

So you can see at a glance whether the corpus is doing anything.

### 4. Backtest report — per action type

Group the summary by action type so you can see which types are misbehaving:
```
Pass            matched 14   missed 1   FP 0
Defending Cross matched 1    missed 2   FP 41
Defensive Pos.  matched 0    missed 0   FP 27
```
Plus a "block this type for this player" button per row that adds a temporary suppression.

### 5. What gets removed

- All position-specific branches in the prompt
- The `ballInvolvement` server-side gate
- The "GK exemption" on the generic-prose filter
- The 20-record prose rejection list (replaced by the structured uses in step 2)

## Files

- `supabase/functions/detect-player-actions/index.ts` — prompt rewrite, drop the gates, query corrections corpus + confirmed-examples-per-type, hard blocklist filter, return blocklist counts.
- `src/components/staff/coaching/AIPlayerDetection.tsx` — surface the new counters, per-type backtest summary, "block this type" action.

No DB migrations.

## Expected outcome

- For the GK backtest you've been running: the noise comes from the prompt encouraging passive flags. Removing that should drop FPs from ~150 to a small number based on actual ball events the GK is involved in.
- For outfielders: should be unchanged or slightly better, because the prompt is no longer cluttered with GK rules and the per-type confirmed examples now teach it what "your" coaches mean by Pass / Dribble / Press / etc.
- Re-running a backtest on a video already corrected: visibly fewer FPs every time you correct, because past corrections are now hard blocks rather than prose hints.

## What I am explicitly not doing

- Adding a verifier second pass yet — let's see what the corrected prompt does on its own first. If FPs are still high after this, the verifier becomes worth its cost; right now it would mostly verify the same nonsense.
- Tightening to "high only" — the per-action-type confirmed examples replace that crude lever.