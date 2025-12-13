import { TrendingUp, BookOpen, MessageCircle } from "lucide-react";
import { ReactNode } from "react";

interface SimpleQuadrantCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  stat?: string;
  animationClass: string;
}

export const SimpleQuadrantCard = ({ icon, title, description, stat, animationClass }: SimpleQuadrantCardProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className={`relative w-56 bg-black/80 backdrop-blur-sm border-2 border-primary/50 rounded-lg overflow-hidden shadow-2xl shadow-primary/20 ${animationClass}`}>
        {/* Gold header bar */}
        <div className="bg-primary/90 py-2 px-4 flex items-center gap-2">
          <div className="text-black">{icon}</div>
          <span className="text-sm font-bebas uppercase tracking-wider text-black">{title}</span>
        </div>
        
        <div className="p-4 space-y-3">
          {stat && (
            <div className="text-4xl font-bebas text-primary">{stat}</div>
          )}
          <p className="text-white/70 text-sm leading-relaxed">{description}</p>
        </div>

        {/* Corner accents */}
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-primary/30" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-primary/30" />
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
    animationClass="animate-[slideFromTopRight_0.5s_ease-out_forwards]"
  />
);

export const InsightsQuadrantCard = () => (
  <SimpleQuadrantCard
    icon={<BookOpen className="w-4 h-4" />}
    title="Insights"
    description="Expert tactical analysis and exclusive content from inside the game."
    animationClass="animate-[slideFromBottomLeft_0.5s_ease-out_forwards]"
  />
);

export const ContactQuadrantCard = () => (
  <SimpleQuadrantCard
    icon={<MessageCircle className="w-4 h-4" />}
    title="Get In Touch"
    description="Ready to elevate your career? Connect with our team today."
    animationClass="animate-[slideFromBottomRight_0.5s_ease-out_forwards]"
  />
);
