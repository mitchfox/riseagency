import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, ClipboardList, ChevronDown } from "lucide-react";

type Item = {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  notes: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  lane: number;
  done_at: string | null;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: string | null;
  category: string | null;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const MyPersonalScheduleBoard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  // Tick every minute for live "Now" marker + current-hour glow
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [itemsRes, tasksRes] = await Promise.all([
        supabase
          .from("staff_personal_schedule_items")
          .select("*")
          .eq("user_id", userId)
          .gte("scheduled_date", fmtDate(weekStart))
          .lte("scheduled_date", fmtDate(weekEnd))
          .order("scheduled_date")
          .order("start_time"),
        supabase
          .from("staff_tasks")
          .select("id,title,completed,priority,category")
          .contains("assigned_to", [userId])
          .eq("completed", false)
          .order("display_order"),
      ]);
      if (cancelled) return;
      if (itemsRes.error) toast.error("Could not load schedule items");
      else setItems((itemsRes.data || []) as Item[]);
      if (!tasksRes.error) setTasks((tasksRes.data || []) as Task[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, weekStart, weekEnd]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach((it) => {
      (map[it.scheduled_date] ||= []).push(it);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    );
    return map;
  }, [items]);

  const addItem = async (date: string, partial?: Partial<Item>) => {
    if (!userId) return;
    const payload: any = {
      user_id: userId,
      title: partial?.title || newTitle || "New item",
      task_id: partial?.task_id ?? null,
      scheduled_date: date,
      start_time: partial?.start_time || "09:00",
      end_time: partial?.end_time || "10:00",
    };
    const { data, error } = await supabase
      .from("staff_personal_schedule_items")
      .insert(payload)
      .select()
      .single();
    if (error || !data) { toast.error("Failed to add item"); return; }
    setItems((p) => [...p, data as Item]);
    if (!partial?.title) setNewTitle("");
    toast.success("Added to schedule");
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase
      .from("staff_personal_schedule_items")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const toggleDone = async (item: Item) => {
    const done = !item.done_at;
    const { error } = await supabase
      .from("staff_personal_schedule_items")
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) { toast.error("Failed to update"); return; }
    setItems((p) => p.map((i) => i.id === item.id ? { ...i, done_at: done ? new Date().toISOString() : null } : i));
  };

  const quickLogToTasks = async (item: Item) => {
    if (!userId) return;
    const { error } = await supabase
      .from("staff_tasks")
      .insert({
        title: item.title,
        assigned_to: [userId],
        priority: "medium",
        category: "Schedule",
      });
    if (error) { toast.error("Failed to log to My Tasks"); return; }
    toast.success("Logged to My Tasks");
  };

  const onDropOnDay = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    const itemId = e.dataTransfer.getData("text/item-id");
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) await addItem(date, { title: task.title, task_id: task.id });
    } else if (itemId) {
      const item = items.find((i) => i.id === itemId);
      if (item && item.scheduled_date !== date) {
        const { error } = await supabase
          .from("staff_personal_schedule_items")
          .update({ scheduled_date: date })
          .eq("id", itemId);
        if (error) { toast.error("Failed to move"); return; }
        setItems((p) => p.map((i) => i.id === itemId ? { ...i, scheduled_date: date } : i));
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const todayKey = fmtDate(now);
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const isCurrent = (it: Item) =>
    it.scheduled_date === todayKey &&
    it.start_time.slice(0, 5) <= nowHM &&
    it.end_time.slice(0, 5) > nowHM;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} —{" "}
            {weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Quick add then click a day"
            className="h-8 w-56 bg-background/40 backdrop-blur border-primary/20"
          />
        </div>
      </div>

      <div className={`grid gap-3 transition-[grid-template-columns] duration-300 ${tasksOpen ? "grid-cols-[240px_1fr]" : "grid-cols-[44px_1fr]"}`}>
        {/* My Tasks rail — collapsed by default */}
        <div
          className="relative rounded-lg border border-primary/20 bg-gradient-to-b from-background/60 to-background/30 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] h-[560px] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setTasksOpen((p) => !p)}
            className="w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-foreground/90 hover:text-primary"
            title={tasksOpen ? "Collapse" : "Expand My Tasks"}
          >
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            {tasksOpen && <span className="flex-1 text-left">My Tasks</span>}
            {tasksOpen && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </button>
          {tasksOpen && (
            <div className="px-2 pb-2 h-[calc(100%-2.25rem)] overflow-y-auto">
              {tasks.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">No open tasks.</div>
              )}
              <div className="space-y-1.5">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                    className="text-sm p-2 rounded-md border border-white/10 bg-background/50 backdrop-blur cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-background/70 transition-colors"
                    title="Drag onto a day"
                  >
                    <div className="font-medium text-foreground/95 leading-snug">{t.title}</div>
                    {t.category && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1.5 h-[560px]">
          {weekDays.map((d, idx) => {
            const key = fmtDate(d);
            const dayItems = itemsByDate[key] || [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                onDrop={(e) => onDropOnDay(e, key)}
                onDragOver={onDragOver}
                onDoubleClick={() => newTitle && addItem(key)}
                className={`relative rounded-lg p-1.5 flex flex-col backdrop-blur-xl border bg-gradient-to-b from-background/55 to-background/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors ${
                  isToday
                    ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_30px_-12px_hsl(var(--primary)/0.45)]"
                    : "border-white/10"
                }`}
              >
                <div className="text-[11px] font-semibold mb-1 flex items-center justify-between px-0.5">
                  <span className={isToday ? "text-primary" : "text-foreground/80"}>
                    {DAY_LABELS[idx]} {d.getDate()}
                  </span>
                  <button
                    type="button"
                    onClick={() => newTitle ? addItem(key) : addItem(key, { title: "New item" })}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Add item"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="relative flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {isToday && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-1"
                      style={{ top: `${Math.min(98, Math.max(0, ((now.getHours() - 9) * 60 + now.getMinutes()) / (12 * 60) * 100))}%` }}
                    >
                      <span className="text-[9px] font-semibold text-primary bg-background/80 backdrop-blur px-1 rounded">Now</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/60 to-transparent shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                    </div>
                  )}
                  {dayItems.map((it) => (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/item-id", it.id)}
                      className={`group text-xs rounded-md border p-1.5 backdrop-blur transition-all ${
                        it.done_at
                          ? "opacity-40 line-through bg-background/30 border-white/5"
                          : isCurrent(it)
                            ? "bg-primary/15 border-primary/60 shadow-[0_0_14px_-2px_hsl(var(--primary)/0.55)]"
                            : "bg-background/60 border-white/10 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        <button
                          type="button"
                          onClick={() => toggleDone(it)}
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center ${it.done_at ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                          title="Mark done"
                        >
                          {it.done_at && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-foreground leading-tight" title={it.title}>{it.title}</div>
                          <div className="text-[10px] text-foreground/60 mt-0.5 flex items-center gap-1">
                            <span>{it.start_time.slice(0,5)}–{it.end_time.slice(0,5)}</span>
                            {isCurrent(it) && (
                              <span className="text-[9px] font-semibold text-primary uppercase tracking-wide">Now</span>
                            )}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => quickLogToTasks(it)}
                            title="Log to My Tasks"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ClipboardList className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            title="Remove"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      <div className="text-[11px] text-muted-foreground">
        Open the My Tasks rail to drag a task onto a day. Type in the quick-add box and double-click a day to drop it there. Drag items between days to move them. Today's column glows and shows a live "Now" marker.
      </div>
    </div>
  );
};

export default MyPersonalScheduleBoard;