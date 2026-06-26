import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Dumbbell, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Source = "sps" | "technical";

const SPS_CATEGORY = "Strength, Power & Speed";
const TECH_CATEGORY = "Technical";

const normalize = (s: string) => (s || "").trim().toLowerCase();
const toInt = (v: any) => {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/-?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
};

const loadSpsPrograms = async () => {
  const { data, error } = await supabase
    .from("player_programs")
    .select("program_name, phase_name, overview_text, start_date, end_date, sessions");
  if (error) throw error;
  return data || [];
};

const loadTechnical = async () => {
  const { data: programs, error: pErr } = await supabase
    .from("technical_programs" as any)
    .select("id, program_name, phase_name, start_date, end_date");
  if (pErr) throw pErr;
  const progIds = (programs || []).map((p: any) => p.id);
  const { data: sessions } = progIds.length
    ? await supabase
        .from("technical_sessions" as any)
        .select("id, program_id, title, session_key, description, display_order")
        .in("program_id", progIds)
    : { data: [] as any[] };
  const sessIds = (sessions || []).map((s: any) => s.id);
  const { data: drills } = sessIds.length
    ? await supabase
        .from("technical_drills" as any)
        .select("id, session_id, name, description, reps, sets, reps_per_side, load, recovery_time, display_order")
        .in("session_id", sessIds)
    : { data: [] as any[] };
  const drillIds = (drills || []).map((d: any) => d.id);
  const { data: variations } = drillIds.length
    ? await supabase
        .from("technical_drill_variations" as any)
        .select("drill_id, name, description, reps, sets, reps_per_side, load, recovery_time")
        .in("drill_id", drillIds)
    : { data: [] as any[] };
  return { programs: programs || [], sessions: sessions || [], drills: drills || [], variations: variations || [] };
};

const categoryFor = (source: Source) => (source === "sps" ? SPS_CATEGORY : TECH_CATEGORY);

