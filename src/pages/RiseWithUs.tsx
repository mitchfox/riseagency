import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, TrendingUp, Users, Shield, BarChart3, Dumbbell, Video, BookOpen,
  ChevronDown, ChevronUp, ExternalLink, Zap, Eye, Brain, Target,
  ArrowRight, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { RepresentationAudio } from "@/components/RepresentationAudio";

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

const TYRESE_PORTAL = "/players/tyrese-omotoye";
const TYRESE_PORTAL_EMBED = "/portal?staff_login=tyelanders%40gmail.com&hide_invoices=1";
const WHATSAPP_URL = "https://wa.me/447508342901?text=" + encodeURIComponent("Hi RISE, I just read my invitation");

type SectionCard = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: typeof Star;
  summary: string;
  detail: string[];
  link?: { label: string; href: string };
};

const buildSections = (firstName: string): SectionCard[] => [
  { id: "performance", number: "01", title: "Performance Analysis", subtitle: "Every match, broken down", icon: BarChart3,
    summary: "Every match broken down with expert tactical insight, key moments and areas to grow.",
    detail: [
      "Action-by-action review of every game with timestamped video.",
      "R90 scoring so you know exactly how your minutes compare to elite benchmarks.",
      "Position-specific feedback from a Premier League performance team.",
    ],
    link: { label: "See a real performance report", href: TYRESE_PORTAL } },
  { id: "development", number: "02", title: "Development Tracking", subtitle: "Numbers that show you the path", icon: TrendingUp,
    summary: "Monitor your progress with benchmarks, R90 scores and detailed statistics over time.",
    detail: [
      "Live dashboards built around the metrics that decide your career.",
      "Form windows so coaches and clubs can see momentum at a glance.",
      "Honest visibility on where you sit versus the next level.",
    ],
    link: { label: "Open the live data dashboard", href: TYRESE_PORTAL } },
  { id: "physical", number: "03", title: "Physical Programming", subtitle: "Built around your body and position", icon: Dumbbell,
    summary: "Strength, power and speed programmes built specifically for you. Nutrition guidance included.",
    detail: [
      "Weekly periodised programmes that match your match calendar.",
      "Movement, mobility and injury prevention layered alongside strength work.",
      "Nutrition strategy aligned to fixtures, travel and recovery.",
    ] },
  { id: "video", number: "04", title: "Video Analysis", subtitle: "Your game on screen", icon: Video,
    summary: "Professional clip editing and analysis. Highlight reels, tactical breakdowns, improvement sequences.",
    detail: [
      "Match clips cut and tagged within hours of full time.",
      "Highlight reels ready to share with clubs and scouts.",
      "Tactical sequences explained so the lessons stick.",
    ],
    link: { label: "Watch real analysis on Tyrese's portal", href: TYRESE_PORTAL } },
  { id: "network", number: "05", title: "Network & Exposure", subtitle: "Opening the right doors", icon: Users,
    summary: "Connections across European football. Clubs, scouts, coaches and decision-makers who need to know about you.",
    detail: [
      "Active outreach to clubs that fit your profile, not blanket emails.",
      "Trusted relationships across multiple leagues and federations.",
      "Strategic timing of conversations to maximise your value.",
    ] },
  { id: "career", number: "06", title: "Career Management", subtitle: "Long-term thinking", icon: Shield,
    summary: "Contract guidance, club negotiations and strategic career planning. We protect your interests.",
    detail: [
      "Step-by-step contract reviews in plain language.",
      "Negotiation handled by people who understand the market.",
      "Multi-year planning so each move builds on the last.",
    ] },
  { id: "education", number: "07", title: "Education & Mentoring", subtitle: "Off-pitch development", icon: BookOpen,
    summary: "Coaching resources, mental performance support and professional guidance.",
    detail: [
      "Mental performance frameworks used by top professionals.",
      "Coaching content tailored to your level and goals.",
      "Mentoring from people who have been at the top of the game.",
    ] },
  { id: "portal", number: "08", title: "Your Personal Portal", subtitle: `Built for ${firstName || "you"}`, icon: Star,
    summary: "Your own dedicated portal with all your analysis, programmes, stats and development materials.",
    detail: [
      "One login. Every report, every clip, every plan.",
      "Mobile-first so it travels with you.",
      "A complete picture of your development, kept private to you and your team.",
    ],
    link: { label: "See a live portal example", href: TYRESE_PORTAL } },
];

