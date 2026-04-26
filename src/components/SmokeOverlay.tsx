import { motion } from "framer-motion";
import smokeTexture from "@/assets/smudged-marble-overlay.png";

/**
 * Two slow-moving smoke layers (white + Rise Gold) that drift left↔right
 * forever using mirrored repeats so the motion never stops or jumps.
 * pointer-events-none so it never blocks UI.
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
          backgroundSize: "1400px auto",
          opacity: 0.2,
          mixBlendMode: "screen",
          filter: "blur(2px) brightness(1.6)",
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
          backgroundSize: "1700px auto",
          opacity: 0.2,
          mixBlendMode: "overlay",
          filter: "blur(3px) sepia(1) saturate(2.4) hue-rotate(-12deg)",
        }}
        animate={{ x: ["10%", "-10%"] }}
        transition={{ duration: 52, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />
    </div>
  );
};
