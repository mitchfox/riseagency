import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProgrammingSessionType = "sps" | "technical";

export interface ProgrammingSessionRef {
  /** Stable id for the slot reference. */
  refId: string;
  source: ProgrammingSessionType | "sps_normalised";
  /** Effective type (technical sessions can be toggled to act as 'sps'). */
  effectiveType: ProgrammingSessionType;
  programmeId: string;
  programmeName: string;
  sessionKey: string;
  sessionTitle: string | null;
  /** Only set for technical sessions and new SPS sessions (uuid). */
  sessionId?: string;
  /** Only set for legacy SPS sessions (e.g. 'sessionA'). */
  spsSessionField?: string;
  /** When true, this ref is kept only so historic slot refIds resolve.
   *  It should not be offered in the "Assign session" picker because the
   *  same underlying programme is already available via its new mirror. */
  hiddenFromPicker?: boolean;
}

const SPS_FIELDS = [
  "sessionA","sessionB","sessionC","sessionD","sessionE","sessionF","sessionG","sessionH",
];

export const useProgrammingSessions = (playerId: string | null) => {
  const [sessions, setSessions] = useState<ProgrammingSessionRef[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) { setSessions([]); return; }
    setLoading(true);
    const [spsRes, techProgRes, spsNewProgRes] = await Promise.all([
      supabase
        .from("player_programs")
        .select("id, program_name, sessions")
        .eq("player_id", playerId)
        .order("display_order"),
      supabase
        .from("technical_programs" as any)
        .select("id, program_name")
        .eq("player_id", playerId)
        .order("display_order"),
      supabase
        .from("sps_programs" as any)
        .select("id, program_name, legacy_player_program_id")
        .eq("player_id", playerId)
        .order("display_order"),
    ]);

    const out: ProgrammingSessionRef[] = [];

    for (const p of (spsRes.data || []) as any[]) {
      const sess = (p.sessions || {}) as Record<string, any>;
      for (const f of SPS_FIELDS) {
        const data = sess[f] || sess[f.replace("session", "").toUpperCase()];
        const hasContent = data && Array.isArray(data.exercises) && data.exercises.length > 0;
        if (!hasContent) continue;
        const key = f.replace("session", "");
        out.push({
          refId: `sps:${p.id}:${f}`,
          source: "sps",
          effectiveType: "sps",
          programmeId: p.id,
          programmeName: p.program_name || "SPS programme",
          sessionKey: key,
          sessionTitle: data?.title ?? null,
          spsSessionField: f,
        });
      }
    }

    // Normalised SPS refs are kept only as invisible aliases so any weeks that
    // were briefly linked to them still resolve back to the old JSONB editor.
    const newSpsRows = (spsNewProgRes.data || []) as any[];
    const newSpsProgIds = newSpsRows.map(p => p.id);
    if (newSpsProgIds.length) {
      const { data: spsSess } = await supabase
        .from("sps_sessions" as any)
        .select("id, program_id, session_key, session_kind, title, display_order")
        .in("program_id", newSpsProgIds)
        .order("display_order");
      const newProg = new Map(newSpsRows.map(p => [p.id, p]));
      for (const s of (spsSess || []) as any[]) {
        const prog = newProg.get(s.program_id);
        if (!prog?.legacy_player_program_id) continue;
        const prefix = s.session_kind === "pre" ? "Pre-" : "";
        out.push({
          refId: `sps:${s.id}`,
          source: "sps",
          effectiveType: "sps",
          programmeId: prog.legacy_player_program_id,
          programmeName: prog.program_name || "SPS programme",
          sessionKey: `${prefix}${s.session_key || ""}`,
          sessionTitle: s.title ?? null,
          spsSessionField: s.session_kind === "pre" ? `preSession${s.session_key}` : `session${s.session_key}`,
          hiddenFromPicker: true,
        });
      }
    }

    const techProgIds = ((techProgRes.data || []) as any[]).map(p => p.id);
    if (techProgIds.length) {
      const { data: techSess } = await supabase
        .from("technical_sessions" as any)
        .select("id, program_id, session_key, title, session_type, display_order")
        .in("program_id", techProgIds)
        .order("display_order");
      const progName = new Map(((techProgRes.data || []) as any[]).map(p => [p.id, p.program_name]));
      for (const s of (techSess || []) as any[]) {
        out.push({
          refId: `tech:${s.id}`,
          source: "technical",
          effectiveType: (s.session_type === "sps" ? "sps" : "technical"),
          programmeId: s.program_id,
          programmeName: progName.get(s.program_id) || "Technical programme",
          sessionKey: s.session_key || "",
          sessionTitle: s.title ?? null,
          sessionId: s.id,
        });
      }
    }

    setSessions(out);
    setLoading(false);
  }, [playerId]);

  useEffect(() => { load(); }, [load]);

  return { sessions, loading, reload: load };
};