import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Briefcase, Users, Target, TrendingUp, Handshake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverText } from "@/components/HoverText";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";

// Case study / showcase card data
interface ShowcaseCard {
  id: string;
  category: "featured" | "case-study" | "collaboration" | "service";
  categoryLabelKey: string;
  titleKey: string;
  descriptionKey?: string;
  bgGradient: string;
  bgImage?: string;
  icon?: React.ReactNode;
  ctaTextKey: string;
  ctaLink?: string;
}

const showcaseCardsConfig: Omit<ShowcaseCard, 'icon'>[] = [
  {
    id: "player-brands",
    category: "featured",
    categoryLabelKey: "business.featured",
    titleKey: "business.player_brand",
    descriptionKey: "business.player_brand_desc",
    bgGradient: "from-primary/40 via-primary/20 to-black/90",
    ctaTextKey: "business.explore_services",
  },
  {
    id: "sponsorship",
    category: "case-study",
    categoryLabelKey: "business.case_study",
    titleKey: "business.sponsorship",
    descriptionKey: "business.sponsorship_desc",
    bgGradient: "from-amber-900/60 via-amber-800/30 to-black/90",
    ctaTextKey: "business.view_case",
  },
  {
    id: "commercial",
    category: "collaboration",
    categoryLabelKey: "business.collaboration",
    titleKey: "business.partnerships",
    descriptionKey: "business.partnerships_desc",
    bgGradient: "from-blue-900/60 via-blue-800/30 to-black/90",
    ctaTextKey: "business.learn_more",
  },
  {
    id: "talent-access",
    category: "service",
    categoryLabelKey: "business.service",
    titleKey: "business.talent_access",
    descriptionKey: "business.talent_access_desc",
    bgGradient: "from-purple-900/60 via-purple-800/30 to-black/90",
    ctaTextKey: "business.view_roster",
    ctaLink: "/stars",
  },
  {
    id: "market-intel",
    category: "service",
    categoryLabelKey: "business.service",
    titleKey: "business.market_intel",
    descriptionKey: "business.market_intel_desc",
    bgGradient: "from-emerald-900/60 via-emerald-800/30 to-black/90",
    ctaTextKey: "business.discover",
  },
  {
    id: "investment",
    category: "case-study",
    categoryLabelKey: "business.case_study",
    titleKey: "business.player_investment",
    descriptionKey: "business.player_investment_desc",
    bgGradient: "from-rose-900/60 via-rose-800/30 to-black/90",
    ctaTextKey: "business.explore",
  },
];

// Stats data keys
const statsConfig = [
  { value: "50+", labelKey: "business.active_players" },
  { value: "12", labelKey: "business.countries" },
  { value: "5M+", labelKey: "business.combined_reach" },
  { value: "100%", labelKey: "business.commitment" },
];

