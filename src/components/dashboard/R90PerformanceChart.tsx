import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { X } from "lucide-react";
import { getR90Grade } from "@/lib/gradeCalculations";

interface ChartDataItem {
  opponent: string;
  score: number;
  result: string;
  minutesPlayed?: number;
  strikerStats?: any;
}

interface R90PerformanceChartProps {
  data: ChartDataItem[];
  onBarClick?: (data: ChartDataItem) => void;
}

export const R90PerformanceChart = ({ data, onBarClick }: R90PerformanceChartProps) => {
  const [tooltipVisible, setTooltipVisible] = React.useState(true);
  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      hasAnimated.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const getR90Color = (score: number) => {
    if (score >= 3.0) return "hsl(142, 76%, 36%)";
    if (score >= 2.5) return "hsl(47, 100%, 50%)";
    if (score >= 2.0) return "hsl(25, 95%, 53%)";
    return "hsl(0, 84%, 60%)";
  };

  const maxScore = data.length > 0 
    ? Math.max(...data.map(d => d.score)) + 0.5
    : 4;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length || !tooltipVisible) return null;
    
    const chartData = payload[0].payload;
    const stats = chartData.strikerStats;
    
    return (
      <div 
        className="relative bg-black border-2 border-[hsl(43,49%,61%)] rounded-lg p-3 text-white min-w-[200px]"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          onClick={() => setTooltipVisible(false)}
          className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
          aria-label="Close tooltip"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-2 pr-6">
          <div className="font-bold text-white text-base mb-1">{chartData.result} {chartData.opponent}</div>
          {chartData.minutesPlayed && (
            <div className="text-xs text-white/60">Minutes Played: {chartData.minutesPlayed}</div>
          )}
          {stats && (
            <div className="space-y-1 pt-2 border-t border-white/20">
              <div className="text-xs font-semibold text-white/80">Advanced Stats (per 90):</div>
              {stats.xG_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">xG (adj): {stats.xG_adj_per90.toFixed(2)}</div>
              )}
              {stats.xA_adj_per90 !== undefined && (
                <div className="text-xs text-white/70">xA (adj): {stats.xA_adj_per90.toFixed(2)}</div>
              )}
              {stats.xGChain_per90 !== undefined && (
                <div className="text-xs text-white/70">xGChain: {stats.xGChain_per90.toFixed(2)}</div>
              )}
              {stats.movement_in_behind_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Movement In Behind xC: {stats.movement_in_behind_xC_per90.toFixed(2)}</div>
              )}
              {stats.movement_to_feet_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Movement To Feet xC: {stats.movement_to_feet_xC_per90.toFixed(2)}</div>
              )}
              {stats.crossing_movement_xC_per90 !== undefined && (
                <div className="text-xs text-white/70">Crossing Movement xC: {stats.crossing_movement_xC_per90.toFixed(2)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full" style={{ height: '260px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 40, bottom: 0, left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="opponent"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            height={60}
            interval={0}
            tick={(props) => {
              const { x, y, payload } = props;
              const chartData = data.find(d => d.opponent === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="middle" 
                    fill="white"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {chartData?.result || ''}
                  </text>
                </g>
              );
            }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            domain={[0, maxScore]}
            ticks={Array.from({ length: Math.ceil(maxScore) + 1 }, (_, i) => i)}
            width={30}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
            wrapperStyle={{ pointerEvents: 'auto' }}
          />
          <defs>
            <linearGradient id="barGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.2)" />
            </linearGradient>
            <filter id="barShine">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="0" dy="-2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <Bar 
            dataKey="score" 
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
            animationBegin={0}
            animationDuration={1400}
            animationEasing="ease-in-out"
            filter="url(#barShine)"
            onMouseEnter={() => setTooltipVisible(true)}
            onClick={(barData: any) => onBarClick?.(barData)}
            className={onBarClick ? "cursor-pointer" : ""}
          >
            {data.map((entry, index) => {
              const baseColor = getR90Color(entry.score);
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={baseColor}
                  style={{
                    animation: !hasAnimated.current ? `barSlideUp 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.25}s both` : 'none',
                    filter: 'brightness(1.15) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.1))',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)`,
                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                />
              );
            })}
            <LabelList 
              dataKey="score" 
              position="center"
              content={(props: any) => {
                const { x, y, width, height, value, index } = props;
                if (!x || !y || !width || !height || value === undefined) return null;
                const delay = index * 0.25;
                return (
                  <text
                    x={x + width / 2}
                    y={y + height / 2}
                    fill="#ffffff"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="16"
                    fontWeight="700"
                    style={{
                      opacity: 1,
                      animation: !hasAnimated.current ? `labelFadeIn 0.6s ease-out ${delay + 0.8}s forwards` : 'none'
                    }}
                  >
                    {value}
                  </text>
                );
              }}
            />
            <LabelList 
              dataKey="score" 
              position="top"
              content={(props: any) => {
                const { x, y, width, value, index } = props;
                if (!x || y === undefined || !width || value === undefined) return null;
                const delay = index * 0.25;
                const grade = getR90Grade(value).grade;
                return (
                  <text
                    x={x + width / 2}
                    y={y - 5}
                    fill="hsl(43, 49%, 61%)"
                    textAnchor="middle"
                    dominantBaseline="baseline"
                    fontSize="18"
                    fontWeight="700"
                    style={{
                      opacity: 1,
                      animation: !hasAnimated.current ? `labelFadeIn 0.6s ease-out ${delay + 0.8}s forwards` : 'none'
                    }}
                  >
                    {grade}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
