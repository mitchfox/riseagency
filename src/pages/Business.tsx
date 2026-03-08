import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Briefcase, Users, Target, TrendingUp, Handshake, Video, BarChart3, Globe, Megaphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverText } from "@/components/HoverText";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from "@/components/ScrollReveal";
import { PartnersSection } from "@/components/business/PartnersSection";
import { LocalizedLink } from "@/components/LocalizedLink";

// Core 8 packages for public display - aligned with Sales Deck
interface PackageCard {
  id: string;
  category: "core" | "premium" | "support";
  icon: React.ReactNode;
  title: string;
  description: string;
  services: string[];
  ctaLink: string;
}

const corePackagesConfig = [
  {
    id: "commercial-strategy",
    category: "core" as const,
    titleKey: "business.pkg_commercial_title",
    titleFallback: "Commercial Strategy",
    descKey: "business.pkg_commercial_desc",
    descFallback: "Business growth audits, campaign planning, and sponsorship strategy to position your brand in football",
    serviceKeys: ["business.pkg_commercial_s1", "business.pkg_commercial_s2", "business.pkg_commercial_s3", "business.pkg_commercial_s4"],
    serviceFallbacks: ["Business Growth Audit", "KPI Definition", "Sponsorship Strategy", "Market Analysis"],
    ctaLink: "/packages",
  },
  {
    id: "talent-access",
    category: "core" as const,
    titleKey: "business.pkg_talent_title",
    titleFallback: "Talent Access & Management",
    descKey: "business.pkg_talent_desc",
    descFallback: "Direct access to professional footballers for brand campaigns, ambassador deals, and authentic partnerships",
    serviceKeys: ["business.pkg_talent_s1", "business.pkg_talent_s2", "business.pkg_talent_s3", "business.pkg_talent_s4"],
    serviceFallbacks: ["Player Access", "Talent-Brand Matching", "Contract Negotiation", "Ambassador Deals"],
    ctaLink: "/packages",
  },
  {
    id: "campaign-activation",
    category: "core" as const,
    titleKey: "business.pkg_campaign_title",
    titleFallback: "Campaign Activation",
    descKey: "business.pkg_campaign_desc",
    descFallback: "End-to-end campaign development from concept to execution, including product launches and event activations",
    serviceKeys: ["business.pkg_campaign_s1", "business.pkg_campaign_s2", "business.pkg_campaign_s3", "business.pkg_campaign_s4"],
    serviceFallbacks: ["Concept Development", "Product Launches", "Tournament Campaigns", "Full Campaign Management"],
    ctaLink: "/packages",
  },
  {
    id: "content-creative",
    category: "core" as const,
    titleKey: "business.pkg_content_title",
    titleFallback: "Content & Creative",
    descKey: "business.pkg_content_desc",
    descFallback: "Football content strategy, video production, photography, and branded player content that resonates",
    serviceKeys: ["business.pkg_content_s1", "business.pkg_content_s2", "business.pkg_content_s3", "business.pkg_content_s4"],
    serviceFallbacks: ["Video Production", "Social Content", "Photography", "Branded Content"],
    ctaLink: "/packages",
  },
  {
    id: "paid-media",
    category: "premium" as const,
    titleKey: "business.pkg_paid_title",
    titleFallback: "Paid Media & Performance",
    descKey: "business.pkg_paid_desc",
    descFallback: "Managed social campaigns, funnel strategy, and performance optimisation for maximum ROI",
    serviceKeys: ["business.pkg_paid_s1", "business.pkg_paid_s2", "business.pkg_paid_s3", "business.pkg_paid_s4"],
    serviceFallbacks: ["Paid Social Management", "Ad Creative", "Retargeting", "Performance Optimisation"],
    ctaLink: "/packages",
  },
  {
    id: "club-connections",
    category: "premium" as const,
    titleKey: "business.pkg_club_title",
    titleFallback: "Club & Property Connections",
    descKey: "business.pkg_club_desc",
    descFallback: "Club sponsorship introductions, partnership strategy, and matchday access for authentic brand presence",
    serviceKeys: ["business.pkg_club_s1", "business.pkg_club_s2", "business.pkg_club_s3", "business.pkg_club_s4"],
    serviceFallbacks: ["Club Introductions", "Rights Assessment", "Matchday Access", "Club Content"],
    ctaLink: "/packages",
  },
  {
    id: "market-intelligence",
    category: "support" as const,
    titleKey: "business.pkg_market_title",
    titleFallback: "Market Intelligence",
    descKey: "business.pkg_market_desc",
    descFallback: "Campaign reporting, ROI analysis, and data-driven insights to optimise your football marketing",
    serviceKeys: ["business.pkg_market_s1", "business.pkg_market_s2", "business.pkg_market_s3", "business.pkg_market_s4"],
    serviceFallbacks: ["Performance Reporting", "ROI Analysis", "Audience Insights", "Optimisation"],
    ctaLink: "/packages",
  },
  {
    id: "ongoing-support",
    category: "support" as const,
    titleKey: "business.pkg_ongoing_title",
    titleFallback: "Ongoing Management",
    descKey: "business.pkg_ongoing_desc",
    descFallback: "Dedicated account management, monthly reviews, and strategic advisory to ensure partnership success",
    serviceKeys: ["business.pkg_ongoing_s1", "business.pkg_ongoing_s2", "business.pkg_ongoing_s3", "business.pkg_ongoing_s4"],
    serviceFallbacks: ["Account Management", "Monthly Reviews", "Strategy Refinement", "Consultancy"],
    ctaLink: "/packages",
  },
];