const Business = () => {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [playerImages, setPlayerImages] = useState<string[]>([]);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch player images for hero background
  useEffect(() => {
    const fetchPlayerImages = async () => {
      const { data } = await supabase
        .from('players')
        .select('image_url')
        .not('image_url', 'is', null)
        .limit(5);
      if (data) {
        setPlayerImages(data.map(p => p.image_url).filter(Boolean) as string[]);
      }
    };
    fetchPlayerImages();
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    const startAutoSlide = () => {
      autoSlideRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
          const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10;
          
          if (isAtEnd) {
            // Reset to start
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            setActiveCardIndex(0);
          } else {
            // Scroll to next card
            const cardWidth = 360; // approximate card width + gap
            scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
            setActiveCardIndex(prev => Math.min(prev + 1, showcaseCardsConfig.length - 1));
          }
          setTimeout(checkScrollPosition, 300);
        }
      }, 4000);
    };

    startAutoSlide();

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, []);

  // Pause auto-slide on hover
  const handleMouseEnter = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
  };

  const handleMouseLeave = () => {
    autoSlideRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10;
        
        if (isAtEnd) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          setActiveCardIndex(0);
        } else {
          const cardWidth = 360;
          scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
          setActiveCardIndex(prev => Math.min(prev + 1, showcaseCardsConfig.length - 1));
        }
        setTimeout(checkScrollPosition, 300);
      }
    }, 4000);
  };

  // Fallback content for cards
  const cardFallbacks: Record<string, { category: string; title: string; desc: string; cta: string }> = {
    "player-brands": { category: "Featured", title: "Athlete Influence Packages", desc: "Leverage our roster's reach to amplify your brand through authentic athlete partnerships and campaigns", cta: "Explore Services" },
    "sponsorship": { category: "Case Study", title: "Strategic Sponsorship Deals", desc: "Connecting brands with rising talent", cta: "View Case" },
    "commercial": { category: "Collaboration", title: "Commercial Partnerships", desc: "End-to-end campaign management", cta: "Learn More" },
    "talent-access": { category: "Service", title: "Exclusive Talent Access", desc: "Connect with our roster of professionals", cta: "View Roster" },
    "market-intel": { category: "Service", title: "Market Intelligence", desc: "Data-driven insights and analytics", cta: "Discover" },
    "investment": { category: "Case Study", title: "Player Investment", desc: "Strategic football investment opportunities", cta: "Explore" },
  };

  // Build translated showcase cards with icons
  const showcaseCards = showcaseCardsConfig.map((card, index) => {
    const icons = [
      <Sparkles className="w-12 h-12" key="sparkles" />,
      <Handshake className="w-12 h-12" key="handshake" />,
      <Briefcase className="w-12 h-12" key="briefcase" />,
      <Users className="w-12 h-12" key="users" />,
      <Target className="w-12 h-12" key="target" />,
      <TrendingUp className="w-12 h-12" key="trending" />,
    ];
    const fallback = cardFallbacks[card.id];
    return {
      ...card,
      categoryLabel: t(card.categoryLabelKey, fallback.category),
      title: t(card.titleKey, fallback.title),
      description: card.descriptionKey ? t(card.descriptionKey, fallback.desc) : undefined,
      ctaText: t(card.ctaTextKey, fallback.cta),
      icon: icons[index],
    };
  });

  // Build translated stats
  const statsFallbacks = ["Active Players", "Countries", "Combined Reach", "Commitment"];
  const stats = statsConfig.map((stat, index) => ({
    value: stat.value,
    label: t(stat.labelKey, statsFallbacks[index]),
  }));

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const getCategoryStyles = (category: ShowcaseCard["category"]) => {
    switch (category) {
      case "featured":
        return "bg-primary text-primary-foreground";
      case "case-study":
        return "bg-white/10 text-white border border-white/30";
      case "collaboration":
        return "bg-blue-500/20 text-blue-300 border border-blue-400/30";
      case "service":
        return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
      default:
        return "bg-white/10 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" key="business-page">
      <SEO 
        title="Business Solutions - Commercial Football Partnerships | RISE Agency"
        description="Partner with RISE for strategic commercial partnerships, sponsorship opportunities, and business development in professional football."
        image="/og-preview-business.png"
        url="/business"
      />
      <Header />
      
      <main className="pt-24 md:pt-20">
        {/* Hero Section - Minimal with large typography */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Faded player images background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex">
              {playerImages.slice(0, 3).map((img, index) => (
                <div 
                  key={index}
                  className="flex-1 relative opacity-[0.08]"
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    filter: 'grayscale(100%)',
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
          </div>
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(90deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 80px),
                               repeating-linear-gradient(0deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 80px)`
            }} />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl">
              {/* Large outlined text */}
              <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-foreground/90" 
                  style={{ WebkitTextStroke: "2px hsl(var(--foreground))" }}>
                {t('business.ready', 'READY?')}
              </h1>
              <div className="flex items-baseline gap-4 md:gap-8">
                <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-foreground/90" 
                    style={{ WebkitTextStroke: "2px hsl(var(--foreground))" }}>
                  {t('business.set', 'SET.')}
                </h1>
                <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-primary">
                  {t('business.go', 'GO.')}
                </h1>
              </div>
              
              {/* Subtitle */}
              <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-2xl">
                {t('business.subtitle', 'Strategic commercial partnerships that connect brands with elite football talent.')}
              </p>
              
              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-8" hoverEffect>
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Business%20Inquiry">
                    {t('business.start_collaboration', 'Start Collaboration')}
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="font-bebas uppercase tracking-wider text-lg px-8 border-primary/30 text-primary hover:bg-primary/10" hoverEffect>
                  {t('business.drop_briefing', 'Drop Your Briefing')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase Cards - Horizontal Scroll */}
        <section className="py-8 md:py-12 relative">
          {/* Navigation Arrows */}
          <div className="container mx-auto px-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-foreground">
                {t('business.our_work', 'Our Work & Services')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  className={cn(
                    "p-2 rounded-full border transition-all duration-300",
                    canScrollLeft 
                      ? "border-primary/50 text-primary hover:bg-primary/10" 
                      : "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  className={cn(
                    "p-2 rounded-full border transition-all duration-300",
                    canScrollRight 
                      ? "border-primary/50 text-primary hover:bg-primary/10" 
                      : "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Cards Container */}
          <div 
            ref={scrollContainerRef}
            onScroll={() => {
              checkScrollPosition();
              // Update active card based on scroll position
              if (scrollContainerRef.current) {
                const cardWidth = 360;
                const newIndex = Math.round(scrollContainerRef.current.scrollLeft / cardWidth);
                setActiveCardIndex(Math.min(newIndex, showcaseCardsConfig.length - 1));
              }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Left spacer for container alignment */}
            <div className="flex-shrink-0 w-[calc((100vw-1280px)/2)]" />
            
            {showcaseCards.map((card, index) => (
              <div
                key={card.id}
                className={cn(
                  "flex-shrink-0 snap-start rounded-2xl overflow-hidden relative group cursor-pointer transition-all duration-500",
                  index === activeCardIndex 
                    ? "w-[340px] md:w-[420px] h-[480px] md:h-[520px] scale-100 opacity-100" 
                    : "w-[280px] md:w-[340px] h-[480px] md:h-[520px] scale-95 opacity-70 hover:opacity-90"
                )}
              >
                {/* Background gradient */}
                <div className={cn("absolute inset-0 bg-gradient-to-b", card.bgGradient)} />
                
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                  }} />
                </div>
                
                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-6 md:p-8">
                  {/* Top - Category Tag */}
                  <div>
                    <span className={cn(
                      "inline-block px-4 py-1.5 rounded-full text-xs font-bebas uppercase tracking-wider",
                      getCategoryStyles(card.category)
                    )}>
                      {card.categoryLabel}
                    </span>
                  </div>
                  
                  {/* Middle - Icon */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-white/80 group-hover:text-primary transition-colors duration-500 group-hover:scale-110 transform">
                      {card.icon}
                    </div>
                  </div>
                  
                  {/* Bottom - Title & CTA */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bebas uppercase tracking-wide text-white leading-tight">
                        {card.title}
                      </h3>
                      {card.description && (
                        <p className="mt-2 text-sm text-white/60">{card.description}</p>
                      )}
                    </div>
                    
                    <button className="group/cta flex items-center gap-2 text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors">
                      <span className="border-b border-white/40 group-hover/cta:border-primary pb-0.5">
                        <HoverText text={card.ctaText} />
                      </span>
                    </button>
                  </div>
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            ))}
            
            {/* Right spacer */}
            <div className="flex-shrink-0 w-8" />
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-8 md:py-12 border-t border-border/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl md:text-7xl font-bebas text-primary mb-2">{stat.value}</div>
                  <div className="text-sm md:text-base text-muted-foreground uppercase tracking-wider font-bebas">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How We Collaborate Section */}
        <section className="py-8 md:py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
                {t('business.how_we_collaborate', 'How We Collaborate')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('business.collaborate_desc', 'From initial briefing to campaign execution, we partner with brands to create authentic football-driven marketing campaigns.')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  titleKey: "business.discovery",
                  titleFallback: "Discovery",
                  descKey: "business.discovery_desc",
                  descFallback: "Every successful partnership begins with understanding. We take time to learn about your brand identity, marketing objectives, target demographics, and campaign vision. This discovery phase allows us to identify the ideal talent match from our roster, ensuring authentic alignment between your brand values and the athlete's persona."
                },
                {
                  step: "02",
                  titleKey: "business.strategy",
                  titleFallback: "Strategy",
                  descKey: "business.strategy_desc",
                  descFallback: "With insights from discovery, our team crafts a bespoke partnership strategy tailored to your goals. We define deliverables, content formats, activation timelines, and success metrics. Whether it's social media integration, event appearances, or long-term ambassadorship, we design a framework that maximizes impact and ROI."
                },
                {
                  step: "03",
                  titleKey: "business.execution",
                  titleFallback: "Execution",
                  descKey: "business.execution_desc",
                  descFallback: "From contract negotiation to final campaign delivery, we manage every detail with precision. Our team coordinates schedules, oversees content production, ensures brand compliance, and handles logistics. We provide regular progress updates and post-campaign analytics, delivering a seamless experience from start to finish."
                }
              ].map((item, index) => (
                <div key={index} className="relative p-8 bg-card/50 border border-border/50 rounded-xl group hover:border-primary/50 transition-colors duration-500">
                  <div className="text-6xl font-bebas text-primary/20 absolute top-4 right-4">{item.step}</div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground mb-4">{t(item.titleKey, item.titleFallback)}</h3>
                  <p className="text-muted-foreground">{t(item.descKey, item.descFallback)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 md:py-16 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6">
                {t('business.lets_build', "Let's Build Together")}
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                {t('business.cta_desc', 'Ready to explore commercial opportunities with RISE? Get in touch with our business development team.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-10" hoverEffect>
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Business%20Inquiry">
                    {t('business.contact_team', 'Contact Business Team')}
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="font-bebas uppercase tracking-wider text-lg px-10 border-primary/40" hoverEffect>
                  {t('business.view_stars', 'View Our Stars')}
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

export default Business;
