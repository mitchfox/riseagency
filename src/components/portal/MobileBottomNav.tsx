import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Calendar, MoreHorizontal } from "lucide-react";
import { t } from "@/lib/portalTranslations";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMoreClick: () => void;
  lang?: string | null;
}

export const MobileBottomNav = ({ activeTab, onTabChange, onMoreClick, lang }: MobileBottomNavProps) => {
  const tabs = [
    { id: "hub", label: t(lang, "hub"), icon: TrendingUp },
    { id: "analysis", label: t(lang, "analysis"), icon: BarChart3 },
    { id: "physical", label: t(lang, "programming"), icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-[15%] right-[15%] h-[2px] rounded-b pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, hsl(43, 49%, 61%), transparent)' }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="bottomNavGlow"
                  className="absolute inset-0 rounded-lg opacity-10 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 30%, hsl(43, 49%, 61%), transparent 70%)' }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className={`h-5 w-5 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </motion.div>
              <span className={`text-[9px] font-bebas tracking-wider transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMoreClick}
          className="relative flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
        >
          <motion.div
            whileTap={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </motion.div>
          <span className="text-[9px] font-bebas tracking-wider text-muted-foreground">{t(lang, "more")}</span>
        </button>
      </div>
    </nav>
  );
};
