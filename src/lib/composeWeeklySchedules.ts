import { supabase } from "@/integrations/supabase/client";

/**
 * Builds a legacy-shaped `weekly_schedules` array for each programme by reading
 * the unified `programming_weeks` table. The output matches the JSON shape the
 * portal renderers already consume: `{ week_start_date, monday: 'A', tuesday: 'B', ... }`.
 *
 * This lets the portal (Dashboard + Hub) reflect edits made via the new
 * ProgrammingWeeksEditor without having to rewrite their render trees.
 */

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

interface SessionMeta {
  key: string;
  title: string | null;
  type: "sps" | "technical";
}

const SPS_FIELDS = [
  "sessionA", "sessionB", "sessionC", "sessionD",
  "sessionE", "sessionF", "sessionG", "sessionH",
];

export const composeWeeklySchedulesForPlayer = async (playerId: string) => {
  // Pull all programming_weeks for the player and resolve refIds → session keys
  const [weeksRes, spsProgs, techProgs, spsNewProgs] = await Promise.all([
    supabase
      .from("programming_weeks" as any)
      .select("id, label, week_start_date, slots, display_order, created_at")
      .eq("player_id", playerId)
      .order("display_order")
      .order("created_at"),
    supabase
      .from("player_programs")
      .select("id, sessions, linked_week_ids")
      .eq("player_id", playerId),
    supabase
      .from("technical_programs" as any)
      .select("id, linked_week_ids")
      .eq("player_id", playerId),
    supabase
      .from("sps_programs" as any)
      .select("id, linked_week_ids")
      .eq("player_id", playerId),
  ]);

  const refToSession = new Map<string, SessionMeta>();

  for (const p of (spsProgs.data || []) as any[]) {
    const sess = (p.sessions || {}) as Record<string, any>;
    for (const f of SPS_FIELDS) {
      const data = sess[f] || sess[f.replace("session", "").toUpperCase()];
      const hasContent = data && Array.isArray(data.exercises) && data.exercises.length > 0;
      if (!hasContent) continue;
      const key = f.replace("session", "");
      refToSession.set(`sps:${p.id}:${f}`, { key, title: data?.title ?? null, type: "sps" });
    }
  }

  const newSpsProgIds = ((spsNewProgs.data || []) as any[]).map((p) => p.id);
  if (newSpsProgIds.length) {
    const { data: spsSess } = await supabase
      .from("sps_sessions" as any)
      .select("id, session_key, session_kind, title")
      .in("program_id", newSpsProgIds);
    for (const s of ((spsSess || []) as any[])) {
      const prefix = s.session_kind === "pre" ? "Pre-" : "";
      refToSession.set(`sps:${s.id}`, {
        key: `${prefix}${s.session_key || ""}`,
        title: s.title ?? null,
        type: "sps",
      });
    }
  }

  const techProgIds = ((techProgs.data || []) as any[]).map((p) => p.id);
  if (techProgIds.length) {
    const { data: techSess } = await supabase
      .from("technical_sessions" as any)
      .select("id, session_key, title")
      .in("program_id", techProgIds);
    for (const s of ((techSess || []) as any[])) {
      refToSession.set(`tech:${s.id}`, {
        key: s.session_key || "",
        title: s.title ?? null,
        type: "technical",
      });
    }
  }

  // Index weeks by id for quick lookup
  const weekRows = ((weeksRes.data || []) as any[]).map((w) => ({ ...w, slots: w.slots || {} }));
  const weekById = new Map<string, any>(weekRows.map((w) => [w.id, w]));

  const buildWeek = (row: any) => {
    const out: any = {
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

  // Map each programme id → its weekly_schedules array (only its linked weeks, in order)
  const byProgram = new Map<string, any[]>();
  for (const p of (spsProgs.data || []) as any[]) {
    const ids: string[] = (p.linked_week_ids || []) as string[];
    byProgram.set(p.id, ids.map((id) => weekById.get(id)).filter(Boolean).map(buildWeek));
  }
  for (const p of (techProgs.data || []) as any[]) {
    const ids: string[] = (p.linked_week_ids || []) as string[];
    byProgram.set(p.id, ids.map((id) => weekById.get(id)).filter(Boolean).map(buildWeek));
  }
  for (const p of (spsNewProgs.data || []) as any[]) {
    const ids: string[] = (p.linked_week_ids || []) as string[];
    byProgram.set(p.id, ids.map((id) => weekById.get(id)).filter(Boolean).map(buildWeek));
  }

  // Also return a master list (all weeks) — useful for Hub "today" lookup
  const master = weekRows.map(buildWeek);

  return { byProgram, master };
};