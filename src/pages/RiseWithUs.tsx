import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, TrendingUp, Users, Shield, BarChart3, Dumbbell, Video, BookOpen,
  ChevronDown, ChevronUp, ExternalLink, Zap, Calendar, Eye, Brain, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";

interface ProspectPlayer {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  club: string | null;
  nationality: string | null;
  has_representation_offer?: boolean | null;
}

const TYRESE_PORTAL = "/players/tyrese-omotoye";

// Each section card mirrors the Realise Potential expandable layout: number,
// title, summary and a tappable expand to reveal detail and a real link.
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
  {
    id: "performance",
    number: "01",
    title: "Performance Analysis",
    subtitle: "Every match, broken down",
    icon: BarChart3,
    summary:
      "Every match broken down with expert tactical insight, key moments and areas to grow.",
    detail: [
      "Action-by-action review of every game with timestamped video.",
      "R90 scoring so you know exactly how your minutes compare to elite benchmarks.",
      "Position-specific feedback from a Premier League performance team.",
    ],
    link: { label: "See a real performance report", href: TYRESE_PORTAL },
  },
  {
    id: "development",
    number: "02",
    title: "Development Tracking",
    subtitle: "Numbers that show you the path",
    icon: TrendingUp,
    summary:
      "Monitor your progress with benchmarks, R90 scores and detailed statistics over time.",
    detail: [
      "Live dashboards built around the metrics that decide your career.",
      "Form windows so coaches and clubs can see momentum at a glance.",
      "Honest visibility on where you sit versus the next level.",
    ],
    link: { label: "Open the live data dashboard", href: TYRESE_PORTAL },
  },
  {
    id: "physical",
    number: "03",
    title: "Physical Programming",
    subtitle: "Built around your body and position",
    icon: Dumbbell,
    summary:
      "Strength, power and speed programmes built specifically for you. Nutrition guidance included.",
    detail: [
      "Weekly periodised programmes that match your match calendar.",
      "Movement, mobility and injury prevention layered alongside strength work.",
      "Nutrition strategy aligned to fixtures, travel and recovery.",
    ],
  },
  {
    id: "video",
    number: "04",
    title: "Video Analysis",
    subtitle: "Your game on screen",
    icon: Video,
    summary:
      "Professional clip editing and analysis. Highlight reels, tactical breakdowns, improvement sequences.",
    detail: [
      "Match clips cut and tagged within hours of full time.",
      "Highlight reels ready to share with clubs and scouts.",
      "Tactical sequences explained so the lessons stick.",
    ],
    link: { label: "Watch real analysis on Tyrese's portal", href: TYRESE_PORTAL },
  },
  {
    id: "network",
    number: "05",
    title: "Network & Exposure",
    subtitle: "Opening the right doors",
    icon: Users,
    summary:
      "Connections across European football. Clubs, scouts, coaches and decision-makers who need to know about you.",
    detail: [
      "Active outreach to clubs that fit your profile, not blanket emails.",
      "Trusted relationships across multiple leagues and federations.",
      "Strategic timing of conversations to maximise your value.",
    ],
  },
  {
    id: "career",
    number: "06",
    title: "Career Management",
    subtitle: "Long-term thinking",
    icon: Shield,
    summary:
      "Contract guidance, club negotiations and strategic career planning. We protect your interests.",
    detail: [
      "Step-by-step contract reviews in plain language.",
      "Negotiation handled by people who understand the market.",
      "Multi-year planning so each move builds on the last.",
    ],
  },
  {
    id: "education",
    number: "07",
    title: "Education & Mentoring",
    subtitle: "Off-pitch development",
    icon: BookOpen,
    summary:
      "Coaching resources, mental performance support and professional guidance.",
    detail: [
      "Mental performance frameworks used by top professionals.",
      "Coaching content tailored to your level and goals.",
      "Mentoring from people who have been at the top of the game.",
    ],
  },
  {
    id: "portal",
    number: "08",
    title: "Your Personal Portal",
    subtitle: `Built for ${firstName || "you"}`,
    icon: Star,
    summary:
      "Your own dedicated portal with all your analysis, programmes, stats and development materials.",
    detail: [
      "One login. Every report, every clip, every plan.",
      "Mobile-first so it travels with you.",
      "A complete picture of your development, kept private to you and your team.",
    ],
    link: { label: "See a live portal example", href: TYRESE_PORTAL },
  },
];

