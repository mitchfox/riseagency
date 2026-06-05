## Add "Upload hand-signed copy" option to SignContract

Inside the existing `More Options` collapsible (next to the Print button on `src/pages/SignContract.tsx`), add a second action that lets the signer return a scanned/photographed copy of the printed-and-signed document back to us.

### UX
- Under the existing "Print to sign by hand" button, add:
  - Short helper line: "Already signed on paper? Upload a scan or photo and we'll attach it to the contract."
  - A `Button` (outline) labelled **"Upload signed copy"** with an `Upload` icon, which triggers a hidden `<input type="file" accept="application/pdf,image/*">`.
  - After the user picks a file: show filename + size, a `Send to RISE` button, and a spinner state.
  - Success: toast "Signed copy received" and collapse back; replace the row with a small "Uploaded ✓" confirmation. Counterparty stays on the page (does not auto-mark as signed via e-sign flow — this is the offline path).

### Storage & backend
- Reuse existing `signature-contracts` private bucket. Upload path: `manual-uploads/{contract_id}/{submission_uuid}.{ext}`.
- New edge function `submit-manual-signed-copy` (service role) that:
  1. Validates `contract_id`, accepts base64 file + filename + mime + signer name/email.
  2. Verifies contract exists and `status = 'active'`.
  3. Uploads to storage, hashes (SHA-256) the bytes.
  4. Inserts a row into `signature_submissions` with `submission_type = 'manual_upload'`, `signed_pdf_url` = uploaded path, `signed_pdf_hash`, `intent_consent_at = now()`, `field_values = {}`, `ip_address`, `user_agent`.
  5. Returns `{ ok, submission_id }`.
- Migration: add nullable `submission_type text default 'electronic'` column to `signature_submissions` (constrained to `'electronic' | 'manual_upload'`).
- Staff `ContractSignature.tsx` already lists submissions — manual uploads will appear automatically; a small "Manual upload" badge will be shown when `submission_type = 'manual_upload'` and clicking it downloads the file from the bucket via a signed URL (handled in a follow-up if needed — current view already renders signed_pdf_url links).

### Files touched
- `supabase/migrations/<new>.sql` — add `submission_type` column.
- `supabase/functions/submit-manual-signed-copy/index.ts` — new function.
- `supabase/config.toml` — register function as public (no JWT, like `record-signature-submission`).
- `src/pages/SignContract.tsx` — new UI block inside `CollapsibleContent`, file input ref, upload handler calling the new function.
- `src/components/staff/ContractSignature.tsx` — small "Manual upload" badge on submission rows where `submission_type === 'manual_upload'` (visual only).

### Notes
- 20MB client-side size cap before base64 encoding.
- This is independent of the existing electronic signing flow; uploading does not lock fields or require all e-sign fields to be filled.
- Mandate / Proof of Mandate flow is unaffected.
