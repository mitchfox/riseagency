import { ReactNode } from "react";
import whiteMarbleBg from "@/assets/white-marble.png";

export type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface HoverCardData {
  title: string;
  description?: string;
  image?: string;
  icon?: ReactNode;
  stats?: { label: string; value: string }[];
}

interface MenuHoverCardProps {
  data: HoverCardData;
  quadrant: Quadrant;
  isVisible: boolean;
}

const getAnimationClass = (quadrant: Quadrant): string => {
  switch (quadrant) {
    case 'top-left':
      return 'animate-[slideFromTopLeft_0.4s_ease-out_forwards]';
    case 'top-right':
      return 'animate-[slideFromTopRight_0.4s_ease-out_forwards]';
    case 'bottom-left':
      return 'animate-[slideFromBottomLeft_0.4s_ease-out_forwards]';
    case 'bottom-right':
      return 'animate-[slideFromBottomRight_0.4s_ease-out_forwards]';
  }
};

export const MenuHoverCard = ({ data, quadrant, isVisible }: MenuHoverCardProps) => {
  if (!isVisible) return null;

  const animationClass = getAnimationClass(quadrant);

  return (
    <div
      className={`
        relative w-64 p-5 rounded-lg overflow-hidden
        border border-primary/30 shadow-2xl shadow-primary/10
        ${animationClass}
      `}
      style={{
        backgroundImage: `url(${whiteMarbleBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        {data.icon && (
          <div className="text-primary mb-3">
            {data.icon}
          </div>
        )}
        
        {/* Image */}
        {data.image && (
          <div className="mb-3 rounded overflow-hidden aspect-video">
            <img 
              src={data.image} 
              alt={data.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Title */}
        <h3 className="font-bebas text-xl tracking-wider text-primary mb-2">
          {data.title}
        </h3>
        
        {/* Description */}
        {data.description && (
          <p className="text-white/70 text-sm leading-relaxed mb-3">
            {data.description}
          </p>
        )}
        
        {/* Stats */}
        {data.stats && data.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-primary/20">
            {data.stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="font-bebas text-primary text-lg">{stat.value}</div>
                <div className="text-white/50 text-xs uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary/50" />
    </div>
  );
};
