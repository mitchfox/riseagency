

# Fix AI Player Scan Stuck at 0%

## Problem

The scan immediately fails because of a browser security restriction. The video file is hosted on a different domain (storage), so when the AI tries to capture a screenshot of the video frame to send to the AI model, the browser blocks it with a "tainted canvas" error. This means no frames are ever extracted and the progress stays at 0% forever.

## Solution

Two changes are needed:

### 1. Add cross-origin permission to the main video player

In `VideoAnalysis.tsx`, the `<video>` element needs a `crossOrigin="anonymous"` attribute. This tells the browser it's allowed to read pixel data from the video for canvas operations.

### 2. Use a dedicated hidden video for frame extraction

Rather than relying on the visible video player (which would cause visible seeking/jumping during the scan), the AI detection component will create its own hidden `<video>` element with `crossOrigin="anonymous"` set. This hidden video loads the same source but can seek freely to capture frames without disrupting the user's view.

The `extractFrame` function in `AIPlayerDetection.tsx` will be updated to:
- Create a hidden video element on scan start (with `crossOrigin` set)
- Wait for it to load before beginning extraction
- Seek through this hidden video to capture frames
- Clean up the hidden video after the scan completes

### Files to change

- **`src/components/staff/coaching/VideoAnalysis.tsx`** - Add `crossOrigin="anonymous"` to the `<video>` tag
- **`src/components/staff/coaching/AIPlayerDetection.tsx`** - Create a dedicated hidden video element for frame extraction instead of using the shared `videoRef`, with `crossOrigin="anonymous"` to prevent tainted canvas errors

