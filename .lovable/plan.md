## Problem

The `signature-contracts` storage bucket is private, so the saved `file_url` (a public URL) returns 404. We added a signed-URL resolver, but the editor dialog still shows "Failed to load PDF":

1. Dialog opens. `selectedContract.file_url` (public URL) is passed to `PDFDocumentViewer` immediately.
2. `react-pdf` tries to load it → 404 → `onDocumentLoadError` sets `error = "Failed to load PDF…"`.
3. `resolveContractFileUrl` resolves the signed URL ~1s later. The `fileUrl` prop changes and `react-pdf` succeeds in the background, but the `error` state in `PDFDocumentViewer` is never cleared, so the error screen stays on.

Network log confirms this: the public-URL request returns 404, the signed-URL request immediately after returns 200 with a valid PDF.

## Fix

Two small, complementary changes — both in `src/components/staff/ContractSignature.tsx` and `src/components/staff/PDFDocumentViewer.tsx`.

1. **Do not pass an unusable URL to the viewer.** In `ContractSignature.tsx`, only render `PDFDocumentViewer` once `resolvedFileUrl` is set. While it is `null`, show a small loading state ("Loading document…" with a spinner) inside the same dialog body. Apply this to both the editor dialog and the owner-sign dialog.
2. **Reset error/loading state when the URL prop changes.** In `PDFDocumentViewer.tsx`, add a `useEffect` keyed on `fileUrl` that clears `error`, sets `loading = true`, and resets `numPages`/`currentPage` defensively. This guards against any future caller swapping `fileUrl` mid-flight.

No backend or schema changes. No bucket visibility change (keeping it private is correct for signed contracts).

## Verification

- Open a draft contract that previously failed → editor now waits for the signed URL, then renders the PDF and lets fields be placed.
- Open the owner-sign dialog on the same contract → same outcome.
- Switching between two different contracts in succession → the viewer no longer carries over the previous error state.

## Files

- `src/components/staff/ContractSignature.tsx` — gate viewer render on `resolvedFileUrl`, add inline loading placeholder.
- `src/components/staff/PDFDocumentViewer.tsx` — `useEffect` to reset `error`, `loading`, `numPages` when `fileUrl` changes.
