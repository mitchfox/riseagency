import { memo, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/RISEWhite.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { Player3DPop, preloadPlayer3DVariant } from "@/components/Player3DPop";

/**
 * Cinematic intro for the /representation page. Total runtime ~20s.
 *
 * The five spoken lines reveal in two pairs and a closer:
 *   Pair 1 — Line 1 enters, holds, then Line 2 enters underneath
 *            while Line 1 stays. Both fade together.
 *   Pair 2 — Line 3 enters, holds, then Line 4 enters underneath.
 *            Both fade together.
 *   Closer — Line 5 ("Then…") enters alone, fades, and the white
 *            RISE logo pulses then travels up to the header slot.
 *
 * The logo only appears AFTER all five lines have played so it never
 * sits behind the text.
 */

interface Props { onComplete: () => void; }

/**
 * Both 3D player layers stay mounted for the full intro so the
 * Three.js context never tears down between text changes (which
 * was triggering the loading screen flash). Only opacity changes.
 */
const IntroPlayerLayer = memo(({ variant }: { variant: "one" | "two" }) => (
  <>
    <Player3DPop variant={variant} className="absolute inset-0 h-full w-full" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.65)_75%,rgba(0,0,0,0.92)_100%)]" />
  </>
));

type Phase =
  | "p1-line1"   // Line 1 alone
  | "p1-both"    // Line 1 + Line 2
  | "p1-fade"   // both fade together
  | "p2-line3"
  | "p2-both"
  | "p2-fade"
  | "p3-line5"
  | "p3-fade"
  | "logo"
  | "descend"
  | "done";

// Total ≈ 20s. Each entry is the *duration to stay in that phase*.
const PHASE_DURATIONS: Record<Phase, number> = {
  "p1-line1": 1800,
  "p1-both":  2400,
  "p1-fade":   900,
  "p2-line3": 1800,
  "p2-both":  2400,
  "p2-fade":   900,
  "p3-line5": 2200,
  "p3-fade":   900,
  "logo":     3800,
  "descend":  2400,
  "done":        0,
};

const NEXT: Record<Phase, Phase> = {
  "p1-line1": "p1-both",
  "p1-both":  "p1-fade",
  "p1-fade":  "p2-line3",
  "p2-line3": "p2-both",
  "p2-both":  "p2-fade",
  "p2-fade":  "p3-line5",
  "p3-line5": "p3-fade",
  "p3-fade":  "logo",
  "logo":     "descend",
  "descend":  "done",
  "done":     "done",
};

