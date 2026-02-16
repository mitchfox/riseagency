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

const getScoreColor = (score: number) => {
  if (score >= 0.1) return "hsl(142, 76%, 36%)";
  if (score >= 0.05) return "hsl(142, 60%, 50%)";
  if (score >= 0.02) return "hsl(82, 84%, 67%)";
  if (score > 0) return "hsl(48, 96%, 53%)";
  if (score === 0) return "hsl(var(--muted))";
  if (score > -0.03) return "hsl(25, 95%, 53%)";
  return "hsl(0, 84%, 60%)";
};

export const ActionHeatmap = ({ actions, minutesPlayed }: ActionHeatmapProps) => {
  // Group actions into 15-minute blocks
  const blocks = useMemo(() => {
    const blockCount = Math.ceil(minutesPlayed / 15) || 6;
    const result: { range: string; actions: PerformanceAction[]; totalScore: number; count: number }[] = [];

    for (let i = 0; i < blockCount; i++) {
      const start = i * 15;
      const end = Math.min((i + 1) * 15, minutesPlayed);
      const blockActions = actions.filter(a => Math.floor(a.minute) >= start && Math.floor(a.minute) < end);
      const totalScore = blockActions.reduce((sum, a) => sum + a.action_score, 0);

      result.push({
        range: `${start}-${end}'`,
        actions: blockActions,
        totalScore,
        count: blockActions.length,
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

  const maxAbsScore = Math.max(...blocks.map(b => Math.abs(b.totalScore)), 0.01);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Action Heatmap</h4>
        <span className="text-xs text-muted-foreground">{actions.length} actions across {minutesPlayed} min</span>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {blocks.map((block, idx) => {
          const intensity = Math.abs(block.totalScore) / maxAbsScore;
          const color = block.count > 0 ? getScoreColor(block.totalScore / block.count) : "hsl(var(--muted))";

          return (
            <div
              key={idx}
              className="relative rounded-md flex flex-col items-center justify-center py-3 px-1 transition-all hover:scale-105"
              style={{
                backgroundColor: color,
                opacity: block.count > 0 ? 0.4 + intensity * 0.6 : 0.2,
              }}
              title={`${block.range}: ${block.count} actions, score ${block.totalScore.toFixed(3)}`}
            >
              <span className="text-[10px] font-bold text-white drop-shadow-md">{block.range}</span>
              <span className="text-lg font-bold text-white drop-shadow-md">{block.count}</span>
              <span className="text-[9px] text-white/80 drop-shadow-sm">
                {block.totalScore > 0 ? "+" : ""}{block.totalScore.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(48, 96%, 53%)" }} />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
          <span>Positive</span>
        </div>
      </div>
    </div>
  );
};
