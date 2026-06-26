import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
// Clicking a drill expands inline to reveal its variations as sub-rows plus description/diagram.
const DetailBlock = ({ item }: { item: Drill | Variation }) => {
  const hasDiagram = item.diagram && (item.diagram.tokens?.length || item.diagram.arrows?.length);
  if (!item.description && !item.notes && !hasDiagram) return null;
  return (
    <div className="p-3 md:p-4 space-y-3" style={{ backgroundColor: "hsl(0, 0%, 6%)", color: "hsl(0, 0%, 92%)" }}>
      {item.description && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bebas" style={{ color: GOLD }}>Description</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap mt-1">{item.description}</p>
        </div>
      )}
      {item.notes && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bebas" style={{ color: GOLD }}>Notes</div>
          <p className="text-xs md:text-sm whitespace-pre-wrap mt-1 opacity-80">{item.notes}</p>
        </div>
      )}
      {hasDiagram && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bebas mb-1" style={{ color: GOLD }}>Diagram</div>
          <div className="max-w-md"><DrillDiagramView diagram={item.diagram!} /></div>
        </div>
      )}
    </div>
  );
};

const SessionTable = ({ drills }: { drills: Drill[] }) => {
  const [expandedDrill, setExpandedDrill] = useState<string | null>(null);
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null);
  const toggleDrill = (id: string) =>
    setExpandedDrill(prev => {
      if (prev === id) return null;
      setExpandedVariation(null);
      return id;
    });
  const toggleVariation = (id: string) =>
    setExpandedVariation(prev => (prev === id ? null : id));

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
      <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-3 gap-0 text-xs md:text-base">
        <HeaderCell>Drill</HeaderCell>
        <HeaderCell><span className="px-2 md:px-0 min-w-[90px] md:min-w-[140px] inline-block">Reps</span></HeaderCell>
        <HeaderCell last><span className="px-2 md:px-0 min-w-[60px] md:min-w-[90px] inline-block">Sets</span></HeaderCell>
      </div>
      <div>
        {drills.map((d) => {
          const isOpen = expandedDrill === d.id;
          const hasVariations = d.variations.length > 0;
          const isClickable = hasVariations || !!(d.description || d.notes || (d.diagram && (d.diagram.tokens?.length || d.diagram.arrows?.length)));
          return (
            <Fragment key={d.id}>
              <div
                onClick={() => isClickable && toggleDrill(d.id)}
                className={`grid grid-cols-[1fr_auto_auto] md:grid-cols-3 gap-0 border-t-2 border-white ${isClickable ? "cursor-pointer hover:opacity-80" : ""} transition-opacity min-h-[60px] md:min-h-[80px]`}
              >
                <div
                  className="p-2 md:p-4 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-center text-center break-words gap-1"
                  style={{ backgroundColor: "hsl(45, 40%, 80%)", color: "hsl(0, 0%, 0%)" }}
                >
                  {hasVariations && (
                    <span className="text-[10px]" aria-hidden>{isOpen ? "▾" : "▸"}</span>
                  )}
                  <span>{d.name}</span>
                  {hasVariations && (
                    <span className="text-[10px] opacity-70">(+{d.variations.length})</span>
                  )}
                </div>
                <div
                  className="p-2 md:p-4 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center min-w-[90px] md:min-w-[140px]"
                  style={{ backgroundColor: "hsl(0, 0%, 10%)", color: "hsl(0, 0%, 100%)" }}
                >
                  {formatRepsCell(d.reps, d.reps_per_side)}
                </div>
                <div
                  className="p-2 md:p-4 text-xs md:text-sm italic flex items-center justify-center text-center min-w-[60px] md:min-w-[90px]"
                  style={{ backgroundColor: "hsl(0, 0%, 10%)", color: "hsl(0, 0%, 100%)" }}
                >
                  {d.sets || "-"}
                </div>
              </div>

              {isOpen && (
                <div className="border-t-2" style={{ borderColor: GOLD }}>
                  <DetailBlock item={d} />
                  {hasVariations && (
                    <div>
                      <div
                        className="px-3 py-1.5 text-[10px] md:text-xs font-bebas uppercase tracking-wider"
                        style={{ backgroundColor: "hsl(0, 0%, 11%)", color: GOLD }}
                      >
                        Variations of {d.name}
                      </div>
                      {/* Variations header row */}
                      <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-3 gap-0 text-[10px] md:text-xs">
                        <div
                          className="p-1.5 md:p-2 font-bebas uppercase text-center border-r-2 border-white"
                          style={{ backgroundColor: GOLD, color: "hsl(0, 0%, 0%)" }}
                        >
                          Variation
                        </div>
                        <div
                          className="p-1.5 md:p-2 font-bebas uppercase text-center border-r-2 border-white min-w-[90px] md:min-w-[140px]"
                          style={{ backgroundColor: GOLD, color: "hsl(0, 0%, 0%)" }}
                        >
                          Reps
                        </div>
                        <div
                          className="p-1.5 md:p-2 font-bebas uppercase text-center min-w-[60px] md:min-w-[90px]"
                          style={{ backgroundColor: GOLD, color: "hsl(0, 0%, 0%)" }}
                        >
                          Sets
                        </div>
                      </div>
                      {d.variations.map((v) => {
                        const vKey = `${d.id}:${v.id}`;
                        const vOpen = expandedVariation === vKey;
                        const vClickable = !!(v.description || v.notes || (v.diagram && (v.diagram.tokens?.length || v.diagram.arrows?.length)));
                        return (
                          <Fragment key={v.id}>
                            <div
                              onClick={() => vClickable && toggleVariation(vKey)}
                              className={`grid grid-cols-[1fr_auto_auto] md:grid-cols-3 gap-0 border-t border-white/30 ${vClickable ? "cursor-pointer hover:opacity-80" : ""} transition-opacity min-h-[48px] md:min-h-[60px]`}
                            >
                              <div
                                className="p-2 md:p-3 text-xs md:text-sm font-medium border-r-2 border-white flex items-center justify-start gap-1 text-left pl-3 md:pl-8 break-words"
                                style={{ backgroundColor: "hsl(45, 40%, 88%)", color: "hsl(0, 0%, 0%)" }}
                              >
                                <span className="opacity-60">↳</span>
                                {vClickable && (
                                  <span className="text-[10px]" aria-hidden>{vOpen ? "▾" : "▸"}</span>
                                )}
                                <span>{v.label}</span>
                              </div>
                              <div
                                className="p-2 md:p-3 text-xs md:text-sm italic border-r-2 border-white flex items-center justify-center text-center min-w-[90px] md:min-w-[140px]"
                                style={{ backgroundColor: "hsl(0, 0%, 13%)", color: "hsl(0, 0%, 100%)" }}
                              >
                                {formatRepsCell(v.reps, v.reps_per_side)}
                              </div>
                              <div
                                className="p-2 md:p-3 text-xs md:text-sm italic flex items-center justify-center text-center min-w-[60px] md:min-w-[90px]"
                                style={{ backgroundColor: "hsl(0, 0%, 13%)", color: "hsl(0, 0%, 100%)" }}
                              >
                                {v.sets || "-"}
                              </div>
                            </div>
                            {vOpen && (
                              <div className="border-t border-white/30">
                                <DetailBlock item={v} />
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const TechnicalProgramView = ({ playerId }: { playerId: string | null }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [loading, setLoading] = useState(true);
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
                    <div className="border border-primary/60 rounded-lg p-3 md:p-4 bg-black/40">
                      {currentSession.title && (
                        <h3 className="font-bebas uppercase tracking-wider text-xl">{currentSession.title}</h3>
                      )}
                      {currentSession.description && (
                        <p className="text-sm text-white/70 whitespace-pre-wrap mt-1">{currentSession.description}</p>
                      )}
                    </div>
                  )}
                  <SessionTable drills={currentSession.drills} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};