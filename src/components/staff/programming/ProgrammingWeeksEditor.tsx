import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Link2, Unlink, ChevronDown, CalendarRange } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useProgrammingSessions, ProgrammingSessionRef } from "./useProgrammingSessions";
import { SessionQuickEditDialog } from "./SessionQuickEditDialog";
import { getSessionColor } from "@/lib/sessionColors";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

const addDaysIso = (iso: string, days: number) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const weekOverlapsRange = (weekStart: string | null, rangeStart: string, rangeEnd: string) => {
  if (!weekStart) return true;
  const weekEnd = addDaysIso(weekStart, 6);
  return weekStart <= rangeEnd && weekEnd >= rangeStart;
};

interface Slot {
  refId?: string;
  free_text?: string;
}
interface Week {
  id: string;
  label: string | null;
  week_start_date: string | null;
  display_order: number;
  slots: Partial<Record<Day, Slot>>;
}

interface Props {
  playerId: string;
  /**
   * When set, scopes the editor to the weeks linked to a specific programme.
   * "Add week" both creates a global week AND links it to the programme.
   * Delete becomes "unlink from programme" (the underlying week stays).
   */
  programmeLink?: {
    table: "player_programs" | "technical_programs" | "sps_programs";
    programmeId: string;
  };
  /** When true, hides the embedded "Master schedule" collapsible (used to avoid recursion). */
  hideMasterCollapsible?: boolean;
  hideProgramDateControls?: boolean;
}

