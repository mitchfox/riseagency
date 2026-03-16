

# Fix 8x Speed — Same Behavior as 4x

## Problem
8x freezes because browsers struggle to decode frames at that rate. The issue is purely the browser's media decoder — it's not a buffering problem.

## Root Cause
Most browsers cap reliable native `playbackRate` around 4x. At 8x, the decoder can't keep up and the video freezes/stalls. This is a known Chrome/Firefox limitation.

## Solution
Simulate 8x by keeping the video at **4x native playback** and skipping every other frame's worth of time. Specifically:

- Speeds 0.25x–4x: Use native `playbackRate` as-is (works perfectly)
- 8x: Set native `playbackRate = 4` but run a `requestAnimationFrame` loop that continuously nudges `currentTime` forward by an extra `elapsed * 1` each frame — effectively doubling the 4x to achieve 8x real-time progress

This means the decoder only needs to handle 4x (which works fine), but the video progresses at 8x real-time speed. It will look identical to 4x but faster — smooth, no freezing, no hacks.

## Changes

### `src/components/staff/coaching/VideoAnalysis.tsx`
1. Add a ref for the 8x RAF loop (`eightXRafRef`)
2. Create a helper `applySpeed(speed)` that:
   - If speed === 8: sets `video.playbackRate = 4`, starts RAF loop that adds extra time each frame
   - Otherwise: clears any RAF loop, sets `video.playbackRate = speed` normally
3. Replace all direct `video.playbackRate = ...` assignments (scroll wheel, keyboard, speed buttons) with calls to `applySpeed()`
4. Clean up RAF on pause/video change/unmount

