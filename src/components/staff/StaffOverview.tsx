import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Target, CheckSquare, Users, Calendar, Link2, TrendingUp } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";

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

export const StaffOverview = ({ isAdmin }: { isAdmin: boolean }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const isMobile = useIsMobile();

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-[200px] w-full">
      {/* Quarter Goals - Small */}
      <Widget
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
    </div>
  );
};
