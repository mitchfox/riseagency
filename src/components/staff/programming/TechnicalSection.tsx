import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Target, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { SPSTimeline } from "@/components/staff/programming/SPSTimeline";
import { TechnicalProgramEditor } from "./TechnicalProgramEditor";
import { ProgrammingWeeksEditor } from "./ProgrammingWeeksEditor";
import { SaveTechnicalToCoachingDBDialog } from "./SaveTechnicalToCoachingDBDialog";
import { Label } from "@/components/ui/label";

interface Program {
  id: string;
  program_name: string;
  phase_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  display_order: number;
}

const weeksBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)));
};

export const TechnicalSection = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [openProgram, setOpenProgram] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; programId: string | null; programName: string; phase: string | null }>({
    open: false, programId: null, programName: "", phase: null,
  });
  const [saveSessions, setSaveSessions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("players").select("id, name, position, image_url, representation_status").order("name");
      setPlayers(data || []);
    })();
  }, []);

  const loadPrograms = useCallback(async () => {
    if (selectedPlayer === "all") { setPrograms([]); return; }
    const { data, error } = await supabase
      .from("technical_programs" as any)
      .select("id, program_name, phase_name, start_date, end_date, is_current, display_order")
      .eq("player_id", selectedPlayer)
      .order("display_order")
      .order("created_at");
    if (error) toast.error(error.message);
    setPrograms((data || []) as any);
  }, [selectedPlayer]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  const current = players.find(p => p.id === selectedPlayer);

  const addProgram = async () => {
    if (selectedPlayer === "all") return;
    const { error } = await supabase.from("technical_programs" as any).insert({
      player_id: selectedPlayer,
      program_name: `Technical Programme ${programs.length + 1}`,
      display_order: programs.length,
    } as any);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  const updateProgram = async (id: string, patch: Partial<Program>) => {
    const { error } = await supabase.from("technical_programs" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const toggleCurrent = async (id: string, makeCurrent: boolean) => {
    if (makeCurrent) {
      await supabase.from("technical_programs" as any).update({ is_current: false } as any).eq("player_id", selectedPlayer);
    }
    const { error } = await supabase.from("technical_programs" as any).update({ is_current: makeCurrent } as any).eq("id", id);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  const deleteProgram = async (id: string) => {
    if (!confirm("Delete this programme and all its sessions/drills?")) return;
    const { error } = await supabase.from("technical_programs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadPrograms();
  };

  const openSaveDialog = async (p: Program) => {
    // load full sessions+drills+variations for this programme
    const { data: ss } = await supabase
      .from("technical_sessions" as any)
      .select("*")
      .eq("program_id", p.id)
      .order("display_order");
    const sessIds = (ss || []).map((s: any) => s.id);
    const { data: dd } = sessIds.length
      ? await supabase.from("technical_drills" as any).select("*").in("session_id", sessIds).order("display_order")
      : { data: [] as any[] };
    const drillIds = (dd || []).map((d: any) => d.id);
    const { data: vv } = drillIds.length
      ? await supabase.from("technical_drill_variations" as any).select("*").in("drill_id", drillIds).order("display_order")
      : { data: [] as any[] };
    const sessions = (ss || []).map((s: any) => ({
      ...s,
      drills: (dd || []).filter((d: any) => d.session_id === s.id).map((d: any) => ({
        ...d,
        variations: (vv || []).filter((v: any) => v.drill_id === d.id),
      })),
    }));
    setSaveSessions(sessions);
    setSaveDialog({ open: true, programId: p.id, programName: p.program_name, phase: p.phase_name });
  };

  return (
    <div className="space-y-4 -mx-6 sm:mx-0 px-2 sm:px-0">
      <PlayerCombobox
        players={players}
        value={selectedPlayer}
        onChange={setSelectedPlayer}
        allLabel="Select a player…"
        allValue="all"
        className="w-full sm:w-[300px]"
      />

      {selectedPlayer === "all" && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a player to manage their technical programming</p>
        </div>
      )}

      {selectedPlayer !== "all" && current && (
        <div className="space-y-4">
          <SPSTimeline programs={programs as any} playerName={current.name} />

          <ProgrammingWeeksEditor playerId={selectedPlayer} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Technical Programmes</h3>
                <Button size="sm" onClick={addProgram}><Plus className="w-3.5 h-3.5 mr-1" />New programme</Button>
              </div>

              {programs.length === 0 && (
                <p className="text-sm text-muted-foreground">No technical programmes yet.</p>
              )}

              {programs.map(p => (
            <Card key={p.id} className={p.is_current ? "border-primary" : ""}>
              <CardHeader className="py-3 space-y-3">
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
                    placeholder="Phase"
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
                  <Button size="sm" variant="outline" onClick={() => openSaveDialog(p)}>
                    <Save className="h-4 w-4 mr-1" />Save to DB
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteProgram(p.id)} className="text-destructive ml-auto">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {(() => {
                  const duration = weeksBetween(p.start_date, p.end_date);
                  const endBeforeStart = p.start_date && p.end_date && p.end_date < p.start_date;
                  return (
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
                  );
                })()}
              </CardHeader>
              {openProgram === p.id && (
                <CardContent>
                  <TechnicalProgramEditor programId={p.id} playerId={selectedPlayer} />
                </CardContent>
              )}
            </Card>
              ))}
          </div>
        </div>
      )}

      <SaveTechnicalToCoachingDBDialog
        open={saveDialog.open}
        onClose={() => setSaveDialog(s => ({ ...s, open: false }))}
        programName={saveDialog.programName}
        phaseName={saveDialog.phase}
        sessions={saveSessions}
      />
    </div>
  );
};