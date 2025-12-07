import { useState, useEffect, useRef } from "react";
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
import riseLogoWhite from "@/assets/logo.png";

// Inner component that uses the XRay context for full-page tracking
function LandingContent() {
  const {
    t
  } = useLanguage();
  const {
    getRoleUrl
  } = useRoleSubdomain();
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
      {/* Custom Landing Page Cursor */}
      <LandingCursor />
      
      {/* Data-driven Background */}
      <HomeBackground />
      
      {/* Light Cone Background - revealed by X-Ray */}
      <LightConeBackground />
      
      {/* Top Center Logo - disappears on xray or when hovering REALISE POTENTIAL area */}
      <div 
        className={`absolute top-4 md:top-6 left-1/2 transform -translate-x-1/2 z-[55] transition-opacity duration-500 ${
          xrayState.isActive || topLogoHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <img 
          src={riseLogoWhite} 
          alt="RISE Football Agency" 
          className="h-[32px] md:h-[42px] w-auto" 
          loading="eager" 
          fetchPriority="high" 
        />
      </div>
      
      {/* Hidden text revealed by X-ray - REALISE POTENTIAL - hidden until hover */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 z-[60] opacity-0 hover:opacity-100 transition-opacity duration-500" 
        style={{ top: 'calc(4rem - 50px)' }}
        onMouseEnter={() => setTopLogoHovered(true)}
        onMouseLeave={() => setTopLogoHovered(false)}
      >
        <span className="font-bebas text-4xl md:text-6xl lg:text-7xl tracking-[0.3em] text-white/90 uppercase whitespace-nowrap">
          <HoverText text="REALISE POTENTIAL" className="hover-text-slow" />
        </span>
      </div>
      
      {/* RISE Logo - center X, 2/3 down Y, adjusted 3px right and 32px up */}
      <div className="absolute z-50" style={{
      top: 'calc(66.67% - 32px)',
      left: 'calc(50% + 3px)',
      transform: 'translateX(-50%)'
    }}>
        <img src={riseLogoWhite} alt="RISE Football Agency" className="h-[46px] md:h-[64px] w-auto" loading="eager" fetchPriority="high" />
      </div>
      
      {/* Language Selector - centered on page, moved down 72px, right 10px */}
      <div className="absolute z-[50] pointer-events-auto" style={{
      top: 'calc(50% + 72px)',
      left: 'calc(50% + 10px)',
      transform: 'translate(-50%, -50%)'
    }}>
        <LanguageMapSelector onOpenChange={setLanguagePopupOpen} className="mx-[20px]" />
      </div>
      
      {/* Portal link - subtle top right */}
      <Link to="/portal" className="absolute top-6 md:top-8 right-4 md:right-8 z-50 text-white/20 hover:text-white/50 text-xs font-bebas uppercase tracking-wider transition-colors duration-300">
        {t("header.portal", "Portal")}
      </Link>
      
      {/* 3D Player Effect - Over Video (hidden when language popup is open) */}
      {!languagePopupOpen && <div className="absolute inset-0 pointer-events-none z-10" style={{
      transform: 'translateX(-3px)'
    }}>
          <LazyPlayer3D className="pointer-events-none" />
        </div>}

      {/* Bottom Section - Menu area */}
      <div className="pb-1 md:pb-8 z-50 relative w-full pointer-events-auto">
        <div className="relative max-w-6xl mx-auto" style={{
        minHeight: '180px'
      }}>
          
          {/* Content container - pushed down to align with triangle body */}
          <div className="relative z-10 px-4 md:px-8 pt-20 md:pt-16 pb-1 md:py-3">
            {/* Desktop Layout */}
            <div className="hidden md:block">
              
              {/* Buttons row - with divider line meeting triangle edges */}
              <div className="border-t border-primary/40 pt-3 pb-3 mx-auto" style={{
              maxWidth: '42%'
            }}>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => setShowRepresentation(true)} variant="outline" size="sm" className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 hover:text-primary px-3.5 h-8 text-sm" hoverEffect>
                    {t("landing.represent_me", "Represent Me")}
                  </Button>
                  
                  <Button onClick={() => setShowDeclareInterest(true)} size="sm" className="btn-shine font-bebas uppercase tracking-wider px-3.5 h-8 text-sm" hoverEffect>
                    {t("landing.declare_interest", "Declare Interest In Star")}
                  </Button>
                </div>
              </div>
              
              {/* Top menu row: Players, Coaches, Clubs - with divider line */}
              <div className="border-t border-primary/40 pt-2 pb-2 mx-auto" style={{
              maxWidth: '62%'
            }}>
                <nav className="flex items-center justify-center gap-6">
                  {desktopNavLinks.slice(0, 3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-3 py-1 text-[19px] font-bebas uppercase tracking-[0.2em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 2 && <div className="w-px h-4 bg-primary/40 ml-6" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Bottom menu row: Agents, Scouts, Business, Media - widest line */}
              <div className="border-t border-primary/40 pt-2 mx-auto" style={{
              maxWidth: '85%'
            }}>
                <nav className="flex items-center justify-center gap-4">
                  {desktopNavLinks.slice(3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-3 py-1 text-[19px] font-bebas uppercase tracking-[0.2em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 3 && <div className="w-px h-4 bg-primary/40 ml-4" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Select role text */}
              <div className="text-center pt-2">
                <span className="text-xs font-bebas uppercase tracking-[0.2em] text-white/40">
                  Select Your Role To Enter Site
                </span>
              </div>
            </div>

            {/* Mobile Layout - pushed down with proper divider lines */}
            <div className="md:hidden flex flex-col items-center gap-0 mt-4">
              
              {/* Buttons row - with divider line */}
              <div className="border-t border-primary/40 pt-2 pb-2 flex justify-center" style={{
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
              <div className="border-t border-primary/40 pt-1 pb-1" style={{
              width: '65%'
            }}>
                <nav className="flex items-center justify-center gap-1">
                  {mobileNavLinks.slice(0, 3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-1 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 2 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Bottom row: Agents, Scouts, Business, Media - widest */}
              <div className="border-t border-primary/40 pt-1" style={{
              width: '88%'
            }}>
                <nav className="flex items-center justify-center gap-1">
                  {mobileNavLinks.slice(3).map((link, index) => <div key={link.to} className="flex items-center">
                      <button onClick={() => navigateToRole(link.to)} className="px-2 py-1 text-[17px] font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap">
                        <HoverText text={t(link.labelKey, link.fallback)} />
                      </button>
                      {index < 3 && <div className="w-px h-3 bg-primary/40" />}
                    </div>)}
                </nav>
              </div>
              
              {/* Select role text - mobile */}
              <div className="text-center pt-1">
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
export default function Landing() {
  return <XRayProvider>
      <LandingContent />
    </XRayProvider>;
}