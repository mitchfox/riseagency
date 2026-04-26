import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  Gauge, Users, Sparkles, PoundSterling, FileText, Target, Search,
  ExternalLink, HelpCircle, Activity, Brain, Zap, Crosshair,
  Dumbbell, Apple, Cpu, Heart, Globe2,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HoverText } from "@/components/HoverText";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmokeOverlay } from "@/components/SmokeOverlay";
import { RepresentationIntro } from "@/components/RepresentationIntro";
import { SectionSliderWheel } from "@/components/SectionSliderWheel";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { SCOUTING_POSITIONS, POSITION_SKILLS, type ScoutingPosition } from "@/data/scoutingSkills";
import representationTy from "@/assets/representation-ty.png";
import riseLogoWhite from "@/assets/RISEWhite.png";

type AgeGroup = null | "under18" | "over18";
type GroupKey = "who" | "how" | "terms";
type CardKey =
  | "scouting" | "expectations"
  | "performance" | "network" | "brand"
  | "fees" | "agreement" | "faqs";
type PerformanceSub = "analysis" | "actions" | "sps" | "nutrition" | "technique" | "psychology";

const RONALDO_REPORT_URL = "https://risefootballagency.com/report/cristiano-ronaldo-vs-al-nassr";
const WHATSAPP_URL = "https://wa.me/447508342901";

const MISSION_BIO =
  "RISE Football Agency is built on a deep understanding of performance and how it shapes decisions at every level of the game. We represent and work directly with clubs through an established international network, underpinned by an unrivalled background in developing Premier League level talent. With scouting coverage across Europe and Africa informing recruitment and placement through evidence, standards and proven pathways - our stars share our ethic, mindset and attention to detail to performance.";

interface CardMeta {
  key: CardKey;
  title: string;
  icon: typeof Gauge;
  subtitle: string;
  group: GroupKey;
}

const CARD_META: CardMeta[] = [
  // Who We Select
  { key: "scouting",     title: "Scouting",      icon: Search,        subtitle: "How we assess fit by position",     group: "who" },
  { key: "expectations", title: "Expectations",  icon: Target,        subtitle: "Standards on and off the pitch",    group: "who" },
  // How We Work
  { key: "performance",  title: "Performance",   icon: Gauge,         subtitle: "How we measure & develop your game", group: "how" },
  { key: "network",      title: "Club Network",  icon: Users,         subtitle: "Introductions with proper context", group: "how" },
  { key: "brand",        title: "Brand",         icon: Sparkles,      subtitle: "A sharper public-facing profile",   group: "how" },
  // What Are The Terms
  { key: "fees",         title: "Fees",          icon: PoundSterling, subtitle: "Clear from the start",              group: "terms" },
  { key: "agreement",    title: "Agreement",     icon: FileText,      subtitle: "What the relationship covers",      group: "terms" },
  { key: "faqs",         title: "FAQs",          icon: HelpCircle,    subtitle: "Quick answers before you reach out", group: "terms" },
];

const GROUP_LABELS: Record<GroupKey, string> = {
  who: "Who We Select",
  how: "How We Work",
  terms: "What Are The Terms",
};

const GROUPS: GroupKey[] = ["who", "how", "terms"];

/** Three-letter language label shown next to the map selector flag. */
const LANG_ABBR: Record<string, string> = {
  en: "ENG", es: "ESP", pt: "POR", fr: "FRA", de: "GER", it: "ITA",
  pl: "POL", cs: "CZE", ru: "RUS", tr: "TUR", hr: "CRO", no: "NOR",
};

/** Solid-black plate (with a faint gold edge wash) used for hub/detail
 *  sections. Marble texture is reserved for the title plate only so the
 *  rest of the page reads as a clean dark surface. */
const solidBlackSectionStyle: React.CSSProperties = {
  backgroundColor: "hsl(0 0% 4%)",
};

