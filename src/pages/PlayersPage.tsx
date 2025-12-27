import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { IntroModal } from "@/components/IntroModal";
import { SEO } from "@/components/SEO";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { CapabilityAccordion } from "@/components/CapabilityAccordion";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslatedNews } from "@/hooks/useTranslateContent";
import { Activity, Brain, Zap, Crosshair, ChevronDown } from "lucide-react";
import { SCOUTING_POSITIONS, POSITION_SKILLS, ScoutingPosition } from "@/data/scoutingSkills";

const domainConfig = {
  Physical: { icon: Activity, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", solidBg: "bg-red-500" },
  Psychological: { icon: Brain, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20", solidBg: "bg-purple-500" },
  Technical: { icon: Zap, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", solidBg: "bg-blue-500" },
  Tactical: { icon: Crosshair, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20", solidBg: "bg-green-500" }
};

const positionInitials: Record<ScoutingPosition, string> = {
  "Goalkeeper": "GK", "Full-Back": "FB", "Centre-Back": "CB", "Central Defensive Midfielder": "CDM",
  "Central Midfielder": "CM", "Central Attacking Midfielder": "CAM", "Winger / Wide Forward": "W/WF", "Centre Forward / Striker": "CF/ST"
};

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  created_at: string;
}

const Index = () => {
  const { t } = useLanguage();
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [insideAccessArticles, setInsideAccessArticles] = useState<NewsArticle[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<ScoutingPosition>(SCOUTING_POSITIONS[0]);
  const [expandedDomain, setExpandedDomain] = useState<keyof typeof domainConfig | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  
  const { translatedArticles: translatedNews } = useTranslatedNews(newsArticles);
  const { translatedArticles: translatedInsideAccess } = useTranslatedNews(insideAccessArticles);

  const sectionIds = ['hero', 'inside-access', 'scouting', 'development', 'skills', 'cta', 'news', 'watch', 'broadcast'];

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, image_url, created_at')
        .eq('published', true)
        .eq('category', 'PLAYER NEWS')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setNewsArticles(data);
      }
    };

    const fetchInsideAccess = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, image_url, created_at')
        .eq('published', true)
        .eq('category', 'INSIDE:ACCESS')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setInsideAccessArticles(data);
      }
    };

    fetchNews();
    fetchInsideAccess();
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observers = sectionsRef.current.map((section, index) => {
      if (!section) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              setActiveSection(index);
            }
          });
        },
        { threshold: [0.5] }
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, [translatedInsideAccess.length]); // Re-run when content loads

  const scrollToSection = useCallback((index: number) => {
    if (isScrolling || !sectionsRef.current[index]) return;
    
    setIsScrolling(true);
    sectionsRef.current[index]?.scrollIntoView({ behavior: "smooth" });
    
    setTimeout(() => setIsScrolling(false), 800);
  }, [isScrolling]);

  const handleScrollHint = () => {
    if (activeSection < sectionIds.length - 1) {
      scrollToSection(activeSection + 1);
    }
  };

  return (
    <>
      <SEO 
        title={t("seo.home_title", "RISE Football Agency - Elite Player Representation")}
        description={t("seo.home_desc", "RISE Football Agency scouts elite talent across Europe. We guide Premier League players to success with expert representation.")}
        image="/og-preview-home.png"
        url="/"
      />
      <Header />
      <IntroModal open={showIntroModal} onOpenChange={setShowIntroModal} />
      
      {/* Progress indicator */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-2 pointer-events-auto">
        {sectionIds.map((id, index) => (
          <button
            key={id}
            onClick={() => scrollToSection(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-150 ${
              activeSection === index 
                ? 'bg-primary scale-125 shadow-[0_0_8px_hsl(var(--primary))]' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      <div 
        ref={containerRef}
        className="bg-background min-h-screen w-full max-w-full relative z-10 overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {/* Section 1: Hero */}
        <section 
          ref={(el) => (sectionsRef.current[0] = el)}
          className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden snap-start snap-always"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background/80"></div>
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider mb-0 animate-fade-in">
                <span className="text-foreground">{t("home.hero_title_1", "REALISE")} </span>
                <span className="text-primary">{t("home.hero_title_2", "POTENTIAL")}</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light tracking-wide italic !mt-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {t("home.hero_subtitle", "Elite Football Representation & Performance Optimisation")}
              </p>
              
              <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <CapabilityAccordion />
              </div>
            </div>
          </div>
          
          {/* Scroll hint */}
          <button 
            onClick={handleScrollHint}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="text-xs uppercase tracking-wider font-bebas">{t("home.scroll", "Scroll")}</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </section>

        {/* Section 2: INSIDE:ACCESS */}
        {translatedInsideAccess.length > 0 && (
          <section 
            ref={(el) => (sectionsRef.current[1] = el)}
            className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/80 backdrop-blur-sm snap-start snap-always"
          >
            <div className="container mx-auto max-w-7xl w-full">
              <div className="text-center mb-8 space-y-3">
                <div className="inline-block">
                  <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                    {t("home.exclusive", "Exclusive")}
                  </span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                  INSIDE<span className="text-primary">:ACCESS</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {translatedInsideAccess.map((article, index) => (
                  article.image_url && (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className={`group relative aspect-[4/5] overflow-hidden rounded-lg ${
                        index >= 2 ? 'hidden md:block' : ''
                      }`}
                    >
                      <img 
                        src={article.image_url} 
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                  )
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Scouting Network */}
        <section 
          ref={(el) => (sectionsRef.current[2] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/90 backdrop-blur-sm snap-start snap-always"
        >
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.eyes_across_europe", "Eyes Across All Of Europe")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.scouting", "SCOUTING")} <span className="text-primary">{t("home.network", "NETWORK")}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("home.scouting_desc", "If you're a professional or academy player in Europe, chances are we know about you")}
              </p>
            </div>
            <ScoutingNetworkMap hideGridToggle={true} />
            
            {/* Report Request CTA */}
            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
              <p className="text-muted-foreground mb-4">
                If you see your club represented, we may have a detailed report on your game — feel free to request to see it and learn more:
              </p>
              <a 
                href="/contact" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bebas text-lg uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reach Out
              </a>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">01</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_1_title", "Deep European Network")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_1_desc", "We have built an extensive scouting network across Europe, with eyes at every level of the professional game.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">02</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_2_title", "Future-Focused Scouting")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_2_desc", "Novel scouting based on qualities that level up through the game, not just what works now, but what scales with a player's career.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-border/50 bg-card/30">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-bebas text-primary/30">03</span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-foreground">
                      {t("home.scouting_point_3_title", "Complete Player Knowledge")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("home.scouting_point_3_desc", "For any professional or academy player, we intend to know not just who they are, but how they play, what makes them tick, and what qualities they have that level up.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Player Development */}
        <section 
          ref={(el) => (sectionsRef.current[3] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/85 backdrop-blur-sm relative overflow-hidden snap-start snap-always"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.player", "PLAYER")} <span className="text-primary">{t("home.development", "DEVELOPMENT")}</span>
              </h2>
            </div>

            {/* Big Impact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center group">
                <div className="text-6xl md:text-8xl font-bebas text-primary group-hover:scale-110 transition-transform duration-300">74</div>
                <div className="h-px w-16 bg-primary/50 mx-auto my-3" />
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("home.stat_professionals", "Professionals")}</p>
              </div>
              <div className="text-center group">
                <div className="text-6xl md:text-8xl font-bebas text-primary group-hover:scale-110 transition-transform duration-300">18</div>
                <div className="h-px w-16 bg-primary/50 mx-auto my-3" />
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("home.stat_big5", "Big 5 League Players")}</p>
              </div>
              <div className="text-center group">
                <div className="text-6xl md:text-8xl font-bebas text-primary group-hover:scale-110 transition-transform duration-300">10</div>
                <div className="h-px w-16 bg-primary/50 mx-auto my-3" />
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("home.stat_national", "National Team Players")}</p>
              </div>
              <div className="text-center group">
                <div className="text-6xl md:text-8xl font-bebas text-primary group-hover:scale-110 transition-transform duration-300">£100M+</div>
                <div className="h-px w-16 bg-primary/50 mx-auto my-3" />
                <p className="text-sm font-bebas uppercase tracking-widest text-foreground/70">{t("home.stat_transfer", "Transfer Fees Developed")}</p>
              </div>
            </div>
            
            {/* Big 5 Leagues */}
            <div className="text-center space-y-4">
              <p className="text-lg font-bebas uppercase tracking-widest text-muted-foreground">
                {t("home.trusted_clubs", "Trusted by clubs across Europe's Big 5 leagues")}
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs font-bebas uppercase tracking-wider text-foreground/50">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                  Premier League
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                  La Liga
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                  Bundesliga
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                  Serie A
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                  Ligue 1
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Skills That Level Up */}
        <section 
          ref={(el) => (sectionsRef.current[4] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/90 backdrop-blur-sm snap-start snap-always"
        >
          <div className="container mx-auto max-w-7xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-5xl md:text-7xl font-bebas uppercase tracking-wider text-foreground mb-6">
                  {t("home.skills_that", "SKILLS THAT")} <span className="text-primary">{t("home.level_up", "LEVEL UP")}</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  {t("home.skills_desc", "We develop for where you're going, not just where you are.")}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border-l-4 border-primary/30 bg-card/20">
                    <span className="text-3xl font-bebas text-primary">01</span>
                    <span className="text-foreground">{t("home.skill_1", "Qualities that scale with competition level")}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 border-l-4 border-primary/50 bg-card/20">
                    <span className="text-3xl font-bebas text-primary">02</span>
                    <span className="text-foreground">{t("home.skill_2", "Techniques that adapt as pace increases")}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 border-l-4 border-primary bg-card/20">
                    <span className="text-3xl font-bebas text-primary">03</span>
                    <span className="text-foreground">{t("home.skill_3", "Prepared for target destination demands")}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl md:text-9xl font-bebas text-primary/20">↑</div>
                    <p className="text-xl font-bebas uppercase tracking-widest text-foreground/60 mt-4">{t("home.trajectory", "TRAJECTORY")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: CTA */}
        <section 
          ref={(el) => (sectionsRef.current[5] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/85 backdrop-blur-sm relative overflow-hidden snap-start snap-always"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10"></div>
          <div className="container mx-auto max-w-6xl text-center space-y-8 relative z-10">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.rise_with_us", "RISE WITH US")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bebas uppercase tracking-wider text-foreground leading-tight">
                {t("home.take_the", "Take The")} <span className="text-primary">{t("home.first_step", "1st Step")}</span>
              </h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("home.cta_description", "Reach out to one of our representatives for a direct 1:1 conversation about yourself, or a player under your care.")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
              <WorkWithUsDialog>
                <Button 
                  size="lg" 
                  className="btn-shine text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform shadow-xl"
                >
                  <HoverText text={t("home.work_with_us", "Work With Us")} />
                </Button>
              </WorkWithUsDialog>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className="text-xl font-bebas uppercase tracking-wider px-12 py-7 hover:scale-105 transition-transform"
              >
                <a href="mailto:jolon.levene@risefootballagency.com?subject=Portfolio%20Request">
                  <HoverText text={t("home.request_portfolio", "Request Our Portfolio")} />
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {t("home.portfolio_description", "Learn more about our portfolio, including how we work and with whom we work.")}
            </p>
          </div>
        </section>

        {/* Section 7: News */}
        <section 
          ref={(el) => (sectionsRef.current[6] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/90 backdrop-blur-sm snap-start snap-always"
        >
          <div className="container mx-auto max-w-7xl w-full">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.latest_updates", "Latest Updates")}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.news", "News")}
              </h2>
              <Link to="/news">
                <Button 
                  variant="outline"
                  className="font-bebas uppercase tracking-wider border-primary/30 text-foreground hover:bg-primary/10"
                >
                  <HoverText text={t("home.all_news", "All News →")} />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {translatedNews.map((article) => (
                <Link
                  key={article.id}
                  to={`/news/${article.id}`}
                  className="group relative aspect-[16/10] overflow-hidden rounded-lg"
                >
                  {article.image_url && (
                    <>
                      <img 
                        src={article.image_url} 
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
                    </>
                  )}
                  
                  <div className="absolute top-4 left-4 flex items-center gap-2 text-white/80 text-xs font-bebas uppercase tracking-wider">
                    <span className="text-primary">▶</span>
                    <span>
                      {new Date(article.created_at).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })} {new Date(article.created_at).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl md:text-2xl font-bebas uppercase text-white leading-tight">
                      {article.title}
                    </h3>
                    
                    <div className="h-0 group-hover:h-12 overflow-hidden transition-all duration-300 ease-out">
                      <button className="mt-3 px-4 py-2 text-sm font-bebas uppercase tracking-wider text-white bg-white/10 backdrop-blur-sm border border-white/30 rounded hover:bg-white/20 transition-colors">
                        {t("home.read_article", "Read Article")}
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Watch Now */}
        <section 
          ref={(el) => (sectionsRef.current[7] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-background/95 backdrop-blur-sm snap-start snap-always"
        >
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block">
                <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                  {t("home.our_work", "OUR WORK")}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bebas uppercase tracking-wider text-foreground">
                {t("home.watch", "WATCH")} <span className="text-primary">{t("home.now", "NOW")}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube-nocookie.com/embed/pWH2cdmzwVg?rel=0"
                  title="RISE Football Video 1"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-lg hidden md:block">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube-nocookie.com/embed/XtmRhHvXeyo?rel=0"
                  title="RISE Football Video 2"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Broadcast */}
        <section 
          ref={(el) => (sectionsRef.current[8] = el)}
          className="min-h-screen flex items-center justify-center py-16 px-4 bg-muted/30 snap-start snap-always"
        >
          <div className="container mx-auto">
            <div className="max-w-5xl mx-auto p-8 rounded-lg border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
              <div className="text-center relative z-10 space-y-4">
                <div className="inline-block">
                  <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                    {t("home.stay_up_to_date", "STAY UP TO DATE")}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wider text-primary">
                  {t("home.join_broadcast", "Join RISE Broadcast on Instagram")}
                </h2>
                <p className="text-foreground mb-6 text-base md:text-lg leading-relaxed">
                  {t("home.broadcast_desc", "Get daily updates on agency insights, performance optimisation, coaching systems, and player development strategies")}
                </p>
                <a
                  href="https://www.instagram.com/channel/AbY33s3ZhuxaNwuo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bebas uppercase tracking-wider text-lg hover:bg-primary/90 hover:scale-105 transition-all rounded shadow-lg"
                >
                  <HoverText text={t("home.join_channel", "Join the Channel")} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Index;
