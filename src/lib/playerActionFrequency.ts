import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/titleCase";

/**
 * Canonical action type: trim, collapse spaces, title-case.
 */
export const canonicalActionType = (raw: string): string => {
  if (!raw) return raw;
  return toTitleCase(raw.trim().replace(/\s{2,}/g, " "));
};

interface ActionFrequencyResult {
  /** Action types sorted by player-specific + global frequency */
  sortedTypes: string[];
  /** Frequency map (combined player-weighted + global) */
  frequencyMap: Record<string, number>;
  /** Description map sorted by frequency per type */
  descriptionsByType: Record<string, string[]>;
}

/**
 * Fetch action types sorted by player-specific frequency (last 5 reports),
 * with recency weighting and global fallback.
 *
 * Recency weights: most recent report = 5x, second = 4x, ... fifth = 1x.
 * Global counts are added at 0.1x to act as tiebreakers only.
 */
export async function fetchPlayerActionFrequencies(
  playerId: string | null
): Promise<ActionFrequencyResult> {
  // 1. Get player-specific data from last 5 reports
  let playerFreq: Record<string, number> = {};
  let playerDescs: Record<string, Record<string, number>> = {};

  if (playerId) {
    const { data: recentReports } = await supabase
      .from("player_analysis")
      .select("id")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false })
      .limit(5);

    if (recentReports && recentReports.length > 0) {
      const reportIds = recentReports.map((r) => r.id);

      const { data: playerActions } = await supabase
        .from("performance_report_actions")
        .select("action_type, action_description, analysis_id")
        .in("analysis_id", reportIds)
        .not("action_type", "is", null);

      if (playerActions) {
        // Apply recency weighting: index 0 in reportIds = most recent
        const recencyWeight: Record<string, number> = {};
        reportIds.forEach((id, i) => {
          recencyWeight[id] = 5 - i; // 5, 4, 3, 2, 1
        });

        playerActions.forEach((a) => {
          const canon = canonicalActionType(a.action_type || "");
          if (!canon) return;
          const weight = recencyWeight[a.analysis_id] || 1;
          playerFreq[canon] = (playerFreq[canon] || 0) + weight;

          if (a.action_description?.trim()) {
            if (!playerDescs[canon]) playerDescs[canon] = {};
            const desc = a.action_description.trim();
            playerDescs[canon][desc] = (playerDescs[canon][desc] || 0) + weight;
          }
        });
      }
    }
  }

  // 2. Get global data (paginated)
  let allRows: { action_type: string | null; action_description: string | null }[] = [];
  const PAGE = 1000;
  let from = 0;
  let keepGoing = true;
  while (keepGoing) {
    const { data, error } = await supabase
      .from("performance_report_actions")
      .select("action_type, action_description")
      .not("action_type", "is", null)
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) keepGoing = false;
    from += PAGE;
  }

  const globalFreq: Record<string, number> = {};
  const globalDescs: Record<string, Record<string, number>> = {};

  allRows.forEach((item) => {
    const canon = canonicalActionType(item.action_type || "");
    if (!canon) return;
    globalFreq[canon] = (globalFreq[canon] || 0) + 1;

    if (item.action_description?.trim()) {
      if (!globalDescs[canon]) globalDescs[canon] = {};
      const desc = item.action_description.trim();
      globalDescs[canon][desc] = (globalDescs[canon][desc] || 0) + 1;
    }
  });

  // 3. Merge: player-specific frequency dominates, global acts as tiebreaker
  const allTypes = new Set([...Object.keys(playerFreq), ...Object.keys(globalFreq)]);
  const combinedFreq: Record<string, number> = {};

  allTypes.forEach((type) => {
    // Player frequency (already weighted by recency) + tiny global for tiebreaking
    const pf = playerFreq[type] || 0;
    const gf = globalFreq[type] || 0;
    combinedFreq[type] = pf * 100 + gf * 0.1;
  });

  // Sort by combined score desc, then alphabetical
  const sortedTypes = [...allTypes].sort((a, b) => {
    const diff = combinedFreq[b] - combinedFreq[a];
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  // 4. Merge descriptions: player-specific first, then global
  const descriptionsByType: Record<string, string[]> = {};
  const allDescTypes = new Set([...Object.keys(playerDescs), ...Object.keys(globalDescs)]);

  allDescTypes.forEach((type) => {
    const merged: Record<string, number> = {};
    // Player descriptions weighted higher
    if (playerDescs[type]) {
      Object.entries(playerDescs[type]).forEach(([desc, count]) => {
        merged[desc] = (merged[desc] || 0) + count * 100;
      });
    }
    if (globalDescs[type]) {
      Object.entries(globalDescs[type]).forEach(([desc, count]) => {
        merged[desc] = (merged[desc] || 0) + count * 0.1;
      });
    }
    descriptionsByType[type] = Object.entries(merged)
      .sort((a, b) => b[1] - a[1])
      .map(([desc]) => desc);
  });

  return {
    sortedTypes,
    frequencyMap: combinedFreq,
    descriptionsByType,
  };
}
