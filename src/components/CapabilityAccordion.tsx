import { useState, useEffect, useCallback } from "react";
import { Search, BarChart3, Layers, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityItem {
  id: string;
  icon: React.ReactNode;
  stat: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
}

const capabilities: CapabilityItem[] = [
  {
    id: "scouts",
    icon: <Search className="w-5 h-5" />,
    stat: "950+",
    title: "Scouts Worldwide",
    subtitle: "Eyes across every league",
    description: "Our extensive scouting network spans across Europe's top leagues and emerging markets. We identify talent at every level of the professional game, from grassroots to elite academies.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "analysis",
    icon: <BarChart3 className="w-5 h-5" />,
    stat: "R90",
    title: "Analysis System",
    subtitle: "Proprietary performance metrics",
    description: "Our R90 system provides comprehensive performance analysis through data-driven insights. Every action is tracked, measured, and optimised to maximise player potential.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "coaching",
    icon: <Layers className="w-5 h-5" />,
    stat: "5D",
    title: "Coaching Model",
    subtitle: "Complete player development",
    description: "The 5D Coaching Model addresses Technical, Tactical, Physical, Psychological, and Social dimensions. A holistic approach that develops the complete footballer.",
    image: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "history",
    icon: <Trophy className="w-5 h-5" />,
    stat: "PL",
    title: "Development History",
    subtitle: "Premier League stars developed",
    description: "We have guided numerous players to the Premier League and Europe's top leagues. Our track record speaks to our commitment to developing elite-level talent.",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=60"
  }
];

export const CapabilityAccordion = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const slideImages = capabilities.map(c => c.image);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % capabilities.length);
    setImageIndex((prev) => (prev + 1) % slideImages.length);
  }, [slideImages.length]);

  // Auto-rotate every 7 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    setImageIndex(index);
  };

  return (
    <div 
      className="grid md:grid-cols-2 gap-6 lg:gap-10 max-w-6xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left side - Image slideshow */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[400px] rounded-xl overflow-hidden group order-2 md:order-1">
        {slideImages.map((image, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 transition-all duration-700",
              index === imageIndex 
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-105"
            )}
          >
            <img
              src={image}
              alt={capabilities[index].title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </div>
        ))}
        
        {/* Image caption */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center gap-2 text-white/90">
            <span className="text-3xl font-bebas text-primary">{capabilities[activeIndex].stat}</span>
            <span className="text-sm font-bebas uppercase tracking-wider">{capabilities[activeIndex].title}</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          {capabilities.map((_, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === activeIndex 
                  ? "bg-primary w-6" 
                  : "bg-white/50 hover:bg-white/70"
              )}
            />
          ))}
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
