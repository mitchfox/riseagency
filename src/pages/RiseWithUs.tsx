import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Target, Gauge, Users, Sparkles, FileText, PoundSterling, HelpCircle,
  ArrowRight, MessageCircle, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { RepresentationAudio } from "@/components/RepresentationAudio";
import riseLogoWhite from "@/assets/RISEWhite.png";

interface ProspectPlayer {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  club: string | null;
  nationality: string | null;
}
interface OfferSettings {
  hidden_sections: string[];
  section_images: Record<string, string>;
}

const TYRESE_PORTAL_EMBED = "/portal?staff_login=tyelanders%40gmail.com&hide_invoices=1";
const WHATSAPP_URL = "https://wa.me/447508342901?text=" + encodeURIComponent("Hi RISE, I just read my invitation");

type GroupKey = "who" | "how" | "terms";
type CardKey =
  | "scouting" | "expectations"
  | "performance" | "network" | "brand" | "negotiation"
  | "fees" | "agreement" | "faqs";

const GROUP_LABELS: Record<GroupKey, string> = {
  who: "Who We Select",
  how: "How We Work",
  terms: "What Are The Terms",
};

interface CardDef {
  key: CardKey;
  group: GroupKey;
  title: string;
  subtitle: string;
  icon: typeof Search;
  bullets: string[];
}

const CARDS: CardDef[] = [
  { key: "scouting", group: "who", title: "Scouting", subtitle: "How We Assess Star Potential", icon: Search,
    bullets: [
      "Position-specific profiling against elite benchmarks.",
      "Multi-match observation, never a one-off snapshot.",
      "Will, skill and potential weighted equally.",
      "Cross-checked against our Premier League performance team.",
    ] },
  { key: "expectations", group: "who", title: "Expectations", subtitle: "Standards on and off the pitch", icon: Target,
    bullets: [
      "Train and live like a professional from day one.",
      "Be coachable, on time and accountable.",
      "Look after your body, your sleep and your nutrition.",
      "Treat every minute on the pitch as a chance to build.",
    ] },
  { key: "performance", group: "how", title: "Performance", subtitle: "How We Ensure On-Pitch Success", icon: Gauge,
    bullets: [
      "Action-by-action analysis of every match.",
      "R90 scoring against Premier League standards.",
      "Strength, power and speed programmes built around your position.",
      "Nutrition, technique and psychology support layered in.",
    ] },
  { key: "network", group: "how", title: "Club Network", subtitle: "Introductions with proper context", icon: Users,
    bullets: [
      "Active outreach to clubs that genuinely fit your profile.",
      "Trusted relationships across multiple leagues and federations.",
      "Strategic timing of conversations to maximise your value.",
      "Reports and clips delivered the way scouts want them.",
    ] },
  { key: "brand", group: "how", title: "Brand", subtitle: "A sharper public-facing profile", icon: Sparkles,
    bullets: [
      "Highlight reels and content built around your real game.",
      "Your own personal portal as a single source of truth.",
      "Coordinated messaging across the channels that matter.",
      "Always honest, never overhyped.",
    ] },
  { key: "negotiation", group: "how", title: "Negotiation", subtitle: "Short and long-term deal strategy", icon: FileText,
    bullets: [
      "Plain-language contract reviews.",
      "Negotiation handled by people who understand the market.",
      "Multi-year planning so each move builds on the last.",
      "Your interests protected at every stage.",
    ] },
  { key: "fees", group: "terms", title: "Fees", subtitle: "Clear from the start", icon: PoundSterling,
    bullets: [
      "Standard FA-compliant agency fees on contracts and transfers.",
      "Aligned to your career progression, not hidden line items.",
      "Everything written down and discussed before anything is signed.",
      "Independent legal advice always welcomed.",
    ] },
  { key: "agreement", group: "terms", title: "Agreement", subtitle: "What the relationship covers", icon: FileText,
    bullets: [
      "Clear scope of representation and services.",
      "Defined term length with proper exit terms.",
      "Parental involvement throughout for under-18s.",
      "Agreement reviewed with you line by line.",
    ] },
  { key: "faqs", group: "terms", title: "FAQs", subtitle: "Quick answers before you reach out", icon: HelpCircle,
    bullets: [
      "How does the process actually start?",
      "What is the day-to-day support like?",
      "How do clubs hear about me?",
      "What happens if it isn't working?",
    ] },
];

