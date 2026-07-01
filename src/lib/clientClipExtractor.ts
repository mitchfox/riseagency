import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

export interface CropPercent {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const hasCrop = (c?: CropPercent | null) =>
  !!c && (c.top > 0 || c.right > 0 || c.bottom > 0 || c.left > 0);

/**
 * Trim a clip from a source video and upload it.
 *
 * Strategy:
 *  1. Try server-side FFmpeg stream-copy (instant, lossless).
 *  2. Fall back to client-side canvas capture if the server call fails.
 */
export async function trimAndUploadClip(
  sourceUrl: string,
  clipId: string,
  start: number,
  end: number,
  onProgress?: (msg: string) => void,
  crop?: CropPercent | null
): Promise<string> {
  // ── 1. Check size & attempt server-side trim (preferred) ──
  // Crops require re-encoding, so we skip the fast server stream-copy path.
  const cropActive = hasCrop(crop);
  if (!cropActive) {
  try {
    // Quick HEAD check to skip server call for large files
    let skipServer = false;
    try {
      const head = await fetch(sourceUrl.split("#")[0], { method: "HEAD" });
      const size = parseInt(head.headers.get("content-length") || "0", 10);
      if (size > 200 * 1024 * 1024) {
        console.log(`Source ${(size / 1048576).toFixed(0)}MB exceeds server limit, using client encoder`);
        skipServer = true;
      }
    } catch {
      // HEAD failed, try server anyway
    }

    if (!skipServer) {
      onProgress?.("Trimming on server...");
      const { data, error } = await invokeEdgeFunction<{ url: string }>(
        "trim-video-clip",
        { body: { sourceUrl, start, end, clipId } }
      );

      if (!error && data?.url) {
        onProgress?.("Done");
        return data.url;
      }

      console.log("Server trim unavailable, using client encoder:", error?.message);
    }
  } catch (err) {
    console.log("Server trim unavailable, using client encoder:", err);
  }
  }

  // ── 2. Client-side canvas fallback with retry ──
  let lastErr: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) onProgress?.(`Retrying (attempt ${attempt + 1})...`);
      return await clientSideTrim(sourceUrl, clipId, start, end, onProgress, crop);
    } catch (err) {
      lastErr = err;
      console.warn(`Client trim attempt ${attempt + 1} failed:`, err);
    }
  }
  throw lastErr;
}

/**
 * Original canvas + MediaRecorder approach.
 * Plays the segment in real-time and re-encodes it as WebM.
 */
async function clientSideTrim(
  sourceUrl: string,
  clipId: string,
  start: number,
  end: number,
  onProgress?: (msg: string) => void,
  crop?: CropPercent | null
): Promise<string> {
  const TIMEOUT_MS = 120_000; // 2 minute hard timeout
  const cleanUrl = sourceUrl.split("#")[0];

  return Promise.race([
    _doClientSideTrim(cleanUrl, clipId, start, end, onProgress, crop),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Client-side trim timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
    ),
  ]);
}

