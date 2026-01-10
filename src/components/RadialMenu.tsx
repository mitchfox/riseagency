import { useLocation, useNavigate } from "react-router-dom";
import { DrawerClose } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useRoleSubdomain, pathToRole } from "@/hooks/useRoleSubdomain";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSubdomainInfo } from "@/lib/subdomainUtils";
import riseLogoBlack from "@/assets/RISEBlack.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import smudgedMarbleBg from "@/assets/black-marble-smudged.png";
import europeMap from "@/assets/europe-outline.gif";
import { Home, Star, TrendingUp, BookOpen, Newspaper, MessageCircle, Target, Trophy, Users, Handshake, Briefcase, Search, Calendar, Heart, Package, X, ChevronDown, Sparkles, Route } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { StarsQuadrantCard } from "@/components/radial-menu/StarsQuadrantCard";
import { NewsQuadrantCard } from "@/components/radial-menu/NewsQuadrantCard";
import { PerformanceQuadrantCard, InsightsQuadrantCard, ContactQuadrantCard, YouthQuadrantCard, JourneyQuadrantCard, WhatWeLookForQuadrantCard } from "@/components/radial-menu/SimpleQuadrantCard";
import { calculateContentPlacement } from "@/lib/wedgeGeometry";

export type QuadrantPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface QuadrantCardProps {
  maxWidth?: number;
  maxHeight?: number;
  align?: 'left' | 'right' | 'center';
}

interface MenuItem {
  to: string;
  labelKey: string;
  fallback: string;
  Icon: React.ComponentType<{ className?: string }>;
  angle: number;
  quadrantCard?: {
    position: QuadrantPosition;
    component: React.ComponentType<QuadrantCardProps>;
  };
}

type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'pl' | 'cs' | 'ru' | 'tr' | 'hr' | 'no';

interface LanguageRegion {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flagCode: string;
  x: number;
  y: number;
}

const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

