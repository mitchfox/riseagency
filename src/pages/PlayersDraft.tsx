import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import footballIcon from "@/assets/football-icon.png";
import { ChevronDown, Eye, FileSignature, TrendingUp, Trophy, Users, Briefcase, Star } from "lucide-react";

const PlayersDraft = () => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  const sections = [
    {
      id: "hero",
      type: "hero" as const,
    },
    {
      id: "scout",
      type: "journey" as const,
      icon: Eye,
      phase: "01",
      titleKey: "players.scout",
      titleFallback: "SCOUT",
      subtitleKey: "players.scout_subtitle",
      subtitleFallback: "Discovery & Identification",
      contentKey: "players.scout_desc",
      contentFallback: "Our extensive global scouting network identifies exceptional talent across every level of the game. From grassroots academies to professional leagues, we find players with the technical ability, mentality, and ambition to succeed at the highest level.",
      detailsKey: "players.scout_details",
      detailsFallback: "• Network of 50+ scouts across 20 countries\n• Data-driven player analysis and profiling\n• Video assessment and live match evaluation\n• Character and mentality assessment",
      position: { x: 10, y: 30 }
    },
    {
      id: "represent",
      type: "journey" as const,
      icon: FileSignature,
      phase: "02",
      titleKey: "players.represent",
      titleFallback: "REPRESENT",
      subtitleKey: "players.represent_subtitle",
      subtitleFallback: "Partnership & Protection",
      contentKey: "players.represent_desc",
      contentFallback: "When we identify the right fit, we build a genuine partnership. Our experienced intermediaries negotiate contracts that protect your interests and maximize your earning potential, ensuring you're valued fairly at every stage of your career.",
      detailsKey: "players.represent_details",
      detailsFallback: "• Expert contract negotiation and review\n• Legal protection and compliance guidance\n• Transfer market positioning\n• Career pathway planning",
      position: { x: 30, y: 45 }
    },
    {
      id: "develop",
      type: "journey" as const,
      icon: TrendingUp,
      phase: "03",
      titleKey: "players.develop",
      titleFallback: "DEVELOP",
      subtitleKey: "players.develop_subtitle",
      subtitleFallback: "Growth & Excellence",
      contentKey: "players.develop_desc",
      contentFallback: "Development never stops. Our specialist coaching team creates personalized programs to enhance every aspect of your game—physical conditioning, technical refinement, tactical understanding, and mental resilience. We push boundaries to unlock your full potential.",
      detailsKey: "players.develop_details",
      detailsFallback: "• Bespoke physical training programs\n• Technical and tactical coaching\n• Sports psychology and mental performance\n• Nutrition and recovery optimization",
      position: { x: 55, y: 55 }
    },
    {
      id: "perform",
      type: "journey" as const,
      icon: Trophy,
      phase: "04",
      titleKey: "players.perform",
      titleFallback: "PERFORM",
      subtitleKey: "players.perform_subtitle",
      subtitleFallback: "Consistency & Impact",
      contentKey: "players.perform_desc",
      contentFallback: "Preparation meets opportunity. Through detailed opposition analysis, psychological coaching, and strategic preparation, we ensure you're ready to deliver when it matters most. Consistent high performance opens doors to the biggest stages in football.",
      detailsKey: "players.perform_details",
      detailsFallback: "• Individual match preparation and analysis\n• Opposition scouting and tactical briefings\n• In-season performance monitoring\n• Post-match review and feedback",
      position: { x: 80, y: 40 }
    },
    {
      id: "progress",
      type: "journey" as const,
      icon: Star,
      phase: "05",
      titleKey: "players.progress",
      titleFallback: "PROGRESS",
      subtitleKey: "players.progress_subtitle",
      subtitleFallback: "Advancement & Opportunity",
      contentKey: "players.progress_desc",
      contentFallback: "Your success creates opportunity. As you develop and perform, we leverage our club relationships and market knowledge to secure the right moves at the right time—whether that's a step up, a new challenge, or securing your legacy at the top level.",
      detailsKey: "players.progress_details",
      detailsFallback: "• Strategic transfer planning\n• Club relationship management\n• Career milestone optimization\n• Long-term wealth and legacy planning",
      position: { x: 90, y: 70 }
    },
    {
      id: "services",
      type: "services" as const,
    },
    {
      id: "cta",
      type: "cta" as const,
    }
  ];

  const journeySections = sections.filter(s => s.type === "journey");
  const totalSections = sections.length;

  // Scroll to section with smooth animation
  const scrollToSection = useCallback((index: number) => {
    if (isScrolling || !sectionsRef.current[index]) return;
    
    setIsScrolling(true);
    sectionsRef.current[index]?.scrollIntoView({ behavior: "smooth" });
    
    setTimeout(() => setIsScrolling(false), 800);
  }, [isScrolling]);

  // Auto-scroll after viewing current section
  useEffect(() => {
    const observers = sectionsRef.current.map((section, index) => {
      if (!section) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              setActiveSection(index);
            }
          });
        },
        { threshold: [0.6] }
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  // Handle scroll navigation hint
  const handleScrollHint = () => {
    if (activeSection < totalSections - 1) {
      scrollToSection(activeSection + 1);
    }
  };

  // Get ball position based on active journey section
  const getBallPosition = () => {
    const journeyIndex = journeySections.findIndex(s => s.id === sections[activeSection]?.id);
    if (journeyIndex === -1) {
      // If not on a journey section, use first or last position
      if (activeSection === 0) return journeySections[0]?.position || { x: 10, y: 30 };
      return journeySections[journeySections.length - 1]?.position || { x: 90, y: 70 };
    }
    return journeySections[journeyIndex].position;
  };

  const ballPos = getBallPosition();
  const currentJourneyIndex = journeySections.findIndex(s => s.id === sections[activeSection]?.id);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background overflow-y-auto snap-y snap-mandatory"
      style={{ scrollBehavior: "smooth" }}
    >
      <SEO 
        title="Players | RISE Football Agency"
        description="Discover the complete player journey with RISE Football Agency. From scouting to career progression - comprehensive support for footballers at every level."
        noindex={true}
      />

      <Header />

      {/* Fixed Pitch Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="w-full h-full relative overflow-hidden bg-background">
          {/* Pitch gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          
          {/* Pitch lines */}
          <div className="absolute inset-0 opacity-15">
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
            {/* Center line */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white" />
            {/* Penalty boxes */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-64 border-2 border-white border-l-0" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-64 border-2 border-white border-r-0" />
            {/* Goal areas */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-16 h-32 border-2 border-white border-l-0" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-16 h-32 border-2 border-white border-r-0" />
          </div>

          {/* Journey path line - connecting dots */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d={`M ${journeySections.map(s => `${s.position.x}% ${s.position.y}%`).join(' L ')}`}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="animate-pulse"
            />
          </svg>

          {/* Journey waypoints */}
          {journeySections.map((section, index) => (
            <div
              key={section.id}
              className={`absolute w-4 h-4 rounded-full transition-all duration-700 ${
                index <= currentJourneyIndex 
                  ? 'bg-primary scale-100 shadow-[0_0_20px_hsl(var(--primary))]' 
                  : 'bg-white/30 scale-75'
              }`}
              style={{
                left: `${section.position.x}%`,
                top: `${section.position.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Animated Football */}
          <div
            className="absolute w-16 h-16 transition-all duration-1000 ease-out z-10"
            style={{
              left: `${ballPos.x}%`,
              top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative w-full h-full animate-pulse">
              <img
                src={footballIcon}
                alt="Football"
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              />
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-ping" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
              activeSection === index 
                ? 'bg-primary scale-125 shadow-[0_0_10px_hsl(var(--primary))]' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section 
        ref={(el) => (sectionsRef.current[0] = el)}
        className="relative min-h-screen flex items-center justify-center snap-start snap-always"
      >
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bebas uppercase tracking-wider text-white drop-shadow-2xl">
              {t('players.hero_title', 'YOUR JOURNEY')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {t('players.hero_subtitle', 'From discovery to legacy — the complete pathway to footballing excellence')}
            </p>
            
            {/* Journey preview pills */}
            <div className="flex flex-wrap justify-center gap-3 pt-8">
              {journeySections.map((section, index) => (
                <div 
                  key={section.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
                >
                  <span className="text-primary font-bebas">{section.phase}</span>
                  <span className="text-white/80 text-sm">{t(section.titleKey, section.titleFallback)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <button 
            onClick={handleScrollHint}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <span className="text-sm uppercase tracking-wider">Scroll to begin</span>
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        </div>
      </section>

      {/* Journey Sections */}
      {journeySections.map((section, journeyIndex) => {
        const sectionIndex = sections.findIndex(s => s.id === section.id);
        const Icon = section.icon;
        const isActive = activeSection === sectionIndex;
        const isPast = activeSection > sectionIndex;
        
        return (
          <section
            key={section.id}
            ref={(el) => (sectionsRef.current[sectionIndex] = el)}
            className="relative min-h-screen flex items-center justify-center snap-start snap-always py-20"
          >
            <div className="container mx-auto px-4 max-w-5xl">
              {/* Phase indicator */}
              <div 
                className={`absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 transition-all duration-700 ${
                  isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
              >
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
                <span className="text-primary font-bebas text-2xl tracking-widest">{section.phase}</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
              </div>

              {/* Main content card */}
              <div 
                className={`relative bg-black/80 backdrop-blur-xl border border-primary/30 rounded-3xl overflow-hidden transition-all duration-700 ${
                  isActive 
                    ? 'scale-100 opacity-100 shadow-[0_0_60px_-15px_hsl(var(--primary))]' 
                    : isPast 
                      ? 'scale-95 opacity-50' 
                      : 'scale-95 opacity-30'
                }`}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative p-8 md:p-12 lg:p-16">
                  {/* Icon and title row */}
                  <div className="flex items-start gap-6 mb-8">
                    <div className={`p-4 rounded-2xl bg-primary/10 border border-primary/30 transition-all duration-500 ${
                      isActive ? 'scale-100' : 'scale-90'
                    }`}>
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-5xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-white mb-2">
                        {t(section.titleKey, section.titleFallback)}
                      </h2>
                      <p className="text-primary/80 font-bebas text-xl tracking-wide">
                        {t(section.subtitleKey, section.subtitleFallback)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-8">
                    {t(section.contentKey, section.contentFallback)}
                  </p>

                  {/* Details list */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {t(section.detailsKey, section.detailsFallback).split('\n').map((detail, i) => (
                      <div 
                        key={i}
                        className={`flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-500 ${
                          isActive ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                        }`}
                        style={{ transitionDelay: `${i * 100}ms` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-white/80">{detail.replace('• ', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next section hint */}
                {journeyIndex < journeySections.length - 1 && isActive && (
                  <button
                    onClick={() => scrollToSection(sectionIndex + 1)}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                  >
                    <span className="text-xs uppercase tracking-wider">Next: {journeySections[journeyIndex + 1]?.titleFallback}</span>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                  </button>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Additional Services Section */}
      <section 
        ref={(el) => (sectionsRef.current[sections.findIndex(s => s.type === "services")] = el)}
        className="min-h-screen flex items-center justify-center snap-start snap-always py-20"
      >
        <div className="container mx-auto px-4">
          <div 
            className={`bg-black/80 backdrop-blur-xl border border-primary/30 rounded-3xl p-8 md:p-12 max-w-6xl mx-auto transition-all duration-700 ${
              sections[activeSection]?.type === "services" 
                ? 'scale-100 opacity-100' 
                : 'scale-95 opacity-50'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bebas uppercase tracking-wider text-center text-white mb-4">
              {t('players.additional_services', 'Beyond The Pitch')}
            </h2>
            <p className="text-center text-white/60 mb-12 max-w-2xl mx-auto">
              {t('players.services_intro', 'Comprehensive support that extends beyond football to protect and grow your career')}
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  titleKey: 'players.stakeholder_management',
                  titleFallback: 'Stakeholder Management',
                  descKey: 'players.stakeholder_desc',
                  descFallback: 'Career management through contract negotiations, loans and transfers. Building relationships with clubs, managers, and decision-makers.'
                },
                {
                  icon: Briefcase,
                  titleKey: 'players.brand_image',
                  titleFallback: 'Brand & Image',
                  descKey: 'players.brand_desc',
                  descFallback: 'Development of your personal brand and management of public relations. Social media strategy and media training.'
                },
                {
                  icon: Star,
                  titleKey: 'players.commercial_interests',
                  titleFallback: 'Commercial Interests',
                  descKey: 'players.commercial_desc',
                  descFallback: 'Creating relationships with major brands and negotiating the best sponsorship opportunities. Building long-term commercial partnerships.'
                }
              ].map((service, index) => {
                const ServiceIcon = service.icon;
                return (
                  <div 
                    key={index}
                    className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300 hover:bg-white/10"
                  >
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 w-fit mb-4 group-hover:scale-110 transition-transform">
                      <ServiceIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bebas uppercase tracking-wider text-white mb-3">
                      {t(service.titleKey, service.titleFallback)}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {t(service.descKey, service.descFallback)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={(el) => (sectionsRef.current[sections.findIndex(s => s.type === "cta")] = el)}
        className="min-h-screen flex items-center justify-center snap-start snap-always py-20"
      >
        <div className="container mx-auto px-4 text-center">
          <div 
            className={`bg-black/80 backdrop-blur-xl border border-primary/30 rounded-3xl p-8 md:p-16 max-w-4xl mx-auto transition-all duration-700 ${
              sections[activeSection]?.type === "cta" 
                ? 'scale-100 opacity-100 shadow-[0_0_80px_-20px_hsl(var(--primary))]' 
                : 'scale-95 opacity-50'
            }`}
          >
            <div className="mb-8">
              <span className="text-primary font-bebas text-xl tracking-widest">THE JOURNEY STARTS HERE</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-white mb-6">
              {t('players.cta_title', 'Ready to Rise?')}
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('players.cta_desc', 'Join a select group of players who are committed to maximizing their potential. Let us guide your path to footballing excellence.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-8">
                <Link to="/contact">{t('players.get_started', 'Start Your Journey')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-bebas uppercase tracking-wider text-lg px-8 border-white/30 hover:bg-white/10">
                <Link to="/stars">{t('players.view_roster', 'View Our Players')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PlayersDraft;
