import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, CheckSquare, Users, Calendar, Link2, TrendingUp, Settings, RotateCcw, Layers } from "lucide-react";
import { StaffSchedule } from "./StaffSchedule";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, DragEndEvent, DragOverEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableWidget, WidgetLayout } from "./SortableWidget";
import { RowDropZone } from "./RowDropZone";

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
  defaultVisible: boolean;
}

const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: "goals", title: "Quarter Goals", icon: Target, defaultVisible: true },
  { id: "todo", title: "To Do", icon: CheckSquare, defaultVisible: true },
  { id: "quicklinks", title: "Quick Links", icon: Link2, defaultVisible: true },
  { id: "financial", title: "Financial Projection", icon: TrendingUp, defaultVisible: true },
  { id: "schedule", title: "Schedule Calendar", icon: Calendar, defaultVisible: true },
  { id: "represented", title: "Represented Players", icon: Users, defaultVisible: true },
];

const DEFAULT_LAYOUTS: WidgetLayout[] = [
  { id: "goals", row: 0, order: 0, widthPercent: 33, heightRows: 1 },
  { id: "todo", row: 0, order: 1, widthPercent: 33, heightRows: 1 },
  { id: "quicklinks", row: 0, order: 2, widthPercent: 34, heightRows: 1 },
  { id: "financial", row: 1, order: 0, widthPercent: 100, heightRows: 1 },
  { id: "schedule", row: 2, order: 0, widthPercent: 60, heightRows: 3 },
  { id: "represented", row: 2, order: 1, widthPercent: 40, heightRows: 3 },
];

const ROW_HEIGHT = 200;

