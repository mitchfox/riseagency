

# Improving clip extraction: server-side FFmpeg trimming

## The problem

The current approach plays the video in real-time inside a hidden browser canvas and re-encodes it frame by frame. A 30-second clip takes 30+ seconds to extract, and longer clips scale linearly. The canvas re-encoding also degrades quality regardless of bitrate settings because it's decoding then re-encoding every frame.

## The solution

Move clip trimming to a backend function using FFmpeg's **stream copy** mode (`-c copy`). This copies the original video data without re-encoding, meaning:

- **Near-instant** — a 30-second clip from a 90-minute file takes 1-2 seconds, not 30+
- **Zero quality loss** — original codec bitstream is preserved byte-for-byte
- **Works for any clip length** — no real-time playback bottleneck

## How it works

1. **New backend function `trim-video-clip`**
   - Receives: `sourceUrl`, `start`, `end`, `clipId`
   - Downloads the source video byte-range (only the segment needed + a small buffer for keyframes) using HTTP Range headers
   - Runs FFmpeg with `-ss start -to end -c copy` for lossless stream copy
   - Uploads the trimmed file to `analysis-videos/clips/{clipId}.mp4`
   - Returns the public URL
   - FFmpeg binary: uses a static Deno-compatible FFmpeg WASM build (`ffmpeg-wasm`) that runs inside the edge function without native dependencies

2. **Update `clientClipExtractor.ts`**
   - Primary path: call the backend function via `supabase.functions.invoke('trim-video-clip', ...)`
   - Fallback: if the backend call fails, fall back to the existing canvas approach (keeps things resilient)
   - Progress callback still works — "Trimming on server..." then "Done"

3. **Update callers** (no API change needed)
   - `VideoAnalysis.tsx` `extractClipFile` — no change, it already calls `trimAndUploadClip`
   - `ReExtractClipsButton.tsx` — no change, same function signature

## Edge function considerations

- **FFmpeg in Deno**: Use `ffmpeg-wasm` or shell out to a statically linked binary. The WASM approach is the most portable for edge functions. For very large files, byte-range downloads keep memory usage manageable.
- **Timeout**: Edge functions have a 150-second limit. Stream copy is fast enough that even hour-long source videos produce clips in seconds, well within limits.
- **Output format**: `.mp4` (H.264 passthrough) instead of `.webm` — better compatibility across devices and no re-encode.

## Technical details

- The function authenticates with the service role key to access storage
- Source URL is validated to ensure it points to the project's own storage bucket
- `verify_jwt = true` so only authenticated staff can trigger extractions
- Existing canvas fallback means zero downtime if the function has issues