// Match week journey cards from Realise Potential (representation cards)
const journeyCards = [
  { number: "01", title: "Pre-Match Preparation", subtitle: "Setting the foundation",
    description: "Tactical briefings, opposition analysis and individual focus points so you arrive ready to perform.",
    items: ["Opposition profiling", "Individual focus points", "Mental preparation"],
    icon: Zap },
  { number: "02", title: "Match Day Performance", subtitle: "Executing under pressure",
    description: "Live tracking and contextual support so every minute on the pitch counts.",
    items: ["Live performance tracking", "In-game decisions", "Maximum output"],
    icon: Target },
  { number: "03", title: "Post-Match Analysis", subtitle: "Learning from every game",
    description: "Honest review of the actions that mattered, with footage and data to back it up.",
    items: ["Action-by-action review", "Statistical breakdown", "Improvement areas"],
    icon: BarChart3 },
  { number: "04", title: "Visibility & Exposure", subtitle: "Getting you seen",
    description: "Clips, reports and direct conversations with the right clubs at the right time.",
    items: ["Highlight reels", "Scout-ready reports", "Targeted outreach"],
    icon: Eye },
  { number: "05", title: "Continuous Development", subtitle: "Always raising the bar",
    description: "Programming, mentoring and a long-term plan that turns potential into a professional career.",
    items: ["Personalised programming", "Career planning", "Mentor support"],
    icon: Brain },
];

