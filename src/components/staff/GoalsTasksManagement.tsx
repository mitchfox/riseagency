import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Target, CheckSquare, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  color: string;
  quarter: string;
  year: number;
  display_order: number;
  assigned_to: string[];
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
  category: string | null;
  display_order: number;
  assigned_to: string[];
}

interface StaffMember {
  user_id: string;
  email: string;
  full_name: string | null;
}

export const GoalsTasksManagement = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const [goalForm, setGoalForm] = useState({
    title: "",
    target_value: "",
    current_value: "",
    unit: "",
    color: "primary",
    quarter: `Q${Math.floor((new Date().getMonth() / 3) + 1)}`,
    year: new Date().getFullYear().toString(),
    assigned_to: [] as string[],
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);

  useEffect(() => {
    fetchGoals();
    fetchTasks();
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      // Get all users with staff or admin roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["staff", "admin"]);

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map(r => r.user_id);
        
        // Get profiles for these users
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        if (profileError) throw profileError;

        const members: StaffMember[] = (profileData || []).map(p => ({
          user_id: p.id,
          email: p.email || "",
          full_name: p.full_name,
        }));

        setStaffMembers(members);
      }
    } catch (error: any) {
      console.error("Error fetching staff members:", error);
    }
  };

  const getStaffName = (userId: string) => {
    const member = staffMembers.find(m => m.user_id === userId);
    return member ? (member.full_name || member.email) : "Unknown";
  };

  const getStaffNames = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return null;
    return userIds.map(id => getStaffName(id)).join(", ");
  };

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_goals")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setGoals((data || []).map(g => ({
        ...g,
        assigned_to: g.assigned_to || []
      })));
    } catch (error: any) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_tasks")
        .select("*")
        .order("completed", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTasks((data || []).map(t => ({
        ...t,
        assigned_to: t.assigned_to || []
      })));
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    }
  };

  const handleSaveGoal = async () => {
    if (!goalForm.title || !goalForm.target_value || !goalForm.unit) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const goalData = {
        title: goalForm.title,
        target_value: parseFloat(goalForm.target_value),
        current_value: parseFloat(goalForm.current_value || "0"),
        unit: goalForm.unit,
        color: goalForm.color,
        quarter: goalForm.quarter,
        year: parseInt(goalForm.year),
        display_order: goals.length,
        assigned_to: goalForm.assigned_to,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("staff_goals")
          .update(goalData)
          .eq("id", editingGoal.id);

        if (error) throw error;
        toast.success("Goal updated!");
      } else {
        const { error } = await supabase
          .from("staff_goals")
          .insert(goalData);

        if (error) throw error;
        toast.success("Goal added!");
      }

      setGoalForm({
        title: "",
        target_value: "",
        current_value: "",
        unit: "",
        color: "primary",
        quarter: `Q${Math.floor((new Date().getMonth() / 3) + 1)}`,
        year: new Date().getFullYear().toString(),
        assigned_to: [],
      });
      setEditingGoal(null);
      setIsAddingGoal(false);
      fetchGoals();
    } catch (error: any) {
      console.error("Error saving goal:", error);
      toast.error(error.message || "Failed to save goal");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const { error } = await supabase
        .from("staff_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Goal deleted!");
      fetchGoals();
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("staff_tasks")
        .insert({
          title: newTaskTitle,
          display_order: tasks.length,
          assigned_to: newTaskAssignees,
        });

      if (error) throw error;
      setNewTaskTitle("");
      setNewTaskAssignees([]);
      toast.success("Task added!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("staff_tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id);

      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      console.error("Error toggling task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleUpdateTaskAssignees = async (taskId: string, assignees: string[]) => {
    try {
      const { error } = await supabase
        .from("staff_tasks")
        .update({ assigned_to: assignees })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task assignees updated!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating task assignees:", error);
      toast.error("Failed to update assignees");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase
        .from("staff_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Task deleted!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const toggleAssignee = (currentAssignees: string[], userId: string) => {
    if (currentAssignees.includes(userId)) {
      return currentAssignees.filter(id => id !== userId);
    } else {
      return [...currentAssignees, userId];
    }
  };

  const MultiAssigneeSelector = ({ 
    selected, 
    onChange,
    className = ""
  }: { 
    selected: string[], 
    onChange: (assignees: string[]) => void,
    className?: string
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-start ${className}`}>
          <User className="h-4 w-4 mr-2" />
          {selected.length === 0 
            ? "Assign to..." 
            : selected.length === 1 
              ? getStaffName(selected[0])
              : `${selected.length} assigned`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {staffMembers.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => onChange(toggleAssignee(selected, member.user_id))}
            >
              <Checkbox checked={selected.includes(member.user_id)} />
              <span className="text-sm">{member.full_name || member.email}</span>
            </div>
          ))}
          {staffMembers.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">No staff members found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <Tabs defaultValue="goals" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="goals">
          <Target className="h-4 w-4 mr-2" />
          Quarter Goals
        </TabsTrigger>
        <TabsTrigger value="tasks">
          <CheckSquare className="h-4 w-4 mr-2" />
          To Do List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="goals" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Manage Quarter Goals</h3>
          <Button onClick={() => setIsAddingGoal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>

        {(isAddingGoal || editingGoal) && (
          <Card>
            <CardHeader>
              <CardTitle>{editingGoal ? "Edit Goal" : "Add New Goal"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal Title *</Label>
                  <Input
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    placeholder="e.g., Player Signings"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Input
                    value={goalForm.unit}
                    onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                    placeholder="e.g., players, €, partnerships"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Value *</Label>
                  <Input
                    type="number"
                    value={goalForm.current_value}
                    onChange={(e) => setGoalForm({ ...goalForm, current_value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    value={goalForm.target_value}
                    onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={goalForm.quarter} onValueChange={(value) => setGoalForm({ ...goalForm, quarter: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={goalForm.year}
                    onChange={(e) => setGoalForm({ ...goalForm, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={goalForm.color} onValueChange={(value) => setGoalForm({ ...goalForm, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Blue (Primary)</SelectItem>
                      <SelectItem value="amber">Gold (Amber)</SelectItem>
                      <SelectItem value="emerald">Green (Emerald)</SelectItem>
                      <SelectItem value="rose">Red (Rose)</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <MultiAssigneeSelector
                    selected={goalForm.assigned_to}
                    onChange={(assignees) => setGoalForm({ ...goalForm, assigned_to: assignees })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingGoal(false);
                    setEditingGoal(null);
                    setGoalForm({
                      title: "",
                      target_value: "",
                      current_value: "",
                      unit: "",
                      color: "primary",
                      quarter: `Q${Math.floor((new Date().getMonth() / 3) + 1)}`,
                      year: new Date().getFullYear().toString(),
                      assigned_to: [],
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveGoal}>
                  {editingGoal ? "Update" : "Add"} Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold">{goal.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {goal.quarter} {goal.year}
                        </span>
                        {goal.assigned_to && goal.assigned_to.length > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {goal.assigned_to.length === 1 
                              ? getStaffName(goal.assigned_to[0])
                              : `${goal.assigned_to.length} assigned`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </span>
                        <span className="text-sm font-bold">
                          {Math.round((goal.current_value / goal.target_value) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingGoal(goal);
                          setGoalForm({
                            title: goal.title,
                            target_value: goal.target_value.toString(),
                            current_value: goal.current_value.toString(),
                            unit: goal.unit,
                            color: goal.color,
                            quarter: goal.quarter,
                            year: goal.year.toString(),
                            assigned_to: goal.assigned_to || [],
                          });
                          setIsAddingGoal(false);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {goals.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No goals set yet. Click "Add Goal" to create your first quarterly goal.
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="tasks" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
            className="flex-1"
          />
          <MultiAssigneeSelector
            selected={newTaskAssignees}
            onChange={setNewTaskAssignees}
            className="w-full sm:w-auto"
          />
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`block ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </span>
                      {task.assigned_to && task.assigned_to.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {getStaffNames(task.assigned_to)}
                        </span>
                      )}
                    </div>
                    <MultiAssigneeSelector
                      selected={task.assigned_to || []}
                      onChange={(assignees) => handleUpdateTaskAssignees(task.id, assignees)}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks yet. Add your first task above.
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};
