
Issue confirmed and reframed:
- The upload fails at the TUS creation step (POST `/storage/v1/upload/resumable`) with `413 Maximum size exceeded`.
- Session replay shows the selected file is ~4504 MB, so this is not a tiny-file/chunk retry issue.
- Current code uses `https://${projectId}.supabase.co/storage/v1/upload/resumable` with `chunkSize` changed to 5MB.
- Official storage guidance for large resumable uploads is:
  1) use the direct storage host `https://${projectId}.storage.supabase.co/...`
  2) keep `chunkSize` at exactly 6MB.

Do I know what the issue is?
- Yes: the upload path is still going through the non-direct API host, and the chunk size was changed away from the documented 6MB requirement. This combination can trigger 413 at upload creation for very large files even when bucket limits look correct.

Implementation plan:

1) Fix TUS endpoint + chunk configuration everywhere
- Update all resumable upload callers to:
  - `endpoint: https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`
  - `chunkSize: 6 * 1024 * 1024`
  - keep `uploadDataDuringCreation: false` (safer for proxy/gateway limits)
- Files:
  - `src/components/staff/coaching/VideoAnalysis.tsx`
  - `src/components/staff/AnalysisManagement.tsx`
  - `src/components/portal/PlayerMatchClipper.tsx`

2) Keep auth/header pattern consistent for large uploads
- Ensure `authorization: Bearer <user access token>` is used where session exists.
- Keep `x-upsert` explicit.
- Keep metadata unchanged (`bucketName`, `objectName`, `contentType`).

3) Raise bucket limit headroom (data update, not schema migration)
- Increase `analysis-videos` bucket file size limit from 5GB to 50GB to remove near-limit edge cases for large match files.
- This is a data update operation on bucket config, not a table structure change.

4) Add defensive preflight in upload UI
- Before starting upload, compare `file.size` against configured app-side max and show clear error if exceeded.
- Prevents long waits and confusing 413 responses.

5) Validation checklist after changes
- Upload test file around 4–4.5GB in `/staff?section=videoanalysis`.
- Confirm no immediate 413 on create request.
- Confirm progress advances past first chunks and completes.
- Confirm inserted analysis row includes a valid public URL.
- Repeat one upload in `AnalysisManagement` and one in `PlayerMatchClipper` for parity.

Technical notes:
- The bucket limit already appears set to ~5GB, but that alone is not sufficient when the endpoint/transport path is not optimal for large resumable uploads.
- We will not change generated integration files.
- No database schema migration is required for this fix.
