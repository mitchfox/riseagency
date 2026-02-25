import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Calendar, Play, MoreHorizontal } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMoreClick: () => void;
}

const tabs = [
  { id: "hub", label: "Hub", icon: TrendingUp },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "physical", label: "Programme", icon: Calendar },
  { id: "highlights", label: "Highlights", icon: Play },
];

export const MobileBottomNav = ({ activeTab, onTabChange, onMoreClick }: MobileBottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 safe-area-bottom">
      <div className="grid grid-cols-5 h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[9px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5"
        >
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          <span className="text-[9px] font-medium text-muted-foreground">More</span>
        </button>
      </div>
    </nav>
  );
};
