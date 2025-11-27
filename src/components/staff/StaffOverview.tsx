import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Target, CheckSquare, Users, Calendar, Link2, TrendingUp, Settings, X, GripVertical, Eye, EyeOff } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  color: string;
  quarter: string;
  year: number;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface WidgetConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  size: "small" | "medium" | "large" | "wide" | "xlarge";
  defaultVisible: boolean;
}

interface WidgetProps {
  id: string;
  title: string;
  icon: React.ElementType;
  size: "small" | "medium" | "large" | "wide" | "xlarge";
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: "goals", title: "Quarter Goals", icon: Target, size: "small", defaultVisible: true },
  { id: "todo", title: "To Do", icon: CheckSquare, size: "small", defaultVisible: true },
  { id: "quicklinks", title: "Quick Links", icon: Link2, size: "small", defaultVisible: true },
  { id: "financial", title: "Financial Projection", icon: TrendingUp, size: "wide", defaultVisible: true },
  { id: "schedule", title: "Schedule Calendar", icon: Calendar, size: "xlarge", defaultVisible: true },
  { id: "represented", title: "Represented Players", icon: Users, size: "medium", defaultVisible: true },
];

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
      <div className="fixed inset-0 z-50 bg-background p-4 pt-20 overflow-auto">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none z-0"
              style={{ 
                backgroundImage: `url(${marbleOverlay})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mixBlendMode: 'overlay'
              }}
            />
            <div className="flex items-center gap-2 relative z-10">
              <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">{title}</CardTitle>
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="h-10 w-10 p-0 bg-primary hover:bg-primary/90 shadow-lg relative z-10"
            >
              <Minimize2 className="h-5 w-5" />
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none z-0"
          style={{ 
            backgroundImage: `url(${marbleOverlay})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'overlay'
          }}
        />
        <div className="flex items-center gap-2 relative z-10">
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

