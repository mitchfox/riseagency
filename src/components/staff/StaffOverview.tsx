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
    <Card className={`${expandedClass} transition-all duration-300 flex flex-col`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-8 w-8 p-0"
        >
          {expanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[300px]">
      {/* Quarter Goals - Small */}
      <Widget
        id="goals"
        title="Quarter Goals"
        icon={Target}
        size="small"
        expanded={expandedWidget === "goals"}
        onToggleExpand={() => toggleWidget("goals")}
      >
        <div className="space-y-3">
          <div className="p-3 border rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Player Signings</span>
              <span className="text-xs text-muted-foreground">3/5</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="p-3 border rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Revenue Target</span>
              <span className="text-xs text-muted-foreground">€45k/€100k</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
          <div className="p-3 border rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Club Partnerships</span>
              <span className="text-xs text-muted-foreground">7/10</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '70%' }} />
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
          <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <span className="text-sm">Review player contract renewals</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <span className="text-sm">Update performance reports</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <span className="text-sm">Schedule club meetings</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <span className="text-sm">Process pending invoices</span>
          </div>
          <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <span className="text-sm">Follow up with scouts</span>
          </div>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border rounded hover:bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold">TY</span>
              </div>
              <span className="text-sm font-medium">Tyrese Omotoye</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 border rounded hover:bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold">MM</span>
              </div>
              <span className="text-sm font-medium">Michael Mulligan</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 border rounded hover:bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold">JS</span>
              </div>
              <span className="text-sm font-medium">Jaroslav Svoboda</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Active</span>
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
          <Button variant="outline" className="w-full justify-start" size="sm">
            Player Portal
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            Club Network
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            Analysis Tools
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            Marketing Hub
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            Legal Documents
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
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">€127,000</div>
              <div className="text-xs text-muted-foreground mt-1">Q4 Revenue</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-600">€89,000</div>
              <div className="text-xs text-muted-foreground mt-1">Q4 Expenses</div>
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary">€38,000</div>
            <div className="text-xs text-muted-foreground mt-1">Projected Q4 Profit</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Player Commissions</span>
              <span className="font-medium">€45,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consulting Fees</span>
              <span className="font-medium">€32,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partnership Revenue</span>
              <span className="font-medium">€50,000</span>
            </div>
          </div>
        </div>
      </Widget>
    </div>
  );
};
