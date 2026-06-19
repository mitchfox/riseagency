import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
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

interface Props {
  playerId: string;
  currentTechnicalProgrammeId?: string | null;
}

export const TechnicalScheduleTab = ({ playerId }: Props) => {
  const [spsProgrammes, setSpsProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("player_programs")
      .select("id, program_name, weekly_schedules, is_current, display_order, created_at")
      .eq("player_id", playerId)
      .order("is_current", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setSpsProgrammes(((data || []) as any).map((p: any) => ({
      ...p,
      weekly_schedules: Array.isArray(p.weekly_schedules) ? p.weekly_schedules : [],
    })));
    setLoading(false);
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  const updateDay = async (programmeId: string, weekIdx: number, day: Day, value: string) => {
    const prog = spsProgrammes.find(p => p.id === programmeId);
    if (!prog) return;
    const next = prog.weekly_schedules.map((w, i) => i === weekIdx ? { ...w, [day]: value } : w);
    const { error } = await supabase
      .from("player_programs")
      .update({ weekly_schedules: next as any })
      .eq("id", programmeId);
    if (error) return toast.error(error.message);
    setSpsProgrammes(spsProgrammes.map(p => p.id === programmeId ? { ...p, weekly_schedules: next } : p));
  };

  const updateWeekMeta = async (programmeId: string, weekIdx: number, patch: Partial<WeekRow>) => {
    const prog = spsProgrammes.find(p => p.id === programmeId);
    if (!prog) return;
    const next = prog.weekly_schedules.map((w, i) => i === weekIdx ? { ...w, ...patch } : w);
    const { error } = await supabase
      .from("player_programs")
      .update({ weekly_schedules: next as any })
      .eq("id", programmeId);
    if (error) return toast.error(error.message);
    setSpsProgrammes(spsProgrammes.map(p => p.id === programmeId ? { ...p, weekly_schedules: next } : p));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading schedule…</p>;

  const hasAnyWeeks = spsProgrammes.some(p => p.weekly_schedules.length > 0);

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 text-primary" />
          <div>
            Technical and Strength, Power and Speed share the same weekly schedule. Edits made here update the SPS schedule, and vice versa.
          </div>
        </CardContent>
      </Card>

      {!hasAnyWeeks && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            No Strength, Power and Speed schedule exists for this player yet. Add weeks from the Strength, Power and Speed section and they will appear here.
          </CardContent>
        </Card>
      )}

      {spsProgrammes.filter(p => p.weekly_schedules.length > 0).map(prog => (
        <div key={prog.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{prog.program_name}</h4>
            {prog.is_current && <Badge className="bg-primary">Current</Badge>}
          </div>
          {prog.weekly_schedules.map((week, wIdx) => {
            const label = week.week || week.week_start_date || `Week ${wIdx + 1}`;
            return (
              <Card key={`${prog.id}-${wIdx}`}>
                <CardHeader className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      defaultValue={week.week || ""}
                      placeholder={`Week ${wIdx + 1}`}
                      onBlur={(e) => e.target.value !== (week.week || "") && updateWeekMeta(prog.id, wIdx, { week: e.target.value })}
                      className="h-8 max-w-[200px] font-medium"
                    />
                    <Input
                      type="date"
                      defaultValue={week.week_start_date || ""}
                      onBlur={(e) => e.target.value !== (week.week_start_date || "") && updateWeekMeta(prog.id, wIdx, { week_start_date: e.target.value })}
                      className="h-8 max-w-[160px]"
                    />
                    <span className="text-xs text-muted-foreground ml-auto">{label}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {DAYS.map(day => (
                      <div key={day} className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{day}</div>
                        <Input
                          defaultValue={(week[day] as string) || ""}
                          placeholder="A / B / Rest"
                          onBlur={(e) => e.target.value !== ((week[day] as string) || "") && updateDay(prog.id, wIdx, day, e.target.value)}
                          className="h-8 text-xs text-center font-bold uppercase"
                          maxLength={20}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
};