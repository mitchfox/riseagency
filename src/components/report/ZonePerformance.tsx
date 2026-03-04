import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";

interface ZoneAction {
  action_score: number;
  zone?: number | null;
  zone_details?: { zone: number; sub?: number }[] | null;
}

interface ZonePerformanceProps {
  actions: ZoneAction[];
}

const ZONE_GRID = [
  [16, 17, 18],
  [13, 14, 15],
  [10, 11, 12],
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const SUB_GRID = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

// Same colour scale used on performance report action rows
const getScoreBgColor = (avg: number): string => {
  if (avg >= 0.15) return "bg-green-800 text-white";
  if (avg >= 0.1) return "bg-green-700 text-white";
  if (avg >= 0.05) return "bg-green-600 text-white";
  if (avg >= 0.02) return "bg-green-500 text-white";
  if (avg > 0.005) return "bg-lime-500 text-black";
  if (avg > 0) return "bg-lime-400 text-black";
  if (avg === 0) return "bg-muted text-muted-foreground";
  if (avg > -0.005) return "bg-orange-400 text-black";
  if (avg > -0.02) return "bg-orange-500 text-white";
  if (avg > -0.04) return "bg-red-400 text-white";
  if (avg > -0.06) return "bg-red-500 text-white";
  return "bg-red-700 text-white";
};

export const ZonePerformance = ({ actions }: ZonePerformanceProps) => {
  const [showSubZones, setShowSubZones] = useState(false);

  // Calculate average score per zone and per sub-zone
  const { zoneAvg, subZoneAvg, zoneCount } = useMemo(() => {
    const zoneTotals: Record<number, { sum: number; count: number }> = {};
    const subTotals: Record<string, { sum: number; count: number }> = {};

    for (const a of actions) {
      if (a.zone_details && Array.isArray(a.zone_details) && a.zone_details.length > 0) {
        for (const zp of a.zone_details) {
          if (zp.zone < 1 || zp.zone > 18) continue;
          // Zone level
          if (!zoneTotals[zp.zone]) zoneTotals[zp.zone] = { sum: 0, count: 0 };
          zoneTotals[zp.zone].sum += a.action_score;
          zoneTotals[zp.zone].count++;
          // Sub-zone level
          if (zp.sub && zp.sub >= 1 && zp.sub <= 9) {
            const key = `${zp.zone}.${zp.sub}`;
            if (!subTotals[key]) subTotals[key] = { sum: 0, count: 0 };
            subTotals[key].sum += a.action_score;
            subTotals[key].count++;
          }
        }
      } else if (a.zone != null && a.zone >= 1 && a.zone <= 18) {
        if (!zoneTotals[a.zone]) zoneTotals[a.zone] = { sum: 0, count: 0 };
        zoneTotals[a.zone].sum += a.action_score;
        zoneTotals[a.zone].count++;
      }
    }

    const zoneAvg: Record<number, number> = {};
    const zoneCount: Record<number, number> = {};
    for (const [z, d] of Object.entries(zoneTotals)) {
      zoneAvg[Number(z)] = d.sum / d.count;
      zoneCount[Number(z)] = d.count;
    }

    const subZoneAvg: Record<string, number> = {};
    for (const [k, d] of Object.entries(subTotals)) {
      subZoneAvg[k] = d.sum / d.count;
    }

    return { zoneAvg, subZoneAvg, zoneCount };
  }, [actions]);

  const hasData = Object.keys(zoneAvg).length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No zone data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Zone Performance</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowSubZones(!showSubZones)}
        >
          <Grid3X3 className="h-3 w-3" />
          {showSubZones ? "18 Zones" : "162 Zones"}
        </Button>
      </div>

      <div className="relative border border-border/50 rounded-md overflow-hidden bg-green-900/20">
        <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
          ↑ Attacking Direction ↑
        </div>

        {showSubZones ? (
          /* 162-zone view: each major zone contains a 3x3 sub-grid, colour-coded only */
          <div className="grid grid-rows-6 gap-px p-1">
            {ZONE_GRID.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-px">
                {row.map(zone => (
                  <div key={zone} className="border border-border/20 rounded-sm overflow-hidden">
                    <div className="grid grid-rows-3 gap-0">
                      {SUB_GRID.map((subRow, sri) => (
                        <div key={sri} className="grid grid-cols-3 gap-0">
                          {subRow.map(sub => {
                            const key = `${zone}.${sub}`;
                            const avg = subZoneAvg[key];
                            const hasValue = avg !== undefined;
                            return (
                              <div
                                key={sub}
                                className={`aspect-square flex items-center justify-center ${
                                  hasValue ? getScoreBgColor(avg) : 'bg-green-900/30'
                                }`}
                                title={hasValue ? `Zone ${zone}.${sub}: avg ${avg.toFixed(3)}` : `Zone ${zone}.${sub}`}
                              >
                                {/* No text on sub-zone view, just colours */}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* 18-zone view with R90 scores */
          <div className="grid grid-rows-6 gap-1 p-1.5">
            {ZONE_GRID.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-1">
                {row.map(zone => {
                  const avg = zoneAvg[zone];
                  const count = zoneCount[zone] || 0;
                  const hasValue = avg !== undefined;
                  return (
                    <div
                      key={zone}
                      className={`flex flex-col items-center justify-center py-3 rounded-sm transition-all ${
                        hasValue ? getScoreBgColor(avg) : 'bg-green-900/30 text-muted-foreground'
                      }`}
                      title={hasValue ? `Zone ${zone}: avg ${avg.toFixed(3)} (${count} actions)` : `Zone ${zone}`}
                    >
                      <span className="text-[10px] opacity-70">{zone}</span>
                      {hasValue ? (
                        <>
                          <span className="text-sm font-bold">{avg.toFixed(3)}</span>
                          <span className="text-[8px] opacity-70">{count} action{count !== 1 ? 's' : ''}</span>
                        </>
                      ) : (
                        <span className="text-[9px]">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
          Own Goal
        </div>
      </div>
    </div>
  );
};
