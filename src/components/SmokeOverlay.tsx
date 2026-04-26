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
  // Wispier, more blurred — still readable behind the player.
  // [color, opacity, size, blur, durationSec, dir]
  { tint: "white", opacity: 0.42, size: 1100, blur: 14, dur: 42, dir: 1 },
  { tint: "gold",  opacity: 0.55, size: 1300, blur: 18, dur: 58, dir: -1 },
  { tint: "white", opacity: 0.20, size: 1500, blur: 22, dur: 70, dir: 1 },
] as const;

const FRONT_LAYERS = [
  // In front of the player — kept VERY light so he stays clearly visible.
  { tint: "white", opacity: 0.10, size: 1200, blur: 18, dur: 46, dir: -1 },
  { tint: "gold",  opacity: 0.14, size: 1400, blur: 22, dur: 64, dir: 1 },
  { tint: "white", opacity: 0.07, size: 1000, blur: 14, dur: 36, dir: 1 },
] as const;

// Gold tint uses a recoloured layer (multiply with gold) instead of
// hue-rotate so the wisps actually read as Rise Gold.
const tintFilter = (tint: "white" | "gold", blur: number) =>
  tint === "gold"
    ? `blur(${blur}px) brightness(2.2) contrast(0.85) saturate(0)`
    : `blur(${blur}px) brightness(2.2) contrast(0.85) saturate(0)`;

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
        >
          {l.tint === "gold" && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "hsl(var(--gold))",
                mixBlendMode: "multiply",
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};
