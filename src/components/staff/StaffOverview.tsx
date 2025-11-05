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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[280px] p-1">
      {/* Quarter Goals - Small */}
      <Widget
        id="goals"
        title="Quarter Goals"
        icon={Target}
        size="small"
        expanded={expandedWidget === "goals"}
        onToggleExpand={() => toggleWidget("goals")}
      >
        <div className="space-y-4">
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Player Signings</span>
              <span className="text-sm font-bold text-foreground">3<span className="text-muted-foreground">/5</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-glow h-2.5 rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/50" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Revenue Target</span>
              <span className="text-sm font-bold text-foreground">€45k<span className="text-muted-foreground">/€100k</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-amber-500/50" style={{ width: '45%' }} />
            </div>
          </div>
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Club Partnerships</span>
              <span className="text-sm font-bold text-foreground">7<span className="text-muted-foreground">/10</span></span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-emerald-500/50" style={{ width: '70%' }} />
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
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20 group">
            <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20" />
            <span className="text-sm group-hover:text-foreground">Review player contract renewals</span>
          </label>
          <label className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20 group">
            <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20" />
            <span className="text-sm group-hover:text-foreground">Update performance reports</span>
          </label>
          <label className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20 group">
            <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20" />
            <span className="text-sm group-hover:text-foreground">Schedule club meetings</span>
          </label>
          <label className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20 group">
            <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20" />
            <span className="text-sm group-hover:text-foreground">Process pending invoices</span>
          </label>
          <label className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/20 group">
            <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20" />
            <span className="text-sm group-hover:text-foreground">Follow up with scouts</span>
          </label>
        </div>
      </Widget>

      {/* Represented Players - Small */}
      <Widget
        id="represented"
        title="Represented Players"
        icon={Users}
        size="small"
        expanded={expandedWidget === "represented"}
        onToggleExpand={() => toggleWidget("represented")}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <span className="text-xs font-bold text-primary">TY</span>
              </div>
              <div>
                <span className="text-sm font-semibold block">Tyrese Omotoye</span>
                <span className="text-xs text-muted-foreground">Forward</span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <span className="text-xs font-bold text-primary">MM</span>
              </div>
              <div>
                <span className="text-sm font-semibold block">Michael Mulligan</span>
                <span className="text-xs text-muted-foreground">Midfielder</span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <span className="text-xs font-bold text-primary">JS</span>
              </div>
              <div>
                <span className="text-sm font-semibold block">Jaroslav Svoboda</span>
                <span className="text-xs text-muted-foreground">Defender</span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </Widget>

      {/* Schedule Calendar - Large */}
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

      {/* Quick Links - Small */}
      <Widget
        id="quicklinks"
        title="Quick Links"
        icon={Link2}
        size="small"
        expanded={expandedWidget === "quicklinks"}
        onToggleExpand={() => toggleWidget("quicklinks")}
      >
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all" size="sm">
            <span className="text-sm font-medium">Player Portal</span>
          </Button>
          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all" size="sm">
            <span className="text-sm font-medium">Club Network</span>
          </Button>
          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all" size="sm">
            <span className="text-sm font-medium">Analysis Tools</span>
          </Button>
          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all" size="sm">
            <span className="text-sm font-medium">Marketing Hub</span>
          </Button>
          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all" size="sm">
            <span className="text-sm font-medium">Legal Documents</span>
          </Button>
        </div>
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-all">
              <div className="text-2xl font-bold text-emerald-600">€127k</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Q4 Revenue</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-rose-500/10 to-rose-600/10 rounded-lg border border-rose-500/30 hover:border-rose-500/50 transition-all">
              <div className="text-2xl font-bold text-rose-600">€89k</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Q4 Expenses</div>
            </div>
          </div>
          <div className="text-center p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/40 shadow-lg shadow-primary/10">
            <div className="text-3xl font-bold text-primary">€38,000</div>
            <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider">Projected Q4 Profit</div>
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Player Commissions</span>
              <span className="font-semibold text-sm">€45,000</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Consulting Fees</span>
              <span className="font-semibold text-sm">€32,000</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Partnership Revenue</span>
              <span className="font-semibold text-sm">€50,000</span>
            </div>
          </div>
        </div>
      </Widget>
    </div>
  );
};
