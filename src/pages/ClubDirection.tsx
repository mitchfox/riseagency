import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrangeMeetingDialog } from "@/components/ArrangeMeetingDialog";
import { useState, useRef, useEffect } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Search, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Globe,
  Shield,
  Eye,
  Lightbulb,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import clubDirectionHero from "@/assets/club-direction-hero.jpg";
import clubStrategy from "@/assets/club-strategy.jpg";
import clubAnalysis from "@/assets/club-analysis.jpg";
import clubNetwork from "@/assets/club-network.jpg";

const ClubDirection = () => {
  const { t } = useLanguage();
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const services = [
    {
      icon: Target,
      title: "Strategic Planning",
      description: "Comprehensive squad planning aligned with your club's vision and financial parameters.",
      features: ["Short and long-term squad analysis", "Budget optimisation", "Competitive positioning"],
      image: clubStrategy
    },
    {
      icon: Search,
      title: "Talent Identification",
      description: "Access our European scouting network to find players that fit your specific requirements.",
      features: ["Bespoke player shortlists", "Video analysis packages", "Background verification"],
      image: clubAnalysis
    },
    {
      icon: BarChart3,
      title: "Performance Analysis",
      description: "Data-driven insights to evaluate current squad performance and identify improvement areas.",
      features: ["Individual player reports", "Team tactical analysis", "Opposition scouting"]
    },
    {
      icon: TrendingUp,
      title: "Development Pathways",
      description: "Structured development programmes for academy and first team integration.",
      features: ["Youth development frameworks", "Loan strategy consultation", "Progression planning"]
    },
    {
      icon: Users,
      title: "Staff Development",
      description: "Support for coaching staff development and departmental alignment.",
      features: ["Coaching consultation", "Staff structure review", "Best practice sharing"]
    },
    {
      icon: Zap,
      title: "Market Intelligence",
      description: "Real-time market insights and player availability across European leagues.",
      features: ["Transfer market updates", "Contract situation monitoring", "Valuation guidance"]
    }
  ];

  const caseStudies = [
    { title: "Academy Pipeline", stat: "74", desc: "Professionals developed through our network" },
    { title: "Big 5 Placements", stat: "18", desc: "Players placed in Europe's elite leagues" },
    { title: "Transfer Value", stat: "£100M+", desc: "Combined transfer fees generated" }
  ];

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % caseStudies.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + caseStudies.length) % caseStudies.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title="Club Direction - Strategic Football Consultancy | RISE Agency"
        description="Strategic consultancy for football clubs. Squad planning, talent identification, and performance analysis to elevate your club."
        image="/og-preview-clubs.png"
        url="/club-direction"
      />
      <Header />
      <ArrangeMeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} />
      
      <main className="pt-32 md:pt-24">
        {/* Hero Section */}
        <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${clubDirectionHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <ScrollReveal className="relative container mx-auto px-4 text-center z-10">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('club_direction.badge', 'Strategic Consultancy')}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('club_direction.hero_title', 'CLUB')} <span className="text-primary">{t('club_direction.hero_highlight', 'DIRECTION')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {t('club_direction.hero_subtitle', 'Strategic consultancy to help clubs compete at the highest level')}
            </p>
            <Button 
              onClick={() => setMeetingOpen(true)}
              size="lg" 
              className="btn-shine font-bebas uppercase tracking-wider text-lg"
            >
              Arrange a Consultation
            </Button>
          </ScrollReveal>
        </section>

        {/* Bento Grid - Visual Impact Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                {t('club_direction.why_title', 'WHY WORK WITH')} <span className="text-primary">{t('club_direction.why_highlight', 'RISE?')}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                National exclusivity for our club partners means undivided time and resources for your success.
              </p>
            </ScrollReveal>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {/* Large featured card */}
              <ScrollReveal delay={0.1} className="col-span-2 row-span-2">
                <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden group">
                  <img 
                    src={clubStrategy} 
                    alt="Strategic Planning" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center mb-4">
                      <Target className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-3xl font-bebas uppercase tracking-wider text-white mb-2">Strategic Planning</h3>
                    <p className="text-white/80">Comprehensive squad planning aligned with your vision</p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Stat card */}
              <ScrollReveal delay={0.2} className="col-span-1">
                <div className="h-full bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-primary/30 transition-colors">
                  <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">100+</div>
                  <p className="text-sm text-muted-foreground">Club Connections Across Europe</p>
                </div>
              </ScrollReveal>

              {/* Stat card */}
              <ScrollReveal delay={0.3} className="col-span-1">
                <div className="h-full bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-primary/30 transition-colors">
                  <div className="text-5xl md:text-6xl font-bebas text-primary mb-2">15+</div>
                  <p className="text-sm text-muted-foreground">Years Combined Experience</p>
                </div>
              </ScrollReveal>

              {/* Analysis image card */}
              <ScrollReveal delay={0.4} className="col-span-1 row-span-1">
                <div className="relative h-full min-h-[200px] rounded-2xl overflow-hidden group">
                  <img 
                    src={clubAnalysis} 
                    alt="Performance Analysis" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="text-white font-bebas uppercase tracking-wider">Analysis</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Icon feature card */}
              <ScrollReveal delay={0.5} className="col-span-1">
                <div className="h-full bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <h4 className="text-lg font-bebas uppercase tracking-wider mb-1">National Exclusivity</h4>
                  <p className="text-xs text-muted-foreground">Undivided attention</p>
                </div>
              </ScrollReveal>

              {/* Network image - wide */}
              <ScrollReveal delay={0.6} className="col-span-2">
                <div className="relative h-[200px] rounded-2xl overflow-hidden group">
                  <img 
                    src={clubNetwork} 
                    alt="European Network" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="h-8 w-8 text-primary" />
                      <span className="text-2xl font-bebas uppercase tracking-wider text-white">European Network</span>
                    </div>
                    <p className="text-white/70 text-sm max-w-xs">Direct relationships with key decision-makers across Europe's top leagues</p>
                  </div>
                </div>
              </ScrollReveal>

              {/* More stat cards */}
              <ScrollReveal delay={0.7} className="col-span-1">
                <div className="h-full bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-primary/30 transition-colors">
                  <Eye className="h-8 w-8 text-primary mb-3" />
                  <h4 className="text-lg font-bebas uppercase tracking-wider mb-1">Data-Driven</h4>
                  <p className="text-xs text-muted-foreground">Insights across all of Europe</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.8} className="col-span-1">
                <div className="h-full bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-primary/30 transition-colors">
                  <Lightbulb className="h-8 w-8 text-primary mb-3" />
                  <h4 className="text-lg font-bebas uppercase tracking-wider mb-1">Proactive</h4>
                  <p className="text-xs text-muted-foreground">Ahead of the curve</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Services Slider */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                {t('club_direction.services_title', 'OUR')} <span className="text-primary">{t('club_direction.services_highlight', 'SERVICES')}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive support tailored to your club's specific needs and objectives
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {services.map((service, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <div className="group relative h-full p-8 bg-card border border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {service.description}
                    </p>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Case Studies Slider */}
        <section className="py-16 md:py-24 bg-background overflow-hidden">
          <div className="container mx-auto px-4">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                PROVEN <span className="text-primary">RESULTS</span>
              </h2>
            </ScrollReveal>

            <div className="relative max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                <button 
                  onClick={prevSlide}
                  className="p-3 rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div ref={sliderRef} className="flex-1 overflow-hidden">
                  <div 
                    className="flex transition-transform duration-500"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                  >
                    {caseStudies.map((study, index) => (
                      <div key={index} className="w-full flex-shrink-0 px-4">
                        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
                          <div className="text-7xl md:text-9xl font-bebas text-primary mb-4">{study.stat}</div>
                          <h3 className="text-2xl font-bebas uppercase tracking-wider mb-2">{study.title}</h3>
                          <p className="text-muted-foreground">{study.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={nextSlide}
                  className="p-3 rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {caseStudies.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      activeSlide === index ? 'bg-primary scale-125' : 'bg-border hover:bg-primary/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal className="text-center mb-12">
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                  {t('club_direction.process_title', 'HOW IT')} <span className="text-primary">{t('club_direction.process_highlight', 'WORKS')}</span>
                </h2>
              </ScrollReveal>

              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: "01", title: "Initial Consultation", desc: "We meet to understand your club's vision, challenges, and objectives.", icon: Target },
                  { step: "02", title: "Assessment", desc: "Comprehensive review of your current setup and requirements.", icon: Search },
                  { step: "03", title: "Strategy", desc: "A tailored plan aligned with your goals and budget.", icon: Lightbulb },
                  { step: "04", title: "Implementation", desc: "Ongoing support and guidance to achieve results.", icon: TrendingUp }
                ].map((item, index) => (
                  <ScrollReveal key={index} delay={index * 0.15}>
                    <div className="relative p-6 bg-card border border-border/50 rounded-2xl hover:border-primary/30 transition-colors h-full">
                      <div className="text-5xl font-bebas text-primary/20 mb-2">{item.step}</div>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bebas uppercase tracking-wider mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                      
                      {index < 3 && (
                        <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                          <ArrowRight className="h-5 w-5 text-primary/30" />
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <ScrollReveal className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
              {t('club_direction.cta_title', 'READY TO')} <span className="text-primary">{t('club_direction.cta_highlight', 'ELEVATE YOUR CLUB?')}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let's discuss how we can help your club achieve its goals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setMeetingOpen(true)}
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg"
              >
                Arrange a Meeting
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="font-bebas uppercase tracking-wider"
              >
                <Link to="/clubs">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ClubDirection;