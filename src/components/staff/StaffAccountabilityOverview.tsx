import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Bell, Clock, CheckCircle2, AlertTriangle, Loader2, Calendar, Trash2, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pencil, Image, X, Check, ExternalLink, Trophy, ListTodo, LayoutGrid } from "lucide-react";
import { format, isPast, isToday, startOfWeek, startOfMonth, startOfYear, addDays, isSameDay } from "date-fns";
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

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function countCompletions(log: string[] | null, since: Date): number {
  if (!log || log.length === 0) return 0;
  const sinceMs = since.getTime();
  return log.filter(ts => {
    if (!ts) return false;
    // Normalise both ISO ("2026-04-23T21:31:34.822Z") and Postgres
    // ("2026-04-23 21:31:34.822+00") shapes so Safari parses reliably.
    const normalised = typeof ts === 'string' ? ts.replace(' ', 'T') : ts;
    const t = new Date(normalised).getTime();
    return Number.isFinite(t) && t >= sinceMs;
  }).length;
}

const hasCompletionSince = (log: string[] | null | undefined, since: Date): boolean => countCompletions(log || null, since) > 0;

const getCompletionCount = (log: string[] | null | undefined): number => log?.filter(Boolean).length ?? 0;

interface ScheduleTaskItem {
  id: string;
  post_type: string;
  day_of_week: string;
  scheduled_time: string | null;
  owner_id: string | null;
  status: string | null;
  platform_format: string | null;
  image_url: string | null;
  last_completed_at?: string | null;
  completion_log?: string[] | null;
  updated_at?: string | null;
}

type TaskFeedItem =
  | ({ kind: "task" } & StaffTask)
  | ({
      kind: "schedule";
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
      scheduleItem: ScheduleTaskItem;
      id: string;
    });

interface ActivityLogEntry {
  user_id: string;
  created_at: string;
  action: string;
}

