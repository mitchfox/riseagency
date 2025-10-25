import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { X, MessageCircle, Users, LogIn } from "lucide-react";
import { TbMenu } from "react-icons/tb";
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

export const Header = () => {
  const location = useLocation();
  const [representationOpen, setRepresentationOpen] = useState(false);
  const [workWithUsOpen, setWorkWithUsOpen] = useState(false);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);

  useEffect(() => {
    setShowTopBar(location.pathname === '/');
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
              <button
                onClick={() => setDeclareInterestOpen(true)}
                className="text-[9px] md:text-xs font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Users className="w-3 h-3 hidden sm:block" />
                <span>Declare Interest</span>
              </button>
              <Link
                to="/contact"
                className="text-[9px] md:text-xs font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3 hidden sm:block" />
                Contact
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-1 md:gap-4">
              <button
                onClick={() => setRepresentationOpen(true)}
                className="text-[9px] md:text-xs font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3 hidden sm:block" />
                <span className="hidden sm:inline">Request Representation</span>
                <span className="sm:hidden">Representation</span>
              </button>
              <Link
                to="/login"
                className="text-[9px] md:text-xs font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-colors flex items-center gap-1"
              >
                <LogIn className="w-3 h-3 hidden sm:block" />
                <span className="hidden sm:inline">Player Portal</span>
                <span className="sm:hidden">Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Header */}
      <header className={`fixed ${showTopBar ? 'top-9 md:top-10' : 'top-0'} left-0 right-0 z-50 bg-background/80 backdrop-blur-md`}>
        <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Drawer Menu - Left */}
          <Drawer direction="left" modal={false} preventScrollRestoration={false}>
            <DrawerTrigger asChild>
              <button
                className="group relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Toggle menu"
              >
                <TbMenu className="w-6 h-6 md:w-7 md:h-7 text-primary group-hover:text-foreground transition-colors" />
              </button>
            </DrawerTrigger>
            <DrawerContent 
              className="h-full w-[240px] left-0 flex flex-col rounded-r-none bg-cover bg-center animate-slide-in-left transition-all duration-300 ease-out"
              style={{ 
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${blackMarbleBg})` 
              }}
            >
              <div className="flex justify-end p-4 sticky top-0 bg-black/40 backdrop-blur-sm z-10">
                <DrawerClose asChild>
                  <button
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none text-white"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </DrawerClose>
              </div>
              <nav className="flex flex-col gap-1 px-4 flex-1 pb-4">
                <DrawerClose asChild>
                  <Link
                    to="/"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Home
                  </Link>
                </DrawerClose>
                
                {/* Separator */}
                <div className="h-px bg-white/20 my-2 mx-4" />
                
                <DrawerClose asChild>
                  <Link
                    to="/stars"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/stars") || location.pathname.startsWith("/stars/") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Stars
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/performance"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/performance") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    REALISE POTENTIAL
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/between-the-lines"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/between-the-lines") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Between The Lines
                  </Link>
                </DrawerClose>
                
                {/* Separator */}
                <div className="h-px bg-white/20 my-2 mx-4" />
                
                <DrawerClose asChild>
                  <Link
                    to="/players"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/players") || location.pathname.startsWith("/players/") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Players
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/clubs"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/clubs") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Clubs
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/coaches"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/coaches") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Coaches
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to="/scouts"
                    className={`text-xl font-bebas uppercase text-white hover:text-primary transition-colors tracking-wider py-1.5 px-4 rounded ${
                      isActive("/scouts") ? "bg-primary/80 text-white" : "hover:bg-white/10"
                    }`}
                  >
                    Scouts
                  </Link>
                </DrawerClose>
              </nav>
              
              {/* Player Portal Box */}
              <div className="px-4 pb-3">
                <div className="relative overflow-hidden rounded-lg h-24">
                  <div 
                    className="absolute inset-0 bg-cover bg-top"
                    style={{ backgroundImage: `url(${playerPortalImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-center justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg text-center">
                      Player Portal
                    </h3>
                    <DrawerClose asChild>
                      <Button
                        asChild
                        className="btn-shine w-full font-bebas uppercase tracking-wider h-6 text-xs"
                      >
                        <Link to="/login">Login</Link>
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </div>

              {/* Working Together Box */}
              <div className="px-4 pb-4">
                <div className="relative overflow-hidden rounded-lg h-24">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${workingTogether})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
                  <div className="relative h-full flex flex-col items-center justify-between p-4">
                    <h3 className="text-xl font-bebas uppercase tracking-wider text-white drop-shadow-lg text-center">
                      REALISE POTENTIAL
                    </h3>
                    <DrawerClose asChild>
                      <Button
                        onClick={() => setRepresentationOpen(true)}
                        className="btn-shine w-full font-bebas uppercase tracking-wider h-6 text-xs"
                      >
                        REQUEST REPRESENTATION
                      </Button>
                    </DrawerClose>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Logo - Center */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <img src={logo} alt="RISE Football Agency" className="h-7 md:h-10" />
          </Link>

          {/* RISE WITH US Button - Right */}
          <Button
            onClick={() => setWorkWithUsOpen(true)}
            size="sm"
            className="btn-shine font-bebas uppercase tracking-wider text-xs md:text-base px-3 md:px-6 h-8 md:h-10"
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
    </header>
    </>
  );
};
