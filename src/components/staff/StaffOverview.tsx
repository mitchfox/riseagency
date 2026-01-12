import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, CheckSquare, Users, Calendar, Link2, TrendingUp, Settings, RotateCcw, Layers, Plus, Search, Megaphone, ClipboardList, BarChart3, FileText, Mail, Dumbbell, Bell, Clock, FolderOpen, MessageSquare, Briefcase, Globe, Receipt, UserPlus, Activity, Timer, Zap, Focus, Brain, ListTodo, Gauge, Workflow, Kanban, GitBranch, Repeat, Flag, Milestone, Trophy, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DndContext, DragEndEvent, DragOverEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableWidget, WidgetLayout } from "./SortableWidget";
import { RowDropZone } from "./RowDropZone";
import { PersonalScheduleCalendar } from "./PersonalScheduleCalendar";
import { PersonalScheduleFullscreen } from "./PersonalScheduleFullscreen";
import { useScoutingWidget, useProspectsWidget, useInvoicesWidget, useReportsWidget, useSiteVisitsWidget, useMarketingWidget, useOutreachWidget, useNewPlayersWidget, useCoachingWidget } from "./widgets/useWidgetData";
import { FocusTimerWidget } from "./widgets/FocusTimerWidget";
import { DailyHabitsWidget } from "./widgets/DailyHabitsWidget";
import { KanbanWidget } from "./widgets/KanbanWidget";
import { PriorityMatrixWidget } from "./widgets/PriorityMatrixWidget";
import { IdeasNotesWidget } from "./widgets/IdeasNotesWidget";
import { FormSubmissionsWidget } from "./widgets/FormSubmissionsWidget";
import { ProductivityInsightsWidget } from "./widgets/ProductivityInsightsWidget";
import { QuickLinksWidget } from "./widgets/QuickLinksWidget";
import { VisionBoardWidget } from "./widgets/VisionBoardWidget";
import { DocsWidget } from "./widgets/DocsWidget";
import { SheetsWidget } from "./widgets/SheetsWidget";
import { FocusedTasksSection } from "./FocusedTasksSection";

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
  // Default visible
  { id: "visionboard", title: "Vision Board", icon: Sparkles, defaultVisible: true },
  { id: "goals", title: "Quarter Goals", icon: Target, defaultVisible: true },
  { id: "todo", title: "To Do", icon: CheckSquare, defaultVisible: true },
  { id: "quicklinks", title: "Quick Links", icon: Link2, defaultVisible: true },
  { id: "financial", title: "Financial Projection", icon: TrendingUp, defaultVisible: true },
  { id: "schedule", title: "Schedule Calendar", icon: Calendar, defaultVisible: true },
  { id: "represented", title: "Represented Players", icon: Users, defaultVisible: true },
  // General
  { id: "notifications", title: "Recent Notifications", icon: Bell, defaultVisible: false },
  { id: "activity", title: "Activity Feed", icon: Activity, defaultVisible: false },
  { id: "messages", title: "Form Submissions", icon: MessageSquare, defaultVisible: false },
  { id: "sitevisits", title: "Site Visits", icon: Globe, defaultVisible: false },
  // Scouting & Players
  { id: "scouting", title: "Scouting Activity", icon: Search, defaultVisible: false },
  { id: "prospects", title: "Prospect Pipeline", icon: ClipboardList, defaultVisible: false },
  { id: "newplayers", title: "New Player Signups", icon: UserPlus, defaultVisible: false },
  // Marketing & Outreach
  { id: "marketing", title: "Marketing Campaigns", icon: Megaphone, defaultVisible: false },
  { id: "outreach", title: "Club Outreach", icon: Mail, defaultVisible: false },
  // Performance & Analysis
  { id: "analytics", title: "Performance Analytics", icon: BarChart3, defaultVisible: false },
  { id: "reports", title: "Recent Reports", icon: FileText, defaultVisible: false },
  { id: "coaching", title: "Coaching Sessions", icon: Dumbbell, defaultVisible: false },
  // Organizational
  { id: "invoices", title: "Pending Invoices", icon: Receipt, defaultVisible: false },
  { id: "documents", title: "Recent Documents", icon: FolderOpen, defaultVisible: false },
  { id: "docs", title: "Staff Docs", icon: FileText, defaultVisible: false },
  { id: "sheets", title: "Staff Sheets", icon: BarChart3, defaultVisible: false },
  { id: "deadlines", title: "Upcoming Deadlines", icon: Clock, defaultVisible: false },
  { id: "projects", title: "Active Projects", icon: Briefcase, defaultVisible: false },
  // Advanced Productivity
  { id: "pomodoro", title: "Focus Timer", icon: Timer, defaultVisible: false },
  { id: "habits", title: "Daily Habits", icon: Repeat, defaultVisible: false },
  { id: "priorities", title: "Priority Matrix", icon: Flag, defaultVisible: false },
  { id: "milestones", title: "Key Milestones", icon: Milestone, defaultVisible: false },
  { id: "workflows", title: "Active Workflows", icon: Workflow, defaultVisible: false },
  { id: "kanban", title: "Kanban Board", icon: Kanban, defaultVisible: false },
  { id: "sprints", title: "Sprint Progress", icon: GitBranch, defaultVisible: false },
  { id: "velocity", title: "Team Velocity", icon: Gauge, defaultVisible: false },
  { id: "focus", title: "Focus Sessions", icon: Focus, defaultVisible: false },
  { id: "mindmap", title: "Ideas & Notes", icon: Brain, defaultVisible: false },
  { id: "backlog", title: "Task Backlog", icon: ListTodo, defaultVisible: false },
  { id: "automations", title: "Automations", icon: Zap, defaultVisible: false },
  { id: "achievements", title: "Achievements", icon: Trophy, defaultVisible: false },
  { id: "insights", title: "Productivity Insights", icon: Sparkles, defaultVisible: false },
];

