

## Fix: Low Quality Client-Side Clip Encoding

### Problem
The edge function can't handle large match videos (4GB+), so every clip falls back to client-side canvas recording at **30fps / 8Mbps WebM**. This produces noticeably laggy, low-quality clips compared to the original footage. The canvas intermediary adds another quality loss layer.

### Solution
Dramatically improve the client-side encoding pipeline:

1. **Skip the canvas entirely** — use `video.captureStream()` directly on the `<video>` element instead of routing through a canvas. This captures decoded frames at native quality without the canvas redraw overhead. Falls back to canvas only if `captureStream` is unsupported.

2. **Increase capture framerate** — from 30fps to 60fps for smooth playback.

3. **Increase bitrate** — from 8Mbps to 25Mbps. This is the single biggest quality lever.

4. **Better codec selection** — prefer VP9 with opus audio codec (`video/webm;codecs=vp9,opus`).

5. **Use `requestVideoFrameCallback`** where available — this syncs frame capture to the video's actual decode rate rather than the display's animation frame rate, eliminating dropped/duplicate frames.

### Files Changed

**`src/lib/clientClipExtractor.ts`**
- Replace canvas pipeline with direct `video.captureStream(60)` 
- Bump `videoBitsPerSecond` to `25_000_000`
- Use `requestVideoFrameCallback` for frame-accurate capture with canvas fallback
- Keep canvas path as fallback for browsers without `captureStream`

