import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrillDiagramView, DrillDiagram } from "@/components/staff/programming/DrillDiagramEditor";
import { Button } from "@/components/ui/button";
import { getSessionColor } from "@/lib/sessionColors";

interface Variation {
  id: string; label: string; description: string | null;
  reps: string | null; sets: string | null; reps_per_side: boolean;
  load: string | null; recovery_time: string | null; notes: string | null;
  diagram: DrillDiagram | null; drill_id: string; display_order: number;
}
interface Drill {
  id: string; name: string; description: string | null;
  reps: string | null; sets: string | null; reps_per_side: boolean;
  load: string | null; recovery_time: string | null; notes: string | null;
  diagram: DrillDiagram | null; session_id: string; display_order: number;
  variations: Variation[];
}
interface Session {
  id: string; session_key: string; title: string | null; description: string | null;
  program_id: string; display_order: number; drills: Drill[];
}
interface Program {
  id: string; program_name: string; phase_name: string | null; phase_dates: string | null;
  overview_text: string | null; is_current: boolean; start_date: string | null; end_date: string | null;
}

const formatRepsCell = (reps: string | null, perSide: boolean): string => {
  if (!reps) return "-";
  if (!perSide) return reps;
  const n = Number(reps);
  if (!Number.isNaN(n) && Number.isFinite(n)) return `${n * 2} (${n} each side)`;
  return `${reps} each side`;
};

const formatReps = (reps: string | null, sets: string | null, perSide: boolean) => {
  if (!reps && !sets) return null;
  const repsPart = reps ? formatRepsCell(reps, perSide) : "";
  if (sets) return repsPart ? `${repsPart} × ${sets}` : `× ${sets}`;
  return repsPart || null;
};

const GOLD = "hsl(43, 49%, 61%)";

