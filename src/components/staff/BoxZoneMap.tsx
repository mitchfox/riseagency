import { useState, useMemo } from "react";
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

// 9 zones of the 18-yard box
const ZONE_LABELS = [
  "Near Post\n6-Yard", "Central\n6-Yard", "Far Post\n6-Yard",
  "Near Post\nPen Area", "Central\nPen Spot", "Far Post\nPen Area",
  "Near Post\nEdge", "Central\nEdge", "Far Post\nEdge",
];

function mapToBoxZone(zone?: number | null): number | null {
  if (!zone) return null;
  if (zone >= 16 && zone <= 18) {
    if (zone === 16) return 1;
    if (zone === 17) return 2;
    if (zone === 18) return 3;
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
  const [contested, setContested] = useState<"contested" | "uncontested">("contested");

  const zoneData = useMemo(() => {
    const zones: Record<number, { scores: number[]; count: number; descriptions: string[] }> = {};
    for (let i = 1; i <= 9; i++) zones[i] = { scores: [], count: 0, descriptions: [] };

    actions.forEach(a => {
      const boxZone = mapToBoxZone(a.zone);
      if (!boxZone) return;
      zones[boxZone].count++;
      const score = parseFloat(a.action_score);
      if (!isNaN(score)) zones[boxZone].scores.push(score);
      if (a.action_description) zones[boxZone].descriptions.push(a.action_description);
    });

    return zones;
  }, [actions, contested]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b">
        <span className="text-[10px] font-semibold">18-Yard Box</span>
        <div className="flex items-center gap-1">
          {(["contested", "uncontested"] as const).map(opt => (
            <Button
              key={opt}
              variant={contested === opt ? "default" : "outline"}
              size="sm"
              className="h-5 px-1.5 text-[9px] capitalize"
              onClick={() => setContested(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-1.5">
        <div className="relative border border-slate-600 rounded overflow-hidden bg-emerald-800/20 h-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-0.5 bg-white/90 z-10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] border border-white/40 z-10" style={{ height: "33.3%" }} />
          <div className="absolute left-1/2 -translate-x-1/2 w-1 h-1 bg-white/70 rounded-full z-10" style={{ top: "55%" }} />

          <TooltipProvider delayDuration={100}>
            <div className="grid grid-rows-3 grid-cols-3 h-full">
              {ZONE_LABELS.map((label, i) => {
                const zoneNum = i + 1;
                const data = zoneData[zoneNum];
                const avg = data.scores.length > 0 ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length : null;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className={`border border-slate-500/30 flex flex-col items-center justify-center text-center p-0.5 cursor-default transition-all hover:scale-105 hover:z-20 ${
                          avg !== null ? getScoreColor(avg) : "bg-slate-300/20 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[7px] whitespace-pre-line leading-tight opacity-70">{label}</span>
                        {data.count > 0 ? (
                          <>
                            <span className="text-[11px] font-bold font-mono leading-none mt-0.5">
                              {avg !== null ? (avg >= 0 ? "+" : "") + avg.toFixed(3) : "—"}
                            </span>
                            <span className="text-[7px] opacity-60">{data.count} action{data.count !== 1 ? "s" : ""}</span>
                          </>
                        ) : (
                          <span className="text-[8px] opacity-40 mt-0.5">—</span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      <p className="font-semibold">{label.replace("\n", " ")}</p>
                      <p>{data.count} action{data.count !== 1 ? "s" : ""}</p>
                      {avg !== null && <p>Avg score: <span className="font-mono font-bold">{avg.toFixed(3)}</span></p>}
                      {data.scores.length > 0 && (
                        <p className="text-muted-foreground">Scores: {data.scores.map(s => s.toFixed(3)).join(", ")}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
