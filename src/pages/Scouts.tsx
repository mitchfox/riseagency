import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail, MapPin, Users, TrendingUp, Award, Database, BarChart3, Target, Sparkles, Globe, Brain, Zap, Activity, Crosshair, Eye, Handshake, ArrowRight } from "lucide-react";
import { SCOUTING_POSITIONS, POSITION_SKILLS, ScoutingPosition } from "@/data/scoutingSkills";
import useEmblaCarousel from "embla-carousel-react";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";

const domainConfig = {
  Physical: {
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    solidBg: "bg-red-500"
  },
  Mental: {
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    solidBg: "bg-purple-500"
  },
  Technical: {
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    solidBg: "bg-blue-500"
  },
  Tactical: {
    icon: Crosshair,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    solidBg: "bg-green-500"
  }
};

const getPositionInitials = (position: ScoutingPosition, t: (key: string, fallback?: string) => string): string => {
  const initials: Record<ScoutingPosition, string> = {
    "Goalkeeper": t('scouts.pos_gk', 'GK'),
    "Full-Back": t('scouts.pos_fb', 'FB'),
    "Centre-Back": t('scouts.pos_cb', 'CB'),
    "Central Defensive Midfielder": t('scouts.pos_cdm', 'CDM'),
    "Central Midfielder": t('scouts.pos_cm', 'CM'),
    "Central Attacking Midfielder": t('scouts.pos_cam', 'CAM'),
    "Winger / Wide Forward": t('scouts.pos_winger', 'W/WF'),
    "Centre Forward / Striker": t('scouts.pos_striker', 'CF/ST')
  };
  return initials[position];
};

const getDomainTranslation = (domain: string, t: (key: string, fallback?: string) => string): string => {
  const translations: Record<string, string> = {
    "Physical": t('scouts.domain_physical', 'Physical'),
    "Psychological": t('scouts.domain_psychological', 'Psychological'),
    "Mental": t('scouts.domain_mental', 'Mental'),
    "Technical": t('scouts.domain_technical', 'Technical'),
    "Tactical": t('scouts.domain_tactical', 'Tactical')
  };
  return translations[domain] || domain;
};

