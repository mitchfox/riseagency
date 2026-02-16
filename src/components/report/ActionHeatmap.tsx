import { useMemo } from "react";

interface PerformanceAction {
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
}

interface ActionHeatmapProps {
  actions: PerformanceAction[];
  minutesPlayed: number;
}

// R90 rating colour scale
const getR90Color = (r90: number) => {
  if (r90 >= 2.5) return "hsl(43, 49%, 61%)";
  if (r90 >= 1.8) return "hsl(142, 72%, 29%)";
  if (r90 >= 1.4) return "hsl(142, 76%, 36%)";
  if (r90 >= 1.0) return "hsl(82, 84%, 67%)";
  if (r90 >= 0.8) return "hsl(48, 96%, 53%)";
  if (r90 >= 0.6) return "hsl(25, 95%, 53%)";
  if (r90 >= 0.4) return "hsl(25, 95%, 37%)";
  if (r90 >= 0.2) return "hsl(0, 91%, 71%)";
  if (r90 >= 0) return "hsl(0, 84%, 60%)";
  return "hsl(0, 93%, 12%)";
};

const getR90Grade = (r90: number) => {
  if (r90 >= 2.5) return "A+";
  if (r90 >= 1.8) return "A";
  if (r90 >= 1.4) return "B+";
  if (r90 >= 1.0) return "B";
  if (r90 >= 0.8) return "C+";
  if (r90 >= 0.6) return "C";
  if (r90 >= 0.4) return "D+";
  if (r90 >= 0.2) return "D";
  if (r90 >= 0) return "E";
  return "F";
};

export const ActionHeatmap = ({ actions, minutesPlayed }: ActionHeatmapProps) => {
  // Group actions into 15-minute blocks and compute R90 per period
  const blocks = useMemo(() => {
    const blockCount = Math.ceil(minutesPlayed / 15) || 6;
    const result: { range: string; actions: PerformanceAction[]; totalScore: number; count: number; r90: number }[] = [];

    for (let i = 0; i < blockCount; i++) {
      const start = i * 15;
      const end = Math.min((i + 1) * 15, minutesPlayed);
      const periodMinutes = end - start;
      const blockActions = actions.filter(a => Math.floor(a.minute) >= start && Math.floor(a.minute) < end);
      const totalScore = blockActions.reduce((sum, a) => sum + a.action_score, 0);
      const r90 = periodMinutes > 0 ? (totalScore / periodMinutes) * 90 : 0;

      result.push({
        range: `${start}-${end}'`,
        actions: blockActions,
        totalScore,
        count: blockActions.length,
        r90,
      });
    }

    return result;
  }, [actions, minutesPlayed]);

  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No action data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Period Grade Map</h4>
        <span className="text-xs text-muted-foreground">{actions.length} actions across {minutesPlayed} min</span>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {blocks.map((block, idx) => {
          const color = block.count > 0 ? getR90Color(block.r90) : "hsl(var(--muted))";
          const grade = block.count > 0 ? getR90Grade(block.r90) : "-";

          return (
            <div
              key={idx}
              className="relative rounded-md flex flex-col items-center justify-center py-3 px-1 transition-all hover:scale-105"
              style={{
                backgroundColor: color,
                opacity: block.count > 0 ? 0.85 : 0.2,
              }}
              title={`${block.range}: ${block.count} actions, R90 ${block.r90.toFixed(2)}`}
            >
              <span className="text-[10px] font-bold text-black drop-shadow-sm">{block.range}</span>
              <span className="text-lg font-bold text-black drop-shadow-sm">{grade}</span>
              <span className="text-[9px] text-black/70">
                {block.count} act{block.count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