const GROUPS: GroupKey[] = ["who", "how", "terms"];

/* ============== INTRO ============== */
const IntroCinematic = ({
  firstName, playerImage, extraImages, onDone,
}: { firstName: string; playerImage: string | null; extraImages: string[]; onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  // 0: invitation chip, 1: stood-out line, 2: differentiate line, 3: image collage + RISE WITH US, 4: done
  useEffect(() => {
    const timings = [1800, 3800, 4200, 3800];
    if (phase >= timings.length) { onDone(); return; }
    const t = setTimeout(() => setPhase((p) => p + 1), timings[phase]);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const skip = () => onDone();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
      onClick={skip}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="presentation"
    >
      {/* gold ambience */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.18), transparent 60%)" }}
        animate={{ opacity: [0.4, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Image layers (player photo + uploads) gently visible underneath text */}
      <div className="absolute inset-0">
        {playerImage && (
          <motion.img
            src={playerImage}
            alt={firstName}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: phase === 3 ? 0.55 : 0.22 }}
            transition={{ duration: 2.4, ease: "easeOut" }}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.75)_75%,rgba(0,0,0,0.95)_100%)]" />
      </div>

      {/* Phase 3 image collage from uploads */}
      {phase === 3 && extraImages.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-[5]">
          {extraImages.slice(0, 4).map((src, i) => {
            const positions = [
              { top: "8%",  left: "6%"  },
              { top: "10%", right: "6%" },
              { bottom: "12%", left: "8%" },
              { bottom: "10%", right: "10%" },
            ][i];
            return (
              <motion.img
                key={src + i}
                src={src}
                alt=""
                className="absolute h-28 w-28 sm:h-40 sm:w-40 object-cover rounded-xl border border-primary/40 shadow-[0_0_40px_-10px_hsl(var(--gold)/0.6)]"
                style={positions as React.CSSProperties}
                initial={{ opacity: 0, scale: 0.8, rotate: i % 2 ? -6 : 6 }}
                animate={{ opacity: 0.85, scale: 1, rotate: i % 2 ? -3 : 3 }}
                transition={{ duration: 1.2, delay: i * 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </div>
      )}

      {/* Text reveal */}
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div key="p0"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-bebas text-base sm:text-lg uppercase tracking-[0.3em] text-primary">
                An invitation to
              </p>
              <p className="mt-3 font-bebas text-4xl sm:text-6xl uppercase tracking-wider text-foreground">
                {firstName}
              </p>
            </motion.div>
          )}
          {phase === 1 && (
            <motion.p key="p1"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9 }}
              className="text-lg sm:text-2xl md:text-3xl font-semibold leading-snug text-foreground"
            >
              As part of our extensive scouting efforts, we are pleased to say that you
              stood out with the capability to become a star,{" "}
              <span className="text-primary">{firstName}</span>.
            </motion.p>
          )}
          {phase === 2 && (
            <motion.p key="p2"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9 }}
              className="text-base sm:text-xl md:text-2xl leading-relaxed text-foreground/95"
            >
              We differentiate players by their will, skill and potential, to find those
              who will use our English Premier League Performance Team to the fullest
              effect to realise their potential on the pitch and in life.
            </motion.p>
          )}
          {phase === 3 && (
            <motion.div key="p3"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4"
            >
              <img src={riseLogoWhite} alt="RISE" className="h-14 sm:h-20 w-auto" />
              <p className="font-bebas text-3xl sm:text-5xl md:text-6xl uppercase tracking-[0.18em] text-foreground">
                Rise With Us
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); skip(); }}
        className="absolute bottom-4 right-4 z-20 rounded-full border border-border/50 px-3 py-1 text-[10px] font-bebas uppercase tracking-[0.24em] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        Skip
      </button>
    </motion.div>
  );
};

