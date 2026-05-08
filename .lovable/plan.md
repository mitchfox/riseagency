Three independent workstreams. Each can be shipped on its own.

---

## 1. Roboflow audit & training pipeline

### Current state (as built)
- `supabase/functions/process-video-frames`: client extracts JPEG frames at N fps (1–30) from a video, sends batches of 10 to a single Roboflow model defined by `ROBOFLOW_MODEL_URL` + `ROBOFLOW_API_KEY`. Returns class, confidence, bbox, and a derived 18-zone / 162-sub-zone position. Confidence threshold 40, overlap 30. No tracking IDs (purely per-frame detections).
- `RoboflowTracking.tsx` (coaching VideoAnalysis): triggers extraction, displays detections at the current timestamp, and feeds `generateActionSuggestions` (rule-based, not ML) to suggest action types from object positions.
- `DatasetBuilder.tsx`: pulls every `performance_report_actions` row with a `video_url`, lets staff scrub frames, draw bounding boxes (`DatasetAnnotationCanvas`), and exports a YOLO zip locally. There is **no upload to Roboflow** today — export is manual.
- No player re-ID model. The current model only outputs generic classes (ball, player, etc.) — there is no per-player identity.

### What this plan delivers

**A. Audit report (no code, written into chat after exploration):**
- Confirm which Roboflow project/version the URL points to, list its classes, and document confidence/overlap defaults.
- Verify clipping accuracy by running 3 sample game clips through the pipeline and comparing detected actions against the manually tagged `action_type` on the same clip.
- Document failure modes (frame rate too low, occlusion, kit colour confusion, broadcast vs tactical camera).

**B. Auto-feed training data from existing clips:**
- New edge function `roboflow-upload-training-image` that POSTs an image + YOLO annotations to `https://api.roboflow.com/dataset/{workspace}/{project}/upload` using the existing `ROBOFLOW_API_KEY`. Adds two new secrets: `ROBOFLOW_WORKSPACE`, `ROBOFLOW_PROJECT`.
- DatasetBuilder gets a "Push to Roboflow" button next to the local zip export. Each pushed frame is marked `exported = true` and a new `roboflow_uploaded_at` column on `dataset_frames` records the upload.
- New "Bulk seed from action clips" job: for each `performance_report_actions` row with a `video_url` that hasn't been seeded, capture the midpoint frame, label it with `action_type` as a class tag, and queue it for upload (annotations stay empty until staff draws bboxes — Roboflow accepts unannotated images for the annotation queue).

**C. Player re-identification track:**
- New `dataset_player_crops` table: id, player_id, source_action_id, image_url, bbox, created_at.
- New "Tag player crops" panel inside DatasetBuilder: for each existing action clip, capture the centred player crop using the action's `action_number`/notes plus a manual selector. Crops upload to a separate Roboflow project (`ROBOFLOW_PLAYER_REID_PROJECT`) configured for classification.
- Inference path: extend `process-video-frames` to optionally call the re-ID model on each detected player bbox and return the most-likely `player_id`. Surfaced as a small badge on each detection in `RoboflowTracking`.

### Out of scope (not in this plan)
- Training the model itself — that happens inside Roboflow's UI once data is uploaded.
- Real-time tracking / Bytetrack-style ID continuity across frames.

---

## 2. Role permissions editor improvements

### Issues
- Labels (`role_label`) are not editable after creation.
- New roles never appear in the contact-form / inbound-email role dropdown (the option list in `send-form-email` and any onboarding form is hardcoded; needs to read from `available_roles`).
- `role_permissions` is missing many sections that exist in `Staff.tsx`. Confirmed gaps include: `dashboard`, `visionboard`, `docs`, `sheets`, `goalstasks`, `casestudies`, `transferreports`, `interactionhistory`, `requests`, `portalmanagement`, `marketingschedule`, `publiccontent`, `contentcreator` (label-only), `marketingideas` (label-only), `salesdeck`, `designstudio`, `annotations`, `videoanalysis`, `streams`, `videocompressor`, `highlightcompiler`, `musicstudio`, `coachingdata`, `strengthpower`, `nutrition`, `psychology`. Header sections (`header_*`) are present.
- "Role loads correctly with just what it's supposed to show on login" — today, `useRolePermissions` defaults `can_view` to `false`, but on Staff.tsx the navigation pre-renders sections before permissions resolve, briefly flashing items. Need to gate the staff sidebar on `loading === false` and only then render the filtered list.

### Changes

- **Edit role label inline**: small pencil icon next to each TabsTrigger opens a popover with `role_label` + `description` inputs. Updates `available_roles` row. Role key stays immutable (changing it would break enum + existing user_roles rows).
- **Sync sections**: build a single canonical `STAFF_SECTIONS` constant (id, title, category) used by both `Staff.tsx` and a new migration that upserts one `role_permissions` row per (role × section). Migration reseeds missing sections for all roles with `can_view = false, can_edit = false` (admin keeps full access via existing logic).
- **Role dropdown sources `available_roles`**: any form / edge function that lets a visitor pick a role (contact form, request representation, signup) reads from `available_roles` at render time. `send-form-email` already accepts free-text `form_type`, so the change is purely client-side.
- **Login gating**: in the staff portal entry, defer rendering the section nav until `useRolePermissions` finishes loading. Per project memory, `expandedSection` already initialises as `null` to avoid flashes — extend the same pattern to the section list itself.

---

## 3. Annotation: keep the just-added annotation selected

### Issue
After drawing an annotation, the sidebar swaps the selection to a different element (or clears it). Root causes in `AnnotationEditor.tsx`:
- `handleToolUsed` (line 761) reads `klips` from a stale closure when picking "the last element", so on rapid placements it can select a previously-existing element.
- `saveDrawing` (line 715) explicitly calls `setSelectedId(null)` on save, which is fine for "save and exit" but the user expects the just-drawn annotation to remain selected if they exit drawing mode without saving, or to be re-selected on the resumed timeline.

### Fix
- Switch `handleToolUsed` to a ref-based read (`klipsRef.current`) so it always sees the latest klip elements, and capture the new element id from `setElements`'s functional updater rather than a post-tick lookup.
- After `saveDrawing`, restore `selectedId` to the id of the element that was just added (track it via `lastDrawnIdRef`). Only clear the selection on `cancelDrawing` or when the user explicitly clicks empty canvas.
- Never let the keyframe / list panels call `setSelectedId` to anything other than the element the user clicked. Audit the three call sites (lines 1264, 1379, 1436) to ensure none of them auto-fire on render.

---

## Technical notes

- All new Roboflow calls go through edge functions so the API key never reaches the browser.
- New tables (`dataset_player_crops`, new column on `dataset_frames`) get RLS limited to authenticated staff — same policy pattern as existing `dataset_frames`.
- Section seeding is a single migration; data backfill uses the insert tool, not migrations.
- No design-token changes; UI additions reuse existing button/dialog/popover variants.
