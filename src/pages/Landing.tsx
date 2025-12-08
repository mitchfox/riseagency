import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { HoverText } from "@/components/HoverText";
import { LazyPlayer3D } from "@/components/LazyPlayer3D";
import { useLanguage } from "@/contexts/LanguageContext";
import { HomeBackground } from "@/components/HomeBackground";
import { LightConeBackground } from "@/components/LightConeBackground";
import { XRayProvider, useXRay } from "@/contexts/XRayContext";
import { LandingCursor } from "@/components/LandingCursor";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { DeclareInterestPlayerDialog } from "@/components/DeclareInterestPlayerDialog";
import { Button } from "@/components/ui/button";
import { useRoleSubdomain, pathToRole, RoleSubdomain } from "@/hooks/useRoleSubdomain";
import { CoordinateOverlay } from "@/components/dev/CoordinateOverlay";
import { useDevMode } from "@/hooks/useDevMode";
import riseLogoWhite from "@/assets/logo.png";
// Inner component that uses the XRay context for full-page tracking
function LandingContent() {
  const {
    t
  } = useLanguage();
  const {
    getRoleUrl
  } = useRoleSubdomain();
  const isDevMode = useDevMode();
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  const [showRepresentation, setShowRepresentation] = useState(false);
  const [showDeclareInterest, setShowDeclareInterest] = useState(false);
  const [topLogoHovered, setTopLogoHovered] = useState(false);
  const {
    setXrayState,
    xrayState
  } = useXRay();
  const lastInteractionRef = useRef(0);
  const navigateToRole = (path: string) => {
    const role = pathToRole[path];
    if (role) {
      const roleUrl = getRoleUrl(role as Exclude<RoleSubdomain, null>);
      if (roleUrl.startsWith('http')) {
        window.location.href = roleUrl;
      } else {
        window.location.href = path;
      }
    } else {
      window.location.href = path;
    }
  };

  // Desktop navigation (PLAYERS goes to /players)
  const desktopNavLinks = [{
    to: "/players",
    labelKey: "landing.nav_players",
    fallback: "PLAYER"
  }, {
    to: "/coaches",
    labelKey: "landing.nav_coaches",
    fallback: "COACH"
  }, {
    to: "/clubs",
    labelKey: "landing.nav_clubs",
    fallback: "CLUB"
  }, {
    to: "/agents",
    labelKey: "landing.nav_agents",
    fallback: "AGENT"
  }, {
    to: "/scouts",
    labelKey: "landing.nav_scouts",
    fallback: "SCOUT"
  }, {
    to: "/business",
    labelKey: "landing.nav_business",
    fallback: "BUSINESS"
  }, {
    to: "/media",
    labelKey: "landing.nav_media",
    fallback: "MEDIA"
  }];

  // Mobile navigation
  const mobileNavLinks = [{
    to: "/players",
    labelKey: "landing.nav_players",
    fallback: "PLAYER"
  }, {
    to: "/coaches",
    labelKey: "landing.nav_coaches",
    fallback: "COACH"
  }, {
    to: "/clubs",
    labelKey: "landing.nav_clubs",
    fallback: "CLUB"
  }, {
    to: "/agents",
    labelKey: "landing.nav_agents",
    fallback: "AGENT"
  }, {
    to: "/scouts",
    labelKey: "landing.nav_scouts",
    fallback: "SCOUT"
  }, {
    to: "/business",
    labelKey: "landing.nav_business",
    fallback: "BUSINESS"
  }, {
    to: "/media",
    labelKey: "landing.nav_media",
    fallback: "MEDIA"
  }];

  // Full-page X-ray tracking effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastInteractionRef.current = Date.now();
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setXrayState({
        isActive: true,
        intensity: 1,
        position: {
          x,
          y
        }
      });
    };
    const handleMouseLeave = () => {
      setXrayState({
        isActive: false,
        intensity: 0,
        position: {
          x: 0.5,
          y: 0.5
        }
      });
    };

    // Check for inactivity to fade out x-ray
    const checkInactivity = () => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceInteraction > 2000) {
        setXrayState({
          isActive: false,
          intensity: 0,
          position: {
            x: 0.5,
            y: 0.5
          }
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    const inactivityInterval = setInterval(checkInactivity, 500);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearInterval(inactivityInterval);
    };
  }, [setXrayState]);
  return <div className="bg-black flex flex-col items-center justify-end relative overflow-hidden cursor-none md:cursor-none" style={{
    height: '100dvh',
    maxHeight: '100dvh'
  }}>
      {/* Dev Mode Coordinate Overlay - REMOVE BEFORE PUBLISHING */}
      <CoordinateOverlay enabled={true} />
      
      {/* Custom Landing Page Cursor */}
      <LandingCursor />
      
      {/* Data-driven Background */}
      <HomeBackground />
      
      {/* Light Cone Background - revealed by X-Ray */}
      <LightConeBackground />
      
      {/* Top Center Logo - disappears on xray or when hovering REALISE POTENTIAL area */}
      <div className={`absolute top-4 md:top-6 z-[55] transition-opacity duration-500 ${xrayState.isActive || topLogoHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{
      left: 'calc(50% - 8px)',
      transform: 'translateX(-50%)'
    }}>
        <img src={riseLogoWhite} alt="RISE Football Agency" className="h-[42px] md:h-[55px] w-auto" loading="eager" fetchPriority="high" />
      </div>
      
      {/* Hidden text revealed by X-ray - REALISE POTENTIAL - hidden until hover */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-[60] opacity-0 hover:opacity-100 transition-opacity duration-500" style={{
      top: 'calc(4rem - 50px)'
    }} onMouseEnter={() => setTopLogoHovered(true)} onMouseLeave={() => setTopLogoHovered(false)}>
        <span className="font-bebas text-4xl md:text-6xl lg:text-7xl tracking-[0.3em] text-white/90 uppercase whitespace-nowrap">
          <HoverText text="REALISE POTENTIAL" className="hover-text-slow" />
        </span>
      </div>
      
      
      {/* Language Selector - centered on page, moved down 190px */}
      <div className="absolute z-[50] pointer-events-auto" style={{
      top: 'calc(50% + 190px)',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(1.5)'
    }}>
        <LanguageMapSelector onOpenChange={setLanguagePopupOpen} className="mx-[20px]" />
      </div>
      
      {/* Portal link - subtle top right */}
      <Link to="/portal" className="absolute top-6 md:top-8 right-4 md:right-8 z-50 text-white/20 hover:text-white/50 text-xs font-bebas uppercase tracking-wider transition-colors duration-300">
        {t("header.portal", "Portal")}
      </Link>
      
      {/* 3D Player Effect - Behind the bottom menu area (lower z-index so cone appears on top) */}
      {!languagePopupOpen && <div className="absolute inset-0 pointer-events-none z-[5]" style={{
      transform: 'translateX(-3px)'
    }}>
          <LazyPlayer3D className="pointer-events-none" />
        </div>}

      {/* Bottom Section - Menu area */}
      <div className="pb-0 md:pb-8 z-50 relative w-full pointer-events-auto">
        <div className="relative max-w-6xl mx-auto" style={{
        minHeight: '180px'
      }}>
          
          {/* Content container - pushed down to align with triangle body */}
          <div className="relative z-10 px-4 md:px-8 pt-20 md:pt-24 pb-1 md:py-3" style={{ transform: 'translateY(32px)' }}>
            {/* Desktop Layout - Horizontal Slider */}
            <div className="hidden lg:block">
              <RoleSlider navLinks={desktopNavLinks} navigateToRole={navigateToRole} t={t} setShowRepresentation={setShowRepresentation} setShowDeclareInterest={setShowDeclareInterest} />
            </div>

            {/* Tablet Layout - Same as mobile but hidden on lg+ */}
            <div className="hidden md:flex lg:hidden flex-col items-center gap-0 mt-4">
              {/* Buttons row - with divider line */}
              <div className="border-t border-primary/40 pt-2 pb-2 flex justify-center" style={{
              width: '50%'
            }}>
                <div className="flex gap-2">
                  <Button onClick={() => setShowRepresentation(true)} variant="outline" size="sm" className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 hover:text-primary text-xs px-3 h-7" hoverEffect>
                    {t("landing.represent_me", "Represent Me")}
                  </Button>
                  <Button onClick={() => setShowDeclareInterest(true)} size="sm" className="btn-shine font-bebas uppercase tracking-wider text-xs px-3 h-7" hoverEffect>
                    {t("landing.declare_interest_short", "Declare Interest")}
                  </Button>
                </div>
              </div>
              
              {/* Top row: Players, Coaches, Clubs */}
              <div className="border-t border-primary/40 pt-1 pb-1" style={{
              width: '70%'
            }}>
                <nav className="flex items-center justify-center gap-2">
                  {desktopNavLinks.slice(0, 3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-1 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 2 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Bottom row: Agents, Scouts, Business, Media */}
              <div className="border-t border-primary/40 pt-1" style={{
              width: '90%'
            }}>
                <nav className="flex items-center justify-center gap-1">
                  {desktopNavLinks.slice(3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-1 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 3 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Select role text */}
              <div className="text-center pt-1">
                <span className="text-[10px] font-bebas uppercase tracking-[0.15em] text-white/40">
                  Select Your Role To Enter Site
                </span>
              </div>
            </div>

            {/* Mobile Layout - pushed down with proper divider lines */}
            <div className="md:hidden flex flex-col items-center gap-0 mt-4" style={{
            transform: 'translateY(5px)'
          }}>
              
              {/* Buttons row - with divider line */}
              <div className="border-t border-primary/40 pt-1 pb-1 flex justify-center" style={{
              width: '45%'
            }}>
                <div className="flex gap-2">
                  <Button onClick={() => setShowRepresentation(true)} variant="outline" size="sm" className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 hover:text-primary text-[11.5px] px-2.5 h-6" hoverEffect>
                    {t("landing.represent_me", "Represent Me")}
                  </Button>
                  <Button onClick={() => setShowDeclareInterest(true)} size="sm" className="btn-shine font-bebas uppercase tracking-wider text-[11.5px] px-2.5 h-6" hoverEffect>
                    {t("landing.declare_interest_short", "Declare Interest")}
                  </Button>
                </div>
              </div>
              
              {/* Top row: Players, Coaches, Clubs - with divider */}
              <div className="border-t border-primary/40 pt-0.5 pb-0.5" style={{
              width: '65%'
            }}>
                <nav className="flex items-center justify-center gap-1">
                  {mobileNavLinks.slice(0, 3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-0.5 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 2 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Bottom row: Agents, Scouts, Business, Media - widest */}
              <div className="border-t border-primary/40 pt-0.5" style={{
              width: '88%'
            }}>
                <nav className="flex items-center justify-center gap-1">
                  {mobileNavLinks.slice(3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-0.5 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 3 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Select role text - mobile */}
              <div className="text-center pt-0">
                <span className="text-[10px] font-bebas uppercase tracking-[0.15em] text-white/40">
                  Select Your Role To Enter Site
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
      <DeclareInterestPlayerDialog open={showDeclareInterest} onOpenChange={setShowDeclareInterest} starsOnly />
    </div>;
}
// Role Slider Component for Desktop - Elegant minimal slider
function RoleSlider({
  navLinks,
  navigateToRole,
  t,
  setShowRepresentation,
  setShowDeclareInterest
}: {
  navLinks: {
    to: string;
    labelKey: string;
    fallback: string;
  }[];
  navigateToRole: (path: string) => void;
  t: (key: string, fallback: string) => string;
  setShowRepresentation: (open: boolean) => void;
  setShowDeclareInterest: (open: boolean) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const getPositionFromIndex = (index: number) => {
    return index / (navLinks.length - 1) * 100;
  };
  const getIndexFromPosition = (clientX: number) => {
    if (!sliderRef.current) return selectedIndex;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(percentage * (navLinks.length - 1));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newIndex = getIndexFromPosition(e.clientX);
    setSelectedIndex(newIndex);
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newIndex = getIndexFromPosition(e.clientX);
    setSelectedIndex(newIndex);
  }, [isDragging, navLinks.length]);
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Navigate on release
      navigateToRole(navLinks[selectedIndex].to);
    }
  }, [isDragging, selectedIndex, navLinks, navigateToRole]);
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  const handleRoleClick = (index: number) => {
    setSelectedIndex(index);
    navigateToRole(navLinks[index].to);
  };
  return <div className="flex flex-col items-center" style={{ paddingTop: '35px' }}>
      {/* Unified Slider Container - all elements in one parent */}
      <div style={{ width: '85%', paddingLeft: '100px', paddingRight: '100px' }}>
        
        {/* Buttons row */}
        <div className="border-t border-primary/30 pt-3 flex justify-center" style={{ width: '35%', margin: '0 auto' }}>
          <div className="flex gap-3">
            <Button onClick={() => setShowRepresentation(true)} variant="outline" size="sm" className="font-bebas uppercase tracking-wider border-primary/40 text-primary/80 hover:bg-primary/10 hover:text-primary hover:border-primary/60 text-sm px-4 h-8 transition-all duration-300" hoverEffect>
              {t("landing.represent_me", "Represent Me")}
            </Button>
            <Button onClick={() => setShowDeclareInterest(true)} size="sm" className="btn-shine font-bebas uppercase tracking-wider text-sm px-4 h-8" hoverEffect>
              {t("landing.declare_interest", "Declare Interest In Star")}
            </Button>
          </div>
        </div>
        
        {/* Role Labels - minimal gap from buttons */}
        <div className="flex justify-between" style={{ paddingTop: '8px', marginBottom: '8px' }}>
          {navLinks.map((link, index) => <button key={link.to} onClick={() => handleRoleClick(index)} className={`text-[15px] font-bebas uppercase tracking-[0.12em] transition-all duration-300 hover:text-primary ${selectedIndex === index ? 'text-primary' : 'text-white/40'}`}>
              {t(link.labelKey, link.fallback)}
            </button>)}
        </div>
        
        {/* Separator line */}
        <div className="w-full h-[1px] bg-primary/30" style={{ marginBottom: '8px' }} />

        {/* Minimal Slider Track */}
        <div ref={sliderRef} className="relative h-[1px] bg-white/20 cursor-pointer" onMouseDown={handleMouseDown}>
          {/* Filled line */}
          <div className="absolute h-full bg-primary/60 transition-all duration-100" style={{
          width: `${getPositionFromIndex(selectedIndex)}%`
        }} />
          
          {/* Stop markers - subtle dots */}
          {navLinks.map((_, index) => <div key={index} className={`absolute top-1/2 w-1.5 h-1.5 rounded-full transition-all duration-200 ${index === selectedIndex ? 'bg-primary scale-150' : index < selectedIndex ? 'bg-primary/60' : 'bg-white/30'}`} style={{
          left: `${getPositionFromIndex(index)}%`,
          transform: 'translate(-50%, -50%)'
        }} />)}
          
          {/* Elegant Thumb */}
          <div className={`absolute top-1/2 w-3 h-3 bg-primary rounded-full transition-all duration-150 ${isDragging ? 'scale-150' : 'hover:scale-125'}`} style={{
          left: `${getPositionFromIndex(selectedIndex)}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 12px hsl(var(--primary) / 0.5)'
        }} />
        </div>

        {/* Instruction text */}
        <div className="text-center mt-1">
          <span className="text-[10px] font-bebas uppercase tracking-[0.25em] text-white/30">
            Select Role To Enter
          </span>
        </div>
      </div>
    </div>;
}
export default function Landing() {
  return <XRayProvider>
      <LandingContent />
    </XRayProvider>;
}