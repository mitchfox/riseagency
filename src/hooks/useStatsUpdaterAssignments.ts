import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of player IDs the current staff user is assigned to as a stats_updater.
 * If the current user is NOT a stats_updater (i.e. has another role like admin/staff),
 * returns { isScoped: false, allowedIds: null } meaning no filtering should occur.
 */
export function useStatsUpdaterAssignments() {
  const [isScoped, setIsScoped] = useState(false);
  const [allowedIds, setAllowedIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const userId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      if (!userId) { setLoading(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const roleList = (roles || []).map((r: any) => r.role);
      const onlyStatsUpdater = roleList.length > 0 && roleList.every((r: string) => r === "stats_updater");
      if (!onlyStatsUpdater) { setLoading(false); return; }
      const { data: assignments } = await (supabase as any)
        .from("staff_player_assignments")
        .select("player_id")
        .eq("user_id", userId)
        .eq("role_key", "stats_updater");
      setIsScoped(true);
      setAllowedIds(new Set(((assignments as any[]) || []).map((a: any) => a.player_id)));
      setLoading(false);
    })();
  }, []);

  return { isScoped, allowedIds, loading };
}

/** Filter a player list down to those the current stats updater can access. */
export function applyStatsUpdaterScope<T extends { id: string }>(
  players: T[],
  scope: { isScoped: boolean; allowedIds: Set<string> | null },
): T[] {
  if (!scope.isScoped) return players;
  const ids = scope.allowedIds;
  if (!ids) return [];
  return players.filter((p) => ids.has(p.id));
}