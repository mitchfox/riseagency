import { motion } from "framer-motion";
import smokeTexture from "@/assets/smudged-marble-overlay.png";

/**
 * Slow-moving smoke layers (white + Rise Gold) that drift left↔right
 * forever using mirrored repeats so the motion never stops or jumps.
 * Each layer uses a different opacity (mix of 20%–80%) and travel
 * speed/direction so the field never looks uniform.
 *
 * `layer="back"` sits behind the foreground overlay image (z-0).
 * `layer="front"` sits in front of the overlay image but BEHIND the
 * text/UI (z-20). Page text/buttons should sit at z-30+.
 * pointer-events-none on every layer so they never block UI.
 */
interface SmokeOverlayProps {
  layer?: "back" | "front";
}

const BACK_LAYERS = [
  // [color, opacity, size, blur, durationSec, dir]
  { tint: "white", opacity: 0.55, size: 760, blur: 1,   dur: 42, dir: 1 },
  { tint: "gold",  opacity: 0.35, size: 880, blur: 1.4, dur: 58, dir: -1 },
  { tint: "white", opacity: 0.22, size: 1100, blur: 2,  dur: 70, dir: 1 },
] as const;

const FRONT_LAYERS = [
  // Sparser + lower opacity wisps in front of the player image
  { tint: "white", opacity: 0.28, size: 720, blur: 1.6, dur: 46, dir: -1 },
  { tint: "gold",  opacity: 0.20, size: 980, blur: 2.2, dur: 64, dir: 1 },
  { tint: "white", opacity: 0.42, size: 640, blur: 1.2, dur: 36, dir: 1 },
] as const;

const tintFilter = (tint: "white" | "gold", blur: number) =>
  tint === "gold"
    ? `blur(${blur}px) sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.25)`
    : `blur(${blur}px) brightness(1.9) contrast(1.05)`;

export const SmokeOverlay = ({ layer = "back" }: SmokeOverlayProps) => {
  const layers = layer === "front" ? FRONT_LAYERS : BACK_LAYERS;
  const z = layer === "front" ? "z-20" : "z-0";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${z}`} aria-hidden="true">
      {layers.map((l, i) => (
        <motion.div
          key={`${layer}-${i}`}
          className="absolute -inset-x-[40%] inset-y-0"
          style={{
            backgroundImage: `url(${smokeTexture})`,
            backgroundRepeat: "repeat",
            backgroundSize: `${l.size}px auto`,
            opacity: l.opacity,
            mixBlendMode: "screen",
            filter: tintFilter(l.tint, l.blur),
          }}
          animate={{ x: l.dir > 0 ? ["-12%", "12%"] : ["12%", "-12%"] }}
          transition={{ duration: l.dur, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
        />
      ))}
    </div>
  );
};
