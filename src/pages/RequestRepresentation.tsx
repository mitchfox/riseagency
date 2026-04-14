import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, ChevronUp, Video, BarChart3, Users, Shield, 
  TrendingUp, Dumbbell, BookOpen, Star, ArrowRight, MessageCircle,
  CheckCircle2, Target, Zap
} from "lucide-react";

type AgeGroup = null | "under18" | "18plus";

const ServiceCard = ({ 
  icon: Icon, 
  title, 
  description, 
  details 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  details: string[];
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all group"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm md:text-base">{title}</h3>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="mt-4 space-y-2 pl-12">
                {details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-foreground/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

const RequestRepresentation = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [showForm, setShowForm] = useState(false);

  const services = [
    {
      icon: Video,
      title: "Performance Analysis",
      description: "In-depth match analysis using our proprietary R90 scoring system.",
      details: [
        "Full match video analysis with action-by-action breakdown",
        "R90 performance scoring normalised to per-90 minutes",
        "Detailed match statistics and calculated ratios",
        "Video clips of every contributable action",
        "Period grade maps and pitch heatmaps",
      ],
    },
    {
      icon: BarChart3,
      title: "Data-Driven Scouting Reports",
      description: "Comprehensive reports shared directly with clubs and scouts.",
      details: [
        "Personalised performance reports for every match",
        "Transfer reports highlighting strengths and potential",
        "Comparison data against league and position benchmarks",
        "Form charts tracking development over time",
        "Reports accessible via secure portal links",
      ],
    },
    {
      icon: TrendingUp,
      title: "Career Development",
      description: "Structured pathway to help you reach your potential.",
      details: [
        "Individualised development programmes",
        "Coaching sessions tailored to identified areas for growth",
        "Goal-setting frameworks with measurable outcomes",
        "Regular progress reviews and adjusted targets",
      ],
    },
    {
      icon: Users,
      title: "Club Network & Opportunities",
      description: "Connections across professional and semi-professional football.",
      details: [
        "Direct relationships with clubs at all levels",
        "Trial and showcase opportunities",
        "Contract negotiation support",
        "Ongoing communication with club contacts on your behalf",
      ],
    },
    {
      icon: Dumbbell,
      title: "Coaching & Fitness",
      description: "Access to coaching resources and physical development programmes.",
      details: [
        "Position-specific coaching drills and sessions",
        "Strength and conditioning programmes",
        "Nutrition and lifestyle guidance",
        "Recovery and injury prevention support",
      ],
    },
    {
      icon: Shield,
      title: "Marketing & Brand",
      description: "Build your personal brand as a professional footballer.",
      details: [
        "Professional photography and highlight videos",
        "Social media content strategy",
        "Media training and interview preparation",
        "Player profile and portfolio creation",
      ],
    },
  ];

  const scoutingProcess = [
    { step: "1", title: "Submit Your Details", desc: "Fill in the form with your information and match footage links." },
    { step: "2", title: "Initial Assessment", desc: "Our team reviews your footage and playing background." },
    { step: "3", title: "Trial Analysis", desc: "If suitable, we conduct a full R90 analysis of your recent matches." },
    { step: "4", title: "Discussion", desc: "We meet to discuss your goals and how we can work together." },
    { step: "5", title: "Onboarding", desc: "Welcome aboard. Your development programme begins immediately." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Request Representation | RISE Football Agency"
        description="Take the next step in your football career. Request representation from RISE and access elite performance analysis, coaching and career development."
      />
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
            Rise With Us
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            We work with players who are serious about reaching the next level. 
            Our approach is built on data, development and direct connections with clubs.
          </p>
        </motion.div>

        {/* Age Selection */}
        {!ageGroup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 mb-12"
          >
            <h2 className="text-center text-lg md:text-xl font-semibold">How old are you?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Button
                variant="outline"
                className="h-20 text-lg font-bebas uppercase tracking-wider hover:border-primary hover:bg-primary/5"
                onClick={() => setAgeGroup("under18")}
              >
                Under 18
              </Button>
              <Button
                variant="outline"
                className="h-20 text-lg font-bebas uppercase tracking-wider hover:border-primary hover:bg-primary/5"
                onClick={() => setAgeGroup("18plus")}
              >
                18 and Over
              </Button>
            </div>
          </motion.div>
        )}

        {/* Age-specific content */}
        <AnimatePresence mode="wait">
          {ageGroup && (
            <motion.div
              key={ageGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Age group indicator */}
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setAgeGroup(null)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Change
                </button>
                <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {ageGroup === "under18" ? "Under 18" : "18+"}
                </span>
              </div>

              {/* Commission info */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 md:p-6 text-center">
                  <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
                  {ageGroup === "under18" ? (
                    <>
                      <h3 className="font-bold text-base md:text-lg">No Commission</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We do not charge commission for players under 18. Our focus at this stage is purely on your development and getting you ready for professional football.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-base md:text-lg">Industry Standard Commission</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        For players 18 and over, we operate on industry standard commission rates. This means we only earn when you earn, aligning our success directly with yours.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* What we need from you */}
              <div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wider mb-4 text-center">
                  What We Need From You
                </h2>
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm">
                        <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Match footage</strong> — full match videos of your best recent performances. Highlights also work but full matches are preferred.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Your details</strong> — name, date of birth, current club and playing position.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Ambition</strong> — a genuine desire to develop and take your career seriously.</span>
                      </li>
                      {ageGroup === "under18" && (
                        <li className="flex items-start gap-3 text-sm">
                          <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span><strong>Parent/guardian contact</strong> — a parent or guardian will need to be involved in discussions.</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="font-bebas uppercase tracking-wider text-lg bg-risegold hover:bg-risegold/90 text-black"
                  onClick={() => setShowForm(true)}
                >
                  Request Representation <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="font-bebas uppercase tracking-wider text-lg gap-2"
                  onClick={() => {
                    window.open("https://wa.me/447340184399?text=Hi%2C%20I%27d%20like%20to%20request%20representation.", "_blank");
                  }}
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp Us
                </Button>
              </div>

              {/* Services */}
              <div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wider mb-4 text-center">
                  What We Provide
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((service) => (
                    <ServiceCard key={service.title} {...service} />
                  ))}
                </div>
              </div>

              {/* Scouting Process */}
              <div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wider mb-4 text-center">
                  Our Process
                </h2>
                <div className="space-y-3">
                  {scoutingProcess.map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="text-center py-8 space-y-4">
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider">
                  Ready to Take the Next Step?
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Submit your details and match footage. We review every application personally.
                </p>
                <Button
                  size="lg"
                  className="font-bebas uppercase tracking-wider text-lg bg-risegold hover:bg-risegold/90 text-black"
                  onClick={() => setShowForm(true)}
                >
                  Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <RepresentationDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
};

export default RequestRepresentation;