const FAQS_BY_AGE: Record<Exclude<AgeGroup, null>, Array<{ q: string; a: string }>> = {
  under18: [
    { q: "Do you charge a fee to represent under-18 players?", a: "No. There is no commission for under-18 representation. Any future work is discussed openly with the player and family before anything moves on." },
    { q: "Does a parent or guardian have to be involved?", a: "Yes. Parental or guardian involvement is required for under-18 representation. They sit in on key conversations and sign the agreement alongside the player." },
    { q: "What footage should we send?", a: "Recent full-match footage is best. Highlights help, but full games show level, decision making and consistency. A short summary of current club and position is also useful." },
    { q: "How long does the scouting process take?", a: "Once we have the footage and key details, we usually come back within a couple of weeks with a clear yes, a not yet, or further questions." },
    { q: "Will my child train with RISE?", a: "We do not run a training programme. We support development through analysis, feedback and well-considered next steps with the existing club or a better-fitting one." },
    { q: "What does the representation agreement actually cover?", a: "It sets out what we do, what support is included, how communication works and what the working relationship looks like. Everything is explained in plain terms." },
  ],
  over18: [
    { q: "What does it actually cost?", a: "Fees are discussed properly at the outset and set out clearly. No hidden charges, no vague extras. If we work together, the financial side is explained in plain terms before anything is signed." },
    { q: "How do you decide whether to represent a player?", a: "We look at level, position, evidence and whether there is a realistic fit for the player and the agency. If it is there, we move forward. If not, that is said clearly." },
    { q: "Can I keep my current agent and add RISE?", a: "No. Standard intermediary rules mean we work as the sole representative once an agreement is in place. We will not move forward while another exclusive agreement is active." },
    { q: "What is the agreement length?", a: "Standard intermediary terms apply. Length and scope are explained before signing so you know exactly what you are committing to and for how long." },
    { q: "What kind of performance support do I get?", a: "Real R90 reports, clipped actions, full match analysis and clear next steps. The aim is to make your level easier for clubs to trust and easier for you to improve." },
    { q: "How quickly will I hear back after submitting?", a: "We aim to respond within a few working days. Full assessment takes longer because we want to be properly informed before saying yes or no." },
  ],
};

const getCardContent = (ageGroup: Exclude<AgeGroup, null>) => ({
  scouting: {
    eyebrow: "How we decide whether there is a fit",
    points: [
      "You send the key details, recent footage and enough information for us to assess properly.",
      "We grade against 16 position-specific attributes across Physical, Mental, Technical and Tactical domains.",
      "If the fit is there, we look more closely and speak directly about the next step.",
      "If it is not there yet, that is better said clearly than dressed up with nonsense.",
    ],
  },
  performance: {
    eyebrow: "Real R90 reporting and player development",
    points: ageGroup === "under18"
      ? [
          "We build proper R90 reports, clipped actions and match reviews so the level is easy to understand.",
          "Development work is shaped by what the footage actually shows, not generic advice.",
          "Training themes, match detail and progress points are kept clear for the player and family.",
          "The aim is to show where the player is now and what needs sharpening next.",
        ]
      : [
          "We build real R90 reports, clipped actions and full match analysis to show your level properly.",
          "Performance support is based on evidence from your games, with clear strengths and clear next steps.",
          "Coaching input, review work and standards are shaped around what helps your football move forward.",
          "The whole point is to make your level easier for clubs to trust and easier for you to improve.",
        ],
  },
  network: {
    eyebrow: "Context before contact",
    points: [
      "We do not throw players around blindly. We present them with footage, reports and proper context.",
      "Introductions are stronger when the player profile is clear, current and backed up by evidence.",
      "The focus is on the right opportunity, not pointless noise.",
      "That means better conversations with clubs and a clearer route when interest is genuine.",
    ],
  },
  brand: {
    eyebrow: "A stronger public-facing profile",
    points: [
      "Your presentation should look serious and consistent wherever somebody checks your profile.",
      "We tighten the way your football is shown across clips, reports and public materials.",
      "The goal is not hype. It is clarity, consistency and a more professional first impression.",
      "When the football is strong, the presentation should not let it down.",
    ],
  },
  fees: {
    eyebrow: "Simple and upfront",
    points: ageGroup === "under18"
      ? [
          "There is no commission for under-18 representation.",
          "Any work, support or next step is explained clearly before anything moves forward.",
          "There are no hidden extras dressed up afterwards.",
          "Everything is discussed properly so everybody knows where they stand.",
        ]
      : [
          "For players over 18, fees are discussed properly at the outset and set out clearly.",
          "No hidden charges, no vague extras and no pretending later that something meant something else.",
          "If we work together, the financial side is explained in plain terms before anything is signed.",
          "Clarity matters because trust matters.",
        ],
  },
  agreement: {
    eyebrow: "Clear terms, proper boundaries",
    points: ageGroup === "under18"
      ? [
          "For under-18 players, parent or guardian involvement is part of the process from the start.",
          "The agreement sets out what we do, what support is included and how communication works.",
          "Nothing should feel vague or hidden when a young player is being represented.",
          "Questions can be dealt with properly before anything moves on.",
        ]
      : [
          "The agreement sets out what we do, what support is included and what the working relationship looks like.",
          "Scope, expectations and fees should all be clear before the relationship begins.",
          "We would rather make terms easy to understand than fill the page with noise.",
          "You should know exactly what you are signing and exactly what you can expect.",
        ],
  },
  expectations: {
    eyebrow: "Standards matter",
    points: ageGroup === "under18"
      ? [
          "We want players who listen, work and take development seriously.",
          "Communication should stay honest and consistent so the player is supported properly.",
          "Good habits on and off the pitch matter just as much as moments on the ball.",
          "Progress is much easier when everybody is aligned and serious about the work.",
        ]
      : [
          "We expect honesty, professionalism and a serious approach to improvement.",
          "You have to be willing to hear clear feedback and act on it.",
          "Communication needs to stay direct and reliable so we can actually move things forward.",
          "The standards off the pitch should match the ambition on it.",
        ],
  },
});

