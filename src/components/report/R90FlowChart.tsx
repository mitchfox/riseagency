import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface PerformanceAction {
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
}

interface R90FlowChartProps {
  actions: PerformanceAction[];
  minutesPlayed: number;
}

export const R90FlowChart = ({ actions, minutesPlayed }: R90FlowChartProps) => {
  const chartData = useMemo(() => {
    if (actions.length === 0 || !minutesPlayed) return [];

    // Sort actions by minute
    const sorted = [...actions].sort((a, b) => a.minute - b.minute);

    // Calculate the start minute (final action minute - minutes played)
    const lastActionMinute = Math.max(...sorted.map(a => Math.floor(a.minute)));
    const startMinute = Math.max(0, lastActionMinute - minutesPlayed);

    // Build cumulative score, then interpolate minute-by-minute
    const actionPoints: { minute: number; score: number; label: string }[] = [];
    let cumulativeScore = 0;

    sorted.forEach(action => {
      cumulativeScore += action.action_score;
      actionPoints.push({
        minute: Math.floor(action.minute),
        score: cumulativeScore,
        label: `#${action.action_number} ${action.action_type}`,
      });
    });

    // Generate a point for every minute from start to end
    const endMinute = Math.max(...actionPoints.map(a => a.minute));
    const points: { minute: number; r90: number; rawScore: number; label: string }[] = [];

    // Build a map of cumulative score at each action minute
    const scoreAtMinute = new Map<number, { score: number; label: string }>();
    actionPoints.forEach(ap => {
      scoreAtMinute.set(ap.minute, { score: ap.score, label: ap.label });
    });

    let runningScore = 0;
    for (let m = startMinute; m <= endMinute; m++) {
      const entry = scoreAtMinute.get(m);
      if (entry) runningScore = entry.score;

      const elapsed = m - startMinute;
      const r90 = elapsed > 0 ? (runningScore / elapsed) * 90 : 0;

      points.push({
        minute: m,
        r90: Math.round(r90 * 100) / 100,
        rawScore: Math.round(runningScore * 1000) / 1000,
        label: entry?.label || "",
      });
    }

    return points;
  }, [actions, minutesPlayed]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No action data available for R90 flow
      </div>
    );
  }

  const finalR90 = chartData[chartData.length - 1]?.r90 ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">R90 Flow Through Match</h4>
        <span className="text-xs text-muted-foreground">
          Final R90: <span className="font-bold text-foreground">{finalR90.toFixed(2)}</span>
        </span>
      </div>
      <div className="h-[250px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="minute"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value: number) => `${value}'`}
              ticks={chartData.filter(d => d.minute % 5 === 0).map(d => d.minute)}
              label={{ value: "Minute", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              label={{ value: "R90", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "r90") return [value.toFixed(2), "R90"];
                return [value, name];
              }}
              labelFormatter={(label) => `Minute ${label}`}
            />
            <ReferenceLine y={1} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="r90"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
