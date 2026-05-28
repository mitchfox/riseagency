import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch a videoUrl -> action_score map for a player's clips by cross-referencing
 * performance_report_actions for that player.
 */
export function usePlaylistActionScores(playerId?: string | null) {
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!playerId) {
      setScores({});
      return;
    }
    let cancelled = false;
    (async () => {
      // Get all analyses for this player
      const { data: analyses } = await supabase
        .from("player_analysis")
        .select("id")
        .eq("player_id", playerId);
      const ids = (analyses || []).map((a: any) => a.id);
      if (ids.length === 0) {
        if (!cancelled) setScores({});
        return;
      }
      const { data: acts } = await supabase
        .from("performance_report_actions")
        .select("video_url, action_score")
        .in("analysis_id", ids)
        .not("video_url", "is", null);
      if (cancelled) return;
      const map: Record<string, number> = {};
      (acts || []).forEach((a: any) => {
        if (a.video_url && a.action_score != null) {
          // Keep the highest score if the same URL appears multiple times
          const prev = map[a.video_url];
          if (prev == null || a.action_score > prev) map[a.video_url] = a.action_score;
        }
      });
      setScores(map);
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  return scores;
}