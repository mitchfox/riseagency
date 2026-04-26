import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, MessageCircle, ChevronLeft, ChevronRight,
  Gauge, Users, Sparkles, PoundSterling, FileText, Target, Search,
  ExternalLink, HelpCircle, Activity, Brain, Zap, Crosshair,
  Dumbbell, Apple, Cpu, Heart, Globe2,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HoverText } from "@/components/HoverText";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { SmokeOverlay } from "@/components/SmokeOverlay";
import { SectionSliderWheel } from "@/components/SectionSliderWheel";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { SCOUTING_POSITIONS, POSITION_SKILLS, type ScoutingPosition } from "@/data/scoutingSkills";
import representationBgRise from "@/assets/representation-bg-rise.png";
import representationTy from "@/assets/representation-ty.png";
import blackMarbleSmudged from "@/assets/black-marble-smudged.png";
import riseLogoWhite from "@/assets/RISEWhite.png";

type AgeGroup = null | "under18" | "over18";
type CardKey =
  | "scouting" | "performance" | "network" | "brand"
  | "fees" | "agreement" | "expectations" | "faqs";
type PerformanceSub = "analysis" | "actions" | "sps" | "nutrition" | "technique" | "psychology";

const RONALDO_REPORT_URL = "https://risefootballagency.com/report/cristiano-ronaldo-vs-al-nassr";
const WHATSAPP_URL = "https://wa.me/447508342901";

const CARD_META: Array<{ key: CardKey; title: string; icon: typeof Gauge; subtitle: string }> = [
  { key: "scouting",     title: "Scouting",      icon: Search,        subtitle: "How we assess fit by position" },
  { key: "performance",  title: "Performance",   icon: Gauge,         subtitle: "How we measure & develop your game" },
  { key: "network",      title: "Club Network",  icon: Users,         subtitle: "Introductions with proper context" },
  { key: "brand",        title: "Brand",         icon: Sparkles,      subtitle: "A sharper public-facing profile" },
  { key: "fees",         title: "Fees",          icon: PoundSterling, subtitle: "Clear from the start" },
  { key: "agreement",    title: "Agreement",     icon: FileText,      subtitle: "What the relationship covers" },
  { key: "expectations", title: "Expectations",  icon: Target,        subtitle: "Standards on and off the pitch" },
  { key: "faqs",         title: "FAQs",          icon: HelpCircle,    subtitle: "Quick answers before you reach out" },
];

const blackMarbleBgStyle = {
  backgroundImage: [
    "radial-gradient(ellipse at 22% 18%, hsl(var(--gold) / 0.16), transparent 38%)",
    "radial-gradient(ellipse at 80% 78%, hsl(var(--gold) / 0.10), transparent 42%)",
    "linear-gradient(180deg, hsl(var(--background) / 0.55), hsl(var(--background) / 0.78))",
    `url(${blackMarbleSmudged})`,
  ].join(", "),
  backgroundSize: "auto, auto, auto, cover",
  backgroundPosition: "center",
};

