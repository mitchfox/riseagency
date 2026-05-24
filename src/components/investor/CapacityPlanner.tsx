import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Users, Info } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface Settings {
  id: string;
  mode: "week" | "day" | "month";
  weekly_hours_total: number;
  monthly_hours_total: number;
  daily_hours: Record<string, number>;
  current_youth_players?: number;
  current_pro_players?: number;
  staff_weekly_limits?: Record<string, number>;
}
interface AssignedStaff { staff_id: string; hours: number; }
interface Allocation {
  id: string;
  time_item_id: string | null;
  custom_label: string | null;
  player_type: "youth" | "pro" | "ongoing";
  hours_per_week: number;
  day_of_week: string | null;
  days_of_week: string[] | null;
  display_order: number;
  assigned_staff: AssignedStaff[];
}
interface TimeItem { id: string; title: string; category_id: string; }
export interface CapacityStaffMember { id: string; full_name: string | null; email: string | null; roles: string[]; }

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

// Vertical liquid battery — animated, with wave at the top of the fill.
const LiquidBattery = ({ used, max, label, size = "lg" }: { used: number; max: number; label: string; size?: "lg" | "sm" }) => {
  const pct = Math.max(0, Math.min(100, max > 0 ? (used / max) * 100 : 0));
  const over = used > max;
  const fillColor = over
    ? "bg-gradient-to-t from-destructive via-destructive/90 to-destructive/70"
    : pct > 85
      ? "bg-gradient-to-t from-amber-500 via-amber-400 to-amber-300"
      : "bg-gradient-to-t from-primary via-primary/90 to-primary/70";
  const dims = size === "lg" ? "h-56 w-28 md:h-64 md:w-32" : "h-32 w-16";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-[10px] uppercase tracking-widest font-bbh text-muted-foreground text-center max-w-[120px] truncate`}>
        {label}
      </div>
      <div className="relative">
        {/* Battery cap */}
        <div className="mx-auto h-1.5 w-8 rounded-t bg-border" />
        {/* Battery body */}
        <div className={`relative ${dims} rounded-lg border-2 border-border bg-card/40 overflow-hidden shadow-inner`}>
          {/* Fill */}
          <div
            className={`absolute left-0 right-0 bottom-0 transition-all duration-700 ease-out ${fillColor}`}
            style={{ height: `${pct}%` }}
          >
            {/* Animated wave on top of the fill */}
            <svg
              className="absolute -top-2 left-0 w-[200%] h-3 text-current opacity-80 animate-[liquid-wave_3s_ease-in-out_infinite]"
              viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true"
            >
              <path d="M0 15 Q150 0 300 15 T600 15 T900 15 T1200 15 V30 H0 Z" fill="currentColor" />
            </svg>
            {/* Subtle highlight gloss */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none" />
            {/* Floating bubbles */}
            {pct > 5 && (
              <>
                <span className="absolute left-2 bottom-2 h-1.5 w-1.5 rounded-full bg-white/40 animate-[bubble-rise_4s_ease-in_infinite]" />
                <span className="absolute right-3 bottom-4 h-1 w-1 rounded-full bg-white/30 animate-[bubble-rise_5s_ease-in_infinite_.8s]" />
                <span className="absolute left-1/2 bottom-0 h-1 w-1 rounded-full bg-white/30 animate-[bubble-rise_6s_ease-in_infinite_1.6s]" />
              </>
            )}
          </div>
          {/* Tick marks */}
          {[25, 50, 75].map(t => (
            <div key={t} className="absolute left-0 right-0 border-t border-border/40" style={{ bottom: `${t}%` }} />
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-foreground tabular-nums">
          {used.toFixed(1)}<span className="text-xs text-muted-foreground">/{max}h</span>
        </div>
        <div className={`text-[10px] uppercase tracking-widest font-bbh ${over ? "text-destructive" : pct > 85 ? "text-amber-400" : "text-primary"}`}>
          {over ? "Over capacity" : `${Math.round(pct)}% used`}
        </div>
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-3">
    <span className="font-bbh uppercase tracking-widest text-foreground/70">Key</span>
    <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-gradient-to-t from-primary to-primary/70" /> Healthy load</span>
    <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-gradient-to-t from-amber-500 to-amber-300" /> Near limit (&gt;85%)</span>
    <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-gradient-to-t from-destructive to-destructive/70" /> Over capacity</span>
    <span className="flex items-center gap-1.5 ml-auto"><Info className="h-3 w-3" /> Hours roll up from allocated tasks per player profile.</span>
  </div>
);

export const CapacityPlanner = ({ unlocked, token, onChange, staffMembers = [] }: { unlocked: boolean; token: string; onChange?: () => void; staffMembers?: CapacityStaffMember[] }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [timeItems, setTimeItems] = useState<TimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Local view mode lets read-only viewers flip between week/day/month without saving.
  const [viewMode, setViewMode] = useState<"week" | "day" | "month">("week");
  const [focusedDay, setFocusedDay] = useState<string>("mon");
  // "all" = combined view; otherwise a single staff_id (filter to their own hours)
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [s, a, t] = await Promise.all([
      (supabase as any).from("investor_capacity_settings").select("*").maybeSingle(),
      (supabase as any).from("investor_capacity_allocations").select("*").order("display_order"),
      (supabase as any).from("investor_time_items").select("id, title, category_id").order("display_order"),
    ]);
    const settingsRow = s.data || { id: "", mode: "week", weekly_hours_total: 40, monthly_hours_total: 160, daily_hours: { mon:8,tue:8,wed:8,thu:8,fri:8,sat:0,sun:0 } };
    setSettings({
      ...settingsRow,
      current_youth_players: settingsRow.current_youth_players ?? 0,
      current_pro_players: settingsRow.current_pro_players ?? 0,
      staff_weekly_limits: settingsRow.staff_weekly_limits || {},
    });
    setViewMode((prev) => prev || (settingsRow.mode as any) || "week");
    setAllocations((a.data || []).map((row: any) => ({
      ...row,
      days_of_week: Array.isArray(row.days_of_week) ? row.days_of_week : [],
      assigned_staff: Array.isArray(row.assigned_staff) ? row.assigned_staff : [],
    })));
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

  // Hours for an allocation depend on whether we are filtering by a specific staff member.
  const hoursFor = (a: Allocation): number => {
    if (staffFilter === "all") return Number(a.hours_per_week || 0);
    const entry = (a.assigned_staff || []).find(s => s.staff_id === staffFilter);
    return entry ? Number(entry.hours || 0) : 0;
  };
  // Filter allocations to those the current staff member is assigned to (or all).
  const visibleAllocations = staffFilter === "all"
    ? allocations
    : allocations.filter(a => (a.assigned_staff || []).some(s => s.staff_id === staffFilter));

  // Combined weekly limit = sum of every staff member's individual limit.
  // Falls back to the legacy single weekly_hours_total when no per-staff values exist.
  const staffLimits = settings?.staff_weekly_limits || {};
  const combinedStaffLimit = useMemo(() => {
    const sum = Object.values(staffLimits).reduce((acc, v) => acc + (Number(v) || 0), 0);
    return sum > 0 ? sum : (settings?.weekly_hours_total || 0);
  }, [staffLimits, settings?.weekly_hours_total]);

  // Allocation total counts each multi-day allocation just once for combined weekly load.
  const totals = useMemo(() => {
    // Filter-aware figures drive the batteries (combined view = totals, staff view = that staff's share).
    const youth = visibleAllocations.filter(a => a.player_type === "youth").reduce((s, a) => s + hoursFor(a), 0);
    const pro = visibleAllocations.filter(a => a.player_type === "pro").reduce((s, a) => s + hoursFor(a), 0);
    const ongoing = visibleAllocations.filter(a => a.player_type === "ongoing").reduce((s, a) => s + hoursFor(a), 0);
    // Player capacity is always based on combined firm-wide hours, never per-staff slices.
    const youthAll = allocations.filter(a => a.player_type === "youth").reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
    const proAll = allocations.filter(a => a.player_type === "pro").reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
    const ongoingAll = allocations.filter(a => a.player_type === "ongoing").reduce((s, a) => s + Number(a.hours_per_week || 0), 0);
    const maxWeek = staffFilter === "all"
      ? combinedStaffLimit
      : Number(staffLimits[staffFilter] || 0);
    const maxMonth = settings?.monthly_hours_total || 160;
    // Effective free capacity = combined weekly limit minus combined ongoing tasks.
    const free = Math.max(0, combinedStaffLimit - ongoingAll);
    const playersYouth = youthAll > 0 ? Math.floor(free / youthAll) : 0;
    const playersPro = proAll > 0 ? Math.floor(free / proAll) : 0;
    return { youth, pro, ongoing, maxWeek, maxMonth, playersYouth, playersPro, total: youth + pro + ongoing, youthAll, proAll, ongoingAll };
  }, [allocations, visibleAllocations, settings, staffFilter, combinedStaffLimit, staffLimits]);

  // Per-day load: an allocation contributes its hours_per_week to each day it covers.
  const loadForDay = (dayKey: string) =>
    visibleAllocations.reduce((sum, a) => {
      const days = (a.days_of_week && a.days_of_week.length > 0)
        ? a.days_of_week
        : (a.day_of_week ? [a.day_of_week] : []);
      return days.includes(dayKey) ? sum + hoursFor(a) : sum;
    }, 0);

  // Save handlers --------------------------------------------------------------
  // Edit hours from current view: in "all" view, edit hours_per_week directly;
  // in staff view, update the staff's share and recompute hours_per_week.
  const saveAllocationHours = async (a: Allocation, value: number) => {
    if (!unlocked) return;
    let next = { ...a };
    if (staffFilter === "all") {
      next.hours_per_week = value;
    } else {
      const existing = (a.assigned_staff || []).find(s => s.staff_id === staffFilter);
      const updated = existing
        ? (a.assigned_staff || []).map(s => s.staff_id === staffFilter ? { ...s, hours: value } : s)
        : [...(a.assigned_staff || []), { staff_id: staffFilter, hours: value }];
      next.assigned_staff = updated;
      next.hours_per_week = updated.reduce((sum, s) => sum + Number(s.hours || 0), 0);
    }
    await call("upsertCapacityAllocation", {
      id: next.id, time_item_id: next.time_item_id, custom_label: next.custom_label,
      player_type: next.player_type, hours_per_week: next.hours_per_week,
      day_of_week: next.day_of_week, days_of_week: next.days_of_week,
      assigned_staff: next.assigned_staff,
    });
  };

  // Toggle a staff member on/off for an allocation. Equally splits the existing
  // hours across all currently assigned members; manual edits override afterwards.
  const toggleStaffAssignment = async (a: Allocation, staffId: string) => {
    if (!unlocked) return;
    const has = (a.assigned_staff || []).some(s => s.staff_id === staffId);
    let nextStaff: AssignedStaff[];
    if (has) {
      nextStaff = (a.assigned_staff || []).filter(s => s.staff_id !== staffId);
    } else {
      nextStaff = [...(a.assigned_staff || []), { staff_id: staffId, hours: 0 }];
    }
    // Equal split of total task hours as a starting point
    const total = Number(a.hours_per_week || 0);
    if (nextStaff.length > 0) {
      const share = total / nextStaff.length;
      nextStaff = nextStaff.map(s => ({ ...s, hours: Number(share.toFixed(2)) }));
    }
    await call("upsertCapacityAllocation", {
      id: a.id, time_item_id: a.time_item_id, custom_label: a.custom_label,
      player_type: a.player_type, hours_per_week: total,
      day_of_week: a.day_of_week, days_of_week: a.days_of_week,
      assigned_staff: nextStaff,
    });
  };

  const staffLabel = (id: string): string => {
    const s = staffMembers.find(m => m.id === id);
    return s ? (s.full_name || s.email || "Staff") : "Staff";
  };

  const titleFor = (a: Allocation): string => {
    if (a.custom_label) return a.custom_label;
    const t = timeItems.find(i => i.id === a.time_item_id);
    return t?.title || "Untitled task";
  };

  if (loading || !settings) {
    return <div className="text-muted-foreground text-sm py-6">Loading capacity…</div>;
  }

  const mode = viewMode;
  const persistMode = (next: "week" | "day" | "month") => {
    setViewMode(next);
    if (unlocked) call("upsertCapacitySettings", { mode: next });
  };

  return (
    <div className="space-y-6">
      {/* Settings header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-widest font-bbh text-muted-foreground">View</span>
          <Select value={mode} onValueChange={(v) => persistMode(v as any)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day-by-day</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          {mode === "day" && (
            <Select value={focusedDay} onValueChange={setFocusedDay}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {staffMembers.length > 0 && (
            <>
              <span className="ml-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground">Staff</span>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff (totals)</SelectItem>
                  {staffMembers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email || "Staff"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {mode === "week" ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase font-bbh tracking-widest">
              {staffFilter === "all" ? "Combined weekly limit" : "Weekly limit"}
            </span>
            {staffFilter === "all" ? (
              staffMembers.length > 0 ? (
                <span className="h-8 inline-flex items-center px-3 rounded-md border border-border bg-card/40 text-sm tabular-nums">
                  {combinedStaffLimit.toFixed(0)}
                </span>
              ) : (
                <Input
                  type="number" min={0} step={1} className="h-8 w-24"
                  value={settings.weekly_hours_total}
                  disabled={!unlocked}
                  onChange={(e) => setSettings({ ...settings, weekly_hours_total: Number(e.target.value) || 0 })}
                  onBlur={(e) => unlocked && call("upsertCapacitySettings", { weekly_hours_total: Number(e.target.value) || 0 })}
                />
              )
            ) : (
              <Input
                key={`limit-${staffFilter}`}
                type="number" min={0} step={1} className="h-8 w-24"
                defaultValue={Number(staffLimits[staffFilter] || 0)}
                disabled={!unlocked}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                onBlur={(e) => {
                  if (!unlocked) return;
                  const v = Math.max(0, Number(e.target.value) || 0);
                  if (v === Number(staffLimits[staffFilter] || 0)) return;
                  call("upsertCapacitySettings", { staff_weekly_limits: { [staffFilter]: v } });
                }}
              />
            )}
            <span>hours</span>
            {staffFilter === "all" && staffMembers.length > 0 && (
              <span className="text-[10px] text-muted-foreground italic">
                sum of each staff member's limit
              </span>
            )}
          </div>
        ) : mode === "month" ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase font-bbh tracking-widest">Monthly limit</span>
            <Input
              type="number" min={0} step={1} className="h-8 w-24"
              value={settings.monthly_hours_total}
              disabled={!unlocked}
              onChange={(e) => setSettings({ ...settings, monthly_hours_total: Number(e.target.value) || 0 })}
              onBlur={(e) => unlocked && call("upsertCapacitySettings", { monthly_hours_total: Number(e.target.value) || 0 })}
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

      {/* Liquid batteries */}
      {mode === "week" && (
        <div className="flex flex-wrap items-end justify-center gap-8 py-4">
          <LiquidBattery used={totals.total} max={totals.maxWeek} label="Combined weekly load" />
          <LiquidBattery used={totals.youth} max={totals.maxWeek} label="Youth allocation" size="sm" />
          <LiquidBattery used={totals.pro} max={totals.maxWeek} label="Pro allocation" size="sm" />
          <LiquidBattery used={totals.ongoing} max={totals.maxWeek} label="Ongoing tasks" size="sm" />
        </div>
      )}
      {mode === "month" && (
        <div className="flex flex-wrap items-end justify-center gap-8 py-4">
          <LiquidBattery used={totals.total * 4.33} max={totals.maxMonth} label="Combined monthly load" />
          <LiquidBattery used={totals.youth * 4.33} max={totals.maxMonth} label="Youth allocation" size="sm" />
          <LiquidBattery used={totals.pro * 4.33} max={totals.maxMonth} label="Pro allocation" size="sm" />
          <LiquidBattery used={totals.ongoing * 4.33} max={totals.maxMonth} label="Ongoing tasks" size="sm" />
        </div>
      )}
      {mode === "day" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-center gap-4 py-2">
            {DAYS.map(d => (
              <button key={d.key} onClick={() => setFocusedDay(d.key)} className={`rounded-md p-1 transition ${focusedDay === d.key ? "ring-2 ring-primary" : ""}`}>
                <LiquidBattery used={loadForDay(d.key)} max={settings.daily_hours[d.key] ?? 0} label={d.label} size="sm" />
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <div className="text-xs uppercase tracking-widest font-bbh text-muted-foreground mb-2">
              {DAYS.find(d => d.key === focusedDay)?.label} — tasks scheduled
            </div>
            <ul className="space-y-1 text-sm">
              {allocations.filter(a => (a.days_of_week || []).includes(focusedDay) || a.day_of_week === focusedDay).map(a => (
                <li key={a.id} className="flex items-center justify-between border-b border-border/40 py-1">
                  <span className="truncate">{titleFor(a)}</span>
                  <span className="text-xs text-muted-foreground">{Number(a.hours_per_week).toFixed(1)}h • {a.player_type}</span>
                </li>
              ))}
              {allocations.filter(a => (a.days_of_week || []).includes(focusedDay) || a.day_of_week === focusedDay).length === 0 && (
                <li className="text-xs text-muted-foreground italic py-2">No tasks scheduled for this day.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <Legend />

      {/* Capacity summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground"><Users className="h-3.5 w-3.5" /> Youth player capacity</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{totals.playersYouth}</div>
          <div className="text-xs text-muted-foreground">at {totals.youth.toFixed(1)}h per player / week</div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase font-bbh tracking-widest">Currently signed</span>
            <Input
              type="number" min={0} step={1} className="h-7 w-16"
              value={settings.current_youth_players ?? 0}
              disabled={!unlocked}
              onChange={(e) => setSettings({ ...settings, current_youth_players: Math.max(0, parseInt(e.target.value) || 0) })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
              onBlur={(e) => unlocked && call("upsertCapacitySettings", { current_youth_players: Math.max(0, parseInt(e.target.value) || 0) })}
            />
            <span className={`text-[11px] ${((settings.current_youth_players ?? 0) > totals.playersYouth) ? "text-destructive" : "text-muted-foreground"}`}>
              {totals.playersYouth - (settings.current_youth_players ?? 0) >= 0
                ? `${totals.playersYouth - (settings.current_youth_players ?? 0)} headroom`
                : `${(settings.current_youth_players ?? 0) - totals.playersYouth} over capacity`}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bbh text-muted-foreground"><Users className="h-3.5 w-3.5" /> Pro player capacity</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{totals.playersPro}</div>
          <div className="text-xs text-muted-foreground">at {totals.pro.toFixed(1)}h per player / week</div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase font-bbh tracking-widest">Currently signed</span>
            <Input
              type="number" min={0} step={1} className="h-7 w-16"
              value={settings.current_pro_players ?? 0}
              disabled={!unlocked}
              onChange={(e) => setSettings({ ...settings, current_pro_players: Math.max(0, parseInt(e.target.value) || 0) })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
              onBlur={(e) => unlocked && call("upsertCapacitySettings", { current_pro_players: Math.max(0, parseInt(e.target.value) || 0) })}
            />
            <span className={`text-[11px] ${((settings.current_pro_players ?? 0) > totals.playersPro) ? "text-destructive" : "text-muted-foreground"}`}>
              {totals.playersPro - (settings.current_pro_players ?? 0) >= 0
                ? `${totals.playersPro - (settings.current_pro_players ?? 0)} headroom`
                : `${(settings.current_pro_players ?? 0) - totals.playersPro} over capacity`}
            </span>
          </div>
        </div>
      </div>

      {/* Allocation columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["youth","pro","ongoing"] as const).map(pt => (
          <div key={pt} className="rounded-lg border border-border bg-card/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest font-bbh">
                {pt === "youth" ? "Youth Player" : pt === "pro" ? "Pro Player" : "Ongoing Tasks"}
              </h3>
              {unlocked && (
                <AddAllocationInline timeItems={timeItems} onAdd={(p) => call("upsertCapacityAllocation", {
                  ...p,
                  player_type: pt,
                  // Auto-assign to current staff filter (and put all hours on them)
                  assigned_staff: staffFilter !== "all" ? [{ staff_id: staffFilter, hours: p.hours_per_week }] : [],
                })} />
              )}
            </div>
            <ul className="space-y-1.5">
              {visibleAllocations.filter(a => a.player_type === pt).map(a => (
                <li key={a.id} className="rounded border border-border/60 bg-card/40 px-2.5 py-1.5 text-sm space-y-1.5">
                  <div className="flex items-center gap-2">
                  <span className="flex-1 truncate">{titleFor(a)}</span>
                  <Input
                    type="number" min={0} step={0.25} className="h-7 w-16 text-right"
                    key={`${a.id}-${staffFilter}`}
                    defaultValue={hoursFor(a)} disabled={!unlocked}
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (v !== hoursFor(a)) saveAllocationHours(a, v);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">h/wk</span>
                  {unlocked && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => call("deleteCapacityAllocation", { id: a.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  </div>
                  {/* Staff assignment chips (admins + marketeers) */}
                  {staffMembers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Staff</span>
                      {staffMembers.map(s => {
                        const entry = (a.assigned_staff || []).find(x => x.staff_id === s.id);
                        const active = !!entry;
                        return (
                          <button
                            key={s.id} type="button" disabled={!unlocked}
                            onClick={() => toggleStaffAssignment(a, s.id)}
                            title={s.full_name || s.email || "Staff"}
                            className={`h-6 px-2 rounded text-[10px] uppercase tracking-tight border transition ${
                              active ? "bg-primary/20 border-primary text-primary" : "bg-card/40 border-border text-muted-foreground hover:border-border/80"
                            } ${unlocked ? "cursor-pointer" : "cursor-default opacity-70"}`}
                          >
                            {(s.full_name || s.email || "?").split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}
                            {active ? <span className="ml-1 text-[9px] opacity-80">{Number(entry!.hours || 0).toFixed(1)}h</span> : null}
                          </button>
                        );
                      })}
                      {(a.assigned_staff || []).length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Days</span>
                    {DAYS.map(d => {
                      const active = (a.days_of_week || []).includes(d.key) || a.day_of_week === d.key;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            if (!unlocked) return;
                            const current = new Set<string>(a.days_of_week || (a.day_of_week ? [a.day_of_week] : []));
                            if (current.has(d.key)) current.delete(d.key); else current.add(d.key);
                            call("upsertCapacityAllocation", {
                              id: a.id, time_item_id: a.time_item_id, custom_label: a.custom_label, player_type: pt,
                              hours_per_week: a.hours_per_week, day_of_week: null, days_of_week: Array.from(current),
                              assigned_staff: a.assigned_staff,
                            });
                          }}
                          className={`h-6 w-7 rounded text-[10px] uppercase tracking-tight border transition ${
                            active ? "bg-primary/20 border-primary text-primary" : "bg-card/40 border-border text-muted-foreground hover:border-border/80"
                          } ${unlocked ? "cursor-pointer" : "cursor-default opacity-70"}`}
                        >{d.label.slice(0,1)}</button>
                      );
                    })}
                  </div>
                </li>
              ))}
              {visibleAllocations.filter(a => a.player_type === pt).length === 0 && (
                <li className="text-xs text-muted-foreground italic py-2">No tasks allocated yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const AddAllocationInline = ({ timeItems, onAdd }: { timeItems: TimeItem[]; onAdd: (p: any) => Promise<boolean> }) => {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [hours, setHours] = useState("1");
  const [days, setDays] = useState<string[]>([]);

  if (!open) {
    return <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>;
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
      <div className="flex items-center gap-0.5">
        {DAYS.map(d => {
          const active = days.includes(d.key);
          return (
            <button key={d.key} type="button" onClick={() => setDays(p => p.includes(d.key) ? p.filter(x => x !== d.key) : [...p, d.key])}
              className={`h-6 w-6 rounded text-[9px] uppercase border ${active ? "bg-primary/20 border-primary text-primary" : "bg-card/40 border-border text-muted-foreground"}`}>{d.label.slice(0,1)}</button>
          );
        })}
      </div>
      <Button type="button" size="sm" className="h-7 px-2" onClick={async () => {
        const okSave = await onAdd({
          time_item_id: taskId || null, custom_label: taskId ? null : (custom || "Untitled"),
          hours_per_week: Number(hours) || 0, day_of_week: null, days_of_week: days,
        });
        if (okSave) { setOpen(false); setTaskId(""); setCustom(""); setHours("1"); setDays([]); }
      }}>Save</Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
};