const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [settings, setSettings] = useState<OfferSettings>({ hidden_sections: [], section_images: {} });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  const aboutRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const isPickerMode = !slug;

  useEffect(() => {
    if (isPickerMode) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      const searchName = slug.replace(/-/g, " ");
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, image_url, club, nationality, has_representation_offer, representation_status")
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .ilike("name", searchName)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
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

  const advance = (to: 2 | 3 | 4) => {
    setStage((s) => (to > s ? to : s));
    setTimeout(() => {
      const ref = to === 2 ? aboutRef : to === 3 ? detailsRef : nextRef;
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  if (loading) return <RiseBrandedLoader />;
  if (notFound || !player) return <NotFound />;

  const firstName = player.name.split(" ")[0];
  const sections = buildSections(firstName).filter((s) => !settings.hidden_sections.includes(s.id));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden pb-28">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Rise With Us - RISE Football Agency</title>
      </Helmet>

      {/* Stage 1: The Offer */}
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-background" />
        <div className="relative z-10 max-w-3xl mx-auto text-center w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
            <span className="inline-block text-xs sm:text-sm font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-5 py-1.5">
              An invitation to {firstName}
            </span>

            {player.image_url && (
              <div className="relative mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)]">
                <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-top" />
              </div>
            )}

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bebas uppercase tracking-wider text-foreground leading-none">
              Rise With Us
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed">
              As part of our extensive scouting efforts, we are pleased to say that
              you stood out with the capability to become a star,{" "}
              <span className="text-primary font-semibold">{firstName}</span>.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We differentiate players by their will, skill and potential, to find
              those who will use our English Premier League Performance Team to the
              fullest effect to realise their potential on the pitch and in life.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs sm:text-sm text-muted-foreground">
              {player.position && <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">{player.position}</span>}
              {player.club && <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">{player.club}</span>}
              {player.nationality && <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">{player.nationality}</span>}
            </div>

            <div className="pt-6">
              <Button onClick={() => advance(2)} size="lg" className="font-bebas uppercase tracking-wider">
                Learn more about us <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stage 2: About us — journey cards */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.section
            ref={aboutRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-14 sm:py-20 px-4"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14 space-y-3">
                <span className="inline-block text-xs font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5">
                  Who we are
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                  How we work, week in week out
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                  Every week we run the same loop with our players. Preparation, performance, analysis, exposure and development.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {journeyCards.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.number}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className={`group relative ${i === 4 ? "md:col-span-2 lg:col-span-1" : ""}`}
                    >
                      <div className="h-full p-7 border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:bg-primary/5 rounded-xl">
                        <div className="absolute top-5 right-5 text-6xl font-bebas text-primary/10 group-hover:text-primary/20 transition-colors leading-none">
                          {c.number}
                        </div>
                        <Icon className="w-7 h-7 text-primary mb-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground">{c.title}</h3>
                        <p className="text-xs text-primary font-medium uppercase tracking-wider mb-3">{c.subtitle}</p>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-3">{c.description}</p>
                        <ul className="space-y-1.5">
                          {c.items.map((it, k) => (
                            <li key={k} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="w-1 h-1 bg-primary rounded-full" />
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center mt-10">
                <Button onClick={() => advance(3)} size="lg" className="font-bebas uppercase tracking-wider">
                  What you get <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Stage 3: What you get — detailed sections */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.section
            ref={detailsRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-14 sm:py-20 px-4 bg-muted/20"
          >
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10 sm:mb-14 space-y-3">
                <span className="inline-block text-xs font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5">
                  What you get
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bebas uppercase tracking-wider">
                  Everything in your corner
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sections.map((section, index) => {
                  const isOpen = expandedId === section.id;
                  const Icon = section.icon;
                  const customImage = settings.section_images[section.id];
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.04 }}
                      className="relative"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : section.id)}
                        className={`group w-full text-left h-full p-5 sm:p-6 border bg-card/60 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-primary/5 ${
                          isOpen ? "border-primary/60 bg-primary/5 shadow-[0_0_40px_-15px_hsl(var(--primary)/0.6)]" : "border-border/50 hover:border-primary/40"
                        }`}
                      >
                        {customImage && (
                          <div className="relative -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 h-32 sm:h-36 overflow-hidden rounded-t-xl">
                            <img src={customImage} alt={section.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 text-5xl sm:text-6xl font-bebas text-primary/15 leading-none pointer-events-none">
                          {section.number}
                        </div>
                        <div className="text-primary mb-4"><Icon className="w-7 h-7 sm:w-8 sm:h-8" /></div>
                        <h3 className="text-xl sm:text-2xl font-bebas uppercase tracking-wider text-foreground">{section.title}</h3>
                        <p className="text-xs sm:text-sm text-primary uppercase tracking-wider mb-3">{section.subtitle}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{section.summary}</p>

                        <div className="flex items-center gap-1.5 mt-4 text-xs uppercase tracking-wider text-primary/80">
                          {isOpen ? (<>Hide details <ChevronUp className="w-3.5 h-3.5" /></>) : (<>See more <ChevronDown className="w-3.5 h-3.5" /></>)}
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="detail"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <ul className="space-y-2 pt-4 border-t border-border/40 mt-4">
                                {section.detail.map((d, i) => (
                                  <li key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <span>{d}</span>
                                  </li>
                                ))}
                              </ul>
                              {section.link && (
                                <a
                                  href={section.link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:text-primary/80"
                                >
                                  {section.link.label}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center mt-12">
                <Button asChild size="lg" variant="outline" className="font-bebas uppercase tracking-wider">
                  <a href={TYRESE_PORTAL} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-2 h-4 w-4" /> What the portal looks like
                  </a>
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Stage 4: The Next Step */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.section
            ref={nextRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-16 sm:py-24 px-4 bg-gradient-to-b from-background to-primary/10"
          >
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
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Send us a quick message on WhatsApp. No pressure, no pitch, just a real conversation about your future.
              </p>
              <div className="pt-4">
                <Button asChild size="lg" className="font-bebas uppercase tracking-wider bg-[#25D366] hover:bg-[#1fb858] text-white">
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" /> Message us on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="py-8 px-4 text-center">
        <p className="text-xs text-muted-foreground">This page is a private invitation and is not indexed by search engines.</p>
      </footer>

      {/* Persistent floating "THE NEXT STEP" button */}
      {stage >= 2 && stage < 4 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-0 right-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-4 pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Button
            onClick={() => advance(4)}
            size="lg"
            className="pointer-events-auto font-bebas uppercase tracking-[0.2em] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            The next step <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default RiseWithUs;
