import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/RISEWhite.png";

/**
 * Cinematic intro for the /representation page.
 *
 * Lines reveal in overlapping pairs:
 *   Step 1: "Realise your potential."  enters
 *   Step 2: "See where you are going." enters under it (both visible)
 *   Step 3: both fade
 *   Step 4: "Realise your potential."  enters again
 *   Step 5: "Work with us to make it a reality." enters under it
 *   Step 6: both fade
 *   Step 7: "Then…" enters alone
 *   Step 8: logo phase — the same RISE logo that sat behind the lines
 *           pulses twice and travels up to the header position. The
 *           logo never fades; it is always on screen.
 */

// Each step: which texts to show (top + bottom slots), and how long.
type Step = { top?: string; bottom?: string; hold: number };

const STEPS: Step[] = [
  { top: "Realise your potential.",                                                       hold: 2200 },
  { top: "Realise your potential.",   bottom: "See where you are going.",                 hold: 3200 },
  {                                                                                       hold: 700  },
  { top: "Realise your potential.",                                                       hold: 2200 },
  { top: "Realise your potential.",   bottom: "Work with us to make it a reality.",       hold: 3200 },
  {                                                                                       hold: 700  },
  { top: "Then…",                                                                          hold: 2400 },
];

interface Props { onComplete: () => void; }

export const RepresentationIntro = ({ onComplete }: Props) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"lines" | "logo" | "descend" | "done">("lines");

  // Allow the user to skip on tap/click/key.
  useEffect(() => {
    const skip = () => { setPhase("done"); onComplete(); };
    window.addEventListener("keydown", skip, { once: true });
    return () => window.removeEventListener("keydown", skip);
  }, [onComplete]);

  // Step through the line pairs, then the logo phases.
  useEffect(() => {
    if (phase !== "lines") return;
    if (stepIndex >= STEPS.length) {
      setPhase("logo");
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), STEPS[stepIndex].hold);
    return () => clearTimeout(t);
  }, [stepIndex, phase]);

  useEffect(() => {
    if (phase === "logo") {
      // pulse twice, then descend.
      const t = setTimeout(() => setPhase("descend"), 4200);
      return () => clearTimeout(t);
    }
    if (phase === "descend") {
      const t = setTimeout(() => { setPhase("done"); onComplete(); }, 2800);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  const current: Step = phase === "lines" ? STEPS[stepIndex] ?? { hold: 0 } : { hold: 0 };
  const goldText = (t?: string) => t === "Realise your potential." || t === "Then…";

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
      {/* Lines — two stacked slots so the next line can fade in
          underneath while the previous one is still on screen. */}
      {phase === "lines" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center md:gap-6">
          <div className="flex h-12 w-full items-end justify-center md:h-16">
            <AnimatePresence mode="wait">
              {current.top && (
                <motion.p
                  key={`top-${stepIndex}-${current.top}`}
                  initial={{ opacity: 0, y: 14, letterSpacing: "0.18em" }}
                  animate={{ opacity: 1, y: 0, letterSpacing: "0.22em" }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className={`font-bebas uppercase ${
                    current.top === "Then…"
                      ? "text-3xl tracking-[0.42em] text-primary md:text-5xl"
                      : goldText(current.top)
                        ? "text-xl text-primary md:text-3xl lg:text-4xl"
                        : "text-xl text-foreground md:text-3xl lg:text-4xl"
                  }`}
                >
                  {current.top}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="flex h-12 w-full items-start justify-center md:h-16">
            <AnimatePresence mode="wait">
              {current.bottom && (
                <motion.p
                  key={`bot-${stepIndex}-${current.bottom}`}
                  initial={{ opacity: 0, y: 14, letterSpacing: "0.18em" }}
                  animate={{ opacity: 1, y: 0, letterSpacing: "0.22em" }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className={`font-bebas uppercase ${
                    goldText(current.bottom)
                      ? "text-xl text-primary md:text-3xl lg:text-4xl"
                      : "text-xl text-foreground md:text-3xl lg:text-4xl"
                  }`}
                >
                  {current.bottom}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/*
        Logo phase: pulse twice, then travel UP to the position the
        age-screen logo will occupy so the transition is seamless.
        Age-screen logo sits top-centre at h-8 (sm:h-10, md:h-14) with
        ~max(2rem, safe-area-inset-top) of top padding. We start the
        intro logo at h-20 (md:h-28) and shrink + lift to match.
      */}
      {/*
        Logo: always present, never fades. Sits behind the lines at low
        opacity so it's a constant presence; pulses & travels up at the
        end to seamlessly match the header logo on the age screen.
      */}
      <motion.img
        key="rep-intro-logo"
        src={logoWhite}
        alt="RISE"
        initial={{ opacity: 0.18, scale: 0.95, y: 0 }}
        animate={
          phase === "lines"
            ? { opacity: 0.18, scale: 0.95, y: 0 }
            : phase === "logo"
              ? { opacity: 1, scale: [0.95, 1.04, 1, 1.06, 1], y: 0 }
              : {
                  opacity: 1,
                  // h-20 (80px) → h-12 (48px) to match the page logo.
                  scale: 0.6,
                  y: "calc(-50dvh + clamp(56px, 8.333vw, 64px))",
                }
        }
        transition={
          phase === "logo"
            ? { duration: 4, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" }
            : phase === "descend"
              ? { duration: 2.6, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.8, ease: "easeOut" }
        }
        className="pointer-events-none relative z-10 h-20 w-auto md:h-[6.666rem]"
      />

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