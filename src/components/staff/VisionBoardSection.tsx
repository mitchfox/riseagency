import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Target, 
  CheckSquare, 
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
  Sparkles,
  Save
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  Scouting: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", gradient: "from-blue-500/20 to-blue-600/5" },
  Recruitment: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", gradient: "from-emerald-500/20 to-emerald-600/5" },
  Networking: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", gradient: "from-purple-500/20 to-purple-600/5" },
  Marketing: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", gradient: "from-amber-500/20 to-amber-600/5" },
  Performance: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", gradient: "from-rose-500/20 to-rose-600/5" },
};

// Default goals from the image
const DEFAULT_GOALS: Record<string, Array<{ title: string; target: string; unit: string }>> = {
  Scouting: [
    { title: "New Scouts", target: "5", unit: "scouts p/m" },
    { title: "Reports Received", target: "10", unit: "reports p/m" },
  ],
  Recruitment: [
    { title: "New Players", target: "2", unit: "players p/m" },
    { title: "International Profiles", target: "30", unit: "profiles p/m" },
    { title: "Player Outreach", target: "7", unit: "outreach p/w" },
  ],
  Networking: [
    { title: "New Contacts of Interest", target: "10", unit: "contacts p/m" },
    { title: "Relations Maintained", target: "20", unit: "relations p/m" },
    { title: "Messages Outreach", target: "10", unit: "messages p/w" },
    { title: "LinkedIn Presence", target: "1", unit: "ongoing" },
  ],
  Marketing: [
    { title: "Daily Posts", target: "2", unit: "posts + story" },
    { title: "Non-Follower Engagement", target: "50", unit: "engagements p/w" },
    { title: "Cross Posting", target: "1", unit: "ongoing" },
    { title: "Engagement Monitoring", target: "1", unit: "ongoing" },
  ],
  Performance: [
    { title: "Client Satisfaction Rate", target: "100", unit: "%" },
    { title: "Clear Pipeline", target: "1", unit: "system" },
  ],
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
    <div className="space-y-8">
      {/* ===== SECTION 1: RISE BOARD VISION ===== */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bebas tracking-wider text-primary">RISE BOARD VISION</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Strategic direction for each department</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {Math.round(overallProgress)}% Overall
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visionItems.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || Target;
            const colors = CATEGORY_COLORS[item.category] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center gap-4 p-3 rounded-lg ${colors.bg} border ${colors.border}`}
              >
                <div className={`p-2 rounded-md ${colors.bg} ${colors.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold uppercase tracking-wide ${colors.text}`}>{item.category}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span className="text-foreground">{item.vision_statement}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="shrink-0"
                  onClick={() => {
                    setEditingVision(item);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ===== SECTION 2: GOALS ===== */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bebas tracking-wider">GOALS</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Quarterly targets by category</p>
              </div>
            </div>
            <Button onClick={() => setAddGoalDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visionItems.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Target;
              const colors = CATEGORY_COLORS[item.category] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", gradient: "from-muted/20" };
              const categoryGoals = getGoalsByCategory(item.category);
              const defaultGoals = DEFAULT_GOALS[item.category] || [];
              
              const categoryProgress = categoryGoals.length > 0 
                ? categoryGoals.reduce((acc, g) => acc + (g.current_value / g.target_value) * 100, 0) / categoryGoals.length
                : 0;
              
              return (
                <Card 
                  key={item.id} 
                  className={`bg-gradient-to-br ${colors.gradient} border ${colors.border} overflow-hidden`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${colors.bg} ${colors.text}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <CardTitle className={`text-base font-semibold uppercase tracking-wide ${colors.text}`}>
                          {item.category}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {categoryGoals.length} active
                      </Badge>
                    </div>
                    {categoryGoals.length > 0 && (
                      <Progress value={categoryProgress} className="h-1.5 mt-2" />
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {categoryGoals.length > 0 ? (
                      categoryGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between p-2 bg-background/50 rounded-md border border-border/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{goal.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress 
                                value={(goal.current_value / goal.target_value) * 100} 
                                className="h-1.5 flex-1" 
                              />
                              <span className="text-xs text-muted-foreground shrink-0">
                                {goal.current_value}/{goal.target_value} {goal.unit}
                              </span>
                            </div>
                          </div>
                          <Input
                            type="number"
                            value={goal.current_value}
                            onChange={(e) => handleUpdateGoalProgress(goal.id, parseFloat(e.target.value) || 0)}
                            className="h-7 w-16 text-xs ml-2"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-muted-foreground mb-3">Suggested goals from the board:</p>
                        <div className="space-y-1.5">
                          {defaultGoals.map((dg, idx) => (
                            <div key={idx} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">•</span>
                              <span>{dg.title}: {dg.target} {dg.unit}</span>
                            </div>
                          ))}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3 text-xs"
                          onClick={() => {
                            setNewGoal({ ...newGoal, category: item.category });
                            setAddGoalDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Goal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== SECTION 3: ACTIONABLE PLANS ===== */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-lg">
              <Lightbulb className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bebas tracking-wider">ACTIONABLE PLANS</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Concrete steps to achieve each vision</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visionItems.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Target;
              const colors = CATEGORY_COLORS[item.category] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
              
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className={`py-2 px-3 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${colors.text} flex items-center gap-2`}>
                        <Icon className="h-4 w-4" />
                        {item.category}
                      </CardTitle>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingVision(item);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {item.actionable_plans && item.actionable_plans.length > 0 ? (
                      <ul className="space-y-2">
                        {item.actionable_plans.map((plan, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <ArrowRight className={`h-4 w-4 mt-0.5 shrink-0 ${colors.text}`} />
                            <span>{plan}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No plans defined yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== SECTION 4: ACTIVE TASKS BY CATEGORY ===== */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-lg">
                <CheckSquare className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bebas tracking-wider">ACTIVE TASKS</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Tasks categorized by department</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visionItems.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || Target;
                const colors = CATEGORY_COLORS[item.category] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
                const categoryTasks = getTasksByCategory(item.category);
                
                if (categoryTasks.length === 0) return null;
                
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className={`py-2 px-3 ${colors.bg} border-b ${colors.border}`}>
                      <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${colors.text} flex items-center gap-2`}>
                        <Icon className="h-4 w-4" />
                        {item.category}
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {categoryTasks.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <ScrollArea className="h-32">
                        <div className="space-y-1.5">
                          {categoryTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted/30 rounded">
                              <CheckSquare className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Vision Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit {editingVision?.category} Vision
            </DialogTitle>
          </DialogHeader>
          {editingVision && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vision Statement</Label>
                <Textarea
                  value={editingVision.vision_statement}
                  onChange={(e) => setEditingVision({ ...editingVision, vision_statement: e.target.value })}
                  placeholder="What's the vision for this category?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Actionable Plans (one per line)</Label>
                <Textarea
                  value={editingVision.actionable_plans?.join('\n') || ''}
                  onChange={(e) => setEditingVision({ 
                    ...editingVision, 
                    actionable_plans: e.target.value.split('\n').filter(p => p.trim()) 
                  })}
                  placeholder="Enter each actionable plan on a new line..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateVision}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={addGoalDialogOpen} onOpenChange={setAddGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Goal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newGoal.category} 
                onValueChange={(v) => setNewGoal({ ...newGoal, category: v })}
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
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., New Scouts Recruited"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                  placeholder="scouts p/m"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddGoalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGoal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};