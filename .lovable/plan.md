# Smooth hero video playback on proposal page

The hero highlight video on the club/agent proposal page (`src/pages/ClubOutreachProposal.tsx`) currently starts playing the moment the browser has the first few seconds buffered (`autoPlay` + `preload="auto"`), so on slower networks playback stalls roughly every 2 seconds while the next chunk downloads. Viewers see a stuttering clip, which is unacceptable on a recruitment-facing link.

## Goal

Trade a longer up-front load for completely seamless playback. The hero video should not start until enough has been buffered that it can play to the end without re-buffering. Show a clear loading state during that wait.

## Approach

In the hero video block (lines ~366-391):

1. Replace the immediate `autoPlay` with a gated, two-stage flow:
   - Stage 1 — full prefetch: as soon as the highlight URL is known, fetch the file via `fetch(url)` and turn it into a `blob:` object URL. This forces the browser to download the entire video in one go (instead of HTTP range chunks that arrive as playback progresses).
   - Stage 2 — playback: only set the `<video>` `src` to the blob URL once the blob is ready, then call `tryAutoplay`. Because the file is fully in memory, `currentTime` seeks and playback never wait on the network.
   - Revoke the previous blob URL when the player swaps to another highlight (carousel via `current.first_highlight_url` change) or on unmount, to avoid memory leaks.

2. While stage 1 is in progress, render a black 16:9 frame with the existing gold `Loader2` spinner and a small label such as `tr("video.preparing", "Preparing video…")` so the viewer understands the wait is intentional.

3. Add a safety fallback: if the prefetch fails (CORS, network error, abort), fall back to the current direct `src` + `preload="auto"` behaviour but additionally hold playback until `canplaythrough` fires and `video.buffered` covers the full duration — only then call `tryAutoplay`. This keeps the page working even when blob prefetch is blocked.

4. Keep `playsInline`, `controls`, unmuted-first/muted-fallback autoplay behaviour, and the existing `videoRef` reset effect intact. The `key={current.first_highlight_url}` remount stays so swapping players still works.

5. No changes elsewhere — this is scoped to the hero video block in `ClubOutreachProposal.tsx`. Other video components (`ActionVideoPopup`, `LazyVideo`, shared clip player) are untouched.

## Notes

- Blob prefetch means the user waits longer before the first frame, but every subsequent second plays back from RAM. This matches the stated preference of "take the extra seconds loading… to ensure its seamless".
- Highlight files are short clips (single Stars highlight), so the memory footprint of a blob URL is small (typically <30 MB).
- No backend, schema, or other page changes required.
