import { TrendingUp, BookOpen, MessageCircle } from "lucide-react";
import { ReactNode } from "react";

interface SimpleQuadrantCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  stat?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxWidth?: number;
  maxHeight?: number;
}

export const SimpleQuadrantCard = ({
  icon,
  title,
  description,
  stat,
  position,
  maxWidth,
  maxHeight,
}: SimpleQuadrantCardProps) => {
  // Determine corner positioning and gradient direction based on quadrant
  // Position content at outer edges, away from center of screen
  const positionStyles: Record<string, { container: string; gradient: string }> = {
    'top-left': { 
      container: 'top-4 left-4 text-left max-w-[40%]', 
      gradient: 'bg-gradient-to-br from-black/80 via-black/40 to-transparent' 
    },
    'top-right': { 
      container: 'top-4 right-4 text-right max-w-[40%]', 
      gradient: 'bg-gradient-to-bl from-black/80 via-black/40 to-transparent' 
    },
    'bottom-left': { 
      container: 'bottom-4 left-4 text-left max-w-[40%]', 
      gradient: 'bg-gradient-to-tr from-black/80 via-black/40 to-transparent' 
    },
    'bottom-right': { 
      container: 'bottom-4 right-4 text-right max-w-[40%]', 
      gradient: 'bg-gradient-to-tl from-black/80 via-black/40 to-transparent' 
    },
  };

  const styles = positionStyles[position];

  return (
    <div
      className="animate-[fade-in_0.3s_ease-out_forwards] text-center"
      style={{
        maxWidth: maxWidth ?? undefined,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      {/* Label with icon */}
      <div className="inline-flex items-center gap-2 bg-primary px-4 py-1 mb-3">
        <div className="text-black">{icon}</div>
        <span className="text-sm font-bebas uppercase tracking-wider text-black">{title}</span>
      </div>
      
      {/* Stat if provided */}
      {stat && (
        <div className="text-5xl font-bebas text-primary leading-none mb-2">{stat}</div>
      )}
      
      {/* Description */}
      <p className="text-white/80 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

// Pre-configured cards for different menu items
type QuadrantCardProps = Pick<SimpleQuadrantCardProps, "maxWidth" | "maxHeight">;

export const PerformanceQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<TrendingUp className="w-4 h-4" />}
    title="Performance"
    stat="R90"
    description="Our proprietary analysis system tracks every action to maximise player potential."
    position="top-right"
    {...props}
  />
);

export const InsightsQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<BookOpen className="w-4 h-4" />}
    title="Insights"
    description="Expert tactical analysis and exclusive content from inside the game."
    position="top-left"
    {...props}
  />
);

export const ContactQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<MessageCircle className="w-4 h-4" />}
    title="Get In Touch"
    description="Ready to elevate your career? Connect with our team today."
    position="bottom-right"
    {...props}
  />
);