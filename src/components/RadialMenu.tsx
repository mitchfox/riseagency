import { useLocation, useNavigate } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain } from "@/hooks/useRoleSubdomain";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import riseLogoBlack from "@/assets/RISEBlack.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import smudgedMarbleBg from "@/assets/black-marble-smudged.png";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy, Users, Handshake, Briefcase, Search, Calendar, Heart, Package, X, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";

interface MenuItem {
  to: string;
  labelKey: string;
  fallback: string;
  Icon: React.ComponentType<{ className?: string }>;
  angle: number; // angle in degrees for positioning
}

export const RadialMenu = () => {
  const { t, language, switchLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { currentRole, isRoleSubdomain, roleConfigs, getRoleUrl, otherRoles } = useRoleSubdomain();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

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

  const displayRoleKey = currentRole ?? pathRole;
  const displayRoleName =
    displayRoleKey && roleConfigs[displayRoleKey as keyof typeof roleConfigs]
      ? roleConfigs[displayRoleKey as keyof typeof roleConfigs].name.toUpperCase()
      : 'MAIN';

  const allRoles: Array<{ key: string | null; name: string }> = [
    { key: null, name: "Main" },
    { key: "players", name: "Players" },
    { key: "clubs", name: "Clubs" },
    { key: "scouts", name: "Scouts" },
    { key: "agents", name: "Agents" },
    { key: "coaches", name: "Coaches" },
    { key: "media", name: "Media" },
    { key: "business", name: "Business" },
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

  // Select menu based on current role
  const menuItems = useMemo(() => {
    if (currentRole && roleMenus[currentRole]) {
      return roleMenus[currentRole];
    }
    return defaultMenu;
  }, [currentRole]);

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

  const radius = 180; // Distance from center
  const circleSize = 600; // Main circle diameter

  const segmentAngle = 360 / menuItems.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] overflow-hidden">
      {/* Marble background */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${smudgedMarbleBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* White pulse animation from center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-4 h-4 bg-white rounded-full animate-[pulse-expand_6s_ease-out_infinite]" />
      </div>
      {/* Grid pattern background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Radial gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)',
        }}
      />

      {/* Close button - top left */}
      <DrawerClose asChild>
        <button
          className="absolute top-8 left-8 z-50 group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
      <div className="relative">
        {/* Segment dividers */}
        {menuItems.map((_, index) => {
          const angle = index * segmentAngle;
          
          return (
            <div
              key={`divider-${index}`}
              className="absolute top-1/2 left-1/2 origin-left h-[1px] bg-black pointer-events-none"
              style={{
                width: `${circleSize / 2.2}px`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {/* Single SVG for all segment paths */}
        <svg
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
          }}
        >
          {menuItems.map((item, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const hovered = hoveredItem === index;

            return (
              <DrawerClose key={`path-${item.to}-${index}`} asChild>
                <path
                  d={`
                    M ${circleSize / 2} ${circleSize / 2}
                    L ${circleSize / 2 + (circleSize / 2.2) * Math.cos((startAngle * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin((startAngle * Math.PI) / 180)}
                    A ${circleSize / 2.2} ${circleSize / 2.2} 0 0 1 ${circleSize / 2 + (circleSize / 2.2) * Math.cos(((endAngle) * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin(((endAngle) * Math.PI) / 180)}
                    Z
                  `}
                  fill={hovered ? "rgba(255,255,255,1)" : "rgba(128,128,128,0.1)"}
                  className="transition-colors duration-200 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onMouseEnter={() => setHoveredItem(index)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => navigate(item.to)}
                />
              </DrawerClose>
            );
          })}
        </svg>

        {/* Icons and labels positioned separately */}
        {menuItems.map((item, index) => {
          const centerAngle = index * segmentAngle + segmentAngle / 2;
          const hovered = hoveredItem === index;
          const pos = getCirclePosition(centerAngle, radius);

          return (
            <div
              key={`label-${item.to}-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300">
                  <item.Icon
                    className={`
                      w-7 h-7 md:w-8 md:h-8 transition-colors duration-300
                      ${hovered ? 'text-black' : 'text-white/70'}
                    `}
                  />
                </div>

                <span
                  className={`
                    font-bebas text-xs md:text-sm tracking-[0.2em] whitespace-nowrap transition-all duration-300 text-center
                    ${hovered ? 'text-black' : 'text-white/60'}
                  `}
                >
                  {t(item.labelKey, item.fallback)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Center circle with logo */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center z-20 border-4 border-black overflow-hidden"
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
            className="w-28 h-28 md:w-36 md:h-36 mb-1 relative z-20"
            style={{ transform: 'translateY(-13px)' }}
          />
          
          {/* Gold divider between logo and dropdown */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-16 h-[1px] bg-primary z-20"
            style={{ top: '55%' }}
          />
          
          {/* Role/Menu dropdown button */}
          <div
            className="text-center relative z-20"
            style={{ transform: 'translateY(-51px)' }}
          >
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center justify-center gap-1 text-black font-bebas text-2xl md:text-3xl tracking-[0.05em] hover:text-primary transition-colors duration-300 focus:outline-none"
            >
              <span>{displayRoleName}</span>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showRoleDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {/* Language selector in lower half */}
          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: '7px' }}>
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-1 text-[10px] font-bebas uppercase tracking-wider text-primary hover:text-primary/80 transition-all duration-300 focus:outline-none"
            >
              <span className="text-sm">{selectedLanguage.flag}</span>
              <span>{selectedLanguage.name}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${showMap ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Role dropdown menu - positioned outside overflow-hidden container */}
        {showRoleDropdown && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-24 bg-background border border-primary/30 rounded-lg shadow-lg min-w-[140px] z-[100]">
            {allRoles.map((role) => (
              <a
                key={role.key || 'main'}
                href={role.key ? getRoleUrl(role.key as any) : '/'}
                className={`block px-4 py-2 text-sm font-bebas uppercase tracking-wider transition-colors ${
                  (displayRoleKey === role.key) || (!displayRoleKey && !role.key)
                    ? "text-primary bg-primary/10"
                    : "text-foreground hover:bg-foreground/5 hover:text-primary"
                }`}
                onClick={() => setShowRoleDropdown(false)}
              >
                {role.name}
              </a>
            ))}
          </div>
        )}

      </div>

      {/* Map overlay - positioned relative to the fixed container */}
      {showMap && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm">
          {/* Close map button */}
          <button
            onClick={() => setShowMap(false)}
            className="absolute top-8 right-8 z-40 group flex items-center justify-center focus:outline-none"
          >
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out" />
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 ease-out" />
              <X className="h-8 w-8 text-white relative z-10 transition-all duration-300 group-hover:text-primary group-hover:rotate-90" />
            </div>
          </button>

          {/* Language selector grid */}
          <div className="absolute top-8 left-8 z-40 grid grid-cols-5 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`flex flex-col items-center gap-1 p-2 rounded transition-colors ${
                  language === lang.code
                    ? "bg-primary/20 text-primary"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-[10px] font-bebas uppercase tracking-wider">{lang.name}</span>
              </button>
            ))}
          </div>

          {/* Map */}
          <div className="absolute inset-x-0 bottom-0 top-20">
            <ScoutingNetworkMap />
          </div>
        </div>
      )}
    </div>
  );
};
