import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, Video, Dumbbell, ClipboardList, TrendingUp, ArrowRight } from "lucide-react";

interface PortalWelcomeModalProps {
  playerName: string;
  playerId: string;
  hasAnalyses: boolean;
  hasPerformanceReports: boolean;
  onNavigate: (tab: string, subTab?: string) => void;
}

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Performance Reports",
    description: "Match-by-match breakdown of your actions, R90 scores, and coaching feedback. Each report highlights what you did well and where to improve.",
    tab: "analysis",
    subTab: "performance",
  },
  {
    icon: BarChart3,
    title: "Analysis",
    description: "Pre-match and post-match tactical analysis prepared by your coaching team. Review team shape, key matchups, and tactical points.",
    tab: "analysis",
    subTab: "analysis",
  },
  {
    icon: TrendingUp,
    title: "Form & Comparisons",
    description: "Track your form over time with R90 trend graphs. See how your metrics compare across different matches and periods.",
    tab: "analysis",
    subTab: "performance",
  },
  {
    icon: Video,
    title: "Clips & Highlights",
    description: "Watch your match clips and highlight reels. Upload your own clips or view ones selected by the coaching team.",
    tab: "clips",
  },
  {
    icon: Dumbbell,
    title: "Programmes",
    description: "Access your training programmes, gym sessions, nutrition plans, and weekly schedules all in one place.",
    tab: "programmes",
  },
];

export const PortalWelcomeModal = ({
  playerName,
  playerId,
  hasAnalyses,
  hasPerformanceReports,
  onNavigate,
}: PortalWelcomeModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `portal_welcome_seen_${playerId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // Small delay so the portal has time to render first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [playerId]);

  const handleDismiss = () => {
    localStorage.setItem(`portal_welcome_seen_${playerId}`, "true");
    setOpen(false);
  };

  const handleNavigate = (tab: string, subTab?: string) => {
    handleDismiss();
    onNavigate(tab, subTab);
  };

  const firstName = playerName?.split(" ")[0] || "there";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to your portal, {firstName} 👋</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground">
          This is your personal hub for everything related to your development. Here's a quick overview of what you can access:
        </p>

        <div className="grid gap-3 mt-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.title}
              onClick={() => handleNavigate(feature.tab, feature.subTab)}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="mt-0.5 p-2 rounded-md bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        {(hasPerformanceReports || hasAnalyses) && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium">You already have content waiting for you!</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {hasPerformanceReports && (
                <Button size="sm" onClick={() => handleNavigate("analysis", "performance")}>
                  View Performance Reports
                </Button>
              )}
              {hasAnalyses && (
                <Button size="sm" variant="outline" onClick={() => handleNavigate("analysis", "analysis")}>
                  View Analysis
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={handleDismiss}>
            Got it, let's go
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
