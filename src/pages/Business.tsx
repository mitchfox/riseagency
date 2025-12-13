import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Briefcase, Users, Target, TrendingUp, Handshake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HoverText } from "@/components/HoverText";
import { cn } from "@/lib/utils";

// Case study / showcase card data
interface ShowcaseCard {
  id: string;
  category: "featured" | "case-study" | "collaboration" | "service";
  categoryLabel: string;
  title: string;
  description?: string;
  bgGradient: string;
  bgImage?: string;
  icon?: React.ReactNode;
  ctaText: string;
  ctaLink?: string;
}

const showcaseCards: ShowcaseCard[] = [
  {
    id: "player-brands",
    category: "featured",
    categoryLabel: "Featured",
    title: "Player Brand Building",
    description: "Authentic personal branding for athletes",
    bgGradient: "from-primary/40 via-primary/20 to-black/90",
    icon: <Sparkles className="w-12 h-12" />,
    ctaText: "Explore Services",
  },
  {
    id: "sponsorship",
    category: "case-study",
    categoryLabel: "Case Study",
    title: "Strategic Sponsorship Deals",
    description: "Connecting brands with rising talent",
    bgGradient: "from-amber-900/60 via-amber-800/30 to-black/90",
    icon: <Handshake className="w-12 h-12" />,
    ctaText: "View Case",
  },
  {
    id: "commercial",
    category: "collaboration",
    categoryLabel: "Collaboration",
    title: "Commercial Partnerships",
    description: "End-to-end campaign management",
    bgGradient: "from-blue-900/60 via-blue-800/30 to-black/90",
    icon: <Briefcase className="w-12 h-12" />,
    ctaText: "Learn More",
  },
  {
    id: "talent-access",
    category: "service",
    categoryLabel: "Service",
    title: "Exclusive Talent Access",
    description: "Connect with our roster of professionals",
    bgGradient: "from-purple-900/60 via-purple-800/30 to-black/90",
    icon: <Users className="w-12 h-12" />,
    ctaText: "View Roster",
    ctaLink: "/stars",
  },
  {
    id: "market-intel",
    category: "service",
    categoryLabel: "Service",
    title: "Market Intelligence",
    description: "Data-driven insights and analytics",
    bgGradient: "from-emerald-900/60 via-emerald-800/30 to-black/90",
    icon: <Target className="w-12 h-12" />,
    ctaText: "Discover",
  },
  {
    id: "investment",
    category: "case-study",
    categoryLabel: "Case Study",
    title: "Player Investment",
    description: "Strategic football investment opportunities",
    bgGradient: "from-rose-900/60 via-rose-800/30 to-black/90",
    icon: <TrendingUp className="w-12 h-12" />,
    ctaText: "Explore",
  },
];

// Stats data
const stats = [
  { value: "50+", label: "Active Players" },
  { value: "12", label: "Countries" },
  { value: "5M+", label: "Combined Reach" },
  { value: "100%", label: "Commitment" },
];

const Business = () => {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    <div className="min-h-screen bg-background" key="business-page">
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
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(90deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 80px),
                               repeating-linear-gradient(0deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 80px)`
            }} />
          </div>
          
          <div className="container mx-auto px-4">
            <div className="max-w-5xl">
              {/* Large outlined text */}
              <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-transparent" 
                  style={{ WebkitTextStroke: "1px hsl(var(--foreground) / 0.15)" }}>
                READY?
              </h1>
              <div className="flex items-baseline gap-4 md:gap-8">
                <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-transparent" 
                    style={{ WebkitTextStroke: "1px hsl(var(--foreground) / 0.15)" }}>
                  SET.
                </h1>
                <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-bebas uppercase leading-[0.85] tracking-tight text-foreground">
                  GO.
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
            onScroll={checkScrollPosition}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Left spacer for container alignment */}
            <div className="flex-shrink-0 w-[calc((100vw-1280px)/2)]" />
            
            {showcaseCards.map((card, index) => (
              <div
                key={card.id}
                className={cn(
                  "flex-shrink-0 snap-start rounded-2xl overflow-hidden relative group cursor-pointer transition-transform duration-500 hover:scale-[1.02]",
                  index === 0 ? "w-[340px] md:w-[420px] h-[480px] md:h-[520px]" : "w-[280px] md:w-[340px] h-[480px] md:h-[520px]"
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
        <section className="py-16 md:py-24 border-t border-border/30">
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
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider mb-6">
                {t('business.how_we_collaborate', 'How We Collaborate')}
              </h2>
              <p className="text-lg text-muted-foreground">
                From initial briefing to campaign execution, we partner with brands to create authentic football-driven marketing campaigns.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Discovery",
                  description: "We learn about your brand, objectives, and target audience to identify the perfect talent match."
                },
                {
                  step: "02",
                  title: "Strategy",
                  description: "Our team develops a bespoke partnership strategy that aligns with your marketing goals."
                },
                {
                  step: "03",
                  title: "Execution",
                  description: "From contract negotiation to campaign delivery, we manage every detail for seamless execution."
                }
              ].map((item, index) => (
                <div key={index} className="relative p-8 bg-card/50 border border-border/50 rounded-xl group hover:border-primary/50 transition-colors duration-500">
                  <div className="text-6xl font-bebas text-primary/20 absolute top-4 right-4">{item.step}</div>
                  <h3 className="text-2xl font-bebas uppercase tracking-wider text-foreground mb-4">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
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
