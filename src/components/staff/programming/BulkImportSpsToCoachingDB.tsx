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
const str = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
};
const hasMeaningfulValue = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return !!str(v);
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.some(hasMeaningfulValue);
  if (typeof v === "object") return Object.values(v).some(hasMeaningfulValue);
  return false;
};
const DETAIL_KEYS = [
  "description", "content", "repetitions", "reps", "sets", "load", "recoveryTime", "recovery_time",
  "rest_time", "videoUrl", "video_url", "notes", "staffNotes", "setup", "equipment",
  "players_required", "diagram",
];
const hasDetail = (row: any) => DETAIL_KEYS.some((key) => hasMeaningfulValue(row?.[key]));
const detailScore = (row: any): number => DETAIL_KEYS.reduce((total, key) => total + (hasMeaningfulValue(row?.[key]) ? 1 : 0), 0);
const flattenExercisePayload = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  return Object.values(payload).flatMap((value: any) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return flattenExercisePayload(value);
    return [];
  });
};
const sessionPayloadHasDetail = (payload: any) => flattenExercisePayload(payload).some(hasDetail);
const sessionPayloadScore = (payload: any) => flattenExercisePayload(payload).reduce((total, row) => total + detailScore(row), 0);
const technicalProgrammeHasDetail = (sessions: any[]) => sessions.some((session) =>
  (Array.isArray(session?.drills) ? session.drills : []).some((drill: any) =>
    hasDetail(drill) || (Array.isArray(drill?.variations) ? drill.variations : []).some(hasDetail)
  )
);
const spsProgrammeHasDetail = (sessions: any[]) => sessions.some((session) => sessionPayloadHasDetail(session?.exercises));
const programmePayloadScore = (source: Source, sessions: any[]) => {
  if (source === "sps") return sessions.reduce((total, session) => total + sessionPayloadScore(session?.exercises), 0);
  return sessions.reduce((total, session) => {
    const drills = Array.isArray(session?.drills) ? session.drills : [];
    return total + drills.reduce((drillTotal: number, drill: any) => {
      const variations = Array.isArray(drill?.variations) ? drill.variations : [];
      return drillTotal + detailScore(drill) + variations.reduce((varTotal: number, variation: any) => varTotal + detailScore(variation), 0);
    }, 0);
  }, 0);
};
const normaliseAttachments = (attachments: any): Record<string, any> => {
  if (!attachments) return {};
  if (Array.isArray(attachments)) {
    return attachments.reduce((acc: Record<string, any>, item: any) => {
      if (item && typeof item === "object" && !Array.isArray(item)) return { ...acc, ...item };
      return acc;
    }, {});
  }
  if (typeof attachments === "object") return attachments;
  return {};
};
type ImportResult = { inserted: number; hydrated: number };
const changedTotal = (r: ImportResult) => r.inserted + r.hydrated;
const weeksFromDates = (start: any, end: any): number | null => {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
};

const loadSpsPrograms = async () => {
  const { data, error } = await supabase
    .from("player_programs")
    .select("program_name, phase_name, overview_text, start_date, end_date, sessions");
  if (error) throw error;
  return data || [];
};

const loadSpsStructured = async () => {
  const { data: programs, error: pErr } = await supabase
    .from("sps_programs" as any)
    .select("id, program_name, phase_name, overview_text, start_date, end_date");
  if (pErr) throw pErr;
  const progIds = (programs || []).map((p: any) => p.id);
  const { data: sessions } = progIds.length
    ? await supabase
        .from("sps_sessions" as any)
        .select("id, program_id, session_key, session_kind, title, description, staff_notes, display_order")
        .in("program_id", progIds)
    : { data: [] as any[] };
  const sessIds = (sessions || []).map((s: any) => s.id);
  const { data: exercises } = sessIds.length
    ? await supabase
        .from("sps_exercises" as any)
        .select("session_id, name, description, reps, sets, load, recovery_time, video_url, display_order")
        .in("session_id", sessIds)
    : { data: [] as any[] };
  return { programs: programs || [], sessions: sessions || [], exercises: exercises || [] };
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
        .select("id, session_id, name, description, reps, sets, reps_per_side, load, recovery_time, notes, diagram, display_order")
        .in("session_id", sessIds)
    : { data: [] as any[] };
  const drillIds = (drills || []).map((d: any) => d.id);
  const { data: variations } = drillIds.length
    ? await supabase
        .from("technical_drill_variations" as any)
        .select("drill_id, name, description, reps, sets, reps_per_side, load, recovery_time, notes, diagram, display_order")
        .in("drill_id", drillIds)
    : { data: [] as any[] };
  return { programs: programs || [], sessions: sessions || [], drills: drills || [], variations: variations || [] };
};

