import { Link, useLocation } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain } from "@/hooks/useRoleSubdomain";
import riseLogoWhite from "@/assets/logo.png";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy } from "lucide-react";
import { useState } from "react";

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

  // Main menu items arranged in a circle (7 items equally spaced)
  const mainMenuItems: MenuItem[] = [
    { to: "/", labelKey: "header.home", fallback: "HOME", Icon: Home, angle: -90 }, // top
    { to: "/stars", labelKey: "header.stars", fallback: "STARS", Icon: Star, angle: -38.6 },
    { to: "/performance", labelKey: "header.realise_potential", fallback: "PERFORMANCE", Icon: TrendingUp, angle: 12.9 },
    { to: "/between-the-lines", labelKey: "header.between_the_lines", fallback: "INSIGHTS", Icon: BookOpen, angle: 64.3 },
    { to: "/news", labelKey: "header.news", fallback: "NEWS", Icon: Newspaper, angle: 115.7 },
    { to: "/contact", labelKey: "header.contact", fallback: "CONTACT", Icon: MessageCircle, angle: 167.1 },
    { to: "/potential", labelKey: "header.potential", fallback: "VISION", Icon: Target, angle: 218.6 },
  ];

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

  const radius = 320; // Distance from center

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[200] overflow-hidden">
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

      {/* Central circle with logo */}
      <div className="relative">
        {/* Center circle */}
        <div className="w-44 h-44 md:w-56 md:h-56 rounded-full bg-white flex flex-col items-center justify-center shadow-[0_0_80px_rgba(212,175,55,0.4)] relative z-10">
          <img src={riseLogoWhite} alt="RISE" className="w-20 h-20 md:w-24 md:h-24 mb-3 brightness-0" />
          <div className="text-center">
            <p className="text-black font-bebas text-xl md:text-2xl tracking-[0.25em]">
              {isRoleSubdomain && currentRole 
                ? roleConfigs[currentRole].name.toUpperCase()
                : "MENU"
              }
            </p>
          </div>
        </div>

        {/* Radial menu items */}
        {mainMenuItems.map((item) => {
          const pos = getCirclePosition(item.angle, radius);
          const active = isActive(item.to);
          const hovered = hoveredItem === item.to;
          
          return (
            <DrawerClose key={item.to} asChild>
              <Link
                to={item.to}
                className="absolute group flex flex-col items-center justify-center transition-all duration-500 ease-out"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => setHoveredItem(item.to)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Icon background circle */}
                <div className={`
                  w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ease-out relative
                  ${active || hovered 
                    ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-110' 
                    : 'bg-black/30 border-2 border-primary/50'
                  }
                `}>
                  <item.Icon className={`
                    w-9 h-9 md:w-11 md:h-11 transition-all duration-500 ease-out
                    ${active || hovered ? 'text-black scale-110' : 'text-primary'}
                  `} />
                  
                  {/* Glow effect on hover/active */}
                  {(active || hovered) && (
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`
                  font-bebas text-base md:text-lg tracking-[0.2em] whitespace-nowrap transition-all duration-500 ease-out text-center
                  ${active || hovered ? 'text-white scale-105' : 'text-primary/80'}
                `}>
                  {t(item.labelKey, item.fallback)}
                </span>
              </Link>
            </DrawerClose>
          );
        })}
      </div>
    </div>
  );
};
