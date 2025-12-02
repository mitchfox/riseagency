import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import riseStar from "@/assets/rise-star.png";
import { X, MessageCircle, Users, LogIn, Handshake, ArrowRight, Compass, FileText, Search, Star, Calendar, Briefcase, Send, BookOpen, Activity, Newspaper, Heart, Package, Phone } from "lucide-react";
import workingTogether from "@/assets/menu-working-together.jpg";
import playerPortalImage from "@/assets/menu-player-portal.png";
import blackMarbleBg from "@/assets/black-marble-smudged.png";
import whiteMarbleBg from "@/assets/white-marble.png";
import realisePotentialSessions from "@/assets/realise-potential-sessions.png";
import realisePotentialPaos from "@/assets/realise-potential-paos.png";
import realisePotentialReport from "@/assets/realise-potential-report.png";
import realisePotentialAnalysis from "@/assets/realise-potential-analysis.png";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { WorkWithUsDialog } from "@/components/WorkWithUsDialog";
import { RepresentationDialog } from "@/components/RepresentationDialog";
import { DeclareInterestDialog } from "@/components/DeclareInterestDialog";
import { ArrangeMeetingDialog } from "@/components/ArrangeMeetingDialog";
import { IntroModal } from "@/components/IntroModal";
import { HoverText } from "@/components/HoverText";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { getEnglishPath, getAllPathVariants } from "@/lib/localizedRoutes";
import { useRoleSubdomain, roleConfigs, RoleSubdomain } from "@/hooks/useRoleSubdomain";
import { RadialMenu } from "@/components/RadialMenu";

// NOTE: GridLines component is available at src/components/GridLines.tsx 
// for coordinate-based positioning during design. Import and add it when needed.

