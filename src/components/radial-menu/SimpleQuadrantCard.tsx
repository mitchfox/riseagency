import { TrendingUp, BookOpen, MessageCircle, Route, Search } from "lucide-react";
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
        maxWidth: maxWidth ?? 160,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      {/* Label with icon */}
      <div className="inline-flex items-center gap-1.5 bg-primary px-2 py-0.5 mb-2">
        <div className="text-black">{icon}</div>
        <span className="text-xs font-bebas uppercase tracking-wider text-black">{title}</span>
      </div>
      
      {/* Stat if provided */}
      {stat && (
        <div className="text-3xl font-bebas text-primary leading-none mb-1">{stat}</div>
      )}
      
      {/* Description - smaller text that wraps inside wedge */}
      <p className="text-white/80 text-xs leading-tight break-words">
        {description}
      </p>
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

export const YouthQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<TrendingUp className="w-4 h-4" />}
    title="For Youth"
    description="Pathways and support designed specifically for ambitious young players."
    position="bottom-right"
    {...props}
  />
);

export const JourneyQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<Route className="w-4 h-4" />}
    title="The Journey"
    description="Step-by-step guidance through each stage of your professional pathway."
    position="bottom-left"
    {...props}
  />
);

export const WhatWeLookForQuadrantCard = (props: QuadrantCardProps) => (
  <SimpleQuadrantCard
    icon={<Search className="w-4 h-4" />}
    title="What We Look For"
    description="Key traits and behaviours we value when evaluating players for RISE."
    position="top-left"
    {...props}
  />
);