/* ============== MAIN ============== */
const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [settings, setSettings] = useState<OfferSettings>({ hidden_sections: [], section_images: {} });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [stage, setStage] = useState<"hub" | "portal" | "next">("hub");

  const portalRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const isPickerMode = !slug;

  useEffect(() => {
    if (isPickerMode) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const searchName = slug.replace(/-/g, " ");
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality, has_representation_offer, representation_status")
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .ilike("name", searchName)
        .maybeSingle();
      if (error || !data) { setNotFound(true); }
      else {
        setPlayer(data);
        const { data: sData } = await (supabase as any)
          .from("player_offer_settings")
          .select("hidden_sections, section_images")
          .eq("player_id", data.id)
          .maybeSingle();
        if (sData) {
          setSettings({
            hidden_sections: (sData.hidden_sections || []) as string[],
            section_images: (sData.section_images || {}) as Record<string, string>,
          });
        }
      }
      setLoading(false);
    })();
  }, [slug, isPickerMode]);

  if (loading) return <RiseBrandedLoader />;
  if (notFound || !player) return <NotFound />;

  const firstName = player.name.split(" ")[0];
  const extraImages = Object.values(settings.section_images).filter(Boolean);
  const visibleCards = CARDS.filter((c) => !settings.hidden_sections.includes(c.key));

  const goPortal = () => {
    setStage("portal");
    setTimeout(() => portalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const goNext = () => {
    setStage("next");
    setTimeout(() => nextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const activeCardDef = activeCard ? CARDS.find((c) => c.key === activeCard) ?? null : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Rise With Us - RISE Football Agency</title>
      </Helmet>

      <AnimatePresence>
        {!introDone && (
          <IntroCinematic
            firstName={firstName}
            playerImage={player.image_url}
            extraImages={extraImages}
            onDone={() => setIntroDone(true)}
          />
        )}
      </AnimatePresence>

      {introDone && (
        <>
          <RepresentationAudio />

          {/* ============ STAGE: HUB (representation cards) ============ */}
          <section className="relative min-h-[100dvh] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-44 md:px-8 md:pt-8 lg:px-16">
            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
              <header className="relative pb-6 text-center md:pb-10">
                <div className="mx-auto flex flex-col items-center gap-3 md:gap-5">
                  <img src={riseLogoWhite} alt="RISE" className="h-14 md:h-20 w-auto" />
                  <div className="relative flex w-full items-center gap-2 md:gap-4">
                    <span className="h-px flex-1 bg-primary/45" />
                    <h1 className="whitespace-nowrap font-bebas text-2xl uppercase leading-none tracking-[0.1em] text-foreground sm:text-3xl md:text-4xl md:tracking-[0.12em] lg:text-5xl lg:tracking-[0.14em]">
                      Rise With Us, {firstName}
                    </h1>
                    <span className="h-px flex-1 bg-primary/45" />
                  </div>
                  <div className="mt-1 w-full rounded-2xl border border-primary/20 bg-black/55 px-4 py-3 backdrop-blur-sm md:max-w-3xl md:px-6 md:py-4">
                    <p className="text-justify text-[12.4px] leading-relaxed text-foreground/85 md:text-[15.4px]">
                      RISE Football Agency is built on a deep understanding of performance and how it shapes
                      decisions at every level of the game. We represent and work directly with players and clubs
                      through an established international network, underpinned by an unrivalled background in
                      developing Premier League level talent.
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-primary/35" />
              </header>

              {GROUPS.map((g) => {
                const cards = visibleCards.filter((c) => c.group === g);
                if (cards.length === 0) return null;
                return (
                  <div key={g} className="scroll-mt-[88px]">
                    <div className="my-6 flex items-center gap-3 md:my-8">
                      <div className="h-[1px] flex-1 bg-primary/40" />
                      <span className="font-bebas text-xl uppercase tracking-[0.32em] text-primary md:text-2xl">
                        {GROUP_LABELS[g]}
                      </span>
                      <div className="h-[1px] flex-1 bg-primary/40" />
                    </div>
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
                            onClick={() => setActiveCard(card.key)}
                            className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-center md:p-5"
                            style={{ backgroundColor: "hsl(0 0% 4%)" }}
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.08),transparent_60%)]" />
                            <div className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 md:min-h-[200px] md:gap-4 lg:min-h-[220px]">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)] md:h-14 md:w-14">
                                <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                              </div>
                              <div>
                                <p className="font-bebas text-[clamp(1rem,4.2vw,1.375rem)] uppercase leading-[1.05] tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis md:text-[clamp(1.15rem,2.6vw,1.75rem)] md:tracking-[0.1em] lg:text-[clamp(1.25rem,2.2vw,2.125rem)]">
                                  {card.title}
                                </p>
                                <p className="mx-auto mt-1.5 max-w-[9.5rem] text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:max-w-[11.5rem] md:text-xs">
                                  {card.subtitle}
                                </p>
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
          </section>

          {/* Card detail overlay */}
          <AnimatePresence>
            {activeCardDef && (
              <motion.div
                className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-12 md:px-8">
                  <button
                    type="button"
                    onClick={() => setActiveCard(null)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-bebas uppercase tracking-[0.18em] text-primary hover:bg-primary/10"
                  >
                    <X className="h-3 w-3" /> Close
                  </button>
                  <div className="mt-6 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-primary/10">
                      <activeCardDef.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="font-bebas text-3xl uppercase tracking-[0.12em] text-foreground md:text-5xl">
                      {activeCardDef.title}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.24em] text-primary md:text-sm">
                      {activeCardDef.subtitle}
                    </p>
                  </div>
                  <ul className="mt-8 space-y-3">
                    {activeCardDef.bullets.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3 rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/85 md:p-5 md:text-base"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============ STAGE: PORTAL (full screen) ============ */}
          {stage !== "hub" && (
            <section ref={portalRef} className="relative w-full" style={{ height: "100dvh" }}>
              <iframe
                src={TYRESE_PORTAL_EMBED}
                title="Live portal preview"
                className="absolute inset-0 h-full w-full border-0 bg-background"
              />
              {stage === "portal" && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                >
                  <Button
                    onClick={goNext}
                    size="lg"
                    className="pointer-events-auto font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                  >
                    The next step <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* ============ STAGE: FINAL ============ */}
          {stage === "next" && (
            <section ref={nextRef} className="relative min-h-[100dvh] flex items-center px-4 py-16 bg-gradient-to-b from-background to-primary/10">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <span className="inline-block text-xs font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5">
                  The next step
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                  Over to you, {firstName}
                </h2>
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                  We'd love to hear what you think and any questions you have.
                </p>
                <div className="pt-4">
                  <Button asChild size="lg" className="font-bebas uppercase tracking-wider bg-[#25D366] hover:bg-[#1fb858] text-white">
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-5 w-5" /> Message us on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Persistent THE NEXT STEP button while on hub */}
          {stage === "hub" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed left-0 right-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-4 pointer-events-none"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <Button
                onClick={goPortal}
                size="lg"
                className="pointer-events-auto font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              >
                The next step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          <footer className="py-8 px-4 text-center">
            <p className="text-xs text-muted-foreground">This page is a private invitation and is not indexed by search engines.</p>
          </footer>
        </>
      )}
    </div>
  );
};

export default RiseWithUs;
