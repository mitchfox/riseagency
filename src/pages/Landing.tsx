import { useState } from "react";
import { Link } from "react-router-dom";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { HoverText } from "@/components/HoverText";
import { LazyPlayer3D } from "@/components/LazyPlayer3D";
import { useLanguage } from "@/contexts/LanguageContext";
import { HomeBackground } from "@/components/HomeBackground";
import { XRayProvider } from "@/contexts/XRayContext";
import { DragNavigator } from "@/components/DragNavigator";
import { LandingCursor } from "@/components/LandingCursor";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { DeclareInterestPlayerDialog } from "@/components/DeclareInterestPlayerDialog";
import { Button } from "@/components/ui/button";
import { useRoleSubdomain, pathToRole, RoleSubdomain } from "@/hooks/useRoleSubdomain";
import riseLogoWhite from "@/assets/logo.png";

export default function Landing() {
  const { t } = useLanguage();
  const { getRoleUrl } = useRoleSubdomain();
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  const [showRepresentation, setShowRepresentation] = useState(false);
  const [showDeclareInterest, setShowDeclareInterest] = useState(false);
  
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
  const desktopNavLinks = [
    { to: "/players", labelKey: "landing.nav_players", fallback: "PLAYERS" },
    { to: "/coaches", labelKey: "landing.nav_coaches", fallback: "COACHES" },
    { to: "/clubs", labelKey: "landing.nav_clubs", fallback: "CLUBS" },
    { to: "/agents", labelKey: "landing.nav_agents", fallback: "AGENTS" },
    { to: "/scouts", labelKey: "landing.nav_scouts", fallback: "SCOUTS" },
    { to: "/business", labelKey: "landing.nav_business", fallback: "BUSINESS" },
    { to: "/media", labelKey: "landing.nav_media", fallback: "MEDIA" },
  ];

  // Mobile navigation
  const mobileNavLinks = [
    { to: "/players", labelKey: "landing.nav_players", fallback: "PLAYERS" },
    { to: "/coaches", labelKey: "landing.nav_coaches", fallback: "COACHES" },
    { to: "/clubs", labelKey: "landing.nav_clubs", fallback: "CLUBS" },
    { to: "/agents", labelKey: "landing.nav_agents", fallback: "AGENTS" },
    { to: "/scouts", labelKey: "landing.nav_scouts", fallback: "SCOUTS" },
    { to: "/business", labelKey: "landing.nav_business", fallback: "BUSINESS" },
    { to: "/media", labelKey: "landing.nav_media", fallback: "MEDIA" },
  ];

  return (
    <XRayProvider>
    <div className="min-h-screen bg-black flex flex-col items-center justify-end relative overflow-hidden cursor-none md:cursor-none">
      {/* Custom Landing Page Cursor */}
      <LandingCursor />
      
      {/* Data-driven Background */}
      <HomeBackground />
      
      {/* RISE Logo at top center */}
      <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 z-50">
        <img 
          src={riseLogoWhite} 
          alt="RISE Football Agency" 
          className="h-12 md:h-16 w-auto"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      
      {/* Portal link - subtle top right */}
      <Link 
        to="/portal" 
        className="absolute top-6 md:top-8 right-4 md:right-8 z-50 text-white/20 hover:text-white/50 text-xs font-bebas uppercase tracking-wider transition-colors duration-300"
      >
        {t("header.portal", "Portal")}
      </Link>
      
      {/* 3D Player Effect - Over Video (hidden when language popup is open) */}
      {!languagePopupOpen && (
        <div className="absolute inset-0 pointer-events-none">
          <LazyPlayer3D className="pointer-events-auto" />
        </div>
      )}

      {/* Bottom Section - Navigation + Drag Navigator + Language Selector in Golden Box */}
      <div className="pb-4 md:pb-12 z-50 relative px-2 md:px-4 w-full pointer-events-auto">
        <div className="border-2 border-primary/60 bg-black/40 backdrop-blur-sm px-4 md:px-8 py-4 md:py-5 max-w-6xl mx-auto">
          
          {/* Desktop Layout */}
          <div className="hidden md:block">
            {/* Drag Navigator */}
            <div className="mb-4">
              <DragNavigator options={desktopNavLinks} />
            </div>
            
            {/* Language Selector with buttons on either side */}
            <div className="border-t border-primary/40 pt-3 flex items-center justify-between">
              <Button 
                onClick={() => setShowRepresentation(true)}
                variant="outline"
                className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 px-6"
                hoverEffect
              >
                {t("landing.represent_me", "Represent Me")}
              </Button>
              
              <LanguageMapSelector onOpenChange={setLanguagePopupOpen} />
              
              <Button 
                onClick={() => setShowDeclareInterest(true)}
                className="btn-shine font-bebas uppercase tracking-wider px-6"
                hoverEffect
              >
                {t("landing.declare_interest", "Declare Interest In Star")}
              </Button>
            </div>
          </div>

          {/* Mobile Layout - Compact horizontal scroll */}
          <div className="md:hidden flex flex-col items-center gap-1.5">
            {/* Represent Me & Declare Interest Buttons */}
            <div className="flex gap-2 mb-2">
              <Button 
                onClick={() => setShowRepresentation(true)}
                variant="outline"
                size="sm"
                className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 text-xs px-3"
                hoverEffect
              >
                {t("landing.represent_me", "Represent Me")}
              </Button>
              <Button 
                onClick={() => setShowDeclareInterest(true)}
                size="sm"
                className="btn-shine font-bebas uppercase tracking-wider text-xs px-3"
                hoverEffect
              >
                {t("landing.declare_interest_short", "Declare Interest")}
              </Button>
            </div>
            
            {/* Navigation - horizontal scroll */}
            <nav className="flex items-center justify-center gap-1 flex-wrap px-1">
              {mobileNavLinks.map((link, index) => (
                <div key={link.to} className="flex items-center">
                  <button
                    onClick={() => navigateToRole(link.to)}
                    className="px-2 py-1 text-xs font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap"
                  >
                    <HoverText text={t(link.labelKey, link.fallback)} />
                  </button>
                  {index < mobileNavLinks.length - 1 && (
                    <div className="w-px h-3 bg-primary/40" />
                  )}
                </div>
              ))}
            </nav>
            
            {/* Language Selector - Below with divider */}
            <div className="pt-2.5 border-t border-primary/40 w-full flex justify-center">
              <LanguageMapSelector onOpenChange={setLanguagePopupOpen} />
            </div>
          </div>

        </div>
      </div>
      
      {/* Dialogs */}
      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
      <DeclareInterestPlayerDialog open={showDeclareInterest} onOpenChange={setShowDeclareInterest} starsOnly />
    </div>
    </XRayProvider>
  );
}
