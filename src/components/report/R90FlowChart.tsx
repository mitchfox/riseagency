import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { t } from "@/lib/portalTranslations";
import { sortReportActionsChronologically } from "@/lib/reportActionHelpers";

interface PerformanceAction {
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
}

interface R90FlowChartProps {
  actions: PerformanceAction[];
  minutesPlayed: number;
  language?: string;
}

export const R90FlowChart = ({ actions, minutesPlayed, language = "en" }: R90FlowChartProps) => {
  const chartData = useMemo(() => {
    if (actions.length === 0 || !minutesPlayed) return [];

    const sorted = [...actions].sort((a, b) => a.minute - b.minute);
    const lastActionMinute = Math.max(...sorted.map(a => Math.floor(a.minute)));
    const startMinute = Math.max(0, lastActionMinute - minutesPlayed);

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

    const endMinute = Math.max(...actionPoints.map(a => a.minute));
    const points: { minute: number; r90: number; rawScore: number; label: string }[] = [];

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
        {t(language, "no_action_data")}
      </div>
    );
  }

  const finalR90 = chartData[chartData.length - 1]?.r90 ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t(language, "r90_flow_through_match")}</h4>
        <span className="text-xs text-muted-foreground">
          {t(language, "final_r90")}: <span className="font-bold text-foreground">{finalR90.toFixed(2)}</span>
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
              label={{ value: t(language, "min_short"), position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } }}
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
              labelFormatter={(label) => `${t(language, "min_short")} ${label}`}
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
