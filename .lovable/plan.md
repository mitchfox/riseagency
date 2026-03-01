

# Fix large file uploads using resumable (TUS) uploads

## The problem

The current upload uses a single XHR POST request to send the entire file in one go. For large files (4GB), this hits server-side payload limits or connection timeouts — the progress bar reaches 100% (all bytes sent) but the server rejects or times out on the response, causing a failure.

## The solution

Replace the XHR upload with **Supabase's TUS resumable upload protocol**. This splits the file into 6MB chunks, uploads each individually, and can resume from where it left off if interrupted. Supabase Storage supports files up to 50GB this way.

### What changes

**1. Install `tus-js-client`** — the official TUS protocol client library.

**2. Update `VideoAnalysis.tsx` upload logic** (lines ~256-301)

Replace the current XHR-based `new Promise` block with a TUS upload:

```typescript
import * as tus from 'tus-js-client';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const upload = new tus.Upload(uploadFile, {
  endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
  retryDelays: [0, 3000, 5000, 10000, 20000],
  headers: {
    authorization: `Bearer ${token}`,
    'x-upsert': 'false',
  },
  uploadDataDuringCreation: true,
  removeFingerprintOnSuccess: true,
  metadata: {
    bucketName: 'analysis-videos',
    objectName: filePath,
    contentType: uploadFile.type || 'video/mp4',
  },
  chunkSize: 6 * 1024 * 1024, // 6MB chunks
  onError: (error) => reject(error),
  onProgress: (bytesUploaded, bytesTotal) => {
    setUploadedBytes(bytesUploaded);
    setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
  },
  onSuccess: () => {
    const { data } = supabase.storage
      .from('analysis-videos')
      .getPublicUrl(filePath);
    resolve(data.publicUrl);
  },
});
upload.start();
```

- Progress tracking works the same way (bytes uploaded / total)
- Automatic retry on chunk failure with exponential backoff
- The rest of the function (DB insert, state management) stays identical

**3. Update `AnalysisManagement.tsx`** — apply the same TUS pattern to the two `supabase.storage.upload()` calls there (lines ~544 and ~574) so those uploads also handle large files. These can use the simpler Supabase JS client approach since they don't need granular progress.

**4. Update `player-match-clipper` edge function** — the player-side upload goes through the edge function as multipart form data, which has a ~50MB limit. Change it to: client uploads to storage first, then sends the storage path to the edge function. This mirrors the pattern already used for staff uploads.

### Files to modify
- `src/components/staff/coaching/VideoAnalysis.tsx` — replace XHR with TUS
- `src/components/staff/AnalysisManagement.tsx` — replace direct storage uploads with TUS
- `supabase/functions/player-match-clipper/index.ts` — remove multipart handling, accept storage path instead
- `package.json` — add `tus-js-client` dependency

