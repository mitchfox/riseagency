import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProgrammingSessionType = "sps" | "technical";

export interface ProgrammingSessionRef {
  /** Stable id for the slot reference. */
  refId: string;
  source: ProgrammingSessionType;
  /** Effective type (technical sessions can be toggled to act as 'sps'). */
  effectiveType: ProgrammingSessionType;
  programmeId: string;
  programmeName: string;
  sessionKey: string;
  sessionTitle: string | null;
  /** Only set for technical sessions (uuid). */
  sessionId?: string;
  /** Only set for SPS sessions (e.g. 'sessionA'). */
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
    const [spsRes, techProgRes] = await Promise.all([
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