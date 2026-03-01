import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

const SIZE_CAP = 1.8 * 1024 * 1024 * 1024; // 1.8GB

export interface SplitUploadProgress {
  stage: 'splitting' | 'uploading' | 'done' | 'error';
  message: string;
  progress: number; // 0-100
  currentPart?: number;
  totalParts?: number;
}

export interface SplitUploadResult {
  groupId: string;
  parts: { partNumber: number; storagePath: string; publicUrl: string }[];
}

interface SplitUploadOptions {
  onProgress?: (p: SplitUploadProgress) => void;
  abortSignal?: AbortSignal;
}

/**
 * Check if a file needs the hybrid flow (> 1.8GB)
 */
export function needsHybridUpload(file: File): boolean {
  return file.size > SIZE_CAP;
}

/**
 * Split a file into binary chunks of ~1.5GB each.
 * This is instant — no re-encoding, no canvas, no MediaRecorder.
 */
function splitFileIntoChunks(file: File): Blob[] {
  const CHUNK_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB per part
  const parts: Blob[] = [];
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    parts.push(file.slice(offset, end, file.type));
    offset = end;
  }
  return parts;
}

/**
 * Upload a single blob via TUS resumable upload. Returns the public URL.
 */
async function uploadViaTUS(
  blob: Blob,
  filePath: string,
  onProgress?: (pct: number) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Please sign in again before uploading');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'analysis-videos',
        objectName: filePath,
        contentType: blob.type || 'video/mp4',
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (error) => reject(new Error(`Upload failed: ${error.message}`)),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => {
        const { data: urlData } = supabase.storage
          .from('analysis-videos')
          .getPublicUrl(filePath);
        resolve(urlData.publicUrl);
      },
    });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        upload.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    upload.start();
  });
}

/**
 * Main flow: instantly split the file into chunks, then upload each via TUS.
 * No compression, no re-encoding — just binary slicing.
 */
export async function splitAndUpload(
  file: File,
  options: SplitUploadOptions = {}
): Promise<SplitUploadResult> {
  const { onProgress, abortSignal } = options;
  const groupId = crypto.randomUUID();

  // Instant binary split
  onProgress?.({ stage: 'splitting', message: 'Splitting file...', progress: 0 });
  const parts = splitFileIntoChunks(file);
  onProgress?.({ stage: 'splitting', message: `Split into ${parts.length} parts`, progress: 100, totalParts: parts.length });

  if (abortSignal?.aborted) throw new Error('Cancelled');

  // Upload each part
  const results: SplitUploadResult['parts'] = [];
  const ext = file.name.split('.').pop() || 'mp4';

  for (let i = 0; i < parts.length; i++) {
    if (abortSignal?.aborted) throw new Error('Cancelled');

    const partNum = i + 1;
    onProgress?.({
      stage: 'uploading',
      message: `Uploading part ${partNum} of ${parts.length}...`,
      progress: 0,
      currentPart: partNum,
      totalParts: parts.length,
    });

    const filePath = `${crypto.randomUUID()}.${ext}`;
    const publicUrl = await uploadViaTUS(
      parts[i],
      filePath,
      (pct) => onProgress?.({
        stage: 'uploading',
        message: `Uploading part ${partNum} of ${parts.length}...`,
        progress: pct,
        currentPart: partNum,
        totalParts: parts.length,
      }),
      abortSignal
    );

    results.push({ partNumber: partNum, storagePath: filePath, publicUrl });
  }

  onProgress?.({ stage: 'done', message: 'All parts uploaded', progress: 100 });

  return { groupId, parts: results };
}
