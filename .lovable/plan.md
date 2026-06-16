## Goal

The video file `Michael_Mulligan_2025_26_Highlights__1_.mp4` has baked-in black letterbox bands taking up the top 1/11th and bottom 1/11th of the frame. Wherever this specific URL plays (Stars player detail page, club outreach proposal hero, agent outreach proposal hero), crop those bands out of view so only the football content shows.

## Identified video URL

```
.../analysis-files/highlights/00dd8ae4-9e84-458b-b1e1-893f6f9f0e96_1781622729724_Michael_Mulligan_2025_26_Highlights__1_.mp4
```

This is the first entry in his `matchHighlights`, name "Michael Mulligan 2025/26 Highlights".

## Approach

Add a small helper `shouldCropHeroVideo(url)` in `src/lib/videoCropUtils.ts` that returns true when the URL matches this known letterboxed file (substring match on the filename so cache-busted query strings still match). Keep it as a list so we can add future files without code changes elsewhere.

In each render location, when the helper returns true, apply a CSS transform that scales the video uniformly so the top and bottom 1/11th are pushed out of the overflow-hidden container:

- Wrapper already has `overflow-hidden` and `aspect-video`.
- On the `<video>` element add inline style `transform: scale(1.2223); transform-origin: center;`.
- Uniform scale (rather than `scaleY` only) keeps players in correct proportions. The side overflow is approximately 4.5% per edge which is well inside the safe action area of these highlights.

If side crop is undesirable, the alternative is to swap the wrapper aspect from `aspect-video` to `aspect-[176/81]` for this specific URL and use `object-fit: cover`; I'll go with the uniform-scale approach to avoid layout shift in the surrounding pages, but I can switch to the aspect-swap version if you prefer no side crop at all.

## Files to change

1. `src/lib/videoCropUtils.ts` (new) — exports `shouldCropHeroVideo(url?: string | null): boolean` matching the known filename fragment(s).
2. `src/pages/PlayerDetail.tsx` — on the hero highlight `<video>` (around lines 689-710), apply the transform style conditionally on `dbHighlights[currentVideoType]?.videoUrl`.
3. `src/pages/ClubOutreachProposal.tsx` — on the hero `<video>` (around line 468), apply the transform style conditionally on `current.first_highlight_url`.
4. `src/components/staff/AgentOutreachProposal*` or equivalent agent proposal hero (if it has its own video render — I'll confirm during build and apply the same conditional if present).

## Verification

Open the Stars page for Michael Mulligan and the club proposal preview link, confirm the black bands are no longer visible at top and bottom of the hero video, and confirm other players' videos are unaffected.
