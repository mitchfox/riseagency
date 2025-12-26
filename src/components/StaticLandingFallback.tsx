import { useState } from "react";
import { Link } from "react-router-dom";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LanguageMapSelector } from "@/components/LanguageMapSelector";
import { HoverText } from "@/components/HoverText";
import { useLanguage } from "@/contexts/LanguageContext";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { DeclareInterestPlayerDialog } from "@/components/DeclareInterestPlayerDialog";
import { Button } from "@/components/ui/button";
import { useRoleSubdomain, pathToRole, RoleSubdomain } from "@/hooks/useRoleSubdomain";
import { useIsPWA } from "@/hooks/useIsPWA";
import riseLogoWhite from "@/assets/logo.png";

interface StaticLandingFallbackProps {
  performanceReason?: string;
}

export function StaticLandingFallback({ performanceReason }: StaticLandingFallbackProps) {
  const { t } = useLanguage();
  const { getRoleUrl } = useRoleSubdomain();
  const isPWA = useIsPWA();
  
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

  const navLinks = [
    { to: "/agents", labelKey: "landing.nav_agents", fallback: "AGENT" },
    { to: "/coaches", labelKey: "landing.nav_coaches", fallback: "COACH" },
    { to: "/clubs", labelKey: "landing.nav_clubs", fallback: "CLUB" },
    { to: "/players", labelKey: "landing.nav_players", fallback: "PLAYER" },
    { to: "/scouts", labelKey: "landing.nav_scouts", fallback: "SCOUT" },
    { to: "/media", labelKey: "landing.nav_media", fallback: "MEDIA" },
    { to: "/business", labelKey: "landing.nav_business", fallback: "BUSINESS" },
  ];

  const mobileNavLinks = [
    { to: "/players", labelKey: "landing.nav_players", fallback: "PLAYER" },
    { to: "/coaches", labelKey: "landing.nav_coaches", fallback: "COACH" },
    { to: "/clubs", labelKey: "landing.nav_clubs", fallback: "CLUB" },
    { to: "/agents", labelKey: "landing.nav_agents", fallback: "AGENT" },
    { to: "/scouts", labelKey: "landing.nav_scouts", fallback: "SCOUT" },
    { to: "/business", labelKey: "landing.nav_business", fallback: "BUSINESS" },
    { to: "/media", labelKey: "landing.nav_media", fallback: "MEDIA" },
  ];

  const pwaClass = isPWA ? 'pwa-standalone' : '';

  return (
    <div 
      className={`bg-black flex flex-col items-center justify-between relative ${pwaClass}`}
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100%',
        overflow: 'hidden',
        paddingTop: isPWA ? 'env(safe-area-inset-top, 0px)' : undefined,
        paddingBottom: isPWA ? 'env(safe-area-inset-bottom, 0px)' : undefined,
      }}
    >
      {/* Simple gradient background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15) 0%, transparent 60%), linear-gradient(180deg, #0a0a0a 0%, #000000 100%)',
        }}
      />

      {/* Top Section */}
      <div className="relative z-10 w-full flex flex-col items-center pt-6 md:pt-8">
        {/* Logo */}
        <img 
          src={riseLogoWhite} 
          alt="RISE Football Agency" 
          className="h-[50px] md:h-[70px] w-auto mb-4"
          loading="eager"
        />
        
        {/* Portal & Staff links */}
        <div className="absolute top-6 md:top-8 right-4 flex items-center gap-3">
          <Link to="/staff" className="text-white/30 hover:text-white/60 text-xs font-bebas uppercase tracking-wider transition-colors duration-300">
            {t("header.staff", "Staff")}
          </Link>
          <LocalizedLink to="/portal" className="text-white/30 hover:text-white/60 text-xs font-bebas uppercase tracking-wider transition-colors duration-300">
            {t("header.portal", "Portal")}
          </LocalizedLink>
        </div>
      </div>

      {/* Center Section - Static Player Image */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-lg mx-auto px-4">
        <img 
          src="/assets/player-base.png"
          alt=""
          className="max-h-[50vh] md:max-h-[55vh] w-auto object-contain opacity-90"
          loading="eager"
        />
      </div>

      {/* Bottom Section - Navigation */}
      <div className="relative z-10 w-full pb-6 md:pb-10">
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <nav className="flex items-center justify-center gap-1 mb-4">
            {navLinks.map((link, index) => (
              <div key={link.to} className="flex items-center">
                <button
                  onClick={() => navigateToRole(link.to)}
                  className="px-4 py-2 text-xl font-bebas uppercase tracking-[0.2em] text-white/70 hover:text-primary transition-colors duration-300"
                >
                  <HoverText text={t(link.labelKey, link.fallback)} />
                </button>
                {index < navLinks.length - 1 && (
                  <div className="w-px h-4 bg-primary/30" />
                )}
              </div>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-4">
            <Button
              onClick={() => setShowRepresentation(true)}
              variant="outline"
              className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
              style={{ borderRadius: '20px' }}
            >
              {t("landing.represent_me", "Represent Me")}
            </Button>
            <Button
              onClick={() => setShowDeclareInterest(true)}
              className="btn-shine font-bebas uppercase tracking-wider"
              style={{ borderRadius: '20px' }}
            >
              {t("landing.declare_interest", "Declare Interest In Star")}
            </Button>
          </div>

          {/* Language Selector */}
          <div className="flex justify-center">
            <LanguageMapSelector />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex flex-col items-center gap-2 px-4">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-2">
            <Button
              onClick={() => setShowRepresentation(true)}
              variant="outline"
              size="sm"
              className="font-bebas uppercase tracking-wider border-primary/50 text-primary hover:bg-primary/10 text-xs px-3 h-7"
            >
              {t("landing.represent_me", "Represent Me")}
            </Button>
            <Button
              onClick={() => setShowDeclareInterest(true)}
              size="sm"
              className="btn-shine font-bebas uppercase tracking-wider text-xs px-3 h-7"
            >
              {t("landing.declare_interest_short", "Declare Interest")}
            </Button>
          </div>

          {/* Top row: Players, Coaches, Clubs */}
          <div className="border-t border-primary/30 pt-2 w-full max-w-[280px]">
            <nav className="flex items-center justify-center gap-1">
              {mobileNavLinks.slice(0, 3).map((link, index) => (
                <div key={link.to} className="flex items-center">
                  <button
                    onClick={() => navigateToRole(link.to)}
                    className="px-2 py-0.5 text-[15px] font-bebas uppercase tracking-[0.1em] text-white/70 hover:text-primary transition-colors duration-300"
                  >
                    {t(link.labelKey, link.fallback)}
                  </button>
                  {index < 2 && <div className="w-px h-3 bg-primary/30" />}
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom row: Agents, Scouts, Business, Media */}
          <div className="border-t border-primary/30 pt-2 w-full max-w-[320px]">
            <nav className="flex items-center justify-center gap-1">
              {mobileNavLinks.slice(3).map((link, index) => (
                <div key={link.to} className="flex items-center">
                  <button
                    onClick={() => navigateToRole(link.to)}
                    className="px-2 py-0.5 text-[15px] font-bebas uppercase tracking-[0.1em] text-white/70 hover:text-primary transition-colors duration-300"
                  >
                    {t(link.labelKey, link.fallback)}
                  </button>
                  {index < 3 && <div className="w-px h-3 bg-primary/30" />}
                </div>
              ))}
            </nav>
          </div>

          {/* Language & Select Role */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <LanguageMapSelector />
            <span className="text-[9px] font-bebas uppercase tracking-[0.15em] text-white/30">
              {t("landing.select_role_enter", "Select Your Role To Enter Site")}
            </span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RepresentationDialog open={showRepresentation} onOpenChange={setShowRepresentation} />
      <DeclareInterestPlayerDialog open={showDeclareInterest} onOpenChange={setShowDeclareInterest} starsOnly />
    </div>
  );
}
