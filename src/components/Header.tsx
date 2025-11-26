import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X, MessageCircle, Users, LogIn } from "lucide-react";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

  useEffect(() => {
    setShowTopBar(location.pathname === '/');
  }, [location.pathname]);

  useEffect(() => {
    const fetchStarPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('visible_on_stars_page', true)
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setStarPlayers(data);
      }
    };

    const fetchBetweenLinesPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data && !error && data.length > 0) {
        setBetweenLinesPosts(data);
      }
    };

    fetchStarPlayers();
    fetchBetweenLinesPosts();
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

  return (
    <>
      {/* Top Utility Bar - only on homepage */}
      {showTopBar && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center justify-between h-9 md:h-10">
            <div className="flex flex-wrap items-center gap-1 md:gap-4">
              <Link
                to="/contact"
                className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 hidden sm:block" />
                <span className="hidden md:inline">Contact Us</span>
                <span className="md:hidden">Contact</span>
              </Link>
              <div className="w-px h-4 bg-white/20 md:hidden" />
              <button
                onClick={() => setDeclareInterestOpen(true)}
                className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 hidden sm:block" />
                <span className="hidden md:inline">Declare Interest In A Star</span>
                <span className="md:hidden">Declare Interest</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1 md:gap-4">
              <button
                onClick={() => setRepresentationOpen(true)}
                className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 hidden sm:block" />
                <span className="hidden md:inline">Request Representation</span>
                <span className="md:hidden">Represent Me</span>
              </button>
              <div className="w-px h-4 bg-white/20 md:hidden" />
              <Link
                to="/login"
                className="text-xs md:text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 hidden sm:block" />
                <span>PORTAL</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Header */}
      <header className={`fixed ${showTopBar ? 'top-9 md:top-10' : 'top-0'} left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-b-2 border-gold w-full transition-all duration-300 ease-out`}>
        <div className="container mx-auto px-2 md:px-4">
        <div className={`flex items-center justify-between transition-all duration-300 ease-out ${isScrolled ? 'h-7 md:h-8' : 'h-14 md:h-16'}`}>
          {/* Drawer Menu - Left */}
          <Drawer direction="left" modal={false} preventScrollRestoration={false}>
            <DrawerTrigger asChild>
              <button
                className={`group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out ${isScrolled ? 'w-7 h-7 md:w-8 md:h-8 -translate-y-[5px]' : 'w-10 h-10 md:w-12 md:h-12'}`}
                aria-label="Toggle menu"
              >
                <svg 
                  className={`text-primary group-hover:text-foreground transition-all duration-300 ease-out ${isScrolled ? 'w-5 h-5 md:w-6 md:h-6' : 'w-6 h-6 md:w-7 md:h-7'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line 
                    x1="4" y1="8" x2="20" y2="8" 
                    className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg]"
                  />
                  <line 
                    x1="2" y1="16" x2="18" y2="16" 
                    className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg] group-hover:translate-x-1"
                  />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent 
              className="fixed inset-0 h-screen w-full !mt-0 rounded-none bg-black animate-slide-in-left transition-all duration-300 ease-out z-[200]"
            >
              {/* Full screen grid layout */}
              <div className="grid lg:grid-cols-2 h-full w-full">
                {/* Left side - Navigation */}
                <div 
                  className="h-full flex flex-col bg-cover bg-center relative"
                  style={{ 
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className={`flex items-center transition-all duration-300 ease-out px-2 md:px-4 ${isScrolled ? 'h-7 md:h-8 pt-2' : 'h-14 md:h-16'}`}>
                    <DrawerClose asChild>
                      <button
                        className={`group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out ml-[-5px] mt-5 ${isScrolled ? 'w-7 h-7 md:w-8 md:h-8' : 'w-10 h-10 md:w-12 md:h-12'}`}
                        aria-label="Close menu"
                      >
                        <X className="h-6 w-6 md:h-7 md:w-7 text-primary" strokeWidth={2.5} />
                      </button>
                    </DrawerClose>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between px-2 md:px-4 py-12">
                    <nav className="flex flex-col gap-1 max-w-md">
                      <DrawerClose asChild>
                        <Link
                          to="/"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/") ? "text-primary" : ""
                          }`}
                        >
                          Home
                        </Link>
                      </DrawerClose>
                      
                      <div className="h-px bg-white/20 my-2" />
                      
                      <DrawerClose asChild>
                        <Link
                          to="/stars"
                          onMouseEnter={() => setStarsHovered(true)}
                          onMouseLeave={() => setStarsHovered(false)}
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/stars") || location.pathname.startsWith("/stars/") ? "text-primary" : ""
                          }`}
                        >
                          Stars
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/performance"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/performance") ? "text-primary" : ""
                          }`}
                        >
                          Realise Potential
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/between-the-lines"
                          onMouseEnter={() => setBetweenLinesHovered(true)}
                          onMouseLeave={() => setBetweenLinesHovered(false)}
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/between-the-lines") ? "text-primary" : ""
                          }`}
                        >
                          Between The Lines
                        </Link>
                      </DrawerClose>
                      
                      <div className="h-px bg-white/20 my-2" />
                      
                      <DrawerClose asChild>
                        <Link
                          to="/players"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/players") || location.pathname.startsWith("/players/") ? "text-primary" : ""
                          }`}
                        >
                          Players
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/clubs"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/clubs") ? "text-primary" : ""
                          }`}
                        >
                          Clubs
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/coaches"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/coaches") ? "text-primary" : ""
                          }`}
                        >
                          Coaches
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/scouts"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary hover:bg-white/20 transition-all tracking-wider py-1 px-2 rounded ${
                            isActive("/scouts") ? "text-primary" : ""
                          }`}
                        >
                          Scouts
                        </Link>
                      </DrawerClose>
                    </nav>

                    {/* Bottom action cards */}
                    <div className="grid grid-cols-2 gap-4 max-w-2xl -mt-5">
                      <DrawerClose asChild>
                        <Link
                          to="/login"
                          className="flex flex-col group"
                        >
                          <h3 className="text-white font-bebas text-xl md:text-2xl uppercase tracking-wider mb-2 text-center">
                            Portal
                          </h3>
                          <div className="relative aspect-[16/9] rounded overflow-hidden mb-2">
                            <img 
                              src={playerPortalImage} 
                              alt="Portal" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="bg-primary text-black font-bebas uppercase tracking-widest text-sm md:text-base py-3 text-center group-hover:brightness-110 transition-all">
                            Portal
                          </div>
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <button
                          onClick={() => setRepresentationOpen(true)}
                          className="flex flex-col group"
                        >
                          <h3 className="text-white font-bebas text-xl md:text-2xl uppercase tracking-wider mb-2 text-center">
                            Realise Potential
                          </h3>
                          <div className="relative aspect-[16/9] rounded overflow-hidden mb-2">
                            <img 
                              src={workingTogether} 
                              alt="Request Representation" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="bg-primary text-black font-bebas uppercase tracking-widest text-sm md:text-base py-3 text-center group-hover:brightness-110 transition-all">
                            Request Representation
                          </div>
                        </button>
                      </DrawerClose>
                    </div>
                  </div>
                </div>

                {/* Right side - Stars Card (desktop only) */}
                <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-4 bg-background p-8">
                  {starPlayers.length > 0 && (
                    <div className="w-full">
                      <div 
                        className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${
                          starsHovered 
                            ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' 
                            : 'border border-white/20 grayscale'
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
                                position: index === starIndex ? 'relative' : 'absolute',
                                visibility: index === starIndex ? 'visible' : 'hidden'
                              }}
                            >
                              <div className="text-2xl font-bold text-white font-bebas leading-none text-center">{player.age}</div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">Age</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Nationality Flag - Top Right */}
                        <div className="absolute top-2 right-2 flex flex-col items-center min-w-[30px]">
                          {starPlayers.map((player, index) => {
                            const nat = player.nationality;
                            if (!nat) return null;
                            const normalizedNat = nat === 'Cape Verdean' ? 'Cape Verde' : nat;
                            const flagUrl = getCountryFlagUrl(normalizedNat);
                            return (
                              <div
                                key={`nat-${player.id}`}
                                className="flex flex-col items-center transition-opacity duration-1000 ease-in-out"
                                style={{ 
                                  opacity: index === starIndex ? 1 : 0,
                                  position: index === starIndex ? 'relative' : 'absolute',
                                  visibility: index === starIndex ? 'visible' : 'hidden'
                                }}
                              >
                                <img 
                                  src={flagUrl} 
                                  alt={`${normalizedNat} flag`}
                                  className="w-6 h-5 object-contain mb-0.5"
                                />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">Nationality</div>
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
                                position: index === starIndex ? 'relative' : 'absolute',
                                visibility: index === starIndex ? 'visible' : 'hidden'
                              }}
                            >
                              <div className="text-xl font-bold text-white font-bebas leading-none text-center">{player.position}</div>
                              <div className="text-[7px] text-white/80 uppercase tracking-wider mt-0.5 text-center">Position</div>
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
                                  position: index === starIndex ? 'relative' : 'absolute',
                                  visibility: index === starIndex ? 'visible' : 'hidden'
                                }}
                              >
                                <img src={clubLogo} alt="Club" className="w-7 h-7 object-contain mb-0.5" />
                                <div className="text-[7px] text-white/80 uppercase tracking-wider text-center">Club</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Between The Lines Card */}
                  {betweenLinesPosts.length > 0 && (
                    <div className="w-full">
                      <div 
                        className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300 ${
                          betweenLinesHovered 
                            ? 'border-2 border-primary shadow-[0_0_20px_rgba(184,165,116,0.6)]' 
                            : 'border border-white/20 grayscale'
                        }`}
                      >
                        {/* Post Images */}
                        {betweenLinesPosts.map((post, index) => (
                          <div
                            key={post.id}
                            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                            style={{ opacity: index === btlIndex ? 1 : 0 }}
                          >
                            <img 
                              src={post.image_url} 
                              alt={post.title}
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                          </div>
                        ))}
                        
                        {/* Title Overlay */}
                        <div className="absolute bottom-2 left-2 right-2">
                          {betweenLinesPosts.map((post, index) => (
                            <div
                              key={`title-${post.id}`}
                              className="transition-opacity duration-1000 ease-in-out"
                              style={{ 
                                opacity: index === btlIndex ? 1 : 0,
                                position: index === btlIndex ? 'relative' : 'absolute',
                                visibility: index === btlIndex ? 'visible' : 'hidden'
                              }}
                            >
                              <h4 className="text-white font-bebas text-sm uppercase tracking-wider line-clamp-2">
                                {post.title}
                              </h4>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Placeholder for 2 other components */}
                  <div className="bg-muted/20 rounded-lg border border-white/10" />
                  <div className="bg-muted/20 rounded-lg border border-white/10" />
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2 z-10">
            <img 
              src={logo} 
              alt="RISE Football Agency" 
              className={`transition-all duration-300 ease-out ${isScrolled ? 'h-[42px] md:h-[60px] -translate-y-5' : 'h-7 md:h-10'}`} 
            />
          </Link>

          {/* RISE WITH US Button - Right */}
          <Button
            onClick={() => setWorkWithUsOpen(true)}
            size="sm"
            className={`btn-shine font-bebas uppercase tracking-wider transition-all duration-300 ease-out translate-x-[1px] ${isScrolled ? 'text-[8px] md:text-[11px] px-2 md:px-4 h-[22px] md:h-7 -translate-y-[5px]' : 'text-xs md:text-base px-3 md:px-6 h-8 md:h-10'}`}
          >
            <span className="hidden sm:inline">RISE WITH US</span>
            <span className="sm:hidden">RISE</span>
          </Button>
        </div>
      </div>
      
      <WorkWithUsDialog open={workWithUsOpen} onOpenChange={setWorkWithUsOpen} />
      <RepresentationDialog 
        open={representationOpen} 
        onOpenChange={setRepresentationOpen} 
      />
      <DeclareInterestDialog 
        open={declareInterestOpen} 
        onOpenChange={setDeclareInterestOpen} 
      />
      <IntroModal 
        open={introModalOpen} 
        onOpenChange={setIntroModalOpen} 
      />
    </header>
    </>
  );
};
