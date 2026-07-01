## Goal

When you export a clip from Video Analysis → Player Outreach, any annotations drawn on that clip must render on top of the video in the Rise With Us intro — the same way they render on Analysis reports. No breakage. No experimental new overlay component.

## Why the previous attempt broke

The last pass built a bespoke `IntroVideoWithAnnotations` SVG overlay in `RiseWithUs.tsx` from scratch, wired to `framer-motion`'s `motion.video`. It desynced from the intro carousel's timing and crashed the page. Instead of debugging that, I removed the annotation payload entirely — which is why you're (rightly) angry. It threw the baby out with the bathwater.

We already have a battle-tested read-only overlay used by the portal analysis playback: `src/components/portal/ReadOnlyAnnotationOverlay.tsx`. It renders identically to `AnnotationCanvas`, handles loops, uses the shared `computeVisibleElements` timing engine, and is what analysis exports rely on. We should reuse it verbatim — not reinvent it.

## Plan

### 1. Re-attach annotations to the outreach export payload
`src/components/staff/coaching/VideoAnalysis.tsx` → `handleExportToPlayerOutreach`

- Before pushing each clip into `newItems`, call the existing `getClipAnnotations(clip.id)` helper (already defined at line 1367, already used for analysis exports).
- If it returns elements, attach them to the intro_media entry:
  ```
  { id, kind: "video", url, show: true, position: "intro", annotations: <elements> }
  ```
- Type already supports it — `intro_media[].annotations?: any[]` is declared in `RiseWithUs.tsx` (line 60) and preserved through `introVisible` / `extraIntro` (lines 2099-2116). No schema change needed.

### 2. Render annotations on the Rise With Us intro video using the existing overlay
`src/pages/RiseWithUs.tsx`

- Find the intro media carousel that renders each `intro_media` item's video.
- For video items only, wrap the `<video>` in a relatively-positioned container and mount `<ReadOnlyAnnotationOverlay elements={item.annotations} videoRef={videoRef} clipStart={0} />` alongside it when `item.annotations?.length > 0`.
- Use a plain `<video>` ref (not `motion.video`) for the annotated case, or pass a ref into the existing motion element via `useRef` — either works; the overlay only needs the raw `HTMLVideoElement` for `currentTime`. Keep the container `absolute inset-0 pointer-events-none` so it never blocks UI.
- Because clips are exported as independently trimmed files, `clipStart` is 0 — timings in the saved elements are already relative to the clip's own timeline (that's how localStorage stored them from the editor).

### 3. Keep the stable export path
- Leave `preferServer: true` in `trimAndUploadClip` intact. Server-side stream-copy trims were the actual fix for the "melt down / choppy playback". That stays.
- No changes to `clientClipExtractor.ts` or `backgroundExportService.ts`.

### 4. Safety rails so this can't repeat
- If `elements` is missing/empty/malformed, the overlay renders nothing and the video plays as before — no crash path.
- Wrap the overlay mount in a `try/catch`-friendly conditional (`Array.isArray(item.annotations) && item.annotations.length > 0`) so a bad payload can never take down the intro.
- No changes to the export progress UI, dialogs, or database schema.

## Files touched

- `src/components/staff/coaching/VideoAnalysis.tsx` — add annotations to intro_media push in `handleExportToPlayerOutreach`.
- `src/pages/RiseWithUs.tsx` — mount `ReadOnlyAnnotationOverlay` over annotated intro video items.

## Verification

- Draw an annotation on a clip in Video Analysis, export to a test player, open that player's Rise With Us link → annotation appears synced to the clip's timeline, loops correctly.
- Export a clip with no annotations → intro video plays clean as today.
- Staff dashboard remains stable throughout (no "melt down").