// Case study / showcase card data for carousel
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
    ctaTextKey: "business.build_package",
    ctaLink: "/packages",
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
    id: "campaign-activation",
    category: "collaboration",
    categoryLabelKey: "business.collaboration",
    titleKey: "business.campaign_activation",
    descriptionKey: "business.campaign_activation_desc",
    bgGradient: "from-blue-900/60 via-blue-800/30 to-black/90",
    ctaTextKey: "business.start_campaign",
    ctaLink: "/packages",
  },
  {
    id: "content-production",
    category: "service",
    categoryLabelKey: "business.service",
    titleKey: "business.content_production",
    descriptionKey: "business.content_production_desc",
    bgGradient: "from-amber-900/60 via-amber-800/30 to-black/90",
    ctaTextKey: "business.explore_content",
    ctaLink: "/packages",
  },
  {
    id: "market-intel",
    category: "service",
    categoryLabelKey: "business.service",
    titleKey: "business.market_intel",
    descriptionKey: "business.market_intel_desc",
    bgGradient: "from-emerald-900/60 via-emerald-800/30 to-black/90",
    ctaTextKey: "business.discover",
    ctaLink: "/packages",
  },
  {
    id: "club-partnerships",
    category: "case-study",
    categoryLabelKey: "business.case_study",
    titleKey: "business.club_partnerships",
    descriptionKey: "business.club_partnerships_desc",
    bgGradient: "from-rose-900/60 via-rose-800/30 to-black/90",
    ctaTextKey: "business.explore",
    ctaLink: "/packages",
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
    "player-brands": { category: "Featured", title: "Build Your Package", desc: "Create a bespoke football marketing package tailored to your brand objectives", cta: "Build Package" },
    "talent-access": { category: "Service", title: "Exclusive Talent Access", desc: "Direct access to professional footballers for authentic brand partnerships", cta: "View Roster" },
    "campaign-activation": { category: "Collaboration", title: "Campaign Activation", desc: "End-to-end campaign development and execution", cta: "Start Campaign" },
    "content-production": { category: "Service", title: "Content & Creative", desc: "Football content strategy, video production, and branded content", cta: "Explore Content" },
    "market-intel": { category: "Service", title: "Market Intelligence", desc: "Campaign reporting, ROI analysis, and data-driven insights", cta: "Discover" },
    "club-partnerships": { category: "Case Study", title: "Club Connections", desc: "Strategic club partnerships and matchday activations", cta: "Explore" },
  };

  // Build translated showcase cards with icons
  const showcaseCards = showcaseCardsConfig.map((card, index) => {
    const icons = [
      <Sparkles className="w-12 h-12" key="sparkles" />,
      <Users className="w-12 h-12" key="users" />,
      <Megaphone className="w-12 h-12" key="megaphone" />,
      <Video className="w-12 h-12" key="video" />,
      <BarChart3 className="w-12 h-12" key="barchart" />,
      <Handshake className="w-12 h-12" key="handshake" />,
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

  // Build package cards with icons
  const packageIcons = [
    <Target className="w-8 h-8" key="target" />,
    <Users className="w-8 h-8" key="users" />,
    <Megaphone className="w-8 h-8" key="megaphone" />,
    <Video className="w-8 h-8" key="video" />,
    <BarChart3 className="w-8 h-8" key="barchart" />,
    <Handshake className="w-8 h-8" key="handshake" />,
    <TrendingUp className="w-8 h-8" key="trending" />,
    <Briefcase className="w-8 h-8" key="briefcase" />,
  ];
  
  const corePackages = corePackagesConfig.map((pkg, index) => ({
    ...pkg,
    icon: packageIcons[index],
  }));

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
        title={t('business.seo_title', 'Business Solutions - Commercial Football Partnerships | RISE Agency')}
        description={t('business.seo_desc', 'Partner with RISE for strategic commercial partnerships, sponsorship opportunities, and business development in professional football.')}
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
              <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-2xl italic">
                {t('business.subtitle', 'Strategic commercial partnerships that connect brands with elite football talent.')}
              </p>
              
              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <LocalizedLink to="/packages">
                  <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-8" hoverEffect>
                    {t('business.build_package', 'Build Your Package')}
                  </Button>
                </LocalizedLink>
                <Button variant="outline" size="lg" className="font-bebas uppercase tracking-wider text-lg px-8 border-primary/30 text-primary hover:bg-primary/10" hoverEffect>
                  <a href="mailto:jolon.levene@risefootballagency.com?subject=Business%20Inquiry">
                    {t('business.drop_briefing', 'Drop Your Briefing')}
                  </a>
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
              <LocalizedLink
                key={card.id}
                to={card.ctaLink || "/packages"}
                className={cn(
                  "flex-shrink-0 snap-start rounded-2xl overflow-hidden relative group cursor-pointer transition-all duration-500 block",
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
                    
                    <span className="group/cta flex items-center gap-2 text-sm font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary transition-colors">
                      <span className="border-b border-white/40 group-hover:border-primary pb-0.5">
                        <HoverText text={card.ctaText} />
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </LocalizedLink>
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

        {/* How We Collaborate Section - Streamlined */}
        <section className="py-12 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-4">
                {t('business.how_we_collaborate', 'How We Collaborate')}
              </h2>
              <p className="text-lg text-muted-foreground italic">
                {t('business.collaborate_desc', 'From initial briefing to campaign execution - a seamless three-step journey.')}
              </p>
            </div>
            
            {/* Connected pathway design */}
            <div className="relative max-w-5xl mx-auto">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />
              
              <div className="grid md:grid-cols-3 gap-6 md:gap-0">
                {[
                  {
                    step: "01",
                    titleKey: "business.discovery",
                    titleFallback: "Discovery",
                    descKey: "business.discovery_desc",
                    descFallback: "We learn your brand, goals, and vision to find the perfect talent match."
                  },
                  {
                    step: "02",
                    titleKey: "business.strategy",
                    titleFallback: "Strategy",
                    descKey: "business.strategy_desc",
                    descFallback: "We craft a bespoke partnership framework with clear deliverables and metrics."
                  },
                  {
                    step: "03",
                    titleKey: "business.execution",
                    titleFallback: "Execution",
                    descKey: "business.execution_desc",
                    descFallback: "We manage every detail from contracts to content to final delivery."
                  }
                ].map((item, index) => (
                  <div 
                    key={index} 
                    className="relative flex flex-col items-center text-center px-6"
                  >
                    {/* Step circle */}
                    <div className="relative z-10 w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center mb-4">
                      <span className="text-2xl font-bebas text-primary">{item.step}</span>
                    </div>
                    
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground mb-2">
                      {t(item.titleKey, item.titleFallback)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(item.descKey, item.descFallback)}
                    </p>
                    
                    {/* Arrow for mobile */}
                    {index < 2 && (
                      <div className="md:hidden my-4 text-primary">
                        <ChevronRight className="w-6 h-6 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Single CTA */}
            <div className="text-center mt-10">
              <LocalizedLink to="/packages">
                <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-8" hoverEffect>
                  {t('business.start_journey', 'Start Your Journey')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </LocalizedLink>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <PartnersSection />

        {/* CTA Section */}
        <section className="py-10 md:py-16 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider mb-6">
                {t('business.lets_build', "Let's Build Together")}
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto italic">
                {t('business.cta_desc', 'Ready to explore commercial opportunities with RISE? Get in touch with our business development team.')}
              </p>
              <Button size="lg" className="btn-shine font-bebas uppercase tracking-wider text-lg px-10" hoverEffect>
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Business%20Inquiry">
                  {t('business.contact_team', 'Contact Business Team')}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Business;
