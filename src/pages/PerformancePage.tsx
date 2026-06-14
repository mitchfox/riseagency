import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  BarChart3, Video, Target, TrendingUp, Activity, Brain, 
  LineChart, Utensils, Dumbbell, Zap, Footprints, Award,
  Users, MessageCircle, ClipboardList, ArrowRight, CheckCircle2
} from "lucide-react";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import bannerHero from "@/assets/banner-hero.jpg";
import { cn } from "@/lib/utils";

const PerformancePage = () => {
  const { t } = useLanguage();

  // Core performance services
  const coreServices = [
    {
      id: "game-analysis",
      icon: Video,
      title: "Game Analysis",
      summary: "Comprehensive performance analysis to support tactical understanding and technical development.",
      details: [
        "Pre-match opposition analysis with tactical systems breakdown",
        "Identification of physical matchups and exploitable weaknesses",
        "Post-match performance review with developmental insights",
        "Positional guides for elite decision-making",
        "Clear action plans with video clip support"
      ],
      highlight: "Delivered 24 hours before kick-off"
    },
    {
      id: "efficiency-reports",
      icon: LineChart,
      title: "Efficiency Reports",
      summary: "Advanced data models evaluating overall performance impact beyond traditional statistics.",
      details: [
        "Player efficiency rating and statistical analysis",
        "Team impact rating across phases of play",
        "Contextual performance measures",
        "Action-to-outcome correlation analysis",
        "Role-specific contribution assessment"
      ],
      highlight: "Data-driven performance insights"
    },
    {
      id: "action-reports",
      icon: BarChart3,
      title: "Action Reports",
      summary: "Every individual action assessed for its impact on scoring versus conceding likelihood.",
      details: [
        "Game state modelling at scale",
        "Decision-making quality evaluation",
        "Risk-reward balance analysis",
        "Context-specific action valuation",
        "Moment-by-moment performance tracking"
      ],
      highlight: "Powered by advanced computing systems"
    },
    {
      id: "psychological",
      icon: Brain,
      title: "Psychological Performance",
      summary: "Mental foundations underpinning consistency, composure, confidence, commitment and concentration.",
      details: [
        "Structured one-to-one sessions",
        "Pre-match mindset conditioning",
        "Post-match performance reviews",
        "Mental skills training programmes",
        "Long-term psychological development"
      ],
      highlight: "Tailored to individual needs"
    },
    {
      id: "nutrition",
      icon: Utensils,
      title: "Nutritional Support",
      summary: "Personalised nutrition strategies for physical output, psychological readiness and recovery.",
      details: [
        "Position-specific nutrition planning",
        "Competition schedule alignment",
        "Recovery and injury prevention focus",
        "Lifestyle factor integration",
        "Ongoing one-to-one guidance"
      ],
      highlight: "Season and off-season support"
    },
    {
      id: "sps",
      icon: Dumbbell,
      title: "Strength, Power & Speed",
      summary: "Explosive and high-output qualities to enhance acceleration, speed and athletic performance.",
      details: [
        "Force generation and application training",
        "Position-specific physical profiling",
        "Injury history consideration",
        "Individual session delivery",
        "Remote and in-person options"
      ],
      highlight: "Modern football demands addressed"
    },
    {
      id: "conditioning",
      icon: Zap,
      title: "Conditioning",
      summary: "Position-specific endurance work addressing multiple physiological systems.",
      details: [
        "Needs analysis and fitness testing",
        "Intermittent demand training",
        "Position-appropriate protocols",
        "Competition-aligned programming",
        "Continued guidance throughout season"
      ],
      highlight: "Beyond generic fitness work"
    },
    {
      id: "technical",
      icon: Footprints,
      title: "Technical Training",
      summary: "Structured, evidence-based skill development designed for match transfer.",
      details: [
        "Modern learning science application",
        "Game-realistic training environments",
        "Decision-making integration",
        "Skill transfer focus",
        "Match execution improvement"
      ],
      highlight: "More than isolated repetition"
    }
  ];

  // Premium services
  const premiumServices = [
    {
      icon: ClipboardList,
      title: "Elite Performance Plans",
      description: "Bespoke programmes combining multiple performance areas based on individual needs. Tailored following a one-to-one discussion with ongoing guidance and adjustments."
    },
    {
      icon: MessageCircle,
      title: "Consultation",
      description: "Open player-led discussions covering any aspect of performance development or career progression. Clear action plans and resources provided after each session."
    },
    {
      icon: Users,
      title: "Mentorship",
      description: "Long-term individualised relationships supporting players, coaches and practitioners through their development journey with reflection and informed decision-making."
    },
    {
      icon: Award,
      title: "Pro Performance Programme",
      description: "Integrated support across all performance areas: physical development, conditioning, nutrition, psychological support and match analysis. Mirrors elite performance settings."
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO 
        title={t('performance.seo_title', 'Performance Analysis - Data-Driven Player Development | RISE')}
        description={t('performance.seo_description', 'Maximise player potential through data-driven insights. We provide comprehensive performance analysis, video breakdown, and individual development plans.')}
        image="/og-preview-performance.png"
        url="/performance"
      />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerHero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
          
          <div className="relative container mx-auto px-4 text-center z-10 py-20">
            <div className="inline-block mb-6">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                {t('performance.badge', 'Integrated Performance Environment')}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('performance.hero_title', 'Performance')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-4xl mx-auto mb-4 italic">
              {t('performance.hero_subtitle', 'Maximising potential through data-driven insights')}
            </p>
            <p className="text-base md:text-lg text-white/70 max-w-3xl mx-auto">
              
              {t('performance_page.supporting_long_term_development_and_match_day_p', 'Supporting long-term development and match-day performance across every stage of a player\'s career')}
            </p>
          </div>
        </section>

        {/* Introduction Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 className="text-3xl md:text-5xl font-bebas uppercase tracking-wider mb-8">
                
                {t('performance_page.our', 'Our')} <span className="text-primary">{t('performance_page.services', 'Services')}</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                
                {t('performance_page.as_a_football_agency_we_provide_a_fully_integrat', 'As a football agency, we provide a fully integrated performance environment for our players and for several clubs we work with. All services are delivered by experienced practitioners and tailored to the individual or collective needs of the player or club.')}
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Core Services Grid */}
        <section className="py-8 md:py-16 px-4 bg-muted/20">
          <div className="container mx-auto max-w-7xl">
            <ScrollRevealContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
              {coreServices.map((service, index) => (
                <ScrollRevealItem key={service.id}>
                  <Card className="h-full group hover:border-primary/40 transition-all duration-300 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <service.icon className="h-6 w-6 text-primary" />
                      </div>
                      
                      <h3 className="text-xl font-bebas uppercase tracking-wider mb-3 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-4 flex-grow">
                        {service.summary}
                      </p>
                      
                      <ul className="space-y-2 mb-4">
                        {service.details.slice(0, 3).map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-auto pt-4 border-t border-border/50">
                        <span className="text-xs text-primary font-medium">{service.highlight}</span>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollRevealItem>
              ))}
            </ScrollRevealContainer>
          </div>
        </section>

        {/* Our Approach Section */}
        <ScrollReveal>
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  {t('performance.our_approach', 'Our')} <span className="text-primary">{t('performance.approach', 'Approach')}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic">
                  
                  {t('performance_page.a_holistic_framework_addressing_every_dimension_', 'A holistic framework addressing every dimension of elite performance')}
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="text-center p-8 border border-border/50 bg-card rounded-2xl hover:border-primary/30 transition-all">
                  <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-3">{t('performance_page.physical', 'Physical')}</h3>
                  <p className="text-sm text-muted-foreground">{t('performance_page.strength_speed_endurance_and_injury_prevention_m', 'Strength, speed, endurance and injury prevention metrics tracked and optimised throughout the season')}</p>
                </div>
                <div className="text-center p-8 border border-border/50 bg-card rounded-2xl hover:border-primary/30 transition-all">
                  <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-3">{t('performance_page.psychological', 'Psychological')}</h3>
                  <p className="text-sm text-muted-foreground">{t('performance_page.mental_resilience_focus_and_match_preparation_su', 'Mental resilience, focus and match preparation support for consistency at the highest level')}</p>
                </div>
                <div className="text-center p-8 border border-border/50 bg-card rounded-2xl hover:border-primary/30 transition-all">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bebas uppercase tracking-wider mb-3">{t('performance_page.tactical', 'Tactical')}</h3>
                  <p className="text-sm text-muted-foreground">{t('performance_page.positional_intelligence_decision_making_and_game', 'Positional intelligence, decision-making and game understanding developed through detailed analysis')}</p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Premium Services */}
        <ScrollReveal>
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-4">
                  
                  {t('performance_page.integrated', 'Integrated')} <span className="text-primary">{t('performance_page.programmes', 'Programmes')}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic">
                  
                  {t('performance_page.comprehensive_support_packages_tailored_to_indiv', 'Comprehensive support packages tailored to individual development goals')}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {premiumServices.map((service, index) => (
                  <div 
                    key={index}
                    className="p-8 border border-border/50 bg-card/50 rounded-2xl hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <service.icon className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">
                          {service.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
              {t('performance.cta_title', 'Optimise Your Performance')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto italic">
              {t('performance.cta_subtitle', 'Learn how our performance analysis can elevate your game')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider">
                <Link to="/contact">
                  {t('common.get_started', 'Get Started')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-bebas uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10">
                <Link to="/packages">{t('common.view_packages', 'View Packages')}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* RISE Broadcast Advertisement */}
        <section className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="max-w-5xl mx-auto p-8 rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
              <div className="text-center relative z-10">
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary mb-3">
                  {t('common.broadcast_title', 'Join RISE Broadcast on Instagram')}
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  {t('common.broadcast_description', 'Get daily updates on agency insights, performance optimisation, coaching systems, and player development strategies')}
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded-lg shadow-lg"
                >
                  <HoverText text={t('common.join_channel', 'Join the Channel')} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PerformancePage;
