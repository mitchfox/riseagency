import { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ALL_METRICS, ALL_GK_METRICS, isGoalkeeperPosition } from "@/components/staff/ComparisonPlayerData";

interface ComparisonPlayer {
  id: string;
  name: string;
  position: string;
  club: string | null;
  season: string;
  image_url: string | null;
  metrics: Record<string, number>;
  r90_average: number | null;
}

interface Props {
  playerName: string;
  portalMetrics: Record<string, number | null>;
  hasPortalData: boolean;
  comparisonPlayers: ComparisonPlayer[];
  selectedPlayerIds: string[];
  formWindow: number;
  playerPosition?: string;
}

const PORTAL_COLOUR = "hsl(43, 49%, 61%)";

export const ScoutingComparisonMatrix = ({
  playerName,
  portalMetrics,
  hasPortalData,
  comparisonPlayers,
  selectedPlayerIds,
  formWindow,
  playerPosition,
}: Props) => {
  const activeMetrics = isGoalkeeperPosition(playerPosition) ? ALL_GK_METRICS : ALL_METRICS;
  const selectedComps = comparisonPlayers.filter(p => selectedPlayerIds.includes(p.id));

  // Need at least 2 entities to compare (portal player + 1 comp, or 2 comps)
  const entities = useMemo(() => {
    const list: { name: string; image: string | null; club: string | null; metrics: Record<string, number | null>; colour: string }[] = [];
    if (hasPortalData) {
      list.push({ name: playerName, image: null, club: null, metrics: portalMetrics, colour: PORTAL_COLOUR });
    }
    selectedComps.forEach((cp, idx) => {
      const colours = ["hsl(220, 70%, 50%)", "hsl(0, 70%, 50%)", "hsl(140, 60%, 40%)", "hsl(45, 80%, 50%)"];
      list.push({ name: cp.name, image: cp.image_url, club: cp.club, metrics: cp.metrics, colour: colours[idx % colours.length] });
    });
    return list;
  }, [hasPortalData, playerName, portalMetrics, selectedComps]);

  if (entities.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Select at least one comparison player to see the scouting matrix.</p>
        {!hasPortalData && <p className="text-xs mt-1">Your fixture stats will appear once recorded.</p>}
      </div>
    );
  }

  // Only show metrics where at least 2 entities have data
  const relevantMetrics = activeMetrics.filter(m => {
    const withData = entities.filter(e => e.metrics[m.key] != null).length;
    return withData >= 2;
  });

  const getLeader = (metricKey: string) => {
    let bestIdx = -1;
    let bestVal = -Infinity;
    entities.forEach((e, idx) => {
      const val = e.metrics[metricKey];
      if (val != null && val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });
    return bestIdx;
  };

  return (
    <div className="space-y-6">
      {/* Player Cards Header */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${entities.length}, 1fr)` }}>
        {entities.map((entity, idx) => (
          <div
            key={idx}
            className="rounded-lg border-2 p-3 text-center"
            style={{ borderColor: entity.colour }}
          >
            <Avatar className="h-10 w-10 mx-auto mb-2">
              {entity.image ? <AvatarImage src={entity.image} /> : null}
              <AvatarFallback className="text-xs font-bold">{entity.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="font-bold text-sm">{entity.name}</div>
            {entity.club && <div className="text-xs text-muted-foreground">{entity.club}</div>}
          </div>
        ))}
      </div>

      {/* Stat Rows */}
      {METRIC_CATEGORIES.map(cat => {
        const catMetrics = relevantMetrics.filter(m => cat.metrics.some(cm => cm.key === m.key));
        if (catMetrics.length === 0) return null;

        return (
          <div key={cat.category}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat.category}</h4>
            <div className="space-y-1">
              {catMetrics.map(m => {
                const isPercentage = m.key.endsWith("_pct");
                const leaderIdx = getLeader(m.key);

                return (
                  <div key={m.key} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className="w-[120px] shrink-0 text-xs font-medium truncate">{m.label}</div>
                    <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${entities.length}, 1fr)` }}>
                      {entities.map((entity, idx) => {
                        const val = entity.metrics[m.key];
                        const isLeader = idx === leaderIdx;
                        return (
                          <div
                            key={idx}
                            className={`text-center text-sm font-bold rounded px-2 py-0.5 transition-colors ${
                              isLeader
                                ? "bg-green-500/15 text-green-500"
                                : val != null
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {val != null ? `${val.toFixed(2)}${isPercentage ? "%" : ""}` : "—"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Your stats are a last {formWindow} game average. Green highlights the leader in each metric.
      </p>
    </div>
  );
};
