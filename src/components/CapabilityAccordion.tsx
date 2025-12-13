import { useState, useEffect, useCallback, useRef } from "react";
import { Search, BarChart3, Layers, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import capabilityImage1 from "@/assets/capability-1.png";
import capabilityImage2 from "@/assets/capability-2.png";
import capabilityImage5 from "@/assets/capability-5.png";

interface CapabilityItem {
  id: string;
  icon: React.ReactNode;
  stat: string;
  title: string;
  subtitle: string;
  description: string;
}

const capabilities: CapabilityItem[] = [
  {
    id: "scouts",
    icon: <Search className="w-5 h-5" />,
    stat: "950+",
    title: "Scouts Worldwide",
    subtitle: "Eyes across every league",
    description: "Our extensive scouting network spans across Europe's top leagues and emerging markets. We identify talent at every level of the professional game, from grassroots to elite academies."
  },
  {
    id: "analysis",
    icon: <BarChart3 className="w-5 h-5" />,
    stat: "R90",
    title: "Analysis System",
    subtitle: "Proprietary performance metrics",
    description: "Our R90 system provides comprehensive performance analysis through data-driven insights. Every action is tracked, measured, and optimised to maximise player potential."
  },
  {
    id: "coaching",
    icon: <Layers className="w-5 h-5" />,
    stat: "5D",
    title: "Coaching Model",
    subtitle: "Complete player development",
    description: "The 5D Coaching Model addresses Technical, Tactical, Physical, Psychological, and Social dimensions. A holistic approach that develops the complete footballer."
  },
  {
    id: "history",
    icon: <Trophy className="w-5 h-5" />,
    stat: "PL",
    title: "Development History",
    subtitle: "Premier League stars developed",
    description: "We have guided numerous players to the Premier League and Europe's top leagues. Our track record speaks to our commitment to developing elite-level talent."
  }
];

// Image layers - base (color), xray reveal (sepia), and bw layer
const imageLayers = {
  base: capabilityImage1,      // Full color - default visible
  xray: capabilityImage2,      // Sepia - revealed on hover
  bw: capabilityImage5         // B&W - deepest layer
};

export const CapabilityAccordion = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % capabilities.length);
  }, []);

  // Auto-rotate every 7 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  // Generate the radial gradient mask for X-ray reveal effect
  const xrayMaskStyle = isHovering ? {
    maskImage: `radial-gradient(circle 120px at ${mousePos.x * 100}% ${mousePos.y * 100}%, black 0%, black 40%, transparent 100%)`,
    WebkitMaskImage: `radial-gradient(circle 120px at ${mousePos.x * 100}% ${mousePos.y * 100}%, black 0%, black 40%, transparent 100%)`
  } : {};

  // Gold edge glow around the reveal area
  const goldGlowStyle = isHovering ? {
    background: `radial-gradient(circle 130px at ${mousePos.x * 100}% ${mousePos.y * 100}%, transparent 0%, transparent 35%, rgba(184, 165, 116, 0.4) 50%, rgba(184, 165, 116, 0.2) 70%, transparent 100%)`
  } : {};

  return (
    <div 
      className="grid md:grid-cols-2 gap-6 lg:gap-10 max-w-6xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left side - X-Ray reveal effect on stacked images */}
      <div 
        ref={containerRef}
        className="relative aspect-[4/3] md:aspect-auto md:min-h-[400px] flex items-center justify-center order-2 md:order-1 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative w-[320px] h-[400px] md:w-[360px] md:h-[450px]">
          {/* Layer 1: B&W (deepest layer - always visible as base) */}
          <div className="absolute inset-0 transition-opacity duration-300">
            <img
              src={imageLayers.bw}
              alt="Player B&W"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Layer 2: Sepia/Gold (X-ray layer - revealed on hover) */}
          <div 
            className="absolute inset-0 transition-all duration-150 ease-out pointer-events-none"
            style={xrayMaskStyle}
          >
            <img
              src={imageLayers.xray}
              alt="Player Sepia"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Layer 3: Full Color (top layer - hidden where cursor is) */}
          <div 
            className="absolute inset-0 transition-all duration-150 ease-out pointer-events-none"
            style={isHovering ? {
              maskImage: `radial-gradient(circle 100px at ${mousePos.x * 100}% ${mousePos.y * 100}%, transparent 0%, transparent 30%, black 80%, black 100%)`,
              WebkitMaskImage: `radial-gradient(circle 100px at ${mousePos.x * 100}% ${mousePos.y * 100}%, transparent 0%, transparent 30%, black 80%, black 100%)`
            } : {}}
          >
            <img
              src={imageLayers.base}
              alt="Player Color"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Gold glow ring around cursor */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              ...goldGlowStyle,
              opacity: isHovering ? 1 : 0
            }}
          />

          {/* Inner bright core at cursor position */}
          {isHovering && (
            <div 
              className="absolute w-4 h-4 rounded-full pointer-events-none transition-all duration-100"
              style={{
                left: `calc(${mousePos.x * 100}% - 8px)`,
                top: `calc(${mousePos.y * 100}% - 8px)`,
                background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(184, 165, 116, 0.4) 50%, transparent 100%)',
                boxShadow: '0 0 20px rgba(184, 165, 116, 0.5)'
              }}
            />
          )}
        </div>
        
        {/* Image caption */}
        <div className="absolute bottom-4 left-4 right-4 z-20 text-center">
          <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-2xl font-bebas text-primary">{capabilities[activeIndex].stat}</span>
            <span className="text-sm font-bebas uppercase tracking-wider text-white/90">{capabilities[activeIndex].title}</span>
          </div>
        </div>

        {/* Hover instruction */}
        <div className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-bebas uppercase tracking-wider transition-opacity duration-300",
          isHovering ? "opacity-0" : "opacity-60"
        )}>
          Hover to reveal
        </div>
      </div>

      {/* Right side - Accordion */}
      <div className="flex flex-col gap-2 order-1 md:order-2">
        {capabilities.map((item, index) => {
          const isActive = index === activeIndex;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(index)}
              className={cn(
                "text-left transition-all duration-500 rounded-lg overflow-hidden border",
                isActive 
                  ? "bg-card/80 border-primary/50 shadow-lg shadow-primary/10" 
                  : "bg-card/30 border-border/50 hover:border-primary/30 hover:bg-card/50"
              )}
            >
              {/* Header - always visible */}
              <div className={cn(
                "flex items-center gap-4 p-4 transition-colors duration-300",
                isActive ? "border-b border-primary/20" : ""
              )}>
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-300",
                  isActive 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl font-bebas transition-colors duration-300",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {item.stat}
                    </span>
                    <span className="text-sm font-bebas uppercase tracking-wider text-foreground truncate">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                
                {/* Expand indicator */}
                <div className={cn(
                  "w-6 h-6 flex items-center justify-center transition-transform duration-300",
                  isActive ? "rotate-180" : ""
                )}>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none" 
                    className={cn(
                      "transition-colors duration-300",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <path 
                      d="M2 4L6 8L10 4" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Expanded content */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-500",
                  isActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="p-4 pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
        
        {/* Auto-rotate indicator */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full transition-colors duration-300",
            isPaused ? "bg-muted-foreground/50" : "bg-primary animate-pulse"
          )} />
          <span>{isPaused ? "Paused" : "Auto-rotating"}</span>
        </div>
      </div>
    </div>
  );
};
