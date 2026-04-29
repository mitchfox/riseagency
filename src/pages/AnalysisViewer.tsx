import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { extractAnalysisIdFromSlug } from "@/lib/urlHelpers";
import { ReadOnlyAnnotationPlayback } from "@/components/portal/ReadOnlyAnnotationPlayback";
import { ArrowLeft, ChevronDown, Play, Plus, Minus, Download, BookOpen, FileEdit, EyeOff, Radio, Clock3 } from "lucide-react";
import { ConceptTagsDisplay } from "@/components/portal/ConceptTagsDisplay";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HoverText } from "@/components/HoverText";
import { LazyVideo } from "@/components/LazyVideo";
import { AudioPlaybackButton } from "@/components/AudioPlaybackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import riseLogo from "@/assets/logo.png";
import smokyBackground from "@/assets/smudged-marble-overlay.png";
import blackMarble from "@/assets/black-marble.png";
import whiteMarble from "@/assets/white-marble.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { et } from "@/lib/exampleViewerTranslations";

interface Analysis {
  id: string;
  analysis_type: string;
  title: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_date: string | null;
  home_team_logo: string | null;
  away_team_logo: string | null;
  home_team_bg_color: string | null;
  away_team_bg_color: string | null;
  selected_scheme: string | null;
  starting_xi: any;
  kit_primary_color: string | null;
  kit_secondary_color: string | null;
  key_details: string | null;
  opposition_strengths: string | null;
  opposition_weaknesses: string | null;
  matchups: any;
  scheme_title: string | null;
  scheme_paragraph_1: string | null;
  scheme_paragraph_2: string | null;
  scheme_image_url: string | null;
  player_image_url: string | null;
  match_image_url: string | null;
  strengths_improvements: string | null;
  concept: string | null;
  explanation: string | null;
  points: any;
  video_url: string | null;
  visibility_status?: "draft" | "hidden" | "live" | null;
  estimated_ready_at?: string | null;
}

// Brand colors - Rise Agency tokens (gold/black theme)
const BRAND = {
  gold: "hsl(var(--primary))",
  darkBg: "hsl(var(--background))",
  contentBg: "hsl(var(--card))",
  bodyText: "hsl(var(--foreground))",
  mutedText: "hsl(var(--muted-foreground))",
};

// Section IDs for quick navigation
const SECTION_IDS = {
  overview: "section-overview",
  strengths: "section-strengths",
  weaknesses: "section-weaknesses",
  matchups: "section-matchups",
  scheme: "section-scheme",
  improvements: "section-improvements",
};

// Enhanced Kit SVG Component - THINNER design with stripe patterns
interface KitProps {
  primaryColor: string;
  secondaryColor: string;
  numberColor?: string;
  collarColor?: string;
  stripeStyle?: 'none' | 'thin' | 'thick' | 'halves';
  number: string;
}

