import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";
import { ProgrammingWeeksEditor } from "./ProgrammingWeeksEditor";

interface Exercise {
  id: string;
  session_id: string;
  name: string;
  description: string | null;
  reps: string | null;
  sets: string | null;
  load: string | null;
  recovery_time: string | null;
  video_url: string | null;
  display_order: number;
}

interface Session {
  id: string;
  program_id: string;
  session_key: string;
  session_kind: "main" | "pre";
  title: string | null;
  description: string | null;
  staff_notes: string | null;
  display_order: number;
  exercises: Exercise[];
}

interface Props { programId: string; playerId?: string }

export const SpsProgramEditor = ({ programId, playerId }: Props) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSessions, setOpenSessions] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ss } = await supabase
      .from("sps_sessions" as any)
      .select("*")
      .eq("program_id", programId)
      .order("display_order");
    const sessIds = (ss || []).map((s: any) => s.id);
    const { data: ee } = sessIds.length
      ? await supabase.from("sps_exercises" as any).select("*").in("session_id", sessIds).order("display_order")
      : { data: [] as any[] };
    const merged: Session[] = ((ss || []) as any[]).map((s: any) => ({
      ...s,
      exercises: ((ee || []) as any[]).filter((e: any) => e.session_id === s.id),
    }));
    setSessions(merged);
    setLoading(false);
  }, [programId]);

  useEffect(() => { load(); }, [load]);

  const nextKey = () => {
    const used = new Set(sessions.filter(s => s.session_kind === "main").map(s => s.session_key));
    for (let i = 0; i < 26; i++) {
      const k = String.fromCharCode(65 + i);
      if (!used.has(k)) return k;
    }
    return "X";
  };

  const addSession = async (kind: "main" | "pre" = "main") => {
    const key = nextKey();
    const { error } = await supabase.from("sps_sessions" as any).insert({
      program_id: programId,
      session_key: key,
      session_kind: kind,
      title: kind === "pre" ? `Pre-${key}` : `Session ${key}`,
      display_order: sessions.length,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateSession = async (id: string, patch: Partial<Session>) => {
    const { error } = await supabase.from("sps_sessions" as any).update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } as Session : s));
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session and all its exercises?")) return;
    const { error } = await supabase.from("sps_sessions" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addExercise = async (sessionId: string, count: number) => {
    const { error } = await supabase.from("sps_exercises" as any).insert({
      session_id: sessionId,
      name: "",
      display_order: count,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const duplicateExercise = async (ex: Exercise) => {
    const { error } = await supabase.from("sps_exercises" as any).insert({
      session_id: ex.session_id,
      name: ex.name,
      description: ex.description,
      reps: ex.reps,
      sets: ex.sets,
      load: ex.load,
      recovery_time: ex.recovery_time,
      video_url: ex.video_url,
      display_order: ex.display_order + 1,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateExercise = async (id: string, patch: Partial<Exercise>) => {
    const { error } = await supabase.from("sps_exercises" as any).update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    setSessions(prev => prev.map(s => ({
      ...s,
      exercises: s.exercises.map(e => e.id === id ? { ...e, ...patch } as Exercise : e),
    })));
  };

  const deleteExercise = async (id: string) => {
    const { error } = await supabase.from("sps_exercises" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading sessions…</p>;

  return (
    <div className="space-y-4">
      {playerId && (
        <ProgrammingWeeksEditor
          playerId={playerId}
          programmeLink={{ table: "sps_programs" as any, programmeId: programId }}
        />
      )}

      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Sessions</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur();
              setTimeout(() => { load(); toast.success("Saved"); }, 50);
            }}
          >
            <Save className="w-3.5 h-3.5 mr-1" />Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => addSession("pre")}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add pre-session
          </Button>
          <Button size="sm" onClick={() => addSession("main")}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add session
          </Button>
        </div>
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">No sessions yet. Add one to start building exercises.</p>
      )}

      {sessions.map(session => (
        <Card key={session.id} className={session.session_kind === "pre" ? "border-dashed" : ""}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Collapsible open={openSessions[session.id] !== false} onOpenChange={o => setOpenSessions(s => ({ ...s, [session.id]: o }))}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {openSessions[session.id] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${session.session_kind === "pre" ? "bg-muted text-muted-foreground border" : "bg-primary text-primary-foreground"}`}>
                {session.session_kind === "pre" ? "Pre" : "Main"}
              </span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-2 items-center">
                <Input
                  defaultValue={session.session_key}
                  onBlur={(e) => updateSession(session.id, { session_key: e.target.value.toUpperCase() })}
                  className="h-8"
                />
                <Input
                  defaultValue={session.title || ""}
                  placeholder="Session title"
                  onBlur={(e) => updateSession(session.id, { title: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-muted/40">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${session.session_kind === "main" ? "text-primary" : "text-muted-foreground"}`}>Main</span>
                <Switch
                  id={`skind-${session.id}`}
                  checked={session.session_kind === "pre"}
                  onCheckedChange={(c) => updateSession(session.id, { session_kind: c ? "pre" : "main" })}
                />
                <span className={`text-[10px] uppercase font-bold tracking-wider ${session.session_kind === "pre" ? "text-primary" : "text-muted-foreground"}`}>Pre</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteSession(session.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {openSessions[session.id] !== false && (
            <CardContent className="space-y-3">
              <Textarea
                defaultValue={session.staff_notes || ""}
                placeholder="Staff notes (optional)"
                onBlur={(e) => updateSession(session.id, { staff_notes: e.target.value })}
                className="min-h-[60px] text-sm"
              />

              <div className="space-y-3">
                {session.exercises.map((ex) => (
                  <Card key={ex.id} className="border-2 border-primary/30 bg-primary/[0.03]">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground shrink-0">Exercise</span>
                        <Input
                          defaultValue={ex.name}
                          placeholder="Exercise name"
                          onBlur={(e) => updateExercise(ex.id, { name: e.target.value })}
                          className="h-8 font-medium"
                        />
                        <Button size="sm" variant="outline" onClick={() => duplicateExercise(ex)} className="shrink-0">
                          <Copy className="w-3.5 h-3.5 mr-1" />Duplicate
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteExercise(ex.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        key={`desc-${ex.id}`}
                        defaultValue={ex.description || ""}
                        placeholder="Description / coaching points"
                        onBlur={(e) => updateExercise(ex.id, { description: e.target.value })}
                        className="min-h-[50px] text-sm"
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Reps</Label>
                          <Input defaultValue={ex.reps || ""} onBlur={(e) => updateExercise(ex.id, { reps: e.target.value })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sets</Label>
                          <Input defaultValue={ex.sets || ""} onBlur={(e) => updateExercise(ex.id, { sets: e.target.value })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Load</Label>
                          <Input defaultValue={ex.load || ""} onBlur={(e) => updateExercise(ex.id, { load: e.target.value })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Recovery</Label>
                          <Input defaultValue={ex.recovery_time || ""} onBlur={(e) => updateExercise(ex.id, { recovery_time: e.target.value })} className="h-8" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Video URL</Label>
                        <Input
                          defaultValue={ex.video_url || ""}
                          placeholder="https://…"
                          onBlur={(e) => updateExercise(ex.id, { video_url: e.target.value })}
                          className="h-8"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button size="sm" variant="outline" onClick={() => addExercise(session.id, session.exercises.length)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add exercise
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};