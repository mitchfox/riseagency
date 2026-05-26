import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, ClipboardList, ChevronDown, Repeat, Image as ImageIcon } from "lucide-react";

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
  recurring_weekly?: boolean;
  recurrence_group_id?: string | null;
  image_url?: string | null;
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

  const toggleRecurring = async (item: Item) => {
    if (!userId) return;
    if (!item.recurring_weekly) {
      const groupId = item.recurrence_group_id || item.id;
      // mark this row and clone 11 weeks forward
      const { error: upErr } = await supabase
        .from("staff_personal_schedule_items")
        .update({ recurring_weekly: true, recurrence_group_id: groupId })
        .eq("id", item.id);
      if (upErr) { toast.error("Failed to enable recurring"); return; }
      const clones = Array.from({ length: 11 }, (_, i) => {
        const d = new Date(item.scheduled_date + "T00:00:00");
        d.setDate(d.getDate() + (i + 1) * 7);
        return {
          user_id: userId,
          task_id: item.task_id,
          title: item.title,
          notes: item.notes,
          scheduled_date: fmtDate(d),
          start_time: item.start_time,
          end_time: item.end_time,
          recurring_weekly: true,
          recurrence_group_id: groupId,
          image_url: item.image_url ?? null,
        };
      });
      const { error: insErr } = await supabase
        .from("staff_personal_schedule_items")
        .insert(clones);
      if (insErr) { toast.error("Recurring clones failed"); return; }
      setItems((p) => p.map((i) => i.id === item.id ? { ...i, recurring_weekly: true, recurrence_group_id: groupId } : i));
      toast.success("Repeats every week for 12 weeks");
    } else {
      const groupId = item.recurrence_group_id;
      if (!groupId) return;
      const { error } = await supabase
        .from("staff_personal_schedule_items")
        .delete()
        .eq("recurrence_group_id", groupId)
        .gt("scheduled_date", item.scheduled_date);
      if (error) { toast.error("Failed to stop recurring"); return; }
      await supabase
        .from("staff_personal_schedule_items")
        .update({ recurring_weekly: false })
        .eq("id", item.id);
      setItems((p) => p
        .filter((i) => !(i.recurrence_group_id === groupId && i.scheduled_date > item.scheduled_date))
        .map((i) => i.id === item.id ? { ...i, recurring_weekly: false } : i));
      toast.success("Recurring stopped");
    }
  };

  const setImage = async (item: Item) => {
    const url = window.prompt("Image URL (leave blank to remove)", item.image_url || "");
    if (url === null) return;
    const value = url.trim() || null;
    const { error } = await supabase
      .from("staff_personal_schedule_items")
      .update({ image_url: value })
      .eq("id", item.id);
    if (error) { toast.error("Failed to update image"); return; }
    setItems((p) => p.map((i) => i.id === item.id ? { ...i, image_url: value } : i));
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
          className="relative rounded-lg border border-primary/20 bg-gradient-to-b from-background/60 to-background/30 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
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
            <div className="px-2 pb-2 max-h-[720px] overflow-y-auto">
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

        {/* Week timeline */}
        {(() => {
          const HOUR_PX = 60; // each hour row height
          const START_HOUR = 9;
          const END_HOUR = 21;
          const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
          const totalHeight = (END_HOUR - START_HOUR) * HOUR_PX;
          const toMin = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return (h - START_HOUR) * 60 + m;
          };
          return (
            <div className="rounded-lg border border-white/10 bg-gradient-to-b from-background/55 to-background/25 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
              {/* day header */}
              <div className="grid" style={{ gridTemplateColumns: `64px repeat(7, minmax(0,1fr))` }}>
                <div />
                {weekDays.map((d, idx) => {
                  const key = fmtDate(d);
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={`px-2 py-2 border-l border-white/5 flex items-center justify-between text-[11px] font-semibold ${isToday ? "text-primary" : "text-foreground/80"}`}
                    >
                      <span>{DAY_LABELS[idx]} {d.getDate()}</span>
                      <button
                        type="button"
                        onClick={() => addItem(key, { title: newTitle || "New item" })}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Add item"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* timeline body */}
              <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(7, minmax(0,1fr))`, height: totalHeight }}>
                {/* hour gutter */}
                <div className="relative border-t border-white/5 border-r border-white/10 bg-background/30">
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 text-[11px] font-semibold text-foreground/70 px-1.5 -translate-y-1/2"
                      style={{ top: i * HOUR_PX }}
                    >
                      {h <= 12 ? `${h}${h === 12 ? "PM" : "AM"}` : `${h - 12}PM`}
                    </div>
                  ))}
                </div>

                {/* day columns */}
                {weekDays.map((d) => {
                  const key = fmtDate(d);
                  const dayItems = itemsByDate[key] || [];
                  const isToday = key === todayKey;
                  const nowTop = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * HOUR_PX;
                  return (
                    <div
                      key={key}
                      onDrop={(e) => onDropOnDay(e, key)}
                      onDragOver={onDragOver}
                      onDoubleClick={() => addItem(key, { title: newTitle || "New item" })}
                      className={`relative border-l border-white/5 ${isToday ? "bg-primary/[0.04]" : ""}`}
                    >
                      {/* hour grid lines */}
                      {HOURS.map((_, i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-white/5"
                          style={{ top: i * HOUR_PX }}
                        />
                      ))}

                      {/* live now marker */}
                      {isToday && nowTop >= 0 && nowTop <= totalHeight && (
                        <div
                          className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-1"
                          style={{ top: nowTop }}
                        >
                          <span className="text-[9px] font-semibold text-primary bg-background/80 backdrop-blur px-1 rounded ml-1">Now</span>
                          <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/60 to-transparent shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                        </div>
                      )}

                      {/* items */}
                      {dayItems.map((it) => {
                        const top = Math.max(0, toMin(it.start_time) / 60 * HOUR_PX);
                        const heightMin = Math.max(50, toMin(it.end_time) - toMin(it.start_time));
                        const height = heightMin / 60 * HOUR_PX - 2;
                        const current = isCurrent(it);
                        return (
                          <div
                            key={it.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/item-id", it.id)}
                            className={`group absolute left-1 right-1 z-10 rounded-md border p-2 backdrop-blur overflow-hidden transition-all ${
                              it.done_at
                                ? "opacity-40 line-through bg-background/30 border-white/5"
                                : current
                                  ? "bg-primary/15 border-primary/60 shadow-[0_0_14px_-2px_hsl(var(--primary)/0.55)]"
                                  : "bg-background/70 border-white/10 hover:border-primary/40"
                            }`}
                            style={{ top, height }}
                          >
                            {it.image_url && (
                              <div
                                className="absolute inset-0 opacity-30 bg-cover bg-center"
                                style={{ backgroundImage: `url(${it.image_url})` }}
                              />
                            )}
                            <div className="relative flex items-start gap-1.5 h-full">
                              <button
                                type="button"
                                onClick={() => toggleDone(it)}
                                className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center ${it.done_at ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                                title="Mark done"
                              >
                                {it.done_at && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground leading-snug break-words" title={it.title}>{it.title}</div>
                                <div className="text-[11px] text-foreground/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span>{it.start_time.slice(0,5)}–{it.end_time.slice(0,5)}</span>
                                  {it.recurring_weekly && (
                                    <span className="inline-flex items-center gap-0.5 px-1 rounded bg-primary/20 text-primary text-[9px] font-semibold uppercase tracking-wide">
                                      <Repeat className="h-2.5 w-2.5" /> weekly
                                    </span>
                                  )}
                                  {current && (
                                    <span className="text-[9px] font-semibold text-primary uppercase tracking-wide">Now</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => toggleRecurring(it)}
                                  title={it.recurring_weekly ? "Stop weekly repeat" : "Repeat weekly"}
                                  className={`h-5 w-5 flex items-center justify-center rounded ${it.recurring_weekly ? "bg-primary/30 text-primary" : "bg-background/40 text-muted-foreground hover:text-primary hover:bg-background/60"}`}
                                >
                                  <Repeat className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImage(it)}
                                  title="Set image"
                                  className="h-5 w-5 flex items-center justify-center rounded bg-background/40 text-muted-foreground hover:text-primary hover:bg-background/60"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => quickLogToTasks(it)}
                                  title="Log to My Tasks"
                                  className="h-5 w-5 flex items-center justify-center rounded bg-background/40 text-muted-foreground hover:text-primary hover:bg-background/60"
                                >
                                  <ClipboardList className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(it.id)}
                                  title="Remove"
                                  className="h-5 w-5 flex items-center justify-center rounded bg-background/40 text-muted-foreground hover:text-destructive hover:bg-background/60"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      <div className="text-[11px] text-muted-foreground">
        Open the My Tasks rail to drag a task onto a day. Type in the quick-add box and double-click a day to drop it there. Drag items between days to move them. Today's column glows and shows a live "Now" marker.
      </div>
    </div>
  );
};

export default MyPersonalScheduleBoard;