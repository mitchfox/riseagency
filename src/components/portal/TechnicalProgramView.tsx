import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DrillDiagramView, DrillDiagram } from "@/components/staff/programming/DrillDiagramEditor";

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

const formatReps = (reps: string | null, sets: string | null, perSide: boolean) => {
  const parts: string[] = [];
  if (reps) parts.push(reps);
  if (sets) parts.push(`× ${sets}`);
  return parts.length ? parts.join(" ") + (perSide ? " each side" : "") : null;
};

const DrillBlock = ({ drill }: { drill: Drill }) => (
  <div className="border rounded-lg p-3 space-y-3 bg-card">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-semibold">{drill.name}</h4>
        {drill.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{drill.description}</p>}
      </div>
      <div className="text-right text-xs space-y-0.5 shrink-0">
        {formatReps(drill.reps, drill.sets, drill.reps_per_side) && (
          <div className="font-medium">{formatReps(drill.reps, drill.sets, drill.reps_per_side)}</div>
        )}
        {drill.load && <div className="text-muted-foreground">{drill.load}</div>}
        {drill.recovery_time && <div className="text-muted-foreground">Recovery: {drill.recovery_time}</div>}
      </div>
    </div>
    <div className="grid sm:grid-cols-[200px_1fr] gap-3">
      {drill.diagram && (drill.diagram.tokens?.length || drill.diagram.arrows?.length) ? (
        <DrillDiagramView diagram={drill.diagram} />
      ) : <div />}
      <div className="space-y-2">
        {drill.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{drill.notes}</p>}
        {drill.variations.map(v => (
          <div key={v.id} className="border rounded-md p-2 bg-muted/30">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-medium text-sm">{v.label}</div>
              <div className="text-xs text-right">
                {formatReps(v.reps, v.sets, v.reps_per_side) && (
                  <div className="font-medium">{formatReps(v.reps, v.sets, v.reps_per_side)}</div>
                )}
                {v.load && <div className="text-muted-foreground">{v.load}</div>}
              </div>
            </div>
            {v.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{v.description}</p>}
            {v.diagram && (v.diagram.tokens?.length || v.diagram.arrows?.length) ? (
              <div className="max-w-[200px] mt-2">
                <DrillDiagramView diagram={v.diagram} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const TechnicalProgramView = ({ playerId }: { playerId: string | null }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {programs.map(p => (
        <Card key={p.id} className={p.is_current ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading tracking-tight">{p.program_name}</CardTitle>
              {p.is_current && <Badge className="bg-primary">Current</Badge>}
              {p.phase_name && <span className="text-sm text-muted-foreground">{p.phase_name}</span>}
              {p.phase_dates && <span className="text-sm text-muted-foreground">{p.phase_dates}</span>}
            </div>
            {p.overview_text && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{p.overview_text}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {(sessions[p.id] || []).map(s => (
              <div key={s.id} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <Badge variant="outline">{s.session_key}</Badge>
                  <h3 className="font-semibold">{s.title || `Session ${s.session_key}`}</h3>
                </div>
                {s.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.description}</p>}
                <div className="space-y-3">
                  {s.drills.map(d => <DrillBlock key={d.id} drill={d} />)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};