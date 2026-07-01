## Problem

Intro clip videos only start loading when their corner frame fades in (they're mounted inside `AnimatePresence` and unmounted on exit). On mobile that means every rotation hits network + decode from cold, so the frame appears empty / laggy and by the time playback starts it's already fading out. There is no preload path for the video items in `extraIntro`.

Existing `useVideoPreloader` hook does exactly what we need (creates hidden `<video preload="auto">` elements to warm the buffer) but it's not being used by the intro.

## Fix

Edit only `src/pages/RiseWithUs.tsx` inside `IntroCinematic`:

1. **Warm every intro video on mount.** As soon as `IntroCinematic` mounts (well before the first video rotation), kick off a hidden preloader for every video URL in `extraIntro`:
   - Collect `extraIntro.filter(m => m.kind === "video").map(m => m.url)`.
   - Use `useVideoPreloader({ videos: urls, preloadCount: urls.length, enabled: true })` so every clip is fetched immediately, not just "the next few".
   - Reduce the hook's internal 1s startup delay by calling `preloadVideo` in an effect ourselves too, so the very first clip is warm by the time phase 1 begins.

2. **Set `preload="auto"` on the visible `<video>` elements** in `AnnotatedIntroVideo` (both branches — with and without annotations). Currently neither element sets `preload`, so browsers default to `metadata` and don't buffer until play. Adding `preload="auto"` plus the pre-warmed cache means the frame is decoded and ready the moment it mounts.

3. **Keep videos alive across rotations** so they don't have to re-buffer each cycle. Instead of relying purely on `AnimatePresence` mount/unmount, render one hidden persistent `<video>` per unique video URL at zero opacity / `pointer-events-none` inside the intro container (a tiny 1x1 offscreen sink is enough — same trick the preloader hook uses but attached to the DOM tree). This guarantees the decoded buffer persists between rotations on mobile Safari, which is aggressive about evicting orphaned media.

4. **Autoplay guarantee.** Keep `autoPlay muted playsInline loop` (already present) — required for mobile autoplay after the language-switch tap that starts the intro.

No changes to export logic, annotations, `clientClipExtractor`, or the extractor timeout. This is purely a preload/lifecycle fix on the render side.

## Files touched

- `src/pages/RiseWithUs.tsx` — `IntroCinematic` preload effect + `AnnotatedIntroVideo` `preload="auto"` and persistent hidden sinks.

## Verification

- Open a Rise With Us link with 2+ intro clips on mobile → first clip is playing frame-1 the moment it appears; subsequent rotations start instantly with no black gap.
- Link with only images still behaves as today.
- Link with annotated clip still shows the overlay in sync.
