import { Link, useLocation } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain } from "@/hooks/useRoleSubdomain";
import riseLogoBlack from "@/assets/RISEBlack.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy, Users, Handshake, Briefcase, Search, Calendar, Heart, Package, X } from "lucide-react";
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
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

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
    { to: "/performance", labelKey: "header.realise_potential", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 60 },
    { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 120 },
    { to: "/news", labelKey: "header.news", fallback: "NEWS", Icon: Newspaper, angle: 180 },
    { to: "/contact", labelKey: "header.contact", fallback: "CONTACT", Icon: MessageCircle, angle: 240 },
    { to: "/potential", labelKey: "header.potential", fallback: "VISION", Icon: Target, angle: 300 },
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

  const radius = 220; // Distance from center
  const circleSize = 600; // Main circle diameter

  const segmentAngle = 360 / menuItems.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] overflow-hidden bg-[#0a0a0a]">
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
          className="absolute top-8 left-8 z-50 group flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all duration-300 ease-out"
          aria-label="Close menu"
        >
          <X className="h-8 w-8 text-white group-hover:text-primary transition-colors duration-300" />
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
              className="absolute top-1/2 left-1/2 origin-left h-[1px] bg-primary/30 pointer-events-none"
              style={{
                width: `${circleSize / 2}px`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {/* Segment slices */}
        {menuItems.map((item, index) => {
          const startAngle = index * segmentAngle;
          const endAngle = startAngle + segmentAngle;
          const hovered = hoveredItem === index;

          return (
            <svg
              key={`slice-${item.to}`}
              viewBox={`0 0 ${circleSize} ${circleSize}`}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
              }}
            >
              <path
                d={`
                  M ${circleSize / 2} ${circleSize / 2}
                  L ${circleSize / 2 + (circleSize / 2.2) * Math.cos((startAngle * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin((startAngle * Math.PI) / 180)}
                  A ${circleSize / 2.2} ${circleSize / 2.2} 0 0 1 ${circleSize / 2 + (circleSize / 2.2) * Math.cos(((endAngle) * Math.PI) / 180)} ${circleSize / 2 + (circleSize / 2.2) * Math.sin(((endAngle) * Math.PI) / 180)}
                  Z
                `}
                fill={hovered ? "rgba(255,255,255,1)" : "rgba(128,128,128,0.1)"}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
            </svg>
          );
        })}

        {/* Icons and labels positioned on segments */}
        {menuItems.map((item, index) => {
          const startAngle = index * segmentAngle;
          const centerAngle = startAngle + segmentAngle / 2;
          const hovered = hoveredItem === index;
          const pos = getCirclePosition(centerAngle, radius);

          return (
            <DrawerClose key={`label-${item.to}`} asChild>
              <Link
                to={item.to}
                className="absolute pointer-events-auto cursor-pointer group"
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="flex flex-col items-center justify-center">
                  <div
                    className={`
                      w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                    `}
                  >
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
              </Link>
            </DrawerClose>
          );
        })}

        {/* Center circle with logo */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center z-20 border-4 border-black"
          style={{
            backgroundImage: `url(${whiteMarbleBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img
            src={riseLogoBlack}
            alt="RISE"
            className="w-28 h-28 md:w-36 md:h-36 mb-1"
            style={{ transform: 'translateY(-10px)' }}
          />
          <div
            className="text-center"
            style={{ transform: 'translateY(-33px)' }}
          >
            <p className="text-black font-bebas text-2xl md:text-3xl tracking-[0.05em]">
              {currentRole && roleConfigs[currentRole]
                ? roleConfigs[currentRole].name.toUpperCase()
                : "MENU"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
