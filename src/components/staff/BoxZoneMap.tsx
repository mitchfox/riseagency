import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface BoxZoneMapProps {
  actions: any[];
  actionType?: string;
  onScoreSelect?: (score: string) => void;
}

// 18 boxes: 9 contested + 9 uncontested
const BOX_KEYS = [
  { k: "contested_near_post_6", label: "Near Post\n6-Yard" },
  { k: "contested_central_6", label: "Central\n6-Yard" },
  { k: "contested_far_post_6", label: "Far Post\n6-Yard" },
  { k: "contested_near_post_box", label: "Near Post\nPen Area" },
  { k: "contested_central_box", label: "Central\nPen Spot" },
  { k: "contested_far_post_box", label: "Far Post\nPen Area" },
  { k: "contested_near_edge", label: "Near Post\nEdge" },
  { k: "contested_central_edge", label: "Central\nEdge" },
  { k: "contested_far_edge", label: "Far Post\nEdge" },
];

const getScoreColor = (score: number): string => {
  if (score >= 1.0) return "bg-green-600/80 text-white";
  if (score >= 0.5) return "bg-green-500/60 text-white";
  if (score >= 0) return "bg-amber-500/60 text-white";
  if (score >= -0.5) return "bg-orange-500/60 text-white";
  return "bg-red-500/60 text-white";
};

interface BoxScore {
  score: number;
  title: string;
}

export const BoxZoneMap = ({ actions, actionType, onScoreSelect }: BoxZoneMapProps) => {
  const [contested, setContested] = useState<"contested" | "uncontested">("contested");
  const [boxScores, setBoxScores] = useState<Record<string, BoxScore>>({});

  // Fetch R90 scores for box zones based on action type
  useEffect(() => {
    if (!actionType) return;
    
    const fetchBoxScores = async () => {
      try {
        // Search R90 ratings that match box zone patterns for this action type
        const { data: ratings } = await supabase
          .from("r90_ratings")
          .select("id, title, score, description, category, subcategory")
          .not("score", "is", null);

        if (!ratings) return;

        const scores: Record<string, BoxScore> = {};
        const lowerType = actionType.toLowerCase();

        // Map ratings to box zones based on their title/description keywords
        const zoneKeywords: Record<string, string[]> = {
          "near_post_6": ["near post", "6-yard", "6 yard", "near 6"],
          "central_6": ["central", "6-yard", "6 yard", "centre 6"],
          "far_post_6": ["far post", "6-yard", "6 yard", "far 6", "back post 6"],
          "near_post_box": ["near post", "penalty", "pen area", "near box"],
          "central_box": ["central", "penalty", "pen spot", "centre box"],
          "far_post_box": ["far post", "penalty", "pen area", "far box", "back post box"],
          "near_edge": ["near post", "edge", "near edge"],
          "central_edge": ["central", "edge", "centre edge"],
          "far_edge": ["far post", "edge", "far edge", "back post edge"],
        };

        // Try to find matching ratings for each zone
        for (const prefix of ["contested", "uncontested"]) {
          for (const [zone, keywords] of Object.entries(zoneKeywords)) {
            const key = `${prefix}_${zone}`;
            // Look for ratings that contain the zone keyword and contested/uncontested
            const match = ratings.find(r => {
              const combined = `${r.title || ""} ${r.description || ""}`.toLowerCase();
              const hasZone = keywords.some(kw => combined.includes(kw));
              const hasContest = combined.includes(prefix);
              const hasType = combined.includes(lowerType) || 
                (r.category || "").toLowerCase().includes(lowerType) ||
                (r.subcategory || "").toLowerCase().includes(lowerType);
              return hasZone && hasContest && (hasType || true);
            });
            if (match && match.score != null) {
              scores[key] = { score: Number(match.score), title: match.title };
            }
          }
        }

        // If no matches found with exact zone mapping, try a simpler approach
        // by looking at action_r90_category_mappings for this action type
        if (Object.keys(scores).length === 0) {
          const { data: mappings } = await supabase
            .from("action_r90_category_mappings")
            .select("selected_rating_ids, r90_category, r90_subcategory")
            .eq("action_type", actionType.trim());

          if (mappings && mappings.length > 0) {
            const allIds = mappings.flatMap((m: any) => m.selected_rating_ids || []);
            if (allIds.length > 0) {
              const { data: mappedRatings } = await supabase
                .from("r90_ratings")
                .select("id, title, score, description")
                .in("id", allIds)
                .not("score", "is", null);

              if (mappedRatings) {
                // Map these to box zones by keyword matching in title
                for (const prefix of ["contested", "uncontested"]) {
                  for (const [zone, keywords] of Object.entries(zoneKeywords)) {
                    const key = `${prefix}_${zone}`;
                    if (scores[key]) continue;
                    const match = mappedRatings.find(r => {
                      const title = (r.title || "").toLowerCase();
                      const desc = (r.description || "").toLowerCase();
                      const combined = title + " " + desc;
                      const hasZone = keywords.some(kw => combined.includes(kw));
                      const hasContest = combined.includes(prefix);
                      return hasZone && hasContest;
                    });
                    if (match && match.score != null) {
                      scores[key] = { score: Number(match.score), title: match.title };
                    }
                  }
                }
              }
            }
          }
        }

        setBoxScores(scores);
      } catch (err) {
        console.error("Failed to fetch box scores:", err);
      }
    };

    fetchBoxScores();
  }, [actionType]);

  const currentBoxes = BOX_KEYS.map(b => ({
    ...b,
    k: b.k.replace("contested_", `${contested}_`),
    label: b.label,
  }));

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
          {/* Goal line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-0.5 bg-white/90 z-10" />
          {/* 6-yard box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55%] border border-white/40 z-10" style={{ height: "33.3%" }} />
          {/* Penalty spot */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1 h-1 bg-white/70 rounded-full z-10" style={{ top: "55%" }} />

          <TooltipProvider delayDuration={100}>
            <div className="grid grid-rows-3 grid-cols-3 h-full">
              {currentBoxes.map((box, i) => {
                const data = boxScores[box.k];
                const hasScore = data != null;
                return (
                  <Tooltip key={box.k}>
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
                        <span className="text-[7px] whitespace-pre-line leading-tight opacity-70">{box.label}</span>
                        {hasScore ? (
                          <span className="text-[11px] font-bold font-mono leading-none mt-0.5">
                            {(data.score >= 0 ? "+" : "") + data.score.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-[8px] opacity-40 mt-0.5">—</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      <p className="font-semibold">{box.label.replace("\n", " ")}</p>
                      <p className="capitalize">{contested}</p>
                      {hasScore && (
                        <>
                          <p>Score: <span className="font-mono font-bold">{data.score.toFixed(3)}</span></p>
                          <p className="text-muted-foreground">{data.title}</p>
                        </>
                      )}
                      {!hasScore && <p className="text-muted-foreground">No R90 score mapped</p>}
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
