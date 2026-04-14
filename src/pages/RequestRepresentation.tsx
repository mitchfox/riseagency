import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, BarChart3, Users, Shield, 
  TrendingUp, Dumbbell, ArrowRight, MessageCircle,
  CheckCircle2, Target, ChevronLeft, ArrowDown
} from "lucide-react";
import riseTunnel from "@/assets/rise-tunnel.jpg";
import riseAnalysis from "@/assets/rise-analysis.jpg";
import riseDevelopment from "@/assets/rise-development.jpg";

type AgeGroup = null | "under18" | "18plus";
type ActiveCard = null | "analysis" | "development" | "network" | "coaching" | "marketing" | "process" | "commission";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

const cardData = {
  analysis: {
    icon: Video,
    title: "Performance Analysis",
    image: riseAnalysis,
    points: [
      "Full match video analysis with action-by-action breakdown",
      "R90 performance scoring normalised to per-90 minutes",
      "Detailed match statistics and calculated ratios",
      "Video clips of every contributable action",
      "Period grade maps and pitch heatmaps",
    ],
  },
  development: {
    icon: TrendingUp,
    title: "Career Development",
    image: riseDevelopment,
    points: [
      "Individualised development programmes",
      "Coaching sessions tailored to identified areas for growth",
      "Goal-setting frameworks with measurable outcomes",
      "Regular progress reviews and adjusted targets",
    ],
  },
  network: {
    icon: Users,
    title: "Club Network",
    image: null,
    points: [
      "Direct relationships with clubs at all levels",
      "Trial and showcase opportunities",
      "Contract negotiation support",
      "Ongoing communication with club contacts on your behalf",
    ],
  },
  coaching: {
    icon: Dumbbell,
    title: "Coaching & Fitness",
    image: null,
    points: [
      "Position-specific coaching drills and sessions",
      "Strength and conditioning programmes",
      "Nutrition and lifestyle guidance",
      "Recovery and injury prevention support",
    ],
  },
  marketing: {
    icon: Shield,
    title: "Marketing & Brand",
    image: null,
    points: [
      "Professional photography and highlight videos",
      "Social media content strategy",
      "Media training and interview preparation",
      "Player profile and portfolio creation",
    ],
  },
  process: {
    icon: BarChart3,
    title: "Our Scouting Process",
    image: null,
    points: [
      "1. Submit your details and match footage links",
      "2. Our team reviews your footage and playing background",
      "3. If suitable, we conduct a full R90 analysis of your recent matches",
      "4. We meet to discuss your goals and how we can work together",
      "5. Welcome aboard — your development programme begins immediately",
    ],
  },
};

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);
  const [showForm, setShowForm] = useState(false);

  const handleWhatsApp = () => {
    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Take the next step in your football career. Request representation from RISE and access elite performance analysis, coaching and career development."
      />

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Age Selection ── */}
        {!ageGroup && (
          <motion.div
            key="age-select"
            {...fadeUp}
            className="flex-1 flex flex-col relative"
          >
            {/* Hero background */}
            <div className="absolute inset-0">
              <img src={riseTunnel} alt="" className="w-full h-full object-cover" width={1200} height={800} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-end pb-12 px-6 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-3 text-foreground"
              >
                Rise With Us
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-muted-foreground text-sm md:text-base max-w-md mb-8"
              >
                We work with players who are serious about reaching the next level.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
              >
                <Button
                  size="lg"
                  className="flex-1 h-16 text-lg font-bebas uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setAgeGroup("under18")}
                >
                  Under 18
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-16 text-lg font-bebas uppercase tracking-wider bg-risegold hover:bg-risegold/90 text-black"
                  onClick={() => setAgeGroup("18plus")}
                >
                  18 and Over
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-6"
              >
                <ArrowDown className="h-5 w-5 text-muted-foreground animate-bounce" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Active Card Detail View ── */}
        {ageGroup && activeCard && cardData[activeCard as keyof typeof cardData] && (
          <motion.div
            key={`card-${activeCard}`}
            {...fadeUp}
            className="flex-1 flex flex-col min-h-[100dvh]"
          >
            {/* Back button */}
            <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b px-4 py-3">
              <button
                onClick={() => setActiveCard(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>

            {(() => {
              const data = cardData[activeCard as keyof typeof cardData];
              const Icon = data.icon;
              return (
                <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">
                  {data.image && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-xl overflow-hidden aspect-video"
                    >
                      <img src={data.image} alt={data.title} className="w-full h-full object-cover" loading="lazy" width={800} height={600} />
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bebas uppercase tracking-wider">{data.title}</h2>
                  </div>

                  <ul className="space-y-3">
                    {data.points.map((point, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-3 text-sm text-foreground/80"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA at bottom of detail */}
                  <div className="pt-4 space-y-3">
                    <Button
                      size="lg"
                      className="w-full font-bebas uppercase tracking-wider text-lg bg-risegold hover:bg-risegold/90 text-black"
                      onClick={() => setShowForm(true)}
                    >
                      Request Representation <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-bebas uppercase tracking-wider text-lg gap-2"
                      onClick={handleWhatsApp}
                    >
                      <MessageCircle className="h-5 w-5" /> WhatsApp Us
                    </Button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ── STEP 2: Main Hub (no card open) ── */}
        {ageGroup && !activeCard && (
          <motion.div
            key="hub"
            {...fadeUp}
            className="flex-1 flex flex-col min-h-[100dvh] px-4 py-6 max-w-lg mx-auto w-full"
          >
            {/* Title area */}
            <div className="text-center mb-6">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-bebas uppercase tracking-wider mb-2"
              >
                Rise With Us
              </motion.h1>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                {ageGroup === "under18" ? "Under 18" : "18+"}
              </span>
            </div>

            {/* Commission banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-primary/10 border border-primary/20 p-4 mb-5 text-center"
            >
              {ageGroup === "under18" ? (
                <>
                  <p className="font-bold text-sm">No Commission</p>
                  <p className="text-xs text-muted-foreground mt-1">We don't charge commission for players under 18. Our focus is purely on your development.</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm">Industry Standard Commission</p>
                  <p className="text-xs text-muted-foreground mt-1">We only earn when you earn, aligning our success directly with yours.</p>
                </>
              )}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex gap-2 mb-6"
            >
              <Button
                size="lg"
                className="flex-1 font-bebas uppercase tracking-wider bg-risegold hover:bg-risegold/90 text-black"
                onClick={() => setShowForm(true)}
              >
                Apply Now <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="font-bebas uppercase tracking-wider gap-1.5"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* What we need */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border bg-card p-4 mb-5"
            >
              <h3 className="font-bebas uppercase tracking-wider text-base mb-3">What We Need From You</h3>
              <ul className="space-y-2">
                {[
                  { text: "Match footage — full match videos preferred, highlights also work" },
                  { text: "Your details — name, date of birth, current club and position" },
                  { text: "Ambition — a genuine desire to develop and progress" },
                  ...(ageGroup === "under18" ? [{ text: "Parent/guardian contact for discussions" }] : []),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/80">
                    <Target className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Service cards grid */}
            <div className="space-y-2 mb-6">
              <h3 className="font-bebas uppercase tracking-wider text-base">Explore Our Services</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(cardData) as (keyof typeof cardData)[]).map((key, i) => {
                  const data = cardData[key];
                  const Icon = data.icon;
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.04 }}
                      onClick={() => setActiveCard(key as ActiveCard)}
                      className="rounded-xl border bg-card hover:border-primary/50 transition-all p-3 text-left group relative overflow-hidden"
                    >
                      {data.image && (
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                          <img src={data.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="relative z-10">
                        <div className="p-1.5 rounded-lg bg-primary/10 w-fit mb-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="font-semibold text-xs leading-tight">{data.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Tap to learn more</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-auto pt-4 pb-6 text-center space-y-3"
            >
              <p className="text-xs text-muted-foreground">We review every application personally.</p>
              <Button
                size="lg"
                className="w-full font-bebas uppercase tracking-wider text-lg bg-risegold hover:bg-risegold/90 text-black"
                onClick={() => setShowForm(true)}
              >
                Request Representation <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
