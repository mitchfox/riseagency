import { useEffect, useMemo, useRef, useState } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { SmokeOverlay } from "@/components/SmokeOverlay";
import { RepresentationIntro } from "@/components/RepresentationIntro";
import { SectionSliderWheel } from "@/components/SectionSliderWheel";
import { RepDobPicker } from "@/components/RepDobPicker";
import { RepresentationAudio } from "@/components/RepresentationAudio";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { Player3DPop, preloadPlayer3DVariant } from "@/components/Player3DPop";
import { SCOUTING_POSITIONS, POSITION_SKILLS, type ScoutingPosition } from "@/data/scoutingSkills";
import riseLogoWhite from "@/assets/RISEWhite.png";

type AgeGroup = null | "under18" | "over18";
type PlayerPosition = "GK" | "LB" | "LCB" | "RCB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "CF";

const POSITION_OPTIONS: PlayerPosition[] = [
  "GK", "LB", "LCB", "RCB", "RB", "CDM", "CM", "CAM", "LW", "RW", "CF",
];

/** Maps the home-screen 11-position picker to the broader scouting
 *  groupings used in the Scouting section. */
const POSITION_TO_SCOUTING: Record<PlayerPosition, ScoutingPosition> = {
  GK:  "Goalkeeper",
  LB:  "Full-Back",
  RB:  "Full-Back",
  LCB: "Centre-Back",
  RCB: "Centre-Back",
  CDM: "Central Defensive Midfielder",
  CM:  "Central Midfielder",
  CAM: "Central Attacking Midfielder",
  LW:  "Winger / Wide Forward",
  RW:  "Winger / Wide Forward",
  CF:  "Centre Forward / Striker",
};

/** sessionStorage flag — when present, the cinematic pulse + intro are
 *  skipped so a language reload drops you straight into the page. */
const INTRO_SEEN_KEY = "rep_intro_seen_v1";
type GroupKey = "who" | "how" | "terms";
type CardKey =
  | "scouting" | "expectations"
  | "performance" | "network" | "brand" | "negotiation"
  | "fees" | "agreement" | "faqs";
type PerformanceSub = "analysis" | "actions" | "sps" | "nutrition" | "technique" | "psychology";

const RONALDO_REPORT_URL = "https://risefootballagency.com/report/cristiano-ronaldo-vs-al-nassr";
const WHATSAPP_URL = "https://wa.me/447508342901";

const MISSION_BIO =
  "RISE Football Agency is built on a deep understanding of performance and how it shapes decisions at every level of the game. We represent and work directly with players and clubs through an established international network, underpinned by an unrivalled background in developing Premier League level talent. With scouting coverage across Europe informing recruitment and placement through evidence, standards and proven pathways - our stars must share our work ethic, mindset and attention to detail to performance.";

interface CardMeta {
  key: CardKey;
  title: string;
  icon: typeof Gauge;
  subtitle: string;
  group: GroupKey;
}

const CARD_META: CardMeta[] = [
  // Who We Select
  { key: "scouting",     title: "Scouting",      icon: Search,        subtitle: "How We Assess Star Potential",     group: "who" },
  { key: "expectations", title: "Expectations",  icon: Target,        subtitle: "Standards on and off the pitch",    group: "who" },
  // How We Work
  { key: "performance",  title: "Performance",   icon: Gauge,         subtitle: "How We Ensure On-Pitch Success", group: "how" },
  { key: "network",      title: "Club Network",  icon: Users,         subtitle: "Introductions with proper context", group: "how" },
  { key: "brand",        title: "Brand",         icon: Sparkles,      subtitle: "A sharper public-facing profile",   group: "how" },
  { key: "negotiation",  title: "Negotiation",   icon: FileText,      subtitle: "Short and long-term deal strategy", group: "how" },
  // What Are The Terms
  { key: "fees",         title: "Fees",          icon: PoundSterling, subtitle: "Clear from the start",              group: "terms" },
  { key: "agreement",    title: "Agreement",     icon: FileText,      subtitle: "What the relationship covers",      group: "terms" },
  { key: "faqs",         title: "FAQs",          icon: HelpCircle,    subtitle: "Quick answers before you reach out", group: "terms" },
];

