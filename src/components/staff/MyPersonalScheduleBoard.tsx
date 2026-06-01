import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ClipboardList, ChevronDown, Repeat, Users, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskDetailDialog, ScheduleItem } from "./TaskDetailDialog";

type Item = {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  notes: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  lane?: number;
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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VISIBLE_DAYS = 3;
const HOUR_PX = 64;
const DAY_MIN_WIDTH = 260;
const SNAP_MIN = 15;
const TOTAL_MIN = 24 * 60;
const TOTAL_HEIGHT = (TOTAL_MIN / 60) * HOUR_PX;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; };
const toTime = (min: number) => {
  const c = Math.max(0, Math.min(TOTAL_MIN - 1, min));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
};
const labelHour = (h: number) => {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

export const MyPersonalScheduleBoard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState<Date>(() => startOfDay(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [openItem, setOpenItem] = useState<Item | null>(null);
  const [draftItem, setDraftItem] = useState<ScheduleItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const dragStart = useRef<{ pointerX: number; pointerY: number; startMin: number; durationMin: number; dayIndex: number; columnWidth: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dMin: number; dDay: number }>({ dMin: 0, dDay: 0 });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleDays = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );
  const windowEnd = useMemo(() => addDays(windowStart, VISIBLE_DAYS - 1), [windowStart]);

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
          .gte("scheduled_date", fmtDate(windowStart))
          .lte("scheduled_date", fmtDate(windowEnd))
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
  }, [userId, windowStart, windowEnd]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const todayInWindow = visibleDays.some((d) => fmtDate(d) === fmtDate(now));
    const targetMin = todayInWindow ? now.getHours() * 60 + now.getMinutes() : 8 * 60;
    scrollRef.current.scrollTop = Math.max(0, (targetMin / 60) * HOUR_PX - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart.getTime()]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach((it) => { (map[it.scheduled_date] ||= []).push(it); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [items]);

  const openCreateAt = (date: Date, hour: number, minute: number) => {
    if (!userId) return;
    const sMin = hour * 60 + minute;
    const eMin = Math.min(TOTAL_MIN - 1, sMin + 60);
    setDraftItem({
      id: "",
      user_id: userId,
      task_id: null,
      title: "",
      notes: null,
      scheduled_date: fmtDate(date),
      start_time: `${toTime(sMin)}:00`,
      end_time: `${toTime(eMin)}:00`,
    });
  };

  const createFromTask = async (task: Task, date: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("staff_personal_schedule_items")
      .insert({ user_id: userId, task_id: task.id, title: task.title, scheduled_date: date, start_time: "09:00", end_time: "10:00" })
      .select().single();
    if (error || !data) { toast.error("Failed to add"); return; }
    setItems((p) => [...p, data as Item]);
    toast.success("Added to schedule");
  };

  const quickLogToTasks = async (item: Item) => {
    if (!userId) return;
    const { error } = await supabase
      .from("staff_tasks")
      .insert({ title: item.title, assigned_to: [userId], priority: "medium", category: "Schedule" });
    if (error) { toast.error("Failed to log to My Tasks"); return; }
    toast.success("Logged to My Tasks");
  };

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: PointerEvent) => {
      if (!dragStart.current) return;
      const dy = e.clientY - dragStart.current.pointerY;
      const dx = e.clientX - dragStart.current.pointerX;
      const dMin = Math.round((dy / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
      const dDay = Math.round(dx / dragStart.current.columnWidth);
      setDragDelta({ dMin, dDay });
    };
    const onUp = async () => {
      const ds = dragStart.current;
      const id = dragId;
      const delta = { ...dragDelta };
      setDragId(null);
      setDragDelta({ dMin: 0, dDay: 0 });
      dragStart.current = null;
      if (!ds || !id) return;
      if (delta.dMin === 0 && delta.dDay === 0) return;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const newStartMin = Math.max(0, Math.min(TOTAL_MIN - ds.durationMin, ds.startMin + delta.dMin));
      const newEndMin = newStartMin + ds.durationMin;
      const newDayIndex = Math.max(0, Math.min(VISIBLE_DAYS - 1, ds.dayIndex + delta.dDay));
      const newDate = fmtDate(addDays(windowStart, newDayIndex));
      const newStartTime = toTime(newStartMin) + ":00";
      const newEndTime = toTime(newEndMin) + ":00";
      if (newDate === item.scheduled_date && newStartTime === item.start_time && newEndTime === item.end_time) return;
      const prev = item;
      setItems((p) => p.map((i) => i.id === id ? { ...i, scheduled_date: newDate, start_time: newStartTime, end_time: newEndTime } : i));
      const { error } = await supabase
        .from("staff_personal_schedule_items")
        .update({ scheduled_date: newDate, start_time: newStartTime, end_time: newEndTime })
        .eq("id", id);
      if (error) {
        toast.error("Failed to move");
        setItems((p) => p.map((i) => i.id === id ? prev : i));
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragId, dragDelta, items, windowStart]);

  const beginDrag = (e: React.PointerEvent, item: Item, dayIndex: number, columnEl: HTMLElement) => {
    e.stopPropagation();
    const startMin = toMin(item.start_time);
    const endMin = toMin(item.end_time);
    const durationMin = Math.max(15, endMin - startMin);
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startMin,
      durationMin,
      dayIndex,
      columnWidth: columnEl.getBoundingClientRect().width,
    };
    setDragId(item.id);
    setDragDelta({ dMin: 0, dDay: 0 });
  };

  const todayKey = fmtDate(now);
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isCurrent = (it: Item) =>
    it.scheduled_date === todayKey &&
    it.start_time.slice(0, 5) <= nowHM &&
    it.end_time.slice(0, 5) > nowHM;

  const handleColumnClick = (e: React.MouseEvent, date: Date, columnEl: HTMLElement) => {
    if (dragId) return;
    const rect = columnEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = Math.max(0, Math.min(TOTAL_MIN - 1, (y / HOUR_PX) * 60));
    const snapped = Math.floor(mins / SNAP_MIN) * SNAP_MIN;
    openCreateAt(date, Math.floor(snapped / 60), snapped % 60);
  };

  type Cluster = { startMin: number; endMin: number; items: Item[] };
  const clustersFor = (dayItems: Item[]): Cluster[] => {
    const sorted = [...dayItems].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
    const out: Cluster[] = [];
    for (const it of sorted) {
      const s = toMin(it.start_time);
      const e = Math.max(toMin(it.end_time), s + 30);
      const last = out[out.length - 1];
      if (last && s < last.endMin) {
        last.endMin = Math.max(last.endMin, e);
        last.items.push(it);
      } else {
        out.push({ startMin: s, endMin: e, items: [it] });
      }
    }
    return out;
  };

  const windowLabel = (() => {
    const a = visibleDays[0];
    const b = visibleDays[VISIBLE_DAYS - 1];
    if (a.getMonth() === b.getMonth()) {
      return `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
    }
    return `${a.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${b.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWindowStart(addDays(windowStart, -VISIBLE_DAYS))} title="Previous 3 days">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold tracking-wide min-w-[180px] text-center">{windowLabel}</div>
          <Button variant="ghost" size="sm" onClick={() => setWindowStart(addDays(windowStart, VISIBLE_DAYS))} title="Next 3 days">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWindowStart(startOfDay(new Date()))}>Today</Button>
        </div>
        <Button
          size="sm"
          onClick={() => openCreateAt(new Date(), Math.max(8, now.getHours()), 0)}
          className="bg-primary/90 hover:bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-1" /> Add task
        </Button>
      </div>

      <div className={`grid gap-3 transition-[grid-template-columns] duration-300 ${tasksOpen ? "grid-cols-[240px_1fr]" : "grid-cols-[44px_1fr]"}`}>
        {/* My Tasks rail */}
        <div className="relative rounded-lg border border-primary/20 bg-gradient-to-b from-background/60 to-background/30 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
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
            <div className="px-2 pb-2 max-h-[640px] overflow-y-auto">
              {tasks.length === 0 && <div className="text-xs text-muted-foreground py-2">No open tasks.</div>}
              <div className="space-y-1.5">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => createFromTask(t, fmtDate(visibleDays[0]))}
                    className="w-full text-left text-sm p-2 rounded-md border border-white/10 bg-background/50 backdrop-blur hover:border-primary/50 hover:bg-background/70 transition-colors"
                    title="Click to add at 09:00 on the first visible day"
                  >
                    <div className="font-medium text-foreground/95 leading-snug">{t.title}</div>
                    {t.category && <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3-day timeline */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-background/60 to-background/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            {/* Day header */}
            <div
              className="grid border-b border-white/10 bg-background/40"
              style={{ gridTemplateColumns: `64px repeat(${VISIBLE_DAYS}, minmax(${DAY_MIN_WIDTH}px, 1fr))`, minWidth: 64 + VISIBLE_DAYS * DAY_MIN_WIDTH }}
            >
              <div className="px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-r border-white/10">Time</div>
              {visibleDays.map((d) => {
                const key = fmtDate(d);
                const isToday = key === todayKey;
                return (
                  <div key={key} className={`px-3 py-2 border-l border-white/5 flex flex-col items-start ${isToday ? "bg-primary/10" : ""}`}>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DAY_LABELS[d.getDay()]}{isToday && " · TODAY"}
                    </span>
                    <span className={`text-base font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable body */}
            <div ref={scrollRef} className="relative overflow-y-auto" style={{ height: "min(640px, calc(100vh - 280px))" }}>
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `64px repeat(${VISIBLE_DAYS}, minmax(${DAY_MIN_WIDTH}px, 1fr))`,
                  minWidth: 64 + VISIBLE_DAYS * DAY_MIN_WIDTH,
                  height: TOTAL_HEIGHT,
                }}
              >
                {/* Hour gutter */}
                <div className="relative border-r border-white/10 bg-background/30">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="absolute left-0 right-0 text-[10px] font-semibold text-muted-foreground px-1.5" style={{ top: h * HOUR_PX - 6 }}>
                      {labelHour(h)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {visibleDays.map((d, dayIndex) => {
                  const key = fmtDate(d);
                  const dayItems = itemsByDate[key] || [];
                  const isToday = key === todayKey;
                  const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_PX;
                  const clusters = clustersFor(dayItems);
                  return (
                    <div
                      key={key}
                      onClick={(e) => handleColumnClick(e, d, e.currentTarget)}
                      className={`relative border-l border-white/5 cursor-crosshair ${isToday ? "bg-primary/[0.04]" : ""}`}
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * HOUR_PX }} />
                      ))}
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={`half-${h}`} className="absolute left-0 right-0 border-t border-dashed border-white/[0.03]" style={{ top: h * HOUR_PX + HOUR_PX / 2 }} />
                      ))}

                      {isToday && (
                        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-1" style={{ top: nowTop }}>
                          <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1 rounded ml-1">Now</span>
                          <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/60 to-transparent shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                        </div>
                      )}

                      {clusters.map((cluster, ci) => {
                        if (cluster.items.length === 1) {
                          const it = cluster.items[0];
                          const sMin = toMin(it.start_time);
                          const eMin = toMin(it.end_time);
                          const dur = Math.max(30, eMin - sMin);
                          const isDragging = dragId === it.id;
                          const dragMin = isDragging ? dragDelta.dMin : 0;
                          const dragDayShift = isDragging ? dragDelta.dDay : 0;
                          const top = ((sMin + dragMin) / 60) * HOUR_PX;
                          const height = (dur / 60) * HOUR_PX - 2;
                          const current = isCurrent(it);
                          return (
                            <div
                              key={it.id}
                              onPointerDown={(e) => beginDrag(e, it, dayIndex, e.currentTarget.parentElement as HTMLElement)}
                              onClick={(e) => { e.stopPropagation(); if (!isDragging) setOpenItem(it); }}
                              className={`group absolute left-1 right-1 rounded-md border p-2 backdrop-blur overflow-hidden transition-shadow select-none cursor-grab active:cursor-grabbing ${
                                it.done_at
                                  ? "opacity-40 line-through bg-background/30 border-white/10"
                                  : current
                                    ? "bg-primary/20 border-primary/70 shadow-[0_0_18px_-2px_hsl(var(--primary)/0.6)]"
                                    : "bg-gradient-to-br from-background/85 to-background/65 border-white/15 hover:border-primary/50 hover:shadow-[0_0_14px_-4px_hsl(var(--primary)/0.5)]"
                              }`}
                              style={{
                                top,
                                height,
                                transform: dragDayShift !== 0 ? `translateX(calc(${dragDayShift} * 100% + ${dragDayShift * 4}px))` : undefined,
                                opacity: isDragging ? 0.85 : undefined,
                                zIndex: isDragging ? 30 : 10,
                              }}
                            >
                              <div className="flex flex-col h-full min-w-0 gap-0.5">
                                <div className="text-sm font-bold text-foreground leading-tight line-clamp-2" title={it.title}>{it.title}</div>
                                <div className="text-[10px] text-foreground/70 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold">{toTime(sMin + dragMin)}–{toTime(eMin + dragMin)}</span>
                                  {it.recurring_weekly && (
                                    <span className="inline-flex items-center gap-0.5 px-1 rounded bg-primary/25 text-primary text-[9px] font-bold uppercase">
                                      <Repeat className="h-2.5 w-2.5" />
                                    </span>
                                  )}
                                </div>
                                {it.notes && height > 70 && (
                                  <div className="text-[10px] text-foreground/60 line-clamp-2 mt-0.5">{it.notes}</div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        const top = (cluster.startMin / 60) * HOUR_PX;
                        const height = Math.max(40, ((cluster.endMin - cluster.startMin) / 60) * HOUR_PX - 2);
                        return (
                          <Popover key={`cluster-${ci}`}>
                            <PopoverTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-1 right-1 z-10 rounded-md border-2 border-primary/60 bg-primary/30 hover:bg-primary/40 text-primary-foreground font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors"
                                style={{ top, height }}
                              >
                                <Users className="h-3.5 w-3.5" />
                                <span>{cluster.items.length}+ tasks</span>
                                <span className="text-[9px] opacity-90 font-semibold">{toTime(cluster.startMin)}–{toTime(cluster.endMin)}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2 bg-popover border-border" align="start">
                              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                                {cluster.items.length} overlapping tasks
                              </div>
                              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                {cluster.items.map((it) => (
                                  <button
                                    key={it.id}
                                    onClick={() => setOpenItem(it)}
                                    className="w-full text-left flex items-start gap-2 p-2 rounded bg-background/60 hover:bg-background border border-white/10"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-xs truncate text-foreground">{it.title}</div>
                                      <div className="text-[10px] text-muted-foreground">{it.start_time.slice(0, 5)} – {it.end_time.slice(0, 5)}</div>
                                      {it.notes && <div className="text-[10px] text-foreground/60 line-clamp-2 mt-0.5">{it.notes}</div>}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      <div className="text-[11px] text-muted-foreground">
        Click any empty time slot to add a task. Drag a task up or down to reschedule, or left and right to move it to another visible day. Click a task to edit, repeat or delete.
      </div>

      <TaskDetailDialog
        item={openItem as ScheduleItem | null}
        open={!!openItem}
        onOpenChange={(o) => { if (!o) setOpenItem(null); }}
        onSaved={(updated, opts) => {
          setItems((p) => p.map((i) => i.id === updated.id ? { ...i, ...updated } as Item : i));
          if (opts?.recurrenceChanged && userId) {
            supabase
              .from("staff_personal_schedule_items")
              .select("*")
              .eq("user_id", userId)
              .gte("scheduled_date", fmtDate(windowStart))
              .lte("scheduled_date", fmtDate(windowEnd))
              .order("scheduled_date")
              .order("start_time")
              .then(({ data }) => { if (data) setItems(data as Item[]); });
          }
        }}
        onDeleted={(id, opts) => {
          if (opts?.allFuture && opts.groupId && opts.fromDate) {
            setItems((p) => p.filter((i) => !(i.recurrence_group_id === opts.groupId && i.scheduled_date >= opts.fromDate!)));
          } else {
            setItems((p) => p.filter((i) => i.id !== id));
          }
        }}
        onLogToTasks={(it) => quickLogToTasks(it as Item)}
      />

      <TaskDetailDialog
        item={draftItem}
        open={!!draftItem}
        onOpenChange={(o) => { if (!o) setDraftItem(null); }}
        onSaved={(created) => {
          setItems((p) => [...p, created as Item]);
          setDraftItem(null);
          if (userId) {
            supabase
              .from("staff_personal_schedule_items")
              .select("*")
              .eq("user_id", userId)
              .gte("scheduled_date", fmtDate(windowStart))
              .lte("scheduled_date", fmtDate(windowEnd))
              .order("scheduled_date")
              .order("start_time")
              .then(({ data }) => { if (data) setItems(data as Item[]); });
          }
        }}
        onDeleted={() => setDraftItem(null)}
        onLogToTasks={() => {}}
      />
    </div>
  );
};

export default MyPersonalScheduleBoard;