const categoryFor = (source: Source) => (source === "sps" ? SPS_CATEGORY : TECH_CATEGORY);

// ---- Exercise harvest ---------------------------------------------------
type ExerciseRow = {
  title: string;
  description: string | null;
  content: string | null; // notes
  reps: string | null;
  sets: number | null;
  load: string | null;
  rest_time: number | null;
  video_url: string | null;
  category: string;
};

const isExerciseShell = (r: any) => !hasDetail(r);

const importExercises = async (source: Source) => {
  const cat = categoryFor(source);
  const { data: existing } = await supabase
    .from("coaching_exercises")
    .select("id, title, description, reps, sets, load, rest_time, video_url, content")
    .eq("category", cat);
  const existingByKey = new Map<string, any>();
  (existing || []).forEach((r: any) => existingByKey.set(normalize(r.title), r));

  const harvested = new Map<string, ExerciseRow>();
  const push = (e: { name: string; description?: string; reps?: string; sets?: any; load?: string; recoveryTime?: string; videoUrl?: string; notes?: string }) => {
    const name = (e.name || "").trim();
    if (!name) return;
    const key = normalize(name);
    const row: ExerciseRow = {
      title: name,
      description: str(e.description),
      content: str(e.notes),
      reps: str(e.reps),
      sets: toInt(e.sets),
      load: str(e.load),
      rest_time: toInt(e.recoveryTime),
      video_url: str(e.videoUrl),
      category: cat,
    };
    const prior = harvested.get(key);
    if (!prior) { harvested.set(key, row); return; }
    // Merge richer info across duplicates
    harvested.set(key, {
      ...prior,
      title: prior.title,
      description: prior.description || row.description,
      content: prior.content || row.content,
      reps: prior.reps || row.reps,
      sets: prior.sets ?? row.sets,
      load: prior.load || row.load,
      rest_time: prior.rest_time ?? row.rest_time,
      video_url: prior.video_url || row.video_url,
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
          notes: e?.notes,
        }));
      });
    });
    // Also pull from structured sps_exercises (rich source)
    const struct = await loadSpsStructured();
    struct.exercises.forEach((e: any) => push({
      name: e.name,
      description: e.description,
      reps: e.reps,
      sets: e.sets,
      load: e.load,
      recoveryTime: e.recovery_time,
      videoUrl: e.video_url,
    }));
  } else {
    const tech = await loadTechnical();
    tech.drills.forEach((d: any) => push({
      name: d.name,
      description: d.description,
      reps: d.reps,
      sets: d.sets,
      load: d.load,
      recoveryTime: d.recovery_time,
      notes: d.notes,
    }));
    tech.variations.forEach((v: any) => push({
      name: v.name,
      description: v.description,
      reps: v.reps,
      sets: v.sets,
      load: v.load,
      recoveryTime: v.recovery_time,
      notes: v.notes,
    }));
  }

  const toInsert: ExerciseRow[] = [];
  const toUpdate: { id: string; patch: Partial<ExerciseRow> }[] = [];
  for (const [key, row] of harvested) {
    if (!hasDetail(row)) continue;
    const ex = existingByKey.get(key);
    if (!ex) { toInsert.push(row); continue; }
    if (!isExerciseShell(ex)) continue; // preserve real entries
    const patch: Partial<ExerciseRow> = {};
    if (!str(ex.description) && row.description) patch.description = row.description;
    if (!str(ex.content) && row.content) patch.content = row.content;
    if (!str(ex.reps) && row.reps) patch.reps = row.reps;
    if (ex.sets == null && row.sets != null) patch.sets = row.sets;
    if (!str(ex.load) && row.load) patch.load = row.load;
    if (ex.rest_time == null && row.rest_time != null) patch.rest_time = row.rest_time;
    if (!str(ex.video_url) && row.video_url) patch.video_url = row.video_url;
    if (Object.keys(patch).length) toUpdate.push({ id: ex.id, patch });
  }

  const result: ImportResult = { inserted: 0, hydrated: 0 };
  if (toInsert.length) {
    const { error } = await supabase.from("coaching_exercises").insert(toInsert as any);
    if (error) throw error;
    result.inserted += toInsert.length;
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from("coaching_exercises").update(u.patch as any).eq("id", u.id);
    if (error) throw error;
    result.hydrated += 1;
  }
  return result;
};

