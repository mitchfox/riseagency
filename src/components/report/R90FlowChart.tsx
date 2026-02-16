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

    // Build cumulative score at each action minute
    const points: { minute: number; r90: number; rawScore: number; label: string }[] = [];
    let cumulativeScore = 0;

    // Starting point
    points.push({ minute: startMinute, r90: 0, rawScore: 0, label: "Start" });

    sorted.forEach(action => {
      cumulativeScore += action.action_score;
      const elapsedMinutes = Math.floor(action.minute) - startMinute;
      const r90AtPoint = elapsedMinutes > 0
        ? (cumulativeScore / elapsedMinutes) * 90
        : 0;

      points.push({
        minute: Math.floor(action.minute),
        r90: Math.round(r90AtPoint * 100) / 100,
        rawScore: Math.round(cumulativeScore * 1000) / 1000,
        label: `#${action.action_number} ${action.action_type}`,
      });
    });

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
