import { Link } from "react-router-dom";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HoverText } from "@/components/HoverText";
import { MatrixPlayerEffect } from "@/components/MatrixPlayerEffect";
import { useLanguage } from "@/contexts/LanguageContext";
import { HomeBackground } from "@/components/HomeBackground";
import riseLogoWhite from "@/assets/logo.png";

export default function Landing() {
  const { t } = useLanguage();
  
  // Desktop navigation (PLAYERS goes to /home, no HOME option)
  const desktopNavLinks = [
    { to: "/home", labelKey: "landing.nav_players", fallback: "PLAYERS" },
    { to: "/coaches", labelKey: "landing.nav_coaches", fallback: "COACHES" },
    { to: "/clubs", labelKey: "landing.nav_clubs", fallback: "CLUBS" },
    { to: "/agents", labelKey: "landing.nav_agents", fallback: "AGENTS" },
    { to: "/scouts", labelKey: "landing.nav_scouts", fallback: "SCOUTS" },
    { to: "/business", labelKey: "landing.nav_business", fallback: "BUSINESS" },
    { to: "/media", labelKey: "landing.nav_media", fallback: "MEDIA" },
  ];

  // Mobile navigation
  const mobileNavLinks = [
    { to: "/home", labelKey: "landing.nav_players", fallback: "PLAYERS" },
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
      
      {/* Matrix Player Effect - Over Video */}
      <div className="absolute inset-0 pointer-events-none">
        <MatrixPlayerEffect className="pointer-events-auto" />
      </div>

      {/* Bottom Section - Navigation + Language Selector in Golden Box */}
      <div className="pb-4 md:pb-12 z-50 relative px-2 md:px-0 w-full md:w-auto pointer-events-auto">
        <div className="border-2 border-primary/60 bg-black/40 backdrop-blur-sm px-2 py-2 md:py-3">
          
          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col items-center gap-2">
            {/* Language Selector - Above on mobile */}
            <div className="pb-2 border-b border-primary/40 w-full flex justify-center">
              <LanguageSelector />
            </div>
            
            {/* Grid for all links */}
            <nav className="grid grid-cols-3 gap-x-2 gap-y-1">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-2 py-1 text-[10px] font-bebas uppercase tracking-[0.1em] text-white/80 hover:text-primary transition-colors duration-300 text-center"
                >
                  <HoverText text={t(link.labelKey, link.fallback)} />
                </Link>
              ))}
            </nav>
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
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