// ---- Session harvest ----------------------------------------------------
const isSessionShell = (r: any) => {
  return !sessionPayloadHasDetail(r?.exercises);
};

const importSessions = async (source: Source) => {
  const cat = categoryFor(source);
  const { data: existing } = await supabase
    .from("coaching_sessions")
    .select("id, title, description, exercises")
    .eq("category", cat);
  const existingByKey = new Map<string, any>();
  (existing || []).forEach((r: any) => existingByKey.set(normalize(r.title), r));

  const harvested = new Map<string, { title: string; description: string | null; exercises: any[] }>();
  const push = (title: string, description: string | null, exercises: any[]) => {
    title = (title || "").trim();
    if (!title) return;
    const key = normalize(title);
    const prior = harvested.get(key);
    if (!prior) { harvested.set(key, { title, description, exercises }); return; }
    // Prefer the version with more exercises / richer description
    const nextScore = sessionPayloadScore(exercises);
    const priorScore = sessionPayloadScore(prior.exercises);
    if (nextScore > priorScore || ((exercises?.length || 0) > (prior.exercises?.length || 0) && nextScore >= priorScore)) {
      harvested.set(key, { title, description: prior.description || description, exercises });
    } else if (!prior.description && description) {
      harvested.set(key, { ...prior, description });
    }
  };

  if (source === "sps") {
    const sps = await loadSpsPrograms();
    sps.forEach((p: any) => {
      const sessions = p.sessions && typeof p.sessions === "object" ? p.sessions : {};
      Object.entries(sessions).forEach(([key, s]: [string, any]) => {
        const title = (s?.title || `Session ${key}`).trim();
        const exercises = (Array.isArray(s?.exercises) ? s.exercises : []).map((e: any) => ({
          name: e?.name,
          description: e?.description || "",
          repetitions: e?.reps || e?.repetitions || "",
          sets: e?.sets || "",
          load: e?.load || "",
          recoveryTime: e?.recoveryTime || e?.recovery_time || "",
          videoUrl: e?.videoUrl && e.videoUrl !== "-" ? e.videoUrl : "",
        }));
        push(title, s?.staffNotes || null, exercises);
      });
    });
    // Structured sps_sessions too
    const struct = await loadSpsStructured();
    const exBySess = new Map<string, any[]>();
    struct.exercises.forEach((e: any) => {
      const a = exBySess.get(e.session_id) || [];
      a.push(e);
      exBySess.set(e.session_id, a);
    });
    struct.sessions.forEach((s: any) => {
      const title = (s.title || `Session ${s.session_key}`).trim();
      const exs = (exBySess.get(s.id) || [])
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((e: any) => ({
          name: e.name,
          description: e.description || "",
          repetitions: e.reps || "",
          sets: e.sets || "",
          load: e.load || "",
          recoveryTime: e.recovery_time || "",
          videoUrl: e.video_url || "",
        }));
      push(title, s.staff_notes || s.description || null, exs);
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
      const drillToEx = (x: any, baseLabel?: string) => ({
        name: baseLabel ? `${baseLabel} — ${x.name}` : x.name,
        description: x.description || "",
        repetitions: [x.reps, x.reps_per_side ? "each side" : null].filter(Boolean).join(" "),
        sets: x.sets || "",
        load: x.load || "",
        recoveryTime: x.recovery_time || "",
        notes: x.notes || "",
        diagram: x.diagram || null,
      });
      drills.forEach((d: any) => {
        exercises.push(drillToEx(d));
        (variationsByDrill.get(d.id) || [])
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .forEach((v: any) => exercises.push(drillToEx(v, d.name)));
      });
      push(s.title || s.session_key, s.description || null, exercises);
    });
  }

  const toInsert: any[] = [];
  const toUpdate: { id: string; patch: any }[] = [];
  for (const [key, row] of harvested) {
    if (!sessionPayloadHasDetail(row.exercises)) continue;
    const ex = existingByKey.get(key);
    if (!ex) { toInsert.push({ ...row, category: cat }); continue; }
    if (!isSessionShell(ex)) continue;
    if ((row.exercises?.length || 0) === 0) continue;
    const patch: any = { exercises: row.exercises };
    if (!ex.description && row.description) patch.description = row.description;
    toUpdate.push({ id: ex.id, patch });
  }
  const result: ImportResult = { inserted: 0, hydrated: 0 };
  if (toInsert.length) {
    const { error } = await supabase.from("coaching_sessions").insert(toInsert as any);
    if (error) throw error;
    result.inserted += toInsert.length;
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from("coaching_sessions").update(u.patch).eq("id", u.id);
    if (error) throw error;
    result.hydrated += 1;
  }
  return result;
};