const RiseWithUs = () => {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<ProspectPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Picker mode is intentionally hidden: this page is a private invitation.
  const isPickerMode = !slug;

  useEffect(() => {
    if (isPickerMode) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      const searchName = slug.replace(/-/g, " ");
      const { data, error } = await supabase
        .from("players")
        .select(
          "id, name, position, image_url, club, nationality, has_representation_offer, representation_status",
        )
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .ilike("name", searchName)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPlayer(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [slug, isPickerMode]);

  if (loading) return <RiseBrandedLoader />;
  if (notFound || !player) return <NotFound />;

  const firstName = player.name.split(" ")[0];
  const sections = buildSections(firstName);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Rise With Us - RISE Football Agency</title>
      </Helmet>

      {/* Hero */}
      <section className="relative pt-16 sm:pt-24 pb-12 sm:pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-background" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="inline-block text-xs sm:text-sm font-bebas uppercase tracking-[0.3em] text-primary border border-primary/30 px-5 py-1.5">
              An invitation to {firstName}
            </span>

            {player.image_url && (
              <div className="relative mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)]">
                <img
                  src={player.image_url}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                />
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
              {player.position && (
                <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">
                  {player.position}
                </span>
              )}
              {player.club && (
                <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">
                  {player.club}
                </span>
              )}
              {player.nationality && (
                <span className="px-3 py-1 rounded-full border border-border/50 bg-muted/40">
                  {player.nationality}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section Cards (Realise Potential style with expand) */}
      <section className="py-10 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bebas uppercase tracking-wider text-center mb-8 sm:mb-12">
            What working with RISE looks like
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sections.map((section, index) => {
              const isOpen = expandedId === section.id;
              const Icon = section.icon;
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
                      isOpen
                        ? "border-primary/60 bg-primary/5 shadow-[0_0_40px_-15px_hsl(var(--primary)/0.6)]"
                        : "border-border/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="absolute top-4 right-4 text-5xl sm:text-6xl font-bebas text-primary/15 leading-none pointer-events-none">
                      {section.number}
                    </div>

                    <div className="text-primary mb-4">
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bebas uppercase tracking-wider text-foreground">
                      {section.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-primary uppercase tracking-wider mb-3">
                      {section.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.summary}
                    </p>

                    <div className="flex items-center gap-1.5 mt-4 text-xs uppercase tracking-wider text-primary/80">
                      {isOpen ? (
                        <>
                          Hide details <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          See more <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
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
                              <li
                                key={i}
                                className="flex gap-2 text-sm text-foreground/90 leading-relaxed"
                              >
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
        </div>
      </section>

      {/* Pillars strip (will / skill / potential) */}
      <section className="py-12 sm:py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Zap, label: "Will", body: "Drive, attitude and consistency on and off the pitch." },
            { icon: Target, label: "Skill", body: "Technical and tactical quality measured honestly." },
            { icon: Brain, label: "Potential", body: "How far we can take you with the right team around you." },
          ].map((p) => (
            <div
              key={p.label}
              className="p-5 sm:p-6 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm text-center"
            >
              <p.icon className="w-7 h-7 text-primary mx-auto mb-3" />
              <h4 className="font-bebas uppercase tracking-wider text-xl text-foreground">
                {p.label}
              </h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* See it live */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-4">
            See a real RISE portal
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            This is exactly what your portal would look like, with your matches,
            stats and development at the centre of it.
          </p>
          <Button asChild size="lg" className="font-bebas uppercase tracking-wider">
            <a href={TYRESE_PORTAL} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Open Tyrese's Portal
            </a>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-4">
            Let's talk, {firstName}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
            If you'd like to learn more about how RISE can support your development
            and career, we'd love to have a conversation.
          </p>
          <Button asChild size="lg" className="font-bebas uppercase tracking-wider">
            <a href="/contact">
              <Calendar className="mr-2 h-4 w-4" />
              Get in touch
            </a>
          </Button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          This page is a private invitation and is not indexed by search engines.
        </p>
      </footer>
    </div>
  );
};

export default RiseWithUs;
