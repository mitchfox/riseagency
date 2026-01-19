import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronDown, Play, Plus, Minus, Download } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HoverText } from "@/components/HoverText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import riseLogo from "@/assets/logo.png";
import smokyBackground from "@/assets/smudged-marble-overlay.png";

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
  stripeStyle?: 'none' | 'thin' | 'thick' | 'halves';
  number: string;
}

const PlayerKit = ({ primaryColor, secondaryColor, numberColor = 'white', stripeStyle = 'thick', number }: KitProps) => {
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
      <path d="M42 28 L50 40 L58 28" fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="50" cy="25" rx="10" ry="3" fill={secondaryColor} />

      {/* Number */}
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

// Section title with marble background
const SectionTitle = ({ title, icon }: { title: string; icon?: "plus" | "minus" | null }) => (
  <div className="relative mb-4">
    <div className="relative rounded-lg overflow-hidden cursor-pointer group bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-2 border-primary">
      <div className="py-3 md:py-4 px-4">
        <div className="flex items-center justify-center gap-3">
          {icon === "plus" && <Plus className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
          {icon === "minus" && <Minus className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
          <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-widest text-center text-primary drop-shadow-md">
            <HoverText text={title} />
          </h2>
        </div>
      </div>
    </div>
  </div>
);

// Content card
const ContentCard = ({ children, className = "", transparent = false }: { children: React.ReactNode; className?: string; transparent?: boolean }) => (
  <div className={`rounded-lg p-4 md:p-6 ${transparent ? 'bg-transparent' : 'bg-card/90 backdrop-blur-sm'} ${className}`}>
    {children}
  </div>
);

// Global flag to prevent auto-open during navigation
let navigationUsed = false;

// Expandable section with auto-open on scroll
const ExpandableSection = ({
  title,
  children,
  id,
  defaultOpen = false,
  icon,
  transparentContent = false,
  forceOpen = false
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  defaultOpen?: boolean;
  icon?: "plus" | "minus" | null;
  transparentContent?: boolean;
  forceOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || forceOpen);
  const [wasManuallyToggled, setWasManuallyToggled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-10% 0px -30% 0px" });

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (navigationUsed) return;
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      setLastScrollY(currentScrollY);

      if (!wasManuallyToggled) {
        if (isInView && isScrollingDown && !isOpen) {
          setIsOpen(true);
        } else if (!isInView && isOpen) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInView, isOpen, lastScrollY, wasManuallyToggled]);

  useEffect(() => {
    if (!isInView) setWasManuallyToggled(false);
  }, [isInView]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setWasManuallyToggled(true);
  };

  if (forceOpen) {
    return (
      <section ref={sectionRef} id={id} data-expandable className="relative w-full bg-background">
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
      </section>
    );
  }

  return (
    <section ref={sectionRef} id={id} data-expandable className="relative w-full bg-background">
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
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <ContentCard transparent={transparentContent}>{children}</ContentCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

// Text reveal animation
const TextReveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    {children}
  </motion.div>
);

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
      {/* Top section with logo */}
      <div className="relative py-2 px-3 bg-background">
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute left-4 md:left-8 top-4 bg-black/50 backdrop-blur-sm border-white/30 hover:bg-black/70 text-white h-8 py-1.5 px-3 text-xs z-20"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back
        </Button>

        <div className="relative flex items-center justify-center py-2">
          <img src={riseLogo} alt="Rise Agency" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
        </div>
      </div>

      {/* Team colors bar */}
      <div className="relative h-10 md:h-14 overflow-visible bg-black">
        {homeLogo && (
          <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-[15vw] h-[15vw] min-w-16 max-w-28 md:min-w-20 md:max-w-36 z-20 -mt-2">
            <img src={homeLogo} alt="" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
        )}
        {awayLogo && (
          <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-[15vw] h-[15vw] min-w-16 max-w-28 md:min-w-20 md:max-w-36 z-20 -mt-2">
            <img src={awayLogo} alt="" className="w-full h-full object-contain drop-shadow-xl" />
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
            className="font-bebas text-white tracking-wide uppercase text-center leading-tight ml-[18vw] mr-[10vw]"
            style={{
              fontSize: 'clamp(0.6rem, 2.2vw, 1.4rem)',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              lineHeight: 1.1
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
            className="font-bebas text-white tracking-wide uppercase text-center leading-tight ml-[10vw] mr-[18vw]"
            style={{
              fontSize: 'clamp(0.6rem, 2.2vw, 1.4rem)',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              lineHeight: 1.1
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

      {/* Match Date */}
      {matchDate && (
        <div className="text-center py-2 bg-black/80">
          <span className="text-white/90 font-bebas tracking-wider text-base md:text-lg italic">
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
const QuickNavDropdown = ({ sections }: { sections: { id: string; label: string }[] }) => {
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
    navigationUsed = true;

    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        const sectionButton = el.querySelector('button');
        if (sectionButton) sectionButton.click();

        setTimeout(() => {
          const finalY = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, finalY), behavior: 'instant' as ScrollBehavior });
        }, 200);
      }
    });
  };

  return (
    <div className="relative z-40">
      <motion.div
        ref={dropdownRef}
        className="relative py-5 mt-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="relative flex justify-center px-4">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-base md:text-lg px-6 py-2 font-bebas tracking-wider hover:bg-black/50 transition-colors backdrop-blur-sm bg-black/60 text-white border-primary border-2"
              >
                Jump to Section
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[96vw] max-w-none max-h-[70vh] overflow-y-auto z-50 p-4 md:p-6 bg-card/95 backdrop-blur-sm border-primary border-2"
              side="bottom"
              align="center"
              sideOffset={4}
              avoidCollisions={true}
            >
              {keyInfoSections.length > 0 && (
                <div className="relative mb-4 text-center">
                  <div className="py-2 text-xl md:text-2xl uppercase tracking-widest font-bebas border-b mb-4 text-primary border-primary/50">
                    Key Info
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {keyInfoSections.map((section) => (
                      <DropdownMenuItem
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="cursor-pointer hover:bg-primary/20 font-bebas tracking-wide text-sm md:text-base py-1.5 px-3 rounded-md border text-white bg-black/80 border-primary/60"
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
                    Analysis Points
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {pointSections.map((section) => (
                      <DropdownMenuItem
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="cursor-pointer hover:bg-primary/20 font-bebas tracking-wide text-sm md:text-base py-1.5 px-3 rounded-md border text-white bg-black/80 border-primary/60"
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
  );
};

const AnalysisViewer = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

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
        matchups: Array.isArray(data.matchups) ? data.matchups : [],
        points: Array.isArray(data.points) ? data.points : []
      };

      setAnalysis(parsedAnalysis);
    } catch (error: any) {
      console.error("Error fetching analysis:", error);
      toast.error("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-muted-foreground text-xl mb-4">Analysis not found</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isPreMatch = analysis.analysis_type === "pre-match";
  const isPostMatch = analysis.analysis_type === "post-match";
  const isConcept = analysis.analysis_type === "concept";

  // Build quick nav sections
  const navSections = [];
  if (analysis.key_details) navSections.push({ id: SECTION_IDS.overview, label: "Overview" });
  if (analysis.opposition_strengths) navSections.push({ id: SECTION_IDS.strengths, label: "Opposition Strengths" });
  if (analysis.opposition_weaknesses) navSections.push({ id: SECTION_IDS.weaknesses, label: "Opposition Weaknesses" });
  if (analysis.matchups?.length > 0) navSections.push({ id: SECTION_IDS.matchups, label: "Potential Matchups" });
  if (analysis.scheme_title || analysis.selected_scheme) navSections.push({ id: SECTION_IDS.scheme, label: "Scheme" });
  if (analysis.strengths_improvements) navSections.push({ id: SECTION_IDS.improvements, label: "Improvements" });
  if (analysis.points && analysis.points.length > 0) {
    analysis.points.forEach((point: any, index: number) => {
      navSections.push({ id: `section-point-${index}`, label: point.title });
    });
  }

  return (
    <div className="min-h-screen relative bg-background">
      {/* Gold inset vertical lines */}
      <div className="fixed top-0 bottom-0 left-[6px] w-[2px] z-10 pointer-events-none bg-primary" />
      <div className="fixed top-0 bottom-0 right-[6px] w-[2px] z-10 pointer-events-none bg-primary" />

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
            Watch Video
          </Button>
        </motion.div>
      )}

      <main className="w-full mx-auto px-[8px]">
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

            {/* Player/Match Image */}
            {(analysis.player_image_url || analysis.match_image_url) && (
              <ScrollReveal className="w-full">
                <div className="relative w-full overflow-hidden bg-background">
                  <div className="relative w-full" style={{ height: '400px', maxHeight: '400px' }}>
                    <img
                      src={analysis.player_image_url || analysis.match_image_url || ''}
                      alt="Match"
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  </div>
                </div>
              </ScrollReveal>
            )}

            {navSections.length > 0 && <QuickNavDropdown sections={navSections} />}

            {/* Overview */}
            {analysis.key_details && (
              <ExpandableSection title="Overview" id={SECTION_IDS.overview}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-base md:text-lg text-foreground">
                    {analysis.key_details}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {/* Opposition Strengths */}
            {analysis.opposition_strengths && (
              <ExpandableSection title="Opposition Strengths" id={SECTION_IDS.strengths} icon="plus">
                <div className="space-y-3">
                  {analysis.opposition_strengths.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                    return (
                      <TextReveal key={idx} delay={idx * 0.1}>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 bg-primary">
                            <Plus className="w-4 h-4 md:w-5 md:h-5 text-black" />
                          </div>
                          <p className="text-sm md:text-base leading-relaxed pt-0.5 italic text-foreground">{cleanLine}</p>
                        </div>
                      </TextReveal>
                    );
                  })}
                </div>
              </ExpandableSection>
            )}

            {/* Opposition Weaknesses */}
            {analysis.opposition_weaknesses && (
              <ExpandableSection title="Opposition Weaknesses" id={SECTION_IDS.weaknesses} icon="minus">
                <div className="space-y-3">
                  {analysis.opposition_weaknesses.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                    return (
                      <TextReveal key={idx} delay={idx * 0.1}>
                        <div className="flex items-start gap-3">
                          <div className="rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 bg-primary">
                            <Minus className="w-4 h-4 md:w-5 md:h-5 text-black" />
                          </div>
                          <p className="text-sm md:text-base leading-relaxed pt-0.5 italic text-foreground">{cleanLine}</p>
                        </div>
                      </TextReveal>
                    );
                  })}
                </div>
              </ExpandableSection>
            )}

            {/* Key Matchups */}
            {analysis.matchups && analysis.matchups.length > 0 && (
              <ExpandableSection title="Potential Matchup(s)" id={SECTION_IDS.matchups} transparentContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {analysis.matchups.map((matchup: any, index: number) => (
                    <TextReveal key={index} delay={index * 0.15}>
                      <div className="relative rounded-xl overflow-hidden bg-card border-2 border-primary shadow-lg">
                        <div className="relative flex">
                          <div className="w-28 md:w-32 flex-shrink-0 self-stretch">
                            {matchup.image_url ? (
                              <img src={matchup.image_url} alt={matchup.name} className="w-full h-full object-cover object-top" style={{ minHeight: '100%' }} />
                            ) : (
                              <div className="w-full h-full bg-black/40 flex items-center justify-center text-white/50 text-xs min-h-[120px]">No image</div>
                            )}
                          </div>
                          <div className="flex-1 p-4 md:p-5 flex flex-col justify-center">
                            <h3 className="font-bebas text-lg md:text-xl uppercase tracking-wide text-white drop-shadow-lg leading-tight">
                              {matchup.name?.toUpperCase()}
                            </h3>
                            {matchup.shirt_number && (
                              <p className="text-2xl md:text-3xl font-bold mt-1 text-primary">#{matchup.shirt_number}</p>
                            )}
                            {matchup.notes && (
                              <div className="mt-3 pt-3 border-t border-primary/40">
                                <p className="text-sm md:text-base text-white/90 leading-relaxed">{matchup.notes}</p>
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

            {/* Scheme Section */}
            {(analysis.scheme_title || analysis.selected_scheme) && (
              <ExpandableSection title={analysis.scheme_title || "Tactical Scheme"} id={SECTION_IDS.scheme}>
                <div className="space-y-4 md:space-y-6">
                  {analysis.scheme_paragraph_1 && (
                    <TextReveal>
                      <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                        {analysis.scheme_paragraph_1}
                      </p>
                    </TextReveal>
                  )}

                  {analysis.selected_scheme && (
                    <TextReveal delay={0.2}>
                      <div className="relative rounded-lg min-h-[400px] md:min-h-[600px] border-4 border-primary shadow-xl overflow-hidden bg-gradient-to-b from-green-700 via-green-800 to-green-900">
                        {/* Field markings */}
                        <div className="absolute inset-8 border-2 border-white/30 rounded-lg"></div>
                        <div className="absolute inset-x-8 top-1/2 h-0.5 bg-white/30"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full"></div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-8 w-48 h-24 border-2 border-white/30 border-t-0"></div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-48 h-24 border-2 border-white/30 border-b-0"></div>

                        <div className="text-white text-center py-4 text-2xl font-bebas tracking-wider">
                          {analysis.selected_scheme}
                        </div>

                        {analysis.starting_xi && analysis.starting_xi.length > 0 && (
                          <div className="absolute inset-0 p-8">
                            {analysis.starting_xi.map((player: any, index: number) => (
                              <div
                                key={index}
                                className="absolute flex flex-col items-center gap-1"
                                style={{
                                  left: `${player.x}%`,
                                  top: `${player.y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <PlayerKit
                                  primaryColor={analysis.kit_primary_color || '#FFD700'}
                                  secondaryColor={analysis.kit_secondary_color || '#000000'}
                                  number={player.number || '0'}
                                />
                                <div className="bg-black/80 text-white px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                  {player.surname || player.position}
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
                      <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                        {analysis.scheme_paragraph_2}
                      </p>
                    </TextReveal>
                  )}
                </div>
              </ExpandableSection>
            )}

            {/* Points */}
            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => (
                  <ExpandableSection key={index} title={point.title} id={`section-point-${index}`}>
                    <div className="space-y-4 md:space-y-6">
                      {point.paragraph_1 && (
                        <TextReveal>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                            {point.paragraph_1}
                          </p>
                        </TextReveal>
                      )}
                      {point.images && point.images.length > 0 && (
                        <TextReveal delay={0.15}>
                          <div className="flex flex-col items-center gap-4">
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
                      {point.paragraph_2 && (
                        <TextReveal delay={0.25}>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                            {point.paragraph_2}
                          </p>
                        </TextReveal>
                      )}
                    </div>
                  </ExpandableSection>
                ))}
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

            {analysis.player_image_url && (
              <ScrollReveal className="w-full">
                <div className="relative w-full overflow-hidden bg-background">
                  <div className="relative w-full" style={{ aspectRatio: '1/1', maxHeight: '400px' }}>
                    <img src={analysis.player_image_url} alt="Player" className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  </div>
                </div>
              </ScrollReveal>
            )}

            {navSections.length > 0 && <QuickNavDropdown sections={navSections} />}

            {analysis.key_details && (
              <ExpandableSection title="Overview" id={SECTION_IDS.overview}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                    {analysis.key_details}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {analysis.strengths_improvements && (
              <ExpandableSection title="Strengths & Areas for Improvement" id={SECTION_IDS.improvements}>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                    {analysis.strengths_improvements}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => (
                  <ExpandableSection key={index} title={point.title} id={`section-point-${index}`}>
                    <div className="space-y-4 md:space-y-6">
                      {point.paragraph_1 && (
                        <TextReveal>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                            {point.paragraph_1}
                          </p>
                        </TextReveal>
                      )}
                      {point.images && point.images.length > 0 && (
                        <TextReveal delay={0.15}>
                          <div className="flex flex-col items-center gap-4">
                            {point.images.map((img: string, imgIndex: number) => (
                              <img key={imgIndex} src={img} alt={`${point.title} - Image ${imgIndex + 1}`} className="w-full rounded-lg shadow-md border-2 border-primary" />
                            ))}
                          </div>
                        </TextReveal>
                      )}
                      {point.paragraph_2 && (
                        <TextReveal delay={0.25}>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                            {point.paragraph_2}
                          </p>
                        </TextReveal>
                      )}
                    </div>
                  </ExpandableSection>
                ))}
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
                    <h1 className="text-2xl md:text-4xl font-bebas uppercase tracking-wider text-foreground">
                      {analysis.title || "Concept Analysis"}
                    </h1>
                  </div>
                </ContentCard>
              </div>
            </section>

            {analysis.concept && (
              <ExpandableSection title="Concept" defaultOpen>
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                    {analysis.concept}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {analysis.explanation && (
              <ExpandableSection title="Explanation">
                <TextReveal>
                  <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                    {analysis.explanation}
                  </p>
                </TextReveal>
              </ExpandableSection>
            )}

            {analysis.points && analysis.points.length > 0 && (
              <div className="w-full">
                {analysis.points.map((point: any, index: number) => (
                  <ExpandableSection key={index} title={point.title} id={`section-point-${index}`}>
                    <div className="space-y-4 md:space-y-6">
                      {point.paragraph_1 && (
                        <TextReveal>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
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
                      {point.paragraph_2 && (
                        <TextReveal delay={0.25}>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-lg text-foreground">
                            {point.paragraph_2}
                          </p>
                        </TextReveal>
                      )}
                    </div>
                  </ExpandableSection>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Back to Top */}
        <motion.div
          className="flex justify-center py-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
            className="font-bebas uppercase tracking-wider text-lg px-8 py-4 bg-primary text-black border-2 border-primary hover:bg-primary/90"
          >
            <ArrowLeft className="w-4 h-4 mr-2 rotate-90" />
            Back to Top
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default AnalysisViewer;
