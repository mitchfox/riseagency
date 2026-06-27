import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const SPS_FIELDS = ["sessionA", "sessionB", "sessionC", "sessionD", "sessionE", "sessionF", "sessionG", "sessionH"];

type SessionMeta = { key: string; title: string | null; type: "sps" | "technical" };

const BodySchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().min(1).max(255).transform((value) => value.trim().toLowerCase()),
});

const hasExercises = (session: any) =>
  !!session && Array.isArray(session.exercises) && session.exercises.length > 0;

const displayKeyFromSpsSessionKey = (rawKey: string) => {
  const key = String(rawKey || "").trim();
  if (!key) return "";
  const sessionMatch = key.match(/^session([a-h])$/i);
  if (sessionMatch) return sessionMatch[1].toUpperCase();
  const preMatch = key.match(/^pre[-_ ]?([a-h])$/i);
  if (preMatch) return `Pre-${preMatch[1].toUpperCase()}`;
  return key.toUpperCase();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { playerId, email } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Keep this function scoped to the portal login pattern: the caller must
    // already know the exact player id and the email/login code saved by Login.tsx.
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, email")
      .eq("id", playerId)
      .ilike("email", email)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [weeksRes, playerProgramsRes, techProgramsRes, spsProgramsRes] = await Promise.all([
      supabase
        .from("programming_weeks")
        .select("id, label, week_start_date, slots, display_order, created_at")
        .eq("player_id", playerId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("player_programs")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("technical_programs")
        .select("*")
        .eq("player_id", playerId)
        .order("display_order", { ascending: true }),
      supabase
        .from("sps_programs")
        .select("id, linked_week_ids")
        .eq("player_id", playerId),
    ]);

    if (weeksRes.error) throw weeksRes.error;
    if (playerProgramsRes.error) throw playerProgramsRes.error;
    if (techProgramsRes.error) throw techProgramsRes.error;

    const playerPrograms = playerProgramsRes.data || [];
    const techPrograms = techProgramsRes.data || [];
    const spsPrograms = spsProgramsRes.data || [];

    const refToSession = new Map<string, SessionMeta>();

    for (const program of playerPrograms as any[]) {
      const sessions = (program.sessions || {}) as Record<string, any>;

      for (const f of SPS_FIELDS) {
        const letter = f.replace("session", "").toUpperCase();
        const data = sessions[f] || sessions[letter];
        if (!hasExercises(data)) continue;
        const meta = { key: letter, title: data?.title ?? null, type: "sps" as const };
        refToSession.set(`sps:${program.id}:${f}`, meta);
        refToSession.set(`sps:${program.id}:${letter}`, meta);
      }

      for (const rawKey of Object.keys(sessions)) {
        const data = sessions[rawKey];
        if (!hasExercises(data)) continue;
        const key = displayKeyFromSpsSessionKey(rawKey);
        if (!key) continue;
        const meta = { key, title: data?.title ?? null, type: "sps" as const };
        refToSession.set(`sps:${program.id}:${rawKey}`, meta);
        refToSession.set(`sps:${program.id}:session${key.replace(/^Pre-/i, "")}`, meta);
      }
    }

    const spsProgramIds = (spsPrograms as any[]).map((p) => p.id).filter(Boolean);
    if (spsProgramIds.length) {
      const { data: spsSessions } = await supabase
        .from("sps_sessions")
        .select("id, session_key, session_kind, title")
        .in("program_id", spsProgramIds);
      for (const s of (spsSessions || []) as any[]) {
        const prefix = s.session_kind === "pre" ? "Pre-" : "";
        refToSession.set(`sps:${s.id}`, {
          key: `${prefix}${String(s.session_key || "").toUpperCase()}`,
          title: s.title ?? null,
          type: "sps",
        });
      }
    }

    const techProgramIds = (techPrograms as any[]).map((p) => p.id).filter(Boolean);
    const { data: technicalSessions } = techProgramIds.length
      ? await supabase
          .from("technical_sessions")
          .select("*")
          .in("program_id", techProgramIds)
          .order("display_order", { ascending: true })
      : { data: [] as any[] };

    for (const s of (technicalSessions || []) as any[]) {
      refToSession.set(`tech:${s.id}`, {
        key: s.session_key || "",
        title: s.title ?? null,
        type: "technical",
      });
    }

    const technicalSessionIds = (technicalSessions || []).map((s: any) => s.id);
    const { data: technicalDrills } = technicalSessionIds.length
      ? await supabase
          .from("technical_drills")
          .select("*")
          .in("session_id", technicalSessionIds)
          .order("display_order", { ascending: true })
      : { data: [] as any[] };

    const technicalDrillIds = (technicalDrills || []).map((d: any) => d.id);
    const { data: technicalVariations } = technicalDrillIds.length
      ? await supabase
          .from("technical_drill_variations")
          .select("*")
          .in("drill_id", technicalDrillIds)
          .order("display_order", { ascending: true })
      : { data: [] as any[] };

    const weekRows = ((weeksRes.data || []) as any[]).map((w) => ({ ...w, slots: w.slots || {} }));
    const weekById = new Map<string, any>(weekRows.map((w) => [w.id, w]));

    const buildWeek = (row: any) => {
      const out: Record<string, any> = {
        week_start_date: row.week_start_date || null,
        week: row.label || "",
      };
      for (const day of DAYS) {
        const slot = (row.slots || {})[day] || {};
        if (slot.refId) {
          const meta = refToSession.get(slot.refId);
          out[day] = meta?.key || "";
        } else if (slot.free_text) {
          out[day] = slot.free_text;
        } else {
          out[day] = "";
        }
      }
      return out;
    };

    const byProgram = new Map<string, any[]>();
    for (const program of [...(playerPrograms as any[]), ...(techPrograms as any[]), ...(spsPrograms as any[])]) {
      const ids: string[] = Array.isArray(program.linked_week_ids) ? program.linked_week_ids : [];
      byProgram.set(program.id, ids.map((id) => weekById.get(id)).filter(Boolean).map(buildWeek));
    }

    const normalizedPrograms = (playerPrograms as any[]).map((program) => {
      const unifiedWeeks = byProgram.get(program.id) || [];
      const legacyWeeks = Array.isArray(program.weekly_schedules) ? program.weekly_schedules : [];
      return {
        ...program,
        weekly_schedules: unifiedWeeks.length > 0 ? unifiedWeeks : legacyWeeks,
        sessions: program.sessions && typeof program.sessions === "object" && !Array.isArray(program.sessions)
          ? program.sessions
          : {},
      };
    });

    const nestedTechnicalPrograms = (techPrograms as any[]).map((program) => {
      const sessions = (technicalSessions || [])
        .filter((s: any) => s.program_id === program.id)
        .map((session: any) => {
          const drills = (technicalDrills || [])
            .filter((d: any) => d.session_id === session.id)
            .map((drill: any) => ({
              ...drill,
              variations: (technicalVariations || []).filter((v: any) => v.drill_id === drill.id),
            }));
          return { ...session, drills };
        });
      return {
        ...program,
        weekly_schedules: byProgram.get(program.id) || (Array.isArray(program.weekly_schedules) ? program.weekly_schedules : []),
        sessions,
      };
    });

    return new Response(JSON.stringify({
      programs: normalizedPrograms,
      hasTechnicalPrograms: nestedTechnicalPrograms.length > 0,
      technicalPrograms: nestedTechnicalPrograms,
      masterSchedule: weekRows.map(buildWeek),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-player-programming error", error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});