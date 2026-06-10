import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Target, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { SPSTimeline } from "@/components/staff/programming/SPSTimeline";
import { TechnicalProgramEditor } from "./TechnicalProgramEditor";

interface Program {
  id: string;
  program_name: string;
  phase_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  display_order: number;
}

export const TechnicalSection = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [openProgram, setOpenProgram] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("players").select("id, name, position, representation_status").order("name");
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

  return (
    <div className="space-y-4">
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

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Technical Programmes</h3>
            <Button size="sm" onClick={addProgram}><Plus className="w-3.5 h-3.5 mr-1" />New programme</Button>
          </div>

          {programs.length === 0 && (
            <p className="text-sm text-muted-foreground">No technical programmes yet.</p>
          )}

          {programs.map(p => (
            <Card key={p.id} className={p.is_current ? "border-primary" : ""}>
              <CardHeader className="py-3">
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
                    className="h-8 max-w-[200px]"
                  />
                  <Input
                    type="date"
                    defaultValue={p.start_date || ""}
                    onBlur={(e) => updateProgram(p.id, { start_date: e.target.value || null } as any)}
                    className="h-8 max-w-[150px]"
                  />
                  <Input
                    type="date"
                    defaultValue={p.end_date || ""}
                    onBlur={(e) => updateProgram(p.id, { end_date: e.target.value || null } as any)}
                    className="h-8 max-w-[150px]"
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
              </CardHeader>
              {openProgram === p.id && (
                <CardContent>
                  <TechnicalProgramEditor programId={p.id} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};