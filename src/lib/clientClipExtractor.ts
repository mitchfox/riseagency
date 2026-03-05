import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

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
  onProgress?: (msg: string) => void
): Promise<string> {
  // ── 1. Server-side trim (preferred) ──
  try {
    onProgress?.("Trimming on server...");
    const { data, error } = await invokeEdgeFunction<{ url: string }>(
      "trim-video-clip",
      { body: { sourceUrl, start, end, clipId } }
    );

    if (!error && data?.url) {
      onProgress?.("Done");
      return data.url;
    }

    console.warn("Server-side trim failed, falling back to client:", error?.message);
  } catch (err) {
    console.warn("Server-side trim unavailable, falling back to client:", err);
  }

  // ── 2. Client-side canvas fallback ──
  return clientSideTrim(sourceUrl, clipId, start, end, onProgress);
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
  onProgress?: (msg: string) => void
): Promise<string> {
  const cleanUrl = sourceUrl.split("#")[0];

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

  // Prefer direct captureStream on the video element (no canvas quality loss)
  const useDirectCapture = typeof (video as any).captureStream === "function";

  let stream: MediaStream;

  if (useDirectCapture) {
    // Use 0 to capture every painted frame at the video's native rate
    stream = (video as any).captureStream(0);
  } else {
    // Canvas fallback for browsers without video.captureStream
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    stream = canvas.captureStream(60);

    // We'll need to pump frames to the canvas
    const pumpCanvas = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0);
      }
    };
    const canvasInterval = setInterval(pumpCanvas, 1000 / 60);
    // Store cleanup ref on video for later
    (video as any)._canvasInterval = canvasInterval;
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

  // Codec selection: prefer VP9+Opus for best quality
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

  // Scale bitrate based on resolution for quality preservation
  const pixels = (video.videoWidth || 1280) * (video.videoHeight || 720);
  // ~40Mbps for 1080p, scales proportionally
  const targetBitrate = Math.max(25_000_000, Math.round((pixels / (1920 * 1080)) * 40_000_000));

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

  // Start recording and play
  onProgress?.("Recording clip...");
  recorder.start();
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

  const clipPath = `clips/${clipId}.webm`;
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
