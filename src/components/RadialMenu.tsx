import { useLocation, useNavigate } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain, pathToRole } from "@/hooks/useRoleSubdomain";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useIsMobile } from "@/hooks/use-mobile";
import riseLogoBlack from "@/assets/RISEBlack.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import smudgedMarbleBg from "@/assets/black-marble-smudged.png";
import europeMap from "@/assets/europe-outline.gif";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy, Users, Handshake, Briefcase, Search, Calendar, Heart, Package, X, ChevronDown } from "lucide-react";
import { useState, useMemo, useRef } from "react";

interface MenuItem {
  to: string;
  labelKey: string;
  fallback: string;
  Icon: React.ComponentType<{ className?: string }>;
  angle: number; // angle in degrees for positioning
}

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr';

interface LanguageRegion {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  x: number;
  y: number;
}

const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", x: 30, y: 60 },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", x: 29, y: 87 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", x: 25, y: 90 },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", x: 34, y: 73 },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", x: 43, y: 63 },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", x: 43, y: 80 },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", x: 50, y: 62 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", x: 47, y: 70 },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", x: 67, y: 50 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", x: 65, y: 90 },
];

export const RadialMenu = () => {
  const { t, language, switchLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { currentRole, isRoleSubdomain, roleConfigs, getRoleUrl, otherRoles } = useRoleSubdomain();
  const isMobile = useIsMobile();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [hoveredLang, setHoveredLang] = useState<LanguageCode | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const languages = [
    { code: "en" as const, name: "ENG", flag: "🇬🇧" },
    { code: "es" as const, name: "ESP", flag: "🇪🇸" },
    { code: "pt" as const, name: "POR", flag: "🇵🇹" },
    { code: "fr" as const, name: "FRA", flag: "🇫🇷" },
    { code: "de" as const, name: "DEU", flag: "🇩🇪" },
    { code: "it" as const, name: "ITA", flag: "🇮🇹" },
    { code: "pl" as const, name: "POL", flag: "🇵🇱" },
    { code: "cs" as const, name: "ČES", flag: "🇨🇿" },
    { code: "ru" as const, name: "РУС", flag: "🇷🇺" },
    { code: "tr" as const, name: "TÜR", flag: "🇹🇷" },
  ];

  const selectedLanguage = languages.find(l => l.code === language) || languages[0];

  const pathRole = useMemo(() => {
    if (location.pathname.startsWith('/players')) return 'players';
    if (location.pathname.startsWith('/clubs')) return 'clubs';
    if (location.pathname.startsWith('/scouts')) return 'scouts';
    if (location.pathname.startsWith('/agents')) return 'agents';
    if (location.pathname.startsWith('/coaches')) return 'coaches';
    if (location.pathname.startsWith('/media')) return 'media';
    if (location.pathname.startsWith('/business')) return 'business';
    return null;
  }, [location.pathname]);

  const displayRoleKey = selectedRole || currentRole || pathRole;
  const displayRoleLabelKey = displayRoleKey ? `roles.${displayRoleKey}` : 'roles.main';
  const displayRoleFallback = displayRoleKey && roleConfigs[displayRoleKey as keyof typeof roleConfigs]
    ? roleConfigs[displayRoleKey as keyof typeof roleConfigs].name.toUpperCase()
    : 'MAIN';

  const allRoles: Array<{ key: string | null; labelKey: string; fallback: string }> = [
    { key: null, labelKey: "roles.main", fallback: "Main" },
    { key: "players", labelKey: "roles.players", fallback: "Players" },
    { key: "clubs", labelKey: "roles.clubs", fallback: "Clubs" },
    { key: "scouts", labelKey: "roles.scouts", fallback: "Scouts" },
    { key: "agents", labelKey: "roles.agents", fallback: "Agents" },
    { key: "coaches", labelKey: "roles.coaches", fallback: "Coaches" },
    { key: "media", labelKey: "roles.media", fallback: "Media" },
    { key: "business", labelKey: "roles.business", fallback: "Business" },
  ];

  // Role-specific menu configurations
  const roleMenus: Record<string, MenuItem[]> = {
    players: [
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 0 },
      { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 60 },
      { to: "/playersmore", labelKey: "header.what_we_look_for", fallback: "WHAT WE SEEK", Icon: Search, angle: 120 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 180 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 240 },
      { to: "/contact", labelKey: "header.contact", fallback: "REPRESENT ME", Icon: Handshake, angle: 300 },
    ],
    clubs: [
      { to: "/clubs", labelKey: "header.club_direction", fallback: "CLUB SUPPORT", Icon: Target, angle: 0 },
      { to: "/stars", labelKey: "header.stars", fallback: "OUR STARS", Icon: Star, angle: 60 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 120 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 180 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 240 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 300 },
    ],
    agents: [
      { to: "/stars", labelKey: "header.stars", fallback: "OUR STARS", Icon: Star, angle: 0 },
      { to: "/contact", labelKey: "header.collaboration", fallback: "COLLABORATION", Icon: Handshake, angle: 60 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 120 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 180 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 240 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 300 },
    ],
    scouts: [
      { to: "/playersmore", labelKey: "header.what_we_look_for", fallback: "WHAT WE SEEK", Icon: Search, angle: 0 },
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 60 },
      { to: "/scouts", labelKey: "header.jobs", fallback: "OPPORTUNITIES", Icon: Briefcase, angle: 120 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 180 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 240 },
      { to: "/contact", labelKey: "header.work_with_us", fallback: "SCOUT FOR RISE", Icon: Handshake, angle: 300 },
    ],
    coaches: [
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 0 },
      { to: "/potential", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 60 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 120 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 180 },
      { to: "/contact", labelKey: "header.represent_me", fallback: "REPRESENT ME", Icon: Handshake, angle: 240 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 300 },
    ],
    media: [
      { to: "/between-the-lines", labelKey: "header.press_release", fallback: "PRESS", Icon: Newspaper, angle: 0 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 60 },
      { to: "/contact", labelKey: "header.collaboration", fallback: "COLLABORATION", Icon: Heart, angle: 120 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 180 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 240 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 300 },
    ],
    business: [
      { to: "/business", labelKey: "header.packages", fallback: "PACKAGES", Icon: Package, angle: 0 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 60 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 120 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 180 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 240 },
      { to: "/contact", labelKey: "header.connect", fallback: "CONNECT", Icon: MessageCircle, angle: 300 },
    ],
  };

  // Default menu for main site
  const defaultMenu: MenuItem[] = [
    { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 0 },
    { to: "/performance", labelKey: "header.realise_potential", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 72 },
    { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 144 },
    { to: "/news", labelKey: "header.news", fallback: "NEWS", Icon: Newspaper, angle: 216 },
    { to: "/contact", labelKey: "header.contact", fallback: "CONTACT", Icon: MessageCircle, angle: 288 },
  ];

  // Role selection menu items
  const roleMenuItems: MenuItem[] = [
    { to: "/playersmore", labelKey: "roles.players", fallback: "PLAYERS", Icon: Users, angle: 0 },
    { to: "/clubs", labelKey: "roles.clubs", fallback: "CLUBS", Icon: Trophy, angle: 51.4 },
    { to: "/scouts", labelKey: "roles.scouts", fallback: "SCOUTS", Icon: Search, angle: 102.8 },
    { to: "/agents", labelKey: "roles.agents", fallback: "AGENTS", Icon: Briefcase, angle: 154.3 },
    { to: "/coaches", labelKey: "roles.coaches", fallback: "COACHES", Icon: Target, angle: 205.7 },
    { to: "/media", labelKey: "roles.media", fallback: "MEDIA", Icon: Newspaper, angle: 257.1 },
    { to: "/business", labelKey: "roles.business", fallback: "BUSINESS", Icon: Package, angle: 308.5 },
  ];

  // Select menu based on current role or selection mode
  const menuItems = useMemo(() => {
    if (isSelectingRole) {
      return roleMenuItems;
    }
    const activeRole = selectedRole || currentRole;
    if (activeRole && roleMenus[activeRole]) {
      return roleMenus[activeRole];
    }
    return defaultMenu;
  }, [currentRole, selectedRole, isSelectingRole]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Calculate position on circle
  const getCirclePosition = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  // Responsive sizing - scale based on viewport
  const getResponsiveSize = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minDimension = Math.min(vw, vh);
    
    if (isMobile) {
      // Scale based on smaller viewport dimension to ensure everything fits
      const scale = Math.min(minDimension / 400, 1); // 400px as base
      return {
        radius: 110 * scale,
        circleSize: 370 * scale,
        centerSize: 98 * scale,
      };
    }
    
    return {
      radius: 180,
      circleSize: 600,
      centerSize: 160, // md:w-40 = 160px
    };
  };

  const { radius, circleSize, centerSize } = getResponsiveSize();
  const segmentAngle = 360 / menuItems.length;

  // Language subdomains that take priority over role subdomains
  const languageSubdomains = ['es', 'pt', 'fr', 'de', 'it', 'pl', 'cs', 'cz', 'ru', 'tr'];
  
  const isOnLanguageSubdomain = (): boolean => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return false;
    }
    
    let subdomain = '';
    if (parts[0].toLowerCase() === 'www' && parts.length >= 4) {
      subdomain = parts[1].toLowerCase();
    } else if (parts[0].toLowerCase() !== 'www' && parts.length >= 3) {
      subdomain = parts[0].toLowerCase();
    }
    
    return languageSubdomains.includes(subdomain);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] overflow-hidden touch-none overscroll-none">
      {/* Marble background - delayed */}
      <div 
        className="absolute inset-0 animate-[fade-in_0.4s_ease-out_0.2s_both]"
        style={{
          backgroundImage: `url(${smudgedMarbleBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* White pulse animation from center - delayed */}
      <div className="absolute inset-0 flex items-center justify-center animate-[fade-in_0.3s_ease-out_0.3s_both]">
        <div className="absolute w-4 h-4 bg-white rounded-full animate-[pulse-expand_6s_ease-out_infinite]" />
      </div>
      {/* Grid pattern background - delayed */}
      <div 
        className="absolute inset-0 opacity-20 animate-[fade-in_0.4s_ease-out_0.25s_both]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Radial gradient overlay - delayed */}
      <div 
        className="absolute inset-0 animate-[fade-in_0.4s_ease-out_0.2s_both]"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)',
        }}
      />

      {/* Close button - top left - delayed */}
      <DrawerClose asChild>
        <button
          ref={closeButtonRef}
          className="fixed top-8 left-8 z-[250] group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white animate-[fade-in_0.3s_ease-out_0.35s_both]"
          aria-label="Close menu"
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out" />
            <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 ease-out" />
            <X className="h-8 w-8 text-white relative z-10 transition-all duration-300 group-hover:text-primary group-hover:rotate-90" />
          </div>
        </button>
      </DrawerClose>

      {/* Main radial menu container */}
      <div className="relative" style={{
        width: `${circleSize}px`,
        height: `${circleSize}px`,
      }}>
        {/* Segment dividers - delayed */}
        {menuItems.map((_, index) => {
          const angle = index * segmentAngle;
          
          return (
            <div
              key={`divider-${index}`}
              className="absolute top-1/2 left-1/2 origin-left h-[1px] bg-black pointer-events-none animate-[fade-in_0.3s_ease-out_both]"
              style={{
                width: `${circleSize / 2.2}px`,
                transform: `rotate(${angle}deg)`,
                animationDelay: `${0.15 + index * 0.03}s`,
              }}
            />
          );
        })}

        {/* Single SVG for all segment paths */}
        <svg
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <defs>
            <pattern id="whiteMarblePattern" patternUnits="userSpaceOnUse" width="1200" height="1200" x="-300" y="-300">
              <image href={whiteMarbleBg} width="1200" height="1200" />
            </pattern>
          </defs>
          {menuItems.map((item, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const hovered = hoveredItem === index;

            return (
              <path
                key={`path-${item.to}-${index}`}
                d={`
                  M ${circleSize / 2} ${circleSize / 2}
                  L ${circleSize / 2 + (circleSize / 2.2) * Math.cos((startAngle * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin((startAngle * Math.PI) / 180)}
                  A ${circleSize / 2.2} ${circleSize / 2.2} 0 0 1 ${circleSize / 2 + (circleSize / 2.2) * Math.cos(((endAngle) * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin(((endAngle) * Math.PI) / 180)}
                  Z
                `}
                fill={hovered ? "url(#whiteMarblePattern)" : "rgba(128,128,128,0.1)"}
                className="transition-colors duration-200 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                onTouchStart={() => setHoveredItem(index)}
                onClick={() => {
                  // Check if this path maps to a role subdomain
                  const role = pathToRole[item.to];
                  
                  if (role) {
                    // If on a language subdomain, stay on it and use localized route
                    if (isOnLanguageSubdomain()) {
                      navigate(item.to);
                      closeButtonRef.current?.click();
                    } else {
                      // Navigate to subdomain for role pages
                      const url = getRoleUrl(role);
                      if (url.startsWith('http')) {
                        window.location.href = url;
                      } else {
                        navigate(url);
                        closeButtonRef.current?.click();
                      }
                    }
                  } else if (isSelectingRole) {
                    // Non-role item in role selection mode - shouldn't happen but handle gracefully
                    setIsSelectingRole(false);
                    navigate(item.to);
                    closeButtonRef.current?.click();
                  } else {
                    // Regular navigation for non-role pages
                    navigate(item.to);
                    closeButtonRef.current?.click();
                  }
                }}
              />
            );
          })}
        </svg>

        {/* Icons and labels positioned separately - delayed after center */}
        {menuItems.map((item, index) => {
          const centerAngle = index * segmentAngle + segmentAngle / 2;
          const hovered = hoveredItem === index;
          const pos = getCirclePosition(centerAngle, radius);

          return (
            <div
              key={`label-${item.to}-${index}`}
              className="absolute pointer-events-none animate-[fade-in_0.25s_ease-out_both]"
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${0.12 + index * 0.04}s`,
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${isMobile ? centerSize * 0.35 : centerSize * 0.4}px`,
                    height: `${isMobile ? centerSize * 0.35 : centerSize * 0.4}px`,
                    marginBottom: `${isMobile ? centerSize * 0.02 : centerSize * 0.05}px`,
                  }}
                >
                  <div 
                    className={`transition-colors duration-300 ${hovered ? 'text-black' : 'text-white/70'}`}
                    style={{
                      width: `${isMobile ? centerSize * 0.28 : centerSize * 0.2}px`,
                      height: `${isMobile ? centerSize * 0.28 : centerSize * 0.2}px`,
                    }}
                  >
                    <item.Icon className="w-full h-full" />
                  </div>
                </div>

                <span
                  className={`font-bebas tracking-[0.15em] transition-all duration-300 text-center leading-tight ${hovered ? 'text-black' : 'text-white/60'}`}
                  style={{ 
                    fontSize: `${isMobile ? centerSize * 0.12 : centerSize * 0.0875}px`,
                    maxWidth: isMobile ? `${centerSize * 0.5}px` : 'none',
                    whiteSpace: isMobile ? 'normal' : 'nowrap',
                  }}
                >
                  {t(item.labelKey, item.fallback)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Center circle with logo - LOADS FIRST */}
        <div 
          className="absolute rounded-full flex flex-col items-center justify-center z-20 border-4 border-black overflow-hidden animate-[scale-in_0.25s_ease-out_both]"
          style={{
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            top: `calc(50% - ${centerSize / 2}px)`,
            left: `calc(50% - ${centerSize / 2}px)`,
          }}
        >
          {/* Upper 75% with white marble */}
          <div
            className="absolute top-0 left-0 w-full h-[75%]"
            style={{
              backgroundImage: `url(${whiteMarbleBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Gold divider line */}
          <div className="absolute left-0 w-full h-[2px] bg-primary z-10" style={{ top: '75%' }} />
          
          {/* Lower 25% with smudged marble */}
          <div 
            className="absolute bottom-0 left-0 w-full h-[25%]"
            style={{
              backgroundImage: `url(${smudgedMarbleBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Logo */}
          <img
            src={riseLogoBlack}
            alt="RISE"
            className="mb-1 relative z-20"
            style={{ 
              width: `${centerSize * 0.9}px`,
              height: `${centerSize * 0.9}px`,
              transform: `translate(-2px, ${isMobile ? -centerSize * 0.06 + 7 - 3 : -centerSize * 0.13 + 7}px)` 
            }}
          />
          
          {/* Gold divider between logo and dropdown */}
          <div 
            className="absolute left-0 w-full h-[2px] bg-primary z-30"
            style={{ top: 'calc(55% - 1px)' }}
          />
          
          {/* Role/Menu selection button */}
          <div
            className="text-center relative z-20 w-full flex items-center justify-center"
            style={{ 
              transform: `translateY(${isMobile ? (-centerSize * 0.28 - 4 + 1) : (-centerSize * 0.3125)}px)` 
            }}
          >
            <button
              onClick={() => setIsSelectingRole(!isSelectingRole)}
              className="font-bebas tracking-[0.05em] transition-colors duration-300 focus:outline-none w-full"
              style={{ 
                fontSize: `${isMobile ? centerSize * 0.22 : centerSize * 0.1875}px`,
                ...(isSelectingRole ? { color: 'hsl(var(--primary))' } : {})
              }}
            >
              <span className={isSelectingRole ? '' : 'text-black hover:text-primary transition-colors'}>{isSelectingRole ? t('menu.role', 'ROLE') : t(displayRoleLabelKey, displayRoleFallback).toUpperCase()}</span>
            </button>
          </div>
          
          {/* Language selector in lower half */}
          <div 
            className="absolute z-20" 
            style={{ 
              bottom: isMobile ? `${centerSize * 0.06 - 7 - 2}px` : `${centerSize * 0.04375 - 2}px`,
              left: '50%',
              transform: isMobile ? 'translateX(calc(-50% + 4px))' : 'translateX(calc(-50% + 3px))'
            }}
          >
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-1 font-bebas uppercase tracking-wider text-primary hover:text-primary/80 transition-all duration-300 focus:outline-none"
              style={{ fontSize: `${isMobile ? centerSize * 0.165 * 0.7 : centerSize * 0.09375}px` }}
            >
              <span style={{ fontSize: `${isMobile ? centerSize * 0.225 * 0.7 : centerSize * 0.13125}px` }}>{selectedLanguage.flag}</span>
              <span>{selectedLanguage.name}</span>
              <ChevronDown 
                className="transition-transform duration-300"
                style={{
                  width: `${isMobile ? centerSize * 0.18 * 0.7 : centerSize * 0.1171875}px`,
                  height: `${isMobile ? centerSize * 0.18 * 0.7 : centerSize * 0.1171875}px`,
                  transform: showMap ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>
          </div>
        </div>

      </div>


      {/* Map overlay - positioned relative to the fixed container */}
      {showMap && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowMap(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/95" />
          
          {/* Content */}
          <div 
            className="relative bg-black/95 border border-primary/30 max-w-4xl w-full mx-4 overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="absolute right-4 top-4 z-10 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative w-full aspect-[16/10]">
              {/* Europe Map Image */}
              <img 
                src={europeMap} 
                alt="Europe Map"
                className="absolute inset-0 w-full h-full object-contain opacity-60"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
              
              {/* Language markers */}
              {languageRegions.map((region) => {
                const isSelected = language === region.code;
                const isHovered = hoveredLang === region.code;
                
                return (
                  <button
                    key={region.code}
                    type="button"
                    onClick={() => {
                      switchLanguage(region.code);
                      setShowMap(false);
                    }}
                    onMouseEnter={() => setHoveredLang(region.code)}
                    onMouseLeave={() => setHoveredLang(null)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ 
                      left: `${region.x}%`, 
                      top: `${region.y}%`,
                      zIndex: isHovered || isSelected ? 20 : 10
                    }}
                  >
                    {/* Pulse animation for selected */}
                    {isSelected && (
                      <span className="absolute inset-0 -m-2 rounded-full bg-primary/30 animate-ping" />
                    )}
                    
                    {/* Marker dot */}
                    <span 
                      className={`
                        relative flex items-center justify-center
                        w-10 h-10 md:w-12 md:h-12 rounded-full
                        transition-all duration-300 cursor-pointer
                        ${isSelected 
                          ? 'bg-primary text-black scale-110 shadow-lg shadow-primary/50' 
                          : isHovered 
                            ? 'bg-primary/80 text-black scale-105' 
                            : 'bg-black/80 border-2 border-primary/50 text-white hover:bg-primary/20'
                        }
                      `}
                    >
                      <span className="text-xl md:text-2xl">{region.flag}</span>
                    </span>
                    
                    {/* Label */}
                    <span 
                      className={`
                        absolute left-1/2 -translate-x-1/2 top-full mt-1
                        whitespace-nowrap text-xs md:text-sm font-bebas uppercase tracking-wider
                        px-2 py-0.5 rounded bg-black/80
                        transition-all duration-300
                        ${isSelected || isHovered ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-white/70'}
                      `}
                    >
                      {region.nativeName}
                    </span>
                  </button>
                );
              })}
              
              {/* Title */}
              <div className="absolute top-4 left-0 right-0 text-center">
                <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-[0.3em] text-primary">
                  Select Language
                </h3>
                <p className="text-xs text-white/50 font-bebas tracking-wider mt-1">
                  Click a country to switch
                </p>
              </div>
              
              {/* Current selection indicator */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-sm font-bebas uppercase tracking-wider text-white/60">
                  Current: <span className="text-primary">{languageRegions.find(l => l.code === language)?.flag} {languageRegions.find(l => l.code === language)?.nativeName}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
