You are right. Backtest should test whether the general detection logic works, not create video-specific rules. I will remove the idea of same-video suppression as the main learning mechanism and make the system learn from patterns across all labelled examples.

Plan:

1. Replace “learning as timestamp memory” with cross-video pattern learning
- Stop treating a repeat backtest on the same video as the primary learning signal.
- Keep saving backtest rows, but use them as labelled examples of situations:
  - confirmed action examples
  - wrong action examples
  - not involved examples
  - wrong player examples
- Feed those examples back into future scans by action type and outcome, across videos, not just by video timestamp.

2. Build a real action-type decision stage
- First pass becomes object and scene extraction, not final action labelling.
- Second stage classifies the candidate against the action definitions and historical examples.
- For each action type, the model receives:
  - definition
  - visual cues
  - confirmed examples
  - common false-positive examples
  - common wrong-action confusions
- This should teach “this looks like Applied Pressure but was actually Overlapping Run” as a reusable distinction, not just block one timestamp.

3. Stop Gemini inventing actions from loose frame descriptions
- The prompt will no longer ask Gemini to freely spot actions from raw frames alone.
- It must answer against a grounded candidate:
  - target player visible or not
  - ball visible or not
  - nearby players or not
  - relative movement or not
  - action type candidate
- If the required objects or movement cues are not present, reject.

4. Add Roboflow object grounding before Gemini
- Implement the Roboflow workflow call server-side in the existing backend function, not in frontend code and not using Python.
- Use Roboflow to detect objects/classes such as Player, Football and shirt-number/object cues where available.
- Pass Roboflow detections into the AI prompt as structured evidence for each frame.
- Gemini then judges action type using object positions and frame context, instead of hallucinating from a single image.

Technical equivalent of your Roboflow snippet:
- Use `ROBOFLOW_API_KEY` as a backend secret.
- Add backend config for:
  - `ROBOFLOW_WORKSPACE`
  - `ROBOFLOW_WORKFLOW_ID`
- Call:
  - `https://serverless.roboflow.com/{workspace}/workflows/{workflow_id}` or the correct serverless workflow endpoint supported by Roboflow
- Send the frame image and parameters:
  - `classes: "Player, Football, 3"`
  - cache workflow definition where supported
- Return bounding boxes/classes/confidence into the detection pipeline.

5. Use Roboflow results as a hard sanity check
- If Roboflow sees no football and the action requires ball interaction, reject.
- If Roboflow sees no plausible player object for the target player, reject.
- If the claimed action depends on contact, pressure, tackle, pass or clearance, require the relevant player and ball/player proximity evidence.
- This reduces cases like “Pass” where there is clearly no pass happening.

6. Make backtest measure general logic only
- Backtest continues to compare against confirmed clips and action types.
- It will not add video-specific suppression as a success path.
- It will report whether the general classifier improves after learning records are added.
- The UI will clearly distinguish:
  - examples loaded from all history
  - false-positive patterns loaded
  - Roboflow-grounded frames
  - backtest outcomes saved for future runs

7. Keep same-video records only as normal training data
- Same-video feedback can still be saved, because it is a labelled example.
- It will not be used as “block this exact timestamp”.
- It will be used only as a positive or negative example when future clips look similar.

Files to update after approval:
- `supabase/functions/detect-player-actions/index.ts`
- `src/components/staff/coaching/AIPlayerDetection.tsx`
- possibly `supabase/functions/process-video-frames/index.ts` if we reuse the existing Roboflow path

Secrets needed:
- `ROBOFLOW_API_KEY`
- `ROBOFLOW_WORKSPACE`
- `ROBOFLOW_WORKFLOW_ID`

If any are missing, I will request them through the backend secret flow before implementing the Roboflow call. No API key will be put in the code.