import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

const SIZE_CAP = 1.8 * 1024 * 1024 * 1024; // 1.8GB
const PART_TARGET = 1.5 * 1024 * 1024 * 1024; // 1.5GB target per part
const PART_DURATION_TARGET = 45 * 60; // 45 minutes max per part

export interface SplitUploadProgress {
  stage: 'compressing' | 'splitting' | 'uploading' | 'done' | 'error';
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
 * Compress a video using canvas + MediaRecorder (Balanced preset: 2.5Mbps)
 */
async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video for compression'));
    video.src = URL.createObjectURL(file);
    video.load();
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000, // Balanced preset
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100);
  video.currentTime = 0;
  await video.play();

  const duration = video.duration;

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      if (abortSignal?.aborted) {
        video.pause();
        recorder.stop();
        resolve();
        return;
      }
      if (video.ended || video.paused) {
        recorder.stop();
        resolve();
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(95, Math.round((video.currentTime / duration) * 100)));
      setTimeout(() => requestAnimationFrame(drawFrame), 16);
    };
    recorder.onstop = () => resolve();
    requestAnimationFrame(drawFrame);
  });

  // Wait for recorder to fully stop
  await new Promise<void>((resolve) => {
    if (recorder.state === 'inactive') resolve();
    else recorder.onstop = () => resolve();
  });

  URL.revokeObjectURL(video.src);
  return new Blob(chunks, { type: mimeType });
}

/**
 * Split a video blob into sequential parts using timed MediaRecorder segments.
 * Each part targets ~PART_DURATION_TARGET seconds.
 */
async function splitVideo(
  blob: Blob,
  onProgress?: (pct: number, partNum: number, totalParts: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load compressed video for splitting'));
    video.src = URL.createObjectURL(blob);
    video.load();
  });

  const duration = video.duration;
  // Estimate parts by both size and duration
  const partsBySize = Math.ceil(blob.size / PART_TARGET);
  const partsByDuration = Math.ceil(duration / PART_DURATION_TARGET);
  const totalParts = Math.max(partsBySize, partsByDuration);
  const partDuration = duration / totalParts;

  const parts: Blob[] = [];

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d')!;

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  for (let i = 0; i < totalParts; i++) {
    if (abortSignal?.aborted) break;

    const startTime = i * partDuration;
    const endTime = Math.min((i + 1) * partDuration, duration);

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    video.currentTime = startTime;
    await new Promise<void>(r => { video.onseeked = () => r(); });
    
    recorder.start(100);
    await video.play();

    await new Promise<void>((resolve) => {
      const checkFrame = () => {
        if (abortSignal?.aborted || video.currentTime >= endTime || video.ended) {
          video.pause();
          recorder.stop();
          resolve();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const partProgress = ((video.currentTime - startTime) / (endTime - startTime)) * 100;
        onProgress?.(Math.round(partProgress), i + 1, totalParts);
        setTimeout(() => requestAnimationFrame(checkFrame), 16);
      };
      recorder.onstop = () => resolve();
      requestAnimationFrame(checkFrame);
    });

    await new Promise<void>((resolve) => {
      if (recorder.state === 'inactive') resolve();
      else recorder.onstop = () => resolve();
    });

    parts.push(new Blob(chunks, { type: mimeType }));
  }

  URL.revokeObjectURL(video.src);
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
        contentType: blob.type || 'video/webm',
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
 * Main hybrid flow: compress → check size → split if needed → upload via TUS.
 * Returns either a single-part or multi-part result.
 */
export async function splitAndUpload(
  file: File,
  options: SplitUploadOptions = {}
): Promise<SplitUploadResult> {
  const { onProgress, abortSignal } = options;
  const groupId = crypto.randomUUID();

  // Stage 1: Compress
  onProgress?.({ stage: 'compressing', message: 'Compressing video...', progress: 0 });

  const compressed = await compressVideo(
    file,
    (pct) => onProgress?.({ stage: 'compressing', message: 'Compressing video...', progress: pct }),
    abortSignal
  );

  if (abortSignal?.aborted) throw new Error('Cancelled');

  // If compressed is under cap, single-part upload
  if (compressed.size <= SIZE_CAP) {
    onProgress?.({ stage: 'uploading', message: 'Uploading...', progress: 0, currentPart: 1, totalParts: 1 });

    const filePath = `${crypto.randomUUID()}.webm`;
    const publicUrl = await uploadViaTUS(
      compressed,
      filePath,
      (pct) => onProgress?.({ stage: 'uploading', message: 'Uploading...', progress: pct, currentPart: 1, totalParts: 1 }),
      abortSignal
    );

    onProgress?.({ stage: 'done', message: 'Complete', progress: 100 });
    return {
      groupId,
      parts: [{ partNumber: 1, storagePath: filePath, publicUrl }],
    };
  }

  // Stage 2: Split
  onProgress?.({ stage: 'splitting', message: 'Splitting into parts...', progress: 0 });

  const splitParts = await splitVideo(
    compressed,
    (pct, part, total) => onProgress?.({
      stage: 'splitting',
      message: `Splitting part ${part} of ${total}...`,
      progress: pct,
      currentPart: part,
      totalParts: total,
    }),
    abortSignal
  );

  if (abortSignal?.aborted) throw new Error('Cancelled');

  // Stage 3: Upload each part
  const results: SplitUploadResult['parts'] = [];

  for (let i = 0; i < splitParts.length; i++) {
    if (abortSignal?.aborted) throw new Error('Cancelled');

    const partNum = i + 1;
    onProgress?.({
      stage: 'uploading',
      message: `Uploading part ${partNum} of ${splitParts.length}...`,
      progress: 0,
      currentPart: partNum,
      totalParts: splitParts.length,
    });

    const filePath = `${crypto.randomUUID()}.webm`;
    const publicUrl = await uploadViaTUS(
      splitParts[i],
      filePath,
      (pct) => onProgress?.({
        stage: 'uploading',
        message: `Uploading part ${partNum} of ${splitParts.length}...`,
        progress: pct,
        currentPart: partNum,
        totalParts: splitParts.length,
      }),
      abortSignal
    );

    results.push({ partNumber: partNum, storagePath: filePath, publicUrl });
  }

  onProgress?.({ stage: 'done', message: 'All parts uploaded', progress: 100 });

  return { groupId, parts: results };
}
