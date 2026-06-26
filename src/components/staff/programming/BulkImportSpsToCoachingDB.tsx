import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Dumbbell, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const normalize = (s: string) => (s || "").trim().toLowerCase();

const importExercises = async () => {
  const { data: ex, error } = await supabase
    .from("sps_exercises")
    .select("name, description, reps, sets, load, recovery_time, video_url");
  if (error) throw error;
  const { data: existing } = await supabase.from("coaching_exercises").select("title");
  const existingSet = new Set((existing || []).map(r => normalize(r.title)));
  const seen = new Set<string>();
  const rows: any[] = [];
  (ex || []).forEach((e: any) => {
    const name = (e.name || "").trim();
    if (!name) return;
    const key = normalize(name);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    const setsNum = e.sets ? parseInt(String(e.sets).match(/\d+/)?.[0] || "", 10) : null;
    const restNum = e.recovery_time ? parseInt(String(e.recovery_time).match(/\d+/)?.[0] || "", 10) : null;
    rows.push({
      title: name,
      description: e.description || null,
      reps: e.reps || null,
      sets: Number.isFinite(setsNum as number) ? setsNum : null,
      load: e.load || null,
      rest_time: Number.isFinite(restNum as number) ? restNum : null,
      video_url: e.video_url || null,
      category: "Strength, Power & Speed",
    });
  });
  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_exercises").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

const importSessions = async () => {
  const { data: sessions, error } = await supabase
    .from("sps_sessions")
    .select("id, title, session_key, description");
  if (error) throw error;
  const { data: existing } = await supabase.from("coaching_sessions").select("title");
  const existingSet = new Set((existing || []).map(r => normalize(r.title)));

  const sessionIds = (sessions || []).map((s: any) => s.id);
  const { data: allEx } = sessionIds.length
    ? await supabase
        .from("sps_exercises")
        .select("session_id, name, reps, sets, load, recovery_time, display_order")
        .in("session_id", sessionIds)
        .order("display_order", { ascending: true })
    : { data: [] as any[] };
  const exBySession = new Map<string, any[]>();
  (allEx || []).forEach((e: any) => {
    const arr = exBySession.get(e.session_id) || [];
    arr.push(e);
    exBySession.set(e.session_id, arr);
  });

  const seen = new Set<string>();
  const rows: any[] = [];
  (sessions || []).forEach((s: any) => {
    const title = (s.title || s.session_key || "").trim();
    if (!title) return;
    const key = normalize(title);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    const exercises = (exBySession.get(s.id) || []).map(e => ({
      title: e.name,
      reps: e.reps,
      sets: e.sets,
      load: e.load,
      recovery_time: e.recovery_time,
    }));
    rows.push({
      title,
      description: s.description || null,
      category: "Strength, Power & Speed",
      exercises,
    });
  });
  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_sessions").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

const importProgrammes = async () => {
  const { data: programs, error } = await supabase
    .from("sps_programs")
    .select("program_name, phase_name, overview_text, start_date, end_date");
  if (error) throw error;
  const { data: existing } = await supabase.from("coaching_programmes").select("title");
  const existingSet = new Set((existing || []).map(r => normalize(r.title)));
  const seen = new Set<string>();
  const rows: any[] = [];
  (programs || []).forEach((p: any) => {
    const title = (p.program_name || "").trim();
    if (!title) return;
    const key = normalize(title);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    let weeks: number | null = null;
    if (p.start_date && p.end_date) {
      const ms = new Date(p.end_date).getTime() - new Date(p.start_date).getTime();
      if (Number.isFinite(ms) && ms > 0) weeks = Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
    }
    rows.push({
      title,
      description: p.phase_name || null,
      content: p.overview_text || null,
      weeks,
      category: "Strength, Power & Speed",
    });
  });
  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_programmes").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

export const BulkImportSpsToCoachingDB = () => {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, key: string, fn: () => Promise<number>) => {
    if (busy) return;
    if (!confirm(`Import all SPS ${label.toLowerCase()} into the coaching database? Duplicates will be skipped.`)) return;
    setBusy(key);
    try {
      const n = await fn();
      toast.success(n ? `Added ${n} ${label.toLowerCase()} to coaching database` : `No new ${label.toLowerCase()} to add`);
    } catch (e: any) {
      toast.error(e?.message || `Failed to import ${label.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Exercises", "ex", importExercises)}>
        <Dumbbell className="w-4 h-4 mr-1" />
        {busy === "ex" ? "Importing…" : "Add all exercises to Coaching DB"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Sessions", "ses", importSessions)}>
        <Layers className="w-4 h-4 mr-1" />
        {busy === "ses" ? "Importing…" : "Add all sessions to Coaching DB"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Programmes", "prog", importProgrammes)}>
        <Database className="w-4 h-4 mr-1" />
        {busy === "prog" ? "Importing…" : "Add all programmes to Coaching DB"}
      </Button>
    </div>
  );
};