async function _doClientSideTrim(
  cleanUrl: string,
  clipId: string,
  start: number,
  end: number,
  onProgress?: (msg: string) => void,
  crop?: CropPercent | null
): Promise<string> {

  onProgress?.("Loading video...");

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.preload = "auto";
  video.src = cleanUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load source video"));
    setTimeout(() => reject(new Error("Video load timeout")), 30000);
  });

  const cropActive = hasCrop(crop);

  // Prefer direct captureStream on the video element (no canvas quality loss)
  // Crop always requires the canvas path so we can change output dimensions.
  const useDirectCapture = !cropActive && typeof (video as any).captureStream === "function";

  let stream: MediaStream;
  let canvasIntervalHandle: ReturnType<typeof setInterval> | null = null;

  if (useDirectCapture) {
    // Use 0 to capture every painted frame at the video's native rate
    stream = (video as any).captureStream(0);
  } else {
    // Canvas fallback (also used when a crop is active)
    const canvas = document.createElement("canvas");
    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    const cLeft = cropActive ? (crop!.left / 100) * srcW : 0;
    const cTop = cropActive ? (crop!.top / 100) * srcH : 0;
    const cRight = cropActive ? (crop!.right / 100) * srcW : 0;
    const cBottom = cropActive ? (crop!.bottom / 100) * srcH : 0;
    const outW = Math.max(2, Math.round(srcW - cLeft - cRight));
    const outH = Math.max(2, Math.round(srcH - cTop - cBottom));
    // Encoders prefer even dimensions
    canvas.width = outW - (outW % 2);
    canvas.height = outH - (outH % 2);
    const ctx = canvas.getContext("2d")!;
    stream = canvas.captureStream(60);

    const pumpCanvas = () => {
      if (!video.paused && !video.ended) {
        if (cropActive) {
          ctx.drawImage(
            video,
            cLeft, cTop, srcW - cLeft - cRight, srcH - cTop - cBottom,
            0, 0, canvas.width, canvas.height
          );
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }
    };
    canvasIntervalHandle = setInterval(pumpCanvas, 1000 / 60);
    (video as any)._canvasInterval = canvasIntervalHandle;
  }

  // Capture audio
  try {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch {
    // No audio or already captured
  }

  // Codec selection: prefer H.264 in MP4 because it is hardware-decoded
  // everywhere and plays back smoothly on mobile. VP9 in WebM at high
  // bitrates causes stuttering on many devices, which is why we treat it
  // strictly as a last resort. Order: H.264 mp4 -> H.264 webm -> VP8 ->
  // VP9 (last).
  const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2")
    ? "video/mp4;codecs=avc1.42E01E,mp4a.40.2"
    : MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4;codecs=avc1"
      : MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")
        ? "video/webm;codecs=h264,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
            ? "video/webm;codecs=vp9,opus"
            : "video/webm";

  // Scale bitrate based on resolution but cap at sane values. The previous
  // 25–40 Mbps target produced clips that stuttered on playback; ~6–10 Mbps
  // matches typical streaming bitrates and decodes smoothly even on
  // mid-range mobile.
  const pixels = (video.videoWidth || 1280) * (video.videoHeight || 720);
  // ~8 Mbps for 1080p, ~3.5 Mbps for 720p, scales proportionally.
  const targetBitrate = Math.min(
    10_000_000,
    Math.max(2_500_000, Math.round((pixels / (1920 * 1080)) * 8_000_000)),
  );

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: targetBitrate,
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  // Seek to start
  onProgress?.("Seeking to clip start...");
  video.currentTime = start;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  // CRITICAL: Record at native 1x speed to preserve correct playback rate
  // Never use accelerated playback during capture — it encodes the sped-up
  // output as the source content, producing clips that play too fast.
  onProgress?.("Recording clip (real-time capture)...");
  recorder.start();
  video.playbackRate = 1.0;
  video.play();

  // Wait until end time using requestVideoFrameCallback if available, else rAF
  await new Promise<void>((resolve) => {
    const checkEnd = () => {
      if (video.currentTime >= end || video.paused || video.ended) {
        video.pause();
        recorder.stop();
        resolve();
        return;
      }
      if ("requestVideoFrameCallback" in video) {
        (video as any).requestVideoFrameCallback(checkEnd);
      } else {
        requestAnimationFrame(checkEnd);
      }
    };

    if ("requestVideoFrameCallback" in video) {
      (video as any).requestVideoFrameCallback(checkEnd);
    } else {
      requestAnimationFrame(checkEnd);
    }
  });

  const blob = await recordingDone;

  // Clean up
  if ((video as any)._canvasInterval) clearInterval((video as any)._canvasInterval);
  video.pause();
  video.removeAttribute("src");
  video.load();

  onProgress?.("Uploading clip...");

  const isMp4 = mimeType.startsWith("video/mp4");
  const clipPath = `clips/${clipId}.${isMp4 ? "mp4" : "webm"}`;
  const { error: uploadError } = await supabase.storage
    .from("analysis-videos")
    .upload(clipPath, blob, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("analysis-videos")
    .getPublicUrl(clipPath);

  return publicUrlData.publicUrl;
}
