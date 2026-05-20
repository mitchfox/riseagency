import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Users } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface Settings {
  id: string;
  mode: "week" | "day";
  weekly_hours_total: number;
  daily_hours: Record<string, number>;
}
interface Allocation {
  id: string;
  time_item_id: string | null;
  custom_label: string | null;
  player_type: "youth" | "pro";
  hours_per_week: number;
  day_of_week: string | null;
  display_order: number;
}
interface TimeItem { id: string; title: string; category_id: string; }

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

const Cylinder = ({ used, projected, max, label }: { used: number; projected: number; max: number; label: string }) => {
  const pct = (n: number) => Math.min(100, max > 0 ? (n / max) * 100 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground uppercase tracking-wider font-bbh">{label}</span>
        <span className="text-foreground/80">
          <span className="text-primary font-semibold">{used.toFixed(1)}h</span>
          {" / "}
          <span>{max}h</span>
          {projected > 0 && projected !== used && (
            <span className="ml-2 text-muted-foreground">(proj. {projected.toFixed(1)}h)</span>
          )}
        </span>
      </div>
      <div className="relative h-6 w-full overflow-hidden rounded-full border border-border bg-card/40">
        <div className="absolute left-0 top-0 h-full bg-primary/70 transition-all" style={{ width: `${pct(used)}%` }} />
        {projected > used && (
          <div className="absolute top-0 h-full border-r-2 border-dashed border-primary/80" style={{ left: `${pct(projected)}%`, width: 1 }} />
        )}
        {used > max && (
          <div className="absolute right-1 top-0 h-full flex items-center text-[10px] uppercase tracking-wider text-destructive-foreground bg-destructive/80 px-2 rounded-l">
            Over capacity
          </div>
        )}
      </div>
    </div>
  );
};