const importExercises = async (source: Source) => {
  const cat = categoryFor(source);
  const { data: existing } = await supabase
    .from("coaching_exercises")
    .select("title, category")
    .eq("category", cat);
  const existingSet = new Set((existing || []).map((r: any) => normalize(r.title)));
  const seen = new Set<string>();
  const rows: any[] = [];

  const push = (e: { name: string; description?: string; reps?: string; sets?: any; load?: string; recoveryTime?: string; videoUrl?: string }) => {
    const name = (e.name || "").trim();
    if (!name) return;
    const key = normalize(name);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    rows.push({
      title: name,
      description: e.description || null,
      reps: e.reps || null,
      sets: toInt(e.sets),
      load: e.load || null,
      rest_time: toInt(e.recoveryTime),
      video_url: e.videoUrl || null,
      category: cat,
    });
  };

  if (source === "sps") {
    const sps = await loadSpsPrograms();
    sps.forEach((p: any) => {
      const sessions = p.sessions && typeof p.sessions === "object" ? p.sessions : {};
      Object.values(sessions).forEach((s: any) => {
        const exs = Array.isArray(s?.exercises) ? s.exercises : [];
        exs.forEach((e: any) => push({
          name: e?.name,
          description: e?.description,
          reps: e?.reps || e?.repetitions,
          sets: e?.sets,
          load: e?.load,
          recoveryTime: e?.recoveryTime || e?.recovery_time,
          videoUrl: e?.videoUrl && e.videoUrl !== "-" ? e.videoUrl : undefined,
        }));
      });
    });
  } else {
    const tech = await loadTechnical();
    tech.drills.forEach((d: any) => push({
      name: d.name,
      description: d.description,
      reps: d.reps,
      sets: d.sets,
      load: d.load,
      recoveryTime: d.recovery_time,
    }));
    tech.variations.forEach((v: any) => push({
      name: v.name,
      description: v.description,
      reps: v.reps,
      sets: v.sets,
      load: v.load,
      recoveryTime: v.recovery_time,
    }));
  }

  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_exercises").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

const importSessions = async (source: Source) => {
  const cat = categoryFor(source);
  const { data: existing } = await supabase
    .from("coaching_sessions")
    .select("title, category")
    .eq("category", cat);
  const existingSet = new Set((existing || []).map((r: any) => normalize(r.title)));
  const seen = new Set<string>();
  const rows: any[] = [];

  const push = (title: string, description: string | null, exercises: any[]) => {
    title = (title || "").trim();
    if (!title) return;
    const key = normalize(title);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    rows.push({ title, description, category: cat, exercises });
  };

  if (source === "sps") {
    const sps = await loadSpsPrograms();
    sps.forEach((p: any) => {
      const sessions = p.sessions && typeof p.sessions === "object" ? p.sessions : {};
      Object.entries(sessions).forEach(([key, s]: [string, any]) => {
        const title = (s?.title || `Session ${key}`).trim();
        const exercises = (Array.isArray(s?.exercises) ? s.exercises : []).map((e: any) => ({
          title: e?.name,
          reps: e?.reps || e?.repetitions,
          sets: e?.sets,
          load: e?.load,
          recovery_time: e?.recoveryTime || e?.recovery_time,
        }));
        push(title, s?.staffNotes || null, exercises);
      });
    });
  } else {
    const tech = await loadTechnical();
    const drillsBySession = new Map<string, any[]>();
    tech.drills.forEach((d: any) => {
      const a = drillsBySession.get(d.session_id) || [];
      a.push(d);
      drillsBySession.set(d.session_id, a);
    });
    const variationsByDrill = new Map<string, any[]>();
    tech.variations.forEach((v: any) => {
      const a = variationsByDrill.get(v.drill_id) || [];
      a.push(v);
      variationsByDrill.set(v.drill_id, a);
    });
    tech.sessions.forEach((s: any) => {
      const drills = (drillsBySession.get(s.id) || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const exercises: any[] = [];
      drills.forEach((d: any) => {
        exercises.push({ title: d.name, reps: d.reps, sets: d.sets, load: d.load, recovery_time: d.recovery_time });
        (variationsByDrill.get(d.id) || []).forEach((v: any) => {
          exercises.push({ title: `${d.name} — ${v.name}`, reps: v.reps, sets: v.sets, load: v.load, recovery_time: v.recovery_time });
        });
      });
      push(s.title || s.session_key, s.description || null, exercises);
    });
  }

  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_sessions").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

const importProgrammes = async (source: Source) => {
  const cat = categoryFor(source);
  const { data: existing } = await supabase
    .from("coaching_programmes")
    .select("title, category")
    .eq("category", cat);
  const existingSet = new Set((existing || []).map((r: any) => normalize(r.title)));
  const seen = new Set<string>();
  const rows: any[] = [];

  const push = (title: string, phase: string | null, overview: string | null, start: string | null, end: string | null) => {
    title = (title || "").trim();
    if (!title) return;
    const key = normalize(title);
    if (existingSet.has(key) || seen.has(key)) return;
    seen.add(key);
    let weeks: number | null = null;
    if (start && end) {
      const ms = new Date(end).getTime() - new Date(start).getTime();
      if (Number.isFinite(ms) && ms > 0) weeks = Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
    }
    rows.push({ title, description: phase, content: overview, weeks, category: cat });
  };

  if (source === "sps") {
    const sps = await loadSpsPrograms();
    sps.forEach((p: any) => push(p.program_name, p.phase_name, p.overview_text, p.start_date, p.end_date));
  } else {
    const tech = await loadTechnical();
    tech.programs.forEach((p: any) => push(p.program_name, p.phase_name, null, p.start_date, p.end_date));
  }

  if (!rows.length) return 0;
  const { error: insErr } = await supabase.from("coaching_programmes").insert(rows);
  if (insErr) throw insErr;
  return rows.length;
};

interface Props {
  source?: Source;
}

export const BulkImportSpsToCoachingDB = ({ source = "sps" }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const label = source === "technical" ? "Technical" : "SPS";

  const run = async (kind: string, key: string, fn: () => Promise<number>) => {
    if (busy) return;
    if (!confirm(`Import all ${label} ${kind.toLowerCase()} into the coaching database? Duplicates will be skipped.`)) return;
    setBusy(key);
    try {
      const n = await fn();
      toast.success(n ? `Added ${n} ${label} ${kind.toLowerCase()} to coaching database` : `No new ${label} ${kind.toLowerCase()} to add`);
    } catch (e: any) {
      toast.error(e?.message || `Failed to import ${kind.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Exercises", "ex", () => importExercises(source))}>
        <Dumbbell className="w-4 h-4 mr-1" />
        {busy === "ex" ? "Importing…" : `Add all ${label} exercises to Coaching DB`}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Sessions", "ses", () => importSessions(source))}>
        <Layers className="w-4 h-4 mr-1" />
        {busy === "ses" ? "Importing…" : `Add all ${label} sessions to Coaching DB`}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("Programmes", "prog", () => importProgrammes(source))}>
        <Database className="w-4 h-4 mr-1" />
        {busy === "prog" ? "Importing…" : `Add all ${label} programmes to Coaching DB`}
      </Button>
    </div>
  );
};