interface PerfSubMeta {
  key: PerformanceSub;
  title: string;
  icon: typeof Gauge;
  blurb: string;
  detail: string[];
}

const PERFORMANCE_SUBS: PerfSubMeta[] = [
  { key: "analysis",   title: "Analysis",                icon: Gauge,    blurb: "Full match analysis & opponent breakdowns.", detail: [
    "Full match analysis with chronological context, not just selected highlights.",
    "Opponent breakdowns highlighting how the game shaped your decisions and outputs.",
    "Clipped key moments turned into a clear development picture.",
    "Used both for self-review and to give clubs an honest read of your level.",
  ]},
  { key: "actions",    title: "Action Reports",          icon: FileText, blurb: "R90-graded action reports for every meaningful touch.", detail: [
    "Every meaningful touch graded with the R90 system.",
    "Each clip carries a score, the surrounding context and the coaching point.",
    "Actions are grouped into categories so themes and trends are easy to read.",
    "See the Cristiano Ronaldo example below for the exact format.",
  ]},
  { key: "sps",        title: "Strength, Power & Speed", icon: Dumbbell, blurb: "Position-specific physical benchmarks & programmes.", detail: [
    "Physical benchmarks tied to position-specific demands, not generic gym standards.",
    "Targeted programmes built around your in-game outputs and weak points.",
    "Periodised so the heavy work serves the football, not the other way around.",
    "Reviewed regularly so progress is measured, not assumed.",
  ]},
  { key: "nutrition",  title: "Nutrition",               icon: Apple,    blurb: "Practical fuelling, recovery and hydration guidance.", detail: [
    "Practical fuelling shaped around training and match weeks.",
    "Recovery and hydration guidance that fits real schedules.",
    "Nothing faddish — just the work that actually keeps a player available and sharp.",
    "Adjusted as workload, environment and goals change.",
  ]},
  { key: "technique",  title: "Technique",               icon: Cpu,      blurb: "Detailed technical reviews on touch, passing & finishing.", detail: [
    "Detailed reviews on first touch, passing, finishing and position-specific actions.",
    "Frame-by-frame breakdowns where it matters.",
    "Focus stays on the technical detail clubs notice when they trust a player.",
    "Reinforced with clear, repeatable correction work.",
  ]},
  { key: "psychology", title: "Psychology",              icon: Heart,    blurb: "Mindset, focus and the mental side of competing.", detail: [
    "Mindset, focus and consistency at the level we are pushing towards.",
    "Honest conversations about pressure, setbacks and standards.",
    "Tools and frameworks that help on and off the pitch.",
    "The mental side is treated as part of performance, not an afterthought.",
  ]},
];