const GROUP_LABELS: Record<GroupKey, { key: string; fallback: string }> = {
  who:   { key: "representation.who_we_select",      fallback: "Who We Select" },
  how:   { key: "representation.how_we_work",        fallback: "How We Work" },
  terms: { key: "representation.what_are_the_terms", fallback: "What Are The Terms" },
};

const CARD_TITLE_KEYS: Record<CardKey, { key: string; fallback: string }> = {
  scouting:     { key: "representation.scouting",     fallback: "Scouting" },
  expectations: { key: "representation.expectations", fallback: "Expectations" },
  performance:  { key: "representation.performance",  fallback: "Performance" },
  network:      { key: "representation.club_network", fallback: "Club Network" },
  brand:        { key: "representation.brand",        fallback: "Brand" },
  negotiation:  { key: "representation.negotiation",  fallback: "Negotiation" },
  fees:         { key: "representation.fees",         fallback: "Fees" },
  agreement:    { key: "representation.agreement",    fallback: "Agreement" },
  faqs:         { key: "representation.faqs",         fallback: "FAQs" },
};

const CARD_SUBTITLE_KEYS: Record<CardKey, { key: string; fallback: string }> = {
  scouting:     { key: "representation.scouting_subtitle",     fallback: "How We Assess Star Potential" },
  expectations: { key: "representation.expectations_subtitle", fallback: "Standards on and off the pitch" },
  performance:  { key: "representation.performance_subtitle",  fallback: "How We Ensure On-Pitch Success" },
  network:      { key: "representation.club_network_subtitle", fallback: "Introductions with proper context" },
  brand:        { key: "representation.brand_subtitle",        fallback: "A sharper public-facing profile" },
  negotiation:  { key: "representation.negotiation_subtitle",  fallback: "Short and long-term deal strategy" },
  fees:         { key: "representation.fees_subtitle",         fallback: "Clear from the start" },
  agreement:    { key: "representation.agreement_subtitle",    fallback: "What the relationship covers" },
  faqs:         { key: "representation.faqs_subtitle",         fallback: "Quick answers before you reach out" },
};

const formatCardSubtitle = (key: CardKey, text: string) => {
  if (key === "fees" && text.toLowerCase().trim() === "clear from the start") {
    return "Clear from\nthe start";
  }
  return text;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
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
  negotiation: {
    eyebrow: "Short and long-term deal strategy",
    points: [
      "We prepare negotiations around the player's evidence, current value and realistic next step.",
      "Short-term terms are handled with care so the immediate deal protects the player properly.",
      "Long-term planning matters too, because the wrong clause or pathway can restrict the next move.",
      "The aim is simple: better deals, clearer protection and decisions that support the player's career.",
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
      <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">{label}</span>
    ) : (
      <div className="h-1 w-1 rounded-full bg-primary/70" />
    )}
    <div className="h-[1px] flex-1 bg-primary/40" />
  </div>
);

