import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProgrammingSessionRef } from "./useProgrammingSessions";

interface Props {
  session: ProgrammingSessionRef | null;
  onClose: () => void;
  onChanged?: () => void;
}

export const SessionQuickEditDialog = ({ session, onClose, onChanged }: Props) => {
  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={session?.effectiveType === "sps" ? "bg-primary text-primary-foreground" : "bg-blue-600 text-white"}>
              {session?.effectiveType === "sps" ? "SPS" : "Technical"}
            </Badge>
            <span>{session ? `${session.programmeName} · Session ${session.sessionKey}` : ""}</span>
            {session?.sessionTitle && <span className="text-muted-foreground font-normal">— {session.sessionTitle}</span>}
          </DialogTitle>
        </DialogHeader>
        {session?.source === "technical" && (
          <TechnicalSessionInline sessionId={session.sessionId!} onChanged={onChanged} />
        )}
        {session?.source === "sps" && (
          <SpsSessionInline
            programmeId={session.programmeId}
            field={session.spsSessionField!}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------- Technical session editor (drills + variations) ----------

interface TVar { id: string; label: string; description: string | null; reps: string | null; sets: string | null; reps_per_side: boolean; load: string | null; recovery_time: string | null; notes: string | null; display_order: number; }
interface TDrill { id: string; name: string; description: string | null; reps: string | null; sets: string | null; reps_per_side: boolean; load: string | null; recovery_time: string | null; notes: string | null; display_order: number; variations: TVar[]; }

const TechnicalSessionInline = ({ sessionId, onChanged }: { sessionId: string; onChanged?: () => void }) => {
  const [drills, setDrills] = useState<TDrill[]>([]);
  const [sessionType, setSessionType] = useState<"sps" | "technical">("technical");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, dRes] = await Promise.all([
      supabase.from("technical_sessions" as any).select("title, description, session_type").eq("id", sessionId).single(),
      supabase.from("technical_drills" as any).select("*").eq("session_id", sessionId).order("display_order"),
    ]);
    const s: any = sRes.data || {};
    setTitle(s.title || "");
    setDescription(s.description || "");
    setSessionType(s.session_type === "sps" ? "sps" : "technical");
    const dIds = ((dRes.data || []) as any[]).map(d => d.id);
    const vRes = dIds.length
      ? await supabase.from("technical_drill_variations" as any).select("*").in("drill_id", dIds).order("display_order")
      : { data: [] as any[] };
    setDrills(((dRes.data || []) as any[]).map(d => ({
      ...d, variations: ((vRes.data || []) as any[]).filter(v => v.drill_id === d.id),
    })));
    setLoading(false);
  }, [sessionId]);
  useEffect(() => { load(); }, [load]);

  const patchSession = async (patch: any) => {
    const { error } = await supabase.from("technical_sessions" as any).update(patch).eq("id", sessionId);
    if (error) return toast.error(error.message);
    onChanged?.();
  };
  const addDrill = async () => {
    await supabase.from("technical_drills" as any).insert({ session_id: sessionId, name: `Drill ${drills.length + 1}`, display_order: drills.length } as any);
    load();
  };
  const patchDrill = async (id: string, patch: any) => { await supabase.from("technical_drills" as any).update(patch).eq("id", id); };
  const delDrill = async (id: string) => { if (!confirm("Delete drill?")) return; await supabase.from("technical_drills" as any).delete().eq("id", id); load(); };
  const addVar = async (drillId: string, count: number) => { await supabase.from("technical_drill_variations" as any).insert({ drill_id: drillId, label: `Variation ${count + 1}`, display_order: count } as any); load(); };
  const patchVar = async (id: string, patch: any) => { await supabase.from("technical_drill_variations" as any).update(patch).eq("id", id); };
  const delVar = async (id: string) => { await supabase.from("technical_drill_variations" as any).delete().eq("id", id); load(); };

  if (loading) return <p className="text-sm text-muted-foreground">Loading session…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
        <Label htmlFor={`type-${sessionId}`} className="text-xs uppercase tracking-wider text-muted-foreground">Session type</Label>
        <span className={`text-xs font-medium ${sessionType === "technical" ? "text-foreground" : "text-muted-foreground"}`}>Technical</span>
        <Switch
          id={`type-${sessionId}`}
          checked={sessionType === "sps"}
          onCheckedChange={(c) => { const t = c ? "sps" : "technical"; setSessionType(t); patchSession({ session_type: t }); }}
        />
        <span className={`text-xs font-medium ${sessionType === "sps" ? "text-primary" : "text-muted-foreground"}`}>SPS</span>
      </div>

      <div className="grid sm:grid-cols-[1fr_2fr] gap-2">
        <Input defaultValue={title} placeholder="Session title" onBlur={(e) => { setTitle(e.target.value); patchSession({ title: e.target.value }); }} />
        <Input defaultValue={description} placeholder="Notes" onBlur={(e) => { setDescription(e.target.value); patchSession({ description: e.target.value }); }} />
      </div>

      <div className="space-y-3">
        {drills.map(d => (
          <div key={d.id} className="border-2 border-primary/40 rounded-md p-3 bg-primary/[0.03] space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">Drill</Badge>
              <Input defaultValue={d.name} onBlur={(e) => patchDrill(d.id, { name: e.target.value })} className="h-8 font-medium" />
              <Button size="icon" variant="ghost" onClick={() => delDrill(d.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <DrillFieldsCompact key={`d-${d.id}`} value={d} onPatch={(p) => patchDrill(d.id, p)} />
            <div className="ml-2 pl-3 border-l-2 border-muted-foreground/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Variations</Label>
                <Button size="sm" variant="outline" onClick={() => addVar(d.id, d.variations.length)}><Plus className="w-3.5 h-3.5 mr-1" />Add variation</Button>
              </div>
              {d.variations.map(v => (
                <div key={v.id} className="border border-dashed rounded-md p-3 bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Variation</Badge>
                    <Input defaultValue={v.label} onBlur={(e) => patchVar(v.id, { label: e.target.value })} className="h-8 font-medium max-w-[260px]" />
                    <Button size="icon" variant="ghost" onClick={() => delVar(v.id)} className="text-destructive ml-auto"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <DrillFieldsCompact key={`v-${v.id}`} value={v} onPatch={(p) => patchVar(v.id, p)} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addDrill}><Plus className="w-3.5 h-3.5 mr-1" />Add drill</Button>
      </div>
    </div>
  );
};

const DrillFieldsCompact = ({ value, onPatch }: { value: any; onPatch: (p: any) => void }) => (
  <div className="space-y-2">
    <Textarea defaultValue={value.description || ""} placeholder="Description" onBlur={(e) => onPatch({ description: e.target.value })} className="min-h-[60px] text-sm" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Input defaultValue={value.reps || ""} placeholder="Reps" onBlur={(e) => onPatch({ reps: e.target.value })} className="h-8" />
      <Input defaultValue={value.sets || ""} placeholder="Sets" onBlur={(e) => onPatch({ sets: e.target.value })} className="h-8" />
      <Input defaultValue={value.recovery_time || ""} placeholder="Recovery" onBlur={(e) => onPatch({ recovery_time: e.target.value })} className="h-8" />
      <Input defaultValue={value.notes || ""} placeholder="Notes" onBlur={(e) => onPatch({ notes: e.target.value })} className="h-8" />
    </div>
  </div>
);

// ---------- SPS session editor (exercises list within player_programs.sessions JSON) ----------

interface SpsExercise { name: string; description?: string; repetitions?: string; sets?: string; load?: string; recoveryTime?: string; videoUrl?: string; }

const SpsSessionInline = ({ programmeId, field, onChanged }: { programmeId: string; field: string; onChanged?: () => void }) => {
  const [exercises, setExercises] = useState<SpsExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("player_programs").select("sessions").eq("id", programmeId).single();
    const sess = ((data as any)?.sessions || {}) as Record<string, any>;
    const node = sess[field] || sess[field.replace("session", "").toUpperCase()] || {};
    setExercises(Array.isArray(node.exercises) ? node.exercises : []);
    setLoading(false);
  }, [programmeId, field]);
  useEffect(() => { load(); }, [load]);

  const persist = async (next: SpsExercise[]) => {
    setExercises(next);
    const { data } = await supabase.from("player_programs").select("sessions").eq("id", programmeId).single();
    const sess = ((data as any)?.sessions || {}) as Record<string, any>;
    const key = sess[field] ? field : (sess[field.replace("session", "").toUpperCase()] ? field.replace("session", "").toUpperCase() : field);
    sess[key] = { ...(sess[key] || {}), exercises: next };
    const { error } = await supabase.from("player_programs").update({ sessions: sess as any }).eq("id", programmeId);
    if (error) toast.error(error.message);
    onChanged?.();
  };

  const update = (idx: number, patch: Partial<SpsExercise>) => {
    persist(exercises.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };
  const add = () => persist([...exercises, { name: "" }]);
  const del = (idx: number) => persist(exercises.filter((_, i) => i !== idx));

  if (loading) return <p className="text-sm text-muted-foreground">Loading session…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">SPS session exercises. Edits save back to the SPS programme.</p>
      {exercises.map((ex, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">Exercise {i + 1}</Badge>
            <Input defaultValue={ex.name || ""} placeholder="Exercise name" onBlur={(e) => update(i, { name: e.target.value })} className="h-8 font-medium" />
            <Button size="icon" variant="ghost" onClick={() => del(i)} className="text-destructive ml-auto"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Textarea defaultValue={ex.description || ""} placeholder="Description" onBlur={(e) => update(i, { description: e.target.value })} className="min-h-[50px] text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input defaultValue={ex.repetitions || ""} placeholder="Reps" onBlur={(e) => update(i, { repetitions: e.target.value })} className="h-8" />
            <Input defaultValue={ex.sets || ""} placeholder="Sets" onBlur={(e) => update(i, { sets: e.target.value })} className="h-8" />
            <Input defaultValue={ex.load || ""} placeholder="Load" onBlur={(e) => update(i, { load: e.target.value })} className="h-8" />
            <Input defaultValue={ex.recoveryTime || ""} placeholder="Recovery" onBlur={(e) => update(i, { recoveryTime: e.target.value })} className="h-8" />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" />Add exercise</Button>
    </div>
  );
};