const DOMAIN_META: Record<string, { icon: typeof Activity; chip: string }> = {
  Physical:  { icon: Activity,  chip: "border-red-500/30 bg-red-500/10 text-red-300" },
  Mental:    { icon: Brain,     chip: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  Technical: { icon: Zap,       chip: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  Tactical:  { icon: Crosshair, chip: "border-green-500/30 bg-green-500/10 text-green-300" },
};

const SectionDivider = ({ label }: { label?: string }) => (
  <div className="my-6 flex items-center gap-3 md:my-8">
    <div className="h-[1px] flex-1 bg-primary/40" />
    {label ? (
      <span className="font-bebas text-xs uppercase tracking-[0.32em] text-primary md:text-sm">{label}</span>
    ) : (
      <div className="h-1 w-1 rounded-full bg-primary/70" />
    )}
    <div className="h-[1px] flex-1 bg-primary/40" />
  </div>
);

/** Top-of-page logo with a one-shot diagonal shine sweep on first reveal. */
const RiseLogoShine = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <img src={riseLogoWhite} alt="RISE Football Agency" className="block h-full w-auto" />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
      style={{ animation: "logoShineSweep 1.4s ease-out 0.4s 1 both" }}
    />
    <style>{`
      @keyframes logoShineSweep {
        0%   { transform: translateX(-150%) skewX(-12deg); opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: translateX(450%) skewX(-12deg); opacity: 0; }
      }
    `}</style>
  </div>
);

const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
    <path d="M16.02 3.2A12.7 12.7 0 0 0 5.2 22.55L3.6 28.8l6.38-1.5A12.68 12.68 0 1 0 16.02 3.2Zm0 2.42a10.26 10.26 0 0 1 8.72 15.67 10.24 10.24 0 0 1-13.94 3.64l-.46-.27-3.1.73.78-3.03-.3-.49A10.25 10.25 0 0 1 16.02 5.62Zm-4.08 4.58c-.25 0-.64.1-.98.47-.34.37-1.28 1.25-1.28 3.04s1.31 3.53 1.49 3.77c.18.25 2.53 4.05 6.25 5.52 3.09 1.22 3.72.98 4.39.92.67-.06 2.16-.88 2.46-1.74.3-.86.3-1.6.21-1.75-.09-.15-.34-.25-.71-.43-.37-.18-2.16-1.07-2.5-1.19-.34-.12-.58-.18-.83.18-.24.37-.95 1.19-1.17 1.43-.21.25-.43.28-.8.1-.37-.19-1.56-.58-2.97-1.84a11.15 11.15 0 0 1-2.05-2.55c-.21-.37-.02-.57.16-.75.17-.17.37-.43.55-.64.18-.21.24-.37.37-.61.12-.25.06-.46-.03-.64-.09-.18-.83-2.01-1.13-2.75-.3-.72-.6-.62-.83-.63h-.61Z" />
  </svg>
);

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const { language } = useLanguage();
  const [introDone, setIntroDone] = useState(false);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [scoutingPosition, setScoutingPosition] = useState<ScoutingPosition | null>(null);
  const [performanceSub, setPerformanceSub] = useState<PerformanceSub | null>(null);
  const [showForm, setShowForm] = useState(false);

  const cardContent = useMemo(() => (ageGroup ? getCardContent(ageGroup) : null), [ageGroup]);

  // Sticky footer shrink-on-scroll
  const { scrollY } = useScroll();
  const footerHeight = useTransform(scrollY, [0, 120], [72, 48]);
  const footerFontSize = useTransform(scrollY, [0, 120], [16, 12]);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 100));

  const openWhatsApp = () => window.open(WHATSAPP_URL, "_blank");

  const activeMeta = activeCard ? CARD_META.find((c) => c.key === activeCard)! : null;
  const activeGroup: GroupKey | null = activeMeta?.group ?? null;
  const groupSiblings = activeGroup ? CARD_META.filter((c) => c.group === activeGroup) : [];

  const goToSiblingCard = (delta: number) => {
    if (!activeMeta) return;
    const i = groupSiblings.findIndex((c) => c.key === activeMeta.key);
    const n = (i + delta + groupSiblings.length) % groupSiblings.length;
    setActiveCard(groupSiblings[n].key);
    setScoutingPosition(null);
    setPerformanceSub(null);
  };

  // Performance grid level: in Performance section but no sub picked yet.
  const inPerformanceGrid = activeCard === "performance" && performanceSub === null;
  // Scouting top level (no position picked).
  const inScoutingTop = activeCard === "scouting" && scoutingPosition === null;
  // Slider only shows when inside a single section (not on hub, not on performance grid).
  const showSlider = !!activeCard;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black text-foreground">
      <SEO
        title="Representation | RISE Football Agency"
        description="Realise your potential with RISE — proper analysis, real club introductions and clear standards. See exactly what representation looks like for your age and position."
      />

      {/* Cinematic intro: shown once on first load, then the age screen
          becomes available. */}
      <AnimatePresence>
        {!introDone && <RepresentationIntro key="intro" onComplete={() => setIntroDone(true)} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {introDone && !ageGroup ? (
          /* ============ AGE GROUP SCREEN ============ */
          <motion.section
            key="age"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh]"
          >
            <div className="absolute inset-0 bg-black" />
            {/* Background smoke (BEHIND the player overlay image) */}
            <SmokeOverlay layer="back" />
            {/* Player overlay - sits between the back smoke (z-0) and the
                front smoke (z-20). Centred on every breakpoint. */}
            <motion.img
              src={representationTy}
              alt="Tyrese Omotoye celebrating"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-10 h-full w-auto -translate-x-1/2 object-contain object-bottom"
              initial={{ x: "-72%", opacity: 1 }}
              animate={{ x: "-50%", opacity: 1 }}
              transition={{ duration: 14, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.15], opacity: [0, 0.5, 0] }}
              transition={{ duration: 2.8, delay: 14.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ boxShadow: "0 0 60px hsl(var(--gold) / 0.35), inset 0 0 80px hsl(var(--gold) / 0.16)" }}
            />
            {/* Front smoke (between player and text) */}
            <SmokeOverlay layer="front" />
            {/* Soft vignette so text reads cleanly on top */}
            <div className="absolute inset-0 z-[25] bg-[linear-gradient(180deg,hsl(0_0%_0%/0.55)_0%,transparent_28%,transparent_55%,hsl(0_0%_0%/0.85)_100%)]" />

            {/* Foreground content – fully centred. z-30 keeps it above all
                smoke + overlay layers. */}
            <div className="relative z-30 flex min-h-[100dvh] flex-col items-center justify-between px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center md:px-10">
              {/* TOP: RISE white logo + REPRESENTATION wordmark */}
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col items-center"
              >
                <RiseLogoShine className="h-12 md:h-16" />
                <h1 className="mt-2 font-bebas text-3xl uppercase leading-none tracking-[0.32em] text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                  REPRESENTATION
                </h1>
              </motion.div>

              {/* BOTTOM: tagline + age bracket cluster, all centred. */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="flex w-full max-w-md flex-col items-center md:max-w-2xl lg:max-w-3xl"
              >
                <p className="text-balance text-sm leading-snug text-foreground/85 md:text-base lg:text-lg">
                  Realise potential with our experienced intermediary &amp; English Premier League star performance team.
                </p>

                {/* Group divider belongs ABOVE the age section so the
                    relationship between the heading and the buttons is
                    obvious. */}
                <div className="my-5 h-[1px] w-24 bg-primary/70 md:my-7 md:w-32" />

                {/*
                  Age panel: a single rounded rectangle whose padding
                  extends down so the language selector below sits
                  visually inside the bottom edge of the rectangle.
                  The selector is rendered inside the panel as the
                  final element so the border genuinely encloses it.
                */}
                <div className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-black/55 px-3 pt-4 pb-5 backdrop-blur-md md:px-5 md:pt-5 md:pb-6 lg:px-6">
                  <p className="font-bebas text-base uppercase tracking-[0.32em] text-primary md:text-lg">
                    Choose your age bracket
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-foreground/85 md:max-w-md md:text-base">
                    For a more personalised breakdown of what representation will look like for you.
                  </p>
                  <div className="mt-3 grid w-full grid-cols-2 gap-3 md:gap-4">
                    <Button
                      size="lg"
                      hoverEffect
                      className="h-14 rounded-2xl bg-primary font-bebas text-lg uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 md:h-16 md:text-xl lg:text-2xl"
                      onClick={() => setAgeGroup("under18")}
                    >
                      <HoverText text="Under 18" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      hoverEffect
                      className="h-14 rounded-2xl border-primary/50 bg-background/40 font-bebas text-lg uppercase tracking-[0.14em] text-primary backdrop-blur-md hover:border-primary hover:bg-primary/10 hover:text-primary md:h-16 md:text-xl lg:text-2xl"
                      onClick={() => setAgeGroup("over18")}
                    >
                      <HoverText text="Over 18" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>
        ) : activeCard && cardContent ? (
          /* ============ DETAIL SCREEN (full takeover) ============ */
          <DetailView
            key={`detail-${activeCard}-${scoutingPosition ?? ""}-${performanceSub ?? ""}`}
            activeCard={activeCard}
            cardContent={cardContent}
            ageGroup={ageGroup}
            scoutingPosition={scoutingPosition}
            setScoutingPosition={setScoutingPosition}
            performanceSub={performanceSub}
            setPerformanceSub={setPerformanceSub}
            onBack={() => {
              if (performanceSub) { setPerformanceSub(null); return; }
              if (scoutingPosition) { setScoutingPosition(null); return; }
              setActiveCard(null);
            }}
          />
        ) : cardContent ? (
          /* ============ HUB SCREEN ============ */
          <motion.section
            key="hub"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-8 md:pt-12 md:pb-44 lg:px-16"
          >
            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
              <motion.header
                animate={scrolled ? "compact" : "open"}
                variants={{ open: { paddingTop: 0, paddingBottom: 28 }, compact: { paddingTop: 0, paddingBottom: 10 } }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-30 -mx-4 bg-black/88 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-center backdrop-blur-md md:-mx-8 md:px-8 lg:-mx-16 lg:px-16"
              >
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
                <div className="mx-auto flex max-w-4xl flex-col items-center">
                  <RiseLogoShine className={scrolled ? "h-9 md:h-10" : "h-12 md:h-16"} />
                  <AnimatePresence initial={false}>
                    {!scrolled && (
                      <motion.div
                        key="rep-feature-title"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22 }}
                        className="flex flex-col items-center"
                      >
                        <div className="mt-3 flex w-full items-center gap-3">
                          <span className="h-px flex-1 bg-primary/45" />
                          <h1 className="font-bebas text-5xl uppercase leading-none tracking-[0.28em] text-foreground md:text-8xl">REPRESENTATION</h1>
                          <span className="h-px flex-1 bg-primary/45" />
                        </div>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground/82 md:mt-5 md:max-w-3xl md:text-base">
                          {MISSION_BIO}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.header>

              {/* Grouped tile sections */}
              {GROUPS.map((g) => {
                const cards = CARD_META.filter((c) => c.group === g);
                return (
                  <div key={g}>
                    <SectionDivider label={GROUP_LABELS[g]} />
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:gap-5">
                      {cards.map((card, index) => {
                        const Icon = card.icon;
                        return (
                          <motion.button
                            key={card.key}
                            type="button"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.03, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ delay: index * 0.04, duration: 0.42 }}
                            onClick={() => { setActiveCard(card.key); setScoutingPosition(null); setPerformanceSub(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-5"
                            style={solidBlackSectionStyle}
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
                            <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                                <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                              </div>
                              <div>
                                <p className="font-bebas text-lg uppercase leading-none tracking-[0.1em] md:text-2xl lg:text-3xl">{card.title}</p>
                                <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">{card.subtitle}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* Sticky CTA buttons + scoped slider — only when inside a section */}
      {ageGroup && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md md:max-w-2xl">
            {showSlider && groupSiblings.length > 0 && (
              <div className="mb-1.5 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => { setActiveCard(null); setScoutingPosition(null); setPerformanceSub(null); }}
                  className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-[10px] font-bebas uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
                >
                  <ChevronLeft className="h-3 w-3" /> Back to all
                </button>
                <div>
                  <SectionSliderWheel
                    sections={groupSiblings.map((c) => ({ key: c.key, label: c.title }))}
                    activeKey={activeCard ?? groupSiblings[0].key}
                    onChange={(k) => { setActiveCard(k as CardKey); setScoutingPosition(null); setPerformanceSub(null); }}
                  />
                </div>
              </div>
            )}
            <motion.div className="grid grid-cols-2 gap-2" style={{ height: footerHeight }}>
              <motion.button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex h-full items-center justify-center rounded-xl bg-primary px-1.5 py-1.5 text-center font-bebas uppercase tracking-[0.12em] text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
              >
                {scrolled ? (
                  <motion.span style={{ fontSize: footerFontSize }} className="px-1">Request Representation</motion.span>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 leading-[0.95]">
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[17px] md:text-xl">Request</span>
                      <span className="text-[17px] md:text-xl">Representation</span>
                    </div>
                  </div>
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={openWhatsApp}
                className="flex h-full items-center justify-center rounded-xl border border-primary/50 bg-background/80 px-1.5 py-1.5 text-center font-bebas uppercase tracking-[0.12em] text-primary shadow-lg transition-colors hover:border-primary hover:bg-primary/10"
              >
                {scrolled ? (
                  <motion.span style={{ fontSize: footerFontSize }} className="px-1">Contact Us</motion.span>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 leading-[0.95]">
                    <WhatsAppIcon className="h-4 w-4 md:h-5 md:w-5" />
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[17px] md:text-xl">Contact</span>
                      <span className="text-[17px] md:text-xl">Us</span>
                    </div>
                  </div>
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} ageGroup={ageGroup} />
    </div>
  );
};

/* =================================================================
 * Detail view (full screen)
 * ================================================================= */

interface DetailViewProps {
  activeCard: CardKey;
  cardContent: ReturnType<typeof getCardContent>;
  ageGroup: AgeGroup;
  scoutingPosition: ScoutingPosition | null;
  setScoutingPosition: (p: ScoutingPosition | null) => void;
  performanceSub: PerformanceSub | null;
  setPerformanceSub: (p: PerformanceSub | null) => void;
  onBack: () => void;
}

const DetailView = ({
  activeCard, cardContent, ageGroup,
  scoutingPosition, setScoutingPosition,
  performanceSub, setPerformanceSub,
  onBack,
}: DetailViewProps) => {
  const meta = CARD_META.find((c) => c.key === activeCard)!;
  const Icon = meta.icon;
  const content = (cardContent as any)[activeCard];

  // Sub-screen: scouting position
  if (activeCard === "scouting" && scoutingPosition) {
    return (
      <motion.section
        key={`scout-${scoutingPosition}`}
        initial={{ opacity: 0, x: 42 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -42 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-8 md:pt-10 md:pb-44 lg:px-16"
      >
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl">
          <BackPill onClick={onBack} label={`Back to Scouting`} />
          <TitlePlate icon={Icon} title={`${scoutingPosition}`} eyebrow="Position breakdown" />
          <div className="mt-5 grid gap-3 md:mt-7 md:grid-cols-2">
            {(["Physical", "Mental", "Technical", "Tactical"] as const).map((domain) => {
              const skills = POSITION_SKILLS[scoutingPosition].filter((s) => s.domain === domain);
              if (skills.length === 0) return null;
              const dmeta = DOMAIN_META[domain];
              const DIcon = dmeta.icon;
              return (
                <div key={domain} className="rounded-2xl border border-border/60 bg-card/55 p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bebas uppercase tracking-[0.18em] ${dmeta.chip}`}>
                      <DIcon className="h-3 w-3" /> {domain}
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {skills.map((s) => (
                      <li key={s.skill_name} className="rounded-xl border border-border/40 bg-background/40 p-3">
                        <p className="font-bebas text-sm uppercase tracking-[0.12em] text-primary">{s.skill_name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground/80 md:text-sm">{s.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
    );
  }

  // Sub-screen: performance sub
  if (activeCard === "performance" && performanceSub) {
    const sub = PERFORMANCE_SUBS.find((s) => s.key === performanceSub)!;
    const SIcon = sub.icon;
    return (
      <motion.section
        key={`perf-${performanceSub}`}
        initial={{ opacity: 0, x: 42 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -42 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-8 md:pt-10 md:pb-44 lg:px-16"
      >
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl">
          <BackPill onClick={onBack} label="Back to Performance" />
          <TitlePlate icon={SIcon} title={sub.title} eyebrow={sub.blurb} />
          <div className="mt-5 space-y-3 md:mt-7 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {sub.detail.map((p, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/85 md:p-5 md:text-base">
                {p}
              </div>
            ))}
          </div>
          {performanceSub === "actions" && (
            <a
              href={RONALDO_REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 md:p-5"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                See an example performance report (Cristiano Ronaldo)
              </span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          )}
        </div>
      </motion.section>
    );
  }

  // Default: section detail
  return (
    <motion.section
      key={`detail-${activeCard}`}
      initial={{ opacity: 0, x: 42 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -42 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-8 md:pt-10 md:pb-44 lg:px-16"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl">
        <BackPill onClick={onBack} label="Back to all" />
        <TitlePlate icon={Icon} title={meta.title} eyebrow={content?.eyebrow ?? meta.subtitle} />

        <div className="mt-5 space-y-3 md:mt-7">
          {/* FAQs */}
          {activeCard === "faqs" && (
            <Accordion type="single" collapsible className="space-y-2.5">
              {FAQS_BY_AGE[ageGroup as Exclude<AgeGroup, null>].map((faq, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="rounded-2xl border border-border/60 bg-card/55 px-4 md:px-5"
                >
                  <AccordionTrigger className="py-4 text-left font-bebas text-sm uppercase tracking-[0.12em] hover:no-underline md:text-base">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-foreground/80 md:text-base">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Scouting top level */}
          {activeCard === "scouting" && (
            <div className="space-y-4">
              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                {content.points.map((p: string, i: number) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                    {p}
                  </div>
                ))}
              </div>

              <SectionDivider />

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary/85">Pick a position</p>
                <p className="mb-3 text-xs text-muted-foreground md:text-sm">Choose your position to see exactly what we look for. The breakdown opens on its own screen — use the back arrow to return here.</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                  {SCOUTING_POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setScoutingPosition(pos)}
                      className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 text-left font-bebas text-sm uppercase tracking-[0.1em] text-foreground/80 hover:border-primary/60 hover:bg-card/70 transition-colors"
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance top level → grid of sub sections */}
          {activeCard === "performance" && (
            <div className="space-y-4">
              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                {content.points.map((p: string, i: number) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                    {p}
                  </div>
                ))}
              </div>

              <SectionDivider label="Inside Performance" />

              <p className="text-xs text-muted-foreground md:text-sm">
                Each area below opens on its own screen. Tap to see the detail.
              </p>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
                {PERFORMANCE_SUBS.map((sub) => {
                  const SIcon = sub.icon;
                  return (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setPerformanceSub(sub.key)}
                      className="group rounded-2xl border border-border/60 bg-card/55 p-4 text-left transition-all hover:border-primary/60 hover:bg-card/70 md:p-5"
                    >
                      <div className="flex items-center gap-2">
                        <SIcon className="h-4 w-4 text-primary" />
                        <p className="font-bebas text-sm uppercase tracking-[0.12em] md:text-base">{sub.title}</p>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-foreground/75 md:text-xs">{sub.blurb}</p>
                      <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bebas uppercase tracking-[0.2em] text-primary">
                        Tap for more <ChevronRight className="h-3 w-3" />
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Club Network */}
          {activeCard === "network" && (
            <div className="space-y-3">
              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                {content.points.map((p: string, i: number) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                    {p}
                  </div>
                ))}
              </div>
              <SectionDivider />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/85">
                <Globe2 className="h-3.5 w-3.5" /> Our live scouting network
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                <div className="h-[420px] md:h-[600px]">
                  <ScoutingNetworkMap hideStats hideGridToggle />
                </div>
              </div>
            </div>
          )}

          {/* Generic content */}
          {(activeCard === "brand" || activeCard === "fees" || activeCard === "agreement" || activeCard === "expectations") && (
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
              {content.points.map((point: string, index: number) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.24 }}
                  className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base"
                >
                  {point}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

const BackPill = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:mb-6"
  >
    <ChevronLeft className="h-3.5 w-3.5" /> {label}
  </button>
);

const TitlePlate = ({
  icon: Icon, title, eyebrow,
}: { icon: typeof Gauge; title: string; eyebrow?: string }) => (
  <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 p-6 md:p-8" style={solidBlackSectionStyle}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
    <div className="relative flex flex-col items-center gap-4 text-center md:gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_30px_hsl(var(--gold)/0.12)] md:h-20 md:w-20">
        <Icon className="h-7 w-7 text-primary md:h-9 md:w-9" />
      </div>
      <p className="font-bebas text-3xl uppercase leading-none tracking-[0.16em] md:text-5xl">{title}</p>
      {eyebrow && <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground md:text-sm">{eyebrow}</p>}
    </div>
  </div>
);

export default RequestRepresentation;
