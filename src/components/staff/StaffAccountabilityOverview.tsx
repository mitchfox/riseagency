import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Bell, Clock, CheckCircle2, AlertTriangle, Loader2, GripVertical, Calendar, Users, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
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
  deadline: string | null;
  is_recurring: boolean;
  recurrence_label: string | null;
  last_completed_at: string | null;
}

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

const CORE_STAFF_IDS = [
  'ba2a30f2-3f0e-4267-ab04-ce74ac751aa4', // Jolon
  'a68c3599-d780-4f03-9d4e-3c63a5b9ce63', // Mutsa
  'c0af9c15-400b-4c68-95a8-a0419565015a', // Kuda
  'd4f0e437-5193-4c6a-b8ee-24376496062d', // Martins
  '95b6eece-4a7c-4ef2-a61e-d89574b79aa3', // Anthony
];

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const TASK_CATEGORIES = ['Networking', 'Recruitment', 'Marketing', 'Content', 'Admin', 'Coaching', 'Analysis', 'Finance', 'Other'];

const DraggableTask = ({ task, onDelete, onToggleComplete }: {
  task: StaffTask;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 } : undefined;
  const isOverdue = task.deadline && !task.completed && isPast(new Date(task.deadline));

  return (
    <div ref={setNodeRef} style={style} className={`group flex items-start gap-1.5 p-2 rounded-lg border transition-colors text-xs ${
      isOverdue ? 'border-destructive/40 bg-destructive/5' : 'border-border/50 bg-card/50 hover:bg-card'
    }`}>
      <div {...listeners} {...attributes} className="cursor-grab mt-0.5 text-muted-foreground/40 hover:text-muted-foreground shrink-0">
        <GripVertical className="h-3 w-3" />
      </div>
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
        className="mt-0.5 shrink-0 h-3.5 w-3.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground leading-tight ${task.completed && !task.is_recurring ? 'line-through opacity-50' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-muted-foreground leading-tight mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${priorityColors[task.priority] || ''}`}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{task.category}</Badge>
          )}
          {task.is_recurring && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20">
              <RotateCcw className="h-2 w-2 mr-0.5" />
              {task.recurrence_label || 'Recurring'}
            </Badge>
          )}
          {task.deadline && (
            <span className={`text-[8px] flex items-center gap-0.5 ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
              <Clock className="h-2 w-2" />
              {format(new Date(task.deadline), 'dd MMM')}
            </span>
          )}
          {task.is_recurring && task.last_completed_at && (
            <span className="text-[8px] text-muted-foreground">
              Last: {formatDistanceToNow(new Date(task.last_completed_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => onDelete(task.id)}>
        <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
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
  onToggleComplete,
}: {
  member: StaffMember;
  tasks: StaffTask[];
  isCurrentUser: boolean;
  onRemind: (userId: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: member.id });
  const [showCompleted, setShowCompleted] = useState(false);

  const activeTasks = tasks.filter(t => !t.completed || t.is_recurring);
  const completedTasks = tasks.filter(t => t.completed && !t.is_recurring);
  const overdueTasks = activeTasks.filter(t => !t.completed && t.deadline && isPast(new Date(t.deadline)));
  const pendingTasks = activeTasks.filter(t => !t.completed && !(t.deadline && isPast(new Date(t.deadline))));
  const recurringDone = activeTasks.filter(t => t.completed && t.is_recurring);

  const totalActive = activeTasks.length;
  const doneCount = activeTasks.filter(t => t.completed).length + completedTasks.length;
  const completionRate = (totalActive + completedTasks.length) > 0 ? Math.round((doneCount / (totalActive + completedTasks.length)) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-xl border-2 transition-colors flex flex-col ${
        isCurrentUser ? 'border-[hsl(var(--gold))] shadow-[0_0_12px_rgba(212,175,55,0.15)]' : 'border-border/50'
      } ${isOver ? 'bg-accent/20' : 'bg-card/30'}`}
    >
      {/* Header */}
      <div className="p-2.5 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isCurrentUser ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'bg-primary/10 text-primary'
            }`}>
              {(member.full_name || member.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{member.full_name || member.email.split('@')[0]}</p>
              <p className="text-[9px] text-muted-foreground">{activeTasks.length} active · {completionRate}%</p>
            </div>
          </div>
          {!isCurrentUser && (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemind(member.id)} title="Send reminder">
              <Bell className="h-3 w-3 text-[hsl(var(--gold))]" />
            </Button>
          )}
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-[hsl(var(--gold))] rounded-full transition-all" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      {/* Task sections */}
      <div className="p-1.5 space-y-1 flex-1 overflow-y-auto max-h-[500px]">
        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-destructive uppercase tracking-wider px-1 py-0.5 flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Overdue ({overdueTasks.length})
            </p>
            <div className="space-y-0.5">
              {overdueTasks.map(task => (
                <DraggableTask key={task.id} task={task} onDelete={onDelete} onToggleComplete={onToggleComplete} />
              ))}
            </div>
          </div>
        )}

        {/* Active */}
        {pendingTasks.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 py-0.5">
              Active ({pendingTasks.length})
            </p>
            <div className="space-y-0.5">
              {pendingTasks.map(task => (
                <DraggableTask key={task.id} task={task} onDelete={onDelete} onToggleComplete={onToggleComplete} />
              ))}
            </div>
          </div>
        )}

        {/* Recurring done today */}
        {recurringDone.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider px-1 py-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Done Today ({recurringDone.length})
            </p>
            <div className="space-y-0.5 opacity-60">
              {recurringDone.map(task => (
                <DraggableTask key={task.id} task={task} onDelete={onDelete} onToggleComplete={onToggleComplete} />
              ))}
            </div>
          </div>
        )}

        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center py-3">No tasks assigned</p>
        )}

        {/* Completed one-off */}
        {completedTasks.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground w-full px-1 py-0.5"
          >
            {showCompleted ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            {completedTasks.length} completed
          </button>
        )}
        {showCompleted && completedTasks.map(task => (
          <div key={task.id} className="text-[9px] p-1 rounded bg-muted/30 line-through truncate opacity-40 mx-1">{task.title}</div>
        ))}
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
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceLabel, setNewRecurrenceLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: profilesData }] = await Promise.all([
      supabase.from('staff_tasks').select('*').order('display_order'),
      supabase.from('profiles').select('id, email, full_name'),
    ]);

    // Filter to the 5 core staff members
    const coreProfiles = (profilesData || []).filter(p => CORE_STAFF_IDS.includes(p.id));
    // Sort in the defined order
    coreProfiles.sort((a, b) => CORE_STAFF_IDS.indexOf(a.id) - CORE_STAFF_IDS.indexOf(b.id));

    setTasks((tasksData || []) as StaffTask[]);
    setStaffMembers(coreProfiles);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newTitle.trim() || newAssignees.length === 0) return;
    setSaving(true);

    // Create a task for each assignee
    const inserts = newAssignees.map(assigneeId => ({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      assigned_to: [assigneeId],
      priority: newPriority,
      category: newCategory || null,
      deadline: newDeadline || null,
      is_recurring: newRecurring,
      recurrence_label: newRecurring ? (newRecurrenceLabel.trim() || 'Daily') : null,
    }));

    const { error } = await supabase.from('staff_tasks').insert(inserts as any);
    if (error) toast.error("Failed to add task");
    else {
      toast.success(`Task added for ${newAssignees.length} staff member(s)`);
      setAddOpen(false);
      setNewTitle(""); setNewDescription(""); setNewAssignees([]); setNewPriority("medium"); 
      setNewCategory(""); setNewDeadline(""); setNewRecurring(false); setNewRecurrenceLabel("");
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('staff_tasks').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else { setTasks(prev => prev.filter(t => t.id !== id)); }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updates: any = { completed };
    if (task.is_recurring && completed) {
      updates.last_completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('staff_tasks').update(updates).eq('id', id);
    if (error) toast.error("Failed to update");
    else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  };

  const handleRemind = async (staffUserId: string) => {
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
    const targetMember = staffMembers.find(m => m.id === targetMemberId);
    if (!targetMember) return;

    const { error } = await supabase.from('staff_tasks').update({ assigned_to: [targetMemberId] }).eq('id', taskId);
    if (error) toast.error("Failed to reassign");
    else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: [targetMemberId] } : t));
      toast.success(`Reassigned to ${targetMember.full_name || targetMember.email.split('@')[0]}`);
    }
  };

  const toggleAssignee = (id: string) => {
    setNewAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overdueTasks = tasks.filter(t => !t.completed && t.deadline && isPast(new Date(t.deadline)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Staff Accountability</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]">{totalTasks} tasks</Badge>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">{completedTasks} done</Badge>
            {overdueTasks.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">{overdueTasks.length} overdue</Badge>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Task
          </Button>
        )}
      </div>

      {/* 5-column grid - all visible at once */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-2">
          {staffMembers.map(member => (
            <StaffColumn
              key={member.id}
              member={member}
              tasks={tasks.filter(t => t.assigned_to?.includes(member.id))}
              isCurrentUser={member.id === userId}
              onRemind={handleRemind}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
        <DragOverlay>{null}</DragOverlay>
      </DndContext>

      {/* Unassigned tasks */}
      {tasks.filter(t => !t.assigned_to || t.assigned_to.length === 0 || !t.assigned_to.some(id => CORE_STAFF_IDS.includes(id))).length > 0 && (
        <div className="rounded-lg border border-border/50 p-3">
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-[hsl(var(--gold))]" />
            Unassigned Tasks
          </h4>
          <div className="space-y-1">
            {tasks.filter(t => !t.assigned_to || t.assigned_to.length === 0 || !t.assigned_to.some(id => CORE_STAFF_IDS.includes(id))).map(task => (
              <div key={task.id} className="text-xs p-2 rounded bg-muted/30 flex items-center justify-between">
                <span>{task.title}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done?" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Add context, instructions, links..." rows={3} />
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
              <div>
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mt-5">
                  <Switch checked={newRecurring} onCheckedChange={setNewRecurring} />
                  <Label className="mb-0">Recurring task</Label>
                </div>
                {newRecurring && (
                  <Input value={newRecurrenceLabel} onChange={e => setNewRecurrenceLabel(e.target.value)} placeholder="e.g. Daily, Weekly, Every Monday" className="h-8 text-xs" />
                )}
              </div>
            </div>

            {/* Assign to */}
            <div>
              <Label>Assign To *</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {staffMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      newAssignees.includes(m.id)
                        ? 'bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))]'
                        : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m.full_name || m.email.split('@')[0]}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (newAssignees.length === staffMembers.length) setNewAssignees([]);
                    else setNewAssignees(staffMembers.map(m => m.id));
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-border/50 text-muted-foreground hover:text-foreground"
                >
                  {newAssignees.length === staffMembers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !newTitle.trim() || newAssignees.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Add Task{newAssignees.length > 1 ? ` (${newAssignees.length} people)` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
