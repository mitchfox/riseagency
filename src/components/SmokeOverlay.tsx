import { motion } from "framer-motion";

/**
 * Slow-moving smoke streaks (white + Rise Gold), not a single cloud.
 * Long masked wisps drift across the age screen only. Text sits above.
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
  { tint: "white", opacity: 0.42, top: "18%", height: 180, blur: 7, dur: 34, dir: 1,  delay: 0,  scale: 1.2 },
  { tint: "gold",  opacity: 0.72, top: "36%", height: 150, blur: 6, dur: 43, dir: -1, delay: -9, scale: 1.05 },
  { tint: "white", opacity: 0.28, top: "58%", height: 210, blur: 9, dur: 51, dir: 1,  delay: -18, scale: 1.35 },
  { tint: "gold",  opacity: 0.46, top: "72%", height: 140, blur: 5, dur: 39, dir: 1,  delay: -6, scale: 0.95 },
] as const;

const FRONT_LAYERS = [
  // In front of the player, very light so the player remains clear.
  { tint: "white", opacity: 0.055, top: "28%", height: 130, blur: 6, dur: 37, dir: -1, delay: -4, scale: 0.95 },
  { tint: "gold",  opacity: 0.085, top: "48%", height: 115, blur: 5, dur: 45, dir: 1,  delay: -14, scale: 1.05 },
  { tint: "white", opacity: 0.04,  top: "66%", height: 155, blur: 7, dur: 40, dir: 1,  delay: -22, scale: 1.15 },
] as const;

const smokeGradient = (tint: "white" | "gold") => {
  const core = tint === "gold" ? "hsl(var(--gold) / 0.98)" : "hsl(var(--foreground) / 0.9)";
  const soft = tint === "gold" ? "hsl(var(--gold) / 0.42)" : "hsl(var(--foreground) / 0.36)";
  return [
    `radial-gradient(ellipse at 18% 52%, ${core} 0%, ${soft} 10%, transparent 28%)`,
    `radial-gradient(ellipse at 42% 45%, ${core} 0%, ${soft} 8%, transparent 24%)`,
    `radial-gradient(ellipse at 68% 58%, ${core} 0%, ${soft} 9%, transparent 26%)`,
    `radial-gradient(ellipse at 86% 48%, ${core} 0%, ${soft} 7%, transparent 22%)`,
    `linear-gradient(90deg, transparent 0%, ${soft} 18%, ${core} 38%, ${soft} 58%, transparent 100%)`,
  ].join(", ");
};

export const SmokeOverlay = ({ layer = "back" }: SmokeOverlayProps) => {
  const layers = layer === "front" ? FRONT_LAYERS : BACK_LAYERS;
  const z = layer === "front" ? "z-20" : "z-0";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${z}`} aria-hidden="true">
      {layers.map((l, i) => (
        <motion.div
          key={`${layer}-${i}`}
          className="absolute left-1/2 w-[190vw] -translate-x-1/2"
          style={{
            top: l.top,
            height: l.height,
            backgroundImage: smokeGradient(l.tint),
            backgroundRepeat: "repeat-x",
            backgroundSize: "70% 100%",
            opacity: l.opacity,
            mixBlendMode: "screen",
            filter: `blur(${l.blur}px)`,
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 14%, black 86%, transparent 100%)",
            maskImage: "linear-gradient(90deg, transparent 0%, black 14%, black 86%, transparent 100%)",
          }}
          animate={{ x: l.dir > 0 ? ["-18%", "18%"] : ["18%", "-18%"], scaleY: [l.scale, l.scale * 0.82, l.scale] }}
          transition={{ duration: l.dur, repeat: Infinity, repeatType: "mirror", ease: "linear", delay: l.delay }}
        />
      ))}
    </div>
  );
};
