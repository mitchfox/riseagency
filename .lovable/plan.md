## Goal

Bring the contract signing tool up to UK e-signature evidentiary standards: clear intent, full audit trail, version lock, and immutable signed PDF retrieval.

## Current state audit

| Requirement | Status | Gap |
|---|---|---|
| Clear intent to sign electronically | Partial | Name + email + drawn/uploaded signature are captured, but there is no explicit "I intend to sign electronically" consent checkbox or legal blurb on the signing page. |
| Timestamp | OK | `signature_submissions.signed_at` is set server-side. |
| IP address | Missing | Column exists but is never populated (client cannot read its own real IP — submission goes direct from browser). |
| User agent | OK | Captured on submit. |
| Document version control | Missing | If staff replace `file_url` or edit fields after a link is sent, signed copies can drift. No hash/version snapshot stored against a submission. |
| Unique document version lock once sent | Missing | Nothing prevents editing `file_url`, `signature_fields`, or `owner_field_values` after status flips to `active`. |
| Retrieve exact signed PDF unchanged | Missing | `completed_pdf_url` column exists but is unused. PDF is regenerated client-side on demand from the live `file_url` + current field values, so the same submission could render differently later. |

## Changes

### 1. Capture IP + richer audit on submit
- New edge function `record-signature-submission` (verify_jwt = false): receives signer name/email/field values/contract id, reads IP from `x-forwarded-for`, inserts the row server-side with `ip_address`, `user_agent`, `signed_at`, plus a new `intent_consent_at` timestamp and `document_hash` snapshot (see #3).
- Replace the direct `supabase.from('signature_submissions').insert(...)` call in `SignContract.tsx` with this function.

### 2. Explicit intent-to-sign consent
- Add a required checkbox above the Submit button: "I agree to sign this document electronically and acknowledge my electronic signature is legally binding (UK Electronic Communications Act 2000)."
- Block submit until ticked. Pass `intent_consent: true` to the edge function (recorded with timestamp).

### 3. Document version lock
- Migration: add `signature_contracts.locked_at timestamptz`, `signature_contracts.document_hash text`, `signature_contracts.locked_file_url text`, `signature_contracts.locked_fields_snapshot jsonb`.
- When a contract is first set to `active` (or first share link generated), an edge function `lock-signature-contract` copies the PDF from the current `file_url` into `signature-contracts/locked/{id}.pdf`, computes SHA-256 of the bytes, snapshots the current `signature_fields` rows + `owner_field_values` into `locked_fields_snapshot`, and stores hash + locked URL + lock time.
- RLS / trigger: once `locked_at IS NOT NULL`, block UPDATE to `file_url`, `owner_field_values` and DELETE/INSERT/UPDATE on `signature_fields` for that contract via a `BEFORE` trigger. Staff who need to change a locked contract must clone it (new row, new share token).
- `SignContract.tsx` and `get-signature-contract` edge function load from `locked_file_url` and `locked_fields_snapshot` when present, falling back to live values only for unlocked drafts.
- Add `signature_submissions.document_hash text` so each submission records the exact PDF hash it was signed against.

### 4. Immutable signed PDF storage
- After `record-signature-submission` writes the row, it generates the final flattened PDF server-side (using pdf-lib in Deno) by overlaying the locked snapshot field values + counterparty values onto the locked PDF, uploads it to `signature-contracts/signed/{submission_id}.pdf`, and stores the path on a new `signature_submissions.signed_pdf_url` column plus `signed_pdf_hash`.
- The "Download Signed PDF" button on the success screen and any staff-side download fetches `signed_pdf_url` directly instead of regenerating client-side. The original client-side `downloadSignedContractPDF` becomes a fallback only for legacy submissions without `signed_pdf_url`.
- Staff contract detail view gains a "Download original (locked) PDF" and "Document hash: …" line so integrity can be independently verified.

### 5. Staff-visible audit panel
- In `ContractSignature.tsx` (staff side), each submission row shows: signer name/email, signed_at, ip_address, user_agent, intent consent timestamp, document hash matched (✓/✗ vs current `locked_file_url` hash), and direct link to the stored signed PDF.

## Technical notes

- Storage bucket `signature-contracts` already exists (private). Add two prefixes by convention: `locked/` and `signed/`. No bucket policy changes needed because access stays via signed URLs from edge functions.
- Hash: SHA-256 hex of the raw PDF bytes, computed in Deno via `crypto.subtle.digest`.
- Server-side PDF flattening in Deno: `pdf-lib` from `https://esm.sh/pdf-lib`. Signature images are PNG data URLs decoded and embedded; text/date fields drawn with the standard Helvetica font scaled to field height (mirrors the existing client logic).
- Trigger to enforce lock:
  ```sql
  CREATE FUNCTION enforce_signature_contract_lock() RETURNS trigger ...
  -- raises if locked_at IS NOT NULL and protected columns changed
  ```
- New edge functions: `record-signature-submission`, `lock-signature-contract`. Both use the service role key.
- No new third-party services or secrets required.

## Files touched

- supabase/migrations/<new>.sql — new columns, lock trigger
- supabase/functions/lock-signature-contract/index.ts — new
- supabase/functions/record-signature-submission/index.ts — new
- supabase/functions/get-signature-contract/index.ts — return locked URL/fields when present
- src/pages/SignContract.tsx — consent checkbox, call new edge function, download from `signed_pdf_url`
- src/components/staff/ContractSignature.tsx — trigger lock on activate, audit panel, hash display
- src/lib/pdfExport.ts — kept as legacy fallback only

## Out of scope

- Two-factor signer identity (SMS/email OTP) — can be added later if you want stronger non-repudiation.
- Qualified electronic signatures (eIDAS QES) — requires a third-party trust service provider; flag if you ever sign with EU counterparties who insist on it.