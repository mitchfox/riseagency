# Remove the broken split path — upload 4 GB files as a single object

## Root cause recap

`splitAndUpload` binary-slices the file into 1 GB chunks. Only chunk 1 is a valid MP4; chunks 2+ are header-less byte tails so the `<video>` shows grey. The 1.8 GB `needsHybridUpload` gate is what diverts large files into this broken path. Files under 1.8 GB already go through the normal single-object TUS path and play fine — there is no reason 4 GB files cannot do the same. Supabase Storage's resumable TUS endpoint already supports objects far beyond 4 GB; the existing TUS uploader in `VideoAnalysis.tsx` resumes, retries, and reports progress.

## Changes

### 1. `src/components/staff/coaching/VideoAnalysis.tsx`
- Delete the `if (needsHybridUpload(currentFile)) { ... continue; }` block (lines ~568–628).
- Remove the `splitAndUpload`, `needsHybridUpload`, `SplitUploadProgress` imports and the `showHybridModal`, `hybridProgress`, `hybridAbortRef` state plus the modal JSX that renders them.
- Every file — regardless of size — flows through the existing single TUS upload (the block starting at line 630). That same code path is what already works for the user's 1–2 GB uploads.

### 2. `src/lib/videoSplitUpload.ts`
- Delete the file. Nothing else in the codebase imports it (only `VideoAnalysis.tsx` did).

### 3. Existing already-split videos
- Leave `group_id` / `part_number` / `total_parts` columns and the Prev/Next "Part N of M" UI in place so the user can still click through historical broken uploads if needed, but no new rows will ever be created with those values set.
- No migration, no data backfill — the user said treat this like the 1–2 GB files that already work, so we simply stop producing more split rows.

## Technical notes

- The single TUS path uses 6 MiB chunks with `retryDelays: [0, 3000, 5000, 10000, 20000]`, `uploadDataDuringCreation: false`, and `removeFingerprintOnSuccess: true`. That is already configured to survive long uploads and resume after network blips, which is what makes multi-GB uploads reliable.
- `chunkSize` here is the TUS PATCH chunk size, not file splitting — the file is still stored as one object in `analysis-videos`.
- No new tables, no new buckets, no edge functions, no toasts, no fallbacks.

## Out of scope
- Reassembly UI for legacy split rows (per your instruction).
- Server-side transcoding.