const DEFAULT_LAYOUTS: WidgetLayout[] = [
  { id: "visionboard", row: 0, order: 0, widthPercent: 100, heightPx: 200 },
  { id: "goals", row: 1, order: 0, widthPercent: 33, heightPx: 200 },
  { id: "todo", row: 1, order: 1, widthPercent: 33, heightPx: 200 },
  { id: "quicklinks", row: 1, order: 2, widthPercent: 34, heightPx: 200 },
  { id: "financial", row: 2, order: 0, widthPercent: 100, heightPx: 200 },
  { id: "schedule", row: 3, order: 0, widthPercent: 60, heightPx: 450 },
  { id: "represented", row: 3, order: 1, widthPercent: 40, heightPx: 280 },
];

const DEFAULT_HEIGHT_PX = 200;

export const StaffOverview = ({ isAdmin, userId, isMarketeer = false }: { isAdmin: boolean; userId?: string; isMarketeer?: boolean }) => {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<WidgetLayout[]>(DEFAULT_LAYOUTS);
  const [savedLayouts, setSavedLayouts] = useState<WidgetLayout[]>(DEFAULT_LAYOUTS);
  const [savedVisibleWidgets, setSavedVisibleWidgets] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [scheduleFullscreen, setScheduleFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isMobile = useIsMobile();

  // Filter widget configs based on role (hide financial for marketeers)
  const filteredWidgetConfigs = useMemo(() => {
    if (isMarketeer) {
      return WIDGET_CONFIGS.filter(w => w.id !== 'financial');
    }
    return WIDGET_CONFIGS;
  }, [isMarketeer]);

  // Filter default layouts for marketeers
  const filteredDefaultLayouts = useMemo(() => {
    if (isMarketeer) {
      return DEFAULT_LAYOUTS.filter(l => l.id !== 'financial');
    }
    return DEFAULT_LAYOUTS;
  }, [isMarketeer]);

  // Widget data hooks
  const scoutingData = useScoutingWidget();
  const prospectsData = useProspectsWidget();
  const invoicesData = useInvoicesWidget();
  const reportsData = useReportsWidget();
  const siteVisitsData = useSiteVisitsWidget();
  const marketingData = useMarketingWidget();
  const outreachData = useOutreachWidget();
  const newPlayersData = useNewPlayersWidget();
  const coachingData = useCoachingWidget();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get consistent storage key
  const getStorageKey = () => {
    // Always use a consistent key - prioritize userId if available
    if (userId) return `staff_overview_settings_${userId}`;
    return 'staff_overview_settings_global';
  };

  // Load settings from localStorage
  useEffect(() => {
    // Wait for userId to be available before loading
    if (userId === undefined) return;
    
    const storageKey = getStorageKey();
    console.log('Loading overview settings from:', storageKey);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Loaded settings:', parsed);
        if (parsed.visibleWidgets) {
          setVisibleWidgets(parsed.visibleWidgets);
          setSavedVisibleWidgets(parsed.visibleWidgets);
        }
        if (parsed.layouts) {
          setLayouts(parsed.layouts);
          setSavedLayouts(parsed.layouts);
        }
      } catch {
        const defaults = filteredWidgetConfigs.filter(w => w.defaultVisible).map(w => w.id);
        setVisibleWidgets(defaults);
        setSavedVisibleWidgets(defaults);
        setLayouts(filteredDefaultLayouts);
        setSavedLayouts(filteredDefaultLayouts);
      }
    } else {
      const defaults = filteredWidgetConfigs.filter(w => w.defaultVisible).map(w => w.id);
      setVisibleWidgets(defaults);
      setSavedVisibleWidgets(defaults);
      setLayouts(filteredDefaultLayouts);
      setSavedLayouts(filteredDefaultLayouts);
    }
  }, [userId]);

  // Check for unsaved changes
  useEffect(() => {
    const layoutsChanged = JSON.stringify(layouts) !== JSON.stringify(savedLayouts);
    const widgetsChanged = JSON.stringify(visibleWidgets.sort()) !== JSON.stringify([...savedVisibleWidgets].sort());
    setHasUnsavedChanges(layoutsChanged || widgetsChanged);
  }, [layouts, savedLayouts, visibleWidgets, savedVisibleWidgets]);

  // Save settings to localStorage (only updates local state, doesn't persist)
  const updateLayoutState = (newVisibleWidgets: string[], newLayouts: WidgetLayout[]) => {
    setVisibleWidgets(newVisibleWidgets);
    setLayouts(newLayouts);
  };

  // Persist changes to localStorage
  const confirmSaveChanges = () => {
    const storageKey = getStorageKey();
    // Deep clone the layouts to avoid reference issues
    const layoutsCopy = layouts.map(l => ({ ...l }));
    const widgetsCopy = [...visibleWidgets];
    console.log('Saving overview settings to:', storageKey, { visibleWidgets: widgetsCopy, layouts: layoutsCopy });
    localStorage.setItem(storageKey, JSON.stringify({ visibleWidgets: widgetsCopy, layouts: layoutsCopy }));
    setSavedLayouts(layoutsCopy);
    setSavedVisibleWidgets(widgetsCopy);
    setHasUnsavedChanges(false);
  };

  // Discard changes
  const discardChanges = () => {
    setLayouts(savedLayouts);
    setVisibleWidgets(savedVisibleWidgets);
    setHasUnsavedChanges(false);
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
        newLayouts = [...layouts, { id: widgetId, row: maxRow + 1, order: 0, widthPercent: 100, heightPx: DEFAULT_HEIGHT_PX }];
      }
    }
    
    updateLayoutState(newWidgets, newLayouts);
  };

  const resetToDefaults = () => {
    const defaults = filteredWidgetConfigs.filter(w => w.defaultVisible).map(w => w.id);
    updateLayoutState(defaults, filteredDefaultLayouts);
    // Also persist immediately when resetting
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify({ visibleWidgets: defaults, layouts: filteredDefaultLayouts }));
    setSavedLayouts([...filteredDefaultLayouts]);
    setSavedVisibleWidgets([...defaults]);
  };

  const handleResize = (widgetId: string, newWidthPercent: number, newHeightPx: number) => {
    const widgetLayout = layouts.find(l => l.id === widgetId);
    if (!widgetLayout) return;

    const rowWidgets = layouts.filter(l => l.row === widgetLayout.row && visibleWidgets.includes(l.id));
    const otherWidgets = rowWidgets.filter(w => w.id !== widgetId);
    
    // If only one widget in row, just update it
    if (otherWidgets.length === 0) {
      const newLayouts = layouts.map(l => 
        l.id === widgetId ? { ...l, widthPercent: 100, heightPx: newHeightPx } : l
      );
      updateLayoutState(visibleWidgets, newLayouts);
      return;
    }
    
    // Calculate remaining width for other widgets
    const remainingWidth = 100 - newWidthPercent;
    
    // For 2 widgets: sibling gets all remaining
    // For 3+ widgets: distribute remaining proportionally
    const newLayouts = layouts.map(l => {
      if (l.id === widgetId) {
        return { ...l, widthPercent: newWidthPercent, heightPx: newHeightPx };
      }
      if (l.row === widgetLayout.row && otherWidgets.some(ow => ow.id === l.id)) {
        if (otherWidgets.length === 1) {
          // Single sibling gets all remaining width
          return { ...l, widthPercent: remainingWidth };
        } else {
          // Multiple siblings: distribute proportionally
          const totalOtherWidth = otherWidgets.reduce((sum, w) => sum + w.widthPercent, 0);
          const proportion = l.widthPercent / totalOtherWidth;
          const newWidth = Math.max(15, remainingWidth * proportion);
          return { ...l, widthPercent: newWidth };
        }
      }
      return l;
    });

    updateLayoutState(visibleWidgets, newLayouts);
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

      updateLayoutState(visibleWidgets, newLayouts);
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

    updateLayoutState(visibleWidgets, newLayouts);
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

  const navigate = useNavigate();

  const navigateToPlayer = (playerId: string, tab: string) => {
    // Use navigate for reliable cross-component navigation
    navigate(`/staff?section=players&player=${playerId}&tab=${tab}`);
  };

  const navigateToGoalsTasks = () => {
    navigate('/staff?section=goalstasks');
  };

  const handleQuickAddTask = async () => {
    if (!newTaskInput.trim()) return;
    try {
      const { error } = await supabase
        .from('staff_tasks')
        .insert({ title: newTaskInput.trim(), display_order: tasks.length });
      if (error) throw error;
      setNewTaskInput("");
      // Refresh tasks
      const { data } = await supabase
        .from('staff_tasks')
        .select('*')
        .eq('completed', false)
        .order('display_order', { ascending: true })
        .limit(5);
      if (data) setTasks(data);
    } catch (error) {
      console.error('Error adding task:', error);
    }
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

  const renderWidgetContent = (widgetId: string, layout?: WidgetLayout) => {
    const config = filteredWidgetConfigs.find(c => c.id === widgetId);
    if (!config) return null;

    switch (widgetId) {
      case "visionboard":
        return (
          <VisionBoardWidget 
            isExpanded={expandedWidget === "visionboard"} 
            onNavigate={(section) => setSearchParams({ section })}
          />
        );

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
          <div className="space-y-1.5 h-full flex flex-col">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="New task..."
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickAddTask()}
                className="flex-1 h-6 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={handleQuickAddTask}
                disabled={!newTaskInput.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {tasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4 cursor-pointer" onClick={navigateToGoalsTasks}>
                  No tasks yet
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
                </>
              )}
            </div>
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
          </div>
        );

      case "quicklinks":
        return <QuickLinksWidget userId={userId} />;

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
            <PersonalScheduleCalendar 
              onFullscreenToggle={() => setScheduleFullscreen(true)}
              showFullscreenButton={true}
            />
            <PersonalScheduleFullscreen 
              open={scheduleFullscreen} 
              onOpenChange={setScheduleFullscreen} 
            />
          </div>
        );

      case "represented": {
        // Calculate adaptive sizing based on widget dimensions
        const widthPercent = layout?.widthPercent || 40;
        const heightPx = layout?.heightPx || DEFAULT_HEIGHT_PX;
        
        // Determine grid columns based on width
        const gridCols = widthPercent >= 80 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
                       : widthPercent >= 50 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
                       : 'grid-cols-1 sm:grid-cols-2';
        
        // Scale factors based on available space
        const isLarge = widthPercent >= 60 && heightPx >= 350;
        const isMedium = widthPercent >= 40 || heightPx >= 300;
        
        // Adaptive text/element sizes
        const imageHeight = isLarge ? 'h-24' : isMedium ? 'h-16' : 'h-12';
        const nameSize = isLarge ? 'text-sm' : isMedium ? 'text-xs' : 'text-[10px]';
        const positionSize = isLarge ? 'text-xs' : isMedium ? 'text-[10px]' : 'text-[9px]';
        const buttonHeight = isLarge ? 'h-7' : isMedium ? 'h-6' : 'h-5';
        const buttonTextSize = isLarge ? 'text-xs' : isMedium ? 'text-[10px]' : 'text-[8px]';
        const padding = isLarge ? 'p-3' : isMedium ? 'p-2' : 'p-1.5';
        const gap = isLarge ? 'gap-3' : isMedium ? 'gap-2' : 'gap-1.5';
        
        return (
          <div className={`grid ${gridCols} ${gap} h-full overflow-auto`}>
            {(expandedWidget === "represented" ? players : isMobile ? players.slice(0, 2) : players).map((player) => (
              <div key={player.id} className={`flex flex-col ${padding} border border-border/50 rounded hover:bg-accent/50 hover:border-primary/30 transition-all group`}>
                <img 
                  src={player.image_url || player.image || "/players/player1.jpg"} 
                  alt={player.name} 
                  className={`w-full ${imageHeight} object-cover border border-primary/30 mb-1`} 
                />
                <span className={`${nameSize} font-semibold text-center truncate`}>{player.name}</span>
                <span className={`${positionSize} text-muted-foreground mb-1 text-center`}>{player.position}</span>
                <div className={`flex ${isLarge ? 'flex-row' : 'flex-col xl:flex-row'} gap-0.5 w-full mt-auto`}>
                  <Button 
                    size="sm" 
                    className={`${buttonHeight} ${buttonTextSize} px-1 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToPlayer(player.id, 'analysis');
                    }}
                  >
                    Analysis
                  </Button>
                  <Button 
                    size="sm" 
                    className={`${buttonHeight} ${buttonTextSize} px-1 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-0`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToPlayer(player.id, 'programming');
                    }}
                  >
                    Programming
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "scouting":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'scouting-reports' })}>
            {scoutingData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : scoutingData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Scouting Reports</span>
                  <Badge variant="outline" className="text-[10px]">{scoutingData.data.pendingReviews} pending</Badge>
                </div>
                {scoutingData.data.recentReports.slice(0, 3).map(report => (
                  <div key={report.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-[10px]">
                    <span className="truncate">{report.player_name}</span>
                    <Badge variant="outline" className={`text-[9px] ${report.status === 'pending' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                      {report.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No scouting reports yet
              </div>
            )}
          </div>
        );

      case "marketing":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'campaigns' })}>
            {marketingData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : marketingData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Campaigns</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20">{marketingData.data.active} active</Badge>
                </div>
                {marketingData.data.recent.map(campaign => (
                  <div key={campaign.id} className="p-1.5 bg-muted/30 rounded text-[10px]">
                    <span className="truncate block">{campaign.title}</span>
                    <span className="text-muted-foreground">{campaign.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No campaigns yet
              </div>
            )}
          </div>
        );

      case "prospects":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'prospects' })}>
            {prospectsData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : prospectsData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Prospects</span>
                  <Badge variant="outline" className="text-[10px]">{prospectsData.data.total} total</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(prospectsData.data.byStage).map(([stage, count]) => (
                    <Badge key={stage} variant="outline" className="text-[9px]">{stage}: {count}</Badge>
                  ))}
                </div>
                {prospectsData.data.recent.map(prospect => (
                  <div key={prospect.id} className="p-1.5 bg-muted/30 rounded text-[10px] truncate">
                    {prospect.name}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No prospects yet
              </div>
            )}
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'analytics' })}>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-primary/10 rounded text-center">
                <div className="text-lg font-bold text-primary">{reportsData.data?.total || 0}</div>
                <div className="text-[10px] text-muted-foreground">Reports</div>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded text-center">
                <div className="text-lg font-bold text-emerald-500">{scoutingData.data?.totalReports || 0}</div>
                <div className="text-[10px] text-muted-foreground">Scouting</div>
              </div>
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'player-analysis' })}>
            {reportsData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : reportsData.data ? (
              <div className="space-y-2">
                <span className="text-xs font-medium">Recent Analysis</span>
                {reportsData.data.recent.slice(0, 3).map(report => (
                  <div key={report.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-[10px]">
                    <span className="truncate">vs {report.opponent || 'Unknown'}</span>
                    {report.r90_score && <Badge variant="outline" className="text-[9px]">{report.r90_score}</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No reports yet
              </div>
            )}
          </div>
        );

      case "outreach":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'outreach' })}>
            {outreachData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : outreachData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Club Outreach</span>
                  <Badge variant="outline" className="text-[10px]">{outreachData.data.total} total</Badge>
                </div>
                {outreachData.data.recent.map(outreach => (
                  <div key={outreach.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-[10px]">
                    <span className="truncate">{outreach.club_name}</span>
                    <Badge variant="outline" className="text-[9px]">{outreach.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No outreach yet
              </div>
            )}
          </div>
        );

      case "coaching":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'coaching' })}>
            {coachingData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : coachingData.data ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-primary/10 rounded text-center">
                  <div className="text-lg font-bold text-primary">{coachingData.data.sessions}</div>
                  <div className="text-[9px] text-muted-foreground">Sessions</div>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded text-center">
                  <div className="text-lg font-bold text-emerald-500">{coachingData.data.exercises}</div>
                  <div className="text-[9px] text-muted-foreground">Exercises</div>
                </div>
                <div className="p-2 bg-amber-500/10 rounded text-center">
                  <div className="text-lg font-bold text-amber-500">{coachingData.data.programmes}</div>
                  <div className="text-[9px] text-muted-foreground">Programmes</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No coaching data
              </div>
            )}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'notifications' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No new notifications
            </div>
          </div>
        );

      case "activity":
        return (
          <div className="space-y-2 px-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-primary/10 rounded text-center">
                <div className="text-lg font-bold text-primary">{players.length}</div>
                <div className="text-[10px] text-muted-foreground">Players</div>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded text-center">
                <div className="text-lg font-bold text-emerald-500">{goals.length}</div>
                <div className="text-[10px] text-muted-foreground">Goals</div>
              </div>
            </div>
          </div>
        );

      case "messages":
        return <FormSubmissionsWidget />;

      case "sitevisits":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'visitors' })}>
            {siteVisitsData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : siteVisitsData.data ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-primary/10 rounded text-center">
                    <div className="text-lg font-bold text-primary">{siteVisitsData.data.today}</div>
                    <div className="text-[10px] text-muted-foreground">Today</div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded text-center">
                    <div className="text-lg font-bold text-emerald-500">{siteVisitsData.data.week}</div>
                    <div className="text-[10px] text-muted-foreground">This Week</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {siteVisitsData.data.recentPaths.slice(0, 3).map((path, i) => (
                    <div key={i} className="text-[10px] text-muted-foreground truncate">{path}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No visits
              </div>
            )}
          </div>
        );

      case "newplayers":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'players' })}>
            {newPlayersData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : newPlayersData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">New Players</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20">{newPlayersData.data.thisMonth} this month</Badge>
                </div>
                {newPlayersData.data.recent.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-[10px]">
                    <span className="truncate">{player.name}</span>
                    <span className="text-muted-foreground">{player.position}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No new players
              </div>
            )}
          </div>
        );

      case "invoices":
        return (
          <div className="space-y-2 px-1 cursor-pointer h-full" onClick={() => setSearchParams({ section: 'invoices' })}>
            {invoicesData.loading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : invoicesData.data ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Pending Invoices</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20">{invoicesData.data.pending}</Badge>
                </div>
                <div className="p-2 bg-amber-500/10 rounded text-center">
                  <div className="text-lg font-bold text-amber-600">€{invoicesData.data.total.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Outstanding</div>
                </div>
                {invoicesData.data.recent.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-[10px]">
                    <span>{invoice.invoice_number}</span>
                    <span className="font-medium">{invoice.currency} {invoice.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-4">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No pending invoices
              </div>
            )}
          </div>
        );

      case "documents":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'documents' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Access recent documents
            </div>
          </div>
        );

      case "docs":
        return <DocsWidget />;

      case "sheets":
        return <SheetsWidget />;

      case "deadlines":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Track upcoming deadlines
            </div>
          </div>
        );

      case "projects":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              View active projects
            </div>
          </div>
        );

      case "pomodoro":
        return <FocusTimerWidget />;

      case "habits":
        return <DailyHabitsWidget />;

      case "priorities":
        return <PriorityMatrixWidget />;

      case "milestones":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Milestone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Track key milestones
            </div>
          </div>
        );

      case "workflows":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Manage active workflows
            </div>
          </div>
        );

      case "kanban":
        return <KanbanWidget />;

      case "sprints":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Track sprint progress
            </div>
          </div>
        );

      case "velocity":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Monitor team velocity
            </div>
          </div>
        );

      case "focus":
        return <FocusTimerWidget />;

      case "mindmap":
        return <IdeasNotesWidget />;

      case "backlog":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
              View task backlog
            </div>
          </div>
        );

      case "automations":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Manage automations
            </div>
          </div>
        );

      case "achievements":
        return (
          <div className="space-y-2 px-1 cursor-pointer" onClick={() => setSearchParams({ section: 'goalstasks' })}>
            <div className="text-center text-xs text-muted-foreground py-4">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
              View achievements and wins
            </div>
          </div>
        );

      case "insights":
        return <ProductivityInsightsWidget />;

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="absolute -top-14 md:-top-16 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Layout changes not saved</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={discardChanges}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Discard
            </Button>
            <Button 
              size="sm" 
              onClick={confirmSaveChanges}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Preferences Button */}
      <div className={`absolute ${hasUnsavedChanges ? '-top-4 md:-top-4' : '-top-10 md:-top-12'} right-0 z-10 transition-all`}>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm h-8 md:h-9 px-2 md:px-3">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Preferences</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="widgets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="widgets">Widgets</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              <TabsContent value="widgets" className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Toggle widgets to show or hide them from your overview dashboard.
                </p>
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {filteredWidgetConfigs.map((widget) => {
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
                </ScrollArea>
              </TabsContent>
              <TabsContent value="layout" className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Drag widgets to reorder them. Resize by dragging the edges.
                </p>
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                  {widgetsByRow.map(([rowNum, rowWidgets]) => (
                    <div key={rowNum} className="flex gap-1 p-2 bg-background/50 rounded border border-border/50">
                      {rowWidgets.map(widget => {
                        const config = filteredWidgetConfigs.find(c => c.id === widget.id);
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
          <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
            <Settings className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-2">No widgets visible</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
              Tap "Preferences" to add widgets to your overview
            </p>
            <Button onClick={() => setSettingsOpen(true)} size="sm">
              Open Preferences
            </Button>
          </div>
        ) : isMobile ? (
          /* Mobile: Stack widgets vertically */
          <div className="space-y-3">
            {visibleWidgets.map(widgetId => {
              const config = filteredWidgetConfigs.find(c => c.id === widgetId);
              const layout = layouts.find(l => l.id === widgetId);
              if (!config || !layout) return null;
              return (
                <SortableWidget
                  key={widgetId}
                  id={widgetId}
                  layout={{ ...layout, widthPercent: 100 }}
                  title={config.title}
                  icon={config.icon}
                  expanded={expandedWidget === widgetId}
                  onToggleExpand={() => toggleWidget(widgetId)}
                  onResize={handleResize}
                  rowHeight={DEFAULT_HEIGHT_PX}
                >
                  {renderWidgetContent(widgetId, layout)}
                </SortableWidget>
              );
            })}
          </div>
        ) : (
          /* Desktop: Original DnD layout */
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragEnd={handleDragEnd}
          >
            {/* Drop zone above first row */}
            <RowDropZone id="row-gap-0" />
            
            {widgetsByRow.map(([rowNum, rowWidgets], rowIndex) => {
              const maxHeightInRow = Math.max(...rowWidgets.map(w => w.heightPx));
              return (
                <div key={rowNum}>
                  <div 
                    className="flex gap-2 w-full"
                    style={{ minHeight: `${maxHeightInRow}px` }}
                  >
                    <SortableContext
                      items={rowWidgets.map(w => w.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {rowWidgets.map(widget => {
                        const config = filteredWidgetConfigs.find(c => c.id === widget.id);
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
                            rowHeight={DEFAULT_HEIGHT_PX}
                          >
                            {renderWidgetContent(widget.id, widget)}
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

      {/* Focused Tasks Section */}
      <div className="mt-8">
        <FocusedTasksSection />
      </div>
    </div>
  );
};
