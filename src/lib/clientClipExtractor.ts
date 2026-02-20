import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side clip extraction using canvas + MediaRecorder.
 * Produces a small webm file containing only the specified segment.
 * Uploads to analysis-videos/clips/{clipId}.webm and returns the public URL.
 */
export async function trimAndUploadClip(
  sourceUrl: string,
  clipId: string,
  start: number,
  end: number,
  onProgress?: (msg: string) => void
): Promise<string> {
  const cleanUrl = sourceUrl.split("#")[0];

  onProgress?.("Loading video...");

  // Create offscreen video
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.preload = "auto";
  video.src = cleanUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load source video"));
    // Timeout after 30s
    setTimeout(() => reject(new Error("Video load timeout")), 30000);
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // Set up MediaRecorder on canvas stream
  const stream = canvas.captureStream(30);

  // Try to capture audio
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

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
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

  // Draw frames to canvas until end time
  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      if (video.currentTime >= end || video.paused || video.ended) {
        video.pause();
        recorder.stop();
        resolve();
        return;
      }
      ctx.drawImage(video, 0, 0);
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);
  });

  const blob = await recordingDone;

  // Clean up
  video.pause();
  video.removeAttribute("src");
  video.load();

  onProgress?.("Uploading clip...");

  // Upload to clips/ prefix
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
