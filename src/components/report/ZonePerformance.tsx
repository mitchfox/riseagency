import { useMemo, useState } from "react";
import { Grid3X3, LayoutGrid } from "lucide-react";
import { t } from "@/lib/portalTranslations";

interface ZoneAction {
  action_score: number;
  zone?: number | null;
  zone_details?: { zone: number; sub?: number }[] | null;
}

interface ZonePerformanceProps {
  actions: ZoneAction[];
  language?: string;
  onSelectZone?: (zone: number, sub?: number) => void;
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

type BorderSide = "top" | "right" | "bottom" | "left";
interface BoxLine { zone: number; sub: number; side: BorderSide }

const PENALTY_BOX_LINES: BoxLine[] = [
  { zone: 16, sub: 8, side: "right" },
  { zone: 16, sub: 5, side: "right" },
  { zone: 16, sub: 6, side: "bottom" },
  { zone: 17, sub: 4, side: "bottom" },
  { zone: 17, sub: 5, side: "bottom" },
  { zone: 17, sub: 6, side: "bottom" },
  { zone: 18, sub: 4, side: "bottom" },
  { zone: 18, sub: 7, side: "right" },
  { zone: 18, sub: 4, side: "right" },
  { zone: 1, sub: 2, side: "right" },
  { zone: 1, sub: 5, side: "right" },
  { zone: 1, sub: 6, side: "top" },
  { zone: 2, sub: 4, side: "top" },
  { zone: 2, sub: 5, side: "top" },
  { zone: 2, sub: 6, side: "top" },
  { zone: 3, sub: 4, side: "top" },
  { zone: 3, sub: 1, side: "right" },
  { zone: 3, sub: 4, side: "right" },
];

const BOX_LINE_SET = new Set(PENALTY_BOX_LINES.map((line) => `${line.zone}.${line.sub}.${line.side}`));

const hasBoxLine = (zone: number, sub: number, side: BorderSide): boolean => {
  return BOX_LINE_SET.has(`${zone}.${sub}.${side}`);
};

const getBoxBorderStyle = (zone: number, sub: number): string => {
  const borders: string[] = [];
  if (hasBoxLine(zone, sub, "top")) borders.push("border-t-[2px] border-t-white/40");
  if (hasBoxLine(zone, sub, "right")) borders.push("border-r-[2px] border-r-white/40");
  if (hasBoxLine(zone, sub, "bottom")) borders.push("border-b-[2px] border-b-white/40");
  if (hasBoxLine(zone, sub, "left")) borders.push("border-l-[2px] border-l-white/40");
  return borders.join(" ");
};

export const ZonePerformance = ({ actions, language = "en", onSelectZone }: ZonePerformanceProps) => {
  const [showSubZones, setShowSubZones] = useState(false);

  const { zoneAvg, subZoneAvg, zoneCount } = useMemo(() => {
    const zoneTotals: Record<number, { sum: number; count: number }> = {};
    const subTotals: Record<string, { sum: number; count: number }> = {};

    for (const action of actions) {
      if (action.zone_details && Array.isArray(action.zone_details) && action.zone_details.length > 0) {
        for (const zonePoint of action.zone_details) {
          if (zonePoint.zone < 1 || zonePoint.zone > 18) continue;
          if (!zoneTotals[zonePoint.zone]) zoneTotals[zonePoint.zone] = { sum: 0, count: 0 };
          zoneTotals[zonePoint.zone].sum += action.action_score;
          zoneTotals[zonePoint.zone].count++;

          if (zonePoint.sub && zonePoint.sub >= 1 && zonePoint.sub <= 9) {
            const key = `${zonePoint.zone}.${zonePoint.sub}`;
            if (!subTotals[key]) subTotals[key] = { sum: 0, count: 0 };
            subTotals[key].sum += action.action_score;
            subTotals[key].count++;
          }
        }
      } else if (action.zone != null && action.zone >= 1 && action.zone <= 18) {
        if (!zoneTotals[action.zone]) zoneTotals[action.zone] = { sum: 0, count: 0 };
        zoneTotals[action.zone].sum += action.action_score;
        zoneTotals[action.zone].count++;
      }
    }

    const zoneAvg: Record<number, number> = {};
    const zoneCount: Record<number, number> = {};
    for (const [zone, data] of Object.entries(zoneTotals)) {
      zoneAvg[Number(zone)] = data.sum / data.count;
      zoneCount[Number(zone)] = data.count;
    }

    const subZoneAvg: Record<string, number> = {};
    for (const [key, data] of Object.entries(subTotals)) {
      subZoneAvg[key] = data.sum / data.count;
    }

    return { zoneAvg, subZoneAvg, zoneCount };
  }, [actions]);

  if (Object.keys(zoneAvg).length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t(language, "no_zone_data")}</div>;
  }

