import { Link, useLocation } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain } from "@/hooks/useRoleSubdomain";
import riseLogoWhite from "@/assets/logo.png";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy, Users, Handshake, Briefcase, Search, Calendar, Heart, Package } from "lucide-react";
import { useState, useMemo } from "react";

interface MenuItem {
  to: string;
  labelKey: string;
  fallback: string;
  Icon: React.ComponentType<{ className?: string }>;
  angle: number; // angle in degrees for positioning
}

export const RadialMenu = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const { currentRole, isRoleSubdomain, roleConfigs } = useRoleSubdomain();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Role-specific menu configurations
  const roleMenus: Record<string, MenuItem[]> = {
    players: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: -38.6 },
      { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 12.9 },
      { to: "/playersmore", labelKey: "header.what_we_look_for", fallback: "WHAT WE SEEK", Icon: Search, angle: 64.3 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 115.7 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 167.1 },
      { to: "/contact", labelKey: "header.contact", fallback: "REPRESENT ME", Icon: Handshake, angle: 218.6 },
    ],
    clubs: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/clubs", labelKey: "header.club_direction", fallback: "CLUB SUPPORT", Icon: Target, angle: -38.6 },
      { to: "/stars", labelKey: "header.stars", fallback: "OUR STARS", Icon: Star, angle: 12.9 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 64.3 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 115.7 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 167.1 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 218.6 },
    ],
    agents: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/stars", labelKey: "header.stars", fallback: "OUR STARS", Icon: Star, angle: -38.6 },
      { to: "/contact", labelKey: "header.collaboration", fallback: "COLLABORATION", Icon: Handshake, angle: 12.9 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 64.3 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 115.7 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 167.1 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 218.6 },
    ],
    scouts: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/playersmore", labelKey: "header.what_we_look_for", fallback: "WHAT WE SEEK", Icon: Search, angle: -38.6 },
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 12.9 },
      { to: "/scouts", labelKey: "header.jobs", fallback: "OPPORTUNITIES", Icon: Briefcase, angle: 64.3 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 115.7 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 167.1 },
      { to: "/contact", labelKey: "header.work_with_us", fallback: "SCOUT FOR RISE", Icon: Handshake, angle: 218.6 },
    ],
    coaches: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: -38.6 },
      { to: "/potential", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 12.9 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 64.3 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 115.7 },
      { to: "/contact", labelKey: "header.represent_me", fallback: "REPRESENT ME", Icon: Handshake, angle: 167.1 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 218.6 },
    ],
    media: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/between-the-lines", labelKey: "header.press_release", fallback: "PRESS", Icon: Newspaper, angle: -38.6 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 12.9 },
      { to: "/contact", labelKey: "header.collaboration", fallback: "COLLABORATION", Icon: Heart, angle: 64.3 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 115.7 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 167.1 },
      { to: "/contact", labelKey: "header.arrange_meeting", fallback: "ARRANGE MEETING", Icon: Calendar, angle: 218.6 },
    ],
    business: [
      { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
      { to: "/business", labelKey: "header.packages", fallback: "PACKAGES", Icon: Package, angle: -38.6 },
      { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: 12.9 },
      { to: "/performance", labelKey: "header.performance", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 64.3 },
      { to: "/contact", labelKey: "header.declare_interest", fallback: "DECLARE INTEREST", Icon: Users, angle: 115.7 },
      { to: "/between-the-lines", labelKey: "header.insights", fallback: "INSIGHTS", Icon: BookOpen, angle: 167.1 },
      { to: "/contact", labelKey: "header.connect", fallback: "CONNECT", Icon: MessageCircle, angle: 218.6 },
    ],
  };

  // Default menu for main site
  const defaultMenu: MenuItem[] = [
    { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 },
    { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: -38.6 },
    { to: "/performance", labelKey: "header.realise_potential", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 12.9 },
    { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 64.3 },
    { to: "/news", labelKey: "header.news", fallback: "NEWS", Icon: Newspaper, angle: 115.7 },
    { to: "/contact", labelKey: "header.contact", fallback: "CONTACT", Icon: MessageCircle, angle: 167.1 },
    { to: "/potential", labelKey: "header.potential", fallback: "VISION", Icon: Target, angle: 218.6 },
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

  const radius = 200; // Distance from center
  const circleSize = 500; // Main circle diameter

  const segmentAngle = 360 / menuItems.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] overflow-hidden bg-[#0a0a0a]">
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
          className="absolute top-8 left-8 z-50 group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12"
          aria-label="Close menu"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-8 w-8 text-primary group-hover:text-white transition-colors duration-300"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </DrawerClose>

      {/* Main radial menu container */}
      <div className="relative">
        {/* Semi-transparent grey circle */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full backdrop-blur-sm border border-primary/20" 
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
          }}
        />

        {/* Segment dividers */}
        {menuItems.map((item, index) => {
          const angle = item.angle;
          
          return (
            <div
              key={`divider-${index}`}
              className="absolute top-1/2 left-1/2 origin-left h-[1px] bg-primary/30 pointer-events-none"
              style={{
                width: `${circleSize / 2}px`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {/* Segment hover slices and content */}
        {menuItems.map((item, index) => {
          const hovered = hoveredItem === item.to;
          const startAngle = item.angle - segmentAngle / 2;
          const pos = getCirclePosition(item.angle, radius);
          
          return (
            <DrawerClose key={`slice-${item.to}`} asChild>
              <Link
                to={item.to}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                onMouseEnter={() => setHoveredItem(item.to)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`,
                }}
              >
                {/* White segment on hover */}
                <svg 
                  viewBox={`0 0 ${circleSize} ${circleSize}`}
                  className="w-full h-full transition-opacity duration-300 absolute inset-0"
                  style={{ 
                    opacity: hovered ? 1 : 0,
                  }}
                >
                  <defs>
                    <filter id={`glow-${index}`}>
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d={`
                      M ${circleSize / 2} ${circleSize / 2}
                      L ${circleSize / 2 + (circleSize / 2.2) * Math.cos((startAngle * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin((startAngle * Math.PI) / 180)}
                      A ${circleSize / 2.2} ${circleSize / 2.2} 0 0 1 ${circleSize / 2 + (circleSize / 2.2) * Math.cos(((startAngle + segmentAngle) * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin(((startAngle + segmentAngle) * Math.PI) / 180)}
                      Z
                    `}
                    fill="rgba(255, 255, 255, 1)"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="2"
                    filter={`url(#glow-${index})`}
                  />
                </svg>
                
                {/* Icon and label positioned on segment */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className={`
                      w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                    `}>
                      <item.Icon className={`
                        w-7 h-7 md:w-8 md:h-8 transition-colors duration-300
                        ${hovered ? 'text-black' : 'text-white/70'}
                      `} />
                    </div>
                    
                    <span className={`
                      font-bebas text-xs md:text-sm tracking-[0.2em] whitespace-nowrap transition-all duration-300 text-center
                      ${hovered ? 'text-black' : 'text-white/60'}
                    `}>
                      {t(item.labelKey, item.fallback)}
                    </span>
                  </div>
                </div>
              </Link>
            </DrawerClose>
          );
        })}

        {/* Center circle with logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-36 md:h-36 rounded-full bg-white flex flex-col items-center justify-center shadow-[0_0_60px_rgba(212,175,55,0.3)] z-20 border-4 border-black">
          <img src={riseLogoWhite} alt="RISE" className="w-14 h-14 md:w-16 md:h-16 mb-2 brightness-0" />
          <div className="text-center">
            <p className="text-black font-bebas text-base md:text-lg tracking-[0.25em]">
              {isRoleSubdomain && currentRole 
                ? roleConfigs[currentRole].name.toUpperCase()
                : "MENU"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
