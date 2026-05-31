import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Clock, Trash2, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface DayGridEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  is_ongoing: boolean | null;
}

interface Props {
  date: Date;
  events: DayGridEvent[];
  getCategoryColor: (c: string | null) => string;
  onAddAtTime: (date: Date, hour: number, minute: number) => void;
  onUpdateTime: (id: string, start: string, end: string | null) => void;
  onDelete: (id: string) => void;
  isFullscreen?: boolean;
}

const HOUR_HEIGHT = 56;
const SNAP_MINUTES = 15;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

const pad = (n: number) => n.toString().padStart(2, "0");
const toMinutes = (t: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};
const toTime = (mins: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, mins));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
};

interface Cluster {
  startMin: number;
  endMin: number;
  events: DayGridEvent[];
}

const buildClusters = (events: DayGridEvent[]): Cluster[] => {
  const timed = events
    .filter((e) => e.start_time)
    .map((e) => {
      const s = toMinutes(e.start_time)!;
      const eMin = toMinutes(e.end_time) ?? s + 60;
      return { ev: e, s, e: Math.max(eMin, s + 30) };
    })
    .sort((a, b) => a.s - b.s);

  const clusters: Cluster[] = [];
  for (const item of timed) {
    const last = clusters[clusters.length - 1];
    if (last && item.s < last.endMin) {
      last.endMin = Math.max(last.endMin, item.e);
      last.events.push(item.ev);
    } else {
      clusters.push({ startMin: item.s, endMin: item.e, events: [item.ev] });
    }
  }
  return clusters;
};