  const toggleTitle = showSubZones ? t(language, "switch_to_at_a_glance") : t(language, "switch_to_in_depth");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t(language, "zone_performance")}</h4>
        <button
          type="button"
          className="relative flex items-center bg-muted rounded-full p-0.5 cursor-pointer w-[72px] h-7"
          onClick={() => setShowSubZones(!showSubZones)}
          title={toggleTitle}
        >
          <div className={`absolute top-0.5 h-6 w-[34px] rounded-full bg-primary transition-all duration-200 ${showSubZones ? "left-[36px]" : "left-0.5"}`} />
          <div className="relative z-10 flex w-full">
            <div className={`flex-1 flex items-center justify-center ${!showSubZones ? "text-primary-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </div>
            <div className={`flex-1 flex items-center justify-center ${showSubZones ? "text-primary-foreground" : "text-muted-foreground"}`}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>
      </div>

      <div className="relative border border-border/50 rounded-md overflow-hidden bg-green-900/20">
        <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">↑ {t(language, "attacking_direction")} ↑</div>

        {showSubZones ? (
          <div className="relative">
            <div className="grid grid-rows-6 gap-px p-1 relative">
              {ZONE_GRID.map((row, rowIndex) => (
                <div key={rowIndex} className="relative">
                  {rowIndex === 3 && <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-white/30 z-10" />}
                  <div className="grid grid-cols-3 gap-px">
                    {row.map((zone) => (
                      <div key={zone} className="border border-white/10 rounded-sm overflow-hidden">
                        <div className="grid grid-rows-3 gap-0">
                          {SUB_GRID.map((subRow, subRowIndex) => (
                            <div key={subRowIndex} className="grid grid-cols-3 gap-0">
                              {subRow.map((sub) => {
                                const key = `${zone}.${sub}`;
                                const avg = subZoneAvg[key];
                                const hasValue = avg !== undefined;
                                const boxBorders = getBoxBorderStyle(zone, sub);
                                const title = hasValue
                                  ? `${t(language, "zone_word")} ${zone}.${sub}: ${t(language, "avg_short")} ${avg.toFixed(3)} • ${t(language, "view_clips")}`
                                  : `${t(language, "zone_word")} ${zone}.${sub} • ${t(language, "view_clips")}`;

                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => onSelectZone?.(zone, sub)}
                                    className={`aspect-square flex items-center justify-center ${hasValue ? getScoreBgColor(avg) : "bg-green-900/30"} ${boxBorders} ${onSelectZone ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
                                    title={title}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-rows-6 gap-1 p-1.5">
              {ZONE_GRID.map((row, rowIndex) => (
                <div key={rowIndex} className="relative">
                  {rowIndex === 3 && <div className="absolute -top-[3px] left-0 right-0 h-[2px] bg-white/30 z-10" />}
                  <div className="grid grid-cols-3 gap-1">
                    {row.map((zone) => {
                      const avg = zoneAvg[zone];
                      const count = zoneCount[zone] || 0;
                      const hasValue = avg !== undefined;
                      const title = hasValue
                        ? `${t(language, "zone_word")} ${zone}: ${t(language, "avg_short")} ${avg.toFixed(3)} (${count} ${count !== 1 ? t(language, "actions_word") : t(language, "action_word")}) • ${t(language, "view_clips")}`
                        : `${t(language, "zone_word")} ${zone} • ${t(language, "view_clips")}`;

                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => onSelectZone?.(zone)}
                          className={`flex flex-col items-center justify-center py-3 rounded-sm transition-all ${hasValue ? getScoreBgColor(avg) : "bg-green-900/30 text-muted-foreground"} ${onSelectZone ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
                          title={title}
                        >
                          {hasValue ? (
                            <>
                              <span className="text-sm font-bold">{avg.toFixed(3)}</span>
                              <span className="text-[8px] opacity-70">{count} {count !== 1 ? t(language, "actions_word") : t(language, "action_word")}</span>
                            </>
                          ) : (
                            <span className="text-[9px]">-</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">{t(language, "own_goal")}</div>
      </div>
    </div>
  );
};
