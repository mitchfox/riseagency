import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaylistClipMeta {
  score: number | null;
  clubLogoUrl: string | null;
  opponent: string | null;
}

/**
 * Fetch a videoUrl -> { score, clubLogoUrl, opponent } map for a player's
 * clips by cross-referencing performance_report_actions with their parent
 * player_analysis row.
 */
export function usePlaylistActionScores(playerId?: string | null) {
  const [meta, setMeta] = useState<Record<string, PlaylistClipMeta>>({});

  useEffect(() => {
    if (!playerId) {
      setMeta({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: analyses } = await supabase
        .from("player_analysis")
        .select("id, club_logo_url, opponent")
        .eq("player_id", playerId);
      const ids = (analyses || []).map((a: any) => a.id);
      if (ids.length === 0) {
        if (!cancelled) setMeta({});
        return;
      }
      const analysisById = new Map<string, { club_logo_url: string | null; opponent: string | null }>();
      (analyses || []).forEach((a: any) => {
        analysisById.set(a.id, { club_logo_url: a.club_logo_url ?? null, opponent: a.opponent ?? null });
      });
      const { data: acts } = await supabase
        .from("performance_report_actions")
        .select("video_url, action_score, analysis_id")
        .in("analysis_id", ids)
        .not("video_url", "is", null);
      if (cancelled) return;
      const map: Record<string, PlaylistClipMeta> = {};
      (acts || []).forEach((a: any) => {
        if (!a.video_url) return;
        const parent = analysisById.get(a.analysis_id) ?? { club_logo_url: null, opponent: null };
        const prev = map[a.video_url];
        // Keep the highest score if the same URL appears multiple times,
        // but always populate logo/opponent if not yet set.
        const nextScore =
          a.action_score != null && (prev?.score == null || a.action_score > (prev.score ?? -Infinity))
            ? a.action_score
            : prev?.score ?? null;
        map[a.video_url] = {
          score: nextScore,
          clubLogoUrl: prev?.clubLogoUrl ?? parent.club_logo_url,
          opponent: prev?.opponent ?? parent.opponent,
        };
      });
      setMeta(map);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  return meta;
}