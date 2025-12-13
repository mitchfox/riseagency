import { TrendingUp, BookOpen, MessageCircle } from "lucide-react";
import { ReactNode } from "react";

interface SimpleQuadrantCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  stat?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const SimpleQuadrantCard = ({ icon, title, description, stat, position }: SimpleQuadrantCardProps) => {
  // Determine corner positioning and gradient direction based on quadrant
  const positionStyles: Record<string, { container: string; gradient: string }> = {
    'top-left': { 
      container: 'top-8 left-8 text-left', 
      gradient: 'bg-gradient-to-br from-black/80 via-black/40 to-transparent' 
    },
    'top-right': { 
      container: 'top-8 right-8 text-right', 
      gradient: 'bg-gradient-to-bl from-black/80 via-black/40 to-transparent' 
    },
    'bottom-left': { 
      container: 'bottom-8 left-8 text-left', 
      gradient: 'bg-gradient-to-tr from-black/80 via-black/40 to-transparent' 
    },
    'bottom-right': { 
      container: 'bottom-8 right-8 text-right', 
      gradient: 'bg-gradient-to-tl from-black/80 via-black/40 to-transparent' 
    },
  };

  const styles = positionStyles[position];

  return (
    <div className="absolute inset-0 animate-[fade-in_0.3s_ease-out_forwards]">
      {/* Gradient background */}
      <div className={`absolute inset-0 ${styles.gradient}`} />
      
      {/* Content positioned in corner */}
      <div className={`absolute ${styles.container} space-y-3 max-w-sm`}>
        {/* Label with icon */}
        <div className="inline-flex items-center gap-2 bg-primary px-4 py-1">
          <div className="text-black">{icon}</div>
          <span className="text-sm font-bebas uppercase tracking-wider text-black">{title}</span>
        </div>
        
        {/* Stat if provided */}
        {stat && (
          <div className="text-6xl font-bebas text-primary leading-none">{stat}</div>
        )}
        
        {/* Description */}
        <p className="text-white/80 text-base leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

// Pre-configured cards for different menu items
export const PerformanceQuadrantCard = () => (
  <SimpleQuadrantCard
    icon={<TrendingUp className="w-4 h-4" />}
    title="Performance"
    stat="R90"
    description="Our proprietary analysis system tracks every action to maximise player potential."
    position="top-right"
  />
);

export const InsightsQuadrantCard = () => (
  <SimpleQuadrantCard
    icon={<BookOpen className="w-4 h-4" />}
    title="Insights"
    description="Expert tactical analysis and exclusive content from inside the game."
    position="top-left"
  />
);

export const ContactQuadrantCard = () => (
  <SimpleQuadrantCard
    icon={<MessageCircle className="w-4 h-4" />}
    title="Get In Touch"
    description="Ready to elevate your career? Connect with our team today."
    position="bottom-right"
  />
);