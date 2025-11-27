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
                
                {/* X-axis labels */}
                <div className="absolute top-0 left-0 right-0 h-8 flex">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={`x-${i}`} className="text-primary text-xs font-mono bg-black/50 px-1" style={{ position: 'absolute', left: `${i * 100}px`, top: '2px' }}>
                      {i * 100}
                    </div>
                  ))}
                </div>
                
                {/* Y-axis labels */}
                <div className="absolute top-0 left-0 bottom-0 w-12 flex flex-col">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={`y-${i}`} className="text-primary text-xs font-mono bg-black/50 px-1" style={{ position: 'absolute', top: `${i * 100}px`, left: '2px' }}>
                      {i * 100}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Full screen grid layout - Absolute positioned */}
              <div className="h-full w-full relative bg-cover bg-center" style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {/* Close button at 100, 50 */}
                <DrawerClose asChild>
                  <button 
                    className="absolute z-50 group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12 pointer-events-none [&>svg]:animate-color-to-gold" 
                    aria-label="Close menu" 
                    style={{ left: '100px', top: '50px', pointerEvents: 'none' }}
                    onAnimationEnd={e => {
                      if (e.animationName.includes('color-to-gold')) {
                        (e.currentTarget as HTMLButtonElement).style.pointerEvents = 'auto';
                        e.currentTarget.classList.remove('pointer-events-none');
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-8 w-8 text-white">
                      <line x1="4" y1="8" x2="20" y2="16" className="origin-center animate-menu-open-line-1" />
                      <line x1="2" y1="16" x2="18" y2="8" className="origin-center animate-menu-open-line-2" />
                    </svg>
                  </button>
                </DrawerClose>

                {/* Navigation starting at 100, 75 going to 100, 500 */}
                <nav className="absolute" style={{ left: '100px', top: '75px' }}>
                  <DrawerClose asChild>
                    <Link to="/" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/") ? "text-primary" : ""}`}>
                      HOME
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/stars" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/stars") || location.pathname.startsWith("/stars/") ? "text-primary" : ""}`}>
                      STARS
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/performance" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/performance") ? "text-primary" : ""}`}>
                      REALISE POTENTIAL
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/between-the-lines" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/between-the-lines") ? "text-primary" : ""}`}>
                      BETWEEN THE LINES
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/players" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/players") || location.pathname.startsWith("/players/") ? "text-primary" : ""}`}>
                      PLAYERS
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/clubs" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/clubs") ? "text-primary" : ""}`}>
                      CLUBS
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/coaches" className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/coaches") ? "text-primary" : ""}`}>
                      COACHES
                    </Link>
                  </DrawerClose>
                  <div className="h-px bg-white/20 my-2" />
                  
                  <DrawerClose asChild>
                    <Link to="/news" onMouseEnter={() => setNewsHovered(true)} onMouseLeave={() => setNewsHovered(false)} className={`block text-3xl font-bebas uppercase text-white hover:text-primary transition-all tracking-wider py-2 ${isActive("/news") ? "text-primary" : ""}`}>
                      NEWS
                    </Link>
                  </DrawerClose>
                </nav>

                {/* Request Representation: 50, 525 to 250, 650 (200x125) */}
                <DrawerClose asChild>
                  <button 
                    onClick={() => setRepresentationOpen(true)}
                    className="absolute bg-primary text-background font-bebas text-xl uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center rounded"
                    style={{ left: '50px', top: '525px', width: '200px', height: '125px' }}
                  >
                    Request Representation
                  </button>
                </DrawerClose>
                
                {/* Portal: 300, 525 to 500, 650 (200x125) */}
                <DrawerClose asChild>
                  <a 
                    href="https://scoutcircle.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute bg-primary text-background font-bebas text-xl uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center rounded"
                    style={{ left: '300px', top: '525px', width: '200px', height: '125px' }}
                  >
                    Agent / Scout Portal
                  </a>
                </DrawerClose>
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