const marbleStyle = {
  backgroundImage: [
    "radial-gradient(circle at 18% 18%, hsl(var(--gold) / 0.18), transparent 28%)",
    "radial-gradient(circle at 80% 22%, hsl(var(--foreground) / 0.12), transparent 24%)",
    "radial-gradient(circle at 68% 78%, hsl(var(--gold) / 0.12), transparent 22%)",
    "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 48%, hsl(var(--background)) 100%)",
  ].join(", "),
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
    title: "Scouting",
    eyebrow: "How we decide whether there is a fit",
    points: [
      "You send the key details, recent footage and enough information for us to assess properly.",
      "We grade against 16 position-specific attributes across Physical, Mental, Technical and Tactical domains.",
      "If the fit is there, we look more closely and speak directly about the next step.",
      "If it is not there yet, that is better said clearly than dressed up with nonsense.",
    ],
  },
  performance: {
    title: "Performance",
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
    title: "Club Network",
    eyebrow: "Context before contact",
    points: [
      "We do not throw players around blindly. We present them with footage, reports and proper context.",
      "Introductions are stronger when the player profile is clear, current and backed up by evidence.",
      "The focus is on the right opportunity, not pointless noise.",
      "That means better conversations with clubs and a clearer route when interest is genuine.",
    ],
  },
  brand: {
    title: "Brand",
    eyebrow: "A stronger public-facing profile",
    points: [
      "Your presentation should look serious and consistent wherever somebody checks your profile.",
      "We tighten the way your football is shown across clips, reports and public materials.",
      "The goal is not hype. It is clarity, consistency and a more professional first impression.",
      "When the football is strong, the presentation should not let it down.",
    ],
  },
  fees: {
    title: "Fees",
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
    title: "Representation Agreement",
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
    title: "Expectations",
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

const PERFORMANCE_SUBS: Array<{ key: PerformanceSub; title: string; icon: typeof Gauge; blurb: string }> = [
  { key: "analysis",    title: "Analysis",                icon: Gauge,    blurb: "Full match analysis, opponent breakdowns and clipped key moments turned into a clear development picture." },
  { key: "actions",     title: "Action Reports",          icon: FileText, blurb: "R90-graded action reports clipping every meaningful touch with score, context and coaching points." },
  { key: "sps",         title: "Strength, Power & Speed", icon: Dumbbell, blurb: "Position-specific physical benchmarks and targeted programmes built around your in-game demands." },
  { key: "nutrition",   title: "Nutrition",               icon: Apple,    blurb: "Practical fuelling, recovery and hydration guidance shaped around training and match weeks." },
  { key: "technique",   title: "Technique",               icon: Cpu,      blurb: "Detailed technical reviews on first touch, finishing, passing and position-specific actions." },
  { key: "psychology",  title: "Psychology",              icon: Heart,    blurb: "Mindset, focus, consistency and the mental side of competing at the next level." },
];

const DOMAIN_META: Record<string, { icon: typeof Activity; chip: string }> = {
  Physical:  { icon: Activity,  chip: "border-red-500/30 bg-red-500/10 text-red-300" },
  Mental:    { icon: Brain,     chip: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  Technical: { icon: Zap,       chip: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  Tactical:  { icon: Crosshair, chip: "border-green-500/30 bg-green-500/10 text-green-300" },
};

const SectionDivider = () => (
  <div className="my-5 flex items-center gap-3 md:my-7">
    <div className="h-[1px] flex-1 bg-primary/40" />
    <div className="h-1 w-1 rounded-full bg-primary/70" />
    <div className="h-[1px] flex-1 bg-primary/40" />
  </div>
);

const RequestRepresentation = () => {
  const [bootLoading, setBootLoading] = useState(true);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [scoutingPosition, setScoutingPosition] = useState<ScoutingPosition | null>(null);
  const [performanceSub, setPerformanceSub] = useState<PerformanceSub | null>(null);
  const [showForm, setShowForm] = useState(false);

  const cardContent = useMemo(() => (ageGroup ? getCardContent(ageGroup) : null), [ageGroup]);

  // Quick boot loader for branded entrance
  useEffect(() => {
    const t = setTimeout(() => setBootLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Sticky footer shrink-on-scroll
  const { scrollY } = useScroll();
  const footerHeight = useTransform(scrollY, [0, 120], [64, 36]);
  const footerFontSize = useTransform(scrollY, [0, 120], [14, 10]);

  const openWhatsApp = () => window.open(WHATSAPP_URL, "_blank");

  const goToAdjacentCard = (direction: "prev" | "next") => {
    if (!activeCard) return;
    const i = CARD_META.findIndex((c) => c.key === activeCard);
    const n = direction === "next" ? (i + 1) % CARD_META.length : (i - 1 + CARD_META.length) % CARD_META.length;
    setActiveCard(CARD_META[n].key);
    setScoutingPosition(null);
    setPerformanceSub(null);
  };

  if (bootLoading) {
    return <RiseBrandedLoader label="Representation" />;
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <SEO
        title="Representation | RISE Football Agency"
        description="Realise your potential with RISE — proper analysis, real club introductions and clear standards. See exactly what representation looks like for your age and position."
      />

      {/* Persistent language switcher top-right */}
      <div className="fixed top-3 right-3 z-50 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 backdrop-blur-md">
        <LanguageSelector />
      </div>

      <AnimatePresence mode="wait">
        {!ageGroup ? (
          /* ============ AGE GROUP SCREEN ============ */
          <motion.section
            key="age"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh]"
          >
            {/* Mobile: RISE black background + Ty overlay sliding in. */}
            <img
              src={representationBgRise}
              alt="RISE - Realise Potential"
              className="absolute inset-0 h-full w-full object-cover object-top md:hidden"
            />
            <motion.img
              src={representationTy}
              alt="Tyrese Omotoye celebrating"
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto object-contain object-bottom md:hidden"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            />
            <div
              className="absolute inset-0 hidden md:block"
              style={blackMarbleBgStyle}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.16),hsl(var(--background)/0.55)_55%,hsl(var(--background))_100%)] md:hidden" />

            <SmokeOverlay />

            <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] md:justify-center">
              <div className="mx-auto w-full max-w-sm md:max-w-5xl lg:max-w-6xl">
                <div className="md:grid md:grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12">
                  <div className="md:text-center lg:text-left">
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.42 }}
                    >
                      <img
                        src={riseLogoWhite}
                        alt="RISE Football Agency"
                        className="hidden md:block md:mx-auto lg:mx-0 mb-6 h-12 w-auto"
                      />
                      <h1 className="font-bebas text-5xl uppercase leading-none tracking-[0.12em] sm:text-6xl md:text-8xl">
                        REPRESENTATION
                      </h1>
                      <p className="mt-4 text-sm leading-relaxed text-foreground/84 md:mt-6 md:max-w-xl md:mx-auto lg:mx-0 md:text-lg">
                        Realise potential with our experienced intermediary &amp; English Premier League star performance team.
                      </p>
                      <p className="mt-4 max-w-md text-xs uppercase tracking-[0.18em] text-primary/85 md:mt-5 md:max-w-xl md:mx-auto lg:mx-0">
                        Choose your age bracket so we can show you a personalised breakdown of what representation will look like for you.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16, duration: 0.42 }}
                      className="mt-8 grid w-full gap-3 max-w-sm md:max-w-xl md:mx-auto lg:mx-0 md:grid-cols-2 md:gap-4"
                    >
                      <Button
                        size="lg"
                        hoverEffect
                        className="h-14 rounded-2xl bg-primary font-bebas text-lg uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 md:h-16 md:text-xl"
                        onClick={() => setAgeGroup("under18")}
                      >
                        <HoverText text="Under 18" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        hoverEffect
                        className="h-14 rounded-2xl border-primary/50 bg-background/40 font-bebas text-lg uppercase tracking-[0.14em] text-primary hover:border-primary hover:bg-primary/10 hover:text-primary backdrop-blur-md md:h-16 md:text-xl"
                        onClick={() => setAgeGroup("over18")}
                      >
                        <HoverText text="Over 18" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ) : activeCard && cardContent ? (
          /* ============ DETAIL SCREEN ============ */
          <motion.section
            key={`detail-${activeCard}`}
            initial={{ opacity: 0, x: 42 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -42 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 md:px-8 md:pt-10 md:pb-36"
          >
            <div className="pointer-events-none absolute inset-0" style={blackMarbleBgStyle} />
            <SmokeOverlay />
            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl">
              <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
                <button
                  onClick={() => { setActiveCard(null); setScoutingPosition(null); setPerformanceSub(null); }}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToAdjacentCard("prev")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => goToAdjacentCard("next")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-8">
                <div>
                  <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 p-6" style={marbleStyle}>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.1),hsl(var(--background)/0.72))]" />
                    <div className="relative flex min-h-[160px] flex-col items-center justify-center gap-4 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_30px_hsl(var(--gold)/0.12)]">
                        {(() => {
                          const Icon = CARD_META.find((c) => c.key === activeCard)!.icon;
                          return <Icon className="h-7 w-7 text-primary" />;
                        })()}
                      </div>
                      <p className="font-bebas text-2xl uppercase tracking-[0.18em]">
                        {CARD_META.find((c) => c.key === activeCard)!.title}
                      </p>
                    </div>
                  </div>
                  <h2 className="mt-3 font-bebas text-3xl uppercase leading-none tracking-[0.14em] md:text-5xl">
                    {CARD_META.find((c) => c.key === activeCard)!.title}
                  </h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
                    {(cardContent as any)[activeCard]?.eyebrow ?? CARD_META.find((c) => c.key === activeCard)!.subtitle}
                  </p>
                </div>

                <div className="mt-5 space-y-3 md:mt-0">
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

                  {/* Scouting deep-dive */}
                  {activeCard === "scouting" && (
                    <div className="space-y-4">
                      {(cardContent as any).scouting.points.map((p: string, i: number) => (
                        <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                          {p}
                        </div>
                      ))}

                      <SectionDivider />

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary/85">Pick a position</p>
                        <p className="mb-3 text-xs text-muted-foreground">Choose your position to see exactly what we look for from an analysis and player insight point of view.</p>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {SCOUTING_POSITIONS.map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setScoutingPosition(pos)}
                              className={`rounded-xl border px-3 py-2.5 text-left font-bebas text-sm uppercase tracking-[0.1em] transition-colors ${
                                scoutingPosition === pos
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border/60 bg-card/40 text-foreground/80 hover:border-primary/60 hover:bg-card/70"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      {scoutingPosition && (
                        <div className="space-y-4">
                          <SectionDivider />
                          {(["Physical", "Mental", "Technical", "Tactical"] as const).map((domain) => {
                            const skills = POSITION_SKILLS[scoutingPosition].filter((s) => s.domain === domain);
                            if (skills.length === 0) return null;
                            const meta = DOMAIN_META[domain];
                            const Icon = meta.icon;
                            return (
                              <div key={domain} className="rounded-2xl border border-border/60 bg-card/55 p-4 md:p-5">
                                <div className="mb-3 flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bebas uppercase tracking-[0.18em] ${meta.chip}`}>
                                    <Icon className="h-3 w-3" /> {domain}
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
                      )}
                    </div>
                  )}

                  {/* Performance deep-dive */}
                  {activeCard === "performance" && (
                    <div className="space-y-4">
                      {(cardContent as any).performance.points.map((p: string, i: number) => (
                        <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                          {p}
                        </div>
                      ))}

                      <a
                        href={RONALDO_REPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 md:p-5"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          See an example performance report (Cristiano Ronaldo)
                        </span>
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </a>

                      <SectionDivider />

                      <p className="text-xs uppercase tracking-[0.18em] text-primary/85">What you get inside Performance</p>
                      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                        {PERFORMANCE_SUBS.map((sub) => {
                          const Icon = sub.icon;
                          const active = performanceSub === sub.key;
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              onClick={() => setPerformanceSub(active ? null : sub.key)}
                              className={`group rounded-2xl border p-3 text-left transition-all ${
                                active
                                  ? "border-primary bg-primary/10"
                                  : "border-border/60 bg-card/55 hover:border-primary/60"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <p className="font-bebas text-sm uppercase tracking-[0.12em]">{sub.title}</p>
                              </div>
                              <p className="mt-2 text-[11px] leading-relaxed text-foreground/75 md:text-xs">{sub.blurb}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Club Network with embedded scouting map */}
                  {activeCard === "network" && (
                    <div className="space-y-3">
                      {(cardContent as any).network.points.map((p: string, i: number) => (
                        <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                          {p}
                        </div>
                      ))}
                      <SectionDivider />
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/85">
                        <Globe2 className="h-3.5 w-3.5" /> Our live scouting network
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                        <div className="h-[420px] md:h-[520px]">
                          <ScoutingNetworkMap hideStats hideGridToggle />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generic content for the rest */}
                  {(activeCard === "brand" || activeCard === "fees" || activeCard === "agreement" || activeCard === "expectations") &&
                    (cardContent as any)[activeCard].points.map((point: string, index: number) => (
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
              </div>
            </div>
          </motion.section>
        ) : cardContent ? (
          /* ============ HUB SCREEN ============ */
          <motion.section
            key="hub"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 md:px-8 md:pt-10 md:pb-36"
          >
            <div className="pointer-events-none absolute inset-0" style={blackMarbleBgStyle} />
            <SmokeOverlay />

            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
              {/* Header strip */}
              <div
                className="relative overflow-hidden rounded-[1.8rem] border border-border/60 md:rounded-[2.2rem]"
                style={{
                  backgroundImage: `url(${blackMarbleSmudged})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.35),hsl(var(--background)/0.55),hsl(var(--background)/0.85))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,hsl(var(--gold)/0.18),transparent_45%)]" />
                <div className="relative p-5 md:p-10 min-h-[180px] md:min-h-[260px] flex flex-col justify-end">
                  <h1 className="font-bebas text-3xl uppercase leading-none tracking-[0.16em] md:text-6xl">REPRESENTATION</h1>
                  <p className="mt-2 max-w-[32ch] text-xs leading-relaxed text-foreground/80 md:max-w-xl md:text-base">
                    Realise potential with our experienced intermediary &amp; English Premier League star performance team.
                  </p>
                </div>
              </div>

              <SectionDivider />

              {/* Two intent buttons */}
              <div className="grid gap-2.5 md:grid-cols-2 md:gap-4">
                <Button
                  size="lg"
                  hoverEffect
                  className="h-14 rounded-xl bg-primary font-bebas text-sm uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 md:h-16 md:text-base"
                  onClick={() => setShowForm(true)}
                >
                  <HoverText text="I want to be signed — what do you need from me?" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  hoverEffect
                  className="h-14 rounded-xl border-primary/50 text-primary font-bebas text-sm uppercase tracking-[0.14em] hover:border-primary hover:bg-primary/10 hover:text-primary md:h-16 md:text-base"
                  onClick={() => {
                    document.getElementById("value-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <HoverText text="What do I get from RISE?" />
                </Button>
              </div>

              <SectionDivider />

              {/* Value tiles */}
              <div id="value-grid" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
                {CARD_META.map((card, index) => {
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
                      onClick={() => { setActiveCard(card.key); setScoutingPosition(null); setPerformanceSub(null); }}
                      className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-4"
                      style={marbleStyle}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.06),hsl(var(--background)/0.74))]" />
                      <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[170px] md:gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-12 md:w-12">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bebas text-lg uppercase leading-none tracking-[0.1em] md:text-2xl">{card.title}</p>
                          <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">{card.subtitle}</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* Section slider wheel + sticky CTAs (only when past the age gate) */}
      {ageGroup && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md md:max-w-3xl">
            <div className="mb-1.5 rounded-full border border-border/60 bg-background/75 px-2 py-1.5 backdrop-blur-md">
              <SectionSliderWheel
                sections={CARD_META.map((c) => ({ key: c.key, label: c.title }))}
                activeKey={activeCard ?? CARD_META[0].key}
                onChange={(k) => { setActiveCard(k as CardKey); setScoutingPosition(null); setPerformanceSub(null); }}
              />
            </div>
            <motion.div
              className="grid grid-cols-2 gap-2"
              style={{ height: footerHeight }}
            >
              <motion.button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex h-full items-center justify-center gap-2 rounded-xl bg-primary font-bebas uppercase tracking-[0.14em] text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                style={{ fontSize: footerFontSize }}
              >
                <ArrowRight className="h-4 w-4" />
                <HoverText text="Request Representation" />
              </motion.button>
              <motion.button
                type="button"
                onClick={openWhatsApp}
                className="flex h-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-background/80 font-bebas uppercase tracking-[0.14em] text-primary shadow-lg transition-colors hover:border-primary hover:bg-primary/10"
                style={{ fontSize: footerFontSize }}
              >
                <MessageCircle className="h-4 w-4" />
                <HoverText text="Contact Us For Representation" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} ageGroup={ageGroup} />
    </div>
  );
};

export default RequestRepresentation;
