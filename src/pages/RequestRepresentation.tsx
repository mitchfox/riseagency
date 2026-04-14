import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BarChart3, MessageCircle, Shield, TrendingUp, Users, Video, Dumbbell, ChevronLeft } from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import riseTunnel from "@/assets/rise-tunnel.jpg";
import riseAnalysis from "@/assets/rise-analysis.jpg";
import riseDevelopment from "@/assets/rise-development.jpg";

type AgeGroup = null | "under18" | "18plus";
type CardKey = "analysis" | "development" | "network" | "coaching" | "marketing" | "process";

const DETAIL_CONTENT: Record<CardKey, {
  title: string;
  eyebrow: string;
  image?: string;
  points: string[];
}> = {
  analysis: {
    title: "Performance Analysis",
    eyebrow: "See what clubs actually need to see",
    image: riseAnalysis,
    points: [
      "Full match analysis with clips attached to actions",
      "R90 scoring built to show real impact on the game",
      "Reports that are clean, visual and easy to share",
      "A process that shows more than a standard highlight reel",
    ],
  },
  development: {
    title: "Career Development",
    eyebrow: "A clearer path forward",
    image: riseDevelopment,
    points: [
      "Development plans built around your actual performances",
      "Coaching support shaped by what the footage shows",
      "Clear targets instead of vague feedback",
      "Regular reviews so your next steps stay obvious",
    ],
  },
  network: {
    title: "Club Network",
    eyebrow: "Connections backed by proper evidence",
    points: [
      "We present players with context, not noise",
      "Reports and clips help make introductions stronger",
      "The aim is to create genuine opportunities, not false promises",
      "Everything is built to show your level properly",
    ],
  },
  coaching: {
    title: "Coaching & Fitness",
    eyebrow: "Support beyond a single report",
    points: [
      "Position-specific work based on what your game needs",
      "Training ideas that connect to match performance",
      "Physical support with development in mind",
      "A more joined-up process around your football",
    ],
  },
  marketing: {
    title: "Marketing & Brand",
    eyebrow: "Your profile should look as strong as your football",
    points: [
      "Sharper presentation for players who want to stand out",
      "Better visual content for sharing your level",
      "Cleaner player identity across footage and reports",
      "A more professional feel when your profile is viewed",
    ],
  },
  process: {
    title: "How It Starts",
    eyebrow: "Simple and direct",
    points: [
      "You send your details and recent footage",
      "We assess whether there is a fit",
      "If there is, we take a deeper look at your game",
      "Then we discuss the right next step with you",
    ],
  },
};

const CARD_META: Array<{ key: CardKey; title: string; icon: typeof Video; accent: string; image?: string }> = [
  { key: "analysis", title: "Analysis", icon: Video, accent: "from-primary/25 to-transparent", image: riseAnalysis },
  { key: "development", title: "Development", icon: TrendingUp, accent: "from-primary/20 to-transparent", image: riseDevelopment },
  { key: "network", title: "Club Network", icon: Users, accent: "from-primary/15 to-transparent" },
  { key: "coaching", title: "Coaching", icon: Dumbbell, accent: "from-primary/20 to-transparent" },
  { key: "marketing", title: "Brand", icon: Shield, accent: "from-primary/20 to-transparent" },
  { key: "process", title: "How It Starts", icon: BarChart3, accent: "from-primary/20 to-transparent" },
];

