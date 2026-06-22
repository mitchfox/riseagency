import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { SpsProgramEditor } from "./SpsProgramEditor";

interface Program {
  id: string;
  program_name: string;
  phase_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  display_order: number;
}

interface Props { playerId: string; playerName: string }

const weeksBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)));
};

export const SpsSection = ({ playerId, playerName }: Props) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [openProgram, setOpenProgram] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    const { data, error } = await supabase
      .from("sps_programs" as any)
      .select("id, program_name, phase_name, start_date, end_date, is_current, display_order")
      .eq("player_id", playerId)
      .order("display_order")
      .order("created_at");
    if (error) toast.error(error.message);
    setPrograms((data || []) as any);
  }, [playerId]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  const addProgram = async () => {
    const { error } = await supabase.from("sps_programs" as any).insert({
      player_id: playerId,
      program_name: `SPS Programme ${programs.length + 1}`,
      display_order: programs.length,
    } as any);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  const updateProgram = async (id: string, patch: Partial<Program>) => {
    const { error } = await supabase.from("sps_programs" as any).update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...patch } as Program : p));
  };

  const toggleCurrent = async (id: string, makeCurrent: boolean) => {
    if (makeCurrent) {
      await supabase.from("sps_programs" as any).update({ is_current: false } as any).eq("player_id", playerId);
    }
    const { error } = await supabase.from("sps_programs" as any).update({ is_current: makeCurrent } as any).eq("id", id);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  const deleteProgram = async (id: string) => {
    if (!confirm("Delete this programme and all its sessions/exercises? The legacy copy will also be removed.")) return;
    const { error } = await supabase.from("sps_programs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">SPS Programmes</h3>
        <Button size="sm" onClick={addProgram}><Plus className="w-3.5 h-3.5 mr-1" />New programme</Button>
      </div>

      {programs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No SPS programmes for {playerName} yet. Click <strong>New programme</strong> to start. Every field saves the moment you tab away — no save button.
        </p>
      )}

      {programs.map(p => {
        const duration = weeksBetween(p.start_date, p.end_date);
        const endBeforeStart = p.start_date && p.end_date && p.end_date < p.start_date;
        return (
          <Card key={p.id} className={p.is_current ? "border-primary" : ""}>
            <CardHeader className="py-3 space-y-3">
              {/* Row 1 — name, phase, status, delete */}
              <div className="flex flex-wrap items-center gap-2">
                <Collapsible open={openProgram === p.id} onOpenChange={(o) => setOpenProgram(o ? p.id : null)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      {openProgram === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
                <Input
                  defaultValue={p.program_name}
                  onBlur={(e) => updateProgram(p.id, { program_name: e.target.value })}
                  className="h-8 max-w-[280px] font-medium"
                />
                <Input
                  defaultValue={p.phase_name || ""}
                  placeholder="Phase (e.g. Off-season)"
                  onBlur={(e) => updateProgram(p.id, { phase_name: e.target.value })}
                  className="h-8 max-w-[220px]"
                />
                <Button
                  size="sm"
                  variant={p.is_current ? "default" : "outline"}
                  onClick={() => toggleCurrent(p.id, !p.is_current)}
                >
                  {p.is_current ? "Current" : "Set current"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteProgram(p.id)} className="text-destructive ml-auto">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Row 2 — explicitly labelled dates */}
              <div className="flex flex-wrap items-end gap-3 pl-9">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Start date</Label>
                  <Input
                    type="date"
                    defaultValue={p.start_date || ""}
                    onBlur={(e) => updateProgram(p.id, { start_date: e.target.value || null } as any)}
                    className="h-8 w-[150px]"
                    title="When this programme begins. Used to filter which weeks appear under it."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">End date</Label>
                  <Input
                    type="date"
                    defaultValue={p.end_date || ""}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v && p.start_date && v < p.start_date) {
                        toast.error("End date cannot be before start date");
                        e.target.value = p.end_date || "";
                        return;
                      }
                      updateProgram(p.id, { end_date: v } as any);
                    }}
                    className={`h-8 w-[150px] ${endBeforeStart ? "border-destructive" : ""}`}
                    title="When this programme ends. Used to filter which weeks appear under it."
                  />
                </div>
                {duration && (
                  <Badge variant="outline" className="h-8">Duration: {duration} {duration === 1 ? "week" : "weeks"}</Badge>
                )}
              </div>
            </CardHeader>
            {openProgram === p.id && (
              <CardContent>
                <SpsProgramEditor programId={p.id} playerId={playerId} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};