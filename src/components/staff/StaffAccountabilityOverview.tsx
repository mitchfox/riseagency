import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Bell, Clock, CheckCircle2, AlertTriangle, Loader2, Calendar, Trash2, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pencil, Image, X, Check, ExternalLink } from "lucide-react";
import { format, isPast, isToday, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { createPortal } from "react-dom";

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
  image_url: string | null;
  completion_log: string[] | null;
}

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

const CORE_STAFF_IDS = [
  'ba2a30f2-3f0e-4267-ab04-ce74ac751aa4',
  'a68c3599-d780-4f03-9d4e-3c63a5b9ce63',
  'c0af9c15-400b-4c68-95a8-a0419565015a',
  'd4f0e437-5193-4c6a-b8ee-24376496062d',
  '95b6eece-4a7c-4ef2-a61e-d89574b79aa3',
];

const priorityColors: Record<string, string> = {
  high: "border-destructive/50 bg-destructive/10",
  medium: "border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5",
  low: "border-emerald-500/40 bg-emerald-500/5",
};

const priorityBadgeColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const TASK_CATEGORIES = ['Networking', 'Recruitment', 'Marketing', 'Content', 'Admin', 'Coaching', 'Analysis', 'Finance', 'Other'];

function countCompletions(log: string[] | null, since: Date): number {
  if (!log || log.length === 0) return 0;
  return log.filter(ts => new Date(ts) >= since).length;
}

interface ScheduleTaskItem {
  id: string;
  post_type: string;
  day_of_week: string;
  scheduled_time: string | null;
  owner_id: string | null;
  status: string | null;
  platform_format: string | null;
}

