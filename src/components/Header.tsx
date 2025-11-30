import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import riseStar from "@/assets/rise-star.png";
import { X, MessageCircle, Users, LogIn, Handshake } from "lucide-react";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import realisePotentialSessions from "@/assets/realise-potential-sessions.png";
import realisePotentialPaos from "@/assets/realise-potential-paos.png";
import realisePotentialReport from "@/assets/realise-potential-report.png";
import realisePotentialAnalysis from "@/assets/realise-potential-analysis.png";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { DeclareInterestDialog } from "@/components/DeclareInterestDialog";
import { IntroModal } from "@/components/IntroModal";
import { HoverText } from "@/components/HoverText";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { getEnglishPath, getAllPathVariants } from "@/lib/localizedRoutes";

// NOTE: GridLines component is available at src/components/GridLines.tsx 
// for coordinate-based positioning during design. Import and add it when needed.

export const Header = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const [representationOpen, setRepresentationOpen] = useState(false);
  const [workWithUsOpen, setWorkWithUsOpen] = useState(false);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [introModalOpen, setIntroModalOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [starsHovered, setStarsHovered] = useState(false);
  const [starPlayers, setStarPlayers] = useState<any[]>([]);
  const [starIndex, setStarIndex] = useState(0);
  const [betweenLinesHovered, setBetweenLinesHovered] = useState(false);
  const [betweenLinesPosts, setBetweenLinesPosts] = useState<any[]>([]);
  const [btlIndex, setBtlIndex] = useState(0);
  const [realisePotentialHovered, setRealisePotentialHovered] = useState(false);
  const [rpIndex, setRpIndex] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [newsHovered, setNewsHovered] = useState(false);
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const realisePotentialImages = [realisePotentialSessions, realisePotentialPaos, realisePotentialReport, realisePotentialAnalysis];
  
  useEffect(() => {
    setShowTopBar(location.pathname === '/');
  }, [location.pathname]);
  
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewport("mobile");
      } else if (width < 1024) {
        setViewport("tablet");
      } else {
        setViewport("desktop");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
  
  useEffect(() => {
    const fetchStarPlayers = async () => {
      const {
        data,
        error
      } = await supabase.from('players').select('*').eq('visible_on_stars_page', true).limit(3);
      if (data && !error && data.length > 0) {
        setStarPlayers(data);
      }
    };
    const fetchBetweenLinesPosts = async () => {
      const {
        data,
        error
      } = await supabase.from('blog_posts').select('*').eq('published', true).neq('category', 'PLAYER NEWS').order('created_at', {
        ascending: false
      }).limit(3);
      if (data && !error && data.length > 0) {
        setBetweenLinesPosts(data);
      }
    };
    const fetchNewsArticles = async () => {
      const {
        data,
        error
      } = await supabase.from('blog_posts').select('*').eq('published', true).eq('category', 'PLAYER NEWS').order('created_at', {
        ascending: false
      }).limit(3);
      if (data && !error && data.length > 0) {
        setNewsArticles(data);
      }
    };
    fetchStarPlayers();
    fetchBetweenLinesPosts();
    fetchNewsArticles();
  }, []);
  useEffect(() => {
    if (starPlayers.length > 0) {
      const starInterval = setInterval(() => {
        setStarIndex(prev => (prev + 1) % starPlayers.length);
      }, 6000);
      return () => clearInterval(starInterval);
    }
  }, [starPlayers.length]);
  useEffect(() => {
    if (betweenLinesPosts.length > 0) {
      const btlInterval = setInterval(() => {
        setBtlIndex(prev => (prev + 1) % betweenLinesPosts.length);
      }, 6000);
      return () => clearInterval(btlInterval);
    }
  }, [betweenLinesPosts.length]);
  useEffect(() => {
    const rpInterval = setInterval(() => {
      setRpIndex(prev => (prev + 1) % realisePotentialImages.length);
    }, 6000);
    return () => clearInterval(rpInterval);
  }, [realisePotentialImages.length]);
  useEffect(() => {
    if (newsArticles.length > 0) {
      const newsInterval = setInterval(() => {
        setNewsIndex(prev => (prev + 1) % newsArticles.length);
      }, 6000);
      return () => clearInterval(newsInterval);
    }
  }, [newsArticles.length]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname === '/') {
        setIsScrolled(window.scrollY > 50);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Check if a path is active (works with localized routes)
  const isActive = (englishPath: string) => {
    const currentPath = location.pathname;
    const variants = getAllPathVariants(englishPath);
    return variants.some(v => currentPath === v || currentPath.startsWith(v + '/'));
  };

  const getLeftIconOffset = () => {
    if (!isScrolled) return "3rem";

    if (viewport === "desktop") return "7.75rem"; // desktop: +4px more to the right
    if (viewport === "tablet") return "4.75rem"; // iPad: perfect

    return "3.5rem"; // mobile: great
  };

  const getRightIconOffset = () => {
    if (!isScrolled) return "2.5rem";

    if (viewport === "desktop") return "clamp(7rem, 15vw, 11.5rem)"; // desktop: perfect
    if (viewport === "tablet") return "9rem"; // iPad: perfect

    return "3.5rem"; // mobile: a bit more to the left
  };

  return <>
      {/* Top Utility Bar - only on homepage and only when not scrolled */}
      {showTopBar && !isScrolled && <div className="fixed top-14 md:top-16 left-0 right-0 z-50 bg-background/95 backdrop-blur-md transition-all duration-500 border-b-2 border-primary">
          <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center justify-between h-8 md:h-10">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 transition-all duration-500">
              <LocalizedLink to="/contact" className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <HoverText text={t("header.contact_us", "Contact Us")} />
              </LocalizedLink>
              <div className="w-px h-4 bg-white/20" />
              <button onClick={() => setDeclareInterestOpen(true)} className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <Users className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <HoverText text={t("header.declare_interest", "Declare Interest In A Star")} />
              </button>
            </div>
            {/* Language Selector - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <LanguageSelector />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 transition-all duration-500">
              <button onClick={() => setRepresentationOpen(true)} className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <Handshake className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <HoverText text={t("header.request_representation", "Request Representation")} />
              </button>
              <div className="w-px h-4 bg-white/20" />
              <LocalizedLink to="/login" className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <LogIn className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <HoverText text={t("header.portal", "Portal")} />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </div>}

      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md w-full transition-all duration-500 ease-out ${showTopBar && isScrolled ? 'border-b-2 border-primary' : 'border-b border-white/10'}`}>
        <div className="container mx-auto px-2 md:px-4">
        <div className={`flex items-center justify-between transition-all duration-500 ease-out ${isScrolled ? 'h-12 md:h-14' : 'h-14 md:h-16'}`}>
          {/* Drawer Menu - Left */}
          <Drawer direction="top" preventScrollRestoration={false}>
            <DrawerTrigger asChild>
              <button className="group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12 md:w-14 md:h-14" aria-label="Toggle menu">
                <svg className="text-primary group-hover:text-foreground transition-all duration-300 ease-out w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="8" x2="20" y2="8" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg]" />
                  <line x1="2" y1="16" x2="18" y2="16" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg] group-hover:translate-x-1" />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent className="fixed inset-0 h-screen w-full !mt-0 rounded-none bg-black animate-slide-down-fade-in transition-all duration-300 ease-out z-[200] overflow-hidden">
              
              {/* Full screen grid layout with left grid-aligned menu and right content */}
              <div className="grid lg:grid-cols-2 h-full w-full overflow-hidden">
                {/* Left side - coordinate-based layout */}
                <div
                  className="relative h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Constraint container for menu area: 0 to 1500 on x, 0 to 670 on y */}
                  <div className="absolute inset-0" style={{ maxWidth: "1500px", maxHeight: "670px", overflow: "hidden" }}>
                    
                    {/* Scalable wrapper to maintain proportions at all zoom levels */}
                    <div 
                      className="absolute origin-top-left"
                      style={{ 
                        transform: 'scale(var(--menu-scale, 1))',
                        '--menu-scale': 'clamp(0.5, calc(100vw / 1920), 2)' 
                      } as React.CSSProperties}
                    >
                      {/* Decorative vertical rectangle - "Our Work" spanning from Stars to News */}
                      <div 
                        className="absolute w-8 border-2 border-primary bg-primary/10 flex items-center justify-center"
                        style={{ left: "50px", top: "98px", height: "210px", borderRadius: "24px" }}
                      >
                      <span className="text-white/80 font-bebas text-sm italic tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {t("header.our_work", "OUR WORK")}
                      </span>
                    </div>

                    {/* Decorative vertical rectangle - "Learn More" spanning from Players to Scouts */}
                    <div 
                      className="absolute w-8 border-2 border-primary bg-primary/10 flex items-center justify-center"
                      style={{ left: "50px", top: "310px", height: "210px", borderRadius: "24px" }}
                    >
                      <span className="text-white/80 font-bebas text-sm italic tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {t("header.learn_more", "LEARN MORE")}
                      </span>
                    </div>
                    {/* Close button at 100, 50 (move by +5, -20) */}
                    <DrawerClose asChild>
                    <button
                      className="absolute z-50 group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12 pointer-events-none [&>svg]:animate-color-to-gold"
                      aria-label="Close menu"
                      style={{ left: "85px", top: "5px", pointerEvents: "none" }}
                      onAnimationEnd={(e) => {
                        if (e.animationName.includes("color-to-gold")) {
                          (e.currentTarget as HTMLButtonElement).style.pointerEvents = "auto";
                          e.currentTarget.classList.remove("pointer-events-none");
                        }
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="h-8 w-8 text-white"
                      >
                        <line
                          x1="4"
                          y1="8"
                          x2="20"
                          y2="16"
                          className="origin-center animate-menu-open-line-1"
                        />
                        <line
                          x1="2"
                          y1="16"
                          x2="18"
                          y2="8"
                          className="origin-center animate-menu-open-line-2"
                        />
                      </svg>
                    </button>
                  </DrawerClose>

                  {/* Navigation starting at 100, 50 with bottom of last item at 500px */}
                  <nav className="absolute" style={{ left: "100px", top: "50px" }}>
                    <DrawerClose asChild>
                      <Link
                        to="/"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.home", "HOME")} />
                      </Link>
                    </DrawerClose>
                    <div className="h-px bg-primary my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/stars"
                        onMouseEnter={() => setStarsHovered(true)}
                        onMouseLeave={() => setStarsHovered(false)}
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/stars") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.stars", "STARS")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/performance"
                        onMouseEnter={() => setRealisePotentialHovered(true)}
                        onMouseLeave={() => setRealisePotentialHovered(false)}
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/performance") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.realise_potential", "REALISE POTENTIAL")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/between-the-lines"
                        onMouseEnter={() => setBetweenLinesHovered(true)}
                        onMouseLeave={() => setBetweenLinesHovered(false)}
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/between-the-lines") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.between_the_lines", "BETWEEN THE LINES")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/news"
                        onMouseEnter={() => setNewsHovered(true)}
                        onMouseLeave={() => setNewsHovered(false)}
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/news") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.news", "NEWS")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-primary my-1" />

                    <DrawerClose asChild>
                      <Link
                        to="/players"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/players") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.players", "PLAYERS")} />
                      </Link>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/clubs"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/clubs") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.clubs", "CLUBS")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/coaches"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/coaches") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.coaches", "COACHES")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/scouts"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/scouts") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.scouts", "SCOUTS")} />
                      </LocalizedLink>
                    </DrawerClose>
                    <div className="h-px bg-white/20 my-1" />

                    <DrawerClose asChild>
                      <LocalizedLink
                        to="/agents"
                        className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-colors duration-300 tracking-wider py-1 whitespace-nowrap ${
                          isActive("/agents") ? "text-primary" : ""
                        }`}
                      >
                        <HoverText text={t("header.agents", "AGENTS")} />
                      </LocalizedLink>
                    </DrawerClose>
                  </nav>

                  {/* Request Representation card - positioned beside OUR WORK section */}
                  <DrawerClose asChild>
                    <button
                      onClick={() => setRepresentationOpen(true)}
                      className="absolute group"
                      style={{ left: "450px", top: "110px", width: "280px", height: "100px" }}
                    >
                      <div className="relative w-full h-full rounded overflow-hidden border-2 border-primary">
                        <img
                          src={workingTogether}
                          alt={t("header.request_representation", "Request Representation")}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute inset-0 flex items-center justify-center p-3">
                          <div className="bg-primary text-black font-bebas uppercase tracking-widest text-xs md:text-sm py-2 px-3 text-center group-hover:brightness-110 transition-all w-full whitespace-nowrap">
                            <HoverText text={t("header.request_representation", "Request Representation")} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </DrawerClose>

                  {/* Portal card - positioned beside OUR WORK section */}
                  <DrawerClose asChild>
                    <LocalizedLink
                      to="/login"
                      className="absolute group"
                      style={{ left: "450px", top: "220px", width: "280px", height: "100px" }}
                    >
                      <div className="relative w-full h-full rounded overflow-hidden border-2 border-primary">
                        <img
                          src={playerPortalImage}
                          alt={t("header.portal", "Portal")}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute inset-0 flex items-center justify-center p-3">
                          <div className="bg-primary text-black font-bebas uppercase tracking-widest text-xs md:text-sm py-2 px-3 text-center group-hover:brightness-110 transition-all w-full whitespace-nowrap">
                            <HoverText text={t("header.portal", "Portal")} />
                          </div>
                        </div>
                      </div>
                    </LocalizedLink>
                  </DrawerClose>
                  
                  </div> {/* End scalable wrapper */}
                  </div>
                  
                  {/* Language Selector - Fixed at bottom of menu */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-primary/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bebas uppercase tracking-wider text-white/60">{t("header.language", "Language")}:</span>
                        <LanguageSelector />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - 4-card grid (desktop only) */}
                <div
                  className="hidden lg:flex items-center justify-center bg-cover bg-center relative"
                  style={{
                    backgroundImage: `url(${whiteMarbleBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Constrained grid container - fits between close button and bottom cards */}
                  <div className="grid grid-cols-2 grid-rows-2 gap-4" style={{
                    maxHeight: "590px",
                    marginTop: "50px",
                    marginBottom: "auto"
                  }}
                >
                    {/* Top-left: Stars card */}
                    {starPlayers.length > 0 && (
                      <div
                        className="transition-all duration-300"
                        onMouseEnter={() => setHoveredCard("top-left")}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{
                          width: "300px",
                          height: "300px",
                          transform:
                            hoveredCard === "top-left"
                              ? "translateY(20px)"
                              : hoveredCard === "bottom-left"
                              ? "translateY(-20px)"
                              : hoveredCard === "top-right"
                              ? "translateY(0)"
                              : hoveredCard === "bottom-right"
                              ? "translateY(0)"
                              : "translateY(0)",
                        }}
                      >
                        <div
                          className={`relative w-full h-full rounded-lg overflow-hidden transition-all duration-300 ${
                          starsHovered
                            ? "border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)] scale-105"
                            : "border border-white/20 grayscale"
                        }`}
                      >
                        {/* Player Images with Dark Overlay */}
                        {starPlayers.map((player, index) => (
                          <div
                            key={player.id}
                            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                            style={{ opacity: index === starIndex ? 1 : 0 }}
                          >
                            <img
                              src={player.image_url}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                          </div>
                        ))}

                        {/* Age - Top Left */}
                        <div className="absolute top-2 left-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => (
                            <div
                              key={`age-${player.id}`}
                              className="transition-opacity duration-1000 ease-in-out"
                              style={{
                                opacity: index === starIndex ? 1 : 0,
                                position: index === starIndex ? "relative" : "absolute",
                                visibility: index === starIndex ? "visible" : "hidden",
                              }}
                            >
                              <div className="text-2xl font-bold text-white font-bebas leading-none text-center">
                                {player.age}
                              </div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">
                                Age
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Nationality Flag - Top Right */}
                        <div className="absolute top-2 right-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => {
                            const nat = player.nationality;
                            if (!nat) return null;
                            const normalizedNat = nat === "Cape Verdean" ? "Cape Verde" : nat;
                            const flagUrl = getCountryFlagUrl(normalizedNat);
                            return (
                              <div
                                key={`nat-${player.id}`}
                                className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                                style={{
                                  opacity: index === starIndex ? 1 : 0,
                                  position: index === starIndex ? "relative" : "absolute",
                                  visibility: index === starIndex ? "visible" : "hidden",
                                }}
                              >
                                <img
                                  src={flagUrl}
                                  alt={`${normalizedNat} flag`}
                                  className="w-6 h-5 object-contain mb-0.5"
                                />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">
                                  Nationality
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Position - Bottom Left */}
                        <div className="absolute bottom-2 left-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => (
                            <div
                              key={`pos-${player.id}`}
                              className="transition-opacity duration-1000 ease-in-out"
                              style={{
                                opacity: index === starIndex ? 1 : 0,
                                position: index === starIndex ? "relative" : "absolute",
                                visibility: index === starIndex ? "visible" : "hidden",
                              }}
                            >
                              <div className="text-xl font-bold text-white font-bebas leading-none text-center">
                                {player.position}
                              </div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">
                                Position
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Club Logo - Bottom Right */}
                        <div className="absolute bottom-2 right-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => {
                            const clubLogo = player.club_logo;
                            return clubLogo ? (
                              <div
                                key={`club-${player.id}`}
                                className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                                style={{
                                  opacity: index === starIndex ? 1 : 0,
                                  position: index === starIndex ? "relative" : "absolute",
                                  visibility: index === starIndex ? "visible" : "hidden",
                                }}
                              >
                                <img
                                  src={clubLogo}
                                  alt={`${player.club} logo`}
                                  className="w-6 h-6 object-contain mb-0.5"
                                />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">
                                  Club
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                        </div>
                      </div>
                    )}

                    {/* Top-right: Realise Potential card */}
                    <div
                      className="transition-all duration-300"
                      onMouseEnter={() => setHoveredCard("top-right")}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        width: "300px",
                        height: "300px",
                        transform:
                          hoveredCard === "top-right"
                            ? "translateY(20px)"
                            : hoveredCard === "top-left"
                            ? "translateY(0)"
                            : hoveredCard === "bottom-right"
                            ? "translateY(-20px)"
                            : hoveredCard === "bottom-left"
                            ? "translateY(0)"
                            : "translateY(0)",
                      }}
                    >
                      <DrawerClose asChild>
                        <Link
                          to="/performance"
                          className={`relative block w-full h-full rounded-lg overflow-hidden border transition-all duration-300 ${
                            realisePotentialHovered
                              ? "border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)] scale-105"
                              : "border-white/20 grayscale"
                          }`}
                        >
                          <div className="relative w-full h-full">
                          <img
                            src={realisePotentialImages[rpIndex]}
                            alt="Realise Potential"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                          <div className="absolute inset-0 flex flex-col justify-between p-4">
                            <div className="space-y-1">
                              <p className="text-xs text-white/70 uppercase tracking-[0.2em]">
                                Performance Programmes
                              </p>
                              <h3 className="text-xl font-bebas tracking-[0.25em] text-white">
                                REALISE POTENTIAL
                              </h3>
                            </div>
                            <p className="text-[11px] text-white/80 max-w-xs leading-snug">
                              From tailored training blocks to in-depth analysis, build the habits that
                              separate the very best.
                            </p>
                          </div>
                          </div>
                        </Link>
                      </DrawerClose>
                    </div>

                    {/* Bottom-left: Between The Lines card */}
                    <div
                      className="transition-all duration-300"
                      onMouseEnter={() => setHoveredCard("bottom-left")}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        width: "300px",
                        height: "300px",
                        transform:
                          hoveredCard === "bottom-left"
                            ? "translateY(-20px)"
                            : hoveredCard === "top-left"
                            ? "translateY(0)"
                            : hoveredCard === "bottom-right"
                            ? "translateY(0)"
                            : hoveredCard === "top-right"
                            ? "translateY(0)"
                            : "translateY(0)",
                      }}
                    >
                      <DrawerClose asChild>
                        <Link
                          to="/between-the-lines"
                          className={`relative block w-full h-full rounded-lg overflow-hidden border transition-all duration-300 ${
                            betweenLinesHovered
                              ? "border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)] scale-105"
                              : "border-white/20 grayscale"
                          }`}
                        >
                          <div className="relative w-full h-full">
                          {betweenLinesPosts.length > 0 && betweenLinesPosts[btlIndex]?.image_url && (
                            <img
                              src={betweenLinesPosts[btlIndex].image_url}
                              alt="Between The Lines"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                          {betweenLinesPosts.length > 0 && (
                            <div className="absolute inset-0 flex flex-col justify-between p-4">
                              <div className="space-y-1">
                                <p className="text-xs text-white/70 uppercase tracking-[0.2em]">
                                  Between The Lines
                                </p>
                                <h3 className="text-xl font-bebas tracking-[0.25em] text-white">
                                  {betweenLinesPosts[btlIndex]?.title}
                                </h3>
                              </div>
                              <p className="text-[11px] text-white/80 max-w-xs leading-snug line-clamp-3">
                                {betweenLinesPosts[btlIndex]?.excerpt}
                              </p>
                            </div>
                          )}
                          </div>
                        </Link>
                      </DrawerClose>
                    </div>

                    {/* Bottom-right: News card */}
                    <div
                      className="transition-all duration-300"
                      onMouseEnter={() => setHoveredCard("bottom-right")}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        width: "300px",
                        height: "300px",
                        transform:
                          hoveredCard === "bottom-right"
                            ? "translateY(-20px)"
                            : hoveredCard === "top-right"
                            ? "translateY(20px)"
                            : hoveredCard === "bottom-left"
                            ? "translateY(0)"
                            : hoveredCard === "top-left"
                            ? "translateY(-20px)"
                            : "translateY(0)",
                      }}
                    >
                      <DrawerClose asChild>
                        <Link
                          to="/news"
                          className={`relative block w-full h-full rounded-lg overflow-hidden border transition-all duration-300 ${
                            newsHovered
                              ? "border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)] scale-105"
                              : "border-white/20 grayscale"
                          }`}
                        >
                          <div className="relative w-full h-full">
                          {newsArticles.length > 0 && newsArticles[newsIndex]?.image_url && (
                            <img
                              src={newsArticles[newsIndex].image_url}
                              alt="Player News"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                          {newsArticles.length > 0 && (
                            <div className="absolute inset-0 flex flex-col justify-between p-4">
                              <div className="space-y-1">
                                <p className="text-xs text-white/70 uppercase tracking-[0.2em]">
                                  Player News
                                </p>
                                <h3 className="text-xl font-bebas tracking-[0.25em] text-white">
                                  {newsArticles[newsIndex]?.title}
                                </h3>
                              </div>
                              <p className="text-[11px] text-white/80 max-w-xs leading-snug line-clamp-3">
                                {newsArticles[newsIndex]?.excerpt}
                              </p>
                            </div>
                          )}
                        </div>
                      </Link>
                    </DrawerClose>
                  </div>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2 z-10">
            <img src={logo} alt="RISE Football Agency" className={`transition-all duration-500 ease-out ${isScrolled ? 'h-9 md:h-11' : 'h-10 md:h-12'}`} />
          </Link>

          {/* Utility icons - animate from top bar into header */}
          {showTopBar && <>
              {/* Left side icons - positioned relative to menu button */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              left: getLeftIconOffset(),
              top: isScrolled ? "calc(0.75rem - 2px)" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <Link to="/contact" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.contact_us", "Contact Us")}>
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.contact_us", "Contact Us")}
                  </span>
                </Link>
                <button onClick={() => setDeclareInterestOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.declare_interest_short", "Declare Interest")}>
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.declare_interest_short", "Declare Interest")}
                  </span>
                </button>
              </div>
              
              {/* Right side icons - positioned relative to RISE WITH US button */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              right: getRightIconOffset(),
              top: isScrolled ? "calc(0.75rem - 2px)" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <button onClick={() => setRepresentationOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.request_representation", "Request Representation")}>
                  <Handshake className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.request_representation", "Request Representation")}
                  </span>
                </button>
                <Link to="/login" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.portal", "Portal")}>
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.portal", "Portal")}
                  </span>
                </Link>
              </div>
            </>}

          {/* RISE WITH US Button - Right */}
          <Button onClick={() => setWorkWithUsOpen(true)} size="sm" className={`btn-shine font-bebas uppercase tracking-wider transition-all duration-500 ease-out ${isScrolled ? 'text-xs md:text-sm px-3 md:px-5 h-8 md:h-9' : 'text-sm md:text-base px-4 md:px-6 h-9 md:h-10'}`}>
            <span className="hidden sm:inline"><HoverText text={t("header.rise_with_us", "RISE WITH US")} /></span>
            <span className="sm:hidden"><HoverText text={t("header.rise", "RISE")} /></span>
          </Button>
        </div>
      </div>
      </header>
      
      <WorkWithUsDialog open={workWithUsOpen} onOpenChange={setWorkWithUsOpen} />
      <RepresentationDialog open={representationOpen} onOpenChange={setRepresentationOpen} />
      <DeclareInterestDialog open={declareInterestOpen} onOpenChange={setDeclareInterestOpen} />
      <IntroModal open={introModalOpen} onOpenChange={setIntroModalOpen} />
    </>;
};