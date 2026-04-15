import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Gauge, Users, Sparkles, PoundSterling, FileText, Target, Search, ShieldCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { Button } from "@/components/ui/button";
import blackMarbleBg from "@/assets/black-marble-bg.png";
import logo from "@/assets/logo.png";

type AgeGroup = null | "under18" | "over18";
type CardKey = "performance" | "network" | "brand" | "fees" | "agreement" | "expectations" | "scouting";
type PanelKey = "offer" | "fit" | "process" | "request";

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
    "radial-gradient(circle at 18% 18%, hsl(var(--primary) / 0.18), transparent 28%)",
    "radial-gradient(circle at 80% 22%, hsl(var(--foreground) / 0.1), transparent 24%)",
    "radial-gradient(circle at 68% 78%, hsl(var(--primary) / 0.1), transparent 22%)",
    "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 48%, hsl(var(--background)) 100%)",
  ].join(", "),
};

const NAV_ITEMS: Array<{ key: PanelKey; label: string }> = [
  { key: "offer", label: "What We Offer" },
  { key: "fit", label: "Who It’s For" },
  { key: "process", label: "How It Works" },
  { key: "request", label: "Your Request" },
];

const PROCESS_STEPS = [
  {
    title: "Share the basics",
    text: "Tell us your age group, position, club situation and what you want help with so we can assess properly.",
  },
  {
    title: "Send proper evidence",
    text: "Recent footage, match context and the right details let us judge level without guesswork.",
  },
  {
    title: "We review the fit",
    text: "We assess the football, the level, the pathway and whether there is a genuine fit with the agency.",
  },
  {
    title: "Direct next step",
    text: "If there is a fit, we speak clearly about the next stage instead of dragging the process out.",
  },
];

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
  const shouldReduceMotion = useReducedMotion();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [activeCard, setActiveCard] = useState<CardKey>("performance");
  const [activePanel, setActivePanel] = useState<PanelKey>("offer");
  const [showForm, setShowForm] = useState(false);

  const cardContent = useMemo(() => (ageGroup ? getCardContent(ageGroup) : null), [ageGroup]);
  const activeMeta = CARD_META.find((card) => card.key === activeCard) || CARD_META[0];

  const openWhatsApp = () => {
    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Request representation from RISE Football Agency. Performance support, club introductions and player guidance."
      />

      <section className="relative min-h-[100dvh] overflow-hidden px-4 py-4 md:px-6 md:py-6">
        <img src={blackMarbleBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.28),hsl(var(--background)/0.82)_55%,hsl(var(--background)))]" />
        {!shouldReduceMotion && (
          <>
            <motion.div className="absolute left-[10%] top-[12%] h-32 w-32 rounded-full bg-primary/10 blur-3xl" animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }} transition={{ duration: 6, repeat: Infinity }} />
            <motion.div className="absolute bottom-[14%] right-[6%] h-40 w-40 rounded-full bg-primary/10 blur-3xl" animate={{ scale: [1.05, 0.9, 1.05], opacity: [0.25, 0.45, 0.25] }} transition={{ duration: 7, repeat: Infinity }} />
          </>
        )}

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col gap-4 rounded-[2rem] border border-border/60 bg-background/55 p-4 backdrop-blur-md md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="rounded-[1.8rem] border border-border/50 bg-card/45 p-5 md:p-7" style={marbleStyle}>
              <img src={logo} alt="RISE Football Agency" className="h-10 w-auto" />
              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.28em] text-primary">Request Representation</p>
              <h1 className="mt-3 font-bebas text-5xl uppercase leading-none tracking-[0.12em] md:text-7xl">RISE WITH US</h1>
              <div className="mt-4 max-w-[34ch] space-y-1 text-sm leading-relaxed text-foreground/82 md:text-base">
                <p className="font-medium">Realise potential with our experienced intermediary</p>
                <p className="text-foreground/66">and English Premier League star performance team.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button size="lg" className="h-12 rounded-xl font-bebas uppercase tracking-[0.14em]" onClick={() => setActivePanel("request")}>
                  Start Request <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl font-bebas uppercase tracking-[0.14em]" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {NAV_ITEMS.map((item, index) => (
                <motion.button
                  key={item.key}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: 0.28 }}
                  onClick={() => setActivePanel(item.key)}
                  className={`rounded-[1.35rem] border p-4 text-left transition-all ${activePanel === item.key ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.22)]" : "border-border/60 bg-card/35 hover:border-primary/35 hover:bg-card/60"}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Panel {index + 1}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-bebas text-xl uppercase tracking-[0.08em]">{item.label}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="overflow-hidden rounded-[1.7rem] border border-border/60 bg-card/40 p-3">
              <div className="grid grid-cols-2 gap-2">
                {CARD_META.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => {
                        setActiveCard(card.key);
                        setActivePanel("offer");
                      }}
                      className={`group relative overflow-hidden rounded-[1.25rem] border p-3 text-left transition-all ${activeCard === card.key ? "border-primary bg-primary/10" : "border-border/50 bg-background/55 hover:border-primary/30"}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-primary/75">{card.eyebrow}</p>
                      <p className="mt-1 font-bebas text-lg uppercase leading-none tracking-[0.08em]">{card.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 overflow-hidden rounded-[1.7rem] border border-border/60 bg-card/40">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-primary">{NAV_ITEMS.find((item) => item.key === activePanel)?.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Click through each panel rather than scrolling through one long page.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/60 p-1">
                  <button
                    type="button"
                    onClick={() => setAgeGroup("under18")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${ageGroup === "under18" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Under 18
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgeGroup("over18")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${ageGroup === "over18" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Over 18
                  </button>
                </div>
              </div>

              <div className="max-h-[52dvh] overflow-y-auto p-4 md:p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activePanel}-${activeCard}-${ageGroup}`}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16, scale: shouldReduceMotion ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10, scale: shouldReduceMotion ? 1 : 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {activePanel === "offer" && cardContent && (
                      <>
                        <MarbleIconPanel icon={activeMeta.icon} title={cardContent[activeCard].title} />
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-primary">{cardContent[activeCard].eyebrow}</p>
                          <h2 className="mt-2 font-bebas text-3xl uppercase tracking-[0.1em]">{cardContent[activeCard].title}</h2>
                        </div>
                        <div className="grid gap-2.5">
                          {cardContent[activeCard].points.map((point, index) => (
                            <motion.div key={point} initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: shouldReduceMotion ? 0 : index * 0.04, duration: 0.22 }} className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm leading-relaxed text-foreground/84">
                              {point}
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}

                    {activePanel === "fit" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Who It’s For</p>
                          <h2 className="mt-2 font-bebas text-3xl uppercase tracking-[0.1em]">{ageGroup === "under18" ? "Young players with serious intent" : "Players ready for proper representation"}</h2>
                          <p className="mt-3 text-sm leading-relaxed text-foreground/82">
                            {ageGroup === "under18"
                              ? "This route is for ambitious young players who want clear feedback, evidence-based performance support and proper structure around development. Parent or guardian involvement stays part of the process where needed."
                              : "This route is for players who want clear standards, direct communication, real performance support and a representation process built around evidence rather than noise."}
                          </p>
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {(ageGroup === "under18"
                            ? [
                                "Evidence-led reporting and review",
                                "Family kept clear on process",
                                "Development before empty hype",
                                "Structured support and standards",
                              ]
                            : [
                                "Direct feedback and proper standards",
                                "Clarity on fees and agreement",
                                "Performance support with substance",
                                "A sharper route into club conversations",
                              ]
                          ).map((item) => (
                            <div key={item} className="rounded-2xl border border-border/60 bg-card/45 p-4 text-sm text-foreground/82">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                <span>{item}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePanel === "process" && (
                      <div className="space-y-3">
                        {PROCESS_STEPS.map((step, index) => (
                          <motion.button key={step.title} type="button" initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: 0.24 }} className="w-full rounded-2xl border border-border/60 bg-background/60 p-4 text-left hover:border-primary/35">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Step {index + 1}</p>
                                <h2 className="mt-2 font-bebas text-2xl uppercase tracking-[0.08em]">{step.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-foreground/82">{step.text}</p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary">
                                {index + 1}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {activePanel === "request" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Your Request</p>
                          <h2 className="mt-2 font-bebas text-3xl uppercase tracking-[0.1em]">Move forward with clarity</h2>
                          <p className="mt-3 text-sm leading-relaxed text-foreground/82">Use the form if you want a proper review. If you need to speak first, use WhatsApp and we can point you in the right direction quickly.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Button size="lg" className="h-14 rounded-2xl font-bebas uppercase tracking-[0.14em]" onClick={() => setShowForm(true)}>
                            Start Request <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button size="lg" variant="outline" className="h-14 rounded-2xl font-bebas uppercase tracking-[0.14em]" onClick={openWhatsApp}>
                            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                          </Button>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/45 p-4 text-sm leading-relaxed text-foreground/82">
                          The clearest requests usually include recent footage, current club level, position, age group and what kind of support you are actually looking for.
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
