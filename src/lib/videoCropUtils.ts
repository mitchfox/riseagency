// Known video files that have baked-in letterbox bands we want to crop out of view.
// Each entry is a substring match against the video URL (so storage cache-busters etc. still match).
// The crop scales the video uniformly by 11/9 so the top and bottom 1/11th bands move past
// the overflow-hidden hero container. A small (~4.5%) side crop is the trade-off for keeping
// players in correct proportions.
const LETTERBOXED_TOP_BOTTOM_ELEVENTH: string[] = [
  "Michael_Mulligan_2025_26_Highlights",
];

export function shouldCropHeroVideo(url?: string | null): boolean {
  if (!url) return false;
  return LETTERBOXED_TOP_BOTTOM_ELEVENTH.some((needle) => url.includes(needle));
}

// Uniform scale that pushes the top and bottom 1/11th out of an overflow-hidden,
// aspect-video container. 11 / 9 ≈ 1.2223.
export const HERO_CROP_TRANSFORM = "scale(1.2223)";

export function heroCropStyle(url?: string | null): React.CSSProperties | undefined {
  return shouldCropHeroVideo(url)
    ? { transform: HERO_CROP_TRANSFORM, transformOrigin: "center" }
    : undefined;
}

// Ensure React types resolve in this file
import type React from "react";