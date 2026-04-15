import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircle, ChevronLeft, Gauge, Users, Sparkles, PoundSterling, FileText, Target, Search, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import requestRepresentationHero from "@/assets/request-representation-hero-uploaded.png";

type AgeGroup = null | "under18" | "over18";
type CardKey = "performance" | "network" | "brand" | "fees" | "agreement" | "expectations" | "scouting";

const CARD_META: Array<{ key: CardKey; title: string; icon: typeof Gauge; eyebrow: string }> = [
  { key: "performance", title: "Performance", icon: Gauge, eyebrow: "Real analysis, real evidence" },
  { key: "network", title: "Club Network", icon: Users, eyebrow: "Introductions with context" },
  { key: "brand", title: "Brand", icon: Sparkles, eyebrow: "Sharper presentation" },
  { key: "fees", title: "Fees", icon: PoundSterling, eyebrow: "Clear from the start" },
  { key: "agreement", title: "Representation Agreement", icon: FileText, eyebrow: "What the relationship covers" },
  { key: "expectations", title: "Expectations", icon: Target, eyebrow: "What we expect from you" },
  { key: "scouting", title: "Scouting Process", icon: Search, eyebrow: "How we assess fit" },
];

const marbleStyle = {
  backgroundImage: [
    "radial-gradient(circle at 18% 18%, hsl(var(--gold) / 0.18), transparent 28%)",
    "radial-gradient(circle at 80% 22%, hsl(var(--foreground) / 0.12), transparent 24%)",
    "radial-gradient(circle at 68% 78%, hsl(var(--gold) / 0.12), transparent 22%)",
    "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 48%, hsl(var(--background)) 100%)",
  ].join(", "),
};

const getCardContent = (ageGroup: Exclude<AgeGroup, null>) => ({
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
  scouting: {
    title: "Scouting Process",
    eyebrow: "How we decide whether there is a fit",
    points: [
      "You send the key details, recent footage and enough information for us to assess properly.",
      "We look at level, position, evidence and whether there is a realistic fit for the player and the agency.",
      "If the fit is there, we look more closely and speak directly about the next step.",
      "If it is not there yet, that is better said clearly than dressed up with nonsense.",
    ],
  },
});