// Subdomain-specific sub-header configuration
type SubHeaderItem = {
  type: 'link' | 'button';
  to?: string;
  action?: 'declareInterest' | 'representation' | 'workWithUs' | 'arrangeMeeting';
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SubHeaderConfig = {
  left: [SubHeaderItem, SubHeaderItem];
  right: [SubHeaderItem, SubHeaderItem];
};

const defaultSubHeader: SubHeaderConfig = {
  left: [
    { type: 'link', to: '/contact', label: 'Contact Us', mobileLabel: 'Contact', icon: MessageCircle },
    { type: 'button', action: 'declareInterest', label: 'Declare Interest In A Star', mobileLabel: 'Interest', icon: Users },
  ],
  right: [
    { type: 'button', action: 'representation', label: 'Request Representation', mobileLabel: 'Represent', icon: Handshake },
    { type: 'link', to: '/login', label: 'Portal', mobileLabel: 'Portal', icon: LogIn },
  ],
};

const subdomainSubHeaders: Record<string, SubHeaderConfig> = {
  players: {
    left: [
      { type: 'link', to: '/login', label: 'Portal', mobileLabel: 'Portal', icon: LogIn },
      { type: 'link', to: '/between-the-lines', label: 'Between The Lines', mobileLabel: 'BTL', icon: BookOpen },
    ],
    right: [
      { type: 'link', to: '/playersmore', label: 'What We Look For', mobileLabel: 'Look For', icon: Search },
      { type: 'button', action: 'representation', label: 'Represent Me', mobileLabel: 'Represent', icon: Handshake },
    ],
  },
  clubs: {
    left: [
      { type: 'link', to: '/clubs', label: 'Club Direction', mobileLabel: 'Direction', icon: Compass },
      { type: 'button', action: 'arrangeMeeting', label: 'Arrange Meeting', mobileLabel: 'Meeting', icon: Calendar },
    ],
    right: [
      { type: 'link', to: '/stars', label: 'Stars', mobileLabel: 'Stars', icon: Star },
      { type: 'button', action: 'declareInterest', label: 'Declare Interest', mobileLabel: 'Interest', icon: Users },
    ],
  },
  scouts: {
    left: [
      { type: 'link', to: '/playersmore', label: 'What We Look For', mobileLabel: 'Look For', icon: Search },
      { type: 'link', to: '/login', label: 'Portal', mobileLabel: 'Portal', icon: LogIn },
    ],
    right: [
      { type: 'button', action: 'workWithUs', label: 'Scout for RISE', mobileLabel: 'Scout', icon: Send },
      { type: 'link', to: '/scouts', label: 'Jobs', mobileLabel: 'Jobs', icon: Briefcase },
    ],
  },
  agents: {
    left: [
      { type: 'link', to: '/stars', label: 'Stars', mobileLabel: 'Stars', icon: Star },
      { type: 'link', to: '/contact', label: 'Requests', mobileLabel: 'Requests', icon: FileText },
    ],
    right: [
      { type: 'button', action: 'declareInterest', label: 'Declare Interest', mobileLabel: 'Interest', icon: Users },
      { type: 'button', action: 'arrangeMeeting', label: 'Arrange Meeting', mobileLabel: 'Meeting', icon: Calendar },
    ],
  },
  coaches: {
    left: [
      { type: 'link', to: '/login', label: 'Portal', mobileLabel: 'Portal', icon: LogIn },
      { type: 'link', to: '/potential', label: 'Performance', mobileLabel: 'Performance', icon: Activity },
    ],
    right: [
      { type: 'button', action: 'representation', label: 'Represent Me', mobileLabel: 'Represent', icon: Handshake },
      { type: 'button', action: 'arrangeMeeting', label: 'Arrange Meeting', mobileLabel: 'Meeting', icon: Calendar },
    ],
  },
  media: {
    left: [
      { type: 'link', to: '/between-the-lines', label: 'Press Release', mobileLabel: 'Press', icon: Newspaper },
      { type: 'link', to: '/contact', label: 'Collaboration', mobileLabel: 'Collab', icon: Heart },
    ],
    right: [
      { type: 'button', action: 'declareInterest', label: 'Declare Interest in Star', mobileLabel: 'Interest', icon: Users },
      { type: 'button', action: 'arrangeMeeting', label: 'Arrange Meeting', mobileLabel: 'Meeting', icon: Calendar },
    ],
  },
  business: {
    left: [
      { type: 'link', to: '/business', label: 'Packages', mobileLabel: 'Packages', icon: Package },
      { type: 'button', action: 'declareInterest', label: 'Declare Interest in Package', mobileLabel: 'Interest', icon: Users },
    ],
    right: [
      { type: 'link', to: '/contact', label: 'Connect With Us', mobileLabel: 'Connect', icon: Phone },
      { type: 'button', action: 'arrangeMeeting', label: 'Arrange Meeting', mobileLabel: 'Meeting', icon: Calendar },
    ],
  },
};

// Route-to-role mapping for detecting role from current path
const routeToRole: Record<string, string> = {
  '/playersmore': 'players',
  '/players': 'players',
  '/clubs': 'clubs',
  '/scouts': 'scouts',
  '/agents': 'agents',
  '/coaches': 'coaches',
  '/business': 'business',
  '/media': 'media',
};

interface HeaderProps {
  shouldFade?: boolean;
}

export const Header = ({ shouldFade = false }: HeaderProps) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { currentRole, getRoleUrl, otherRoles, isRoleSubdomain } = useRoleSubdomain();
  const [representationOpen, setRepresentationOpen] = useState(false);
  const [workWithUsOpen, setWorkWithUsOpen] = useState(false);
  const [declareInterestOpen, setDeclareInterestOpen] = useState(false);
  const [arrangeMeetingOpen, setArrangeMeetingOpen] = useState(false);
  
  // Detect role from route if no subdomain role
  const routeRole = routeToRole[location.pathname];
  const effectiveRole = currentRole || routeRole;
  
  // Get subdomain-specific sub-header config based on effective role
  const subHeaderConfig = effectiveRole && subdomainSubHeaders[effectiveRole] 
    ? subdomainSubHeaders[effectiveRole] 
    : defaultSubHeader;
  
  const handleSubHeaderAction = (action: SubHeaderItem['action']) => {
    switch (action) {
      case 'declareInterest':
        setDeclareInterestOpen(true);
        break;
      case 'representation':
        setRepresentationOpen(true);
        break;
      case 'workWithUs':
        setWorkWithUsOpen(true);
        break;
      case 'arrangeMeeting':
        // For now, use contact page or a new dialog
        setArrangeMeetingOpen(true);
        break;
    }
  };
  const [introModalOpen, setIntroModalOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [starsHovered, setStarsHovered] = useState(false);
  const [starPlayers, setStarPlayers] = useState<any[]>([]);
  const [starIndex, setStarIndex] = useState(0);
  const [betweenLinesHovered, setBetweenLinesHovered] = useState(false);
  const [betweenLinesPosts, setBetweenLinesPosts] = useState<any[]>([]);
  const [btlIndex, setBtlIndex] = useState(0);
  const [realisePotentialHovered, setRealisePotentialHovered] = useState(false);
  const [rpIndex, setRpIndex] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [newsHovered, setNewsHovered] = useState(false);
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const realisePotentialImages = [realisePotentialSessions, realisePotentialPaos, realisePotentialReport, realisePotentialAnalysis];
  
  useEffect(() => {
    const topBarPaths = ['/', '/players', '/scouts', '/clubs', '/agents', '/coaches', '/business', '/media'];
    setShowTopBar(topBarPaths.includes(location.pathname));
  }, [location.pathname]);
  
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewport("mobile");
      } else if (width < 1024) {
        setViewport("tablet");
      } else {
        setViewport("desktop");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
  
  useEffect(() => {
    const fetchStarPlayers = async () => {
      const {
        data,
        error
      } = await supabase.from('players').select('*').eq('visible_on_stars_page', true).limit(3);
      if (data && !error && data.length > 0) {
        setStarPlayers(data);
      }
    };
    const fetchBetweenLinesPosts = async () => {
      const {
        data,
        error
      } = await supabase.from('blog_posts').select('*').eq('published', true).neq('category', 'PLAYER NEWS').order('created_at', {
        ascending: false
      }).limit(3);
      if (data && !error && data.length > 0) {
        setBetweenLinesPosts(data);
      }
    };
    const fetchNewsArticles = async () => {
      const {
        data,
        error
      } = await supabase.from('blog_posts').select('*').eq('published', true).eq('category', 'PLAYER NEWS').order('created_at', {
        ascending: false
      }).limit(3);
      if (data && !error && data.length > 0) {
        setNewsArticles(data);
      }
    };
    fetchStarPlayers();
    fetchBetweenLinesPosts();
    fetchNewsArticles();
  }, []);
  useEffect(() => {
    if (starPlayers.length > 0) {
      const starInterval = setInterval(() => {
        setStarIndex(prev => (prev + 1) % starPlayers.length);
      }, 6000);
      return () => clearInterval(starInterval);
    }
  }, [starPlayers.length]);
  useEffect(() => {
    if (betweenLinesPosts.length > 0) {
      const btlInterval = setInterval(() => {
        setBtlIndex(prev => (prev + 1) % betweenLinesPosts.length);
      }, 6000);
      return () => clearInterval(btlInterval);
    }
  }, [betweenLinesPosts.length]);
  useEffect(() => {
    const rpInterval = setInterval(() => {
      setRpIndex(prev => (prev + 1) % realisePotentialImages.length);
    }, 6000);
    return () => clearInterval(rpInterval);
  }, [realisePotentialImages.length]);
  useEffect(() => {
    if (newsArticles.length > 0) {
      const newsInterval = setInterval(() => {
        setNewsIndex(prev => (prev + 1) % newsArticles.length);
      }, 6000);
      return () => clearInterval(newsInterval);
    }
  }, [newsArticles.length]);
  
  useEffect(() => {
    const scrollEnabledPaths = ['/', '/players', '/scouts', '/clubs', '/agents', '/coaches', '/business', '/media'];
    const handleScroll = () => {
      if (scrollEnabledPaths.includes(location.pathname)) {
        setIsScrolled(window.scrollY > 50);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Check if a path is active (works with localized routes)
  const isActive = (englishPath: string) => {
    const currentPath = location.pathname;
    const variants = getAllPathVariants(englishPath);
    return variants.some(v => currentPath === v || currentPath.startsWith(v + '/'));
  };

  const getLeftIconOffset = () => {
    if (!isScrolled) return "3rem";

    if (viewport === "desktop") return "7.75rem"; // desktop: +4px more to the right
    if (viewport === "tablet") return "4.75rem"; // iPad: perfect

    return "3.5rem"; // mobile: great
  };

  const getRightIconOffset = () => {
    if (!isScrolled) return "2.5rem";

    if (viewport === "desktop") return "clamp(7rem, 15vw, 11.5rem)"; // desktop: perfect
    if (viewport === "tablet") return "9rem"; // iPad: perfect

    return "3.5rem"; // mobile: a bit more to the left
  };

  return <>
      {/* Top Utility Bar - only on homepage and only when not scrolled */}
      {showTopBar && !isScrolled && <div className="fixed top-14 md:top-16 left-0 right-0 z-[99] bg-background/95 backdrop-blur-md transition-all duration-500 border-b-2 border-primary">
          <div className="container mx-auto px-2 md:px-4">
          <div className="flex items-center justify-between h-8 md:h-10 relative">
            {/* Left items - hidden on mobile, shown on tablet+ */}
            <div className="hidden md:flex items-center gap-4 transition-all duration-500">
              {subHeaderConfig.left.map((item, index) => (
                <div key={`left-${index}`} className="flex items-center gap-4">
                  {index > 0 && <div className="w-px h-4 bg-white/20" />}
                  {item.type === 'link' ? (
                    <LocalizedLink to={item.to!} className="text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5" />
                      <HoverText text={item.label} />
                    </LocalizedLink>
                  ) : (
                    <button onClick={() => handleSubHeaderAction(item.action)} className="text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5" />
                      <HoverText text={item.label} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Mobile: Left side items */}
            <div className="flex md:hidden items-center gap-2">
              {subHeaderConfig.left.map((item, index) => (
                <div key={`mobile-left-${index}`} className="flex items-center gap-2">
                  {index > 0 && <div className="w-px h-3 bg-white/20" />}
                  {item.type === 'link' ? (
                    <LocalizedLink to={item.to!} className="text-[10px] font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500">
                      <HoverText text={item.mobileLabel} />
                    </LocalizedLink>
                  ) : (
                    <button onClick={() => handleSubHeaderAction(item.action)} className="text-[10px] font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500">
                      <HoverText text={item.mobileLabel} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Mobile: Right side items */}
            <div className="flex md:hidden items-center gap-2">
              {subHeaderConfig.right.map((item, index) => (
                <div key={`mobile-right-${index}`} className="flex items-center gap-2">
                  {index > 0 && <div className="w-px h-3 bg-white/20" />}
                  {item.type === 'link' ? (
                    <LocalizedLink to={item.to!} className="text-[10px] font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500">
                      <HoverText text={item.mobileLabel} />
                    </LocalizedLink>
                  ) : (
                    <button onClick={() => handleSubHeaderAction(item.action)} className="text-[10px] font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500">
                      <HoverText text={item.mobileLabel} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Language Selector - Centered on tablet+ only */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
              <LanguageSelector />
            </div>
            
            {/* Right items - hidden on mobile, shown on tablet+ */}
            <div className="hidden md:flex items-center gap-4 transition-all duration-500">
              {subHeaderConfig.right.map((item, index) => (
                <div key={`right-${index}`} className="flex items-center gap-4">
                  {index > 0 && <div className="w-px h-4 bg-white/20" />}
                  {item.type === 'link' ? (
                    <LocalizedLink to={item.to!} className="text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5" />
                      <HoverText text={item.label} />
                    </LocalizedLink>
                  ) : (
                    <button onClick={() => handleSubHeaderAction(item.action)} className="text-sm font-bebas uppercase tracking-wider text-white/80 hover:text-primary transition-all duration-500 flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5" />
                      <HoverText text={item.label} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}

      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md w-full transition-all duration-500 ease-out ${showTopBar && isScrolled ? 'border-b-2 border-primary' : 'border-b border-white/10'} ${shouldFade ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
        <div className="container mx-auto px-2 md:px-4">
        <div className={`flex items-center justify-between transition-all duration-500 ease-out ${isScrolled ? 'h-12 md:h-14' : 'h-14 md:h-16'}`}>
          {/* Drawer Menu - Left */}
          <Drawer direction="top" preventScrollRestoration={false}>
            <DrawerTrigger asChild>
              <button className="group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out w-12 h-12 md:w-14 md:h-14" aria-label="Toggle menu">
                <svg className="text-primary group-hover:text-foreground transition-all duration-300 ease-out w-7 h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="8" x2="20" y2="8" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg]" />
                  <line x1="2" y1="16" x2="18" y2="16" className="origin-center transition-transform duration-300 group-hover:rotate-[-45deg] group-hover:translate-x-1" />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent className="fixed inset-0 h-screen w-full !mt-0 rounded-none z-[200] overflow-hidden">
              <RadialMenu />
            </DrawerContent>
          </Drawer>

          {/* Logo - Center - navigates to role-specific page */}
          <Link 
            to={(() => {
              // First priority: Use role from subdomain
              if (currentRole && roleConfigs[currentRole]) {
                return roleConfigs[currentRole].route;
              }
              
              // Second priority: Detect from path
              const path = location.pathname;
              if (path.startsWith('/clubs')) return '/clubs';
              if (path.startsWith('/coaches')) return '/coaches';
              if (path.startsWith('/scouts')) return '/scouts';
              if (path.startsWith('/agents')) return '/agents';
              if (path.startsWith('/business')) return '/business';
              if (path.startsWith('/media')) return '/media';
              if (path.startsWith('/players') || path.startsWith('/playersmore') || path.startsWith('/stars') || path.startsWith('/performance') || path.startsWith('/news') || path.startsWith('/between-the-lines')) return '/playersmore';
              
              // Only return '/' if truly on the main landing page with no subdomain
              return '/';
            })()}
            className="absolute left-1/2 transform -translate-x-1/2 z-10"
          >
            <img src={logo} alt="RISE Football Agency" className={`transition-all duration-500 ease-out ${isScrolled ? 'h-9 md:h-11' : 'h-10 md:h-12'}`} />
          </Link>

          {/* Utility icons - animate from top bar into header */}
          {showTopBar && <>
              {/* Left side icons - positioned relative to menu button */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              left: getLeftIconOffset(),
              top: isScrolled ? "calc(0.75rem - 2px)" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <Link to="/contact" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.contact_us", "Contact Us")}>
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.contact_us", "Contact Us")}
                  </span>
                </Link>
                <button onClick={() => setDeclareInterestOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.declare_interest_short", "Declare Interest")}>
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.declare_interest_short", "Declare Interest")}
                  </span>
                </button>
              </div>
              
              {/* Right side icons - positioned relative to RISE WITH US button */}
              <div className="fixed flex items-center gap-1 md:gap-2 z-[90]" style={{
              right: getRightIconOffset(),
              top: isScrolled ? "calc(0.75rem - 2px)" : "clamp(56px, 15vw, 82px)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <button onClick={() => setRepresentationOpen(true)} className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.request_representation", "Request Representation")}>
                  <Handshake className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.request_representation", "Request Representation")}
                  </span>
                </button>
                <Link to="/login" className="group p-1.5 md:p-2 rounded-full hover:bg-primary/10 transition-all duration-300 flex items-center gap-1.5 overflow-hidden" title={t("header.portal", "Portal")}>
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 text-white/80 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="max-w-0 md:group-hover:max-w-xs transition-all duration-300 text-xs font-bebas uppercase tracking-wider text-white/80 group-hover:text-primary whitespace-nowrap overflow-hidden">
                    {t("header.portal", "Portal")}
                  </span>
                </Link>
              </div>
            </>}

          {/* RISE WITH US Button - Right */}
          <Button onClick={() => setWorkWithUsOpen(true)} size="sm" className={`btn-shine font-bebas uppercase tracking-wider transition-all duration-500 ease-out flex items-center justify-center leading-none ${isScrolled ? 'text-xs md:text-sm px-3 md:px-5 h-8 md:h-9' : 'text-sm md:text-base px-4 md:px-6 h-9 md:h-10'}`}>
            <HoverText text={t("header.rise_with_us", "RISE WITH US")} />
          </Button>
        </div>
      </div>
      </header>
      
      <WorkWithUsDialog open={workWithUsOpen} onOpenChange={setWorkWithUsOpen} />
      <RepresentationDialog open={representationOpen} onOpenChange={setRepresentationOpen} />
      <DeclareInterestDialog open={declareInterestOpen} onOpenChange={setDeclareInterestOpen} />
      <ArrangeMeetingDialog open={arrangeMeetingOpen} onOpenChange={setArrangeMeetingOpen} />
      <IntroModal open={introModalOpen} onOpenChange={setIntroModalOpen} />
    </>;
};