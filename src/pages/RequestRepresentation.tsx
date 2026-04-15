import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircle, ChevronLeft, Video, TrendingUp, Users, Dumbbell, Shield, BarChart3 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import requestRepresentationHero from "@/assets/request-representation-hero-uploaded.png";
import omotoyeCelebrating from "@/assets/omotoye-celebrating.png";
import omotoyeJourney from "@/assets/omotoye-journey.jpg";
import tyreseOmotoye from "@/assets/tyrese-omotoye.png";

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
    image: omotoyeCelebrating,
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
    image: tyreseOmotoye,
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
    image: omotoyeCelebrating,
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
    image: omotoyeJourney,
    points: [
      "Position-specific work based on what your game needs",
      "Training ideas that connect to match performance",
      "Physical support with development in mind",
      "A more joined up process around your football",
    ],
  },
  marketing: {
    title: "Marketing & Brand",
    eyebrow: "Your profile should look as strong as your football",
    image: tyreseOmotoye,
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

const CARD_META: Array<{ key: CardKey; title: string; icon: typeof Video; image?: string }> = [
  { key: "analysis", title: "Analysis", icon: Video, image: omotoyeCelebrating },
  { key: "development", title: "Development", icon: TrendingUp, image: omotoyeJourney },
  { key: "network", title: "Club Network", icon: Users, image: tyreseOmotoye },
  { key: "coaching", title: "Coaching", icon: Dumbbell, image: omotoyeCelebrating },
  { key: "marketing", title: "Brand", icon: Shield, image: omotoyeJourney },
  { key: "process", title: "How It Starts", icon: BarChart3, image: tyreseOmotoye },
];

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [showForm, setShowForm] = useState(false);

  const commissionText = useMemo(() => {
    if (ageGroup === "under18") {
      return "For under 18s the focus is on guidance, progression and showing your football properly. No commission is charged.";
    }
    return "For players 18 and over we focus on presenting your level properly and creating the right opportunities. Industry standard commission applies.";
  }, [ageGroup]);

  const openWhatsApp = () => {
    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-hidden">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Request representation from RISE Football Agency. Performance analysis, career development and player support."
      />

      <AnimatePresence mode="wait">
        {/* Step 1: Age selection */}
        {!ageGroup ? (
          <motion.div
            key="age"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-[100dvh]"
          >
             <img
               src={requestRepresentationHero}
              alt="Player walking towards the pitch"
              className="absolute inset-0 h-full w-full object-cover"
              width={1200}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
            <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-10 pt-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="mx-auto w-full max-w-sm"
              >
                 <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-primary">
                  Request Representation
                </p>
                <h1 className="font-bebas text-5xl uppercase leading-none tracking-wider sm:text-6xl">
                   REALISE POTENTIAL WITH OUR EXPERIENCED INTERMEDIARY &amp; ENGLISH PREMIER-LEAGUE STAR PERFORMANCE TEAM.
                </h1>
                 <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/80">
                   Show your level properly with a sharper route into analysis, development, exposure and genuine football opportunities.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
                className="mx-auto mt-8 grid w-full max-w-sm gap-3"
              >
                <Button
                  size="lg"
                   className="h-14 rounded-2xl bg-primary text-primary-foreground font-bebas text-lg uppercase tracking-wider hover:bg-primary/90"
                  onClick={() => setAgeGroup("under18")}
                >
                  Under 18
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                   className="h-14 rounded-2xl border-border bg-background/70 font-bebas text-lg uppercase tracking-wider text-foreground backdrop-blur-md hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setAgeGroup("18plus")}
                >
                  18 and Over
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : activeCard ? (
          /* Step 3: Detail card view */
          <motion.div
            key={`detail-${activeCard}`}
            initial={{ opacity: 0, x: 60, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="min-h-[100dvh] px-4 py-5"
            style={{ perspective: "1400px" }}
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
              <button
                onClick={() => setActiveCard(null)}
                className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>

              {DETAIL_CONTENT[activeCard].image && (
                <motion.div
                  layoutId={`card-img-${activeCard}`}
                  className="mb-5 overflow-hidden rounded-2xl"
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                >
                  <img
                    src={DETAIL_CONTENT[activeCard].image}
                    alt={DETAIL_CONTENT[activeCard].title}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                    width={800}
                    height={600}
                  />
                </motion.div>
              )}

               <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                {DETAIL_CONTENT[activeCard].eyebrow}
              </p>
              <h2 className="mt-1.5 font-bebas text-3xl uppercase leading-none tracking-wider">
                {DETAIL_CONTENT[activeCard].title}
              </h2>

              <div className="mt-5 space-y-2.5">
                {DETAIL_CONTENT[activeCard].points.map((point, i) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.28 }}
                    className="rounded-xl border border-border/50 bg-card/60 p-3.5 text-sm leading-relaxed text-foreground/85"
                  >
                    {point}
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto grid gap-2.5 pt-6 pb-2">
                <Button
                  size="lg"
                   className="h-13 rounded-2xl bg-primary text-primary-foreground font-bebas text-base uppercase tracking-wider hover:bg-primary/90"
                  onClick={() => setShowForm(true)}
                >
                   Start the Conversation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-2xl font-bebas text-base uppercase tracking-wider"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Step 2: Hub with cards */
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="min-h-[100dvh] px-4 py-5"
            style={{ perspective: "1600px" }}
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
              {/* Hero banner */}
               <div className="relative mb-4 overflow-hidden rounded-2xl">
                 <img src={requestRepresentationHero} alt="" className="h-40 w-full object-cover" width={1200} height={800} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                   <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                    {ageGroup === "under18" ? "Under 18" : "18+"}
                  </p>
                   <h1 className="font-bebas text-3xl uppercase leading-none tracking-wider">Realise Potential</h1>
                </div>
              </div>

              {/* Commission info */}
               <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <p className="text-sm leading-relaxed text-foreground/80">{commissionText}</p>
              </div>

              {/* CTA row */}
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <Button
                  size="lg"
                   className="h-12 rounded-xl bg-primary text-primary-foreground font-bebas text-sm uppercase tracking-wider hover:bg-primary/90"
                  onClick={() => setShowForm(true)}
                >
                   Start Here
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl font-bebas text-sm uppercase tracking-wider"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>

              {/* Service cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {CARD_META.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.button
                      key={card.key}
                      type="button"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                       whileHover={{ scale: 1.03, rotateX: [0, 8, -6, 0], rotateY: index % 2 === 0 ? [0, -10, 8, 0] : [0, 10, -8, 0], y: [0, -6, 0] }}
                       whileTap={{ scale: 0.96, rotateX: 4, rotateY: index % 2 === 0 ? -3 : 3 }}
                       transition={{ delay: 0.04 * index, duration: 0.45 }}
                      onClick={() => setActiveCard(card.key)}
                      className="group relative min-h-[120px] overflow-hidden rounded-2xl border border-border/40 bg-card text-left transition-all"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {card.image && (
                        <motion.img
                          layoutId={`card-img-${card.key}`}
                          src={card.image}
                          alt={card.title}
                          className="absolute inset-0 h-full w-full object-cover opacity-40"
                          loading="lazy"
                          width={800}
                          height={600}
                          transition={{ type: "spring", stiffness: 200, damping: 22 }}
                        />
                      )}
                      <div className={`absolute inset-0 ${card.image ? "bg-gradient-to-t from-card via-card/70 to-transparent" : "bg-gradient-to-br from-card to-background"}`} />
                      <div className="relative flex h-full flex-col justify-between p-3.5">
                         <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm">
                           <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bebas text-base uppercase leading-none tracking-wide">{card.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">Tap to explore</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Bottom CTA */}
              <div className="mt-auto pt-5 pb-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-xl font-bebas text-sm uppercase tracking-wider"
                  onClick={() => setShowForm(true)}
                >
                   Open the Form <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
