import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Target, CheckSquare, Users, Calendar, Link2, TrendingUp } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";

interface WidgetProps {
  id: string;
  title: string;
  icon: React.ElementType;
  size: "small" | "medium" | "large";
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

const Widget = ({ id, title, icon: Icon, size, expanded, onToggleExpand, children }: WidgetProps) => {
  const sizeClasses = {
    small: "col-span-1 row-span-1",
    medium: "col-span-1 md:col-span-2 row-span-1",
    large: "col-span-1 md:col-span-2 lg:col-span-3 row-span-2",
  };

  const expandedClass = expanded ? "col-span-full" : sizeClasses[size];

  return (
    <Card className={`${expandedClass} transition-all duration-300 flex flex-col border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight uppercase text-muted-foreground">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-8 w-8 p-0 hover:bg-primary/10"
        >
          {expanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pt-4">
        {children}
      </CardContent>
    </Card>
  );
};

export const StaffOverview = ({ isAdmin }: { isAdmin: boolean }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  const toggleWidget = (id: string) => {
    setExpandedWidget(expandedWidget === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px] p-1">
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
          <Button variant="outline" className="w-full justify-start h-7 text-xs hover:bg-primary/10" size="sm">
            Player Portal
          </Button>
          <Button variant="outline" className="w-full justify-start h-7 text-xs hover:bg-primary/10" size="sm">
            Club Network
          </Button>
          <Button variant="outline" className="w-full justify-start h-7 text-xs hover:bg-primary/10" size="sm">
            Analysis Tools
          </Button>
          <Button variant="outline" className="w-full justify-start h-7 text-xs hover:bg-primary/10" size="sm">
            Marketing Hub
          </Button>
          <Button variant="outline" className="w-full justify-start h-7 text-xs hover:bg-primary/10" size="sm">
            Legal Docs
          </Button>
        </div>
      </Widget>

      {/* Represented Players - Medium */}
      <Widget
        id="represented"
        title="Represented Players"
        icon={Users}
        size="medium"
        expanded={expandedWidget === "represented"}
        onToggleExpand={() => toggleWidget("represented")}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">TY</span>
              </div>
              <div>
                <span className="text-xs font-semibold block">Tyrese Omotoye</span>
                <span className="text-[10px] text-muted-foreground">Forward</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-600 font-medium">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">MM</span>
              </div>
              <div>
                <span className="text-xs font-semibold block">Michael Mulligan</span>
                <span className="text-[10px] text-muted-foreground">Midfielder</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-600 font-medium">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">JS</span>
              </div>
              <div>
                <span className="text-xs font-semibold block">Jaroslav Svoboda</span>
                <span className="text-[10px] text-muted-foreground">Defender</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </Widget>

      {/* Schedule Calendar - Large (spans 2 cols, 2 rows) */}
      <Widget
        id="schedule"
        title="Schedule Calendar"
        icon={Calendar}
        size="large"
        expanded={expandedWidget === "schedule"}
        onToggleExpand={() => toggleWidget("schedule")}
      >
        <StaffSchedule isAdmin={isAdmin} />
      </Widget>

      {/* Financial Projection - Medium */}
      <Widget
        id="financial"
        title="Financial Projection"
        icon={TrendingUp}
        size="medium"
        expanded={expandedWidget === "financial"}
        onToggleExpand={() => toggleWidget("financial")}
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded border border-emerald-500/30">
              <div className="text-lg font-bold text-emerald-600">€127k</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-rose-500/10 to-rose-600/10 rounded border border-rose-500/30">
              <div className="text-lg font-bold text-rose-600">€89k</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Expenses</div>
            </div>
          </div>
          <div className="text-center p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded border border-primary/40">
            <div className="text-xl font-bold text-primary">€38,000</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Q4 Profit</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center p-1.5 rounded hover:bg-accent/30 transition-colors">
              <span className="text-[10px] text-muted-foreground uppercase">Commissions</span>
              <span className="font-semibold text-xs">€45k</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded hover:bg-accent/30 transition-colors">
              <span className="text-[10px] text-muted-foreground uppercase">Consulting</span>
              <span className="font-semibold text-xs">€32k</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded hover:bg-accent/30 transition-colors">
              <span className="text-[10px] text-muted-foreground uppercase">Partnerships</span>
              <span className="font-semibold text-xs">€50k</span>
            </div>
          </div>
        </div>
      </Widget>
    </div>
  );
};
