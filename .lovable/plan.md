## Mandate flag on contracts + Proof of Mandate download

### What's being added
1. A toggle on each signature contract marking it as a **Mandate**.
2. After the counterparty signs, if the contract is flagged as a mandate, they're offered a **Download Proof of Mandate** button alongside the existing full PDF download. The Proof PDF contains only the **first page** and **last page** of the fully signed document (with all signatures overlaid).

### Changes

**Database (migration)**
- Add `is_mandate boolean default false` to `signature_contracts`.

**Staff contract editor (`ContractSignature.tsx`)**
- Add a "Mark as Mandate" toggle in the contract settings/header. Persists to `signature_contracts.is_mandate`.

**PDF export (`src/lib/pdfExport.ts`)**
- Add `exportProofOfMandatePDF(pdfUrl, fields, audit?)` that renders only page 1 and the final page (with signature/field overlays), then appends the audit page. Reuses the existing per-page render logic.

**Sign flow (`src/pages/SignContract.tsx`)**
- After successful signing, if `contract.is_mandate === true`, show a second action button: **Download Proof of Mandate** next to the existing download/print actions.
- `get-signature-contract` edge function already returns the full contract row, so `is_mandate` will flow through automatically once the column exists.

### Notes
- Proof of Mandate is purely a client-side render of the same signed file the counterparty already sees, so no extra storage or backend work is needed.
- Single-page contracts: Proof PDF will just contain that one page plus the audit log.
- This is independent from the staff Mandate Tracker (clubs/agents) — that one stays as-is.