const spring = { type: "spring", stiffness: 240, damping: 24 } as const;

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [showForm, setShowForm] = useState(false);

  const commissionText = useMemo(() => {
    if (ageGroup === "under18") {
      return {
        title: "Built around development",
        body: "For under 18s the focus is on guidance, progression and showing your football properly.",
      };
    }

    return {
      title: "Built for the next step",
      body: "For players 18 and over we focus on presenting your level properly and creating the right opportunities.",
    };
  }, [ageGroup]);

  const openWhatsApp = () => {
    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
  };

  return (
    <div className="min-h-[100dvh] bg-background overflow-hidden">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Request representation from RISE Football Agency and explore our analysis, development and player support services."
      />

      <AnimatePresence mode="wait">
        {!ageGroup ? (
          <motion.main
            key="age-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            className="relative min-h-[100dvh]"
          >
            <img
              src={riseTunnel}
              alt="Player walking towards the pitch"
              className="absolute inset-0 h-full w-full object-cover"
              width={1200}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/55 to-background" />
            <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-8 pt-10 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto w-full max-w-md"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-primary">Request Representation</p>
                <h1 className="font-bebas text-5xl uppercase leading-none tracking-wider text-foreground sm:text-6xl">
                  Rise With Us
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/80 sm:text-base">
                  A cleaner way to show your football, your level and where you can go next.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.45 }}
                className="mx-auto mt-6 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <Button
                  size="lg"
                  className="h-16 rounded-2xl text-base font-bebas uppercase tracking-wider shadow-xl"
                  onClick={() => setAgeGroup("under18")}
                >
                  Under 18
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 rounded-2xl border-foreground/20 bg-background/75 text-base font-bebas uppercase tracking-wider text-foreground backdrop-blur-md hover:bg-background"
                  onClick={() => setAgeGroup("18plus")}
                >
                  18 and Over
                </Button>
              </motion.div>
            </div>
          </motion.main>
        ) : activeCard ? (
          <motion.main
            key={`detail-${activeCard}`}
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -28, rotateY: 8 }}
            transition={{ duration: 0.34 }}
            className="min-h-[100dvh] px-4 py-4 sm:px-6"
            style={{ perspective: 1600 }}
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-[28px] border border-border/60 bg-card/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <button
                onClick={() => setActiveCard(null)}
                className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              {DETAIL_CONTENT[activeCard].image ? (
                <motion.div
                  layoutId={`card-image-${activeCard}`}
                  className="mb-4 overflow-hidden rounded-[22px]"
                  transition={spring}
                >
                  <img
                    src={DETAIL_CONTENT[activeCard].image}
                    alt={DETAIL_CONTENT[activeCard].title}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                    width={800}
                    height={600}
                  />
                </motion.div>
              ) : null}

              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">{DETAIL_CONTENT[activeCard].eyebrow}</p>
                <h2 className="mt-2 font-bebas text-3xl uppercase leading-none tracking-wider text-foreground">
                  {DETAIL_CONTENT[activeCard].title}
                </h2>
              </div>

              <div className="space-y-3">
                {DETAIL_CONTENT[activeCard].points.map((point, index) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.28 }}
                    className="rounded-2xl border border-border/60 bg-background/70 p-3 text-sm leading-6 text-foreground/85 shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.5)]"
                  >
                    {point}
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto grid gap-2 pt-5">
                <Button size="lg" className="h-14 rounded-2xl text-base font-bebas uppercase tracking-wider" onClick={() => setShowForm(true)}>
                  Request Representation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 rounded-2xl text-base font-bebas uppercase tracking-wider" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
                </Button>
              </div>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="hub-step"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.3 }}
            className="min-h-[100dvh] px-4 py-4 sm:px-6"
            style={{ perspective: 1800 }}
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-[30px] border border-border/60 bg-card/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="relative mb-4 overflow-hidden rounded-[24px] border border-border/60">
                <img src={riseTunnel} alt="Football representation" className="h-44 w-full object-cover" width={1200} height={800} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                    {ageGroup === "under18" ? "Under 18" : "18+"}
                  </p>
                  <h1 className="font-bebas text-4xl uppercase leading-none tracking-wider text-foreground">
                    Rise With Us
                  </h1>
                </div>
              </div>

              <div className="mb-4 rounded-[22px] border border-primary/20 bg-primary/10 p-4 shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.65)]">
                <p className="text-sm font-semibold text-foreground">{commissionText.title}</p>
                <p className="mt-1 text-sm leading-6 text-foreground/75">{commissionText.body}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <Button size="lg" className="h-14 rounded-2xl text-sm font-bebas uppercase tracking-wider" onClick={() => setShowForm(true)}>
                  Apply Now
                </Button>
                <Button size="lg" variant="outline" className="h-14 rounded-2xl text-sm font-bebas uppercase tracking-wider" onClick={openWhatsApp}>
                  WhatsApp
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {CARD_META.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.button
                      key={card.key}
                      type="button"
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.32 }}
                      whileTap={{ scale: 0.97, rotateX: 5, rotateY: index % 2 === 0 ? -4 : 4 }}
                      onClick={() => setActiveCard(card.key)}
                      className="group relative min-h-[132px] overflow-hidden rounded-[22px] border border-border/60 bg-background text-left shadow-[0_24px_45px_-30px_hsl(var(--foreground)/0.45)] transition-transform"
                    >
                      {card.image ? (
                        <motion.img
                          layoutId={`card-image-${card.key}`}
                          src={card.image}
                          alt={card.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          width={800}
                          height={600}
                          transition={spring}
                        />
                      ) : null}
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                      <div className={`absolute inset-0 ${card.image ? "bg-gradient-to-t from-background via-background/45 to-transparent" : "bg-gradient-to-br from-card to-background"}`} />
                      <Card className="absolute inset-0 border-0 bg-transparent shadow-none">
                        <div className="relative flex h-full flex-col justify-between p-3.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 shadow-lg backdrop-blur-md">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bebas text-lg uppercase leading-none tracking-wide text-foreground">{card.title}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-foreground/55">Tap to open</p>
                          </div>
                        </div>
                      </Card>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-auto pt-4">
                <Button size="lg" variant="outline" className="h-14 w-full rounded-2xl text-sm font-bebas uppercase tracking-wider" onClick={() => setShowForm(true)}>
                  Start Your Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
