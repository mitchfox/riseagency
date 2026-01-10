import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Lightbulb,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Scouting: Search,
  Recruitment: Users,
  Networking: Network,
  Marketing: Megaphone,
  Performance: BarChart3,
};

const CATEGORY_COLORS: Record<string, string> = {
  Scouting: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  Recruitment: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  Networking: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  Marketing: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  Performance: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Scouting: "bg-blue-500/20 text-blue-400",
  Recruitment: "bg-emerald-500/20 text-emerald-400",
  Networking: "bg-purple-500/20 text-purple-400",
  Marketing: "bg-amber-500/20 text-amber-400",
  Performance: "bg-rose-500/20 text-rose-400",
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

export const VisionBoardSection = () => {
  const [visionItems, setVisionItems] = useState<VisionItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [editingVision, setEditingVision] = useState<VisionItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newGoal, setNewGoal] = useState({
    title: "",
    target_value: "",
    current_value: "0",
    unit: "",
    category: "",
  });

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

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target_value || !newGoal.unit || !newGoal.category) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const { error } = await supabase.from("staff_goals").insert({
        title: newGoal.title,
        target_value: parseFloat(newGoal.target_value),
        current_value: parseFloat(newGoal.current_value || "0"),
        unit: newGoal.unit,
        color: "primary",
        quarter: `Q${Math.floor((new Date().getMonth() / 3) + 1)}`,
        year: new Date().getFullYear(),
        category: newGoal.category,
        display_order: goals.length,
      });

      if (error) throw error;
      toast.success("Goal added!");
      setAddGoalDialogOpen(false);
      setNewGoal({ title: "", target_value: "", current_value: "0", unit: "", category: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Failed to add goal");
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from("staff_goals")
        .update({ current_value: newValue })
        .eq("id", goalId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate overall progress
  const totalGoals = goals.length;
  const overallProgress = totalGoals > 0 
    ? goals.reduce((acc, g) => acc + (g.current_value / g.target_value) * 100, 0) / totalGoals
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with overall stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bebas tracking-wider flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            RISE VISION BOARD
          </h2>
          <p className="text-muted-foreground">Strategic direction and quarterly goals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
            <div className="text-xs text-muted-foreground">Overall Progress</div>
          </div>
          <Button onClick={() => setAddGoalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>

      {/* Vision Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {visionItems.map((item) => {
          const Icon = CATEGORY_ICONS[item.category] || Target;
          const categoryGoals = getGoalsByCategory(item.category);
          const categoryProgress = categoryGoals.length > 0 
            ? categoryGoals.reduce((acc, g) => acc + (g.current_value / g.target_value) * 100, 0) / categoryGoals.length
            : 0;

          return (
            <Card 
              key={item.id} 
              className={`bg-gradient-to-br ${CATEGORY_COLORS[item.category] || 'from-muted/20 to-muted/10'} border cursor-pointer hover:shadow-lg transition-all`}
              onClick={() => toggleCategory(item.category)}
            >
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg mb-2 ${CATEGORY_BADGE_COLORS[item.category] || 'bg-muted'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.category}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{item.vision_statement}</p>
                <Progress value={categoryProgress} className="h-1.5" />
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{categoryGoals.length} goals</span>
                  <span>{Math.round(categoryProgress)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Category Sections */}
      <div className="space-y-4">
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
              <Card className={`overflow-hidden border ${CATEGORY_COLORS[item.category]?.split(' ')[2] || 'border-border'}`}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className={`p-4 bg-gradient-to-r ${CATEGORY_COLORS[item.category] || 'from-muted/20 to-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${CATEGORY_BADGE_COLORS[item.category] || 'bg-muted'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-lg font-semibold">{item.category}</CardTitle>
                          <p className="text-sm text-muted-foreground">{item.vision_statement}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {categoryGoals.length} goals
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {categoryTasks.length} tasks
                        </Badge>
                        {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-4 space-y-4">
                    {/* Goals Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Goals
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(item.category);
                            setNewGoal({ ...newGoal, category: item.category });
                            setAddGoalDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {categoryGoals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                          No goals set for {item.category} yet
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryGoals.map((goal) => (
                            <Card key={goal.id} className="bg-muted/20">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium">{goal.title}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {goal.quarter} {goal.year}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Input
                                    type="number"
                                    value={goal.current_value}
                                    onChange={(e) => handleUpdateGoalProgress(goal.id, parseFloat(e.target.value) || 0)}
                                    className="h-7 w-16 text-xs"
                                  />
                                  <span className="text-xs text-muted-foreground">/ {goal.target_value} {goal.unit}</span>
                                </div>
                                <Progress 
                                  value={(goal.current_value / goal.target_value) * 100} 
                                  className="h-2" 
                                />
                                <div className="text-right text-xs text-muted-foreground mt-1">
                                  {Math.round((goal.current_value / goal.target_value) * 100)}% complete
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actionable Plans */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Actionable Plans
                        </h4>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingVision(item);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      {item.actionable_plans && item.actionable_plans.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.actionable_plans.map((plan, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs py-1">
                              <ArrowRight className="h-3 w-3 mr-1 text-primary" />
                              {plan}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No actionable plans defined yet</p>
                      )}
                    </div>

                    {/* Active Tasks */}
                    {categoryTasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                          <CheckSquare className="h-4 w-4 text-emerald-500" />
                          Active Tasks ({categoryTasks.length})
                        </h4>
                        <div className="space-y-1">
                          {categoryTasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded">
                              <CheckSquare className="h-4 w-4 text-muted-foreground" />
                              <span>{task.title}</span>
                            </div>
                          ))}
                          {categoryTasks.length > 5 && (
                            <p className="text-xs text-muted-foreground pl-6">
                              +{categoryTasks.length - 5} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

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

      {/* Add Goal Dialog */}
      <Dialog open={addGoalDialogOpen} onOpenChange={setAddGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={newGoal.category} 
                onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {visionItems.map((item) => (
                    <SelectItem key={item.category} value={item.category}>
                      {item.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal Title</Label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., 5+ New Scouts p/m"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Current</Label>
                <Input
                  type="number"
                  value={newGoal.current_value}
                  onChange={(e) => setNewGoal({ ...newGoal, current_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Target</Label>
                <Input
                  type="number"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                  placeholder="scouts"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddGoalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGoal}>
                Add Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
