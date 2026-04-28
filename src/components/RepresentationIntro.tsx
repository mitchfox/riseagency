import { memo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Player3DPop, preloadPlayer3DVariant } from "@/components/Player3DPop";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import riseLogoWhite from "@/assets/RISEWhite.png";

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

interface Props {
  onComplete: () => void;
  /** Fired the moment the shader phase begins, so the page underneath
   *  can mount and be ready before the shader fades away. */
  onShaderStart?: () => void;
}

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
  | "shader"
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
  "shader":   3400,
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
  "p3-fade":  "shader",
  "shader":   "done",
  "done":     "done",
};

export const RepresentationIntro = ({ onComplete, onShaderStart }: Props) => {
  const { t } = useLanguage();
  const LINE1 = t("representation.intro_line1", "Realise your potential.");
  const LINE2 = t("representation.intro_line2", "See where you are going.");
  const LINE3 = t("representation.intro_line3", "Realise your potential.");
  const LINE4 = t("representation.intro_line4", "Work with us\nto make it a reality.");
  const LINE5 = t("representation.intro_line5", "Then…");
  const [phase, setPhase] = useState<Phase>("p1-line1");
  const [completed, setCompleted] = useState(false);
  // Use a pure system-ui font stack for the intro lines so there is
  // absolutely never a font-swap reflow. Even Inter (the body font)
  // arrived after first paint and shifted the centred, letter-spaced
  // lines visibly from the side. system-ui is always immediately
  // available so the text is stable from frame zero.
  const SYSTEM_FONT_STACK =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  useEffect(() => {
    preloadPlayer3DVariant("two");
    preloadPlayer3DVariant("one");
    // Tell the audio layer the cinematic has begun so it can attempt
    // playback (and arm a one-shot gesture unlock for mobile).
    try { window.dispatchEvent(new Event("rep-intro-start")); } catch {}
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
    if (phase === "done") { finishIntro(); return; }
    const t = setTimeout(() => setPhase(NEXT[phase]), PHASE_DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase, finishIntro]);

  // Tell the parent the moment we hit the shader so the page below
  // can mount and be ready behind the shader curtain.
  useEffect(() => {
    if (phase === "shader") onShaderStart?.();
  }, [phase, onShaderStart]);

  if (phase === "done") return null;

  // Which lines should be visible right now.
  const showTopGold   = ["p1-line1", "p1-both"].includes(phase);
  const showSecond    = phase === "p1-both";
  const showTopGold2  = ["p2-line3", "p2-both"].includes(phase);
  const showFourth    = phase === "p2-both";
  const showFifth     = phase === "p3-line5";
  const inShader      = phase === "shader";
  const inPair1       = ["p1-line1", "p1-both", "p1-fade"].includes(phase);
  const inPair2       = ["p2-line3", "p2-both", "p2-fade"].includes(phase);
  const topLine = inPair1 ? LINE1 : inPair2 ? LINE3 : showFifth ? LINE5 : "";
  const bottomLine = inPair1 ? LINE2 : inPair2 ? LINE4 : "";
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
        initial={{ opacity: 0.55 }}
        animate={{ opacity: pair1Opacity }}
        transition={{ duration: phase === "p1-fade" ? 0.9 : 0.2, ease: "easeInOut" }}
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

      {/* Lines stack: no AnimatePresence remounts between pairs. The same
          two DOM slots stay mounted so lines 3-5 cannot inherit a side
          entry/reflow from a new text node or delayed font measurement. */}
      {inShader && (
        <motion.div
          key="rep-intro-shader"
          className="absolute inset-0 z-40 flex items-center justify-center bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        >
          <div className="absolute inset-0">
            <ShaderAnimation />
          </div>
          <motion.img
            src={riseLogoWhite}
            alt="RISE"
            className="relative z-10 h-16 w-auto object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.6)] md:h-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 1, 0.92], scale: [0.9, 1, 1.04, 1.02] }}
            transition={{ duration: 3.2, times: [0, 0.18, 0.78, 1], ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {!inShader && (
        <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center md:gap-6 ${showFifth ? "" : "pb-[28vh] md:pb-[22vh]"}`}>
          {/* TOP slot */}
          <div className="flex h-12 w-full items-end justify-center md:h-16">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: (showTopGold || showTopGold2 || showFifth) ? 1 : 0, y: (showTopGold || showTopGold2 || showFifth) ? 0 : 14 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className={`${showFifth ? "text-2xl tracking-[0.22em] md:text-4xl" : "text-lg tracking-[0.16em] md:text-2xl lg:text-3xl"} max-w-full whitespace-pre-line font-semibold uppercase`}
              style={{ color: "hsl(var(--gold))", fontFamily: SYSTEM_FONT_STACK }}
            >
              {topLine}
            </motion.p>
          </div>
          {/* BOTTOM slot */}
          <div className="flex h-12 w-full items-start justify-center md:h-16">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: (showSecond || showFourth) ? 1 : 0, y: (showSecond || showFourth) ? 0 : 14 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-full whitespace-pre-line font-semibold uppercase tracking-[0.16em] text-lg text-foreground md:text-2xl lg:text-3xl"
              style={{ fontFamily: SYSTEM_FONT_STACK }}
            >
              {bottomLine}
            </motion.p>
          </div>
        </div>
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