/** Top-of-page logo with a one-shot diagonal shine sweep on first reveal. */
const RiseLogoShine = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <img src={riseLogoWhite} alt="RISE Football Agency" className="block h-full w-auto px-0 mx-0 mr-0" />
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
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  // Representation always starts with the central pulse and wave before
  // the cinematic text sequence is allowed to mount. Intro plays on
  // every fresh page mount so it's never silently skipped.
  const [introDone, setIntroDone] = useState(false);
  /** Becomes true the moment the intro reaches its shader phase, so the
   *  age-group screen mounts behind the shader and is ready to be
   *  revealed without any blank gap. */
  const [introShaderStarted, setIntroShaderStarted] = useState(false);
  // Pre-form state collected on the home rectangle. Both feed into
  // the form prefill *and* derive the age group automatically.
  const [chosenPosition, setChosenPosition] = useState<PlayerPosition | null>(null);
  const [chosenDob, setChosenDob] = useState<string | null>(null);
  // Steps inside the home rectangle: intro copy → position → dob.
  const [introStep, setIntroStep] = useState<"intro" | "position" | "dob">("intro");
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [scoutingPosition, setScoutingPosition] = useState<ScoutingPosition | null>(null);
  const [performanceSub, setPerformanceSub] = useState<PerformanceSub | null>(null);
  const [showForm, setShowForm] = useState(false);

  const cardContent = useMemo(() => (ageGroup ? getCardContent(ageGroup) : null), [ageGroup]);

  // Intro is intentionally not persisted — it should play whenever the
  // page mounts so users always see the cinematic.
  useEffect(() => {
    preloadPlayer3DVariant("home");
  }, []);

  // While the hub is the active screen, enable proximity scroll-snap on
  // the document so each category title parks just below the mini header.
  useEffect(() => {
    const onHub = introDone && !!ageGroup && activeCard === null;
    if (!onHub) return;
    const html = document.documentElement;
    const previous = html.style.scrollSnapType;
    html.style.scrollSnapType = "y proximity";
    return () => { html.style.scrollSnapType = previous; };
  }, [introDone, ageGroup, activeCard]);

  // Scroll-anchoring on the hub: each category title parks just under the
  // mini header. Refs are keyed by GroupKey.
  const groupRefs = useRef<Partial<Record<GroupKey, HTMLDivElement | null>>>({});

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

  const openCard = (card: CardKey) => {
    scrollToTop();
    setActiveCard(card);
    setScoutingPosition(null);
    setPerformanceSub(null);
  };

  useEffect(() => {
    if (activeCard || scoutingPosition || performanceSub) scrollToTop();
  }, [activeCard, scoutingPosition, performanceSub]);

  // Recommended scouting position (derived from the position chosen on the
  // home rectangle). NOTE: we no longer auto-open it — Scouting must lead
  // with the network intro + map, then the position breakdown.
  const recommendedScoutingPosition: ScoutingPosition | null = chosenPosition
    ? POSITION_TO_SCOUTING[chosenPosition]
    : null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black text-foreground">
      <SEO
        title="Representation | RISE Football Agency"
        description="Realise your potential with RISE — proper analysis, real club introductions and clear standards. See exactly what representation looks like for your age and position."
      />

      {/* Page music. Starts the moment the page mounts so the RISE
          intro track plays during the cinematic intro and seamlessly
          rolls into the Omotoye loop. */}
      <RepresentationAudio />

      {/* Cinematic intro. It now ends on the shader animation before revealing the page. */}
      <AnimatePresence>
        {!introDone && (
          <RepresentationIntro
            key="intro"
            onComplete={() => setIntroDone(true)}
            onShaderStart={() => setIntroShaderStarted(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {(introDone || introShaderStarted) && !ageGroup ? (
          /* ============ AGE GROUP SCREEN ============ */
          <motion.section
            key="age"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh]"
            onClick={(e) => {
              if (introStep !== "intro") return;
              const target = e.target as HTMLElement;
              // The language selector keeps its own behaviour (opens map).
              if (target.closest("[data-no-tap]")) return;
              setIntroStep("position");
            }}
            role={introStep === "intro" ? "button" : undefined}
            tabIndex={introStep === "intro" ? 0 : undefined}
          >
            <div className="absolute inset-0 bg-black" />
            {/* Background smoke (BEHIND the player overlay image) */}
            <SmokeOverlay layer="back" />
            {/* Stationary background blur glow, anchored to the LEFT
                side of the screen. Provides the "cool background blur"
                without travelling — sits behind everything else. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[70vw] md:w-[55vw]"
              style={{
                background:
                  "radial-gradient(ellipse at 0% 50%, hsl(var(--gold) / 0.32) 0%, hsl(var(--gold) / 0.14) 22%, hsl(var(--foreground) / 0.08) 42%, transparent 70%)",
                filter: "blur(40px)",
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 0, x: "-30%" }}
              animate={{ opacity: 1, x: "0%" }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Player overlay — 3D pop layer using the final home-screen image maps.
                Sits between the back smoke (z-0) and the front smoke (z-20). */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10"
              style={{ transform: "translateY(4px)" }}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 0.92, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <Player3DPop variant="home" className="absolute inset-0 h-full w-full" />
            </motion.div>
            {/* Single long smoke streak running right -> left across the
                full width of the screen, sitting behind the player so it
                feels atmospheric without obscuring him. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-[42%] z-[5] h-[140px] md:h-[200px]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 22% 50%, hsl(var(--gold) / 0.55) 0%, hsl(var(--gold) / 0.25) 12%, transparent 30%), radial-gradient(ellipse at 58% 50%, hsl(var(--foreground) / 0.42) 0%, hsl(var(--foreground) / 0.18) 14%, transparent 32%), radial-gradient(ellipse at 84% 50%, hsl(var(--gold) / 0.4) 0%, hsl(var(--gold) / 0.18) 12%, transparent 30%), linear-gradient(90deg, transparent 0%, hsl(var(--foreground) / 0.18) 22%, hsl(var(--gold) / 0.32) 50%, hsl(var(--foreground) / 0.18) 78%, transparent 100%)",
                filter: "blur(8px)",
                mixBlendMode: "screen",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
                maskImage:
                  "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
              }}
              initial={{ x: "30%", opacity: 0.5 }}
              animate={{ x: ["30%", "-30%"], opacity: [0.5, 0.85, 0.55] }}
              transition={{ duration: 28, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
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
            <div className="relative z-30 flex min-h-[100dvh] flex-col items-center justify-between px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-center md:px-10 md:pt-[max(1rem,env(safe-area-inset-top))]">
              {/* TOP: RISE white logo only. The "Representation" wordmark
                  has been moved into the tagline rectangle below. */}
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col items-center"
                style={{ paddingLeft: "18px" }}
              >
                <RiseLogoShine className="h-12 md:h-16" />
              </motion.div>

              {/* BOTTOM: tagline + age bracket cluster, all centred. */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="flex w-full max-w-md flex-col items-center md:max-w-2xl lg:max-w-3xl"
              >
                {/* Single rounded rectangle. Its content swaps between
                    intro copy → position picker → DOB picker. The
                    language selector sits inside the bottom edge of
                    the rectangle in every step. */}
                <div
                  className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-black/65 px-4 pt-5 pb-6 backdrop-blur-md shadow-[0_6px_24px_hsl(0_0%_0%/0.45)] md:px-6 md:pt-6 md:pb-7 lg:px-7"
                >
                  <AnimatePresence mode="wait">
                    {introStep === "intro" && (
                      <motion.div
                        key="intro-copy"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.32 }}
                        className="flex flex-col items-center gap-3 text-center"
                      >
                         <motion.h1
                           initial={{ opacity: 0, scale: 0.96 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ duration: 0.8, delay: 0.15 }}
                            className="max-w-full break-words hyphens-auto font-bebas text-[clamp(1.25rem,7vw,2rem)] uppercase leading-[0.95] tracking-[0.1em] text-primary sm:text-3xl md:text-4xl md:tracking-[0.14em] lg:text-4xl lg:tracking-[0.16em]"
                           style={{ textShadow: "0 0 18px hsl(var(--gold) / 0.55)" }}
                         >
                           {t("representation.representation", "Representation")}
                         </motion.h1>
                        <span aria-hidden="true" className="block h-px w-16 bg-primary/60 md:w-24" />
                        <p className="text-balance text-sm leading-snug text-foreground md:text-base lg:text-lg">
                          {t(
                            "representation.hero_subtitle_v2",
                            "Realise Potential With Our Experienced Intermediary & English Premier League Star Performance Team"
                          )}
                        </p>
                        <motion.p
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                          className="mt-2 font-bebas text-[11px] uppercase tracking-[0.32em] text-primary/80 md:text-xs"
                        >
                          {isMobile
                            ? t("representation.tap_to_start", "Tap anywhere to start")
                            : t("representation.click_to_start", "Click anywhere to start")}
                        </motion.p>
                      </motion.div>
                    )}

                    {introStep === "position" && (
                      <motion.div
                        key="position-picker"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.32 }}
                        className="flex flex-col items-center gap-3 text-center"
                      >
                        <p className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
                          {t("representation.choose_position", "Choose your position")}
                        </p>
                        <p className="italic text-sm leading-snug text-foreground/85 md:text-base">
                          {t(
                            "representation.personalised_breakdown",
                            "For a more personalised breakdown of what representation will look like for you."
                          )}
                        </p>
                        <FormationPositionPicker
                          onPick={(p) => { setChosenPosition(p); setIntroStep("dob"); }}
                          translate={(abbr) => t(`positions.${abbr}`, abbr)}
                        />
                      </motion.div>
                    )}

                    {introStep === "dob" && (
                      <motion.div
                        key="dob-picker"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.32 }}
                        className="flex flex-col items-center gap-3 text-center"
                      >
                        <p className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
                          {t("representation.dob_heading", "Date of birth")}
                        </p>
                        <p className="italic text-sm leading-snug text-foreground/85 md:text-base">
                          {t(
                            "representation.personalised_breakdown",
                            "For a more personalised breakdown of what representation will look like for you."
                          )}
                        </p>
                        <div className="mt-1 w-full">
                          <RepDobPicker
                            onConfirm={(iso) => {
                              setChosenDob(iso);
                              const dob = new Date(iso);
                              const today = new Date();
                              let age = today.getFullYear() - dob.getFullYear();
                              const m = today.getMonth() - dob.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                              setAgeGroup(age < 18 ? "under18" : "over18");
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Language selector overlapping the bottom edge so the
                    rectangle border passes behind its centre. */}
                <div className="-mt-4 md:-mt-5" data-no-tap>
                  <LanguageMapSelector
                    className="rounded-full border border-primary/30 bg-black/85 px-3 py-1.5 backdrop-blur-md shadow-[0_4px_18px_hsl(var(--gold)/0.15)]"
                    triggerContent={(
                      <span className="font-bebas text-[11px] uppercase tracking-[0.24em] text-foreground/80">
                        {LANG_ABBR[language] ?? "ENG"}
                      </span>
                    )}
                  />
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
            recommendedScoutingPosition={recommendedScoutingPosition}
            onBack={() => {
                        scrollToTop();
                        if (performanceSub) { setPerformanceSub(null); return; }
                        if (scoutingPosition) { setScoutingPosition(null); return; }
              setActiveCard(null);
            }}
          />
        ) : cardContent ? (
          /* ============ HUB SCREEN ============ */
          <motion.section
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-8 md:pt-8 md:pb-44 lg:px-16"
          >
            {/* Compact fixed mini header — only visible after scroll.
                Doesn't reflow page so scrolling stays smooth. */}
            <AnimatePresence>
              {scrolled && (
                <motion.div
                  key="mini-header"
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-x-0 top-0 z-40 flex items-center justify-center border-b border-primary/25 bg-black/85 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md"
                >
                  <RiseLogoShine className="h-7 md:h-9" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
              {/* Static feature header — sized to fit mobile cleanly.
                  No sticky positioning, no animated heights; the
                  collapsed state is a separate fixed mini bar above. */}
              <header className="relative pb-6 text-center md:pb-10">
                <div className="mx-auto flex flex-col items-center gap-3 md:gap-5">
                  {/* Logo as the centrepiece */}
                  <RiseLogoShine className="h-14 md:h-20" />
                  {/* Title with framing rules. Tracking + responsive
                      sizing keep it inside a 360px viewport. */}
                   <div className="relative flex w-full items-center gap-2 md:gap-4">
                     <span className="h-px flex-1 bg-primary/45" />
                     <h1 className="whitespace-nowrap font-bebas text-2xl uppercase leading-none tracking-[0.1em] text-foreground sm:text-3xl md:text-4xl md:tracking-[0.12em] lg:text-5xl lg:tracking-[0.14em]">
                       {t("representation.representation", "Representation")}
                     </h1>
                     <span className="h-px flex-1 bg-primary/45" />
                   </div>
                  {/* Mission, in a contained glass plate */}
                  <div className="mt-1 w-full rounded-2xl border border-primary/20 bg-black/55 px-4 py-3 backdrop-blur-sm md:max-w-3xl md:px-6 md:py-4">
                    <p
                      className="text-justify text-[12.4px] leading-relaxed text-foreground/85 md:text-[15.4px] [text-justify:inter-word]"
                      style={{
                        hyphens: "none",
                        WebkitHyphens: "none",
                        msHyphens: "none",
                        wordBreak: "normal",
                        overflowWrap: "normal",
                      }}
                    >
                      {t("representation.mission_bio", MISSION_BIO)}
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
              </header>

              {/* Grouped tile sections */}
              {GROUPS.map((g) => {
                const cards = CARD_META.filter((c) => c.group === g);
                return (
                  <div
                    key={g}
                    ref={(el) => { groupRefs.current[g] = el; }}
                    className="scroll-mt-[88px] md:scroll-mt-[96px]"
                    style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                  >
                    <SectionDivider label={t(GROUP_LABELS[g].key, GROUP_LABELS[g].fallback)} />
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
                             onClick={() => openCard(card.key)}
                            className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-5"
                            style={solidBlackSectionStyle}
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
                            <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                                <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                              </div>
                              <div>
                                <p className="break-words hyphens-auto font-bebas text-[clamp(0.85rem,3.6vw,1.125rem)] uppercase leading-[1.05] tracking-[0.08em] md:text-[clamp(1rem,2.4vw,1.5rem)] md:tracking-[0.1em] lg:text-[clamp(1.1rem,2vw,1.875rem)]">{t(CARD_TITLE_KEYS[card.key].key, CARD_TITLE_KEYS[card.key].fallback)}</p>
                                  <p className="mx-auto mt-1.5 max-w-[9.5rem] whitespace-pre-line text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:max-w-[11.5rem] md:text-xs">{formatCardSubtitle(card.key, t(CARD_SUBTITLE_KEYS[card.key].key, CARD_SUBTITLE_KEYS[card.key].fallback))}</p>
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
          <div className="mx-auto max-w-md md:max-w-3xl lg:max-w-4xl">
                {showSlider && groupSiblings.length > 0 && (
              <div className="mb-1.5 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-md">
                {/* "Back to all" pill — centred above the slider. */}
                {activeCard && (
                  <div className="mb-2 flex w-full justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        // Inside a Performance sub-screen, "Back to all"
                        // returns to the Performance hub first, not the
                        // top-level group hub.
                        if (performanceSub) { setPerformanceSub(null); return; }
                        if (scoutingPosition) { setScoutingPosition(null); return; }
                         scrollToTop();
                         setActiveCard(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-bebas uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      {performanceSub
                        ? "Back to Performance"
                        : scoutingPosition
                          ? "Back to Scouting"
                          : "Back to all"}
                    </button>
                  </div>
                )}
                <div>
                  <SectionSliderWheel
                    sections={groupSiblings.map((c) => ({ key: c.key, label: t(CARD_TITLE_KEYS[c.key].key, CARD_TITLE_KEYS[c.key].fallback) }))}
                    activeKey={activeCard ?? groupSiblings[0].key}
                    onChange={(k) => openCard(k as CardKey)}
                  />
                </div>
              </div>
            )}
            <motion.div className="grid grid-cols-2 gap-2" style={{ height: footerHeight }}>
              <motion.button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex h-full min-w-0 items-center justify-center rounded-xl bg-primary px-2 py-1.5 text-center font-bebas uppercase tracking-[0.06em] text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
              >
                <div className="flex w-full min-w-0 flex-col items-center justify-center gap-0.5 leading-[1.05]">
                  {!scrolled && <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />}
                  <motion.span
                    style={scrolled ? { fontSize: footerFontSize } : undefined}
                    className="block w-full whitespace-normal break-words px-0.5 text-[13px] leading-[1.05] md:text-base"
                  >
                    <HoverText text={t("representation.cta_request", "Request Representation")} />
                  </motion.span>
                </div>
              </motion.button>
              <motion.button
                type="button"
                onClick={openWhatsApp}
                className="flex h-full min-w-0 items-center justify-center rounded-xl border border-primary/50 bg-background/80 px-2 py-1.5 text-center font-bebas uppercase tracking-[0.06em] text-primary shadow-lg transition-colors hover:border-primary hover:bg-primary/10"
              >
                <div className="flex w-full min-w-0 flex-col items-center justify-center gap-0.5 leading-[1.05]">
                  {!scrolled && <WhatsAppIcon className="h-4 w-4 md:h-5 md:w-5" />}
                  <motion.span
                    style={scrolled ? { fontSize: footerFontSize } : undefined}
                    className="block w-full whitespace-normal break-words px-0.5 text-[13px] leading-[1.05] md:text-base"
                  >
                    <HoverText text={t("representation.cta_contact", "Contact Us")} />
                  </motion.span>
                </div>
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      <RepresentationDialog
        open={showForm}
        onOpenChange={setShowForm}
        ageGroup={ageGroup}
        initialPosition={chosenPosition ?? ""}
        initialDob={chosenDob ?? ""}
      />
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
  recommendedScoutingPosition: ScoutingPosition | null;
  onBack: () => void;
}

const DetailView = ({
  activeCard, cardContent, ageGroup,
  scoutingPosition, setScoutingPosition,
  performanceSub, setPerformanceSub,
  recommendedScoutingPosition,
  onBack,
}: DetailViewProps) => {
  const { t } = useLanguage();
  const meta = CARD_META.find((c) => c.key === activeCard)!;
  const Icon = meta.icon;
  const content = (cardContent as any)[activeCard];

  // Sub-screen: scouting position
  if (activeCard === "scouting" && scoutingPosition) {
    return (
      <motion.section
        key={`scout-${scoutingPosition}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-56 md:px-8 md:pt-10 md:pb-60 lg:px-16"
      >
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-56 md:px-8 md:pt-10 md:pb-60 lg:px-16"
      >
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
          <BackPill onClick={onBack} label="Back to Performance" />
          <TitlePlate icon={SIcon} title={sub.title} eyebrow={sub.blurb} />
          <div className="mt-5 space-y-3 md:mt-7 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {sub.detail.map((p, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/85 md:p-5 md:text-base">
                {p}
              </div>
            ))}
          </div>
          {performanceSub === "analysis" && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card/40 md:mt-6">
              <div className="relative aspect-video w-full">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/pWH2cdmzwVg?rel=0"
                  title="RISE Football Analysis"
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          )}
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[100dvh] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-56 md:px-8 md:pt-6 md:pb-60 lg:px-16"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-5xl lg:max-w-6xl">
        <TitlePlate icon={Icon} title={t(CARD_TITLE_KEYS[activeCard].key, CARD_TITLE_KEYS[activeCard].fallback)} eyebrow={content?.eyebrow ?? t(CARD_SUBTITLE_KEYS[activeCard].key, CARD_SUBTITLE_KEYS[activeCard].fallback)} />

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

          {/* Scouting top level — ALWAYS leads with the network intro and
              the same map used on the Players page, then explanation
              cards, then the position breakdown. */}
          {activeCard === "scouting" && (
            <div className="space-y-4 md:space-y-6">
              {/* 1. Network intro — mirrors Players page wording. */}
              <div className="rounded-2xl border border-border/60 bg-card/55 p-4 text-center md:p-6">
                <span className="inline-block rounded-full border border-primary/30 px-4 py-1 font-bebas text-[10px] uppercase tracking-[0.18em] text-primary md:text-xs">
                  Eyes Across All Of Europe
                </span>
                <p className="mt-3 font-bebas text-3xl uppercase leading-none tracking-[0.12em] md:text-5xl">
                  Scouting <span className="text-primary">Network</span>
                </p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80 md:text-base">
                  If you're a professional or academy player in Europe, chances are we already know about you.
                </p>
              </div>

              {/* 2. The same interactive map used on the Players page. */}
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                <div className="h-[420px] md:h-[560px] lg:h-[640px]">
                  <ScoutingNetworkMap hideGridToggle />
                </div>
              </div>

              {/* 3. The same three explanation cards from the Players page. */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                {[
                  { n: "01", title: "Deep European Network", desc: "We have built an extensive scouting network across Europe, with eyes at every level of the professional game." },
                  { n: "02", title: "Future-Focused Scouting", desc: "Novel scouting based on qualities that level up through the game, not just what works now, but what scales with a player's career." },
                  { n: "03", title: "Complete Player Knowledge", desc: "For any professional or academy player, we intend to know not just who they are, but how they play, what makes them tick, and what qualities they have that level up." },
                ].map((p) => (
                  <div key={p.n} className="rounded-2xl border border-border/60 bg-card/30 p-5">
                    <div className="flex items-start gap-4">
                      <span className="font-bebas text-3xl text-primary/30 md:text-4xl">{p.n}</span>
                      <div>
                        <p className="font-bebas text-lg uppercase tracking-[0.12em] md:text-xl">{p.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/80 md:text-base">{p.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SectionDivider label="What we look for" />

              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                {content.points.map((p: string, i: number) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84 md:p-5 md:text-base">
                    {p}
                  </div>
                ))}
              </div>

              <SectionDivider label="Position breakdown" />

              {recommendedScoutingPosition ? (
                <button
                  type="button"
                  onClick={() => { scrollToTop(); setScoutingPosition(recommendedScoutingPosition); }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/50 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15 md:p-5"
                >
                  <div>
                    <p className="text-[10px] font-bebas uppercase tracking-[0.18em] text-primary md:text-xs">What we look for in your position</p>
                    <p className="mt-1 font-bebas text-lg uppercase tracking-[0.12em] md:text-2xl">{recommendedScoutingPosition}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </button>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground md:text-sm">Open any position to see exactly what we look for in it.</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
                    {SCOUTING_POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => { scrollToTop(); setScoutingPosition(pos); }}
                        className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 text-left font-bebas text-sm uppercase tracking-[0.1em] text-foreground/80 transition-colors hover:border-primary/60 hover:bg-card/70 md:text-base"
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
                      onClick={() => { scrollToTop(); setPerformanceSub(sub.key); }}
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
          {(activeCard === "brand" || activeCard === "fees" || activeCard === "agreement" || activeCard === "expectations" || activeCard === "negotiation") && (
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

/* =================================================================
 * FormationPositionPicker
 * 4-3-3 visual layout (attacking line on top, GK at the bottom —
 * the way an attacking side reads it):
 *   LW   CF   RW
 *   CAM
 *   CM
 *   CDM
 *   LB  LCB  RCB  RB
 *   GK
 * Each tile shows the localized abbreviation.
 * ================================================================= */

const FormationPositionPicker = ({
  onPick,
  translate,
}: {
  onPick: (p: PlayerPosition) => void;
  translate: (abbr: PlayerPosition) => string;
}) => {
  const Tile = ({ p }: { p: PlayerPosition }) => (
    <button
      type="button"
      onClick={() => onPick(p)}
      className="flex h-9 min-w-[2.75rem] items-center justify-center rounded-md border border-primary/35 bg-background/40 px-2 font-bebas text-[12px] uppercase tracking-[0.1em] text-primary transition-colors hover:border-primary hover:bg-primary/15 md:h-10 md:min-w-[3.25rem] md:text-sm"
    >
      {translate(p)}
    </button>
  );
  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="flex w-full justify-center gap-1.5 md:gap-2">{children}</div>
  );
  return (
    <div className="mt-1 flex w-full flex-col items-center gap-1.5 md:gap-2">
      <Row>
        <Tile p="LW" /><Tile p="CF" /><Tile p="RW" />
      </Row>
      <Row><Tile p="CAM" /></Row>
      <Row><Tile p="CM" /></Row>
      <Row><Tile p="CDM" /></Row>
      <Row>
        <Tile p="LB" /><Tile p="LCB" /><Tile p="RCB" /><Tile p="RB" />
      </Row>
      <Row><Tile p="GK" /></Row>
    </div>
  );
};