const languageRegions: LanguageRegion[] = [
  { code: "en", name: "English", nativeName: "English", flagCode: "gb", x: 30, y: 60 },
  { code: "es", name: "Spanish", nativeName: "Español", flagCode: "es", x: 29, y: 87 },
  { code: "pt", name: "Portuguese", nativeName: "Português", flagCode: "pt", x: 25, y: 90 },
  { code: "fr", name: "French", nativeName: "Français", flagCode: "fr", x: 34, y: 73 },
  { code: "de", name: "German", nativeName: "Deutsch", flagCode: "de", x: 43, y: 63 },
  { code: "it", name: "Italian", nativeName: "Italiano", flagCode: "it", x: 43, y: 80 },
  { code: "pl", name: "Polish", nativeName: "Polski", flagCode: "pl", x: 50, y: 62 },
  { code: "cs", name: "Czech", nativeName: "Čeština", flagCode: "cz", x: 47, y: 70 },
  { code: "ru", name: "Russian", nativeName: "Русский", flagCode: "ru", x: 67, y: 50 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flagCode: "tr", x: 65, y: 90 },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", flagCode: "hr", x: 46, y: 76 },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flagCode: "no", x: 43, y: 32 },
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
    { code: "en" as LanguageCode, name: "ENG", flagCode: "gb" },
    { code: "es" as LanguageCode, name: "ESP", flagCode: "es" },
    { code: "pt" as LanguageCode, name: "POR", flagCode: "pt" },
    { code: "fr" as LanguageCode, name: "FRA", flagCode: "fr" },
    { code: "de" as LanguageCode, name: "DEU", flagCode: "de" },
    { code: "it" as LanguageCode, name: "ITA", flagCode: "it" },
    { code: "pl" as LanguageCode, name: "POL", flagCode: "pl" },
    { code: "cs" as LanguageCode, name: "ČES", flagCode: "cz" },
    { code: "ru" as LanguageCode, name: "РУС", flagCode: "ru" },
    { code: "tr" as LanguageCode, name: "TÜR", flagCode: "tr" },
    { code: "hr" as LanguageCode, name: "HRV", flagCode: "hr" },
    { code: "no" as LanguageCode, name: "NOR", flagCode: "no" },
  ];

  // Find the current language - must match context language exactly
  const selectedLanguage = languages.find(l => l.code === language) ?? languages[0];

  const pathRole = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith('/players') || path.startsWith('/learnmore') || path.startsWith('/youth-players')) return 'players';
    if (path.startsWith('/clubs')) return 'clubs';
    if (path.startsWith('/scouts')) return 'scouts';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/coaches')) return 'coaches';
    if (path.startsWith('/media')) return 'media';
    if (path.startsWith('/business')) return 'business';
    return null;
  }, [location.pathname]);

  // Priority: user selection > subdomain role > path-based role > default 'players'
  // pathRole should take precedence over currentRole when on a specific role page
  const effectiveRole = selectedRole || pathRole || currentRole || 'players';
  const displayRoleKey = effectiveRole;
  const displayRoleLabelKey = `roles.${displayRoleKey}`;
  const displayRoleFallback = roleConfigs[displayRoleKey as keyof typeof roleConfigs]
    ? roleConfigs[displayRoleKey as keyof typeof roleConfigs].name.toUpperCase()
    : 'PLAYER';

  const allRoles: Array<{ key: string; labelKey: string; fallback: string }> = [
    { key: "players", labelKey: "roles.players", fallback: "Player" },
    { key: "clubs", labelKey: "roles.clubs", fallback: "Club" },
    { key: "scouts", labelKey: "roles.scouts", fallback: "Scout" },
    { key: "agents", labelKey: "roles.agents", fallback: "Agent" },
    { key: "coaches", labelKey: "roles.coaches", fallback: "Coach" },
    { key: "media", labelKey: "roles.media", fallback: "Media" },
    { key: "business", labelKey: "roles.business", fallback: "Business" },
  ];

  const getQuadrantPositionForAngle = (angle: number): QuadrantPosition => {
    const normalized = ((angle % 360) + 360) % 360;
    const isRight = normalized < 90 || normalized >= 270;
    const isTop = normalized >= 36 && normalized < 180;

    if (isRight && isTop) return 'top-right';
    if (!isRight && isTop) return 'top-left';
    if (!isRight && !isTop) return 'bottom-left';
    return 'bottom-right';
  };

  // Role-specific menu configurations
  const roleMenus: Record<string, MenuItem[]> = {
    players: [
      // Content-rich items on SIDES (more horizontal space)
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "STARS", 
        Icon: Star, 
        angle: 0, // Right side
        quadrantCard: {
          position: getQuadrantPositionForAngle(0),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.between_the_lines", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 180, // Left side
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: InsightsQuadrantCard,
        },
      },
      // Secondary content items on diagonal sides
      { 
        to: "/performance", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 51, // Upper right
        quadrantCard: {
          position: getQuadrantPositionForAngle(51),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/learnmore", 
        labelKey: "header.what_we_look_for", 
        fallback: "WHAT WE SEEK", 
        Icon: Search, 
        angle: 309, // Lower right
        quadrantCard: {
          position: getQuadrantPositionForAngle(309),
          component: WhatWeLookForQuadrantCard,
        },
      },
      // Simpler items on TOP and BOTTOM (less vertical space)
      { 
        to: "/youth-players", 
        labelKey: "header.youth_players", 
        fallback: "FOR YOUTH", 
        Icon: Sparkles, 
        angle: 103, // Bottom
        quadrantCard: {
          position: getQuadrantPositionForAngle(103),
          component: YouthQuadrantCard,
        },
      },
      { 
        to: "/player-journey", 
        labelKey: "header.player_journey", 
        fallback: "THE JOURNEY", 
        Icon: Route, 
        angle: 257, // Top
        quadrantCard: {
          position: getQuadrantPositionForAngle(257),
          component: JourneyQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.contact", 
        fallback: "REPRESENT ME", 
        Icon: Handshake, 
        angle: 154, // Lower left
        quadrantCard: {
          position: getQuadrantPositionForAngle(154),
          component: ContactQuadrantCard,
        },
      },
    ],
    clubs: [
      { to: "/clubs", labelKey: "header.club_direction", fallback: "CLUB SUPPORT", Icon: Target, angle: 0 },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "OUR STARS", 
        Icon: Star, 
        angle: 60,
        quadrantCard: {
          position: getQuadrantPositionForAngle(60),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/performance", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 120,
        quadrantCard: {
          position: getQuadrantPositionForAngle(120),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.declare_interest", 
        fallback: "DECLARE INTEREST", 
        Icon: Users, 
        angle: 180,
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.insights", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 240,
        quadrantCard: {
          position: getQuadrantPositionForAngle(240),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.arrange_meeting", 
        fallback: "ARRANGE MEETING", 
        Icon: Calendar, 
        angle: 300,
        quadrantCard: {
          position: getQuadrantPositionForAngle(300),
          component: ContactQuadrantCard,
        },
      },
    ],
    agents: [
      { 
        to: "/agent-requests", 
        labelKey: "header.requests", 
        fallback: "REQUESTS", 
        Icon: Target, 
        angle: 0,
      },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "OUR STARS", 
        Icon: Star, 
        angle: 51,
        quadrantCard: {
          position: getQuadrantPositionForAngle(51),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.collaboration", 
        fallback: "COLLABORATION", 
        Icon: Handshake, 
        angle: 103,
        quadrantCard: {
          position: getQuadrantPositionForAngle(103),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.insights", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 154,
        quadrantCard: {
          position: getQuadrantPositionForAngle(154),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/performance", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 206,
        quadrantCard: {
          position: getQuadrantPositionForAngle(206),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.arrange_meeting", 
        fallback: "ARRANGE MEETING", 
        Icon: Calendar, 
        angle: 257,
        quadrantCard: {
          position: getQuadrantPositionForAngle(257),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/agents", 
        labelKey: "header.partner", 
        fallback: "PARTNER", 
        Icon: Users, 
        angle: 309,
      },
    ],
    scouts: [
      { to: "/learnmore", labelKey: "header.what_we_look_for", fallback: "WHAT WE SEEK", Icon: Search, angle: 0 },
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 60 },
      { to: "/scouts", labelKey: "header.jobs", fallback: "OPPORTUNITIES", Icon: Briefcase, angle: 120 },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "STARS", 
        Icon: Star, 
        angle: 180,
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.insights", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 240,
        quadrantCard: {
          position: getQuadrantPositionForAngle(240),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.work_with_us", 
        fallback: "SCOUT FOR RISE", 
        Icon: Handshake, 
        angle: 300,
        quadrantCard: {
          position: getQuadrantPositionForAngle(300),
          component: ContactQuadrantCard,
        },
      },
    ],
    coaches: [
      { to: "/login", labelKey: "header.portal", fallback: "PORTAL", Icon: Users, angle: 0 },
      { 
        to: "/potential", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 60,
        quadrantCard: {
          position: getQuadrantPositionForAngle(60),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "STARS", 
        Icon: Star, 
        angle: 120,
        quadrantCard: {
          position: getQuadrantPositionForAngle(120),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.insights", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 180,
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.represent_me", 
        fallback: "REPRESENT ME", 
        Icon: Handshake, 
        angle: 240,
        quadrantCard: {
          position: getQuadrantPositionForAngle(240),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.arrange_meeting", 
        fallback: "ARRANGE MEETING", 
        Icon: Calendar, 
        angle: 300,
        quadrantCard: {
          position: getQuadrantPositionForAngle(300),
          component: ContactQuadrantCard,
        },
      },
    ],
    media: [
      { 
        to: "/between-the-lines", 
        labelKey: "header.press_release", 
        fallback: "PRESS", 
        Icon: Newspaper, 
        angle: 0,
        quadrantCard: {
          position: getQuadrantPositionForAngle(0),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "STARS", 
        Icon: Star, 
        angle: 60,
        quadrantCard: {
          position: getQuadrantPositionForAngle(60),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.collaboration", 
        fallback: "COLLABORATION", 
        Icon: Heart, 
        angle: 120,
        quadrantCard: {
          position: getQuadrantPositionForAngle(120),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/performance", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 180,
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.declare_interest", 
        fallback: "DECLARE INTEREST", 
        Icon: Users, 
        angle: 240,
        quadrantCard: {
          position: getQuadrantPositionForAngle(240),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.arrange_meeting", 
        fallback: "ARRANGE MEETING", 
        Icon: Calendar, 
        angle: 300,
        quadrantCard: {
          position: getQuadrantPositionForAngle(300),
          component: ContactQuadrantCard,
        },
      },
    ],
    business: [
      { to: "/business", labelKey: "header.packages", fallback: "PACKAGES", Icon: Package, angle: 0 },
      { 
        to: "/stars", 
        labelKey: "header.stars", 
        fallback: "STARS", 
        Icon: Star, 
        angle: 60,
        quadrantCard: {
          position: getQuadrantPositionForAngle(60),
          component: StarsQuadrantCard,
        },
      },
      { 
        to: "/performance", 
        labelKey: "header.performance", 
        fallback: "PERFORMANCE", 
        Icon: TrendingUp, 
        angle: 120,
        quadrantCard: {
          position: getQuadrantPositionForAngle(120),
          component: PerformanceQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.declare_interest", 
        fallback: "DECLARE INTEREST", 
        Icon: Users, 
        angle: 180,
        quadrantCard: {
          position: getQuadrantPositionForAngle(180),
          component: ContactQuadrantCard,
        },
      },
      { 
        to: "/between-the-lines", 
        labelKey: "header.insights", 
        fallback: "INSIGHTS", 
        Icon: BookOpen, 
        angle: 240,
        quadrantCard: {
          position: getQuadrantPositionForAngle(240),
          component: InsightsQuadrantCard,
        },
      },
      { 
        to: "/contact", 
        labelKey: "header.connect", 
        fallback: "CONNECT", 
        Icon: MessageCircle, 
        angle: 300,
        quadrantCard: {
          position: getQuadrantPositionForAngle(300),
          component: ContactQuadrantCard,
        },
      },
    ],
  };
  // Default menu for main site with quadrant cards
  const defaultMenu: MenuItem[] = [
    { 
      to: "/stars", 
      labelKey: "header.stars", 
      fallback: "STARS", 
      Icon: Star, 
      angle: 0,
      quadrantCard: {
        position: 'bottom-right',
        component: StarsQuadrantCard
      }
    },
    { 
      to: "/performance", 
      labelKey: "header.realise_potential", 
      fallback: "PERFORMANCE", 
      Icon: TrendingUp, 
      angle: 72,
      quadrantCard: {
        position: 'top-right',
        component: PerformanceQuadrantCard
      }
    },
    { 
      to: "/between-the-lines", 
      labelKey: "header.between_the_lines", 
      fallback: "INSIGHTS", 
      Icon: BookOpen, 
      angle: 144,
      quadrantCard: {
        position: 'top-left',
        component: InsightsQuadrantCard
      }
    },
    { 
      to: "/news", 
      labelKey: "header.news", 
      fallback: "NEWS", 
      Icon: Newspaper, 
      angle: 216,
      quadrantCard: {
        position: 'bottom-left',
        component: NewsQuadrantCard
      }
    },
    { 
      to: "/contact", 
      labelKey: "header.contact", 
      fallback: "CONTACT", 
      Icon: MessageCircle, 
      angle: 288,
      quadrantCard: {
        position: 'bottom-right',
        component: ContactQuadrantCard
      }
    },
  ];

  // Role selection menu items
  const roleMenuItems: MenuItem[] = [
    { to: "/players", labelKey: "roles.players", fallback: "PLAYER", Icon: Users, angle: 0 },
    { to: "/clubs", labelKey: "roles.clubs", fallback: "CLUB", Icon: Trophy, angle: 51.4 },
    { to: "/scouts", labelKey: "roles.scouts", fallback: "SCOUT", Icon: Search, angle: 102.8 },
    { to: "/agents", labelKey: "roles.agents", fallback: "AGENT", Icon: Briefcase, angle: 154.3 },
    { to: "/coaches", labelKey: "roles.coaches", fallback: "COACH", Icon: Target, angle: 205.7 },
    { to: "/media", labelKey: "roles.media", fallback: "MEDIA", Icon: Newspaper, angle: 257.1 },
    { to: "/business", labelKey: "roles.business", fallback: "BUSINESS", Icon: Package, angle: 308.5 },
  ];

  // Select menu based on current role or selection mode - always use a role menu (default to players)
  const menuItems = useMemo(() => {
    if (isSelectingRole) {
      return roleMenuItems;
    }
    const activeRole = selectedRole || pathRole || currentRole || 'players';
    if (roleMenus[activeRole]) {
      return roleMenus[activeRole];
    }
    return roleMenus['players']; // Fallback to players menu
  }, [currentRole, selectedRole, pathRole, isSelectingRole]);

  useEffect(() => {
    console.log('RadialMenu debug', {
      isMobile,
      hoveredItem,
      hasQuadrant: hoveredItem !== null ? !!menuItems[hoveredItem]?.quadrantCard : null,
      menuLength: menuItems.length,
    });
  }, [isMobile, hoveredItem, menuItems]);

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

  // Use shared utility for subdomain detection
  const isOnLanguageSubdomain = (): boolean => {
    const info = getSubdomainInfo();
    return info.type === 'language';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] touch-none overscroll-none">
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
      <div className="relative z-[20]" style={{
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

        {/* Single SVG for all segment paths - z-10 below center circle (z-20) */}
        <svg
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="absolute inset-0 z-10"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <defs>
            <pattern id="whiteMarblePattern" patternUnits="userSpaceOnUse" width="1200" height="1200" x="-300" y="-300">
              <image href={whiteMarbleBg} width="1200" height="1200" />
            </pattern>
            {/* Mask to cut out the center circle from segments */}
            <mask id="centerCircleMask">
              <rect width="100%" height="100%" fill="white" />
              <circle cx={circleSize / 2} cy={circleSize / 2} r={centerSize / 2 + 2} fill="black" />
            </mask>
          </defs>
          <g mask="url(#centerCircleMask)">
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
          </g>
        </svg>

        {/* Icons and labels positioned separately - z-40 ensures they're above SVG paths (z-30) */}
        {menuItems.map((item, index) => {
          const centerAngle = index * segmentAngle + segmentAngle / 2;
          const hovered = hoveredItem === index;
          const pos = getCirclePosition(centerAngle, radius);

          return (
            <div
              key={`label-${item.to}-${index}`}
              className="absolute pointer-events-none z-40 animate-[fade-in_0.25s_ease-out_both]"
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

        {/* Center circle - unified element with all children using percentage positioning */}
        <div 
          className="absolute rounded-full z-50 border-4 border-black overflow-hidden animate-[scale-in_0.25s_ease-out_both]"
          style={{
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            top: `calc(50% - ${centerSize / 2}px)`,
            left: `calc(50% - ${centerSize / 2}px)`,
          }}
        >
          {/* Background layers */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${whiteMarbleBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div 
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: '25%',
              backgroundImage: `url(${smudgedMarbleBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Logo section: 0% - 55% */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: '55%' }}>
            <img
              src={riseLogoBlack}
              alt="RISE"
              className="object-contain"
              style={{ width: '180%', height: '180%' }}
            />
          </div>
          
          {/* Gold divider at 55% */}
          <div className="absolute left-0 right-0 h-[2px] bg-primary z-10" style={{ top: '55%' }} />
          
          {/* Role selector section: 55% - 75% */}
          <div className="absolute inset-x-0 flex items-center justify-center z-20" style={{ top: 'calc(55% + 2px)', height: '20%' }}>
            <button
              onClick={() => setIsSelectingRole(!isSelectingRole)}
              className="font-bebas tracking-[0.05em] transition-colors duration-300 focus:outline-none"
              style={{ fontSize: '18%' }}
            >
              <span 
                className={isSelectingRole ? 'text-primary' : 'text-black hover:text-primary transition-colors'}
                style={{ fontSize: `${centerSize * 0.17}px` }}
              >
                {isSelectingRole ? t('menu.role', 'ROLE') : t(displayRoleLabelKey, displayRoleFallback).toUpperCase()}
              </span>
            </button>
          </div>
          
          {/* Gold divider at 75% */}
          <div className="absolute left-0 right-0 h-[2px] bg-primary z-10" style={{ top: '75%' }} />
          
          {/* Language selector section: 75% - 100% */}
          <div className="absolute inset-x-0 flex items-center justify-center z-20" style={{ top: '75%', height: '25%' }}>
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-[3%] font-bebas uppercase tracking-wider text-primary hover:text-primary/80 transition-all duration-300 focus:outline-none"
            >
              <img 
                src={getFlagUrl(selectedLanguage.flagCode)} 
                alt={selectedLanguage.name} 
                className="rounded-sm"
                style={{ height: '50%', maxHeight: `${centerSize * 0.12}px`, width: 'auto' }} 
              />
              <ChevronDown 
                className="transition-transform duration-300"
                style={{
                  width: `${centerSize * 0.1}px`,
                  height: `${centerSize * 0.1}px`,
                  transform: showMap ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>
          </div>
        </div>

        </div>

        {/* Quadrant card overlay - positioned OUTSIDE main menu container, desktop only, z-[215] above menu */}
        {!isMobile && hoveredItem !== null && menuItems[hoveredItem]?.quadrantCard && (() => {
        const card = menuItems[hoveredItem].quadrantCard!;
        const CardComponent = card.component;
        
        // Use the EXACT same angle calculation as the dividers
        const numItems = menuItems.length;
        const segAngle = 360 / numItems;
        const startAngle = hoveredItem * segAngle;
        const endAngle = (hoveredItem + 1) * segAngle;
        
        // Generate wedge clip-path
        const generateWedgeClipPath = (start: number, end: number): string => {
          const dist = 200;
          const points: string[] = ['50% 50%'];
          const numArcPoints = 20;
          for (let i = 0; i <= numArcPoints; i++) {
            const angle = start + (end - start) * (i / numArcPoints);
            const rad = (angle * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * dist;
            const y = 50 + Math.sin(rad) * dist;
            points.push(`${x}% ${y}%`);
          }
          return `polygon(${points.join(', ')})`;
        };
        
        const clipPath = generateWedgeClipPath(startAngle, endAngle);
        
        // Calculate viewport and menu geometry
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cx = vw / 2;
        const cy = vh / 2;
        const menuRadius = circleSize / 2;
        const edgePadding = 24;
        
        const placement = calculateContentPlacement(
          cx,
          cy,
          startAngle,
          endAngle,
          menuRadius,
          vw,
          vh,
          edgePadding
        );

        const overlaySize = Math.max(vw, vh);
        const menuRadiusPercent = (menuRadius / overlaySize) * 100;
        
        console.log('Quadrant overlay with geometry', {
          hoveredItem,
          startAngle,
          endAngle,
          placement,
          vw,
          vh,
          menuRadius,
        });
        
        return (
          <div 
            key={`quadrant-${hoveredItem}`}
            className="pointer-events-none z-[215] animate-[fade-in_0.2s_ease-out_forwards]"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${overlaySize}px`,
              height: `${overlaySize}px`,
              clipPath,
            }}
          >
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, transparent ${menuRadiusPercent}%, rgba(0,0,0,0.4) ${menuRadiusPercent + 3}%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)`
              }}
            />
            {/* Card content positioned within the wedge using calculated geometry */}
            <div 
              className="absolute flex items-center justify-center"
              style={{
                left: `calc(50% + ${placement.x}px)`,
                top: `calc(50% + ${placement.y}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${placement.width}px`,
                maxHeight: `${placement.height}px`,
              }}
            >
              <CardComponent maxWidth={placement.width} maxHeight={placement.height} align={placement.textAlign} />
            </div>
          </div>
        );
      })()}



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
                      <img src={getFlagUrl(region.flagCode)} alt={region.name} className="w-6 h-auto md:w-7 rounded-sm" />
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
                  Current: <span className="text-primary inline-flex items-center gap-1"><img src={getFlagUrl(languageRegions.find(l => l.code === language)?.flagCode || 'gb')} alt="" className="w-4 h-auto rounded-sm" /> {languageRegions.find(l => l.code === language)?.nativeName}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