const Scouts = () => {
  const { t } = useLanguage();
  const [selectedPosition, setSelectedPosition] = useState<ScoutingPosition>(SCOUTING_POSITIONS[0]);
  const [expandedDomain, setExpandedDomain] = useState<keyof typeof domainConfig | null>(null);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    skipSnaps: false,
    duration: 40,
  });

  const scrollToSlide = (index: number) => {
    emblaApi?.scrollTo(index);
    setSelectedSlide(index);
  };

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedSlide(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const handleWhatsApp = () => {
    window.open("https://wa.me/447856255509", "_blank");
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEO 
        title="For Scouts - Join RISE Network"
        description="Join RISE's scouting network. Access our database, competitive incentives, and forever commission structure."
        image="/og-preview-scouts.png"
        url="/scouts"
      />
      <Header />
      
      <main className="pt-32 md:pt-24 space-y-0">

        {/* SECTION 1: Hero Intro - Who We Are */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden py-10 md:py-12">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(212,175,55,0.1),transparent_40%)]" />
          
          <div className="relative container mx-auto px-4 text-center z-10 space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-wider">{t('scouts.elite_badge', 'Elite Scouting Network')}</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-bebas uppercase tracking-wider leading-none">
              <span className="text-foreground">{t('scouts.hero_discover', 'Discover Talent.')}</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {t('scouts.hero_earn', 'Earn Forever.')}
              </span>
            </h1>
            
            <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
              {t('scouts.hero_desc', "Join our extensive network of scouts; where we provide the tools, training, and structure to find the stars of tomorrow.")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="btn-shine font-bebas uppercase tracking-wider text-lg px-10 py-6 rounded-xl group"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {t('scouts.join_now', 'Join the Network')}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="font-bebas uppercase tracking-wider text-lg px-10 py-6 hover:scale-105 transition-all rounded-xl group"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('scouts.learn_more', 'Learn How It Works')}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Quick value props */}
            <div className="flex flex-wrap justify-center gap-6 pt-8">
              {[
                { icon: Globe, text: t('scouts.value_europe', 'Pan-European Coverage') },
                { icon: Award, text: t('scouts.value_commission', 'Forever Commission') },
                { icon: Database, text: t('scouts.value_tools', 'Professional Tools') },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2: How It Works */}
        <section id="how-it-works" className="py-8 md:py-10 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-primary/5" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Handshake className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.process_badge', 'Simple Process')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('scouts.how_it_works', 'How It Works')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                {t('scouts.how_desc', 'A straightforward partnership that rewards your expertise')}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { num: "1", title: t('scouts.step1_title', 'Scout & Report'), desc: t('scouts.step1_desc', 'Identify talented players using our position-specific criteria'), icon: Eye },
                { num: "2", title: t('scouts.step2_title', 'Submit to Database'), desc: t('scouts.step2_desc', 'Add detailed reports to our comprehensive system'), icon: Database },
                { num: "3", title: t('scouts.step3_title', 'We Represent'), desc: t('scouts.step3_desc', 'We work to develop and place the player effectively'), icon: Users },
                { num: "4", title: t('scouts.step4_title', 'You Earn'), desc: t('scouts.step4_desc', 'Receive forever commission on all player earnings'), icon: Award }
              ].map((step, idx) => (
                <Card key={idx} className="relative text-center group p-6 border-2 border-transparent hover:border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                  <div className="relative mb-4">
                    <div className="text-6xl font-bebas text-primary/10 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                      {step.num}
                    </div>
                    <div className="h-14 w-14 mx-auto bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <h4 className="font-bebas text-xl uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">{step.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: Incentive Structure */}
        <section className="py-8 md:py-10 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.benefits_badge', 'Your Benefits')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('scouts.incentive_title', 'Rewarding Partnership')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                {t('scouts.incentive_desc', 'Your work has lasting value. We make sure you benefit from it.')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">{t('scouts.forever_commission', 'Forever Commission')}</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">{t('scouts.lifetime_earnings', 'Lifetime Earnings')}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    {t('scouts.lifetime_earnings_desc', 'Receive commission on all earnings from players you discover, throughout their entire career. Your scouting work pays dividends for years to come.')}
                  </p>
                  
                  <ul className="space-y-2">
                    {[
                      t('scouts.initial_signing', 'Commission on initial signing fees'),
                      t('scouts.future_transfers', 'Percentage of future transfers'),
                      t('scouts.ongoing_earnings', 'Ongoing representation earnings')
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group/item">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                          <span className="text-primary text-xs">✓</span>
                        </div>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">{t('scouts.development_support', 'Development Support')}</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">{t('scouts.enhance_skills', 'Enhance Your Skills')}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    {t('scouts.enhance_skills_desc', 'Access training, resources, and mentorship to develop your scouting expertise and industry knowledge.')}
                  </p>
                  
                  <ul className="space-y-2">
                    {[
                      t('scouts.training_sessions', 'Regular training sessions'),
                      t('scouts.database_tools', 'Access to our database and tools'),
                      t('scouts.networking', 'Industry networking opportunities')
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group/item">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                          <span className="text-primary text-xs">✓</span>
                        </div>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 4: European Coverage & Database */}
        <section className="py-8 md:py-10 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.europe_badge', 'Eyes Across All Of Europe')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 leading-none">
                {t('scouts.scouting_across', 'SCOUTING ACROSS')}
                <br />
                <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  {t('scouts.all_of_europe', 'ALL OF EUROPE')}
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light">
                {t('scouts.europe_desc', "We scout every major European market. Wherever talent emerges, we have eyes on the ground—and we're looking for scouts who know their region.")}
              </p>
            </div>

            {/* Scouting Network Map */}
            <div className="max-w-5xl mx-auto mb-6">
              <div className="relative bg-card rounded-2xl border-2 border-border overflow-hidden">
                <ScoutingNetworkMap />
              </div>
              <p className="text-center text-sm text-primary mt-4 font-bebas uppercase tracking-wider">
                {t('scouts.join_network', 'Be part of something bigger. Join the network.')}
              </p>
            </div>

          </div>
        </section>

        {/* SECTION 5: Scouting Criteria */}
        <section className="relative min-h-screen flex flex-col py-8">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="flex-1 flex flex-col relative z-10">
            <div className="text-center py-4 px-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.criteria_badge', 'Position-Specific Criteria')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('scouts.what_we_look', 'What We Look For')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto font-light">
                {t('scouts.criteria_desc', 'At the first stage of scouting, we adopt our own version of the 4-corner model for each position, with a view to 5-dimensional play and qualities that level up to the highest play in the professional game')}
              </p>
            </div>

            {/* Gold Circle Indicators */}
            <div className="flex justify-center gap-3 pb-4">
              {[0, 1].map((index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    selectedSlide === index
                      ? 'w-12 h-3 bg-primary shadow-lg shadow-primary/50'
                      : 'w-3 h-3 bg-muted hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Embla Carousel */}
            <div className="flex-1 overflow-hidden" ref={emblaRef}>
              <div className="flex h-full">
                {/* Slide 1: Position & Domain Criteria */}
                <div className="flex-[0_0_100%] min-w-0 px-4 pb-20 flex items-center">
                  <div className="w-full max-w-6xl mx-auto">
                    <div className="border-2 border-border rounded-2xl overflow-hidden bg-card animate-fade-in">
                      {/* Position Selection */}
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-0 border-b-2 border-border">
                        {SCOUTING_POSITIONS.map((position) => (
                          <button
                            key={position}
                            onClick={() => setSelectedPosition(position)}
                            className={`py-4 px-2 font-bebas uppercase tracking-wider text-sm md:text-base transition-all border-r border-border last:border-r-0 ${
                              selectedPosition === position
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            {getPositionInitials(position, t)}
                          </button>
                        ))}
                      </div>

                      {/* Content Area with Corner Domain Selectors */}
                      <div className="relative p-0">
                        {(() => {
                          const positionSkills = POSITION_SKILLS[selectedPosition];
                          const skillsByDomain = positionSkills.reduce((acc, skill) => {
                            if (!acc[skill.domain]) acc[skill.domain] = [];
                            acc[skill.domain].push(skill);
                            return acc;
                          }, {} as Record<string, typeof positionSkills>);

                          const currentDomain = expandedDomain || "Physical";
                          const config = domainConfig[currentDomain];
                          const skills = skillsByDomain[currentDomain];

                          const domainKeys = Object.keys(domainConfig) as Array<keyof typeof domainConfig>;
                          const cornerPositions = [
                            { domain: domainKeys[0], position: 'top-0 left-0', rounded: 'rounded-br-xl' },
                            { domain: domainKeys[1], position: 'top-0 right-0', rounded: 'rounded-bl-xl' },
                            { domain: domainKeys[2], position: 'bottom-0 left-0', rounded: 'rounded-bl-2xl rounded-tr-xl' },
                            { domain: domainKeys[3], position: 'bottom-0 right-0', rounded: 'rounded-br-2xl rounded-tl-xl' }
                          ];

                          return (
                            <>
                              {/* Corner Domain Buttons */}
                              {cornerPositions.map(({ domain, position, rounded }) => {
                                const domainConf = domainConfig[domain];
                                const DomainIcon = domainConf.icon;
                                const isActive = currentDomain === domain;
                                
                                return (
                                  <button
                                    key={domain}
                                    onClick={() => setExpandedDomain(domain)}
                                    className={`absolute ${position} ${rounded} flex items-center gap-3 transition-all hover:scale-105 border-2 z-10 ${
                                      isActive 
                                        ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20 h-16 px-4 w-auto' 
                                        : `${domainConf.borderColor} ${domainConf.bgColor} hover:shadow-lg h-16 w-16 justify-center`
                                    }`}
                                    title={getDomainTranslation(domain, t)}
                                  >
                                    <DomainIcon className={`h-6 w-6 ${domainConf.color} flex-shrink-0`} />
                                    {isActive && (
                                      <span className={`font-bebas uppercase tracking-wider text-xl ${domainConf.color} pr-2 whitespace-nowrap`}>
                                        {getDomainTranslation(domain, t)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}

                              {/* Content - Attributes Grid */}
                              <div className="px-6 py-20 md:px-8">
                                <div className="grid md:grid-cols-2 gap-4">
                                  {skills.map((skill, idx) => {
                                    const skillKey = skill.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`group bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl hover:${config.bgColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:${config.borderColor} overflow-hidden`}
                                      >
                                        <div className={`${config.solidBg} px-5 py-3`}>
                                          <h4 className="font-bold text-black text-base">
                                            {t(`scouts.skill_${skillKey}`, skill.skill_name)}
                                          </h4>
                                        </div>
                                        <div className="px-5 py-4">
                                          <p className="text-sm text-muted-foreground leading-relaxed">
                                            {t(`scouts.skill_${skillKey}_desc`, skill.description)}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Tactical Schemes */}
                <div className="flex-[0_0_100%] min-w-0 px-4 pb-20 flex items-center">
                  <div className="w-full max-w-6xl mx-auto">
                    <div className="border-2 border-border rounded-2xl overflow-hidden bg-card p-6 md:p-8 animate-fade-in">
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{t('scouts.tactical_badge', 'Tactical Understanding')}</span>
                        </div>
                        
                        <h3 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                          {t('scouts.tactical_title', 'Tactical Schemes')}
                        </h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                          {t('scouts.tactical_desc', 'Understanding player roles within different tactical formations and systems')}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-primary/20">
                          <h4 className="font-bebas text-2xl uppercase tracking-wider text-primary mb-3">
                            {t('scouts.team_schemes', 'Team Schemes')}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {t('scouts.team_schemes_desc', 'How the team sets up tactically: formations (4-3-3, 4-4-2, 3-5-2), build-up patterns, pressing structures, and defensive organisation.')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"].map(formation => (
                              <Badge key={formation} variant="secondary" className="bg-primary/20 border-primary/30">
                                {formation}
                              </Badge>
                            ))}
                          </div>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-primary/20">
                          <h4 className="font-bebas text-2xl uppercase tracking-wider text-primary mb-3">
                            {t('scouts.opposition_analysis', 'Opposition Analysis')}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {t('scouts.opposition_analysis_desc', "Understanding the opponent's tactical approach, identifying weaknesses to exploit, and recognising their strengths to neutralise.")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["High Press", "Low Block", "Counter Attack", "Possession"].map(style => (
                              <Badge key={style} variant="secondary" className="bg-primary/20 border-primary/30">
                                {style}
                              </Badge>
                            ))}
                          </div>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-primary/20">
                          <h4 className="font-bebas text-2xl uppercase tracking-wider text-primary mb-3">
                            {t('scouts.position_roles', 'Position-Specific Roles')}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('scouts.position_roles_desc', 'How each position operates within different systems: inverted full-backs, false 9s, box-to-box midfielders, and other tactical variations.')}
                          </p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-primary/20">
                          <h4 className="font-bebas text-2xl uppercase tracking-wider text-primary mb-3">
                            {t('scouts.game_phases', 'Game Phases')}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('scouts.game_phases_desc', 'Player performance across all phases: build-up play, offensive transition, attacking, defensive transition, and defensive organisation.')}
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: R90 Stage 2 - Statistical Analysis */}
        <section className="py-8 md:py-10 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.stage2_badge', 'Stage 2: Deep Analysis')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('scouts.r90_title', 'R90 Performance Reports')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto font-light">
                {t('scouts.r90_desc', 'We have built superintelligent statistical modelling to understand the expected outcome of decisions based on thousands of professional games at the highest levels of football over the past decade.')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="group relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">{t('scouts.superintelligent', 'Superintelligent Analysis')}</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">{t('scouts.action_by_action', 'Action-by-Action Breakdown')}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    {t('scouts.action_by_action_desc', 'We statistically break down the quality of decision-making action-by-action throughout a match. Every pass, touch, movement, and decision is measured against what elite players do in the same situations.')}
                  </p>
                  
                  <ul className="space-y-2">
                    {[
                      t('scouts.r90_expected', 'Expected outcome vs actual outcome'),
                      t('scouts.r90_elite', 'Comparison to elite-level decisions'),
                      t('scouts.r90_context', 'Contextual pressure analysis')
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group/item">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                          <span className="text-primary text-xs">✓</span>
                        </div>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bebas text-primary">{t('scouts.scout_development', 'Scout Development')}</div>
                  </div>
                  
                  <h3 className="text-2xl font-bebas uppercase tracking-wider mb-3">{t('scouts.sharpen_eye', 'Sharpen Your Eye')}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                    {t('scouts.sharpen_eye_desc', 'We can fully understand how accurate our scouts\' reporting was based on these statistical models, helping to develop their eye for talent. This allows us to know who already has skills that level up and how much work would be required to improve areas of weakness.')}
                  </p>
                  
                  <ul className="space-y-2">
                    {[
                      t('scouts.r90_accuracy', 'Measure your scouting accuracy'),
                      t('scouts.r90_feedback', 'Detailed feedback on assessments'),
                      t('scouts.r90_growth', 'Track your development as a scout')
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 group/item">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                          <span className="text-primary text-xs">✓</span>
                        </div>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 7: Stage 3 - Making Contact */}
        <section className="py-8 md:py-10 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Handshake className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.stage3_badge', 'Stage 3: Making Contact')}</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('scouts.contact_title', 'From Discovery to Representation')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto font-light">
                {t('scouts.contact_desc', 'Once a player passes our R90 analysis, we move to make contact with the talent and progress from there. At this point, you have already secured your lifetime commission on any earnings we receive in connection to the player.')}
              </p>
            </div>

            <Card className="group relative overflow-hidden border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 via-card to-green-500/5 hover:border-green-500/50 transition-all duration-500">
              <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="h-20 w-20 bg-green-500/20 rounded-2xl flex items-center justify-center">
                    <Award className="h-10 w-10 text-green-500" />
                  </div>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-bebas uppercase tracking-wider mb-4 text-green-500">
                  {t('scouts.lifetime_secured', 'Lifetime Commission Secured')}
                </h3>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
                  {t('scouts.lifetime_secured_desc', 'Your eye for talent can earn you commission for multiple decades. When the player you discovered signs professionally, every contract, every transfer, every milestone—you earn from it all.')}
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    t('scouts.earn_signing', 'Earn on signing'),
                    t('scouts.earn_transfers', 'Earn on transfers'),
                    t('scouts.earn_renewals', 'Earn on renewals'),
                    t('scouts.earn_decades', 'Earn for decades')
                  ].map((item, idx) => (
                    <div key={idx} className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-600 dark:text-green-400 font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* SECTION 8: Final CTA */}
        <section className="py-10 md:py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15),transparent_60%)]" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('scouts.join_badge', 'Start Today')}</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider leading-none">
                {t('scouts.ready_to', 'Ready To')}
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {t('scouts.join_team', 'Join The Team?')}
                </span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
                {t('scouts.join_desc', "Get in touch to learn more about joining our scouting network. We're always looking for passionate scouts across Europe.")}
              </p>
              
              <div className="flex gap-4 justify-center flex-wrap pt-4">
                <Button 
                  size="lg" 
                  className="btn-shine font-bebas uppercase tracking-wider text-lg px-10 py-6 rounded-xl group"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {t('scouts.whatsapp_us', 'WhatsApp Us')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider text-lg px-10 py-6 hover:scale-105 transition-all rounded-xl"
                  asChild
                >
                  <a href="mailto:contact@riseagency.com">
                    <Mail className="mr-2 h-5 w-5" />
                    {t('scouts.email_contact', 'Email Contact')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Scouts;