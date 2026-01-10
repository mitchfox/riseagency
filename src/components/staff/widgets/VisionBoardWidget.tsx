import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Target, 
  CheckSquare, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Search,
  Users,
  Network,
  Megaphone,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Scouting: Search,
  Recruitment: Users,
  Networking: Network,
  Marketing: Megaphone,
  Performance: BarChart3,
};

const CATEGORY_COLORS: Record<string, string> = {
  Scouting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Recruitment: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Networking: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Marketing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Performance: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

interface VisionItem {
  id: string;
  category: string;
  vision_statement: string;
  actionable_plans: string[];
  display_order: number;
}

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  color: string;
  quarter: string;
  year: number;
  category: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: string;
}

interface VisionBoardWidgetProps {
  isExpanded?: boolean;
  onNavigate?: (section: string) => void;
}

export const VisionBoardWidget = ({ isExpanded = false, onNavigate }: VisionBoardWidgetProps) => {
  const [visionItems, setVisionItems] = useState<VisionItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingVision, setEditingVision] = useState<VisionItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visionRes, goalsRes, tasksRes] = await Promise.all([
        supabase.from("vision_board").select("*").order("display_order"),
        supabase.from("staff_goals").select("*").order("display_order"),
        supabase.from("staff_tasks").select("*").eq("completed", false).order("display_order"),
      ]);

      if (visionRes.error) throw visionRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setVisionItems(visionRes.data || []);
      setGoals((goalsRes.data || []).map(g => ({ ...g, category: g.category || 'general' })));
      setTasks((tasksRes.data || []).map(t => ({ ...t, category: t.category || 'general' })));
    } catch (error) {
      console.error("Error fetching vision board data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const getGoalsByCategory = (category: string) => {
    return goals.filter(g => g.category?.toLowerCase() === category.toLowerCase());
  };

  const getTasksByCategory = (category: string) => {
    return tasks.filter(t => t.category?.toLowerCase() === category.toLowerCase());
  };

  const handleUpdateVision = async () => {
    if (!editingVision) return;
    try {
      const { error } = await supabase
        .from("vision_board")
        .update({
          vision_statement: editingVision.vision_statement,
          actionable_plans: editingVision.actionable_plans,
        })
        .eq("id", editingVision.id);

      if (error) throw error;
      toast.success("Vision updated!");
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update vision");
    }
  };

  const handleUpdateGoalCategory = async (goalId: string, category: string) => {
    try {
      const { error } = await supabase
        .from("staff_goals")
        .update({ category })
        .eq("id", goalId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error("Failed to update goal category");
    }
  };

  const handleUpdateTaskCategory = async (taskId: string, category: string) => {
    try {
      const { error } = await supabase
        .from("staff_tasks")
        .update({ category })
        .eq("id", taskId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error("Failed to update task category");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact view for widget
  if (!isExpanded) {
    return (
      <div className="space-y-2 h-full overflow-auto p-1">
        <div className="grid grid-cols-5 gap-1">
          {visionItems.slice(0, 5).map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || Target;
            const categoryGoals = getGoalsByCategory(item.category);
            const totalProgress = categoryGoals.length > 0 
              ? categoryGoals.reduce((acc, g) => acc + (g.current_value / g.target_value) * 100, 0) / categoryGoals.length
              : 0;

            return (
              <div 
                key={item.id} 
                className={`p-1.5 rounded border ${CATEGORY_COLORS[item.category] || 'bg-muted/30'} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => onNavigate?.('goals-tasks')}
              >
                <Icon className="h-3 w-3 mb-0.5 mx-auto" />
                <div className="text-[8px] font-medium text-center truncate">{item.category}</div>
                <div className="mt-1">
                  <Progress value={totalProgress} className="h-1" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-1">
          {visionItems.slice(0, 2).map((item) => (
            <div key={item.id} className="text-[9px] p-1.5 bg-muted/20 rounded">
              <span className="font-semibold text-primary">{item.category}:</span>{" "}
              <span className="text-muted-foreground truncate">{item.vision_statement}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full expanded view
  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Vision
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs">
            <Lightbulb className="h-3 w-3 mr-1" />
            Plans
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="mt-0 space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bebas tracking-wider text-primary">RISE BOARD VISION</h3>
              <p className="text-xs text-muted-foreground">Strategic direction across all departments</p>
            </div>

            {visionItems.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Target;
              const categoryGoals = getGoalsByCategory(item.category);
              const categoryTasks = getTasksByCategory(item.category);
              const isOpen = openCategories.includes(item.category);

              return (
                <Collapsible 
                  key={item.id} 
                  open={isOpen} 
                  onOpenChange={() => toggleCategory(item.category)}
                >
                  <Card className={`border ${CATEGORY_COLORS[item.category]?.split(' ')[2] || 'border-border'}`}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-3 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${CATEGORY_COLORS[item.category] || 'bg-muted'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-sm font-semibold">{item.category}</CardTitle>
                            <p className="text-xs text-muted-foreground">{item.vision_statement}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {categoryGoals.length} goals
                          </Badge>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-3 space-y-3">
                        {/* Goals for this category */}
                        {categoryGoals.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">Goals:</span>
                            {categoryGoals.map((goal) => (
                              <div key={goal.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span>{goal.title}</span>
                                    <span className="text-muted-foreground">
                                      {goal.current_value}/{goal.target_value} {goal.unit}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(goal.current_value / goal.target_value) * 100} 
                                    className="h-1.5 mt-1" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actionable Plans */}
                        {item.actionable_plans && item.actionable_plans.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Actionable Plans:</span>
                            <div className="flex flex-wrap gap-1">
                              {item.actionable_plans.map((plan, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px]">
                                  <ArrowRight className="h-2 w-2 mr-1" />
                                  {plan}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tasks for this category */}
                        {categoryTasks.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Active Tasks:</span>
                            {categoryTasks.slice(0, 3).map((task) => (
                              <div key={task.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted/20 rounded">
                                <CheckSquare className="h-3 w-3 text-primary" />
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {categoryTasks.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{categoryTasks.length - 3} more tasks
                              </span>
                            )}
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVision(item);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit Vision & Plans
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </TabsContent>

          <TabsContent value="goals" className="mt-0 space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bebas tracking-wider text-primary">GOALS BY CATEGORY</h3>
              <p className="text-xs text-muted-foreground">Track progress across all departments</p>
            </div>

            {visionItems.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Target;
              const categoryGoals = getGoalsByCategory(item.category);
              const uncategorizedGoals = goals.filter(g => !g.category || g.category === 'general');

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className={`p-2 ${CATEGORY_COLORS[item.category] || 'bg-muted'}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <CardTitle className="text-sm">{item.category}</CardTitle>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {categoryGoals.length} goals
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2">
                    {categoryGoals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No goals assigned to this category
                      </p>
                    ) : (
                      categoryGoals.map((goal) => (
                        <div key={goal.id} className="p-2 bg-muted/20 rounded space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{goal.title}</span>
                            <span className="text-muted-foreground">
                              {goal.current_value}/{goal.target_value} {goal.unit}
                            </span>
                          </div>
                          <Progress 
                            value={(goal.current_value / goal.target_value) * 100} 
                            className="h-2" 
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{goal.quarter} {goal.year}</span>
                            <span>{Math.round((goal.current_value / goal.target_value) * 100)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Uncategorized goals */}
            {goals.filter(g => !g.category || g.category === 'general').length > 0 && (
              <Card>
                <CardHeader className="p-2 bg-muted/50">
                  <CardTitle className="text-sm">Uncategorized Goals</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2">
                  {goals.filter(g => !g.category || g.category === 'general').map((goal) => (
                    <div key={goal.id} className="p-2 bg-muted/20 rounded space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{goal.title}</span>
                        <select 
                          className="text-[10px] bg-transparent border rounded px-1"
                          onChange={(e) => handleUpdateGoalCategory(goal.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Assign category</option>
                          {visionItems.map(v => (
                            <option key={v.category} value={v.category}>{v.category}</option>
                          ))}
                        </select>
                      </div>
                      <Progress 
                        value={(goal.current_value / goal.target_value) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-0 space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bebas tracking-wider text-primary">ACTIONABLE PLANS</h3>
              <p className="text-xs text-muted-foreground">Strategic initiatives by department</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visionItems.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || Target;

                return (
                  <Card key={item.id}>
                    <CardHeader className={`p-2 ${CATEGORY_COLORS[item.category] || 'bg-muted'}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{item.category}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2">
                      {item.actionable_plans && item.actionable_plans.length > 0 ? (
                        <ul className="space-y-1">
                          {item.actionable_plans.map((plan, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs">
                              <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                              <span>{plan}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No actionable plans defined
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Edit Vision Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingVision?.category} Vision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vision Statement</Label>
              <Textarea
                value={editingVision?.vision_statement || ""}
                onChange={(e) => setEditingVision(prev => 
                  prev ? { ...prev, vision_statement: e.target.value } : null
                )}
                placeholder="Enter vision statement..."
              />
            </div>
            <div>
              <Label>Actionable Plans (one per line)</Label>
              <Textarea
                value={editingVision?.actionable_plans?.join("\n") || ""}
                onChange={(e) => setEditingVision(prev => 
                  prev ? { ...prev, actionable_plans: e.target.value.split("\n").filter(p => p.trim()) } : null
                )}
                placeholder="Enter plans, one per line..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVision}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