export const StaffAccountabilityOverview = ({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) => {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleTaskItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStaffIndex, setActiveStaffIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceLabel, setNewRecurrenceLabel] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: profilesData }, { data: scheduleData }] = await Promise.all([
      supabase.from('staff_tasks').select('*').order('display_order'),
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('marketing_schedule_items').select('id, post_type, day_of_week, scheduled_time, owner_id, status, platform_format'),
    ]);

    const coreProfiles = (profilesData || []).filter(p => CORE_STAFF_IDS.includes(p.id));
    coreProfiles.sort((a, b) => CORE_STAFF_IDS.indexOf(a.id) - CORE_STAFF_IDS.indexOf(b.id));

    setTasks((tasksData || []) as StaffTask[]);
    setScheduleItems((scheduleData || []) as ScheduleTaskItem[]);
    setStaffMembers(coreProfiles);

    // Auto-select logged-in user
    if (userId) {
      const idx = coreProfiles.findIndex(p => p.id === userId);
      if (idx >= 0) setActiveStaffIndex(idx);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeMember = staffMembers[activeStaffIndex];
  const memberTasks = activeMember ? tasks.filter(t => t.assigned_to?.includes(activeMember.id)) : [];
  const memberScheduleItems = activeMember ? scheduleItems.filter(s => s.owner_id === activeMember.id) : [];
  const activeTasks = memberTasks.filter(t => !t.completed || t.is_recurring);
  const completedTasks = memberTasks.filter(t => t.completed && !t.is_recurring);
  const overdueTasks = activeTasks.filter(t => !t.completed && t.deadline && isPast(new Date(t.deadline)));
  const pendingTasks = activeTasks.filter(t => !t.completed && !(t.deadline && isPast(new Date(t.deadline))));
  const recurringDone = activeTasks.filter(t => t.completed && t.is_recurring);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  // Count completions across all tasks for this member
  const weekCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, weekStart), 0);
  const monthCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, monthStart), 0);
  const yearCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, yearStart), 0);

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updates: any = { completed };
    if (completed) {
      updates.last_completed_at = new Date().toISOString();
      // Append to completion_log
      const currentLog = (task.completion_log || []) as string[];
      updates.completion_log = [...currentLog, new Date().toISOString()];
    }
    if (task.is_recurring && completed) {
      updates.last_completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('staff_tasks').update(updates).eq('id', id);
    if (error) toast.error("Failed to update");
    else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  };

  const handleLogCompletion = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const currentLog = (task.completion_log || []) as string[];
    const updates = {
      completion_log: [...currentLog, new Date().toISOString()],
      last_completed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('staff_tasks').update(updates).eq('id', id);
    if (error) toast.error("Failed to log");
    else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success("Task logged as done");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('staff_tasks').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else { setTasks(prev => prev.filter(t => t.id !== id)); }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || newAssignees.length === 0) return;
    setSaving(true);
    const inserts = newAssignees.map(assigneeId => ({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      assigned_to: [assigneeId],
      priority: newPriority,
      category: newCategory || null,
      deadline: newDeadline || null,
      is_recurring: newRecurring,
      recurrence_label: newRecurring ? (newRecurrenceLabel.trim() || 'Daily') : null,
      image_url: newImageUrl || null,
    }));

    const { error } = await supabase.from('staff_tasks').insert(inserts as any);
    if (error) toast.error("Failed to add task");
    else {
      toast.success(`Task added for ${newAssignees.length} staff member(s)`);
      setAddOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    setSaving(true);
    const { error } = await supabase.from('staff_tasks').update({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      priority: newPriority,
      category: newCategory || null,
      deadline: newDeadline || null,
      is_recurring: newRecurring,
      recurrence_label: newRecurring ? (newRecurrenceLabel.trim() || 'Daily') : null,
      image_url: newImageUrl || null,
    }).eq('id', editingTask.id);
    if (error) toast.error("Failed to update task");
    else {
      toast.success("Task updated");
      setEditingTask(null);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const openEditTask = (task: StaffTask) => {
    setNewTitle(task.title);
    setNewDescription(task.description || "");
    setNewPriority(task.priority);
    setNewCategory(task.category || "");
    setNewDeadline(task.deadline || "");
    setNewRecurring(task.is_recurring);
    setNewRecurrenceLabel(task.recurrence_label || "");
    setNewImageUrl((task as any).image_url || "");
    setEditingTask(task);
  };

  const resetForm = () => {
    setNewTitle(""); setNewDescription(""); setNewAssignees([]); setNewPriority("medium");
    setNewCategory(""); setNewDeadline(""); setNewRecurring(false); setNewRecurrenceLabel(""); setNewImageUrl("");
  };

  const toggleAssignee = (id: string) => {
    setNewAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const TaskCard = ({ task }: { task: StaffTask }) => {
    const isOverdue = task.deadline && !task.completed && isPast(new Date(task.deadline));
    const taskWeekCount = countCompletions(task.completion_log, weekStart);

    return (
      <div className={`group rounded-xl border-2 p-4 transition-all ${
        isOverdue ? 'border-destructive/50 bg-destructive/5' : priorityColors[task.priority] || 'border-border/50 bg-card/30'
      }`}>
        {(task as any).image_url && (
          <div className="mb-3 rounded-lg overflow-hidden h-32 bg-muted">
            <img src={(task as any).image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => handleToggleComplete(task.id, !!checked)}
            className="mt-1 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${task.completed && !task.is_recurring ? 'line-through opacity-50' : ''}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityBadgeColors[task.priority] || ''}`}>
                {task.priority}
              </Badge>
              {task.category && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{task.category}</Badge>
              )}
              {task.is_recurring && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                  {task.recurrence_label || 'Recurring'}
                </Badge>
              )}
              {task.deadline && (
                <span className={`text-[9px] flex items-center gap-0.5 ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  <Clock className="h-2.5 w-2.5" />
                  {format(new Date(task.deadline), 'dd MMM')}
                </span>
              )}
              {taskWeekCount > 0 && (
                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {taskWeekCount} this week
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTask(task)} title="Edit">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleLogCompletion(task.id)} title="Log done">
              <Check className="h-3 w-3 text-emerald-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(task.id)} title="Delete">
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const mainContent = (
    <div className={`space-y-4 ${fullscreen ? 'p-6' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold ${fullscreen ? 'text-2xl' : 'text-lg'}`}>My Tasks</h3>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Task
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Staff slider */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeStaffIndex === 0}
          onClick={() => setActiveStaffIndex(prev => Math.max(0, prev - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex gap-2 overflow-x-auto py-1 scrollbar-hide">
          {staffMembers.map((m, i) => {
            const isActive = i === activeStaffIndex;
            const isCurrent = m.id === userId;
            const memberTaskCount = tasks.filter(t => t.assigned_to?.includes(m.id) && !t.completed).length;
            return (
              <button
                key={m.id}
                onClick={() => setActiveStaffIndex(i)}
                className={`shrink-0 px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                  isActive
                    ? isCurrent
                      ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]'
                      : 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 bg-card/30 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {(m.full_name || m.email.split('@')[0]).split(' ')[0]}
                {memberTaskCount > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">{memberTaskCount}</span>
                )}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeStaffIndex >= staffMembers.length - 1}
          onClick={() => setActiveStaffIndex(prev => Math.min(staffMembers.length - 1, prev + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {activeMember && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card/50 p-3 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--gold))]">{weekCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Week</p>
            </div>
            <div className="rounded-xl border bg-card/50 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{monthCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Month</p>
            </div>
            <div className="rounded-xl border bg-card/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{yearCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Year</p>
            </div>
          </div>

          {/* Quick action buttons for recurring tasks */}
          {activeTasks.filter(t => t.is_recurring && !t.completed).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Log</p>
              <div className="flex flex-wrap gap-2">
                {activeTasks.filter(t => t.is_recurring && !t.completed).map(task => (
                  <Button
                    key={task.id}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => handleLogCompletion(task.id)}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {task.title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Overdue ({overdueTasks.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}

          {/* Active */}
          {pendingTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Active ({pendingTasks.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}

          {/* Recurring done */}
          {recurringDone.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Done Today ({recurringDone.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                {recurringDone.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          )}

          {/* Completed one-off */}
          {completedTasks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{completedTasks.length} completed</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 opacity-40">
                {completedTasks.slice(0, 6).map(task => (
                  <div key={task.id} className="text-xs p-2 rounded-lg bg-muted/30 line-through truncate">{task.title}</div>
                ))}
              </div>
            </div>
          )}

          {memberTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks assigned</p>
          )}

          {/* Remind button for other staff */}
          {activeMember.id !== userId && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleRemind(activeMember.id)}>
                <Bell className="h-3 w-3 text-[hsl(var(--gold))]" /> Send Reminder
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Task Dialog */}
      <Dialog open={addOpen || !!editingTask} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditingTask(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
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
              <div>
                <Label>Image URL</Label>
                <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." />
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

            {/* Assign to (only for new tasks) */}
            {!editingTask && (
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
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditingTask(null); resetForm(); }}>Cancel</Button>
              {editingTask ? (
                <Button onClick={handleSaveEdit} disabled={saving || !newTitle.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save Changes
                </Button>
              ) : (
                <Button onClick={handleAdd} disabled={saving || !newTitle.trim() || newAssignees.length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Add Task{newAssignees.length > 1 ? ` (${newAssignees.length} people)` : ''}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (fullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[9998] bg-background overflow-y-auto">
        {mainContent}
      </div>,
      document.body
    );
  }

  return mainContent;
};