// SPS-styled session table: gold header (black text), cream drill-name cell, dark italic data cells, white 2px borders.
const SessionTable = ({ drills, onOpen }: { drills: Drill[]; onOpen: (d: Drill) => void }) => {
  const HeaderCell = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <div
      className={`p-2 md:p-4 font-bebas uppercase text-center flex items-center justify-center ${last ? "" : "border-r-2 border-white"}`}
      style={{ backgroundColor: GOLD, color: "hsl(0, 0%, 0%)" }}
    >
      {children}
    </div>
  );
  return (
    <div className="border-2 border-white rounded-lg overflow-hidden">
      <div className="grid grid-cols-5 gap-0 text-xs md:text-base">
        <HeaderCell>Drill</HeaderCell>
        <HeaderCell>Reps</HeaderCell>
        <HeaderCell>Sets</HeaderCell>
        <HeaderCell>Load</HeaderCell>
        <HeaderCell last>
          <span className="hidden md:inline">Recovery Time</span>
          <span className="md:hidden">Recovery</span>
        </HeaderCell>
      </div>
      <div>
        {drills.map((d) => (
          <div
            key={d.id}
            onClick={() => onOpen(d)}
            className="grid grid-cols-5 gap-0 border-t-2 border-white cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
          >
            <div
              className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words"
              style={{ backgroundColor: "hsl(45, 40%, 80%)", color: "hsl(0, 0%, 0%)" }}
            >
              {d.name}
              {d.variations.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">(+{d.variations.length})</span>
              )}
            </div>
            {[formatRepsCell(d.reps, d.reps_per_side), d.sets || "-", d.load || "-", d.recovery_time || "-"].map((v, i, arr) => (
              <div
                key={i}
                className={`p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center ${i < arr.length - 1 ? "border-r-2 border-white" : ""}`}
                style={{ backgroundColor: "hsl(0, 0%, 10%)", color: "hsl(0, 0%, 100%)" }}
              >
                {v}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const TechnicalProgramView = ({ playerId }: { playerId: string | null }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<{ drill: Drill; variation?: Variation } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: progs } = await supabase
        .from("technical_programs" as any)
        .select("*")
        .eq("player_id", playerId)
        .order("display_order");
      const progIds = (progs || []).map((p: any) => p.id);
      const { data: ss } = progIds.length
        ? await supabase.from("technical_sessions" as any).select("*").in("program_id", progIds).order("display_order")
        : { data: [] as any[] };
      const sessIds = (ss || []).map((s: any) => s.id);
      const { data: dd } = sessIds.length
        ? await supabase.from("technical_drills" as any).select("*").in("session_id", sessIds).order("display_order")
        : { data: [] as any[] };
      const drillIds = (dd || []).map((d: any) => d.id);
      const { data: vv } = drillIds.length
        ? await supabase.from("technical_drill_variations" as any).select("*").in("drill_id", drillIds).order("display_order")
        : { data: [] as any[] };

      const byProgram: Record<string, Session[]> = {};
      (ss || []).forEach((s: any) => {
        const drills = (dd || []).filter((d: any) => d.session_id === s.id).map((d: any) => ({
          ...d,
          variations: (vv || []).filter((v: any) => v.drill_id === d.id),
        }));
        const item: Session = { ...s, drills };
        byProgram[s.program_id] = [...(byProgram[s.program_id] || []), item];
      });
      setPrograms((progs || []) as any);
      setSessions(byProgram);
      setLoading(false);
    })();
  }, [playerId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading technical programmes…</p>;
  if (!programs.length) return <p className="text-sm text-muted-foreground">No technical programmes yet.</p>;

  // Only show the current programme (fallback to first)
  const activeProgram = programs.find(p => p.is_current) || programs[0];
  const programSessions = (sessions[activeProgram.id] || []).filter(s => s.drills && s.drills.length > 0);
  const currentSession =
    programSessions.find(s => s.id === selectedSessionId) ||
    programSessions[0];

  return (
    <div className="space-y-3 w-full">
      <Card className="w-full border-primary rounded-none border-x-0 md:rounded-lg md:border-x">
        <CardHeader marble className="rounded-none">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-bebas uppercase tracking-wider text-2xl">{activeProgram.program_name}</CardTitle>
              <Badge className="bg-primary">Current</Badge>
              {activeProgram.phase_name && <span className="text-sm text-muted-foreground">{activeProgram.phase_name}</span>}
              {activeProgram.phase_dates && <span className="text-sm text-muted-foreground">{activeProgram.phase_dates}</span>}
            </div>
            {activeProgram.overview_text && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{activeProgram.overview_text}</p>}
        </CardHeader>
        <CardContent className="space-y-4 pt-4 px-px md:px-6">
          {programSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <>
              {/* Session selector buttons (colour-coded like SPS) */}
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${Math.min(programSessions.length, 4)}, minmax(0, 1fr))` }}
              >
                {programSessions.map(s => {
                  const colors = getSessionColor(s.session_key);
                  const isActive = currentSession?.id === s.id;
                  return (
                    <Button
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className="font-bebas uppercase text-sm"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        opacity: isActive ? 1 : 0.7,
                        border: isActive ? "2px solid white" : "none",
                      }}
                    >
                      Session {s.session_key}
                    </Button>
                  );
                })}
              </div>

              {currentSession && (
                  <div className="space-y-3 bg-black/40 rounded-xl p-px md:p-4">
                  {(currentSession.title || currentSession.description) && (
                    <div>
                      {currentSession.title && (
                        <h3 className="font-bebas uppercase tracking-wider text-xl">{currentSession.title}</h3>
                      )}
                      {currentSession.description && (
                        <p className="text-sm text-white/70 whitespace-pre-wrap mt-1">{currentSession.description}</p>
                      )}
                    </div>
                  )}
                  <SessionTable
                    drills={currentSession.drills}
                    onOpen={(drill) => setOpenDetail({ drill })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {openDetail && (() => {
            const drill = openDetail.drill;
            const variation = openDetail.variation;
            const active = variation || drill;
            const titleName = variation ? `${drill.name} — ${variation.label}` : drill.name;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {variation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenDetail({ drill })}
                        className="h-7 px-2 text-xs font-bebas uppercase"
                      >
                        ← Back to {drill.name}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenDetail(null)}
                      className="h-7 px-2 text-xs font-bebas uppercase"
                    >
                      ← Back to session
                    </Button>
                  </div>
                  <DialogTitle className="font-bebas uppercase tracking-wider text-2xl mt-2">
                    {titleName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {formatReps(active.reps, active.sets, active.reps_per_side) && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Reps × Sets</div><div className="font-medium">{formatReps(active.reps, active.sets, active.reps_per_side)}</div></div>
                    )}
                    {active.load && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Load</div><div className="font-medium">{active.load}</div></div>
                    )}
                    {active.recovery_time && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Recovery</div><div className="font-medium">{active.recovery_time}</div></div>
                    )}
                  </div>
                  {active.description && (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Description</div>
                      <p className="text-sm whitespace-pre-wrap">{active.description}</p>
                    </div>
                  )}
                  {active.notes && (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Notes</div>
                      <p className="text-sm whitespace-pre-wrap">{active.notes}</p>
                    </div>
                  )}
                  {active.diagram && (active.diagram.tokens?.length || active.diagram.arrows?.length) ? (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Diagram</div>
                      <div className="max-w-md"><DrillDiagramView diagram={active.diagram} /></div>
                    </div>
                  ) : null}
                  {!variation && drill.variations?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase text-muted-foreground font-bebas tracking-wider">Variations</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {drill.variations.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setOpenDetail({ drill, variation: v })}
                            className="text-left border-2 rounded-md p-3 bg-muted/30 hover:bg-muted/60 transition-colors"
                            style={{ borderColor: GOLD }}
                          >
                            <div className="font-medium">{v.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatReps(v.reps, v.sets, v.reps_per_side)}{v.load ? ` · ${v.load}` : ""}{v.recovery_time ? ` · Rec ${v.recovery_time}` : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};