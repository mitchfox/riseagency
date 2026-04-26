import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/RISEWhite.png";

/**
 * Cinematic intro for the /representation page.
 *
 * Five lines fade in/out in sequence, then the RISE logo appears
 * centre-screen, pulses twice, descends and shrinks into the bottom of
 * the viewport. When the descent completes, `onComplete()` fires and
 * the actual age screen takes over.
 *
 * Tone: restrained, structured, slightly inevitable. Background is
 * deep black with low-key motion texture (a slow gold radial wash).
 */

const LINES: { text: string; hold: number }[] = [
  { text: "Realise your potential.",            hold: 1700 },
  { text: "See where you are going.",           hold: 1700 },
  { text: "Realise your potential.",            hold: 1700 },
  { text: "Work with us to make it a reality.", hold: 1900 },
  { text: "Then…",                              hold: 1500 },
];

interface Props { onComplete: () => void; }

export const RepresentationIntro = ({ onComplete }: Props) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState<"lines" | "logo" | "descend" | "done">("lines");

  // Allow the user to skip on tap/click/key.
  useEffect(() => {
    const skip = () => { setPhase("done"); onComplete(); };
    window.addEventListener("keydown", skip, { once: true });
    return () => window.removeEventListener("keydown", skip);
  }, [onComplete]);

  // Step through the lines, then the logo phases.
  useEffect(() => {
    if (phase !== "lines") return;
    if (lineIndex >= LINES.length) {
      setPhase("logo");
      return;
    }
    const t = setTimeout(() => setLineIndex((i) => i + 1), LINES[lineIndex].hold);
    return () => clearTimeout(t);
  }, [lineIndex, phase]);

  useEffect(() => {
    if (phase === "logo") {
      // pulse pulse, then descend
      const t = setTimeout(() => setPhase("descend"), 1700);
      return () => clearTimeout(t);
    }
    if (phase === "descend") {
      const t = setTimeout(() => { setPhase("done"); onComplete(); }, 950);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <motion.div
      key="rep-intro"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => { setPhase("done"); onComplete(); }}
      role="presentation"
    >
      {/* Low-motion gold ambience — barely there, never competes. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, hsl(var(--gold) / 0.12), transparent 55%)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Faint moving horizon line that intensifies after line 2 */}
      {phase === "lines" && lineIndex >= 1 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-primary/30"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.6 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      {/* Subtle grid system overlay, fades in around line 4 */}
      {phase === "lines" && lineIndex >= 3 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          transition={{ duration: 0.9 }}
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold) / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold) / 0.18) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      )}

      {/* Lines */}
      <AnimatePresence mode="wait">
        {phase === "lines" && lineIndex < LINES.length && (
          <motion.p
            key={`line-${lineIndex}`}
            initial={{ opacity: 0, y: 14, letterSpacing: "0.18em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.22em" }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`relative px-6 text-center font-bebas uppercase text-foreground ${
              lineIndex === LINES.length - 1
                ? "text-3xl tracking-[0.42em] text-primary md:text-5xl"
                : "text-xl md:text-3xl lg:text-4xl"
            }`}
          >
            {LINES[lineIndex].text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Logo phase: pulse twice, then descend & shrink */}
      <AnimatePresence>
        {(phase === "logo" || phase === "descend") && (
          <motion.img
            key="rep-intro-logo"
            src={logoWhite}
            alt="RISE"
            initial={{ opacity: 0, scale: 0.9, y: 0 }}
            animate={
              phase === "logo"
                ? {
                    opacity: 1,
                    // pulse: 1 → 1.08 → 1 → 1.04 → 1
                    scale: [0.9, 1, 1.08, 1, 1.04, 1],
                  }
                : {
                    opacity: 1,
                    scale: 0.45,
                    y: "42dvh",
                  }
            }
            transition={
              phase === "logo"
                ? { duration: 1.6, times: [0, 0.18, 0.42, 0.62, 0.82, 1], ease: "easeInOut" }
                : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
            }
            className="pointer-events-none relative z-10 h-20 w-auto md:h-28"
          />
        )}
      </AnimatePresence>

      {/* Skip hint */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setPhase("done"); onComplete(); }}
        className="absolute bottom-4 right-4 z-20 rounded-full border border-border/50 px-3 py-1 text-[10px] font-bebas uppercase tracking-[0.24em] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        Skip
      </button>
    </motion.div>
  );
};

export default RepresentationIntro;