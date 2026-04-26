import { motion } from "framer-motion";
import smokeTexture from "@/assets/smudged-marble-overlay.png";

/**
 * Two large slow-moving smoke layers (white + Rise Gold) that drift
 * left↔right forever using mirrored repeats so the motion never stops
 * or jumps. Full-bleed and clearly visible. pointer-events-none so it
 * never blocks UI.
 */
export const SmokeOverlay = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {/* White smoke */}
      <motion.div
        className="absolute -inset-x-[40%] inset-y-0"
        style={{
          backgroundImage: `url(${smokeTexture})`,
          backgroundRepeat: "repeat",
          backgroundSize: "780px auto",
          opacity: 0.85,
          mixBlendMode: "screen",
          filter: "blur(1px) brightness(1.9) contrast(1.05)",
        }}
        animate={{ x: ["-12%", "12%"] }}
        transition={{ duration: 38, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />
      {/* Rise Gold smoke */}
      <motion.div
        className="absolute -inset-x-[40%] inset-y-0"
        style={{
          backgroundImage: `url(${smokeTexture})`,
          backgroundRepeat: "repeat",
          backgroundSize: "920px auto",
          opacity: 0.7,
          mixBlendMode: "screen",
          filter: "blur(1.5px) sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.3)",
        }}
        animate={{ x: ["10%", "-10%"] }}
        transition={{ duration: 52, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />
    </div>
  );
};