const MarbleIconPanel = ({ icon: Icon, title }: { icon: typeof Gauge; title: string }) => (
  <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 p-6" style={marbleStyle}>
    <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.1),hsl(var(--background)/0.72))]" />
    <div className="relative flex min-h-[160px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_30px_hsl(var(--gold)/0.12)]">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <p className="font-bebas text-2xl uppercase tracking-[0.18em]">{title}</p>
    </div>
  </div>
);

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [showForm, setShowForm] = useState(false);

  const cardContent = useMemo(() => (ageGroup ? getCardContent(ageGroup) : null), [ageGroup]);

  const openWhatsApp = () => {
    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Request representation from RISE Football Agency. Performance support, club introductions and player guidance."
      />

      <AnimatePresence mode="wait">
        {!ageGroup ? (
          <motion.section
            key="request-age"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[100dvh]"
          >
            <img
              src={requestRepresentationHero}
              alt="Player walking out towards the pitch"
              className="absolute inset-0 h-full w-full object-cover"
              width={1400}
              height={900}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.16),hsl(var(--background)/0.68)_52%,hsl(var(--background))_100%)]" />

            <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-10 pt-10">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.42 }}
                className="mx-auto w-full max-w-sm"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-primary">Request Representation</p>
                <h1 className="font-bebas text-5xl uppercase leading-none tracking-[0.12em] sm:text-6xl">RISE WITH US</h1>
                <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-foreground/84">
                  REALISE POTENTIAL WITH OUR EXPERIENCED INTERMEDIARY &amp; ENGLISH PREMIER-LEAGUE STAR PERFORMANCE TEAM.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.42 }}
                className="mx-auto mt-8 grid w-full max-w-sm gap-3"
              >
                <Button
                  size="lg"
                  className="h-14 rounded-2xl bg-primary font-bebas text-lg uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
                  onClick={() => setAgeGroup("under18")}
                >
                  Under 18
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-2xl border-border bg-background/70 font-bebas text-lg uppercase tracking-[0.14em] text-foreground backdrop-blur-md hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setAgeGroup("over18")}
                >
                  Over 18
                </Button>
              </motion.div>
            </div>
          </motion.section>
        ) : activeCard && cardContent ? (
          <motion.section
            key={`detail-${activeCard}`}
            initial={{ opacity: 0, x: 42 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -42 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[100dvh] px-4 py-5"
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
              <button
                onClick={() => setActiveCard(null)}
                className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>

              <MarbleIconPanel icon={CARD_META.find((card) => card.key === activeCard)!.icon} title={cardContent[activeCard].title} />

              <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">{cardContent[activeCard].eyebrow}</p>
              <h2 className="mt-1.5 font-bebas text-3xl uppercase leading-none tracking-[0.14em]">{cardContent[activeCard].title}</h2>

              <div className="mt-5 space-y-2.5">
                {cardContent[activeCard].points.map((point, index) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.24 }}
                    className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm leading-relaxed text-foreground/84"
                  >
                    {point}
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto grid gap-2.5 pb-2 pt-6">
                <Button
                  size="lg"
                  className="h-13 rounded-2xl bg-primary font-bebas text-base uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
                  onClick={() => setShowForm(true)}
                >
                  Start the Conversation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-2xl font-bebas text-base uppercase tracking-[0.14em]"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Us
                </Button>
              </div>
            </div>
          </motion.section>
        ) : cardContent ? (
          <motion.section
            key="request-hub"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[100dvh] px-4 py-5"
          >
            <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-border/60">
                <img src={requestRepresentationHero} alt="RISE representation" className="h-44 w-full object-cover" width={1400} height={900} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.18),hsl(var(--background)/0.28),hsl(var(--background)/0.92))]" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">Request Representation</p>
                  <h1 className="mt-1 font-bebas text-3xl uppercase leading-none tracking-[0.16em]">RISE WITH US</h1>
                  <p className="mt-2 max-w-[32ch] text-xs leading-relaxed text-foreground/80">
                    REALISE POTENTIAL WITH OUR EXPERIENCED INTERMEDIARY &amp; ENGLISH PREMIER-LEAGUE STAR PERFORMANCE TEAM.
                  </p>
                </div>
              </div>

              <div className="mb-4 mt-4 grid grid-cols-2 gap-2.5">
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-primary font-bebas text-sm uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
                  onClick={() => setShowForm(true)}
                >
                  Start Here
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl font-bebas text-sm uppercase tracking-[0.14em]"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CARD_META.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.button
                      key={card.key}
                      type="button"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.03, rotateX: [0, 8, -6, 0], rotateY: index % 2 === 0 ? [0, -9, 7, 0] : [0, 9, -7, 0], y: [0, -5, 0] }}
                      whileTap={{ scale: 0.97, rotateX: 3, rotateY: index % 2 === 0 ? -3 : 3 }}
                      transition={{ delay: index * 0.04, duration: 0.42 }}
                      onClick={() => setActiveCard(card.key)}
                      className="group relative overflow-hidden rounded-[1.45rem] border border-border/60 p-3 text-left"
                      style={{ ...marbleStyle, transformStyle: "preserve-3d" }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.06),hsl(var(--background)/0.74))]" />
                      <div className="relative flex min-h-[132px] flex-col justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_26px_hsl(var(--gold)/0.14)]">
                          <Icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80">{card.eyebrow}</p>
                          <p className="mt-1 font-bebas text-lg uppercase leading-none tracking-[0.1em]">{card.title}</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-auto pb-2 pt-5">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-xl font-bebas text-sm uppercase tracking-[0.14em]"
                  onClick={() => setShowForm(true)}
                >
                  Open the Form <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