export const CapacityPlanner = ({ unlocked, token, onChange }: { unlocked: boolean; token: string; onChange?: () => void }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [timeItems, setTimeItems] = useState<TimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, a, t] = await Promise.all([
      (supabase as any).from("investor_capacity_settings").select("*").maybeSingle(),
      (supabase as any).from("investor_capacity_allocations").select("*").order("display_order"),
      (supabase as any).from("investor_time_items").select("id, title, category_id").order("display_order"),
    ]);
    setSettings(s.data || { id: "", mode: "week", weekly_hours_total: 40, daily_hours: { mon:8,tue:8,wed:8,thu:8,fri:8,sat:0,sun:0 } });
    setAllocations(a.data || []);
    setTimeItems(t.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const call = async (action: string, payload: any) => {
    const { data, error } = await invokeEdgeFunction("investor-overview-write", { body: { token, action, payload } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Save failed"); return false; }
    await load();
    onChange?.();
    return true;
  };

  const totals = useMemo(() => {
    const youth = allocations.filter(a => a.player_type === "youth").reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
    const pro = allocations.filter(a => a.player_type === "pro").reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
    const maxWeek = settings?.weekly_hours_total || 40;
    const playersYouth = youth > 0 ? Math.floor(maxWeek / youth) : 0;
    const playersPro = pro > 0 ? Math.floor(maxWeek / pro) : 0;
    return { youth, pro, maxWeek, playersYouth, playersPro, total: youth + pro };
  }, [allocations, settings]);

  const titleFor = (a: Allocation): string => {
    if (a.custom_label) return a.custom_label;
    const t = timeItems.find(i => i.id === a.time_item_id);
    return t?.title || "Untitled task";
  };

  if (loading || !settings) {
    return <div className="text-muted-foreground text-sm py-6">Loading capacity…</div>;
  }

  const mode = settings.mode;

  return (
    <div className="space-y-6">
      {/* Settings header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-widest font-bbh text-muted-foreground">View</span>
          <Select value={mode} onValueChange={(v) => unlocked && call("upsertCapacitySettings", { mode: v })} disabled={!unlocked}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day-by-day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode === "week" ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase font-bbh tracking-widest">Weekly limit</span>
            <Input
              type="number" min={0} step={1} className="h-8 w-24"
              value={settings.weekly_hours_total}
              disabled={!unlocked}
              onChange={(e) => setSettings({ ...settings, weekly_hours_total: Number(e.target.value) || 0 })}
              onBlur={(e) => unlocked && call("upsertCapacitySettings", { weekly_hours_total: Number(e.target.value) || 0 })}
            />
            <span>hours</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {DAYS.map(d => (
              <label key={d.key} className="flex items-center gap-1">
                <span className="text-muted-foreground w-7">{d.label}</span>
                <Input
                  type="number" min={0} step={0.5} className="h-7 w-14"
                  value={settings.daily_hours[d.key] ?? 0}
                  disabled={!unlocked}
                  onChange={(e) => setSettings({ ...settings, daily_hours: { ...settings.daily_hours, [d.key]: Number(e.target.value) || 0 } })}
                  onBlur={(e) => unlocked && call("upsertCapacitySettings", { daily_hours: { ...settings.daily_hours, [d.key]: Number(e.target.value) || 0 } })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Cylinder(s) */}
      {mode === "week" ? (
        <Cylinder used={totals.total} projected={totals.total} max={totals.maxWeek} label="Combined weekly load" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DAYS.map(d => {
            const dayUsed = allocations.filter(a => a.day_of_week === d.key).reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
            return <Cylinder key={d.key} used={dayUsed} projected={dayUsed} max={settings.daily_hours[d.key] ?? 0} label={d.label} />;
          })}
        </div>
      )}

      {/* Capacity summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground"><Users className="h-3.5 w-3.5" /> Youth player capacity</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{totals.playersYouth}</div>
          <div className="text-xs text-muted-foreground">at {totals.youth.toFixed(1)}h per player / week</div>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground"><Users className="h-3.5 w-3.5" /> Pro player capacity</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{totals.playersPro}</div>
          <div className="text-xs text-muted-foreground">at {totals.pro.toFixed(1)}h per player / week</div>
        </div>
      </div>

      {/* Allocation columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["youth","pro"] as const).map(pt => (
          <div key={pt} className="rounded-lg border border-border bg-card/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest font-bbh">{pt === "youth" ? "Youth Player" : "Pro Player"}</h3>
              {unlocked && (
                <AddAllocationInline timeItems={timeItems} mode={mode} onAdd={(p) => call("upsertCapacityAllocation", { ...p, player_type: pt })} />
              )}
            </div>
            <ul className="space-y-1.5">
              {allocations.filter(a => a.player_type === pt).map(a => (
                <li key={a.id} className="flex items-center gap-2 rounded border border-border/60 bg-card/40 px-2.5 py-1.5 text-sm">
                  <span className="flex-1 truncate">{titleFor(a)}</span>
                  {mode === "day" && a.day_of_week && (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.day_of_week}</span>
                  )}
                  <Input
                    type="number" min={0} step={0.25} className="h-7 w-16 text-right"
                    defaultValue={a.hours_per_week} disabled={!unlocked}
                    onBlur={(e) => unlocked && Number(e.target.value) !== a.hours_per_week && call("upsertCapacityAllocation", { id: a.id, time_item_id: a.time_item_id, custom_label: a.custom_label, player_type: pt, hours_per_week: Number(e.target.value), day_of_week: a.day_of_week })}
                  />
                  <span className="text-xs text-muted-foreground">h/wk</span>
                  {unlocked && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => call("deleteCapacityAllocation", { id: a.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
              {allocations.filter(a => a.player_type === pt).length === 0 && (
                <li className="text-xs text-muted-foreground italic py-2">No tasks allocated yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const AddAllocationInline = ({ timeItems, mode, onAdd }: { timeItems: TimeItem[]; mode: "week" | "day"; onAdd: (p: any) => Promise<boolean> }) => {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [hours, setHours] = useState("1");
  const [day, setDay] = useState("mon");

  if (!open) {
    return <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={taskId || "custom"} onValueChange={(v) => setTaskId(v === "custom" ? "" : v)}>
        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Task" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom label</SelectItem>
          {timeItems.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
        </SelectContent>
      </Select>
      {!taskId && <Input className="h-7 w-28 text-xs" placeholder="Label" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      <Input type="number" min={0} step={0.25} className="h-7 w-14 text-xs" value={hours} onChange={(e) => setHours(e.target.value)} />
      {mode === "day" && (
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Button size="sm" className="h-7 px-2" onClick={async () => {
        const okSave = await onAdd({
          time_item_id: taskId || null, custom_label: taskId ? null : (custom || "Untitled"),
          hours_per_week: Number(hours) || 0, day_of_week: mode === "day" ? day : null,
        });
        if (okSave) { setOpen(false); setTaskId(""); setCustom(""); setHours("1"); }
      }}>Save</Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
};
