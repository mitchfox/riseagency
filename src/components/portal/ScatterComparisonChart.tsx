import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_METRICS, METRIC_CATEGORIES } from "@/components/staff/ComparisonPlayerData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonPlayer {
  id: string;
  name: string;
  position: string;
  club: string | null;
  season: string;
  image_url: string | null;
  metrics: Record<string, number>;
  r90_average: number | null;
}

interface Props {
  playerName: string;
  portalMetrics: Record<string, number | null>;
  hasPortalData: boolean;
  comparisonPlayers: ComparisonPlayer[];
}

const PORTAL_COLOUR = "hsl(43, 49%, 61%)";
const COMP_COLOUR = "hsl(0, 0%, 85%)";

export const ScatterComparisonChart = ({
  playerName,
  portalMetrics,
  hasPortalData,
  comparisonPlayers,
}: Props) => {
  const [xMetric, setXMetric] = useState("goals_per90");
  const [yMetric, setYMetric] = useState("xa_per90");

  const xMeta = ALL_METRICS.find(m => m.key === xMetric);
  const yMeta = ALL_METRICS.find(m => m.key === yMetric);

  const points = useMemo(() => {
    const pts: { name: string; club: string | null; x: number; y: number; isPortal: boolean }[] = [];

    comparisonPlayers.forEach(cp => {
      const xVal = cp.metrics[xMetric];
      const yVal = cp.metrics[yMetric];
      if (xVal != null && yVal != null) {
        pts.push({ name: cp.name, club: cp.club, x: xVal, y: yVal, isPortal: false });
      }
    });

    if (hasPortalData && portalMetrics[xMetric] != null && portalMetrics[yMetric] != null) {
      pts.push({ name: playerName, club: null, x: portalMetrics[xMetric]!, y: portalMetrics[yMetric]!, isPortal: true });
    }

    return pts;
  }, [comparisonPlayers, portalMetrics, hasPortalData, playerName, xMetric, yMetric]);

  if (comparisonPlayers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No comparison players available for this position.</p>
      </div>
    );
  }

  if (points.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Not enough data for the selected metrics. Try different ones.</p>
      </div>
    );
  }

  // Calculate bounds with padding
  const xVals = points.map(p => p.x);
  const yVals = points.map(p => p.y);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const padding = 0.12;

  const chartW = 100;
  const chartH = 100;

  const toChartX = (v: number) => ((v - xMin + xRange * padding) / (xRange * (1 + 2 * padding))) * chartW;
  const toChartY = (v: number) => chartH - ((v - yMin + yRange * padding) / (yRange * (1 + 2 * padding))) * chartH;

  // Generate nice tick values
  const getAxisTicks = (min: number, max: number, count: number) => {
    const range = max - min || 1;
    const step = range / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  const xTicks = getAxisTicks(xMin, xMax, 5);
  const yTicks = getAxisTicks(yMin, yMax, 5);

  const isPercentageX = xMetric.endsWith("_pct");
  const isPercentageY = yMetric.endsWith("_pct");

  return (
    <div className="space-y-4">
      {/* Metric selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">X-Axis</label>
          <Select value={xMetric} onValueChange={setXMetric}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_CATEGORIES.map(cat => (
                <div key={cat.category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.category}</div>
                  {cat.metrics.map(m => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Y-Axis</label>
          <Select value={yMetric} onValueChange={setYMetric}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_CATEGORIES.map(cat => (
                <div key={cat.category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.category}</div>
                  {cat.metrics.map(m => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="relative bg-card border rounded-lg p-4">
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox={`-14 -6 ${chartW + 20} ${chartH + 20}`}
            className="w-full"
            style={{ aspectRatio: "4/3" }}
          >
            {/* Grid lines */}
            {xTicks.map((tick, i) => {
              const cx = toChartX(tick);
              return (
                <g key={`x-${i}`}>
                  <line x1={cx} y1={0} x2={cx} y2={chartH} stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="2,2" />
                  <text x={cx} y={chartH + 5} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "3px" }}>
                    {tick.toFixed(isPercentageX ? 0 : 2)}{isPercentageX ? "%" : ""}
                  </text>
                </g>
              );
            })}
            {yTicks.map((tick, i) => {
              const cy = toChartY(tick);
              return (
                <g key={`y-${i}`}>
                  <line x1={0} y1={cy} x2={chartW} y2={cy} stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="2,2" />
                  <text x={-2} y={cy + 1} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: "3px" }}>
                    {tick.toFixed(isPercentageY ? 0 : 2)}{isPercentageY ? "%" : ""}
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={chartW / 2} y={chartH + 12} textAnchor="middle" className="fill-muted-foreground font-medium" style={{ fontSize: "3.5px" }}>
              {xMeta?.label || xMetric}
            </text>
            <text
              x={-8}
              y={chartH / 2}
              textAnchor="middle"
              className="fill-muted-foreground font-medium"
              style={{ fontSize: "3.5px" }}
              transform={`rotate(-90, -8, ${chartH / 2})`}
            >
              {yMeta?.label || yMetric}
            </text>

            {/* Data points - comparison players first, then portal player on top */}
            {points
              .sort((a, b) => (a.isPortal ? 1 : 0) - (b.isPortal ? 1 : 0))
              .map((pt, i) => {
                const cx = toChartX(pt.x);
                const cy = toChartY(pt.y);
                const size = pt.isPortal ? 4.5 : 3;
                const colour = pt.isPortal ? PORTAL_COLOUR : COMP_COLOUR;

                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <g className="cursor-pointer" style={{ pointerEvents: "all" }}>
                        {/* X marker */}
                        <line
                          x1={cx - size / 2} y1={cy - size / 2}
                          x2={cx + size / 2} y2={cy + size / 2}
                          stroke={colour} strokeWidth={pt.isPortal ? 1.2 : 0.8} strokeLinecap="round"
                        />
                        <line
                          x1={cx + size / 2} y1={cy - size / 2}
                          x2={cx - size / 2} y2={cy + size / 2}
                          stroke={colour} strokeWidth={pt.isPortal ? 1.2 : 0.8} strokeLinecap="round"
                        />
                        {/* Invisible hit area */}
                        <circle cx={cx} cy={cy} r={size} fill="transparent" />
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-bold">{pt.name}</p>
                      {pt.club && <p className="text-muted-foreground">{pt.club}</p>}
                      <p>{xMeta?.label}: {pt.x.toFixed(2)}{isPercentageX ? "%" : ""}</p>
                      <p>{yMeta?.label}: {pt.y.toFixed(2)}{isPercentageY ? "%" : ""}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </svg>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-4 justify-center mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="2" y1="2" x2="10" y2="10" stroke={PORTAL_COLOUR} strokeWidth="2" strokeLinecap="round" />
              <line x1="10" y1="2" x2="2" y2="10" stroke={PORTAL_COLOUR} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {playerName} (You)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="2" y1="2" x2="8" y2="8" stroke={COMP_COLOUR} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8" y1="2" x2="2" y2="8" stroke={COMP_COLOUR} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Other {comparisonPlayers[0]?.position || ""} players
          </span>
        </div>
      </div>
    </div>
  );
};
