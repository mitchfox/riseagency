import { useState } from "react";
import { Link } from "react-router-dom";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { HoverText } from "@/components/HoverText";
import { Player3DEffect } from "@/components/Player3DEffect";
import { useLanguage } from "@/contexts/LanguageContext";
import { HomeBackground } from "@/components/HomeBackground";
import riseLogoWhite from "@/assets/logo.png";

export default function Landing() {
  const { t } = useLanguage();
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-end relative overflow-hidden cursor-none md:cursor-none">
      {/* Data-driven Background */}
      <HomeBackground />
      
      {/* RISE Logo at top center */}
      <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 z-50">
        <img 
          src={riseLogoWhite} 
          alt="RISE Football Agency" 
          className="h-12 md:h-16 w-auto"
        />
      </div>
      
      {/* 3D Player Effect - Over Video (hidden when language popup is open) */}
      {!languagePopupOpen && (
        <div className="absolute inset-0 pointer-events-none">
          <Player3DEffect className="pointer-events-auto" />
        </div>
      )}

      {/* Bottom Section - Navigation + Language Selector in Golden Box */}
      <div className="pb-4 md:pb-12 z-50 relative px-2 md:px-0 w-full md:w-auto pointer-events-auto">
        <div className="border-2 border-primary/60 bg-black/40 backdrop-blur-sm px-2 py-2 md:py-3">
          
          {/* Mobile Layout - Compact horizontal scroll */}
          <div className="md:hidden flex flex-col items-center gap-1.5">
            {/* Navigation - horizontal scroll */}
            <nav className="flex items-center justify-center gap-1 flex-wrap px-1">
              {mobileNavLinks.map((link, index) => (
                <div key={link.to} className="flex items-center">
                  <Link
                    to={link.to}
                    className="px-2 py-1 text-xs font-bebas uppercase tracking-[0.15em] text-white/80 hover:text-primary transition-colors duration-300 whitespace-nowrap"
                  >
                    <HoverText text={t(link.labelKey, link.fallback)} />
                  </Link>
                  {index < mobileNavLinks.length - 1 && (
                    <div className="w-px h-3 bg-primary/40" />
                  )}
                </div>
              ))}
            </nav>
            
            {/* Language Selector - Below with divider */}
            <div className="pt-1.5 border-t border-primary/40 w-full flex justify-center">
              <LanguageMapSelector onOpenChange={setLanguagePopupOpen} />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <nav className="flex flex-row items-center justify-center flex-wrap gap-y-2">
              {desktopNavLinks.map((link, index) => (
                <div key={link.to} className="flex items-center justify-center">
                  <Link
                    to={link.to}
                    className="px-6 text-base font-bebas uppercase tracking-[0.2em] text-white/80 hover:text-primary transition-colors duration-300"
                  >
                    <HoverText text={t(link.labelKey, link.fallback)} />
                  </Link>
                  {index < desktopNavLinks.length - 1 && (
                    <div className="w-px h-4 bg-primary/50" />
                  )}
                </div>
              ))}
            </nav>
            
            {/* Language Selector - Below with divider on desktop */}
            <div className="border-t border-primary/40 mt-3 pt-3 flex justify-center">
              <LanguageMapSelector onOpenChange={setLanguagePopupOpen} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
