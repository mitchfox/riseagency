import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DrillDiagramEditor, DrillDiagramView, DrillDiagram } from "./DrillDiagramEditor";

interface Variation {
  id: string;
  drill_id: string;
  label: string;
  description: string | null;
  reps: string | null;
  sets: string | null;
  reps_per_side: boolean;
  load: string | null;
  recovery_time: string | null;
  notes: string | null;
  diagram: DrillDiagram | null;
  display_order: number;
}
interface Drill {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  reps: string | null;
  sets: string | null;
  reps_per_side: boolean;
  load: string | null;
  recovery_time: string | null;
  notes: string | null;
  diagram: DrillDiagram | null;
  display_order: number;
  variations: Variation[];
}
interface Session {
  id: string;
  program_id: string;
  session_key: string;
  title: string | null;
  description: string | null;
  display_order: number;
  drills: Drill[];
}

interface Props { programId: string }

export const TechnicalProgramEditor = ({ programId }: Props) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSessions, setOpenSessions] = useState<Record<string, boolean>>({});
  const [openDrills, setOpenDrills] = useState<Record<string, boolean>>({});
  const [editingDiagram, setEditingDiagram] = useState<
    | { kind: "drill" | "variation"; id: string; diagram: DrillDiagram | null; title: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ss } = await supabase
      .from("technical_sessions" as any)
      .select("*")
      .eq("program_id", programId)
      .order("display_order");
    const sessIds = (ss || []).map((s: any) => s.id);
    const { data: dd } = sessIds.length
      ? await supabase.from("technical_drills" as any).select("*").in("session_id", sessIds).order("display_order")
      : { data: [] as any[] };
    const drillIds = (dd || []).map((d: any) => d.id);
    const { data: vv } = drillIds.length
      ? await supabase.from("technical_drill_variations" as any).select("*").in("drill_id", drillIds).order("display_order")
      : { data: [] as any[] };

    const merged: Session[] = (ss || []).map((s: any) => ({
      ...s,
      drills: (dd || []).filter((d: any) => d.session_id === s.id).map((d: any) => ({
        ...d,
        variations: (vv || []).filter((v: any) => v.drill_id === d.id),
      })),
    }));
    setSessions(merged);
    setLoading(false);
  }, [programId]);

  useEffect(() => { load(); }, [load]);

  const nextKey = () => {
    const used = new Set(sessions.map(s => s.session_key));
    for (let i = 0; i < 26; i++) {
      const k = String.fromCharCode(65 + i);
      if (!used.has(k)) return k;
    }
    return "X";
  };

  const addSession = async () => {
    const key = nextKey();
    const { error } = await supabase.from("technical_sessions" as any).insert({
      program_id: programId,
      session_key: key,
      title: `Session ${key}`,
      display_order: sessions.length,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateSession = async (id: string, patch: Partial<Session>) => {
    const { error } = await supabase.from("technical_sessions" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session and all its drills?")) return;
    const { error } = await supabase.from("technical_sessions" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addDrill = async (sessionId: string, count: number) => {
    const { error } = await supabase.from("technical_drills" as any).insert({
      session_id: sessionId,
      name: `Drill ${count + 1}`,
      display_order: count,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateDrill = async (id: string, patch: Partial<Drill>) => {
    const { error } = await supabase.from("technical_drills" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteDrill = async (id: string) => {
    if (!confirm("Delete this drill and all its variations?")) return;
    const { error } = await supabase.from("technical_drills" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addVariation = async (drill: Drill, source?: Variation) => {
    const base = source ?? drill;
    const count = drill.variations.length;
    const { error } = await supabase.from("technical_drill_variations" as any).insert({
      drill_id: drill.id,
      label: `Variation ${count + 1}`,
      description: base.description ?? null,
      reps: base.reps ?? null,
      sets: base.sets ?? null,
      reps_per_side: base.reps_per_side ?? false,
      load: base.load ?? null,
      recovery_time: base.recovery_time ?? null,
      notes: base.notes ?? null,
      diagram: base.diagram ?? null,
      display_order: count,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateVariation = async (id: string, patch: Partial<Variation>) => {
    const { error } = await supabase.from("technical_drill_variations" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteVariation = async (id: string) => {
    const { error } = await supabase.from("technical_drill_variations" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveDiagram = async (diagram: DrillDiagram) => {
    if (!editingDiagram) return;
    if (editingDiagram.kind === "drill") {
      await updateDrill(editingDiagram.id, { diagram } as any);
    } else {
      await updateVariation(editingDiagram.id, { diagram } as any);
    }
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading sessions…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Sessions</h4>
        <Button size="sm" variant="outline" onClick={addSession}><Plus className="w-3.5 h-3.5 mr-1" />Add session</Button>
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">No sessions yet. Add one to start building drills.</p>
      )}

      {sessions.map(session => (
        <Card key={session.id}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Collapsible open={openSessions[session.id] !== false} onOpenChange={o => setOpenSessions(s => ({ ...s, [session.id]: o }))}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {openSessions[session.id] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-2 items-center">
                <Input
                  defaultValue={session.session_key}
                  onBlur={(e) => updateSession(session.id, { session_key: e.target.value })}
                  className="h-8"
                />
                <Input
                  defaultValue={session.title || ""}
                  placeholder="Session title"
                  onBlur={(e) => updateSession(session.id, { title: e.target.value })}
                  className="h-8"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteSession(session.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {openSessions[session.id] !== false && (
            <CardContent className="space-y-3">
              <Textarea
                defaultValue={session.description || ""}
                placeholder="Session notes (optional)"
                onBlur={(e) => updateSession(session.id, { description: e.target.value })}
                className="min-h-[60px] text-sm"
              />

              <div className="space-y-3">
                {session.drills.map((drill, di) => (
                  <Card key={drill.id} className="border-primary/30">
                    <CardHeader className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Collapsible open={openDrills[drill.id] !== false} onOpenChange={o => setOpenDrills(s => ({ ...s, [drill.id]: o }))}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              {openDrills[drill.id] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                        <Input
                          defaultValue={drill.name}
                          placeholder="Drill name"
                          onBlur={(e) => updateDrill(drill.id, { name: e.target.value })}
                          className="h-8 font-medium"
                        />
                        <Button size="icon" variant="ghost" onClick={() => deleteDrill(drill.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {openDrills[drill.id] !== false && (
                      <CardContent className="space-y-3 pt-0">
                        <DrillFields
                          value={drill}
                          onPatch={(p) => updateDrill(drill.id, p)}
                          onEditDiagram={() => setEditingDiagram({ kind: "drill", id: drill.id, diagram: drill.diagram ?? null, title: `${drill.name} — Diagram` })}
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Variations</Label>
                            <Button size="sm" variant="outline" onClick={() => addVariation(drill, drill.variations[drill.variations.length - 1])}>
                              <Copy className="w-3.5 h-3.5 mr-1" />Duplicate last
                            </Button>
                          </div>
                          {drill.variations.length === 0 && (
                            <p className="text-xs text-muted-foreground">No variations yet. Duplicate the drill above as a starting point.</p>
                          )}
                          {drill.variations.map(v => (
                            <div key={v.id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                              <div className="flex items-center gap-2">
                                <Input
                                  defaultValue={v.label}
                                  onBlur={(e) => updateVariation(v.id, { label: e.target.value })}
                                  className="h-8 font-medium max-w-[260px]"
                                />
                                <div className="ml-auto flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => addVariation(drill, v)}>
                                    <Copy className="w-3.5 h-3.5 mr-1" />Duplicate
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => deleteVariation(v.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <DrillFields
                                value={v}
                                onPatch={(p) => updateVariation(v.id, p)}
                                onEditDiagram={() => setEditingDiagram({ kind: "variation", id: v.id, diagram: v.diagram ?? null, title: `${drill.name} — ${v.label}` })}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
                <Button size="sm" variant="outline" onClick={() => addDrill(session.id, session.drills.length)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add drill
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <DrillDiagramEditor
        open={!!editingDiagram}
        onClose={() => setEditingDiagram(null)}
        initial={editingDiagram?.diagram ?? null}
        title={editingDiagram?.title}
        onSave={saveDiagram}
      />
    </div>
  );
};

interface FieldsProps {
  value: {
    description: string | null;
    reps: string | null;
    sets: string | null;
    reps_per_side: boolean;
    load: string | null;
    recovery_time: string | null;
    notes: string | null;
    diagram: DrillDiagram | null;
  };
  onPatch: (patch: any) => void;
  onEditDiagram: () => void;
}
const DrillFields = ({ value, onPatch, onEditDiagram }: FieldsProps) => (
  <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
    <button
      type="button"
      onClick={onEditDiagram}
      className="relative w-full overflow-hidden rounded-md border bg-muted/40 hover:border-primary transition"
      style={{ aspectRatio: "3 / 4" }}
    >
      {value.diagram && (value.diagram.tokens.length || value.diagram.arrows.length) ? (
        <DrillDiagramView diagram={value.diagram} className="border-0" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
          <Pencil className="w-4 h-4" />
          <span>Draw diagram</span>
        </div>
      )}
    </button>
    <div className="space-y-2">
      <Textarea
        defaultValue={value.description || ""}
        placeholder="Description / coaching points"
        onBlur={(e) => onPatch({ description: e.target.value })}
        className="min-h-[60px] text-sm"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Reps</Label>
          <Input defaultValue={value.reps || ""} onBlur={(e) => onPatch({ reps: e.target.value })} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sets</Label>
          <Input defaultValue={value.sets || ""} onBlur={(e) => onPatch({ sets: e.target.value })} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Load / intensity</Label>
          <Input defaultValue={value.load || ""} onBlur={(e) => onPatch({ load: e.target.value })} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recovery</Label>
          <Input defaultValue={value.recovery_time || ""} onBlur={(e) => onPatch({ recovery_time: e.target.value })} className="h-8" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={value.reps_per_side}
          onCheckedChange={(v) => onPatch({ reps_per_side: v })}
          id={`per-side-${Math.random()}`}
        />
        <Label className="text-xs">Reps are each side / foot</Label>
      </div>
      <Textarea
        defaultValue={value.notes || ""}
        placeholder="Notes (optional)"
        onBlur={(e) => onPatch({ notes: e.target.value })}
        className="min-h-[40px] text-sm"
      />
    </div>
  </div>
);