// ---- Programme harvest --------------------------------------------------
const programmeAttachmentKey = (source: Source) => source === "sps" ? "sps_sessions" : "technical_sessions";
const isProgrammeShell = (r: any, key: string) => {
  const att = normaliseAttachments(r?.attachments);
  const payload = Array.isArray(att[key]) ? att[key] : [];
  const hasPayloadDetail = key === "sps_sessions" ? spsProgrammeHasDetail(payload) : technicalProgrammeHasDetail(payload);
  return !hasPayloadDetail;
};

const importProgrammes = async (source: Source) => {
  const cat = categoryFor(source);
  const attKey = programmeAttachmentKey(source);
  const { data: existing } = await supabase
    .from("coaching_programmes")
    .select("id, title, content, weeks, attachments")
    .eq("category", cat);
  const existingByKey = new Map<string, any>();
  (existing || []).forEach((r: any) => existingByKey.set(normalize(r.title), r));

  type Programme = {
    title: string;
    phase: string | null;
    overview: string | null;
    weeks: number | null;
    payload: any[]; // sessions in importable shape
  };
  const harvested = new Map<string, Programme>();
  const push = (p: Programme) => {
    const key = normalize(p.title);
    if (!key) return;
    const prior = harvested.get(key);
    if (!prior) { harvested.set(key, p); return; }
    const nextScore = programmePayloadScore(source, p.payload);
    const priorScore = programmePayloadScore(source, prior.payload);
    if (nextScore > priorScore || ((p.payload?.length || 0) > (prior.payload?.length || 0) && nextScore >= priorScore)) {
      harvested.set(key, { ...p, overview: prior.overview || p.overview, phase: prior.phase || p.phase, weeks: prior.weeks ?? p.weeks });
    }
  };

  if (source === "sps") {
    const sps = await loadSpsPrograms();
    sps.forEach((p: any) => {
      const sessions = p.sessions && typeof p.sessions === "object" ? p.sessions : {};
      const payload = Object.entries(sessions).map(([key, s]: [string, any]) => ({
        key,
        title: s?.title || `Session ${key}`,
        staffNotes: s?.staffNotes || "",
        exercises: (Array.isArray(s?.exercises) ? s.exercises : []).map((e: any) => ({
          name: e?.name || "",
          description: e?.description || "",
          repetitions: e?.reps || e?.repetitions || "",
          sets: e?.sets || "",
          load: e?.load || "",
          recoveryTime: e?.recoveryTime || e?.recovery_time || "",
          videoUrl: e?.videoUrl && e.videoUrl !== "-" ? e.videoUrl : "",
        })),
      })).filter(s => s.title || s.exercises.length);
      push({
        title: p.program_name,
        phase: p.phase_name || null,
        overview: p.overview_text || null,
        weeks: weeksFromDates(p.start_date, p.end_date),
        payload,
      });
    });
    // Structured sps_programs
    const struct = await loadSpsStructured();
    const sessByProg = new Map<string, any[]>();
    struct.sessions.forEach((s: any) => {
      const a = sessByProg.get(s.program_id) || []; a.push(s); sessByProg.set(s.program_id, a);
    });
    const exBySess = new Map<string, any[]>();
    struct.exercises.forEach((e: any) => {
      const a = exBySess.get(e.session_id) || []; a.push(e); exBySess.set(e.session_id, a);
    });
    struct.programs.forEach((p: any) => {
      const sess = (sessByProg.get(p.id) || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const payload = sess.map((s: any) => ({
        key: s.session_key,
        title: s.title || `Session ${s.session_key}`,
        staffNotes: s.staff_notes || s.description || "",
        exercises: (exBySess.get(s.id) || [])
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map((e: any) => ({
            name: e.name || "",
            description: e.description || "",
            repetitions: e.reps || "",
            sets: e.sets || "",
            load: e.load || "",
            recoveryTime: e.recovery_time || "",
            videoUrl: e.video_url || "",
          })),
      }));
      push({
        title: p.program_name,
        phase: p.phase_name || null,
        overview: p.overview_text || null,
        weeks: weeksFromDates(p.start_date, p.end_date),
        payload,
      });
    });
  } else {
    const tech = await loadTechnical();
    const sessByProg = new Map<string, any[]>();
    tech.sessions.forEach((s: any) => {
      const a = sessByProg.get(s.program_id) || []; a.push(s); sessByProg.set(s.program_id, a);
    });
    const drillsBySess = new Map<string, any[]>();
    tech.drills.forEach((d: any) => {
      const a = drillsBySess.get(d.session_id) || []; a.push(d); drillsBySess.set(d.session_id, a);
    });
    const varsByDrill = new Map<string, any[]>();
    tech.variations.forEach((v: any) => {
      const a = varsByDrill.get(v.drill_id) || []; a.push(v); varsByDrill.set(v.drill_id, a);
    });
    tech.programs.forEach((p: any) => {
      const sess = (sessByProg.get(p.id) || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const payload = sess.map((s: any) => {
        const drills = (drillsBySess.get(s.id) || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        return {
          key: s.session_key,
          title: s.title || `Session ${s.session_key}`,
          description: s.description || "",
          drills: drills.map((d: any) => ({
            name: d.name,
            description: d.description,
            reps: d.reps,
            sets: d.sets,
            reps_per_side: !!d.reps_per_side,
            load: d.load,
            recovery_time: d.recovery_time,
            notes: d.notes,
            diagram: d.diagram,
            variations: (varsByDrill.get(d.id) || [])
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
              .map((v: any) => ({
                label: v.name,
                description: v.description,
                reps: v.reps,
                sets: v.sets,
                reps_per_side: !!v.reps_per_side,
                load: v.load,
                recovery_time: v.recovery_time,
                notes: v.notes,
                diagram: v.diagram,
              })),
          })),
        };
      });
      push({
        title: p.program_name,
        phase: p.phase_name || null,
        overview: null,
        weeks: weeksFromDates(p.start_date, p.end_date),
        payload,
      });
    });
  }

  const toInsert: any[] = [];
  const toUpdate: { id: string; patch: any }[] = [];
  for (const [key, p] of harvested) {
    const hasPayloadDetail = source === "sps" ? spsProgrammeHasDetail(p.payload) : technicalProgrammeHasDetail(p.payload);
    if (!hasPayloadDetail) continue; // don't write empty shells
    const att = { [attKey]: p.payload };
    const ex = existingByKey.get(key);
    if (!ex) {
      toInsert.push({
        title: p.title,
        description: p.phase,
        content: p.overview,
        weeks: p.weeks,
        category: cat,
        attachments: att,
      });
      continue;
    }
    if (!isProgrammeShell(ex, attKey)) continue; // preserve real entries
    const mergedAtt = { ...normaliseAttachments(ex.attachments), ...att };
    const patch: any = { attachments: mergedAtt };
    if (!ex.content && p.overview) patch.content = p.overview;
    if (ex.weeks == null && p.weeks != null) patch.weeks = p.weeks;
    toUpdate.push({ id: ex.id, patch });
  }

  const result: ImportResult = { inserted: 0, hydrated: 0 };
  if (toInsert.length) {
    const { error } = await supabase.from("coaching_programmes").insert(toInsert as any);
    if (error) throw error;
    result.inserted += toInsert.length;
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from("coaching_programmes").update(u.patch).eq("id", u.id);
    if (error) throw error;
    result.hydrated += 1;
  }
  return result;
};

interface Props {
  source?: Source;
}

export const BulkImportSpsToCoachingDB = ({ source = "sps" }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const label = source === "technical" ? "Technical" : "SPS";

  const run = async (kind: string, key: string, fn: () => Promise<ImportResult>) => {
    if (busy) return;
    if (!confirm(`Import all ${label} ${kind.toLowerCase()} into the coaching database? Existing rich entries are left untouched; empty shells from previous imports get filled in.`)) return;
    setBusy(key);
    try {
      const result = await fn();
      const n = changedTotal(result);
      if (n) {
        toast.success(`${label} ${kind.toLowerCase()}: ${result.inserted} added, ${result.hydrated} hydrated`);
      } else {
        toast.info(`All matching ${label} ${kind.toLowerCase()} already have usable data`);
      }
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