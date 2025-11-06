import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Target, CheckSquare, Users, Calendar, Link2, TrendingUp } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import { players } from "@/data/players";

interface WidgetProps {
  id: string;
  title: string;
  icon: React.ElementType;
  size: "small" | "medium" | "large" | "wide" | "xlarge";
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

const Widget = ({ id, title, icon: Icon, size, expanded, onToggleExpand, children }: WidgetProps) => {
  const sizeClasses = {
    small: "col-span-1 md:col-span-1 lg:col-span-1 row-span-1",
    medium: "col-span-1 md:col-span-2 lg:col-span-2 row-span-2",
    large: "col-span-1 md:col-span-2 lg:col-span-3 row-span-2",
    wide: "col-span-1 md:col-span-2 lg:col-span-3 row-span-1",
    xlarge: "col-span-1 md:col-span-3 lg:col-span-4 row-span-3",
  };

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4 overflow-auto">
        <Card className="h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none z-0"
            style={{ 
              backgroundImage: `url(${marbleOverlay})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              mixBlendMode: 'overlay'
            }}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">{title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="h-6 w-6 p-0 hover:bg-primary/10 relative z-20"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pt-3 px-3 pb-3 relative z-10">
            {children}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className={`${sizeClasses[size]} transition-all duration-300 flex flex-col border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg relative overflow-hidden`}>
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{ 
          backgroundImage: `url(${marbleOverlay})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'overlay'
        }}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <CardTitle className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="h-6 w-6 p-0 hover:bg-primary/10 relative z-20"
        >
          {expanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden hover:overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pt-3 px-3 pb-3 relative z-10">
        {children}
      </CardContent>
    </Card>
  );
};

export const StaffOverview = ({ isAdmin }: { isAdmin: boolean }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const toggleWidget = (id: string) => {
    setExpandedWidget(expandedWidget === id ? null : id);
  };

  const navigateToPlayer = (playerSlug: string, tab: string) => {
    setSearchParams({ section: 'players', player: playerSlug, tab });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 auto-rows-[200px] w-full">
      {/* Quarter Goals - Small */}
      <Widget
        id="goals"
        title="Quarter Goals"
        icon={Target}
        size="small"
        expanded={expandedWidget === "goals"}
        onToggleExpand={() => toggleWidget("goals")}
      >
        <div className="space-y-2">
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Player Signings</span>
              <span className="text-xs font-bold">3<span className="text-muted-foreground">/5</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-glow h-1.5 rounded-full transition-all" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Revenue</span>
              <span className="text-xs font-bold">€45k<span className="text-muted-foreground">/€100k</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full transition-all" style={{ width: '45%' }} />
            </div>
          </div>
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Partnerships</span>
              <span className="text-xs font-bold">7<span className="text-muted-foreground">/10</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1.5 rounded-full transition-all" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      </Widget>

      {/* To Do - Small */}
      <Widget
        id="todo"
        title="To Do"
        icon={CheckSquare}
        size="small"
        expanded={expandedWidget === "todo"}
        onToggleExpand={() => toggleWidget("todo")}
      >
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
            <input type="checkbox" className="h-3 w-3 rounded border-muted-foreground/30 text-primary" />
            <span className="text-xs">Contract renewals</span>
          </label>
          <label className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
            <input type="checkbox" className="h-3 w-3 rounded border-muted-foreground/30 text-primary" />
            <span className="text-xs">Update reports</span>
          </label>
          <label className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
            <input type="checkbox" className="h-3 w-3 rounded border-muted-foreground/30 text-primary" />
            <span className="text-xs">Schedule meetings</span>
          </label>
          <label className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
            <input type="checkbox" className="h-3 w-3 rounded border-muted-foreground/30 text-primary" />
            <span className="text-xs">Process invoices</span>
          </label>
          <label className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
            <input type="checkbox" className="h-3 w-3 rounded border-muted-foreground/30 text-primary" />
            <span className="text-xs">Follow up scouts</span>
          </label>
        </div>
      </Widget>

      {/* Quick Links - Small */}
      <Widget
        id="quicklinks"
        title="Quick Links"
        icon={Link2}
        size="small"
        expanded={expandedWidget === "quicklinks"}
        onToggleExpand={() => toggleWidget("quicklinks")}
      >
        <div className="space-y-1.5">
          <Button className="w-full justify-start h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            Player Portal
          </Button>
          <Button className="w-full justify-start h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            Club Network
          </Button>
          <Button className="w-full justify-start h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            Analysis Tools
          </Button>
          <Button className="w-full justify-start h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            Marketing Hub
          </Button>
          <Button className="w-full justify-start h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            Legal Docs
          </Button>
        </div>
      </Widget>

      {/* Financial Projection - Wide */}
      <Widget
        id="financial"
        title="Financial Projection"
        icon={TrendingUp}
        size="wide"
        expanded={expandedWidget === "financial"}
        onToggleExpand={() => toggleWidget("financial")}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 h-full">
          <div className="flex flex-col justify-center p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded border border-emerald-500/30">
            <div className="text-sm md:text-lg font-bold text-emerald-600">€127k</div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Revenue</div>
          </div>
          <div className="flex flex-col justify-center p-3 bg-gradient-to-br from-rose-500/10 to-rose-600/10 rounded border border-rose-500/30">
            <div className="text-sm md:text-lg font-bold text-rose-600">€89k</div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Expenses</div>
          </div>
          <div className="flex flex-col justify-center p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded border border-primary/40">
            <div className="text-sm md:text-lg font-bold text-primary">€38k</div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Profit</div>
          </div>
          <div className="flex flex-col justify-center p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded border border-amber-500/30">
            <div className="text-sm md:text-lg font-bold text-amber-600">€45k</div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Commissions</div>
          </div>
          <div className="flex flex-col justify-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded border border-blue-500/30">
            <div className="text-sm md:text-lg font-bold text-blue-600">€32k</div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Consulting</div>
          </div>
        </div>
      </Widget>

      {/* Schedule Calendar - XLarge, 3 rows for full week view */}
      <Widget
        id="schedule"
        title="Schedule Calendar"
        icon={Calendar}
        size="xlarge"
        expanded={expandedWidget === "schedule"}
        onToggleExpand={() => toggleWidget("schedule")}
      >
        <div className="w-full h-full">
          <StaffSchedule isAdmin={isAdmin} />
        </div>
      </Widget>

      {/* Represented Players - Medium, next to schedule */}
      <Widget
        id="represented"
        title="Represented Players"
        icon={Users}
        size="medium"
        expanded={expandedWidget === "represented"}
        onToggleExpand={() => toggleWidget("represented")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {players.map((player) => (
            <div key={player.id} className="flex flex-col p-2 border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all group">
              <img src={player.image} alt={player.name} className="w-full h-14 object-cover border border-primary/30 mb-1" />
              <span className="text-[10px] md:text-[10px] font-semibold text-center">{player.name}</span>
              <span className="text-[9px] text-muted-foreground mb-1 text-center">{player.position}</span>
              <div className="flex gap-1 w-full">
                <Button 
                  size="sm" 
                  className="h-5 text-[10px] md:text-[9px] px-1.5 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0" 
                  onClick={() => navigateToPlayer(player.id, 'analysis')}
                >
                  Analysis
                </Button>
                <Button 
                  size="sm" 
                  className="h-5 text-[10px] md:text-[9px] px-1.5 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0" 
                  onClick={() => navigateToPlayer(player.id, 'programming')}
                >
                  Programming
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Widget>
    </div>
  );
};
