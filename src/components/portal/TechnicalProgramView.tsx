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

type DrillRow = {
  kind: "drill" | "variation";
  id: string;
  drillId: string;
  name: string;
  reps: string | null;
  sets: string | null;
  reps_per_side: boolean;
  load: string | null;
  recovery_time: string | null;
};

const GOLD = "hsl(43, 49%, 61%)";

const TableHeaderCell = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
  <div
    className={`px-1 py-1.5 md:p-4 text-[10px] md:text-base font-bebas uppercase text-center flex items-center justify-center ${last ? "" : "border-r border-black/20"}`}
    style={{ backgroundColor: GOLD, color: "hsl(0, 0%, 0%)" }}
  >
    {children}
  </div>
);

const TableBodyCell = ({ children, name, last, indent }: { children: React.ReactNode; name?: boolean; last?: boolean; indent?: boolean }) => (
  <div
    className={`px-1 py-1.5 md:p-4 text-[11px] md:text-sm ${name ? "font-medium" : ""} ${last ? "" : "border-r border-white/10"} flex items-center ${name ? (indent ? "justify-start pl-2 md:pl-8" : "justify-start") : "justify-center text-center"} whitespace-normal break-words`}
    style={
      name
        ? { backgroundColor: indent ? "hsl(0, 0%, 14%)" : "hsl(0, 0%, 11%)", color: GOLD }
        : { backgroundColor: "hsl(0, 0%, 8%)", color: "hsl(0, 0%, 92%)" }
    }
  >
    {children}
  </div>
);

const SessionTable = ({ drills, onOpen }: { drills: Drill[]; onOpen: (d: Drill | Variation, parent?: Drill) => void }) => {
  return (
    <div className="border border-white/15 rounded-lg overflow-hidden">
      <div className="grid grid-cols-5 gap-0 text-xs md:text-base">
        <TableHeaderCell>Drill</TableHeaderCell>
        <TableHeaderCell>Reps</TableHeaderCell>
        <TableHeaderCell>Sets</TableHeaderCell>
        <TableHeaderCell>Load</TableHeaderCell>
        <TableHeaderCell last>
          <span className="hidden md:inline">Recovery Time</span>
          <span className="md:hidden">Recovery</span>
        </TableHeaderCell>
      </div>
      <div>
        {drills.map((d, di) => (
          <div
            key={d.id}
            className={`border-t border-white/10 ${d.variations.length > 0 ? "border-l-4 border-l-[hsl(43,49%,61%)]" : ""}`}
          >
            {/* Parent drill row */}
            <div
              onClick={() => onOpen(d)}
              className="grid grid-cols-5 gap-0 cursor-pointer hover:opacity-80 transition-opacity min-h-[60px] md:min-h-[80px]"
            >
              <TableBodyCell name>{d.name}</TableBodyCell>
              <TableBodyCell>{formatRepsCell(d.reps, d.reps_per_side)}</TableBodyCell>
              <TableBodyCell>{d.sets || "-"}</TableBodyCell>
              <TableBodyCell>{d.load || "-"}</TableBodyCell>
              <TableBodyCell last>{d.recovery_time || "-"}</TableBodyCell>
            </div>
            {/* Variations grouped visually under the parent */}
            {d.variations.length > 0 && (
              <div className="bg-[hsl(43,49%,61%)]/10 pl-3 md:pl-6 pr-2 pb-2 pt-1 border-t border-dashed border-[hsl(43,49%,61%)]/30">
                <div className="text-[10px] md:text-xs font-bebas uppercase tracking-wider text-[hsl(43,49%,61%)]/80 mb-1 pl-1">
                  Variations of {d.name}
                </div>
                <div className="rounded-md overflow-hidden border border-white/10">
                  {d.variations.map((v, vi) => (
                    <div
                      key={v.id}
                      onClick={() => onOpen(v, d)}
                      className={`grid grid-cols-5 gap-0 cursor-pointer hover:opacity-80 transition-opacity min-h-[50px] md:min-h-[60px] ${vi > 0 ? "border-t border-white/10" : ""}`}
                    >
                      <TableBodyCell name indent>↳ {v.label}</TableBodyCell>
                      <TableBodyCell>{formatRepsCell(v.reps, v.reps_per_side)}</TableBodyCell>
                      <TableBodyCell>{v.sets || "-"}</TableBodyCell>
                      <TableBodyCell>{v.load || "-"}</TableBodyCell>
                      <TableBodyCell last>{v.recovery_time || "-"}</TableBodyCell>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  const [openDetail, setOpenDetail] = useState<{ drill: Drill | Variation; parent?: Drill } | null>(null);
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
                    onOpen={(drill, parent) => setOpenDetail({ drill, parent })}
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
            const d = openDetail.drill;
            const isVariation = !("name" in d);
            const name = isVariation ? (d as Variation).label : (d as Drill).name;
            const parentName = openDetail.parent?.name;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bebas uppercase tracking-wider text-2xl">
                    {parentName ? `${parentName} — ${name}` : name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {formatReps(d.reps, d.sets, d.reps_per_side) && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Reps × Sets</div><div className="font-medium">{formatReps(d.reps, d.sets, d.reps_per_side)}</div></div>
                    )}
                    {d.load && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Load</div><div className="font-medium">{d.load}</div></div>
                    )}
                    {d.recovery_time && (
                      <div className="p-2 rounded border"><div className="text-[10px] uppercase text-muted-foreground">Recovery</div><div className="font-medium">{d.recovery_time}</div></div>
                    )}
                  </div>
                  {d.description && (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Description</div>
                      <p className="text-sm whitespace-pre-wrap">{d.description}</p>
                    </div>
                  )}
                  {d.notes && (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Notes</div>
                      <p className="text-sm whitespace-pre-wrap">{d.notes}</p>
                    </div>
                  )}
                  {d.diagram && (d.diagram.tokens?.length || d.diagram.arrows?.length) ? (
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Diagram</div>
                      <div className="max-w-md"><DrillDiagramView diagram={d.diagram} /></div>
                    </div>
                  ) : null}
                  {!isVariation && (openDetail.drill as Drill).variations?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Variations</div>
                      {(openDetail.drill as Drill).variations.map(v => (
                        <div key={v.id} className="border rounded-md p-3 bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{v.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatReps(v.reps, v.sets, v.reps_per_side)}{v.load ? ` · ${v.load}` : ""}{v.recovery_time ? ` · Rec ${v.recovery_time}` : ""}
                            </div>
                          </div>
                          {v.description && <p className="text-xs whitespace-pre-wrap">{v.description}</p>}
                          {v.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{v.notes}</p>}
                          {v.diagram && (v.diagram.tokens?.length || v.diagram.arrows?.length) ? (
                            <div className="max-w-[260px]"><DrillDiagramView diagram={v.diagram} /></div>
                          ) : null}
                        </div>
                      ))}
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