const PlayerKit = ({ primaryColor, secondaryColor, numberColor = 'white', collarColor, stripeStyle = 'none', number }: KitProps) => {
  const showNumber = number && number !== '0' && number.trim() !== '';
  return (
    <svg width="50" height="60" viewBox="0 0 100 120" className="drop-shadow-lg">
      <defs>
        <pattern id={`thinStripes-${number}`} patternUnits="userSpaceOnUse" width="6" height="120">
          <rect width="3" height="120" fill={primaryColor} />
          <rect x="3" width="3" height="120" fill={secondaryColor} />
        </pattern>
        <pattern id={`thickStripes-${number}`} patternUnits="userSpaceOnUse" width="16" height="120">
          <rect width="8" height="120" fill={primaryColor} />
          <rect x="8" width="8" height="120" fill={secondaryColor} />
        </pattern>
      </defs>

      {/* Main shirt body */}
      <path
        d="M30 28 L25 38 L25 95 L35 100 L65 100 L75 95 L75 38 L70 28 L62 24 L58 28 L42 28 L38 24 Z"
        fill={stripeStyle === 'thin' ? `url(#thinStripes-${number})` :
              stripeStyle === 'thick' ? `url(#thickStripes-${number})` :
              stripeStyle === 'halves' ? primaryColor : primaryColor}
        stroke={secondaryColor}
        strokeWidth="2"
      />

      {stripeStyle === 'halves' && (
        <path
          d="M50 28 L58 28 L62 24 L70 28 L75 38 L75 95 L65 100 L50 100 Z"
          fill={secondaryColor}
        />
      )}

      {/* Sleeves */}
      <path d="M25 38 L18 48 L22 58 L25 52 Z" fill={primaryColor} stroke={secondaryColor} strokeWidth="1.5"/>
      <path d="M75 38 L82 48 L78 58 L75 52 Z" fill={stripeStyle === 'halves' ? secondaryColor : primaryColor} stroke={secondaryColor} strokeWidth="1.5"/>

      {/* Collar */}
      <path d="M42 28 L50 40 L58 28" fill="none" stroke={collarColor || secondaryColor} strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="50" cy="25" rx="10" ry="3" fill={collarColor || secondaryColor} />

      {/* Number - only show if provided */}
      {showNumber && (
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontSize="26"
          fontWeight="bold"
          fill={numberColor}
          stroke={numberColor === 'white' || numberColor === '#ffffff' || numberColor === '#FFFFFF' ? 'black' : 'rgba(0,0,0,0.3)'}
          strokeWidth="0.8"
          fontFamily="Arial Black, sans-serif"
        >
          {number}
        </text>
      )}

      {/* Shading */}
      <path d="M30 28 L25 38 L25 95 L35 100 L38 95 L38 35 Z" fill="rgba(0,0,0,0.12)" />
      <path d="M62 28 L70 28 L75 38 L75 95 L72 95 L72 40 L68 30 Z" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

// Tactical symbols SVG background
const TacticalSymbols = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="tacticalPattern" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
        <g opacity="0.06">
          <circle cx="50" cy="50" r="18" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
          <line x1="38" y1="38" x2="62" y2="62" stroke="hsl(var(--primary))" strokeWidth="2" />
          <line x1="62" y1="38" x2="38" y2="62" stroke="hsl(var(--primary))" strokeWidth="2" />
        </g>
        <rect x="180" y="40" width="40" height="25" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" opacity="0.05" />
        <g stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.07" fill="none">
          <path d="M80 150 L140 150" strokeDasharray="8 4" />
          <polygon points="140,145 150,150 140,155" fill="hsl(var(--primary))" />
        </g>
        <circle cx="120" cy="250" r="10" fill="hsl(var(--primary))" opacity="0.05" />
        <circle cx="260" cy="260" r="6" fill="hsl(var(--primary))" opacity="0.07" />
        <circle cx="280" cy="280" r="6" fill="hsl(var(--primary))" opacity="0.07" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#tacticalPattern)" />
  </svg>
);

// Section title with white marble background
const SectionTitle = ({ title, icon }: { title: string; icon?: "plus" | "minus" | null }) => (
  <div className="relative mb-4">
    <div 
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-primary"
      style={{
        backgroundImage: `url(${whiteMarble})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="py-3 md:py-4 px-4">
        <div className="flex items-center justify-center gap-3">
          {icon === "plus" && <Plus className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
          {icon === "minus" && <Minus className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
          <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-widest text-center text-black drop-shadow-sm">
            <HoverText text={title} />
          </h2>
        </div>
      </div>
    </div>
  </div>
);

// Content card - grey background with black text (matches fuelforfootball)
const ContentCard = ({ children, className = "", transparent = false }: { children: React.ReactNode; className?: string; transparent?: boolean }) => (
  <div 
    className={`rounded-2xl border-2 border-primary p-4 md:p-6 ${className}`}
    style={transparent ? {} : { backgroundColor: 'hsl(0 0% 75%)', color: 'black' }}
  >
    {children}
  </div>
);

// Expandable section - manual toggle, auto-close on scroll away, open via quick nav
const ExpandableSection = ({
  title,
  children,
  id,
  defaultOpen = false,
  icon,
  transparentContent = false,
  forceOpen = false,
  flipBackground = false
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  defaultOpen?: boolean;
  icon?: "plus" | "minus" | null;
  transparentContent?: boolean;
  forceOpen?: boolean;
  flipBackground?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || forceOpen);
  const [openedByNav, setOpenedByNav] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  // Listen for navigation events from QuickNavDropdown
  useEffect(() => {
    if (!id) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sectionId === id) {
        setIsOpen(true);
        setOpenedByNav(true);
      }
    };
    window.addEventListener('analysis-nav', handler);
    return () => window.removeEventListener('analysis-nav', handler);
  }, [id]);


  const handleToggle = () => {
    setIsOpen(!isOpen);
    setOpenedByNav(false);
  };

  const backgroundStyle = {
    backgroundColor: '#000000',
    transform: flipBackground ? 'scaleY(-1)' : 'none'
  };

  const contentStyle = flipBackground ? { transform: 'scaleY(-1)' } : {};

  if (forceOpen) {
    return (
      <section 
        ref={sectionRef} 
        id={id} 
        data-expandable 
        className="relative w-full"
        style={backgroundStyle}
      >
        <div style={contentStyle}>
          <TacticalSymbols />
          <div className="relative px-4 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
            <div className="w-full">
              <SectionTitle title={title} icon={icon} />
              <div className="flex justify-center -mt-2 mb-2">
                <ChevronDown className="w-5 h-5 text-primary rotate-180" />
              </div>
              <ContentCard transparent={transparentContent}>{children}</ContentCard>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={sectionRef} 
      id={id} 
      data-expandable 
      className="relative w-full"
      style={backgroundStyle}
    >
      <div style={contentStyle}>
        <TacticalSymbols />
        <div className="relative px-4 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
          <motion.div
            className="w-full overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <button onClick={handleToggle} className="w-full">
              <SectionTitle title={title} icon={icon} />
              <motion.div
                className="flex justify-center -mt-2 mb-2"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-primary" />
              </motion.div>
            </button>
            {/* Always render children so videos preload, animate visibility */}
            <motion.div
              initial={false}
              animate={{
                height: isOpen ? "auto" : 0,
                opacity: isOpen ? 1 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <ContentCard transparent={transparentContent}>{children}</ContentCard>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Text reveal animation - uses animate directly to avoid whileInView issues inside collapsed sections
const TextReveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const isLightColor = (color: string | null): boolean => {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
};

// Main Header
const AnalysisHeader = ({
  homeTeam,
  awayTeam,
  homeLogo,
  awayLogo,
  homeBgColor,
  awayBgColor,
  homeScore,
  awayScore,
  matchDate,
  isPostMatch = false,
}: {
  homeTeam: string | null;
  awayTeam: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  homeBgColor: string | null;
  awayBgColor: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate?: string | null;
  isPostMatch?: boolean;
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="w-full relative z-40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Top section with logo - black marble background */}
      <div 
        className="relative py-2 px-3"
        style={{
          backgroundImage: `url(${blackMarble})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute left-4 md:left-8 top-4 bg-black/50 backdrop-blur-sm border-white/30 hover:bg-black/70 text-white hover:text-primary h-8 py-1.5 px-3 text-xs z-20 rounded-2xl"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back
        </Button>

        <div className="relative flex items-center justify-center py-2">
          <img src={riseLogo} alt="Rise Agency" className="w-24 h-24 md:w-32 md:h-32 object-contain" />
        </div>
      </div>

      {/* Team colors bar */}
      <div className="relative h-10 md:h-14 overflow-visible bg-black">
        {homeLogo && (
          <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-[15vw] h-[15vw] min-w-16 max-w-28 md:min-w-20 md:max-w-36 z-20 -mt-2">
            <img src={homeLogo} alt={`${homeTeam || 'Home team'} logo`} className="w-full h-full object-contain drop-shadow-xl" loading="lazy" />
          </div>
        )}
        {awayLogo && (
          <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-[15vw] h-[15vw] min-w-16 max-w-28 md:min-w-20 md:max-w-36 z-20 -mt-2">
            <img src={awayLogo} alt={`${awayTeam || 'Away team'} logo`} className="w-full h-full object-contain drop-shadow-xl" loading="lazy" />
          </div>
        )}

        {/* Home Team Color */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/2 z-10 flex items-center justify-end"
          style={{
            backgroundColor: homeBgColor || '#1a1a1a',
            clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)'
          }}
        >
          <span
            className="font-bebas tracking-wide uppercase text-center leading-tight overflow-hidden"
            style={{
              fontSize: 'clamp(0.7rem, 3.5vw, 1.2rem)',
              textShadow: isLightColor(homeBgColor) ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)',
              color: isLightColor(homeBgColor) ? '#000000' : '#ffffff',
              lineHeight: 1.1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              wordBreak: 'break-word' as const,
              marginLeft: '36%',
              marginRight: '20%',
              maxWidth: '50%',
            }}
          >
            {homeTeam}
          </span>
        </div>

        {/* Away Team Color */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 z-10 flex items-center justify-start"
          style={{
            backgroundColor: awayBgColor || '#8B0000',
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)'
          }}
        >
          <span
            className="font-bebas tracking-wide uppercase text-center leading-tight overflow-hidden"
            style={{
              fontSize: 'clamp(0.7rem, 3.5vw, 1.2rem)',
              textShadow: isLightColor(awayBgColor) ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)',
              color: isLightColor(awayBgColor) ? '#000000' : '#ffffff',
              lineHeight: 1.1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              wordBreak: 'break-word' as const,
              marginLeft: '20%',
              marginRight: '36%',
              maxWidth: '50%',
            }}
          >
            {awayTeam}
          </span>
        </div>

        {/* VS Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          {isPostMatch && homeScore !== null && awayScore !== null ? (
            <div className="rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center shadow-lg border-2 border-white bg-primary">
              <span className="text-black text-lg md:text-xl font-bebas font-bold">
                {homeScore} - {awayScore}
              </span>
            </div>
          ) : (
            <div
              className="relative rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden"
              style={{
                backgroundImage: `url(${smokyBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black/30" />
              <span className="relative text-white text-base md:text-lg font-bebas font-bold">VS</span>
            </div>
          )}
        </div>
      </div>

      {/* Match Date - no margin, gradient will overlay match image */}
      {matchDate && (
        <div 
          className="text-center py-2"
          style={{ backgroundColor: '#000000' }}
        >
          <span 
            className="text-white font-bebas tracking-wider text-base md:text-lg italic"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.6)'
            }}
          >
            {new Date(matchDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// Quick Navigation Dropdown
const QuickNavDropdown = ({ sections, lang }: { sections: { id: string; label: string }[]; lang?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const keyInfoSections = sections.filter(s =>
    s.id.includes('overview') ||
    s.id.includes('strengths') ||
    s.id.includes('weaknesses') ||
    s.id.includes('matchups') ||
    s.id.includes('scheme') ||
    s.id.includes('improvements')
  );
  const pointSections = sections.filter(s => s.id.includes('point'));

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      setTimeout(() => {
        dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isOpen]);

  const handleNavigate = (sectionId: string) => {
    setIsOpen(false);

    // Dispatch custom event to open the target section
    window.dispatchEvent(new CustomEvent('analysis-nav', { detail: { sectionId } }));

    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          const finalY = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, finalY), behavior: 'instant' as ScrollBehavior });
        }
      }, 100);
    });
  };

  return (
    <div className="relative z-40">
      {/* Radiating dark shader ring behind the button */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(253,198,27,0.7) 0%, rgba(253,198,27,0.5) 30%, rgba(253,198,27,0.2) 60%, transparent 100%)'
        }}
      />
      
      <div 
        className="relative"
        style={{
          backgroundColor: '#000000',
          transform: 'scaleY(-1)'
        }}
      >
      {/* Inner container to flip content back to normal */}
      <div style={{ transform: 'scaleY(-1)' }}>
      
      <motion.div
        ref={dropdownRef}
        className="relative py-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="relative flex justify-center px-4">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-base md:text-lg px-6 py-2 font-bebas tracking-wider hover:bg-white/90 transition-colors border-primary border-2 text-black rounded-2xl"
                style={{
                  backgroundImage: `url(${whiteMarble})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {et(lang, "jump_to_section", "Jump to Section")}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[96vw] max-w-none max-h-[70vh] overflow-y-auto z-50 p-4 md:p-6 border-primary border-2 rounded-2xl bg-black"
              side="bottom"
              align="center"
              sideOffset={4}
              avoidCollisions={true}
            >
              {keyInfoSections.length > 0 && (
                <div className="relative mb-4 text-center">
                  <div className="py-2 text-xl md:text-2xl uppercase tracking-widest font-bebas border-b mb-4 text-primary border-primary/50">
                    {et(lang, "key_info", "Key Info")}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {keyInfoSections.map((section) => (
                      <DropdownMenuItem
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="cursor-pointer hover:opacity-80 font-bebas tracking-wide text-sm md:text-base py-1.5 px-3 rounded-xl border text-black border-primary/60"
                        style={{
                          backgroundImage: `url(${whiteMarble})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {section.label}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}

              {keyInfoSections.length > 0 && pointSections.length > 0 && (
                <div className="relative my-3 h-[1px] bg-primary opacity-40" />
              )}

              {pointSections.length > 0 && (
                <div className="relative text-center">
                  <div className="py-2 text-xl md:text-2xl uppercase tracking-widest font-bebas border-b mb-4 text-primary border-primary/50">
                    {et(lang, "analysis_points", "Analysis Points")}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {pointSections.map((section) => (
                      <DropdownMenuItem
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="cursor-pointer hover:opacity-80 font-bebas tracking-wide text-sm md:text-base py-1.5 px-3 rounded-xl border text-black border-primary/60"
                        style={{
                          backgroundImage: `url(${whiteMarble})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {section.label}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
      </div>
      </div>
    </div>
  );
};

// Video with annotation overlay for analysis points
// Uses the shared ReadOnlyAnnotationPlayback which mirrors the editor's freeze/pause
// behaviour and supports all annotation types including space-oval, distance, etc.
const AnnotatedPointVideo = ({ url, annotationId, crop, audioUrl }: { url: string; annotationId?: string; crop?: { top: number; right: number; bottom: number; left: number } | null; audioUrl?: string }) => {
  const hasCrop = !!(crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0));
  const containerRef = useRef<HTMLDivElement>(null);
  const cropShiftStyle = hasCrop && crop
    ? {
        marginTop: `-${(crop.top / (100 - crop.top - crop.bottom)) * 100}%`,
        marginBottom: `-${(crop.bottom / (100 - crop.top - crop.bottom)) * 100}%`,
        marginLeft: `-${(crop.left / (100 - crop.left - crop.right)) * 100}%`,
        marginRight: `-${(crop.right / (100 - crop.left - crop.right)) * 100}%`,
      }
    : undefined;

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg border-2 border-primary shadow-md group bg-black">
      <div style={hasCrop ? { overflow: 'hidden' } : undefined}>
        <div style={cropShiftStyle}>
          <ReadOnlyAnnotationPlayback
            videoUrl={url}
            annotationProjectId={annotationId}
          />
        </div>
      </div>
      {/* Fullscreen button */}
      <button
        onClick={handleFullscreen}
        className="absolute top-2 right-2 z-20 p-1.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        title="Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
      {audioUrl && (
        <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">
          <AudioPlaybackButton audioUrl={audioUrl} />
        </div>
      )}
    </div>
  );
};

const AnalysisViewer = () => {
  const { analysisId: rawSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  // Public/example links from /representation pass `?lang=` so the viewer
  // opens in the visitor's chosen site language. URL param wins over the
  // global language context.
  const lang = searchParams.get("lang") || language || "en";
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  
  const [pageLoaded, setPageLoaded] = useState(false);

  // Minimum loading screen time (matches FFF: 6.5s branded loading)
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinDelayPassed(true), 6500);
    return () => clearTimeout(timer);
  }, []);

  // Extract UUID from slug
  const analysisId = rawSlug ? extractAnalysisIdFromSlug(rawSlug) : null;

  // Mark page as loaded after short delay
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (analysisId) fetchAnalysis();
  }, [analysisId]);

  const fetchAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoading(false);
        return;
      }

      // Player name resolution chain (matches FFF):
      // 1. Check player_name stored on analysis
      // 2. Check analysis_player_tags
      // 3. Check player_analysis linkage
      // 4. Check fixture linkage
      let resolvedName: string | null = data.player_name || null;

      if (!resolvedName) {
        const { data: tagData } = await supabase
          .from("analysis_player_tags")
          .select("player_id")
          .eq("analysis_id", analysisId)
          .limit(1)
          .maybeSingle();

        if (tagData?.player_id) {
          const { data: playerData } = await supabase
            .from("players")
            .select("name")
            .eq("id", tagData.player_id)
            .maybeSingle();
          if (playerData?.name) {
            resolvedName = playerData.name.toUpperCase();
          }
        }
      }

      if (!resolvedName) {
        const { data: linkedData } = await supabase
          .from("player_analysis")
          .select("player_id, players(name)")
          .eq("analysis_writer_id", analysisId)
          .maybeSingle();

        if (linkedData?.players) {
          resolvedName = ((linkedData.players as any).name as string).toUpperCase();
        }

        if (!resolvedName && data.fixture_id) {
          const { data: fixturePlayer } = await supabase
            .from("player_analysis")
            .select("players(name)")
            .eq("fixture_id", data.fixture_id)
            .maybeSingle();

          if (fixturePlayer?.players) {
            resolvedName = ((fixturePlayer.players as any).name as string).toUpperCase();
          }
        }
      }

      setPlayerName(resolvedName);

      const status = ["live", "draft", "hidden"].includes(String(data.visibility_status || "").toLowerCase())
        ? (String(data.visibility_status).toLowerCase() as "live" | "draft" | "hidden")
        : "live";

      const parsedAnalysis: Analysis = {
        ...data,
        match_date: data.match_date || null,
        home_team_logo: data.home_team_logo || null,
        away_team_logo: data.away_team_logo || null,
        match_image_url: data.match_image_url || null,
        home_team_bg_color: data.home_team_bg_color || '#1a1a1a',
        away_team_bg_color: data.away_team_bg_color || '#8B0000',
        selected_scheme: data.selected_scheme || null,
        starting_xi: Array.isArray(data.starting_xi) ? data.starting_xi : [],
        kit_primary_color: data.kit_primary_color || '#FFD700',
        kit_secondary_color: data.kit_secondary_color || '#000000',
        visibility_status: status,
        estimated_ready_at: data.estimated_ready_at || null,
        matchups: Array.isArray(data.matchups) ? data.matchups : [],
        points: Array.isArray(data.points) ? data.points : []
      };

      setAnalysis(parsedAnalysis);
    } catch (error: any) {
      console.error("Error fetching analysis:", error);
      toast.error(et(lang, "failed_to_load_analysis", "Failed to load analysis"));
    } finally {
      setLoading(false);
    }
  };

  const showLoading = loading || !minDelayPassed;

  if (showLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Rise marble background */}
        <div className="absolute inset-0">
          <img src={blackMarble} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>
        <TacticalSymbols />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative text-center flex flex-col items-center gap-6"
        >
          <motion.img 
            src={riseLogo} 
            alt="Rise Agency" 
            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl"
            animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="h-[2px] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 160, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="font-bebas tracking-[0.4em] uppercase text-lg md:text-xl text-primary drop-shadow-lg"
          >
            {et(lang, "loading_analysis", "Loading Analysis")}
          </motion.p>
          <div className="flex gap-3">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-muted-foreground text-xl mb-4">{et(lang, "analysis_not_found", "Analysis not found")}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {et(lang, "go_back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  const isPreMatch = analysis.analysis_type === "pre-match";
  const isPostMatch = analysis.analysis_type === "post-match";
  const isConcept = analysis.analysis_type === "concept";

  const visibilityStatus = analysis.visibility_status || "live";
  const statusConfig = {
    live: {
      label: "Live",
      icon: Radio,
      className: "bg-primary/15 text-primary border-primary/30",
      message: "This analysis is fully visible to the player.",
    },
    draft: {
      label: "Draft",
      icon: FileEdit,
      className: "bg-muted text-foreground border-border",
      message: "This analysis is currently shown as in progress.",
    },
    hidden: {
      label: "Hidden",
      icon: EyeOff,
      className: "bg-destructive/10 text-destructive border-destructive/30",
      message: "This analysis is currently hidden from the player.",
    },
  } as const;
  const activeStatus = statusConfig[visibilityStatus as keyof typeof statusConfig] || statusConfig.live;
  const StatusIcon = activeStatus.icon;

  // Build quick nav sections
  const navSections = [];
  if (analysis.key_details) navSections.push({ id: SECTION_IDS.overview, label: et(lang, "overview", "Overview") });
  if (analysis.opposition_strengths) navSections.push({ id: SECTION_IDS.strengths, label: et(lang, "opposition_strengths", "Opposition Strengths") });
  if (analysis.opposition_weaknesses) navSections.push({ id: SECTION_IDS.weaknesses, label: et(lang, "opposition_weaknesses", "Opposition Weaknesses") });
  if (analysis.matchups?.length > 0) navSections.push({ id: SECTION_IDS.matchups, label: et(lang, "potential_matchups", "Potential Matchups") });
  if (analysis.scheme_title || analysis.selected_scheme) navSections.push({ id: SECTION_IDS.scheme, label: et(lang, "scheme", "Scheme") });
  if (analysis.strengths_improvements) navSections.push({ id: SECTION_IDS.improvements, label: et(lang, "strengths_improvements", "Strengths & Areas for Improvement") });
  if (analysis.points && analysis.points.length > 0) {
    analysis.points.forEach((point: any, index: number) => {
      navSections.push({ id: `section-point-${index}`, label: point.title });
    });
  }

  return (
    <div className="min-h-screen relative bg-black">
      {/* Allow landscape rotation on mobile for wider view */}
      <style>{`
        @media screen and (orientation: landscape) and (max-height: 500px) {
          .analysis-viewer-container {
            max-width: 100% !important;
          }
        }
      `}</style>
      {/* A4 width container - 210mm ≈ 794px, expands in landscape mobile */}
      <div 
        className="analysis-viewer-container mx-auto min-h-screen relative"
        style={{ 
          maxWidth: '794px',
          backgroundColor: 'hsl(0 0% 15%)'
        }}
      >

        {/* Video Button */}
        {analysis.video_url && (
          <motion.div
            className="fixed bottom-4 right-8 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => window.open(analysis.video_url!, '_blank')}
              className="font-bebas uppercase tracking-wider shadow-lg bg-primary text-black hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              {et(lang, "watch_video", "Watch Video")}
            </Button>
          </motion.div>
        )}

        {/* Status banner removed - no longer needed */}

        <main className="w-full mx-auto">
        {/* Pre-Match Content */}
        {isPreMatch && (
          <div className="w-full">
            <AnalysisHeader
              homeTeam={analysis.home_team}
              awayTeam={analysis.away_team}
              homeLogo={analysis.home_team_logo}
              awayLogo={analysis.away_team_logo}
              homeBgColor={analysis.home_team_bg_color}
              awayBgColor={analysis.away_team_bg_color}
              matchDate={analysis.match_date}
            />

            {/* Player/Match Image with gold arch and player name oval - exact fuelforfootball style */}
            {(analysis.player_image_url || analysis.match_image_url) && (
              <ScrollReveal className="w-full">
                <div className="relative w-full overflow-hidden">
                  {/* Player image */}
                  <div className="relative w-full" style={{ height: '400px', maxHeight: '400px' }}>
                    <img
                      src={analysis.player_image_url || analysis.match_image_url || ''}
                      alt="Match"
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Black gradient fading down from top - overlays match image */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
                      }}
                    />
                  </div>
                  
                  {/* Gold arch with transparent outer glow and solid center - positioned at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 z-30">
                    {/* Outer transparent glow arch - fades naturally into image */}
                    <svg 
                      className="w-full"
                      viewBox="0 0 400 120" 
                      preserveAspectRatio="none"
                      style={{ height: '120px' }}
                    >
                      <defs>
                        <linearGradient id="goldFadeUp" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Semi-transparent gold outer arch - 50% opacity risegold */}
                      <path d="M0,20 Q200,70 400,20 L400,120 L0,120 Z" fill="url(#goldFadeUp)" />
                      {/* Solid gold arch band - main visible arch */}
                      <path d="M0,50 Q200,90 400,50 L400,120 L0,120 Z" fill="hsl(var(--primary))" />
                    </svg>
                    
                    {/* Player name positioned centered on the arch */}
                    {playerName && (
                      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ paddingTop: '30px' }}>
                        <div 
                          className="relative overflow-hidden rounded-full px-8 md:px-12 py-2 md:py-3"
                          style={{
                            backgroundImage: `url(${blackMarble})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: `2px solid hsl(var(--primary))`,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                        >
                          {/* Dark overlay for smoky effect */}
                          <div className="absolute inset-0 bg-black/40 rounded-full" />
                          <h2 
                            className="relative text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-widest text-center drop-shadow-md text-white"
                          >
                            <HoverText text={playerName.toUpperCase()} />
                          </h2>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Fallback player name section when no image - exact fuelforfootball style */}
            {!(analysis.player_image_url || analysis.match_image_url) && playerName && (
              <div className="relative overflow-hidden">
                {/* Gold arch with transparent outer glow and solid center */}
                <div className="relative z-30" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                  <svg 
                    className="w-full"
                    viewBox="0 0 400 120" 
                    preserveAspectRatio="none"
                    style={{ height: '120px' }}
                  >
                    <defs>
                      <linearGradient id="goldFadeUpFallback" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                        <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Semi-transparent gold outer arch - 50% opacity risegold */}
                    <path d="M0,20 Q200,70 400,20 L400,120 L0,120 Z" fill="url(#goldFadeUpFallback)" />
                    {/* Solid gold arch band - main visible arch */}
                    <path d="M0,50 Q200,90 400,50 L400,120 L0,120 Z" fill="hsl(var(--primary))" />
                  </svg>
                  
                  {/* Player name positioned centered on the arch */}
                  <div className="absolute inset-0 flex items-center justify-center z-10" style={{ paddingTop: '30px' }}>
                    <div 
                      className="relative overflow-hidden rounded-full px-8 md:px-12 py-2 md:py-3"
                      style={{
                        backgroundImage: `url(${blackMarble})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: `2px solid hsl(var(--primary))`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                      }}
                    >
                      {/* Dark overlay for smoky effect */}
                      <div className="absolute inset-0 bg-black/40 rounded-full" />
                      <h2 
                        className="relative text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-widest text-center drop-shadow-md text-white"
                      >
                        <HoverText text={playerName.toUpperCase()} />
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {navSections.length > 0 && <QuickNavDropdown sections={navSections} />}

            {/* Overview - Section 0 (no flip) */}
            {analysis.key_details && (
              <ExpandableSection title="Overview" id={SECTION_IDS.overview} defaultOpen flipBackground={false}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-base md:text-lg text-black">
                    {analysis.key_details}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {/* Opposition Strengths - Section 1 (flip) */}
            {analysis.opposition_strengths && (
              <ExpandableSection title="Opposition Strengths" id={SECTION_IDS.strengths} icon="plus" flipBackground={true}>
                <div className="space-y-3">
                  {analysis.opposition_strengths.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                    return (
                      <TextReveal key={idx} delay={idx * 0.1}>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 bg-primary">
                            <Plus className="w-4 h-4 md:w-5 md:h-5 text-black" />
                          </div>
                          <p className="text-sm md:text-base leading-relaxed pt-0.5 italic text-black">{cleanLine}</p>
                        </div>
                      </TextReveal>
                    );
                  })}
                </div>
              </ExpandableSection>
            )}

            {/* Opposition Weaknesses - Section 2 (no flip) */}
            {analysis.opposition_weaknesses && (
              <ExpandableSection title="Opposition Weaknesses" id={SECTION_IDS.weaknesses} icon="minus" flipBackground={false}>
                <div className="space-y-3">
                  {analysis.opposition_weaknesses.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                    return (
                      <TextReveal key={idx} delay={idx * 0.1}>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 bg-primary">
                            <Minus className="w-4 h-4 md:w-5 md:h-5 text-black" />
                          </div>
                          <p className="text-sm md:text-base leading-relaxed pt-0.5 italic text-black">{cleanLine}</p>
                        </div>
                      </TextReveal>
                    );
                  })}
                </div>
              </ExpandableSection>
            )}

            {/* Key Matchups - Section 3 (flip) */}
            {analysis.matchups && analysis.matchups.length > 0 && (
            <ExpandableSection title="Potential Matchup(s)" id={SECTION_IDS.matchups} transparentContent flipBackground={true}>
                <div className="space-y-4">
                  {analysis.matchups.map((matchup: any, index: number) => (
                    <TextReveal key={index} delay={index * 0.15}>
                      <div className="relative rounded-xl overflow-hidden bg-card border-2 border-primary shadow-lg">
                        <div className="relative flex">
                          <div className="w-28 md:w-40 flex-shrink-0 self-stretch">
                            {matchup.image_url ? (
                              <img src={matchup.image_url} alt={matchup.name} className="w-full h-full object-cover object-top" style={{ minHeight: '100%' }} />
                            ) : (
                              <div className="w-full h-full bg-black/40 flex items-center justify-center text-white/50 text-xs min-h-[120px]">No image</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 p-4 md:p-5 flex flex-col justify-center">
                            <h3 className="font-bebas text-lg md:text-xl uppercase tracking-wide text-white drop-shadow-lg leading-tight break-words">
                              {matchup.name?.toUpperCase()}
                            </h3>
                            {matchup.shirt_number && (
                              <p className="text-2xl md:text-3xl font-bold mt-1 text-primary">#{matchup.shirt_number}</p>
                            )}
                            {matchup.notes && (
                              <div className="mt-3 pt-3 border-t border-primary/40">
                                <p className="text-sm md:text-base text-white/90 leading-relaxed break-words whitespace-pre-wrap">{matchup.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TextReveal>
                  ))}
                </div>
              </ExpandableSection>
            )}

            {/* Scheme Section - Section 4 (no flip) */}
            {(analysis.scheme_title || analysis.selected_scheme) && (
              <ExpandableSection title={analysis.scheme_title || "Tactical Scheme"} id={SECTION_IDS.scheme} flipBackground={false}>
                <div className="space-y-4 md:space-y-6">
                  {analysis.scheme_paragraph_1 && (
                    <TextReveal>
                      <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                        {analysis.scheme_paragraph_1}
                      </p>
                    </TextReveal>
                  )}

                  {analysis.selected_scheme && (
                    <TextReveal delay={0.2}>
                      <div className="relative rounded-lg min-h-[500px] md:min-h-[600px] border-4 border-primary shadow-xl overflow-hidden bg-gradient-to-b from-green-700 via-green-800 to-green-900">
                        {/* Field markings - responsive */}
                        <div className="absolute inset-4 md:inset-8 border-2 border-white/30 rounded-lg"></div>
                        <div className="absolute inset-x-4 md:inset-x-8 top-1/2 h-0.5 bg-white/30"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-20 md:h-20 border-2 border-white/30 rounded-full"></div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-4 md:top-8 w-32 md:w-48 h-16 md:h-24 border-2 border-white/30 border-t-0"></div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-8 w-32 md:w-48 h-16 md:h-24 border-2 border-white/30 border-b-0"></div>

                        <div className="text-white text-center py-3 md:py-4 text-xl md:text-2xl font-bebas tracking-wider">
                          {analysis.selected_scheme}
                        </div>

                        {analysis.starting_xi && analysis.starting_xi.length > 0 && (
                          <div className="absolute inset-0 p-4 md:p-8">
                            {analysis.starting_xi.map((player: any, index: number) => (
                              <div
                                key={index}
                                className="absolute flex flex-col items-center gap-0.5 md:gap-1"
                                style={{
                                  left: `${player.x}%`,
                                  top: `${player.y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <div className="scale-75 md:scale-100">
                                  <PlayerKit
                                    primaryColor={analysis.kit_primary_color || '#FFD700'}
                                    secondaryColor={analysis.kit_secondary_color || '#000000'}
                                    numberColor={(analysis as any).kit_number_color || 'white'}
                                    collarColor={(analysis as any).kit_collar_color}
                                    stripeStyle={(analysis as any).kit_stripe_style || 'none'}
                                    number={player.shirt_number || player.number || ''}
                                  />
                                </div>
                                <div className="bg-black/80 text-white px-1.5 md:px-2 py-0.5 rounded text-[9px] md:text-xs font-bold whitespace-nowrap max-w-[60px] md:max-w-none truncate">
                                  {player.name || player.surname || player.position}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TextReveal>
                  )}

                  {analysis.scheme_paragraph_2 && (
                    <TextReveal delay={0.3}>
                      <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                        {analysis.scheme_paragraph_2}
                      </p>
                    </TextReveal>
                  )}
                </div>
              </ExpandableSection>
            )}

            {/* Points - alternating flip starting from section 5 */}
            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => {
                  // Points start at section index 5, so flip odd-indexed points (5=flip, 6=no, 7=flip, etc.)
                  const sectionIndex = 5 + index;
                  const shouldFlip = sectionIndex % 2 === 1;
                  return (
                    <ExpandableSection key={index} title={point.title} id={`section-point-${index}`} flipBackground={shouldFlip}>
                      <div className="space-y-4 md:space-y-6">
                        {point.paragraph_1 && (
                          <TextReveal>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_1}
                            </p>
                          </TextReveal>
                        )}
                        {point.images && point.images.length > 0 && (
                          <TextReveal delay={0.15}>
                            <div className="flex flex-col gap-4">
                              {point.images.map((img: string, imgIndex: number) => (
                                <img
                                  key={imgIndex}
                                  src={img}
                                  alt={`${point.title} - Image ${imgIndex + 1}`}
                                  className="w-full rounded-lg shadow-md border-2 border-primary"
                                />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {(point.video_urls?.length > 0 || point.video_url) && (
                          <TextReveal delay={0.2}>
                            <div className="flex flex-col gap-4 -mx-4 md:-mx-6">
                              {(point.video_urls || (point.video_url ? [point.video_url] : [])).map((url: string, vidIndex: number) => (
                                <AnnotatedPointVideo
                                  key={vidIndex}
                                  url={url}
                                  annotationId={point.annotation_ids?.[url]}
                                  crop={point.video_crops?.[url]}
                                  audioUrl={vidIndex === 0 ? point.audio_url : undefined}
                                />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {point.paragraph_2 && (
                          <TextReveal delay={0.25}>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_2}
                            </p>
                          </TextReveal>
                        )}
                        {point.concept_tags?.length > 0 && (
                          <ConceptTagsDisplay conceptTagIds={point.concept_tags} />
                        )}
                      </div>
                    </ExpandableSection>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Post-Match Content */}
        {isPostMatch && (
          <div className="w-full">
            <AnalysisHeader
              homeTeam={analysis.home_team}
              awayTeam={analysis.away_team}
              homeLogo={analysis.home_team_logo}
              awayLogo={analysis.away_team_logo}
              homeBgColor={analysis.home_team_bg_color}
              awayBgColor={analysis.away_team_bg_color}
              homeScore={analysis.home_score}
              awayScore={analysis.away_score}
              matchDate={analysis.match_date}
              isPostMatch
            />

            {/* Player/Match Image with gold arch and player name oval - same as pre-match */}
            {(analysis.player_image_url || analysis.match_image_url) && (
              <ScrollReveal className="w-full">
                <div className="relative w-full overflow-hidden">
                  {/* Player image */}
                  <div className="relative w-full" style={{ height: '400px', maxHeight: '400px' }}>
                    <img
                      src={analysis.match_image_url || analysis.player_image_url || ''}
                      alt="Match"
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Black gradient fading down from top - overlays match image */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
                      }}
                    />
                  </div>
                  
                  {/* Gold arch with transparent outer glow and solid center - positioned at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 z-30">
                    {/* Outer transparent glow arch - fades naturally into image */}
                    <svg 
                      className="w-full"
                      viewBox="0 0 400 120" 
                      preserveAspectRatio="none"
                      style={{ height: '120px' }}
                    >
                      <defs>
                        <linearGradient id="goldFadeUpPostMatch" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Semi-transparent gold outer arch - 50% opacity risegold */}
                      <path d="M0,20 Q200,70 400,20 L400,120 L0,120 Z" fill="url(#goldFadeUpPostMatch)" />
                      {/* Solid gold arch band - main visible arch */}
                      <path d="M0,50 Q200,90 400,50 L400,120 L0,120 Z" fill="hsl(var(--primary))" />
                    </svg>
                    
                    {/* Player name positioned centered on the arch */}
                    {playerName && (
                      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ paddingTop: '30px' }}>
                        <div 
                          className="relative overflow-hidden rounded-full px-8 md:px-12 py-2 md:py-3"
                          style={{
                            backgroundImage: `url(${blackMarble})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: `2px solid hsl(var(--primary))`,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                          }}
                        >
                          {/* Dark overlay for smoky effect */}
                          <div className="absolute inset-0 bg-black/40 rounded-full" />
                          <h2 
                            className="relative text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-widest text-center drop-shadow-md text-white"
                          >
                            <HoverText text={playerName.toUpperCase()} />
                          </h2>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Fallback player name section when no image - same as pre-match */}
            {!(analysis.player_image_url || analysis.match_image_url) && playerName && (
              <div className="relative overflow-hidden">
                {/* Gold arch with transparent outer glow and solid center */}
                <div className="relative z-30" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                  <svg 
                    className="w-full"
                    viewBox="0 0 400 120" 
                    preserveAspectRatio="none"
                    style={{ height: '120px' }}
                  >
                    <defs>
                      <linearGradient id="goldFadeUpPostMatchFallback" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                        <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Semi-transparent gold outer arch - 50% opacity risegold */}
                    <path d="M0,20 Q200,70 400,20 L400,120 L0,120 Z" fill="url(#goldFadeUpPostMatchFallback)" />
                    {/* Solid gold arch band - main visible arch */}
                    <path d="M0,50 Q200,90 400,50 L400,120 L0,120 Z" fill="hsl(var(--primary))" />
                  </svg>
                  
                  {/* Player name positioned centered on the arch */}
                  <div className="absolute inset-0 flex items-center justify-center z-10" style={{ paddingTop: '30px' }}>
                    <div 
                      className="relative overflow-hidden rounded-full px-8 md:px-12 py-2 md:py-3"
                      style={{
                        backgroundImage: `url(${blackMarble})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: `2px solid hsl(var(--primary))`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                      }}
                    >
                      {/* Dark overlay for smoky effect */}
                      <div className="absolute inset-0 bg-black/40 rounded-full" />
                      <h2 
                        className="relative text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-widest text-center drop-shadow-md text-white"
                      >
                        <HoverText text={playerName.toUpperCase()} />
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {navSections.length > 0 && <QuickNavDropdown sections={navSections} />}

            {/* Overview - Section 0 (no flip) */}
            {analysis.key_details && (
              <ExpandableSection title="Overview" id={SECTION_IDS.overview} defaultOpen flipBackground={false}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                    {analysis.key_details}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {/* Improvements - Section 1 (flip) */}
            {analysis.strengths_improvements && (
              <ExpandableSection title="Strengths & Areas for Improvement" id={SECTION_IDS.improvements} flipBackground={true} transparentContent>
                {(() => {
                  // Parse and group items by color
                  const items = analysis.strengths_improvements.split('|').map((part: string) => {
                    const trimmedPart = part.trim();
                    const match = trimmedPart.match(/^(Green|Amber|Red):\s*(.*)$/i);
                    const color = match ? match[1].toLowerCase() : 'green';
                    const text = match ? match[2].trim() : trimmedPart;
                    return { color, text };
                  }).filter(item => item.text);

                  const greenItems = items.filter(i => i.color === 'green');
                  const amberItems = items.filter(i => i.color === 'amber');
                  const redItems = items.filter(i => i.color === 'red');

                  const CategoryCard = ({ 
                    title, 
                    items, 
                    borderColor, 
                    bgColor, 
                    textColor,
                    delay 
                  }: { 
                    title: string; 
                    items: { color: string; text: string }[]; 
                    borderColor: string; 
                    bgColor: string;
                    textColor: string;
                    delay: number;
                  }) => {
                    if (items.length === 0) return null;
                    return (
                      <TextReveal delay={delay}>
                        <div className={`rounded-2xl overflow-hidden border-2 ${borderColor} ${bgColor} shadow-xl`}>
                          {/* Header */}
                          <div className={`py-3 px-4 ${borderColor.replace('border-', 'bg-')} bg-opacity-100`}>
                            <h3 className="font-bebas text-lg md:text-xl uppercase tracking-wider text-center text-white drop-shadow-md">
                              {title}
                            </h3>
                          </div>
                          {/* Content */}
                          <div className="p-4 md:p-5 space-y-3">
                            {items.map((item, idx) => (
                              <div key={idx} className="text-center">
                                <p className={`text-sm md:text-base leading-relaxed ${textColor}`}>
                                  {item.text}
                                </p>
                                {idx < items.length - 1 && (
                                  <div className={`mt-3 h-px ${borderColor.replace('border-', 'bg-')} opacity-30`} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TextReveal>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      <CategoryCard 
                        title="Strengths" 
                        items={greenItems} 
                        borderColor="border-green-500" 
                        bgColor="bg-green-950/50"
                        textColor="text-green-100"
                        delay={0}
                      />
                      <CategoryCard 
                        title="Areas for Consistency" 
                        items={amberItems} 
                        borderColor="border-amber-500" 
                        bgColor="bg-amber-950/50"
                        textColor="text-amber-100"
                        delay={0.1}
                      />
                      <CategoryCard 
                        title="Areas for Improvement" 
                        items={redItems} 
                        borderColor="border-red-500" 
                        bgColor="bg-red-950/50"
                        textColor="text-red-100"
                        delay={0.2}
                      />
                    </div>
                  );
                })()}
              </ExpandableSection>
            )}

            {/* Points - alternating from section 2 */}
            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => {
                  const sectionIndex = 2 + index;
                  const shouldFlip = sectionIndex % 2 === 1;
                  return (
                    <ExpandableSection key={index} title={point.title} id={`section-point-${index}`} flipBackground={shouldFlip}>
                      <div className="space-y-4 md:space-y-6">
                        {point.paragraph_1 && (
                          <TextReveal>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_1}
                            </p>
                          </TextReveal>
                        )}
                        {point.images && point.images.length > 0 && (
                          <TextReveal delay={0.15}>
                            <div className="flex flex-col gap-4">
                              {point.images.map((img: string, imgIndex: number) => (
                                <img key={imgIndex} src={img} alt={`${point.title} - Image ${imgIndex + 1}`} className="w-full rounded-lg shadow-md border-2 border-primary" />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {(point.video_urls?.length > 0 || point.video_url) && (
                          <TextReveal delay={0.2}>
                            <div className="flex flex-col gap-4 -mx-4 md:-mx-6">
                              {(point.video_urls || (point.video_url ? [point.video_url] : [])).map((url: string, vidIndex: number) => (
                                <AnnotatedPointVideo
                                  key={vidIndex}
                                  url={url}
                                  annotationId={point.annotation_ids?.[url]}
                                  crop={point.video_crops?.[url]}
                                  audioUrl={vidIndex === 0 ? point.audio_url : undefined}
                                />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {point.paragraph_2 && (
                          <TextReveal delay={0.25}>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_2}
                            </p>
                          </TextReveal>
                        )}
                        {point.concept_tags?.length > 0 && (
                          <ConceptTagsDisplay conceptTagIds={point.concept_tags} />
                        )}
                      </div>
                    </ExpandableSection>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Concept Content */}
        {isConcept && (
          <div className="w-full">
            <motion.div
              className="py-6 bg-background border-4 border-primary"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col items-center">
                <img src={riseLogo} alt="Rise Agency" className="w-20 h-20 md:w-28 md:h-28 object-contain mb-2" />
                <h1 className="text-white text-lg md:text-2xl font-bebas tracking-widest uppercase mb-1">RISE AGENCY</h1>
                <p className="text-base md:text-xl font-bebas tracking-wider uppercase mb-4 text-primary">REALISE YOUR POTENTIAL</p>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="bg-black/50 backdrop-blur-sm border-white/30 hover:bg-black/70 text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </motion.div>

            <section className="relative w-full py-6 bg-background">
              <TacticalSymbols />
              <div className="relative px-4 md:px-6">
                <ContentCard>
                  <div className="text-center">
                    <span className="text-xs md:text-sm font-bebas uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3 bg-primary text-black">Concept</span>
                    <h1 className="text-2xl md:text-4xl font-bebas uppercase tracking-wider text-black">
                      {analysis.title || "Concept Analysis"}
                    </h1>
                  </div>
                </ContentCard>
              </div>
            </section>

            {/* Concept - Section 0 (no flip) */}
            {analysis.concept && (
              <ExpandableSection title="Concept" defaultOpen flipBackground={false}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                    {analysis.concept}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {/* Explanation - Section 1 (flip) */}
            {analysis.explanation && (
              <ExpandableSection title="Explanation" flipBackground={true}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                    {analysis.explanation}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {/* Points - alternating from section 2 */}
            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => {
                  const sectionIndex = 2 + index;
                  const shouldFlip = sectionIndex % 2 === 1;
                  return (
                    <ExpandableSection key={index} title={point.title} id={`section-point-${index}`} flipBackground={shouldFlip}>
                      <div className="space-y-4 md:space-y-6">
                        {point.paragraph_1 && (
                          <TextReveal>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_1}
                            </p>
                          </TextReveal>
                        )}
                        {point.images && point.images.length > 0 && (
                          <TextReveal delay={0.15}>
                            <div className="flex flex-col gap-4">
                              {point.images.map((img: string, imgIndex: number) => (
                                <img key={imgIndex} src={img} alt={`${point.title} - Image ${imgIndex + 1}`} className="w-full rounded-lg border-2 border-primary" />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {(point.video_urls?.length > 0 || point.video_url) && (
                          <TextReveal delay={0.2}>
                            <div className="flex flex-col gap-4 -mx-4 md:-mx-6">
                              {(point.video_urls || (point.video_url ? [point.video_url] : [])).map((url: string, vidIndex: number) => (
                                <AnnotatedPointVideo
                                  key={vidIndex}
                                  url={url}
                                  annotationId={point.annotation_ids?.[url]}
                                  crop={point.video_crops?.[url]}
                                  audioUrl={vidIndex === 0 ? point.audio_url : undefined}
                                />
                              ))}
                            </div>
                          </TextReveal>
                        )}
                        {point.paragraph_2 && (
                          <TextReveal delay={0.25}>
                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-black">
                              {point.paragraph_2}
                            </p>
                          </TextReveal>
                        )}
                      </div>
                    </ExpandableSection>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Back to Top - simple black background */}
        <motion.div
          className="flex justify-center py-8 bg-black"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
            className="font-bebas uppercase tracking-wider text-lg px-8 py-4 bg-primary text-black border-2 border-primary hover:bg-primary/90 rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2 rotate-90" />
            Back to Top
          </Button>
        </motion.div>
      </main>
      </div>
    </div>
  );
};

export default AnalysisViewer;