export const StaffAccountabilityOverview = ({ isAdmin, userId }: { isAdmin: boolean; userId?: string }) => {
  const navigate = useNavigate();
  const navigateToStaffSection = (section: string, extras: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (key.startsWith('__lovable')) params.set(key, value);
    });
    params.set('section', section);
    Object.entries(extras).forEach(([key, value]) => params.set(key, value));
    navigate(`/staff?${params.toString()}`);
  };
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleTaskItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
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
  const [activeTab, setActiveTab] = useState<"tasks" | "schedule" | "leaderboard">("tasks");
  const [dragItem, setDragItem] = useState<{ id: string; kind: "task" | "schedule" } | null>(null);
  const [staffAvatars, setStaffAvatars] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("staff_avatars") || "{}"); } catch { return {}; }
  });
  const [staffAliases, setStaffAliases] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("staff_aliases") || "{}"); } catch { return {}; }
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);

  const historyEntries = useMemo(() => {
    if (!historyStaffId) return [] as Array<{ when: Date; type: string; label: string }>;
    const entries: Array<{ when: Date; type: string; label: string }> = [];

    tasks.filter(t => t.assigned_to?.includes(historyStaffId)).forEach(t => {
      (t.completion_log || []).forEach(ts => {
        entries.push({ when: new Date(ts), type: 'Task', label: t.title });
      });
    });

    scheduleItems.filter(s => s.owner_id === historyStaffId && (s.status || '').toLowerCase() === 'posted').forEach(s => {
      const ts = (s as any).updated_at;
      if (ts) entries.push({ when: new Date(ts), type: 'Schedule', label: s.post_type || 'Scheduled post' });
    });

    activityLog.filter(a => a.user_id === historyStaffId).forEach(a => {
      entries.push({ when: new Date(a.created_at), type: 'Activity', label: a.action || 'Action' });
    });

    return entries.sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 100);
  }, [historyStaffId, tasks, scheduleItems, activityLog]);

  const saveStaffAvatars = (avatars: Record<string, string>) => {
    setStaffAvatars(avatars);
    localStorage.setItem("staff_avatars", JSON.stringify(avatars));
  };
  const saveStaffAliases = (aliases: Record<string, string>) => {
    setStaffAliases(aliases);
    localStorage.setItem("staff_aliases", JSON.stringify(aliases));
  };

  const [fixtures, setFixtures] = useState<Array<{ id: string; home_team: string; away_team: string; match_date: string; match_time: string | null; competition: string | null; player_name?: string | null; player_club?: string | null }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const yearStart2 = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const todayIso = new Date().toISOString().slice(0, 10);
    const inSevenDaysIso = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const [{ data: tasksData }, { data: profilesData }, { data: scheduleData }, { data: activityData }, { data: fixturesData }, { data: representedPlayers }] = await Promise.all([
      supabase.from('staff_tasks').select('*').order('display_order'),
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('marketing_schedule_items').select('id, post_type, day_of_week, scheduled_time, owner_id, status, platform_format, image_url, updated_at, last_completed_at, completion_log'),
      supabase.from('staff_activity_log').select('user_id, created_at, action').gte('created_at', yearStart2),
      supabase.from('fixtures').select('id, home_team, away_team, match_date, match_time, competition, player_fixtures(player_id, players(name, club, representation_status))').gte('match_date', todayIso).lte('match_date', inSevenDaysIso).order('match_date'),
      // Only true 'represented' players surface in the My Tasks fixture list.
      // 'mandated' status (e.g. Loris Mettler) is intentionally excluded.
      supabase.from('players').select('name, club').eq('representation_status', 'represented'),
    ]);

    // Filter fixtures to only those involving a represented player's club
    // and tag them with player_name for display.
    // Strict normalisation: lowercase, strip punctuation, strip common club
    // suffixes/affixes, then compare token sets to avoid spurious substring
    // matches (e.g. an unrepresented player's club like "FC Mettler" should
    // not match a represented club just because of an overlapping token).
    const STOP_TOKENS = new Set([
      'fc', 'cf', 'afc', 'sc', 'sk', 'bsc', 'sv', 'fk', 'ac', 'as', 'cd',
      'cs', 'rfc', 'ud', 'club', 'football', 'futbol', 'futebol', 'calcio',
      'sport', 'sports', 'sporting', 'real', 'de', 'la', 'el', 'le', 'les',
      'u23', 'u21', 'u19', 'u18', 'ii', 'b', 'reserves',
    ]);
    const tokenise = (raw: string): string[] => {
      const cleaned = (raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,'’"`()/\\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) return [];
      return cleaned.split(' ').filter(t => t.length > 1 && !STOP_TOKENS.has(t));
    };
    const playersByKey = new Map<string, { name: string; club: string; tokens: Set<string> }>();
    (representedPlayers || []).forEach((p: any) => {
      if (!p.club) return;
      const tokens = new Set(tokenise(p.club));
      if (tokens.size === 0) return;
      const key = [...tokens].sort().join(' ');
      if (!playersByKey.has(key)) {
        playersByKey.set(key, { name: p.name, club: p.club, tokens });
      }
    });
    const matchClub = (team: string) => {
      const teamTokens = new Set(tokenise(team));
      if (teamTokens.size === 0) return null;
      const teamKey = [...teamTokens].sort().join(' ');
      // Exact normalised match
      const exact = playersByKey.get(teamKey);
      if (exact) return exact;
      // Subset match: every meaningful token of the smaller side appears in
      // the other. Requires at least 2 shared tokens to avoid single-word
      // collisions on common words.
      for (const info of playersByKey.values()) {
        const shared = [...teamTokens].filter(t => info.tokens.has(t));
        const minSize = Math.min(teamTokens.size, info.tokens.size);
        if (shared.length >= 2 && shared.length === minSize) return info;
        if (shared.length === 1 && minSize === 1 && teamTokens.size === info.tokens.size) {
          return info;
        }
      }
      return null;
    };
    const filteredFixtures = (fixturesData || [])
      .map((f: any) => {
        // Prefer authoritative player_fixtures link — avoids club-name
        // collisions (e.g. multiple players with club "Without Club").
        const links: any[] = Array.isArray(f.player_fixtures) ? f.player_fixtures : [];
        const linkedRepresented = links
          .map(l => l.players)
          .filter((p: any) => p && p.representation_status === 'represented');
        if (linkedRepresented.length > 0) {
          const p = linkedRepresented[0];
          return { ...f, player_name: p.name, player_club: p.club || '' };
        }
        const home = matchClub(f.home_team);
        const away = matchClub(f.away_team);
        const player = home || away;
        return player ? { ...f, player_name: player.name, player_club: player.club } : null;
      })
      .filter(Boolean);

    // Only admins on My Tasks
    const adminIds = new Set(CORE_STAFF_IDS);
    const adminProfiles = (profilesData || []).filter(p => adminIds.has(p.id));
    adminProfiles.sort((a, b) => CORE_STAFF_IDS.indexOf(a.id) - CORE_STAFF_IDS.indexOf(b.id));

    setTasks((tasksData || []) as StaffTask[]);
    setScheduleItems((scheduleData || []) as ScheduleTaskItem[]);
    setStaffMembers(adminProfiles);
    setActivityLog((activityData || []) as ActivityLogEntry[]);
    setFixtures(filteredFixtures as any);

    if (userId) {
      const idx = adminProfiles.findIndex(p => p.id === userId);
      if (idx >= 0) setActiveStaffIndex(idx);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('my-tasks-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_tasks' }, (payload) => {
        const next = payload.new as StaffTask | null;
        const old = payload.old as Partial<StaffTask> | null;
        setTasks(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(t => t.id !== old?.id);
          if (!next) return prev;
          const exists = prev.some(t => t.id === next.id);
          return exists ? prev.map(t => t.id === next.id ? next : t) : [...prev, next];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_schedule_items' }, (payload) => {
        const next = payload.new as ScheduleTaskItem | null;
        const old = payload.old as Partial<ScheduleTaskItem> | null;
        setScheduleItems(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== old?.id);
          if (!next) return prev;
          const exists = prev.some(s => s.id === next.id);
          return exists ? prev.map(s => s.id === next.id ? next : s) : [...prev, next];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visibleStaff = staffMembers;
  const activeMember = visibleStaff[activeStaffIndex];
  const memberTasks = activeMember ? tasks.filter(t => t.assigned_to?.includes(activeMember.id)) : [];
  const memberScheduleItems = activeMember ? scheduleItems.filter(s => s.owner_id === activeMember.id) : [];

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  // Rolling one-month window: e.g. on 23 April this covers everything since 23 March.
  const rollingMonthAgo = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  })();

  const memberTaskFeed: TaskFeedItem[] = activeMember
    ? [
        ...memberTasks.map((task) => ({ ...task, kind: "task" as const })),
        ...memberScheduleItems.map((item) => ({
          kind: "schedule" as const,
          id: `schedule-${item.id}`,
          title: item.post_type,
          description: null,
          assigned_to: item.owner_id ? [item.owner_id] : [],
          completed: hasCompletionSince(item.completion_log, weekStart),
          priority: "medium",
          category: null,
          display_order: 0,
          created_at: "",
          updated_at: "",
          deadline: null,
          is_recurring: true,
          recurrence_label: "Weekly",
          last_completed_at: item.last_completed_at || null,
          image_url: item.image_url,
          completion_log: item.completion_log || null,
          scheduleItem: item,
        })),
      ]
    : [];

  const weekCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, weekStart), 0);
  const monthCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, monthStart), 0);
  const yearCount = memberTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, yearStart), 0);

  const handleDropOnStaff = async (targetStaffId: string) => {
    if (!dragItem || !isAdmin) return;
    const { id, kind } = dragItem;
    setDragItem(null);

    if (kind === "task") {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const newAssigned = [targetStaffId];
      const { error } = await supabase.from('staff_tasks').update({ assigned_to: newAssigned }).eq('id', id);
      if (error) toast.error("Failed to reassign");
      else {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, assigned_to: newAssigned } : t));
        toast.success("Task reassigned");
      }
    } else if (kind === "schedule") {
      const realId = id.replace("schedule-", "");
      const { error } = await supabase.from('marketing_schedule_items').update({ owner_id: targetStaffId }).eq('id', realId);
      if (error) toast.error("Failed to reassign");
      else {
        setScheduleItems(prev => prev.map(s => s.id === realId ? { ...s, owner_id: targetStaffId } : s));
        toast.success("Schedule item reassigned");
      }
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updates: any = { completed };
    if (completed) {
      updates.last_completed_at = new Date().toISOString();
      const currentLog = (task.completion_log || []) as string[];
      updates.completion_log = [...currentLog, new Date().toISOString()];
    }

    const { error } = await supabase.from('staff_tasks').update(updates).eq('id', id);
    if (error) toast.error("Failed to update");
    else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      if (completed) {
        const memberName = staffAliases[activeMember?.id || ''] || activeMember?.full_name || activeMember?.email?.split('@')[0] || 'Someone';
        const categoryStr = task.category ? ` (${task.category})` : '';
        supabase.from('staff_notification_events').insert({
          event_type: 'task_completed',
          title: `${memberName} completed a task`,
          body: `${memberName} marked "${task.title}"${categoryStr} as done`,
          event_data: { user_id: activeMember?.id, user_name: memberName, task_id: task.id, task_title: task.title, category: task.category },
        }).then(() => {});
      }
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
      const memberName = staffAliases[activeMember?.id || ''] || activeMember?.full_name || activeMember?.email?.split('@')[0] || 'Someone';
      const categoryStr = task.category ? ` (${task.category})` : '';
      supabase.from('staff_notification_events').insert({
        event_type: 'task_completed',
        title: `${memberName} completed a task`,
        body: `${memberName} logged "${task.title}"${categoryStr} as done`,
        event_data: { user_id: activeMember?.id, user_name: memberName, task_id: task.id, task_title: task.title, category: task.category },
      }).then(() => {});
    }
  };

  const handleMarkScheduleDone = async (scheduleId: string) => {
    const realId = scheduleId.replace("schedule-", "");
    const item = scheduleItems.find(s => s.id === realId);
    const nowIso = new Date().toISOString();
    const currentLog = item?.completion_log || [];
    const updates = { status: 'posted', last_completed_at: nowIso, completion_log: [...currentLog, nowIso] };
    const { error } = await supabase.from('marketing_schedule_items').update(updates).eq('id', realId);
    if (error) toast.error("Failed to mark as done");
    else {
      setScheduleItems(prev => prev.map(s => s.id === realId ? { ...s, ...updates } : s));
      toast.success("Marked as done");
      const memberName = staffAliases[activeMember?.id || ''] || activeMember?.full_name || activeMember?.email?.split('@')[0] || 'Someone';
      supabase.from('staff_notification_events').insert({
        event_type: 'schedule_item_completed',
        title: `${memberName} completed a schedule item`,
        body: `${memberName} posted "${item?.post_type || 'Post'}" (${item?.platform_format || 'social'})`,
        event_data: { user_id: activeMember?.id, user_name: memberName, schedule_item_id: realId, post_type: item?.post_type, platform_format: item?.platform_format },
      }).then(() => {});
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

  const handleAvatarUpload = async (staffId: string, file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `staff-avatars/${staffId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('marketing-gallery')
        .upload(fileName, file, { cacheControl: '31536000', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('marketing-gallery')
        .getPublicUrl(fileName);
      saveStaffAvatars({ ...staffAvatars, [staffId]: publicUrl });
      toast.success('Avatar uploaded');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  const getDisplayName = (m: StaffMember) => staffAliases[m.id] || (m.full_name || m.email.split('@')[0]).split(' ')[0];

  // Group tasks by day
  const getDayKey = (item: TaskFeedItem): string => {
    if (item.kind === "schedule") {
      return item.scheduleItem.day_of_week.toLowerCase();
    }
    if (item.deadline) {
      const d = new Date(item.deadline);
      return DAY_NAMES[d.getDay()];
    }
    return "anytime";
  };

  const todayDayName = DAY_NAMES[now.getDay()];

  const groupTasksByDay = (feed: TaskFeedItem[]) => {
    const groups: Record<string, TaskFeedItem[]> = { anytime: [] };
    const dayOrder: string[] = [];

    // Build day order starting from today
    for (let i = 0; i < 7; i++) {
      const dayIdx = (now.getDay() + i) % 7;
      const dayName = DAY_NAMES[dayIdx];
      dayOrder.push(dayName);
      groups[dayName] = [];
    }

    feed.forEach(item => {
      const key = getDayKey(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return { groups, dayOrder };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const StaffAvatar = ({ staffId, size = "sm" }: { staffId: string; size?: "sm" | "lg" }) => {
    const avatar = staffAvatars[staffId];
    const member = staffMembers.find(m => m.id === staffId);
    const initials = (member?.full_name || member?.email || "?").charAt(0).toUpperCase();
    const sizeClass = size === "lg" ? "h-10 w-10 text-sm" : "h-6 w-6 text-[9px]";

    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden bg-muted border border-border/50 flex items-center justify-center shrink-0`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-bold text-muted-foreground">{initials}</span>
        )}
        {isAdmin && (
          <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity">
            <span className="text-white text-[8px]">+</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(staffId, file);
              }}
            />
          </label>
        )}
      </div>
    );
  };

  const TaskCard = ({ task }: { task: TaskFeedItem }) => {
    const isScheduleTask = task.kind === "schedule";
    const isOverdue = !isScheduleTask && task.deadline && !task.completed && isPast(new Date(task.deadline));

    return (
      <div
        draggable={isAdmin}
        onDragStart={() => {
          setDragItem({ id: isScheduleTask ? task.id : task.id, kind: isScheduleTask ? "schedule" : "task" });
        }}
        className={`group rounded-xl border-2 p-3 transition-all ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isOverdue
          ? 'border-destructive/50 bg-destructive/5'
          : priorityColors[task.priority] || 'border-border/50 bg-card/30'
      }`}>
        {task.image_url && (
          <div className="mb-2 h-24 overflow-hidden rounded-lg bg-muted">
            <img src={task.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-xs ${task.completed && !task.is_recurring ? 'line-through opacity-50' : ''}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{task.description}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <Badge variant="outline" className={`text-[8px] px-1 py-0 ${priorityBadgeColors[task.priority] || ''}`}>
                {task.priority}
              </Badge>
              {task.is_recurring && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/10 text-primary border-primary/20">
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
              {isScheduleTask && task.scheduleItem.scheduled_time && (
                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2 w-2" /> {task.scheduleItem.scheduled_time}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-0.5">
            {/* Done button — always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
              onClick={() => {
                if (isScheduleTask) handleMarkScheduleDone(task.id);
                else if (task.is_recurring) handleLogCompletion(task.id);
                else handleToggleComplete(task.id, true);
              }}
              title="Mark done"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </Button>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {isScheduleTask ? (
                <Button variant="ghost" size="icon" className="h-5 w-5"
                  onClick={() => navigateToStaffSection('marketingschedule', { scheduleItem: task.scheduleItem.id })} title="Edit">
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditTask(task)} title="Edit">
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(task.id)} title="Delete">
                    <Trash2 className="h-2.5 w-2.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Leaderboard data: tasks + posted schedule items + activity log entries ──
  const leaderboardData = visibleStaff.map(m => {
    const mTasks = tasks.filter(t => t.assigned_to?.includes(m.id));
    const taskAll = mTasks.reduce((sum, t) => sum + (t.completion_log?.length || 0), 0);
    const taskFour = mTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, rollingMonthAgo), 0);
    const taskWeek = mTasks.reduce((sum, t) => sum + countCompletions(t.completion_log, weekStart), 0);

    const mSchedule = scheduleItems.filter(s => s.owner_id === m.id);
    const scheduleAll = mSchedule.reduce((sum, s) => sum + (s.completion_log?.length || 0), 0);
    const scheduleFour = mSchedule.reduce((sum, s) => sum + countCompletions(s.completion_log || null, rollingMonthAgo), 0);
    const scheduleWeek = mSchedule.reduce((sum, s) => sum + countCompletions(s.completion_log || null, weekStart), 0);

    const mActivity = activityLog.filter(a => a.user_id === m.id);
    const activityAll = mActivity.length;
    const activityFour = mActivity.filter(a => new Date(a.created_at) >= rollingMonthAgo).length;
    const activityWeek = mActivity.filter(a => new Date(a.created_at) >= weekStart).length;

    return {
      id: m.id,
      name: getDisplayName(m),
      allTime: taskAll + scheduleAll + activityAll,
      fourWeeks: taskFour + scheduleFour + activityFour,
      lastWeek: taskWeek + scheduleWeek + activityWeek,
    };
  }).sort((a, b) => b.lastWeek - a.lastWeek || b.fourWeeks - a.fourWeeks || b.allTime - a.allTime);

  // historyEntries computed above (must be before any early return)
  const historyStaff = visibleStaff.find(s => s.id === historyStaffId) || null;

  // ── Day-grouped active tasks ──
  const activeFeed = memberTaskFeed.filter(t => !t.completed || t.is_recurring);
  const { groups: dayGroups, dayOrder } = groupTasksByDay(activeFeed);

  const renderTasksTab = () => (
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

      {/* Quick Log for recurring */}
      {memberTasks.filter(t => t.is_recurring && !t.completed).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Log</p>
          <div className="flex flex-wrap gap-2">
            {memberTasks
              .filter(t => t.is_recurring && !t.completed)
              .sort((a, b) => getCompletionCount(b.completion_log) - getCompletionCount(a.completion_log) || a.title.localeCompare(b.title))
              .map(task => (
              <Button key={task.id} variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleLogCompletion(task.id)}>
                <CheckCircle2 className="h-3 w-3" /> {task.title}
                <span className="ml-1 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {getCompletionCount(task.completion_log)}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Day-by-day groups */}
      {/* Anytime first */}
      {dayGroups.anytime && dayGroups.anytime.length > 0 && (
        <DaySection label="Anytime" tasks={dayGroups.anytime} defaultOpen />
      )}

      {dayOrder.map((dayName, idx) => {
        const dayTasks = dayGroups[dayName] || [];
        if (dayTasks.length === 0) return null;
        const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const isToday2 = dayName === todayDayName;
        const defaultOpen = idx < 3; // Next 3 days open
        return (
          <DaySection
            key={dayName}
            label={isToday2 ? `${dayLabel} (Today)` : dayLabel}
            tasks={dayTasks}
            defaultOpen={defaultOpen}
            highlight={isToday2}
          />
        );
      })}

      {activeFeed.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No tasks assigned</p>
      )}

      {/* Remind button */}
      {activeMember && activeMember.id !== userId && (
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleRemind(activeMember.id)}>
            <Bell className="h-3 w-3 text-[hsl(var(--gold))]" /> Send Reminder
          </Button>
        </div>
      )}
    </>
  );

  const DaySection = ({ label, tasks: dayTasks, defaultOpen = true, highlight = false }: {
    label: string; tasks: TaskFeedItem[]; defaultOpen?: boolean; highlight?: boolean;
  }) => {
    const isCollapsed = collapsedDays.has(label);
    const isOpen = defaultOpen ? !isCollapsed : isCollapsed; // Toggle logic relative to default

    return (
      <div>
        <button
          className={`flex items-center gap-2 w-full text-left mb-2 ${highlight ? 'text-[hsl(var(--gold))]' : 'text-muted-foreground'}`}
          onClick={() => {
            setCollapsedDays(prev => {
              const next = new Set(prev);
              if (next.has(label)) next.delete(label);
              else next.add(label);
              return next;
            });
          }}
        >
          <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
          <span className="text-[10px] opacity-60">({dayTasks.length})</span>
          <span className="text-[10px]">{isOpen ? '▾' : '▸'}</span>
        </button>
        {isOpen && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {dayTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>
    );
  };

  const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const renderScheduleTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Visual weekly board. Full management in <button className="text-primary underline" onClick={() => navigate('/staff?section=marketingschedule')}>Marketing & Brand</button>.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DAYS_ORDER.map(day => {
          const dayItems = scheduleItems.filter(s => s.day_of_week.toLowerCase() === day);
          const isToday = day === todayDayName;
          return (
            <div key={day} className={`rounded-xl border ${isToday ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5' : 'border-border/40 bg-card/40'} p-2 min-h-[140px] flex flex-col`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-[hsl(var(--gold))]' : 'text-muted-foreground'}`}>
                  {day.slice(0, 3)}{isToday && ' • Today'}
                </p>
                <span className="text-[10px] text-muted-foreground">{dayItems.length}</span>
              </div>
              <div className="space-y-1.5 flex-1">
                {dayItems.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 italic">Nothing scheduled</p>
                )}
                {dayItems.map(item => {
                  const owner = staffMembers.find(m => m.id === item.owner_id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border bg-background/60 p-1.5 group relative ${item.status === 'posted' ? 'opacity-40' : ''}`}
                    >
                      {item.image_url && (
                        <div
                          className="h-12 w-full rounded-md bg-cover bg-center mb-1.5 border border-border/40"
                          style={{ backgroundImage: `url(${item.image_url})` }}
                        />
                      )}
                      <p className="text-[11px] font-semibold leading-tight truncate">{item.post_type}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {item.platform_format && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground">{item.platform_format}</span>
                        )}
                        {item.scheduled_time && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground">{item.scheduled_time}</span>
                        )}
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                          item.status === 'posted' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-muted/60 text-muted-foreground'
                        }`}>
                          {item.status || 'planned'}
                        </span>
                      </div>
                      {owner && (
                        <div className="mt-1 flex items-center gap-1">
                          <StaffAvatar staffId={owner.id} />
                          <span className="text-[9px] text-muted-foreground truncate">{getDisplayName(owner)}</span>
                        </div>
                      )}
                      {item.status !== 'posted' && (
                        <Button size="sm" variant="outline" className="mt-1 h-5 w-full text-[9px] gap-1" onClick={() => handleMarkScheduleDone(`schedule-${item.id}`)}>
                          <Check className="h-2.5 w-2.5" /> Done
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Upcoming-week strip rendered above tabs — fixtures + tasks/schedule for active member
  const renderUpcomingStrip = () => {
    const now = Date.now();
    const sevenDays = now + 7 * 86400000;
    const memberId = activeMember?.id;
    const upcomingTasks = (memberId ? tasks.filter(t => t.assigned_to?.includes(memberId) && !t.completed && t.deadline) : [])
      .filter(t => {
        const dt = new Date(t.deadline as any).getTime();
        return dt >= now && dt <= sevenDays;
      })
      .sort((a, b) => new Date(a.deadline as any).getTime() - new Date(b.deadline as any).getTime());

    const items = [
      ...fixtures.map(f => ({
        kind: 'fixture' as const,
        key: `f-${f.id}`,
        date: new Date(`${f.match_date}T${f.match_time || '12:00'}`),
        title: `${f.home_team} vs ${f.away_team}`,
        sub: f.player_name ? `${f.player_name} · ${f.competition || 'Match'}` : (f.competition || 'Fixture'),
      })),
      ...upcomingTasks.map(t => ({
        kind: 'task' as const,
        key: `t-${t.id}`,
        date: new Date(t.deadline as any),
        title: t.title,
        sub: t.category || 'Task',
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (items.length === 0) return null;

    return (
      <div className="rounded-xl border border-border/40 bg-card/30 p-2.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">This Week</p>
          <span className="text-[10px] text-muted-foreground">{items.length}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {items.map(item => (
            <div
              key={item.key}
              className={`shrink-0 w-44 rounded-lg border p-2 snap-start ${
                item.kind === 'fixture'
                  ? 'border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5'
                  : 'border-primary/30 bg-primary/5'
              }`}
            >
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {item.kind === 'fixture' ? '⚽ Fixture' : '✓ Task'} · {item.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-xs font-semibold mt-1 line-clamp-2">{item.title}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLeaderboardTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/50 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold border-b border-border/50">
          <span className="col-span-2">Staff</span>
          <span className="text-center">This Week</span>
          <span className="text-center">Month</span>
          <span className="text-center">All Time</span>
        </div>
        {leaderboardData.map((entry, idx) => (
          <button
            key={entry.id}
            onClick={() => setHistoryStaffId(entry.id)}
            className={`w-full grid grid-cols-5 gap-2 px-4 py-3 items-center text-left transition-colors hover:bg-muted/40 ${idx === 0 ? 'bg-[hsl(var(--gold))]/5' : ''} ${idx < leaderboardData.length - 1 ? 'border-b border-border/30' : ''}`}
          >
            <div className="col-span-2 flex items-center gap-2">
              {idx === 0 && <Trophy className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />}
              <StaffAvatar staffId={entry.id} />
              <span className="text-sm font-medium truncate">{entry.name}</span>
            </div>
            <p className="text-center text-sm font-bold text-[hsl(var(--gold))]">{entry.lastWeek}</p>
            <p className="text-center text-sm font-bold text-primary">{entry.fourWeeks}</p>
            <p className="text-center text-sm font-bold">{entry.allTime}</p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Tap a row to see what they've done</p>
    </div>
  );

  const mainContent = (
    <div className={`space-y-4 ${fullscreen ? 'p-6' : ''}`}>
      {/* Weekly hub — fixtures + selected staff member's tasks for the next 7 days */}
      {renderUpcomingStrip()}

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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {([
          { key: "tasks" as const, label: "Tasks", icon: ListTodo },
          { key: "schedule" as const, label: "Schedule", icon: Calendar },
          { key: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff slider (only for tasks tab) */}
      {activeTab === "tasks" && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeStaffIndex === 0}
            onClick={() => setActiveStaffIndex(prev => Math.max(0, prev - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex gap-2 overflow-x-auto py-1 scrollbar-hide">
            {visibleStaff.map((m, i) => {
              const isActive = i === activeStaffIndex;
              const isCurrent = m.id === userId;
              const memberTaskCount =
                tasks.filter(t => t.assigned_to?.includes(m.id) && !t.completed).length +
                scheduleItems.filter(s => s.owner_id === m.id && !hasCompletionSince(s.completion_log, weekStart)).length;
              const displayName = getDisplayName(m);
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveStaffIndex(i)}
                  onDragOver={(e) => { if (dragItem && isAdmin) e.preventDefault(); }}
                  onDrop={() => handleDropOnStaff(m.id)}
                  onDoubleClick={() => {
                    if (isAdmin) {
                      setEditingStaffId(m.id);
                      setEditingName(staffAliases[m.id] || m.full_name || '');
                    }
                  }}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                    isActive
                      ? isCurrent
                        ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]'
                        : 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-card/30 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <StaffAvatar staffId={m.id} />
                  {editingStaffId === m.id ? (
                    <input
                      className="bg-transparent border-b border-current text-sm w-20 outline-none"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => {
                        if (editingName.trim()) saveStaffAliases({ ...staffAliases, [m.id]: editingName.trim() });
                        setEditingStaffId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (editingName.trim()) saveStaffAliases({ ...staffAliases, [m.id]: editingName.trim() });
                          setEditingStaffId(null);
                        }
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span>{displayName}</span>
                  )}
                  {memberTaskCount > 0 && (
                    <span className="text-[10px] opacity-70">{memberTaskCount}</span>
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeStaffIndex >= visibleStaff.length - 1}
            onClick={() => setActiveStaffIndex(prev => Math.min(visibleStaff.length - 1, prev + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {activeTab === "tasks" && activeMember && renderTasksTab()}
      {activeTab === "schedule" && renderScheduleTab()}
      {activeTab === "leaderboard" && renderLeaderboardTab()}

      {/* Add / Edit Task Dialog */}
      <Dialog open={addOpen || !!editingTask} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditingTask(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[92dvh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <Label>Image</Label>
                {newImageUrl ? (
                  <div className="relative w-full h-24 sm:h-28 rounded-lg overflow-hidden border border-border">
                    <img src={newImageUrl} alt="" className="w-full h-full object-cover" />
                    <Button type="button" size="sm" variant="destructive" className="absolute top-1 right-1 h-6 text-[10px]" onClick={() => setNewImageUrl('')}>Remove</Button>
                  </div>
                ) : (
                  <>
                    <Button type="button" variant="outline" className="w-full h-16 border-dashed flex flex-col gap-1" onClick={() => document.getElementById('task-image-upload')?.click()}>
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload image</span>
                    </Button>
                    <input
                      id="task-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const ext = file.name.split('.').pop();
                          const fileName = `tasks/${Date.now()}.${ext}`;
                          const { error: uploadError } = await supabase.storage.from('marketing-gallery').upload(fileName, file, { cacheControl: '31536000', upsert: false });
                          if (uploadError) throw uploadError;
                          const { data: { publicUrl } } = supabase.storage.from('marketing-gallery').getPublicUrl(fileName);
                          setNewImageUrl(publicUrl);
                          toast.success('Image uploaded');
                        } catch { toast.error('Failed to upload image'); }
                      }}
                    />
                  </>
                )}
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

            {!editingTask && (
              <div>
                <Label>Assign To *</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {staffMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-medium border transition-colors ${
                        newAssignees.includes(m.id)
                          ? 'bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))]'
                          : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <StaffAvatar staffId={m.id} />
                      {m.full_name || m.email.split('@')[0]}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (newAssignees.length === staffMembers.length) setNewAssignees([]);
                      else setNewAssignees(staffMembers.map(m => m.id));
                    }}
                    className="px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-medium border border-dashed border-border/50 text-muted-foreground hover:text-foreground"
                  >
                    {newAssignees.length === staffMembers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-background px-5 py-3 flex justify-end gap-2 shrink-0">
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
        </DialogContent>
      </Dialog>

      {/* Leaderboard history dialog */}
      <Dialog open={!!historyStaffId} onOpenChange={(o) => !o && setHistoryStaffId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyStaff && <StaffAvatar staffId={historyStaff.id} />}
              {historyStaff ? getDisplayName(historyStaff) : ''} — Recent activity
            </DialogTitle>
          </DialogHeader>
          {historyEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
          ) : (
            <div className="space-y-1 mt-2">
              {historyEntries.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/40 text-sm">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    entry.type === 'Task' ? 'border-emerald-500/40 text-emerald-400' :
                    entry.type === 'Schedule' ? 'border-blue-500/40 text-blue-400' :
                    'border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))]'
                  }`}>{entry.type}</Badge>
                  <span className="flex-1 truncate">{entry.label}</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{format(entry.when, 'dd MMM HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
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