export const RepresentationIntro = ({ onComplete }: Props) => {
  const { t } = useLanguage();
  const LINE1 = t("representation.intro_line1", "Realise your potential.");
  const LINE2 = t("representation.intro_line2", "See where you are going.");
  const LINE3 = t("representation.intro_line3", "Realise your potential.");
  const LINE4 = t("representation.intro_line4", "Work with us to make it a reality.");
  const LINE5 = t("representation.intro_line5", "Then…");
  const [phase, setPhase] = useState<Phase>("p1-line1");
  const [completed, setCompleted] = useState(false);
  // Block the line sequence until Bebas Neue is loaded so the centred,
  // wide-tracked text does not reflow from a fallback font (which made
  // each line appear shifted to the right before snapping into place).
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    preloadPlayer3DVariant("two");
    preloadPlayer3DVariant("one");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => { if (!cancelled) setFontReady(true); };

    // Safety net: never wait more than 1.5s for the font.
    const safety = setTimeout(markReady, 1500);

    const fonts: any = (document as any).fonts;
    if (fonts && typeof fonts.load === "function") {
      Promise.all([
        fonts.load('1em "Bebas Neue"'),
        fonts.load('700 1em "Bebas Neue"'),
      ])
        .then(() => fonts.ready)
        .then(markReady)
        .catch(markReady);
    } else {
      markReady();
    }

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  const finishIntro = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    setPhase("done");
    onComplete();
  }, [completed, onComplete]);

  // Skip on key press.
  useEffect(() => {
    const skip = () => finishIntro();
    window.addEventListener("keydown", skip, { once: true });
    return () => window.removeEventListener("keydown", skip);
  }, [finishIntro]);

  // Drive phase transitions.
  useEffect(() => {
    if (!fontReady) return;
    if (phase === "done") { finishIntro(); return; }
    const t = setTimeout(() => setPhase(NEXT[phase]), PHASE_DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase, finishIntro, fontReady]);

  if (phase === "done") return null;

  // Which lines should be visible right now.
  const showTopGold   = ["p1-line1", "p1-both"].includes(phase);
  const showSecond    = phase === "p1-both";
  const showTopGold2  = ["p2-line3", "p2-both"].includes(phase);
  const showFourth    = phase === "p2-both";
  const showFifth     = phase === "p3-line5";
  const inLogo        = phase === "logo" || phase === "descend";
  const inPair1       = ["p1-line1", "p1-both", "p1-fade"].includes(phase);
  const inPair2       = ["p2-line3", "p2-both", "p2-fade"].includes(phase);
  // Per-pair 3D layer opacity. Always mounted; opacity decides
  // visibility so we never retrigger the texture load.
  const pair1Opacity =
    phase === "p1-line1" || phase === "p1-both" ? 0.55 :
    phase === "p1-fade" ? 0 : 0;
  const pair2Opacity =
    phase === "p2-line3" || phase === "p2-both" ? 0.55 :
    phase === "p2-fade" ? 0 : 0;

  return (
    <motion.div
      key="rep-intro"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={finishIntro}
      role="presentation"
    >
      {/* Low-motion gold ambience — barely there. */}
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

      {/* 3D player layers — both stay mounted so Three.js does not
          tear down between phases. Opacity does the work. */}
      <motion.div
        key="pair1-3d"
        initial={{ opacity: 0 }}
        animate={{ opacity: pair1Opacity }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-0"
      >
        <IntroPlayerLayer variant="two" />
      </motion.div>
      <motion.div
        key="pair2-3d"
        initial={{ opacity: 0 }}
        animate={{ opacity: pair2Opacity }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-0"
      >
        <IntroPlayerLayer variant="one" />
      </motion.div>

      {/* Lines stack: 2 fixed slots so the second line can appear
          *underneath* the first without pushing it. */}
      {!inLogo && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 pb-[28vh] text-center md:gap-6 md:pb-[22vh]">
          {/* TOP slot */}
          <div className="flex h-12 w-full items-end justify-center md:h-16">
            <AnimatePresence>
              {(showTopGold || showTopGold2) && (
                <motion.p
                  key={showTopGold ? "top-1" : "top-3"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bebas uppercase tracking-[0.22em] text-xl text-primary md:text-3xl lg:text-4xl"
                  style={{ color: "hsl(var(--gold))" }}
                >
                  {showTopGold ? LINE1 : LINE3}
                </motion.p>
              )}
              {showFifth && (
                <motion.p
                  key="line5"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bebas uppercase text-3xl tracking-[0.42em] md:text-5xl"
                  style={{ color: "hsl(var(--gold))" }}
                >
                  {LINE5}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          {/* BOTTOM slot */}
          <div className="flex h-12 w-full items-start justify-center md:h-16">
            <AnimatePresence>
              {showSecond && (
                <motion.p
                  key="line2"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bebas uppercase tracking-[0.22em] text-xl text-foreground md:text-3xl lg:text-4xl"
                >
                  {LINE2}
                </motion.p>
              )}
              {showFourth && (
                <motion.p
                  key="line4"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bebas uppercase tracking-[0.22em] text-xl text-foreground md:text-3xl lg:text-4xl"
                >
                  {LINE4}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Logo phase: appears only after the line sequence finishes.
          The intro logo stays centred and simply fades out at the
          end so there is no jump to a position that does not match
          the actual page layout. The Representation page renders
          its own logo in its real header position. */}
      {inLogo && (
        <motion.img
          key="rep-intro-logo"
          src={logoWhite}
          alt="RISE"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={
            phase === "logo"
              ? { opacity: 1, scale: [0.95, 1.04, 1, 1.06, 1] }
              : { opacity: 0, scale: 1 }
          }
          transition={
            phase === "logo"
              ? { duration: 3.6, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" }
              : { duration: 1.6, ease: [0.22, 1, 0.36, 1] }
          }
          className="pointer-events-none relative z-10 h-20 w-auto md:h-[6.666rem]"
        />
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finishIntro(); }}
        className="absolute bottom-4 right-4 z-20 rounded-full border border-border/50 px-3 py-1 text-[10px] font-bebas uppercase tracking-[0.24em] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        Skip
      </button>
    </motion.div>
  );
};

export default RepresentationIntro;