export const StaffOverview = ({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Load visible widgets from localStorage
  useEffect(() => {
    const storageKey = userId ? `staff_overview_widgets_${userId}` : 'staff_overview_widgets';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setVisibleWidgets(JSON.parse(saved));
      } catch {
        setVisibleWidgets(WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id));
      }
    } else {
      setVisibleWidgets(WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id));
    }
  }, [userId]);

  // Save visible widgets to localStorage
  const saveVisibleWidgets = (widgets: string[]) => {
    const storageKey = userId ? `staff_overview_widgets_${userId}` : 'staff_overview_widgets';
    localStorage.setItem(storageKey, JSON.stringify(widgets));
    setVisibleWidgets(widgets);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newWidgets = visibleWidgets.includes(widgetId)
      ? visibleWidgets.filter(id => id !== widgetId)
      : [...visibleWidgets, widgetId];
    saveVisibleWidgets(newWidgets);
  };

  const resetToDefaults = () => {
    const defaults = WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id);
    saveVisibleWidgets(defaults);
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('representation_status', 'represented')
        .order('name');
      
      if (data && !error) {
        setPlayers(data);
      }
    };

    const fetchGoals = async () => {
      const { data, error } = await supabase
        .from('staff_goals')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (data && !error) {
        setGoals(data);
      }
    };

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('completed', false)
        .order('display_order', { ascending: true })
        .limit(5);
      
      if (data && !error) {
        setTasks(data);
      }
    };

    fetchPlayers();
    fetchGoals();
    fetchTasks();
  }, []);

  const toggleWidget = (id: string) => {
    setExpandedWidget(expandedWidget === id ? null : id);
  };

  const navigateToPlayer = (playerSlug: string, tab: string) => {
    setSearchParams({ section: 'players', player: playerSlug, tab });
  };

  const navigateToGoalsTasks = () => {
    setSearchParams({ section: 'goalstasks' });
  };

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_tasks')
        .update({ completed: !currentCompleted })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      const { data } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('completed', false)
        .order('display_order', { ascending: true })
        .limit(5);
      
      if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "goals":
        return (
          <Widget
            key="goals"
            id="goals"
            title="Quarter Goals"
            icon={Target}
            size="small"
            expanded={expandedWidget === "goals"}
            onToggleExpand={() => toggleWidget("goals")}
          >
            <div className="space-y-2 px-1 cursor-pointer" onClick={navigateToGoalsTasks}>
              {goals.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Click to add goals
                </div>
              ) : (
                goals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="group">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-[10px] sm:text-xs font-medium truncate">{goal.title}</span>
                      <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">
                        {goal.current_value}
                        <span className="text-muted-foreground">/{goal.target_value}</span>
                      </span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          goal.color === "amber"
                            ? "bg-gradient-to-r from-amber-500 to-amber-400"
                            : goal.color === "emerald"
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : goal.color === "rose"
                            ? "bg-gradient-to-r from-rose-500 to-rose-400"
                            : goal.color === "purple"
                            ? "bg-gradient-to-r from-purple-500 to-purple-400"
                            : "bg-gradient-to-r from-primary to-primary-glow"
                        }`}
                        style={{ width: `${Math.min((goal.current_value / goal.target_value) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Widget>
        );

      case "todo":
        return (
          <Widget
            key="todo"
            id="todo"
            title="To Do"
            icon={CheckSquare}
            size="small"
            expanded={expandedWidget === "todo"}
            onToggleExpand={() => toggleWidget("todo")}
          >
            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4 cursor-pointer" onClick={navigateToGoalsTasks}>
                  Click to add tasks
                </div>
              ) : (
                <>
                  {tasks.map((task) => (
                    <label key={task.id} className="flex items-center gap-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id, task.completed)}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">{task.title}</span>
                    </label>
                  ))}
                  <div className="pt-1 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px]"
                      onClick={navigateToGoalsTasks}
                    >
                      Manage Tasks
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Widget>
        );

      case "quicklinks":
        return (
          <Widget
            key="quicklinks"
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
        );

      case "financial":
        return (
          <Widget
            key="financial"
            id="financial"
            title="Financial Projection"
            icon={TrendingUp}
            size="wide"
            expanded={expandedWidget === "financial"}
            onToggleExpand={() => toggleWidget("financial")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 h-full">
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
              <div className="hidden sm:flex flex-col justify-center p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded border border-amber-500/30">
                <div className="text-sm md:text-lg font-bold text-amber-600">€45k</div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Commissions</div>
              </div>
              <div className="hidden md:flex flex-col justify-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded border border-blue-500/30">
                <div className="text-sm md:text-lg font-bold text-blue-600">€32k</div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Consulting</div>
              </div>
            </div>
          </Widget>
        );

      case "schedule":
        return (
          <Widget
            key="schedule"
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
        );

      case "represented":
        return (
          <Widget
            key="represented"
            id="represented"
            title="Represented Players"
            icon={Users}
            size="medium"
            expanded={expandedWidget === "represented"}
            onToggleExpand={() => toggleWidget("represented")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(expandedWidget === "represented" ? players : isMobile ? players.slice(0, 2) : players).map((player) => (
                <div key={player.id} className="flex flex-col p-2 border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all group">
                  <img 
                    src={player.image_url || player.image || "/players/player1.jpg"} 
                    alt={player.name} 
                    className="w-full h-14 object-cover border border-primary/30 mb-1" 
                  />
                  <span className="text-[10px] md:text-[10px] font-semibold text-center">{player.name}</span>
                  <span className="text-[9px] text-muted-foreground mb-1 text-center">{player.position}</span>
                  <div className="flex flex-col xl:flex-row gap-0.5 w-full">
                    <Button 
                      size="sm" 
                      className="h-5 text-[8px] px-1 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0" 
                      onClick={() => navigateToPlayer(player.slug || player.id, 'analysis')}
                    >
                      Analysis
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-5 text-[8px] px-1 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0" 
                      onClick={() => navigateToPlayer(player.slug || player.id, 'programming')}
                    >
                      Programming
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Widget>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Customize Button */}
      <div className="absolute -top-12 right-0 z-10">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Customize
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Overview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Toggle widgets to show or hide them from your overview dashboard.
              </p>
              <div className="space-y-3">
                {WIDGET_CONFIGS.map((widget) => {
                  const Icon = widget.icon;
                  const isVisible = visibleWidgets.includes(widget.id);
                  return (
                    <div 
                      key={widget.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isVisible ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${isVisible ? 'bg-primary/20' : 'bg-muted'}`}>
                          <Icon className={`h-4 w-4 ${isVisible ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`font-medium ${isVisible ? '' : 'text-muted-foreground'}`}>
                          {widget.title}
                        </span>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetToDefaults}
                  className="w-full"
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-[200px] w-full pt-2">
        {visibleWidgets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No widgets visible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Customize" to add widgets to your overview
            </p>
            <Button onClick={() => setSettingsOpen(true)}>
              Customize Dashboard
            </Button>
          </div>
        ) : (
          // Render widgets in a consistent order based on WIDGET_CONFIGS
          WIDGET_CONFIGS
            .filter(config => visibleWidgets.includes(config.id))
            .map(config => renderWidget(config.id))
        )}
      </div>
    </div>
  );
};
