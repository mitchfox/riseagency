import { useMemo, useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_METRICS, METRIC_CATEGORIES, ALL_GK_METRICS, GK_METRIC_CATEGORIES, isGoalkeeperPosition } from "@/components/staff/ComparisonPlayerData";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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
  playerPosition?: string;
}

const PORTAL_COLOUR = "hsl(43, 49%, 61%)";
const COMP_COLOUR = "hsl(0, 0%, 55%)";
const COMP_HOVER_COLOUR = "hsl(0, 0%, 90%)";

interface PointData {
  name: string;
  club: string | null;
  x: number;
  y: number;
  isPortal: boolean;
  idx: number;
}

export const ScatterComparisonChart = ({
  playerName,
  portalMetrics,
  hasPortalData,
  comparisonPlayers,
}: Props) => {
  const [xMetric, setXMetric] = useState("goals_per90");
  const [yMetric, setYMetric] = useState("xa_per90");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const xMeta = ALL_METRICS.find(m => m.key === xMetric);
  const yMeta = ALL_METRICS.find(m => m.key === yMetric);

  const points = useMemo(() => {
    const pts: PointData[] = [];
    let idx = 0;

    comparisonPlayers.forEach(cp => {
      const xVal = cp.metrics[xMetric];
      const yVal = cp.metrics[yMetric];
      if (xVal != null && yVal != null) {
        pts.push({ name: cp.name, club: cp.club, x: xVal, y: yVal, isPortal: false, idx: idx++ });
      }
    });

    if (hasPortalData && portalMetrics[xMetric] != null && portalMetrics[yMetric] != null) {
      pts.push({ name: playerName, club: null, x: portalMetrics[xMetric]!, y: portalMetrics[yMetric]!, isPortal: true, idx: idx++ });
    }

    return pts;
  }, [comparisonPlayers, portalMetrics, hasPortalData, playerName, xMetric, yMetric]);

  const activeIdx = selectedIdx ?? hoveredIdx;
  const activePoint = activeIdx != null ? points.find(p => p.idx === activeIdx) : null;

  const handlePointClick = useCallback((idx: number) => {
    setSelectedIdx(prev => prev === idx ? null : idx);
  }, []);

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

  const xVals = points.map(p => p.x);
  const yVals = points.map(p => p.y);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const pad = 0.15;

  const chartW = 100;
  const chartH = 100;

  const toX = (v: number) => ((v - xMin + xRange * pad) / (xRange * (1 + 2 * pad))) * chartW;
  const toY = (v: number) => chartH - ((v - yMin + yRange * pad) / (yRange * (1 + 2 * pad))) * chartH;

  const getAxisTicks = (min: number, max: number, count: number) => {
    const range = max - min || 1;
    const step = range / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  const xTicks = getAxisTicks(xMin, xMax, 5);
  const yTicks = getAxisTicks(yMin, yMax, 5);

  const isPctX = xMetric.endsWith("_pct");
  const isPctY = yMetric.endsWith("_pct");

  return (
    <div className="space-y-4">
      {/* Metric selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">X-Axis</label>
          <Select value={xMetric} onValueChange={(v) => { setXMetric(v); setSelectedIdx(null); }}>
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
          <Select value={yMetric} onValueChange={(v) => { setYMetric(v); setSelectedIdx(null); }}>
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

      {/* Chart container */}
      <div className="relative rounded-xl overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(0 0% 8%), hsl(0 0% 5%))" }}>
        {/* Glossy overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, hsla(43, 49%, 61%, 0.04) 0%, transparent 60%)",
          }}
        />

        <div className="p-4 sm:p-6">
          <svg
            viewBox={`-14 -6 ${chartW + 22} ${chartH + 22}`}
            className="w-full"
            style={{ aspectRatio: "4/3" }}
          >
            {/* Subtle grid */}
            {xTicks.map((tick, i) => {
              const cx = toX(tick);
              return (
                <g key={`x-${i}`}>
                  <line x1={cx} y1={0} x2={cx} y2={chartH} stroke="hsla(0, 0%, 100%, 0.06)" strokeWidth="0.25" />
                  <text x={cx} y={chartH + 5} textAnchor="middle" fill="hsla(0, 0%, 100%, 0.35)" style={{ fontSize: "2.8px", fontFamily: "system-ui" }}>
                    {tick.toFixed(isPctX ? 0 : 2)}{isPctX ? "%" : ""}
                  </text>
                </g>
              );
            })}
            {yTicks.map((tick, i) => {
              const cy = toY(tick);
              return (
                <g key={`y-${i}`}>
                  <line x1={0} y1={cy} x2={chartW} y2={cy} stroke="hsla(0, 0%, 100%, 0.06)" strokeWidth="0.25" />
                  <text x={-2} y={cy + 1} textAnchor="end" fill="hsla(0, 0%, 100%, 0.35)" style={{ fontSize: "2.8px", fontFamily: "system-ui" }}>
                    {tick.toFixed(isPctY ? 0 : 2)}{isPctY ? "%" : ""}
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={chartW / 2} y={chartH + 12} textAnchor="middle" fill="hsla(0, 0%, 100%, 0.45)" style={{ fontSize: "3.2px", fontWeight: 500, letterSpacing: "0.3px" }}>
              {xMeta?.label || xMetric}
            </text>
            <text
              x={-9}
              y={chartH / 2}
              textAnchor="middle"
              fill="hsla(0, 0%, 100%, 0.45)"
              style={{ fontSize: "3.2px", fontWeight: 500, letterSpacing: "0.3px" }}
              transform={`rotate(-90, -9, ${chartH / 2})`}
            >
              {yMeta?.label || yMetric}
            </text>

            {/* Data points */}
            {points
              .sort((a, b) => (a.isPortal ? 1 : 0) - (b.isPortal ? 1 : 0))
              .map((pt) => {
                const cx = toX(pt.x);
                const cy = toY(pt.y);
                const isActive = activeIdx === pt.idx;
                const size = pt.isPortal ? 3.8 : isActive ? 3.2 : 2.6;
                const strokeW = pt.isPortal ? 0.7 : isActive ? 0.6 : 0.45;
                const colour = pt.isPortal
                  ? PORTAL_COLOUR
                  : isActive
                    ? COMP_HOVER_COLOUR
                    : COMP_COLOUR;
                const glowOpacity = pt.isPortal ? 0.3 : isActive ? 0.2 : 0;

                return (
                  <g
                    key={pt.idx}
                    className="cursor-pointer"
                    style={{ pointerEvents: "all", transition: "opacity 0.15s" }}
                    onMouseEnter={() => setHoveredIdx(pt.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => handlePointClick(pt.idx)}
                  >
                    {/* Glow */}
                    {glowOpacity > 0 && (
                      <circle cx={cx} cy={cy} r={size * 1.8} fill={colour} opacity={glowOpacity} />
                    )}
                    {/* X marker - thin, sharp lines */}
                    <line
                      x1={cx - size / 2} y1={cy - size / 2}
                      x2={cx + size / 2} y2={cy + size / 2}
                      stroke={colour} strokeWidth={strokeW} strokeLinecap="round"
                      style={{ transition: "all 0.15s ease" }}
                    />
                    <line
                      x1={cx + size / 2} y1={cy - size / 2}
                      x2={cx - size / 2} y2={cy + size / 2}
                      stroke={colour} strokeWidth={strokeW} strokeLinecap="round"
                      style={{ transition: "all 0.15s ease" }}
                    />
                    {/* Name label for active point */}
                    {isActive && (
                      <text
                        x={cx}
                        y={cy - size - 1.5}
                        textAnchor="middle"
                        fill={colour}
                        style={{ fontSize: "2.8px", fontWeight: 600, fontFamily: "system-ui" }}
                      >
                        {pt.name}
                      </text>
                    )}
                    {/* Hit area */}
                    <circle cx={cx} cy={cy} r={Math.max(size * 1.5, 4)} fill="transparent" />
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Info panel */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-lg px-4 py-3 flex items-start justify-between"
              style={{
                background: "linear-gradient(135deg, hsla(0, 0%, 100%, 0.08), hsla(0, 0%, 100%, 0.03))",
                border: `1px solid ${activePoint.isPortal ? "hsla(43, 49%, 61%, 0.3)" : "hsla(0, 0%, 100%, 0.1)"}`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: activePoint.isPortal ? PORTAL_COLOUR : COMP_HOVER_COLOUR }}
                  />
                  <span className="text-sm font-semibold text-white truncate">{activePoint.name}</span>
                  {activePoint.club && (
                    <span className="text-xs text-white/40">{activePoint.club}</span>
                  )}
                  {activePoint.isPortal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsla(43, 49%, 61%, 0.15)", color: PORTAL_COLOUR }}>
                      You
                    </span>
                  )}
                </div>
                <div className="flex gap-6 text-xs">
                  <div>
                    <span className="text-white/40">{xMeta?.label}</span>
                    <span className="ml-1.5 text-white font-semibold tabular-nums">{activePoint.x.toFixed(2)}{isPctX ? "%" : ""}</span>
                  </div>
                  <div>
                    <span className="text-white/40">{yMeta?.label}</span>
                    <span className="ml-1.5 text-white font-semibold tabular-nums">{activePoint.y.toFixed(2)}{isPctY ? "%" : ""}</span>
                  </div>
                </div>
              </div>
              {selectedIdx != null && (
                <button
                  onClick={() => setSelectedIdx(null)}
                  className="text-white/30 hover:text-white/60 transition-colors ml-2 mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center gap-5 justify-center pb-4 text-[11px]" style={{ color: "hsla(0, 0%, 100%, 0.4)" }}>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="2" y1="2" x2="8" y2="8" stroke={PORTAL_COLOUR} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="2" y2="8" stroke={PORTAL_COLOUR} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {playerName}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="9" height="9" viewBox="0 0 10 10">
              <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke={COMP_COLOUR} strokeWidth="1" strokeLinecap="round" />
              <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke={COMP_COLOUR} strokeWidth="1" strokeLinecap="round" />
            </svg>
            {comparisonPlayers[0]?.position || ""} players
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Hover or tap any marker to reveal player details.
      </p>
    </div>
  );
};