export const ScheduleDayGrid = ({
  date,
  events,
  getCategoryColor,
  onAddAtTime,
  onUpdateTime,
  onDelete,
  isFullscreen,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffsetMin, setDragOffsetMin] = useState<number>(0);
  const dragStartRef = useRef<{ pointerY: number; startMin: number; durationMin: number } | null>(null);
  const isToday = isSameDay(date, new Date());

  const allDay = events.filter((e) => !e.start_time);
  const clusters = useMemo(() => buildClusters(events), [events]);

  // Auto scroll to current hour (or 8am)
  useEffect(() => {
    if (!scrollRef.current) return;
    const targetMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 8 * 60;
    const scrollTo = Math.max(0, (targetMin / 60) * HOUR_HEIGHT - 80);
    scrollRef.current.scrollTop = scrollTo;
  }, [date.toDateString()]);

  // Drag handlers
  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dy = e.clientY - dragStartRef.current.pointerY;
      const dMin = Math.round((dy / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
      setDragOffsetMin(dMin);
    };
    const onUp = () => {
      if (dragStartRef.current && dragId) {
        const newStart = Math.max(0, Math.min(24 * 60 - dragStartRef.current.durationMin, dragStartRef.current.startMin + dragOffsetMin));
        const newEnd = newStart + dragStartRef.current.durationMin;
        const ev = events.find((x) => x.id === dragId);
        if (ev && Math.abs(dragOffsetMin) >= SNAP_MINUTES) {
          onUpdateTime(dragId, toTime(newStart), ev.end_time ? toTime(newEnd) : null);
        }
      }
      setDragId(null);
      setDragOffsetMin(0);
      dragStartRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragId, dragOffsetMin, events, onUpdateTime]);

  const startDrag = (e: React.PointerEvent, ev: DayGridEvent) => {
    if (!ev.start_time) return;
    e.stopPropagation();
    const s = toMinutes(ev.start_time)!;
    const eMin = toMinutes(ev.end_time) ?? s + 60;
    dragStartRef.current = { pointerY: e.clientY, startMin: s, durationMin: Math.max(30, eMin - s) };
    setDragId(ev.id);
    setDragOffsetMin(0);
  };

  const handleGridClick = (e: React.MouseEvent) => {
    if (!gridRef.current || dragId) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = Math.max(0, Math.min(24 * 60 - 1, (y / HOUR_HEIGHT) * 60));
    const snapped = Math.floor(mins / SNAP_MINUTES) * SNAP_MINUTES;
    onAddAtTime(date, Math.floor(snapped / 60), snapped % 60);
  };

  const containerHeight = isFullscreen ? "calc(100vh - 240px)" : "560px";
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : null;

  return (
    <div className="space-y-2">
      {/* All-day / recurring */}
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-white/10 bg-black/30">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center">All day</span>
          {allDay.map((ev) => (
            <div
              key={ev.id}
              className="group relative text-xs px-2 py-1 rounded font-semibold"
              style={{ backgroundColor: getCategoryColor(ev.category), color: "hsl(0,0%,0%)" }}
            >
              {ev.is_ongoing && "🔄 "}
              {ev.title}
              <button
                onClick={() => onDelete(ev.id)}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete event"
              >
                <Trash2 className="inline h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="relative overflow-y-auto rounded-md border border-white/10 bg-black/20"
        style={{ height: containerHeight }}
      >
        <div className="relative flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour gutter */}
          <div className="w-14 flex-shrink-0 border-r border-white/10 relative">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-muted-foreground pr-1 text-right"
                style={{ top: h * HOUR_HEIGHT - 6, height: 12 }}
              >
                {pad(h)}:00
              </div>
            ))}
          </div>

          {/* Grid + events */}
          <div
            ref={gridRef}
            onClick={handleGridClick}
            className="relative flex-1 cursor-crosshair"
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Hour lines */}
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-white/5"
                style={{ top: h * HOUR_HEIGHT }}
              />
            ))}
            {/* Half-hour lines */}
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={`half-${h}`}
                className="absolute left-0 right-0 border-t border-dashed border-white/5"
                style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Now line */}
            {nowMin !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: (nowMin / 60) * HOUR_HEIGHT }}
              >
                <div className="h-px bg-[hsl(43,49%,61%)] relative">
                  <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[hsl(43,49%,61%)]" />
                </div>
              </div>
            )}

            {/* Clusters */}
            {clusters.map((cluster, ci) => {
              if (cluster.events.length === 1) {
                const ev = cluster.events[0];
                const s = toMinutes(ev.start_time)!;
                const eMin = toMinutes(ev.end_time) ?? s + 60;
                const dur = Math.max(30, eMin - s);
                const offset = dragId === ev.id ? dragOffsetMin : 0;
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => startDrag(e, ev)}
                    className="group absolute left-1 right-1 rounded-md shadow-md select-none cursor-grab active:cursor-grabbing overflow-hidden"
                    style={{
                      top: ((s + offset) / 60) * HOUR_HEIGHT,
                      height: (dur / 60) * HOUR_HEIGHT - 2,
                      backgroundColor: getCategoryColor(ev.category),
                      color: "hsl(0,0%,0%)",
                      zIndex: dragId === ev.id ? 30 : 10,
                      opacity: dragId === ev.id ? 0.85 : 1,
                    }}
                  >
                    <div className="p-1.5 text-xs font-bold flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="truncate">{ev.is_ongoing && "🔄 "}{ev.title}</div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium">
                          <Clock className="h-2.5 w-2.5" />
                          {toTime(s + offset)}{ev.end_time && ` - ${toTime(s + offset + dur)}`}
                        </div>
                        {ev.description && dur >= 60 && (
                          <div className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{ev.description}</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Multi-event cluster -> show N+ chip popover
              const dur = Math.max(30, cluster.endMin - cluster.startMin);
              return (
                <Popover key={`cluster-${ci}`}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-1 right-1 rounded-md border-2 border-dashed bg-[hsl(43,49%,61%)] text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all z-10"
                      style={{
                        top: (cluster.startMin / 60) * HOUR_HEIGHT,
                        height: (dur / 60) * HOUR_HEIGHT - 2,
                        borderColor: "rgba(0,0,0,0.3)",
                      }}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {cluster.events.length}+ tasks · {toTime(cluster.startMin)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-2 bg-popover border-border" align="start">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                      {cluster.events.length} overlapping tasks
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {cluster.events.map((ev) => (
                        <div
                          key={ev.id}
                          className="group flex items-start gap-2 p-2 rounded"
                          style={{ backgroundColor: getCategoryColor(ev.category), color: "hsl(0,0%,0%)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">
                              {ev.is_ongoing && "🔄 "}{ev.title}
                            </div>
                            {ev.start_time && (
                              <div className="text-[10px] opacity-80 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {ev.start_time}{ev.end_time && ` - ${ev.end_time}`}
                              </div>
                            )}
                            {ev.description && (
                              <div className="text-[10px] opacity-70 mt-0.5">{ev.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => onDelete(ev.id)}
                            className="opacity-60 hover:opacity-100"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Click any empty slot to add an event · drag an event up or down to reschedule
      </p>
    </div>
  );
};