export const StaffOverview = ({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<WidgetLayout[]>(DEFAULT_LAYOUTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load settings from localStorage
  useEffect(() => {
    const storageKey = userId ? `staff_overview_settings_${userId}` : 'staff_overview_settings';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.visibleWidgets) setVisibleWidgets(parsed.visibleWidgets);
        if (parsed.layouts) setLayouts(parsed.layouts);
      } catch {
        setVisibleWidgets(WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id));
        setLayouts(DEFAULT_LAYOUTS);
      }
    } else {
      setVisibleWidgets(WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id));
      setLayouts(DEFAULT_LAYOUTS);
    }
  }, [userId]);

  // Save settings to localStorage
  const saveSettings = (newVisibleWidgets: string[], newLayouts: WidgetLayout[]) => {
    const storageKey = userId ? `staff_overview_settings_${userId}` : 'staff_overview_settings';
    localStorage.setItem(storageKey, JSON.stringify({ visibleWidgets: newVisibleWidgets, layouts: newLayouts }));
    setVisibleWidgets(newVisibleWidgets);
    setLayouts(newLayouts);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newWidgets = visibleWidgets.includes(widgetId)
      ? visibleWidgets.filter(id => id !== widgetId)
      : [...visibleWidgets, widgetId];
    
    // If adding a widget, give it a default layout
    let newLayouts = layouts;
    if (!visibleWidgets.includes(widgetId)) {
      const existingLayout = layouts.find(l => l.id === widgetId);
      if (!existingLayout) {
        const maxRow = Math.max(...layouts.map(l => l.row), -1);
        newLayouts = [...layouts, { id: widgetId, row: maxRow + 1, order: 0, widthPercent: 100, heightRows: 1 }];
      }
    }
    
    saveSettings(newWidgets, newLayouts);
  };

  const resetToDefaults = () => {
    const defaults = WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id);
    saveSettings(defaults, DEFAULT_LAYOUTS);
  };

  const handleResize = (widgetId: string, newWidthPercent: number, newHeightRows: number) => {
    const widgetLayout = layouts.find(l => l.id === widgetId);
    if (!widgetLayout) return;

    const rowWidgets = layouts.filter(l => l.row === widgetLayout.row && visibleWidgets.includes(l.id));
    
    // Calculate how much width change there is
    const widthDelta = newWidthPercent - widgetLayout.widthPercent;
    
    // Distribute the change among other widgets in the same row
    const otherWidgets = rowWidgets.filter(w => w.id !== widgetId);
    const totalOtherWidth = otherWidgets.reduce((sum, w) => sum + w.widthPercent, 0);
    
    const newLayouts = layouts.map(l => {
      if (l.id === widgetId) {
        return { ...l, widthPercent: newWidthPercent, heightRows: newHeightRows };
      }
      if (l.row === widgetLayout.row && otherWidgets.some(ow => ow.id === l.id)) {
        // Proportionally adjust other widgets
        const proportion = l.widthPercent / totalOtherWidth;
        const adjustment = widthDelta * proportion;
        const newWidth = Math.max(25, l.widthPercent - adjustment);
        return { ...l, widthPercent: newWidth };
      }
      return l;
    });

    // Normalize row widths to 100%
    const rowLayouts = newLayouts.filter(l => l.row === widgetLayout.row && visibleWidgets.includes(l.id));
    const totalWidth = rowLayouts.reduce((sum, l) => sum + l.widthPercent, 0);
    
    const normalizedLayouts = newLayouts.map(l => {
      if (l.row === widgetLayout.row && visibleWidgets.includes(l.id)) {
        return { ...l, widthPercent: (l.widthPercent / totalWidth) * 100 };
      }
      return l;
    });

    saveSettings(visibleWidgets, normalizedLayouts);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeLayout = layouts.find(l => l.id === active.id);
    if (!activeLayout) return;

    // Check if dropped on a row gap (new row creation)
    if (String(over.id).startsWith('row-gap-')) {
      const targetRowIndex = parseInt(String(over.id).replace('row-gap-', ''), 10);
      
      // Get the actual row numbers
      const sortedRows = [...new Set(layouts.filter(l => visibleWidgets.includes(l.id)).map(l => l.row))].sort((a, b) => a - b);
      
      let newRowNumber: number;
      if (targetRowIndex === 0) {
        // Dropped above first row - new row will be the minimum row - 1
        newRowNumber = sortedRows.length > 0 ? sortedRows[0] - 1 : 0;
      } else if (targetRowIndex > sortedRows.length) {
        // Dropped below last row
        newRowNumber = sortedRows.length > 0 ? sortedRows[sortedRows.length - 1] + 1 : 0;
      } else {
        // Dropped between rows
        const rowAbove = sortedRows[targetRowIndex - 1];
        const rowBelow = sortedRows[targetRowIndex];
        newRowNumber = rowAbove + 0.5; // Temporary, will be normalized
      }

      // Remove from old row and add to new row
      const oldRowWidgets = layouts.filter(l => l.row === activeLayout.row && l.id !== active.id && visibleWidgets.includes(l.id));
      const oldRowTotal = oldRowWidgets.reduce((sum, w) => sum + w.widthPercent, 0);

      let newLayouts = layouts.map(l => {
        if (l.id === active.id) {
          return { ...l, row: newRowNumber, order: 0, widthPercent: 100 };
        }
        if (l.row === activeLayout.row && l.id !== active.id && visibleWidgets.includes(l.id)) {
          // Expand remaining widgets in old row to fill 100%
          return { ...l, widthPercent: oldRowTotal > 0 ? (l.widthPercent / oldRowTotal) * 100 : 100 };
        }
        return l;
      });

      // Normalize row numbers to be sequential (0, 1, 2, ...)
      const allRows = [...new Set(newLayouts.filter(l => visibleWidgets.includes(l.id)).map(l => l.row))].sort((a, b) => a - b);
      const rowMapping = new Map<number, number>();
      allRows.forEach((oldRow, newIndex) => rowMapping.set(oldRow, newIndex));

      newLayouts = newLayouts.map(l => ({
        ...l,
        row: rowMapping.get(l.row) ?? l.row
      }));

      saveSettings(visibleWidgets, newLayouts);
      return;
    }

    // Original logic for dropping on another widget
    const overLayout = layouts.find(l => l.id === over.id);
    if (!overLayout) return;

    let newLayouts: WidgetLayout[];

    if (activeLayout.row === overLayout.row) {
      // Swap within same row
      newLayouts = layouts.map(l => {
        if (l.id === active.id) return { ...l, order: overLayout.order };
        if (l.id === over.id) return { ...l, order: activeLayout.order };
        return l;
      });
    } else {
      // Move to different row
      const oldRowWidgets = layouts.filter(l => l.row === activeLayout.row && l.id !== active.id && visibleWidgets.includes(l.id));
      const newRowWidgets = layouts.filter(l => l.row === overLayout.row && visibleWidgets.includes(l.id));

      // Redistribute widths in old row
      const oldRowTotal = oldRowWidgets.reduce((sum, w) => sum + w.widthPercent, 0);
      
      // Calculate new width for the moved widget
      const newWidthForActive = 100 / (newRowWidgets.length + 1);
      
      newLayouts = layouts.map(l => {
        if (l.id === active.id) {
          return { ...l, row: overLayout.row, order: overLayout.order + 0.5, widthPercent: newWidthForActive };
        }
        if (l.row === activeLayout.row && l.id !== active.id && visibleWidgets.includes(l.id)) {
          // Expand remaining widgets in old row
          return { ...l, widthPercent: oldRowTotal > 0 ? (l.widthPercent / oldRowTotal) * 100 : 100 };
        }
        if (l.row === overLayout.row && visibleWidgets.includes(l.id)) {
          // Shrink widgets in new row
          const shrinkFactor = (100 - newWidthForActive) / 100;
          return { ...l, widthPercent: l.widthPercent * shrinkFactor };
        }
        return l;
      });

      // Re-sort orders within the new row
      const newRowAfterMove = newLayouts.filter(l => l.row === overLayout.row);
      newRowAfterMove.sort((a, b) => a.order - b.order);
      newRowAfterMove.forEach((l, i) => {
        const idx = newLayouts.findIndex(nl => nl.id === l.id);
        if (idx !== -1) newLayouts[idx] = { ...newLayouts[idx], order: i };
      });
    }

    // Clean up empty rows and normalize row numbers
    const usedRows = [...new Set(newLayouts.filter(l => visibleWidgets.includes(l.id)).map(l => l.row))].sort((a, b) => a - b);
    const rowMapping = new Map<number, number>();
    usedRows.forEach((oldRow, newIndex) => rowMapping.set(oldRow, newIndex));

    newLayouts = newLayouts.map(l => ({
      ...l,
      row: rowMapping.get(l.row) ?? l.row
    }));

    saveSettings(visibleWidgets, newLayouts);
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

  // Group layouts by row
  const widgetsByRow = useMemo(() => {
    const rows = new Map<number, WidgetLayout[]>();
    layouts
      .filter(l => visibleWidgets.includes(l.id))
      .forEach(l => {
        if (!rows.has(l.row)) rows.set(l.row, []);
        rows.get(l.row)!.push(l);
      });
    // Sort each row by order
    rows.forEach(row => row.sort((a, b) => a.order - b.order));
    return Array.from(rows.entries()).sort(([a], [b]) => a - b);
  }, [layouts, visibleWidgets]);

  const renderWidgetContent = (widgetId: string) => {
    const config = WIDGET_CONFIGS.find(c => c.id === widgetId);
    if (!config) return null;

    switch (widgetId) {
      case "goals":
        return (
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
        );

      case "todo":
        return (
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
        );

      case "quicklinks":
        return (
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
        );

      case "financial":
        return (
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
        );

      case "schedule":
        return (
          <div className="w-full h-full">
            <StaffSchedule isAdmin={isAdmin} />
          </div>
        );

      case "represented":
        return (
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Customize Overview</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="widgets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="widgets">Widgets</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              <TabsContent value="widgets" className="space-y-4 py-4">
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
              </TabsContent>
              <TabsContent value="layout" className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Drag widgets to reorder them. Resize by dragging the edges.
                </p>
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                  {widgetsByRow.map(([rowNum, rowWidgets]) => (
                    <div key={rowNum} className="flex gap-1 p-2 bg-background/50 rounded border border-border/50">
                      {rowWidgets.map(widget => {
                        const config = WIDGET_CONFIGS.find(c => c.id === widget.id);
                        if (!config) return null;
                        const Icon = config.icon;
                        return (
                          <div 
                            key={widget.id}
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs"
                            style={{ width: `${widget.widthPercent}%` }}
                          >
                            <Icon className="h-3 w-3 text-primary" />
                            <span className="truncate">{config.title}</span>
                            <span className="text-muted-foreground ml-auto">{Math.round(widget.widthPercent)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>Tip: Drag widget edges in the dashboard to resize</span>
                </div>
              </TabsContent>
            </Tabs>
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetToDefaults}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Widget Grid */}
      <div className="w-full pt-2 space-y-2">
        {visibleWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
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
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragEnd={handleDragEnd}
          >
            {/* Drop zone above first row */}
            <RowDropZone id="row-gap-0" />
            
            {widgetsByRow.map(([rowNum, rowWidgets], rowIndex) => {
              const maxHeightInRow = Math.max(...rowWidgets.map(w => w.heightRows));
              return (
                <div key={rowNum}>
                  <div 
                    className="flex gap-2 w-full"
                    style={{ minHeight: `${maxHeightInRow * ROW_HEIGHT}px` }}
                  >
                    <SortableContext
                      items={rowWidgets.map(w => w.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {rowWidgets.map(widget => {
                        const config = WIDGET_CONFIGS.find(c => c.id === widget.id);
                        if (!config) return null;
                        return (
                          <SortableWidget
                            key={widget.id}
                            id={widget.id}
                            layout={widget}
                            title={config.title}
                            icon={config.icon}
                            expanded={expandedWidget === widget.id}
                            onToggleExpand={() => toggleWidget(widget.id)}
                            onResize={handleResize}
                            rowHeight={ROW_HEIGHT}
                          >
                            {renderWidgetContent(widget.id)}
                          </SortableWidget>
                        );
                      })}
                    </SortableContext>
                  </div>
                  {/* Drop zone below this row */}
                  <RowDropZone id={`row-gap-${rowIndex + 1}`} />
                </div>
              );
            })}
          </DndContext>
        )}
      </div>
    </div>
  );
};
