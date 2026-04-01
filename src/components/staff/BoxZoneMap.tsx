import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface BoxZoneMapProps {
  actions: any[];
  actionType?: string;
  onScoreSelect?: (score: string) => void;
}

type DeliveryType = "aerial" | "ground";
type ContestType = "contested" | "uncontested";

// 3 rows x 3 cols = 9 zones
// Rows: 6-yard Box, Golden Zone (Penalty Area), Edge of Box
// Cols: Front Post, Central, Back Post
const ZONE_GRID = [
  { row: "6-yard Box", col: "Front Post" },
  { row: "6-yard Box", col: "Central" },
  { row: "6-yard Box", col: "Back Post" },
  { row: "Golden Zone", col: "Front Post" },
  { row: "Golden Zone", col: "Central" },
  { row: "Golden Zone", col: "Back Post" },
  { row: "Edge of Box", col: "Front Post" },
  { row: "Edge of Box", col: "Central" },
  { row: "Edge of Box", col: "Back Post" },
];

const getScoreColor = (score: number): string => {
  if (score >= 0.06) return "bg-green-600/80 text-white";
  if (score >= 0.03) return "bg-green-500/60 text-white";
  if (score >= 0.01) return "bg-amber-500/60 text-white";
  if (score >= 0) return "bg-orange-400/60 text-white";
  return "bg-red-500/60 text-white";
};

interface DBRating {
  id: string;
  title: string;
  score: number;
}

function buildKey(delivery: DeliveryType, row: string, col: string, contest: ContestType): string {
  const prefix = delivery === "aerial" ? "Aerial Delivery" : "Ground Delivery";
  return `${prefix} - ${row} - ${col} ${contest.charAt(0).toUpperCase() + contest.slice(1)}`;
}

export const BoxZoneMap = ({ actions, actionType, onScoreSelect }: BoxZoneMapProps) => {
  const [delivery, setDelivery] = useState<DeliveryType>("aerial");
  const [contest, setContest] = useState<ContestType>("contested");
  const [ratings, setRatings] = useState<Record<string, DBRating>>({});

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data } = await supabase
          .from("r90_ratings")
          .select("id, title, score")
          .eq("category", "Attacking Crosses")
          .not("score", "is", null);

        if (!data) return;

        const map: Record<string, DBRating> = {};
        data.forEach((r: any) => {
          map[r.title] = { id: r.id, title: r.title, score: Number(r.score) };
        });
        setRatings(map);
      } catch (err) {
        console.error("Failed to fetch box scores:", err);
      }
    };
    fetchRatings();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          {(["aerial", "ground"] as const).map(opt => (
            <Button
              key={opt}
              variant={delivery === opt ? "default" : "outline"}
              size="sm"
              className="h-5 px-1.5 text-[9px] capitalize"
              onClick={() => setDelivery(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["contested", "uncontested"] as const).map(opt => (
            <Button
              key={opt}
              variant={contest === opt ? "default" : "outline"}
              size="sm"
              className="h-5 px-1.5 text-[9px] capitalize"
              onClick={() => setContest(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-1.5">
        <div className="relative border border-slate-600 rounded overflow-hidden bg-emerald-800/20 h-full">
          {/* Goal line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-0.5 bg-white/90 z-10" />
          {/* 6-yard box line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] border border-white/40 z-10" style={{ height: "33.3%" }} />
          {/* Penalty spot */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1 h-1 bg-white/70 rounded-full z-10" style={{ top: "55%" }} />

          <TooltipProvider delayDuration={100}>
            <div className="grid grid-rows-3 grid-cols-3 h-full">
              {ZONE_GRID.map((zone) => {
                const key = buildKey(delivery, zone.row, zone.col, contest);
                const data = ratings[key];
                const hasScore = data != null;

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`border border-slate-500/30 flex flex-col items-center justify-center text-center p-0.5 transition-all hover:scale-105 hover:z-20 ${
                          hasScore ? getScoreColor(data.score) + " cursor-pointer" : "bg-slate-300/20 text-muted-foreground cursor-default"
                        }`}
                        onClick={() => {
                          if (hasScore && onScoreSelect) {
                            onScoreSelect(String(data.score));
                          }
                        }}
                        disabled={!hasScore}
                      >
                        <span className="text-[7px] whitespace-pre-line leading-tight opacity-70">
                          {zone.col}{"\n"}{zone.row === "Golden Zone" ? "Pen Area" : zone.row === "Edge of Box" ? "Edge" : "6-Yard"}
                        </span>
                        {hasScore ? (
                          <span className="text-[10px] font-bold font-mono leading-none mt-0.5">
                            {data.score >= 0 ? "+" : ""}{data.score.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-[8px] opacity-40 mt-0.5">—</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[250px]">
                      <p className="font-semibold">{zone.col} — {zone.row}</p>
                      <p className="capitalize">{delivery} · {contest}</p>
                      {hasScore && (
                        <>
                          <p>Score: <span className="font-mono font-bold">{data.score.toFixed(4)}</span></p>
                          <p className="text-muted-foreground text-[10px]">{data.title}</p>
                        </>
                      )}
                      {!hasScore && <p className="text-muted-foreground">No score in database</p>}
                      {hasScore && <p className="text-[10px] text-primary mt-1">Click to apply this score</p>}
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