export const ProgrammingWeeksEditor = ({ playerId, programmeLink, hideMasterCollapsible, hideProgramDateControls }: Props) => {
  const [masterOpen, setMasterOpen] = useState(false);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [allPlayerWeeks, setAllPlayerWeeks] = useState<Week[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProgrammingSessionRef | null>(null);
  const [programmeRange, setProgrammeRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [showOutsideRange, setShowOutsideRange] = useState(false);
  const { sessions, reload: reloadSessions } = useProgrammingSessions(playerId);

  const refIndex = useMemo(() => {
    const m = new Map<string, ProgrammingSessionRef>();
    sessions.forEach(s => m.set(s.refId, s));
    return m;
  }, [sessions]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("programming_weeks" as any)
      .select("*")
      .eq("player_id", playerId)
      .order("display_order")
      .order("created_at");
    if (error) toast.error(error.message);
    const allRows = ((data || []) as any[]).map(w => ({ ...w, slots: w.slots || {} })) as Week[];
    setAllPlayerWeeks(allRows);

    if (programmeLink) {
      const selectCols = programmeLink.table === "player_programs"
        ? "linked_week_ids, start_date, end_date"
        : "linked_week_ids, start_date, end_date";
      const { data: prog, error: pErr } = await supabase
        .from(programmeLink.table as any)
        .select(selectCols)
        .eq("id", programmeLink.programmeId)
        .single();
      if (pErr) toast.error(pErr.message);
      const ids: string[] = (((prog as any)?.linked_week_ids) || []) as string[];
      setProgrammeRange({
        start: (prog as any)?.start_date ?? null,
        end: (prog as any)?.end_date ?? null,
      });
      setLinkedIds(ids);
      const ordered = ids
        .map(id => allRows.find(w => w.id === id))
        .filter(Boolean) as Week[];
      setWeeks(ordered);
    } else {
      setLinkedIds([]);
      setProgrammeRange({ start: null, end: null });
      setWeeks(allRows);
    }
    setLoading(false);
  }, [playerId, programmeLink?.table, programmeLink?.programmeId]);

  useEffect(() => { load(); }, [load]);

  /** Weeks that fall inside the parent programme's start/end window. */
  const filteredWeeks = useMemo(() => {
    if (!programmeLink || !programmeRange.start || !programmeRange.end) return weeks;
    // Chronological sort regardless of display_order.
    const sorted = [...weeks].sort((a, b) => {
      const av = a.week_start_date || "9999-12-31";
      const bv = b.week_start_date || "9999-12-31";
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    if (showOutsideRange) return sorted;
    return sorted.filter(w => {
      if (!w.week_start_date) return true;
      return weekOverlapsRange(w.week_start_date, programmeRange.start!, programmeRange.end!);
    });
  }, [weeks, programmeLink, programmeRange, showOutsideRange]);

  const outsideCount = useMemo(() => {
    if (!programmeLink || !programmeRange.start || !programmeRange.end) return 0;
    return weeks.filter(w =>
      w.week_start_date && !weekOverlapsRange(w.week_start_date, programmeRange.start!, programmeRange.end!)
    ).length;
  }, [weeks, programmeLink, programmeRange]);

  const setLinkedIdsRemote = async (ids: string[]) => {
    if (!programmeLink) return;
    const unique = Array.from(new Set(ids));
    const { error } = await supabase
      .from(programmeLink.table as any)
      .update({ linked_week_ids: unique } as any)
      .eq("id", programmeLink.programmeId);
    if (error) return toast.error(error.message);
    load();
  };

  const updateProgrammeRange = async (patch: Partial<typeof programmeRange>) => {
    if (!programmeLink) return;
    const next = { ...programmeRange, ...patch };
    if (next.start && next.end && next.end < next.start) {
      toast.error("End date cannot be before start date");
      return;
    }
    setProgrammeRange(next);
    const { error } = await supabase
      .from(programmeLink.table as any)
      .update(patch as any)
      .eq("id", programmeLink.programmeId);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  /** Create one programming_weeks row per Monday inside the programme date range
   * that isn't already linked, and link each new one to the programme. */
  const generateWeeksForPeriod = async () => {
    if (!programmeLink || !programmeRange.start || !programmeRange.end) return;
    const startM = programmeRange.start.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const endM = programmeRange.end.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!startM || !endM) return;
    const startDate = new Date(Date.UTC(+startM[1], +startM[2] - 1, +startM[3]));
    const endDate = new Date(Date.UTC(+endM[1], +endM[2] - 1, +endM[3]));
    // Snap start to Monday on/before the start date
    const day = startDate.getUTCDay(); // 0=Sun
    const back = day === 0 ? 6 : day - 1;
    const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() - back));
    const existingByDate = new Map(
      allPlayerWeeks.filter(w => w.week_start_date).map(w => [w.week_start_date as string, w] as const)
    );
    const isoOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const newRows: any[] = [];
    const toLink: string[] = [];
    let weekNum = 1;
    while (cursor.getTime() <= endDate.getTime()) {
      const iso = isoOf(cursor);
      if (!existingByDate.has(iso)) {
        newRows.push({
          player_id: playerId,
          label: `Week ${weekNum}`,
          week_start_date: iso,
          display_order: allPlayerWeeks.length + newRows.length,
          slots: {},
        });
      } else {
        // Existing week — link it if it's not already linked
        const existing = existingByDate.get(iso);
        if (existing && !linkedIds.includes(existing.id)) toLink.push(existing.id);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      weekNum += 1;
    }
    if (newRows.length) {
      const { data: inserted, error } = await supabase
        .from("programming_weeks" as any)
        .insert(newRows)
        .select("id");
      if (error) return toast.error(error.message);
      ((inserted || []) as any[]).forEach(r => toLink.push(r.id));
    }
    if (toLink.length) {
      await setLinkedIdsRemote([...linkedIds, ...toLink]);
    } else {
      toast.success("All weeks in this period are already linked");
    }
  };

  const addWeek = async () => {
    const baseCount = allPlayerWeeks.length;
    const { data: inserted, error } = await supabase
      .from("programming_weeks" as any)
      .insert({
        player_id: playerId,
        label: `Week ${baseCount + 1}`,
        display_order: baseCount,
        slots: {},
      } as any)
      .select("id")
      .single();
    if (error || !inserted) return toast.error(error?.message || "Failed to add week");
    if (programmeLink) {
      await setLinkedIdsRemote([...linkedIds, (inserted as any).id]);
    } else {
      load();
    }
  };

  const addNextWeek = async () => {
    const baseCount = allPlayerWeeks.length;
    // Find the most recent dated week in the current view; clone its slots and
    // its full label/date forward by 7 days.
    const datedWeeks = weeks
      .filter(w => !!w.week_start_date)
      .sort((a, b) => (a.week_start_date! < b.week_start_date! ? -1 : 1));
    const source: Week | undefined = datedWeeks[datedWeeks.length - 1] ?? weeks[weeks.length - 1];
    // Use UTC throughout so a BST/CET browser doesn't shift the date
    // back a day when we serialise with toISOString().
    let nextStart: Date;
    if (source?.week_start_date) {
      const m = source.week_start_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        nextStart = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 7));
      } else {
        const tmp = new Date(source.week_start_date);
        nextStart = new Date(Date.UTC(tmp.getFullYear(), tmp.getMonth(), tmp.getDate() + 7));
      }
    } else {
      const today = new Date();
      const day = today.getUTCDay();
      const offset = day === 0 ? 1 : (8 - day);
      nextStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
    }
    const iso = `${nextStart.getUTCFullYear()}-${String(nextStart.getUTCMonth() + 1).padStart(2, "0")}-${String(nextStart.getUTCDate()).padStart(2, "0")}`;
    // Carry over the source week's sessions / free-text slots so the new week
    // starts fully populated. The session refs point to the same underlying
    // programme sessions, so any edits to a session apply across weeks as before.
    const clonedSlots = source?.slots ? JSON.parse(JSON.stringify(source.slots)) : {};
    // Generate a sensible label — increment trailing number if present, else append "(next)".
    const baseLabel = source?.label || `Week ${baseCount}`;
    const numMatch = baseLabel.match(/^(.*?)(\d+)(\s*)$/);
    const nextLabel = numMatch
      ? `${numMatch[1]}${parseInt(numMatch[2], 10) + 1}${numMatch[3]}`
      : `Week ${baseCount + 1}`;
    const { data: inserted, error } = await supabase
      .from("programming_weeks" as any)
      .insert({
        player_id: playerId,
        label: nextLabel,
        week_start_date: iso,
        display_order: baseCount,
        slots: clonedSlots,
      } as any)
      .select("id")
      .single();
    if (error || !inserted) return toast.error(error?.message || "Failed to add next week");
    if (programmeLink) {
      await setLinkedIdsRemote([...linkedIds, (inserted as any).id]);
    } else {
      load();
    }
  };

  const updateWeek = async (id: string, patch: Partial<Week>) => {
    setWeeks(prev => prev.map(w => w.id === id ? { ...w, ...patch } as Week : w));
    const { error } = await supabase.from("programming_weeks" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteWeek = async (id: string) => {
    if (programmeLink) {
      if (!confirm("Unlink this week from the programme? The week itself stays in the player's master schedule.")) return;
      await setLinkedIdsRemote(linkedIds.filter(i => i !== id));
      return;
    }
    if (!confirm("Delete this week from the player's master schedule? This removes it from every programme that links to it.")) return;
    const { error } = await supabase.from("programming_weeks" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const setSlot = async (week: Week, day: Day, slot: Slot | null) => {
    const nextSlots = { ...week.slots };
    if (slot === null) delete nextSlots[day]; else nextSlots[day] = slot;
    updateWeek(week.id, { slots: nextSlots } as any);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading schedule…</p>;

  const linkable = programmeLink ? allPlayerWeeks.filter(w => !linkedIds.includes(w.id)) : [];
  const visibleWeeks = filteredWeeks;
  const rangeActive = !!(programmeLink && programmeRange.start && programmeRange.end);
  const rangeLabel = rangeActive
    ? `${visibleWeeks.length} ${visibleWeeks.length === 1 ? "week" : "weeks"} between ${programmeRange.start} and ${programmeRange.end}`
    : null;

  return (
    <div className="space-y-3">
      {programmeLink && !hideMasterCollapsible && (
        <Collapsible open={masterOpen} onOpenChange={setMasterOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide">Master schedule (all weeks)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${masterOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <Card className="bg-muted/20">
              <CardContent className="pt-4">
                <ProgrammingWeeksEditor playerId={playerId} hideMasterCollapsible />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-sm">{programmeLink ? "Programme weeks" : "Player master schedule"}</h4>
        <div className="flex gap-2">
          {programmeLink && (
            <Popover open={linkPickerOpen} onOpenChange={setLinkPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" disabled={linkable.length === 0}>
                  <Link2 className="w-3.5 h-3.5 mr-1" />Link existing week
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Player weeks</div>
                  {linkable.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-3">All player weeks already linked.</p>
                  )}
                  {linkable.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => { setLinkedIdsRemote([...linkedIds, w.id]); setLinkPickerOpen(false); }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs"
                    >
                      <span className="font-medium">{w.label || "Untitled week"}</span>
                      {w.week_start_date && <span className="text-muted-foreground ml-2">{w.week_start_date}</span>}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {rangeActive && (
            <Button size="sm" variant="outline" onClick={generateWeeksForPeriod}>
              <CalendarRange className="w-3.5 h-3.5 mr-1" />Generate weeks for this period
            </Button>
          )}
          <Button size="sm" onClick={addWeek}><Plus className="w-3.5 h-3.5 mr-1" />Add week</Button>
          <Button size="sm" variant="secondary" onClick={addNextWeek}><Plus className="w-3.5 h-3.5 mr-1" />Add next week</Button>
        </div>
      </div>

      {programmeLink && !hideProgramDateControls && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 px-3 py-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Programme start</label>
            <Input
              type="date"
              value={programmeRange.start || ""}
              onChange={(e) => updateProgrammeRange({ start: e.target.value || null })}
              className="h-8 w-[150px] text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Programme end</label>
            <Input
              type="date"
              value={programmeRange.end || ""}
              onChange={(e) => updateProgrammeRange({ end: e.target.value || null })}
              className="h-8 w-[150px] text-xs"
            />
          </div>
        </div>
      )}

      {rangeActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border rounded px-3 py-2">
          <CalendarRange className="w-3.5 h-3.5" />
          <span>Showing {rangeLabel}.</span>
          {outsideCount > 0 && (
            <button
              type="button"
              onClick={() => setShowOutsideRange(v => !v)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {showOutsideRange ? "Hide" : `Show ${outsideCount} outside this period`}
            </button>
          )}
        </div>
      )}

      {programmeLink && rangeActive && linkedIds.length === 0 && allPlayerWeeks.some(w => w.week_start_date && weekOverlapsRange(w.week_start_date, programmeRange.start!, programmeRange.end!)) && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Master schedule weeks already exist inside these dates. Use <span className="font-semibold text-foreground">Generate weeks for this period</span> to link those existing weeks into this programme.
        </div>
      )}

      {visibleWeeks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {programmeLink
            ? (rangeActive
                ? "No linked weeks fall inside this programme's date range. Use Generate weeks for this period to link matching master schedule weeks, or click Show outside this period above."
                : "No weeks linked yet. Add a new week or link an existing one from the player's master schedule.")
            : "No weeks yet. Add one to start scheduling."}
        </p>
      )}

      {visibleWeeks.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-2 py-2 font-semibold w-[180px] sticky left-0 bg-muted/40 z-10">Week</th>
                {DAYS.map(d => (
                  <th key={d} className="text-left px-2 py-2 font-semibold uppercase tracking-wide text-[10px] min-w-[90px]">{d.slice(0, 3)}</th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {visibleWeeks.map(week => (
                <tr key={week.id} className="border-b last:border-0 align-top">
                  <td className="px-2 py-2 sticky left-0 bg-background z-10">
                    <div className="flex flex-col gap-1">
                      <Input
                        defaultValue={week.label || ""}
                        placeholder="Week label"
                        onBlur={(e) => e.target.value !== (week.label || "") && updateWeek(week.id, { label: e.target.value })}
                        className="h-7 text-xs font-medium"
                      />
                      <Input
                        type="date"
                        defaultValue={week.week_start_date || ""}
                        onBlur={(e) => e.target.value !== (week.week_start_date || "") && updateWeek(week.id, { week_start_date: e.target.value || null } as any)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </td>
                  {DAYS.map(day => (
                    <td key={day} className="px-1.5 py-2">
                      <SlotCell
                        slot={week.slots[day]}
                        refIndex={refIndex}
                        sessions={sessions}
                        onPickSession={(ref) => setSlot(week, day, { refId: ref.refId })}
                        onPickFreeText={(t) => setSlot(week, day, { free_text: t })}
                        onClear={() => setSlot(week, day, null)}
                        onEditSession={(ref) => setEditing(ref)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteWeek(week.id)}
                      className="text-destructive h-7 w-7"
                      title={programmeLink ? "Unlink from programme" : "Delete week"}
                    >
                      {programmeLink ? <Unlink className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SessionQuickEditDialog
        session={editing}
        onClose={() => setEditing(null)}
        onChanged={() => { reloadSessions(); }}
      />
    </div>
  );
};

interface SlotCellProps {
  slot?: Slot;
  refIndex: Map<string, ProgrammingSessionRef>;
  sessions: ProgrammingSessionRef[];
  onPickSession: (ref: ProgrammingSessionRef) => void;
  onPickFreeText: (text: string) => void;
  onClear: () => void;
  onEditSession: (ref: ProgrammingSessionRef) => void;
}

const SlotCell = ({ slot, refIndex, sessions, onPickSession, onPickFreeText, onClear, onEditSession }: SlotCellProps) => {
  const [open, setOpen] = useState(false);
  const ref = slot?.refId ? refIndex.get(slot.refId) : undefined;

  if (slot?.refId && !ref) {
    return (
      <Button variant="outline" className="h-9 w-full text-xs text-destructive" onClick={onClear}>
        Missing · clear
      </Button>
    );
  }

  if (ref) {
    const isSps = ref.effectiveType === "sps";
    const colors = getSessionColor(ref.sessionKey);
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onEditSession(ref)}
          className="h-9 rounded-md text-xs font-bold uppercase border-2 border-black/30 transition hover:opacity-90"
          style={{ backgroundColor: colors.bg, color: colors.text }}
          title={`${ref.programmeName} · Session ${ref.sessionKey}${ref.sessionTitle ? ` — ${ref.sessionTitle}` : ""}`}
        >
          {ref.sessionKey || "?"}
          <span className="ml-1 text-[9px] opacity-70">{isSps ? "SPS" : "TECH"}</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
        >
          clear
        </button>
      </div>
    );
  }

  if (slot?.free_text) {
    const colors = getSessionColor(slot.free_text);
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded-md text-xs font-bold uppercase border-2 border-black/30"
          style={{ backgroundColor: colors.bg, color: colors.text }}
          title="Tap to clear"
        >
          {slot.free_text}
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full text-xs text-muted-foreground border-dashed">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Assign session</div>
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-3">No sessions exist yet. Add sessions in an SPS or Technical programme first.</p>
          )}
          {sessions.filter(s => !s.hiddenFromPicker).map(s => {
            const isSps = s.effectiveType === "sps";
            return (
              <button
                key={s.refId}
                type="button"
                onClick={() => { onPickSession(s); setOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-xs"
              >
                <Badge className={`shrink-0 ${isSps ? "bg-primary text-primary-foreground" : "bg-blue-600 text-white"}`}>
                  {isSps ? "SPS" : "T"}
                </Badge>
                <span className="font-bold">{s.sessionKey || "?"}</span>
                <span className="text-muted-foreground truncate">{s.programmeName}{s.sessionTitle ? ` — ${s.sessionTitle}` : ""}</span>
              </button>
            );
          })}
          <div className="border-t pt-2 mt-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">Or set free text</div>
            <div className="grid grid-cols-3 gap-1 px-1">
              {["Rest", "Match", "Off"].map(t => (
                <Button key={t} size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onPickFreeText(t); setOpen(false); }}>
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};