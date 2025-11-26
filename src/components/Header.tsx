import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X, MessageCircle, Users, LogIn } from "lucide-react";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
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

  useEffect(() => {
    setShowTopBar(location.pathname === '/');
  }, [location.pathname]);

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
              className="fixed inset-0 h-screen w-full rounded-none bg-black animate-slide-in-left transition-all duration-300 ease-out z-[200]"
            >
              {/* Full screen grid layout */}
              <div className="grid lg:grid-cols-2 h-full w-full">
                {/* Left side - Navigation */}
                <div 
                  className="h-full flex flex-col bg-cover bg-center"
                  style={{ 
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})` 
                  }}
                >
                  <div className="flex justify-end p-6 sticky top-0 bg-black/40 backdrop-blur-sm z-10">
                    <DrawerClose asChild>
                      <button
                        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none text-white"
                        aria-label="Close menu"
                      >
                        <X className="h-8 w-8" />
                      </button>
                    </DrawerClose>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 xl:px-24 pb-12">
                    <nav className="flex flex-col gap-1 max-w-md">
                      <DrawerClose asChild>
                        <Link
                          to="/"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/") ? "text-primary" : ""
                          }`}
                        >
                          Home
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/stars"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/stars") || location.pathname.startsWith("/stars/") ? "text-primary" : ""
                          }`}
                        >
                          Stars
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/performance"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/performance") ? "text-primary" : ""
                          }`}
                        >
                          Realise Potential
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/between-the-lines"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
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
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/players") || location.pathname.startsWith("/players/") ? "text-primary" : ""
                          }`}
                        >
                          Players
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/clubs"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/clubs") ? "text-primary" : ""
                          }`}
                        >
                          Clubs
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/coaches"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/coaches") ? "text-primary" : ""
                          }`}
                        >
                          Coaches
                        </Link>
                      </DrawerClose>
                      
                      <DrawerClose asChild>
                        <Link
                          to="/scouts"
                          className={`text-2xl md:text-3xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1 ${
                            isActive("/scouts") ? "text-primary" : ""
                          }`}
                        >
                          Scouts
                        </Link>
                      </DrawerClose>
                    </nav>
                  </div>
                </div>

                {/* Right side - Images (desktop only) */}
                <div className="hidden lg:grid grid-cols-2 gap-4 p-8 bg-background overflow-y-auto">
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={playerPortalImage} 
                      alt="Portal" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={workingTogether} 
                      alt="Working Together" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={workingTogether} 
                      alt="Image 3" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={playerPortalImage} 
                      alt="Image 4" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
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
