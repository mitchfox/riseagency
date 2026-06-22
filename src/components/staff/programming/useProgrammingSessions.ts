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

    // Skip legacy player_programs rows that are mirrors of a new sps_programs row
    const mirroredLegacyIds = new Set<string>(
      ((spsNewProgRes.data || []) as any[])
        .map(p => p.legacy_player_program_id)
        .filter(Boolean)
    );

    for (const p of (spsRes.data || []) as any[]) {
      if (mirroredLegacyIds.has(p.id)) continue;
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

    // New normalised SPS rows
    const newSpsProgIds = ((spsNewProgRes.data || []) as any[]).map(p => p.id);
    if (newSpsProgIds.length) {
      const { data: spsSess } = await supabase
        .from("sps_sessions" as any)
        .select("id, program_id, session_key, session_kind, title, display_order")
        .in("program_id", newSpsProgIds)
        .order("display_order");
      const newProgName = new Map(((spsNewProgRes.data || []) as any[]).map(p => [p.id, p.program_name]));
      for (const s of (spsSess || []) as any[]) {
        const prefix = s.session_kind === "pre" ? "Pre-" : "";
        out.push({
          refId: `sps:${s.id}`,
          source: "sps_normalised",
          effectiveType: "sps",
          programmeId: s.program_id,
          programmeName: newProgName.get(s.program_id) || "SPS programme",
          sessionKey: `${prefix}${s.session_key || ""}`,
          sessionTitle: s.title ?? null,
          sessionId: s.id,
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