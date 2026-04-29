## Problem

1. The closing shader on `/representation` is too brief — it appears and fades almost immediately.
2. Opening the Cristiano example portal from a non-English representation page still renders the entire portal in English. Nicky Medja Beloko's portal works because his stored `portal_language` is `fr`. Cristiano's stored `portal_language` is `en`, and the portal UI reads its language from `playerData.portal_language` directly — the `?lang=` URL override we save is never actually consumed by the render.

## Fix

### 1. Slow the shader closing beat (`src/components/RepresentationIntro.tsx`)

- Increase the `shader` phase dwell from `3400ms` to about `5200ms` so the shader and white RISE logo sit on screen for a noticeably longer beat before dissolving.
- Lengthen the shader's fade-out `transition.duration` from `3.2s` to about `4.2s` so the dissolve itself is slower and softer rather than a quick flash.
- Slightly extend the logo pulse breathing so the held moment feels intentional, not static (small scale + opacity oscillation tuned to the new dwell).
- Keep total intro length within an acceptable range; the earlier text phases stay untouched.

### 2. Make the visitor's `?lang=` actually drive the portal UI (`src/pages/Dashboard.tsx`)

The portal renders labels with `t(playerData?.portal_language, key)` and passes `portalLanguage={playerData.portal_language}` to children. So the only reliable fix is to override `playerData.portal_language` itself when a URL language hint is present.

- When `?lang=xx` is detected on `/portal` (existing block at lines 783–790), keep storing `portal_language_url_override` in `sessionStorage`, but also remember the value in a local variable for use later in the same auth flow.
- In the `players` fetch (around line 892) and again in `fetchAnalyses` (around line 994), if a URL override exists, set `player.portal_language = override` (and `parsedPlayerData.portal_language = override`) before calling `setPlayerData`. This way every downstream `t(playerData?.portal_language, ...)` call and every child `portalLanguage={playerData?.portal_language}` prop renders in the visitor's chosen language.
- Preserve `portal_language` in the merge of `bioData` so the override is not stomped (the `preservedFields` block already protects this — we just need to seed it with the override, not the DB value, when present).
- Keep the existing `portalLanguageHint` state in sync for the loading screen (`PageLoading text={t(portalLanguageHint, "loading")}`).
- The URL override should only apply for the lifetime of the session (already in `sessionStorage`), so a real Cristiano login from a non-representation entry point still uses the stored DB language.

### 3. Sanity sweep

- Verify the override propagates into the portal Hub, Analysis tabs, Data tab, and the bottom navigation (all of which read `playerData?.portal_language`).
- Spot check that opening the example performance report and example analysis from the same Portuguese representation session continues to honour `?lang=pt` as already wired.
- Confirm Nicky's portal (which has a real stored `portal_language`) is unchanged.

## Files

- `src/components/RepresentationIntro.tsx` — extend shader dwell + fade.
- `src/pages/Dashboard.tsx` — apply URL `?lang=` override directly onto `playerData.portal_language` before render.

No database changes, no schema changes.
