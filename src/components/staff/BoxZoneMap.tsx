import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BoxAction {
  action_score: string;
  action_description: string;
  zone?: number | null;
  zone_details?: { zone: number; subZone?: number }[] | null;
}

interface BoxZoneMapProps {
  actions: BoxAction[];
}

// 9 zones of the 18-yard box:
// 1-3: Near post / 6-yard box line
// 4-6: Central / penalty spot area
// 7-9: Back post / edge of box
const ZONE_LABELS = [
  "Near Post\n6-Yard", "Central\n6-Yard", "Far Post\n6-Yard",
  "Near Post\nPen Area", "Central\nPen Spot", "Far Post\nPen Area",
  "Near Post\nEdge", "Central\nEdge", "Far Post\nEdge",
];

// Map zone numbers 13-18 to box zones 1-9 (rough mapping)
function mapToBoxZone(zone?: number | null): number | null {
  if (!zone) return null;
  // Zones 16-18 are in the final third, map sub-areas
  if (zone >= 16 && zone <= 18) {
    if (zone === 16) return 1; // left near post
    if (zone === 17) return 2; // central
    if (zone === 18) return 3; // right far post
  }
  if (zone >= 13 && zone <= 15) {
    if (zone === 13) return 7;
    if (zone === 14) return 8;
    if (zone === 15) return 9;
  }
  return null;
}

const getScoreColor = (avg: number): string => {
  if (avg >= 1.0) return "bg-green-600/80 text-white";
  if (avg >= 0.5) return "bg-green-500/60 text-white";
  if (avg >= 0) return "bg-amber-500/60 text-white";
  if (avg >= -0.5) return "bg-orange-500/60 text-white";
  return "bg-red-500/60 text-white";
};

export const BoxZoneMap = ({ actions }: BoxZoneMapProps) => {
  const [contested, setContested] = useState<"all" | "contested" | "uncontested">("all");

  // Group actions by box zone
  const zoneData = useMemo(() => {
    const zones: Record<number, { scores: number[]; count: number }> = {};
    for (let i = 1; i <= 9; i++) zones[i] = { scores: [], count: 0 };

    actions.forEach(a => {
      const boxZone = mapToBoxZone(a.zone);
      if (!boxZone) return;
      zones[boxZone].count++;
      const score = parseFloat(a.action_score);
      if (!isNaN(score)) zones[boxZone].scores.push(score);
    });

    return zones;
  }, [actions, contested]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">18-Yard Box Zone Map</CardTitle>
          <div className="flex items-center gap-1">
            {(["all", "contested", "uncontested"] as const).map(opt => (
              <Button
                key={opt}
                variant={contested === opt ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[10px] capitalize"
                onClick={() => setContested(opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative border-2 border-slate-600 rounded overflow-hidden bg-emerald-800/20">
          {/* Goal line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-1 bg-white/90 z-10" />
          {/* 6-yard box outline */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] border border-white/40 z-10" style={{ height: "33.3%" }} />
          {/* Penalty spot */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/70 rounded-full z-10" style={{ top: "55%" }} />

          <TooltipProvider delayDuration={100}>
            <div className="grid grid-rows-3 grid-cols-3" style={{ aspectRatio: "1.4" }}>
              {ZONE_LABELS.map((label, i) => {
                const zoneNum = i + 1;
                const data = zoneData[zoneNum];
                const avg = data.scores.length > 0 ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length : null;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className={`border border-slate-500/30 flex flex-col items-center justify-center text-center p-2 cursor-default transition-all hover:scale-105 hover:z-20 ${
                          avg !== null ? getScoreColor(avg) : "bg-slate-300/20 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[9px] whitespace-pre-line leading-tight opacity-80">{label}</span>
                        {data.count > 0 && (
                          <>
                            <span className="text-sm font-bold font-mono mt-1">
                              {avg !== null ? (avg >= 0 ? "+" : "") + avg.toFixed(3) : "—"}
                            </span>
                            <span className="text-[9px] opacity-70">{data.count} action{data.count !== 1 ? "s" : ""}</span>
                          </>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">{label.replace("\n", " ")}</p>
                      <p>{data.count} action{data.count !== 1 ? "s" : ""}</p>
                      {avg !== null && <p>Avg score: <span className="font-mono font-bold">{avg.toFixed(3)}</span></p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
        <div className="flex justify-center -mt-0.5">
          <div className="bg-slate-700 text-white text-[10px] px-4 py-0.5 rounded-b font-medium tracking-wider">GOAL</div>
        </div>
      </CardContent>
    </Card>
  );
};
