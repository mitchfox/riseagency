import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

interface WeekRow {
  week?: string;
  week_start_date?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  [k: string]: any;
}

interface Programme {
  id: string;
  program_name: string;
  weekly_schedules: WeekRow[];
  is_current: boolean;
}

interface SessionOpt {
  id: string;
  session_key: string;
  title: string | null;
}

interface Props {
  playerId: string;
  currentTechnicalProgrammeId?: string | null;
}

export const TechnicalScheduleTab = ({ playerId, currentTechnicalProgrammeId }: Props) => {
  const [spsProgrammes, setSpsProgrammes] = useState<Programme[]>([]);
  const [techProgramme, setTechProgramme] = useState<Programme | null>(null);
  const [techSessions, setTechSessions] = useState<SessionOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sps, tech] = await Promise.all([
      supabase
        .from("player_programs")
        .select("id, program_name, weekly_schedules, is_current")
        .eq("player_id", playerId)
        .order("start_date", { ascending: true }),
      currentTechnicalProgrammeId
        ? supabase
            .from("technical_programs" as any)
            .select("id, program_name, weekly_schedules, is_current")
            .eq("id", currentTechnicalProgrammeId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ] as const);

    setSpsProgrammes(((sps.data || []) as any).map((p: any) => ({ ...p, weekly_schedules: p.weekly_schedules || [] })));
    setTechProgramme(tech.data ? { ...(tech.data as any), weekly_schedules: (tech.data as any).weekly_schedules || [] } : null);

    if (currentTechnicalProgrammeId) {
      const { data: ss } = await supabase
        .from("technical_sessions" as any)
        .select("id, session_key, title")
        .eq("program_id", currentTechnicalProgrammeId)
        .order("display_order");
      setTechSessions((ss || []) as any);
    } else {
      setTechSessions([]);
    }
    setLoading(false);
  }, [playerId, currentTechnicalProgrammeId]);

  useEffect(() => { load(); }, [load]);

  // Build merged week list keyed by week label
  const allWeeks = new Map<string, { label: string; week_start_date?: string }>();
  const collect = (rows: WeekRow[]) => rows.forEach(r => {
    const label = r.week || r.week_start_date || "Untitled week";
    if (!allWeeks.has(label)) allWeeks.set(label, { label, week_start_date: r.week_start_date });
  });
  spsProgrammes.forEach(p => collect(p.weekly_schedules));
  if (techProgramme) collect(techProgramme.weekly_schedules);

  const findSpsForDay = (weekLabel: string, day: Day) => {
    for (const p of spsProgrammes) {
      const row = p.weekly_schedules.find(w => (w.week || w.week_start_date) === weekLabel);
      const val = row?.[day];
      if (val) return { programme: p.program_name, value: String(val) };
    }
    return null;
  };

  const findTechRow = (weekLabel: string) =>
    techProgramme?.weekly_schedules.find(w => (w.week || w.week_start_date) === weekLabel);

  const saveTech = async (next: WeekRow[]) => {
    if (!techProgramme) return;
    const { error } = await supabase
      .from("technical_programs" as any)
      .update({ weekly_schedules: next } as any)
      .eq("id", techProgramme.id);
    if (error) return toast.error(error.message);
    setTechProgramme({ ...techProgramme, weekly_schedules: next });
  };

  const addWeek = async () => {
    if (!techProgramme) return;
    const next = [...techProgramme.weekly_schedules, {
      week: `Week ${techProgramme.weekly_schedules.length + 1}`,
      week_start_date: "",
      monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "", sunday: "",
    }];
    await saveTech(next);
  };

  const updateTechWeek = async (weekLabel: string, patch: Partial<WeekRow>) => {
    if (!techProgramme) return;
    const next = techProgramme.weekly_schedules.map(w =>
      (w.week || w.week_start_date) === weekLabel ? { ...w, ...patch } : w
    );
    // if patch contains new week label / start, ensure trigger doesn't reject by checking SPS first
    await saveTech(next);
  };

  const removeTechWeek = async (weekLabel: string) => {
    if (!techProgramme) return;
    if (!confirm("Remove this week from the technical programme?")) return;
    const next = techProgramme.weekly_schedules.filter(w => (w.week || w.week_start_date) !== weekLabel);
    await saveTech(next);
  };

  const setTechDay = async (weekLabel: string, day: Day, value: string) => {
    if (!techProgramme) return;
    let rows = [...techProgramme.weekly_schedules];
    const idx = rows.findIndex(w => (w.week || w.week_start_date) === weekLabel);
    if (idx === -1) {
      rows.push({ week: weekLabel, [day]: value });
    } else {
      rows[idx] = { ...rows[idx], [day]: value };
    }
    const { error } = await supabase
      .from("technical_programs" as any)
      .update({ weekly_schedules: rows } as any)
      .eq("id", techProgramme.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTechProgramme({ ...techProgramme, weekly_schedules: rows });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading schedule…</p>;

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 text-primary" />
          <div>
            Technical and Strength/Power/Speed share a single weekly schedule. A day already used by an SPS programme is locked.
            Edit SPS days from the Strength, Power and Speed section.
          </div>
        </CardContent>
      </Card>

      {!techProgramme && (
        <p className="text-sm text-muted-foreground">No current technical programme selected. Open the Programmes tab and mark one as current to manage its schedule here.</p>
      )}

      {techProgramme && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Weeks — {techProgramme.program_name}</h4>
            <Button size="sm" variant="outline" onClick={addWeek}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add week
            </Button>
          </div>

          {Array.from(allWeeks.values()).map(({ label }) => {
            const techRow = findTechRow(label);
            return (
              <Card key={label}>
                <CardHeader className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      defaultValue={label}
                      onBlur={(e) => techRow && updateTechWeek(label, { week: e.target.value })}
                      className="h-8 max-w-[200px] font-medium"
                      placeholder="Week label"
                      disabled={!techRow}
                    />
                    <Input
                      type="date"
                      defaultValue={techRow?.week_start_date || ""}
                      onBlur={(e) => techRow && updateTechWeek(label, { week_start_date: e.target.value })}
                      className="h-8 max-w-[160px]"
                      disabled={!techRow}
                    />
                    {techRow && (
                      <Button size="icon" variant="ghost" className="text-destructive ml-auto" onClick={() => removeTechWeek(label)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                    {DAYS.map(day => {
                      const sps = findSpsForDay(label, day);
                      const techVal = techRow?.[day] || "";
                      const locked = !!sps;
                      return (
                        <div key={day} className="border rounded-md p-2 space-y-1">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{day}</div>
                          {locked && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3" />SPS: {sps!.value}
                            </Badge>
                          )}
                          {!locked && (
                            <Select
                              value={techVal || "__none__"}
                              onValueChange={(v) => setTechDay(label, day, v === "__none__" ? "" : v)}
                              disabled={!techRow && techSessions.length === 0}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Rest —</SelectItem>
                                {techSessions.map(s => (
                                  <SelectItem key={s.id} value={s.title || `Session ${s.session_key}`}>
                                    {s.session_key} · {s.title || "Untitled"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {allWeeks.size === 0 && (
            <p className="text-sm text-muted-foreground">No weeks scheduled yet. Add a week to begin.</p>
          )}
        </>
      )}
    </div>
  );
};