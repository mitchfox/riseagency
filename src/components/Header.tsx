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
export const Header = () => {
  const location = useLocation();
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
  const realisePotentialImages = [realisePotentialSessions, realisePotentialPaos, realisePotentialReport, realisePotentialAnalysis];
  useEffect(() => {
    setShowTopBar(location.pathname === '/');
  }, [location.pathname]);
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
      // Only apply shrink effect on homepage
      if (location.pathname === '/') {
        setIsScrolled(window.scrollY > 50);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call immediately to set correct state
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);
  const isActive = (path: string) => location.pathname === path;
  return <>
      {/* Top Utility Bar - only on homepage and only when not scrolled */}
      {showTopBar && !isScrolled && <div className="fixed top-14 md:top-16 left-0 right-0 z-50 bg-background/95 backdrop-blur-md transition-all duration-500 border-b-2 border-primary">
          <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center justify-between h-8 md:h-10">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 transition-all duration-500">
              <Link to="/contact" className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <span className="hidden lg:inline">Contact Us</span>
                <span className="lg:hidden">Contact</span>
              </Link>
              <div className="w-px h-4 bg-white/20 lg:hidden" />
              <button onClick={() => setDeclareInterestOpen(true)} className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <Users className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <span className="hidden lg:inline">Declare Interest In A Star</span>
                <span className="lg:hidden">Declare</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 transition-all duration-500">
              <button onClick={() => setRepresentationOpen(true)} className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <Handshake className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <span className="hidden lg:inline">Request Representation</span>
                <span className="lg:hidden">Represent</span>
              </button>
              <div className="w-px h-4 bg-white/20 lg:hidden" />
              <Link to="/login" className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                <LogIn className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
                <span>PORTAL</span>
              </Link>
            </div>
          </div>
        </div>
      </div>}

      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md w-full transition-all duration-500 ease-out ${showTopBar && isScrolled ? 'border-b-2 border-primary' : 'border-b border-white/10'}`}>
        <div className="container mx-auto px-2 md:px-4">
        <div className={`flex items-center justify-between transition-all duration-500 ease-out ${isScrolled ? 'h-12 md:h-14' : 'h-14 md:h-16'}`}>
          {/* Drawer Menu - Left */}
          <Drawer direction="left" preventScrollRestoration={false}>
            <DrawerTrigger asChild>
              <button className="group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12 md:w-14 md:h-14" aria-label="Toggle menu">
                <svg className="text-primary group-hover:text-foreground transition-all duration-300 ease-out w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="8" x2="20" y2="8" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg]" />
                  <line x1="2" y1="16" x2="18" y2="16" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg] group-hover:translate-x-1" />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent className="fixed inset-0 h-screen w-full !mt-0 rounded-none bg-black animate-slide-in-left transition-all duration-300 ease-out z-[200] overflow-hidden">
              {/* Grid overlay for positioning */}
              <div className="absolute inset-0 pointer-events-none z-[300]" style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(184,165,116,0.2) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(184,165,116,0.2) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}>
                {/* 100px markers */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(184,165,116,0.4) 2px, transparent 2px),
                    linear-gradient(to bottom, rgba(184,165,116,0.4) 2px, transparent 2px)
                  `,
                  backgroundSize: '100px 100px'
                }} />
              </div>
              
              {/* Full screen grid layout */}
              <div className="grid lg:grid-cols-2 h-full w-full overflow-hidden">
                {/* Left side - Navigation */}
                <div className="h-full flex flex-col bg-cover bg-center relative" style={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  <div className={`flex items-center transition-all duration-300 ease-out px-4 md:px-6 lg:px-8 xl:px-12 ${isScrolled ? 'h-7 md:h-8 pt-2' : 'h-14 md:h-16 lg:h-20 xl:h-24'}`}>
                    <DrawerClose asChild>
                      <button className="group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 pointer-events-none [&>svg]:animate-color-to-gold" aria-label="Close menu" style={{
                        pointerEvents: 'none'
                      }} onAnimationEnd={e => {
                        if (e.animationName.includes('color-to-gold')) {
                          (e.currentTarget as HTMLButtonElement).style.pointerEvents = 'auto';
                          e.currentTarget.classList.remove('pointer-events-none');
                        }
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 text-white translate-x-[5px] translate-y-[-2px]">
                          <line x1="4" y1="8" x2="20" y2="16" className="origin-center animate-menu-open-line-1" />
                          <line x1="2" y1="16" x2="18" y2="8" className="origin-center animate-menu-open-line-2" />
                        </svg>
                      </button>
                    </DrawerClose>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between px-4 md:px-6 lg:px-8 xl:px-12 py-8 md:py-12 lg:py-16 overflow-y-auto max-h-[calc(100vh-8rem)] border-t-[2rem] border-b-[2rem] border-transparent">
                    <nav className="flex flex-col gap-1 md:gap-1.5 max-w-md lg:max-w-xl xl:max-w-2xl transform -translate-y-[105px] translate-x-[5px]">
                      <DrawerClose asChild>
                        <Link to="/" className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/") ? "text-primary" : ""}`}>
                          Home
                          {isActive("/") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <div className="h-px bg-white/20 my-2" />
                      
                      <DrawerClose asChild>
                        <Link to="/stars" onMouseEnter={() => setStarsHovered(true)} onMouseLeave={() => setStarsHovered(false)} className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/stars") || location.pathname.startsWith("/stars/") ? "text-primary" : ""}`}>
                          Stars
                          {(isActive("/stars") || location.pathname.startsWith("/stars/")) && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link to="/performance" onMouseEnter={() => setRealisePotentialHovered(true)} onMouseLeave={() => setRealisePotentialHovered(false)} className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/performance") ? "text-primary" : ""}`}>
                          Realise Potential
                          {isActive("/performance") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link to="/between-the-lines" onMouseEnter={() => setBetweenLinesHovered(true)} onMouseLeave={() => setBetweenLinesHovered(false)} className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/between-the-lines") ? "text-primary" : ""}`}>
                          Between The Lines
                          {isActive("/between-the-lines") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <div className="h-px bg-white/20 my-2" />
                      
                      <DrawerClose asChild>
                        <Link to="/players" className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/players") || location.pathname.startsWith("/players/") ? "text-primary" : ""}`}>
                          Players
                          {(isActive("/players") || location.pathname.startsWith("/players/")) && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link to="/clubs" className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/clubs") ? "text-primary" : ""}`}>
                          Clubs
                          {isActive("/clubs") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link to="/coaches" className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/coaches") ? "text-primary" : ""}`}>
                          Coaches
                          {isActive("/coaches") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link to="/scouts" className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bebas uppercase text-white hover:text-primary hover:bg-white/5 transition-all tracking-wider py-1 px-2 rounded flex items-center gap-2 ${isActive("/scouts") ? "text-primary" : ""}`}>
                          Scouts
                          {isActive("/scouts") && <img src={riseStar} alt="" className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 inline-block" />}
                        </Link>
                      </DrawerClose>
                    </nav>

                    {/* Bottom action cards */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 max-w-full lg:max-w-2xl xl:max-w-3xl mt-6 md:mt-8">
                      <DrawerClose asChild>
                        <Link to="/login" className="relative group h-[70px] md:h-[102px] lg:h-[120px] xl:h-[140px]">
                          <div className="relative h-full rounded overflow-hidden">
                            <img src={playerPortalImage} alt="Portal" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
                              <div className="bg-primary text-black font-bebas uppercase tracking-widest text-sm md:text-base lg:text-lg xl:text-xl py-1 md:py-2 lg:py-3 px-6 md:px-8 lg:px-10 text-center group-hover:brightness-110 transition-all w-full">
                                Portal
                              </div>
                            </div>
                          </div>
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <button onClick={() => setRepresentationOpen(true)} className="relative group h-[70px] md:h-[102px] lg:h-[120px] xl:h-[140px]">
                          <div className="relative h-full rounded overflow-hidden">
                            <img src={workingTogether} alt="Request Representation" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
                              <div className="bg-primary text-black font-bebas uppercase tracking-widest text-xs md:text-sm lg:text-base xl:text-lg py-1 md:py-2 lg:py-3 px-3 md:px-4 lg:px-6 text-center group-hover:brightness-110 transition-all w-full whitespace-nowrap">
                                Request Representation
                              </div>
                            </div>
                          </div>
                        </button>
                      </DrawerClose>
                    </div>
                  </div>
                </div>

                {/* Right side - Stars Card (desktop only) */}
                <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-4 p-8 bg-cover bg-center" style={{
                  backgroundImage: `url(${whiteMarbleBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  {starPlayers.length > 0 && <div className="w-full transition-transform duration-300" onMouseEnter={() => setHoveredCard('top-left')} onMouseLeave={() => setHoveredCard(null)} style={{
                    transform: hoveredCard === 'top-left' ? 'translateY(20px)' : hoveredCard === 'bottom-left' ? 'translateY(20px)' : hoveredCard === 'top-right' ? 'translateY(-20px)' : hoveredCard === 'bottom-right' ? 'translateY(20px)' : 'translateY(0)'
                  }}>
                      <div className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${starsHovered ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' : 'border border-white/20 grayscale'}`}>
                        {/* Player Images with Dark Overlay */}
                        {starPlayers.map((player, index) => <div key={player.id} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{
                        opacity: index === starIndex ? 1 : 0
                      }}>
                            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                          </div>)}
                      
                        {/* Age - Top Left */}
                        <div className="absolute top-2 left-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => <div key={`age-${player.id}`} className="transition-opacity duration-1000 ease-in-out" style={{
                          opacity: index === starIndex ? 1 : 0,
                          position: index === starIndex ? 'relative' : 'absolute',
                          visibility: index === starIndex ? 'visible' : 'hidden'
                        }}>
                              <div className="text-2xl font-bold text-white font-bebas leading-none text-center">{player.age}</div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">Age</div>
                            </div>)}
                        </div>
                        
                        {/* Nationality Flag - Top Right */}
                        <div className="absolute top-2 right-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => {
                          const nat = player.nationality;
                          if (!nat) return null;
                          const normalizedNat = nat === 'Cape Verdean' ? 'Cape Verde' : nat;
                          const flagUrl = getCountryFlagUrl(normalizedNat);
                          return <div key={`nat-${player.id}`} className="flex flex-col items-center transition-opacity duration-1000 ease-in-out" style={{
                            opacity: index === starIndex ? 1 : 0,
                            position: index === starIndex ? 'relative' : 'absolute',
                            visibility: index === starIndex ? 'visible' : 'hidden'
                          }}>
                                <img src={flagUrl} alt={`${normalizedNat} flag`} className="w-6 h-5 object-contain mb-0.5" />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">Nationality</div>
                              </div>;
                        })}
                        </div>
                        
                        {/* Position - Bottom Left */}
                        <div className="absolute bottom-2 left-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => <div key={`pos-${player.id}`} className="transition-opacity duration-1000 ease-in-out" style={{
                          opacity: index === starIndex ? 1 : 0,
                          position: index === starIndex ? 'relative' : 'absolute',
                          visibility: index === starIndex ? 'visible' : 'hidden'
                        }}>
                              <div className="text-xl font-bold text-white font-bebas leading-none text-center">{player.position}</div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">Position</div>
                            </div>)}
                        </div>
                        
                        {/* Club Logo - Bottom Right */}
                        <div className="absolute bottom-2 right-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => {
                          const clubLogo = player.club_logo;
                          return clubLogo ? <div key={`club-${player.id}`} className="flex flex-col items-center transition-opacity duration-1000 ease-in-out" style={{
                            opacity: index === starIndex ? 1 : 0,
                            position: index === starIndex ? 'relative' : 'absolute',
                            visibility: index === starIndex ? 'visible' : 'hidden'
                          }}>
                                <img src={clubLogo} alt="Club" className="w-7 h-7 object-contain mb-0.5" />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">Club</div>
                              </div> : null;
                        })}
                        </div>
                      </div>
                    </div>}
                  
                  {/* Between The Lines Card */}
                  {betweenLinesPosts.length > 0 && <div className="w-full transition-transform duration-300" onMouseEnter={() => setHoveredCard('bottom-left')} onMouseLeave={() => setHoveredCard(null)} style={{
                    transform: hoveredCard === 'bottom-left' ? 'translateY(-20px)' : hoveredCard === 'top-left' ? 'translateY(20px)' : hoveredCard === 'top-right' ? 'translateY(-20px)' : hoveredCard === 'bottom-right' ? 'translateY(20px)' : 'translateY(0)'
                  }}>
                      <div className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${betweenLinesHovered ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' : 'border border-white/20 grayscale'}`}>
                        {/* Post Images */}
                        {betweenLinesPosts.map((post, index) => <div key={post.id} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{
                        opacity: index === btlIndex ? 1 : 0
                      }}>
                            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                          </div>)}
                        
                        {/* Title Overlay */}
                        <div className="absolute bottom-2 left-2 right-2">
                          {betweenLinesPosts.map((post, index) => <div key={`title-${post.id}`} className="transition-opacity duration-1000 ease-in-out" style={{
                          opacity: index === btlIndex ? 1 : 0,
                          position: index === btlIndex ? 'relative' : 'absolute',
                          visibility: index === btlIndex ? 'visible' : 'hidden'
                        }}>
                              <h4 className="text-white font-bebas text-sm uppercase tracking-wider line-clamp-2">
                                {post.title}
                              </h4>
                            </div>)}
                        </div>
                      </div>
                    </div>}
                  
                  {/* Realise Potential Card */}
                  <div className="w-full transition-transform duration-300" onMouseEnter={() => setHoveredCard('top-right')} onMouseLeave={() => setHoveredCard(null)} style={{
                    transform: hoveredCard === 'top-right' ? 'translateY(20px)' : hoveredCard === 'bottom-right' ? 'translateY(20px)' : hoveredCard === 'top-left' ? 'translateY(-20px)' : hoveredCard === 'bottom-left' ? 'translateY(20px)' : 'translateY(0)'
                  }}>
                    <div className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${realisePotentialHovered ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' : 'border border-white/20 grayscale'}`}>
                      {/* Cycling Images with pan animation */}
                      {realisePotentialImages.map((image, index) => <div key={index} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{
                        opacity: index === rpIndex ? 1 : 0
                      }}>
                          <img src={image} alt={`Realise Potential ${index + 1}`} className="h-full w-auto min-w-[120%] object-cover animate-pan-right" style={{
                          objectPosition: 'left center'
                        }} />
                        </div>)}
                    </div>
                  </div>
                  
                  {/* News Articles Card */}
                  {newsArticles.length > 0 && <div className="w-full transition-transform duration-300" onMouseEnter={() => {
                    setHoveredCard('bottom-right');
                    setNewsHovered(true);
                  }} onMouseLeave={() => {
                    setHoveredCard(null);
                    setNewsHovered(false);
                  }} style={{
                    transform: hoveredCard === 'bottom-right' ? 'translateY(-20px)' : hoveredCard === 'top-right' ? 'translateY(20px)' : hoveredCard === 'top-left' ? 'translateY(-20px)' : hoveredCard === 'bottom-left' ? 'translateY(20px)' : 'translateY(0)'
                  }}>
                      <div className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${newsHovered ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' : 'border border-white/20 grayscale'}`}>
                        {/* News Images */}
                        {newsArticles.map((article, index) => <div key={article.id} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{
                        opacity: index === newsIndex ? 1 : 0
                      }}>
                            <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                          </div>)}
                        
                        {/* Title Overlay */}
                        <div className="absolute bottom-2 left-2 right-2">
                          {newsArticles.map((article, index) => <div key={`title-${article.id}`} className="transition-opacity duration-1000 ease-in-out" style={{
                          opacity: index === newsIndex ? 1 : 0,
                          position: index === newsIndex ? 'relative' : 'absolute',
                          visibility: index === newsIndex ? 'visible' : 'hidden'
                        }}>
                              <h4 className="text-white font-bebas text-sm uppercase tracking-wider line-clamp-2">
                                {article.title}
                              </h4>
                            </div>)}
                        </div>
                      </div>
                    </div>}
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2 z-10">
            <img src={logo} alt="RISE Football Agency" className={`transition-all duration-500 ease-out ${isScrolled ? 'h-9 md:h-11' : 'h-7 md:h-10'}`} />
          </Link>

          {/* Utility icons - smoothly reposition between top bar and header */}
          {showTopBar && <>
              {/* Left side icons - move from top bar into header next to menu */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              left: isScrolled ? "clamp(3.5rem, 8vw, 8.56rem)" : "3.25rem",
              top: isScrolled ? "10px" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <Link to="/contact" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title="Contact Us">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    Contact Us
                  </span>
                </Link>
                <button onClick={() => setDeclareInterestOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title="Declare Interest">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    Declare Interest
                  </span>
                </button>
              </div>
              
              {/* Right side icons - move from top bar into header next to RISE WITH US */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              right: isScrolled ? "clamp(4rem, 10vw, 10.56rem)" : "2.5rem",
              top: isScrolled ? "10px" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <button onClick={() => setRepresentationOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title="Request Representation">
                  <Handshake className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    Request Representation
                  </span>
                </button>
                <Link to="/login" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title="Portal">
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    Portal
                  </span>
                </Link>
              </div>
            </>}

          {/* RISE WITH US Button - Right */}
          <Button onClick={() => setWorkWithUsOpen(true)} size="sm" className={`btn-shine font-bebas uppercase tracking-wider transition-all duration-500 ease-out translate-x-[1px] ${isScrolled ? 'text-xs md:text-sm px-3 md:px-5 h-8 md:h-9' : 'text-xs md:text-base px-3 md:px-6 h-8 md:h-10'}`}>
            <span className="hidden sm:inline">RISE WITH US</span>
            <span className="sm:hidden">RISE</span>
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