import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Bell, Clock, CheckCircle2, AlertTriangle, Loader2, GripVertical, Calendar, Users, Trash2 } from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string[];
  completed: boolean;
  priority: string;
  category: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deadline?: string | null;
}

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const DraggableTask = ({ task, onDelete }: { task: StaffTask; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 } : undefined;

  return (
    <div ref={setNodeRef} style={style} className="group flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors text-xs">
      <div {...listeners} {...attributes} className="cursor-grab mt-0.5 text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{task.title}</p>
        {task.description && <p className="text-muted-foreground truncate mt-0.5">{task.description}</p>}
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${priorityColors[task.priority] || ''}`}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{task.category}</Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => onDelete(task.id)}>
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
};

const StaffColumn = ({
  member,
  tasks,
  isCurrentUser,
  onRemind,
  onDelete,
}: {
  member: StaffMember;
  tasks: StaffTask[];
  isCurrentUser: boolean;
  onRemind: (userId: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: member.id });
  const completedCount = tasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(t => !t.completed && t.deadline && isPast(new Date(t.deadline))).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl border-2 transition-colors ${
        isCurrentUser ? 'border-[hsl(var(--gold))]' : 'border-border/50'
      } ${isOver ? 'bg-accent/20' : 'bg-card/30'}`}
    >
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isCurrentUser ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'bg-primary/10 text-primary'
            }`}>
              {(member.full_name || member.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold truncate max-w-[140px]">{member.full_name || member.email.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground">{tasks.length} tasks · {completionRate}% done</p>
            </div>
          </div>
          {!isCurrentUser && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemind(member.id)} title="Send reminder">
              <Bell className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            </Button>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-[hsl(var(--gold))] rounded-full transition-all" style={{ width: `${completionRate}%` }} />
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {overdueCount} overdue
          </div>
        )}
      </div>
      <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
        {tasks.filter(t => !t.completed).map(task => (
          <DraggableTask key={task.id} task={task} onDelete={onDelete} />
        ))}
        {tasks.filter(t => t.completed).length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
              {tasks.filter(t => t.completed).length} completed
            </summary>
            <div className="mt-1 space-y-1 opacity-50">
              {tasks.filter(t => t.completed).map(task => (
                <div key={task.id} className="text-[10px] p-1.5 rounded bg-muted/30 line-through truncate">{task.title}</div>
              ))}
            </div>
          </details>
        )}
        {tasks.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No tasks assigned</p>
        )}
      </div>
    </div>
  );
};

export const StaffAccountabilityOverview = ({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) => {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: profilesData }] = await Promise.all([
      supabase.from('staff_tasks').select('*').order('display_order'),
      supabase.from('profiles').select('id, email, full_name'),
    ]);

    // Filter to staff only by checking user_roles
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
    const staffUserIds = new Set((rolesData || []).filter(r => ['admin', 'staff', 'marketeer'].includes(r.role) || r.role).map(r => r.user_id));
    const staffProfiles = (profilesData || []).filter(p => staffUserIds.has(p.id));

    setTasks((tasksData || []) as StaffTask[]);
    setStaffMembers(staffProfiles);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newAssignee) return;
    setSaving(true);
    const { error } = await supabase.from('staff_tasks').insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      assigned_to: [newAssignee],
      priority: newPriority,
      category: newCategory.trim() || null,
    } as any);
    if (error) toast.error("Failed to add task");
    else {
      toast.success("Task added");
      setAddOpen(false);
      setNewTitle(""); setNewDescription(""); setNewAssignee(""); setNewPriority("medium"); setNewCategory(""); setNewDeadline("");
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('staff_tasks').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else { setTasks(prev => prev.filter(t => t.id !== id)); }
  };

  const handleRemind = async (staffUserId: string) => {
    // Create a notification for that staff member
    const { error } = await supabase.from('staff_notification_events').insert({
      event_type: 'task_reminder',
      title: 'Task Reminder',
      body: 'You have outstanding tasks that need attention.',
      event_data: { target_user_id: staffUserId },
    });
    if (error) toast.error("Failed to send reminder");
    else toast.success("Reminder sent");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const targetMemberId = over.id as string;

    // Check if dropping on a staff member column
    const targetMember = staffMembers.find(m => m.id === targetMemberId);
    if (!targetMember) return;

    // Update task assignment
    const { error } = await supabase.from('staff_tasks').update({ assigned_to: [targetMemberId] }).eq('id', taskId);
    if (error) toast.error("Failed to reassign");
    else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: [targetMemberId] } : t));
      toast.success(`Task reassigned to ${targetMember.full_name || targetMember.email.split('@')[0]}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Calculate overall stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Staff Accountability</h3>
          <Badge variant="outline" className="text-xs">{totalTasks} tasks · {completedTasks} done</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Task
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {staffMembers.slice(0, 4).map(member => {
          const memberTasks = tasks.filter(t => t.assigned_to?.includes(member.id));
          const memberCompleted = memberTasks.filter(t => t.completed).length;
          const rate = memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0;
          return (
            <div key={member.id} className={`rounded-lg border p-3 ${member.id === userId ? 'border-[hsl(var(--gold))]' : 'border-border/50'}`}>
              <p className="text-xs font-semibold truncate">{member.full_name || member.email.split('@')[0]}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bebas text-primary">{rate}%</span>
                <span className="text-[10px] text-muted-foreground">{memberCompleted}/{memberTasks.length}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban columns per staff member */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {staffMembers.map(member => (
            <StaffColumn
              key={member.id}
              member={member}
              tasks={tasks.filter(t => t.assigned_to?.includes(member.id))}
              isCurrentUser={member.id === userId}
              onRemind={handleRemind}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {null}
        </DragOverlay>
      </DndContext>

      {/* Unassigned tasks */}
      {tasks.filter(t => !t.assigned_to || t.assigned_to.length === 0).length > 0 && (
        <div className="rounded-lg border border-border/50 p-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--gold))]" />
            Unassigned Tasks
          </h4>
          <div className="space-y-1">
            {tasks.filter(t => !t.assigned_to || t.assigned_to.length === 0).map(task => (
              <div key={task.id} className="text-xs p-2 rounded bg-muted/30">{task.title}</div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Optional details" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To *</Label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staffMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name || m.email.split('@')[0]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Marketing, Recruitment" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !newTitle.trim() || !newAssignee}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
