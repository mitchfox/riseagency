import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Calendar, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useProgrammingSessions, ProgrammingSessionRef } from "./useProgrammingSessions";
import { SessionQuickEditDialog } from "./SessionQuickEditDialog";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

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
    table: "player_programs" | "technical_programs";
    programmeId: string;
  };
}

export const ProgrammingWeeksEditor = ({ playerId, programmeLink }: Props) => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [allPlayerWeeks, setAllPlayerWeeks] = useState<Week[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProgrammingSessionRef | null>(null);
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
      const { data: prog, error: pErr } = await supabase
        .from(programmeLink.table as any)
        .select("linked_week_ids")
        .eq("id", programmeLink.programmeId)
        .single();
      if (pErr) toast.error(pErr.message);
      const ids: string[] = (((prog as any)?.linked_week_ids) || []) as string[];
      setLinkedIds(ids);
      const ordered = ids
        .map(id => allRows.find(w => w.id === id))
        .filter(Boolean) as Week[];
      setWeeks(ordered);
    } else {
      setLinkedIds([]);
      setWeeks(allRows);
    }
    setLoading(false);
  }, [playerId, programmeLink?.table, programmeLink?.programmeId]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-3">
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 text-primary" />
          <div>
            {programmeLink
              ? "Weeks this programme runs across. Editing a slot here updates the player's master schedule and every programme that links the same week."
              : "Master schedule for this player. SPS and Technical programmes link to weeks from here. Tap a slot to assign or edit a session inline."}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-sm">{programmeLink ? "Linked weeks" : "Programming weeks"}</h4>
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
          <Button size="sm" onClick={addWeek}><Plus className="w-3.5 h-3.5 mr-1" />Add week</Button>
        </div>
      </div>

      {weeks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {programmeLink
            ? "No weeks linked yet. Add a new week or link an existing one from the player's master schedule."
            : "No weeks yet. Add one to start scheduling."}
        </p>
      )}

      {weeks.map(week => (
        <Card key={week.id}>
          <CardHeader className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                defaultValue={week.label || ""}
                placeholder="Week label"
                onBlur={(e) => e.target.value !== (week.label || "") && updateWeek(week.id, { label: e.target.value })}
                className="h-8 max-w-[200px] font-medium"
              />
              <Input
                type="date"
                defaultValue={week.week_start_date || ""}
                onBlur={(e) => e.target.value !== (week.week_start_date || "") && updateWeek(week.id, { week_start_date: e.target.value || null } as any)}
                className="h-8 max-w-[160px]"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteWeek(week.id)}
                className="text-destructive ml-auto"
                title={programmeLink ? "Unlink from programme" : "Delete week"}
              >
                {programmeLink ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {DAYS.map(day => (
                <div key={day} className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{day}</div>
                  <SlotCell
                    slot={week.slots[day]}
                    refIndex={refIndex}
                    sessions={sessions}
                    onPickSession={(ref) => setSlot(week, day, { refId: ref.refId })}
                    onPickFreeText={(t) => setSlot(week, day, { free_text: t })}
                    onClear={() => setSlot(week, day, null)}
                    onEditSession={(ref) => setEditing(ref)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

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
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onEditSession(ref)}
          className={`h-9 rounded-md text-xs font-bold uppercase border-2 transition hover:opacity-90 ${
            isSps
              ? "bg-primary/20 text-primary border-primary"
              : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500"
          }`}
          title={`${ref.programmeName} · Session ${ref.sessionKey}${ref.sessionTitle ? ` — ${ref.sessionTitle}` : ""}`}
        >
          {ref.sessionKey || "?"}
          <span className="ml-1 text-[9px] opacity-70">{isSps ? "SPS" : "T"}</span>
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
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded-md text-xs font-bold uppercase border-2 border-muted bg-muted text-muted-foreground"
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
          {sessions.map(s => {
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