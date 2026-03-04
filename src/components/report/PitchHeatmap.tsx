import { useMemo } from "react";

interface PitchHeatmapAction {
  action_number: number;
  action_score: number;
  zone?: number | null;
}

interface PitchHeatmapProps {
  actions: PitchHeatmapAction[];
}

// Zone centres on a 300x450 pitch (3 cols x 6 rows)
// Bottom-left = zone 1, top-right = zone 18
const ZONE_CENTRES: Record<number, { x: number; y: number }> = {
  1:  { x: 50,  y: 400 },
  2:  { x: 150, y: 400 },
  3:  { x: 250, y: 400 },
  4:  { x: 50,  y: 325 },
  5:  { x: 150, y: 325 },
  6:  { x: 250, y: 325 },
  7:  { x: 50,  y: 250 },
  8:  { x: 150, y: 250 },
  9:  { x: 250, y: 250 },
  10: { x: 50,  y: 175 },
  11: { x: 150, y: 175 },
  12: { x: 250, y: 175 },
  13: { x: 50,  y: 100 },
  14: { x: 150, y: 100 },
  15: { x: 250, y: 100 },
  16: { x: 50,  y: 35 },
  17: { x: 150, y: 35 },
  18: { x: 250, y: 35 },
};

const WIDTH = 300;
const HEIGHT = 450;

export const PitchHeatmap = ({ actions }: PitchHeatmapProps) => {
  const zonedActions = actions.filter(a => a.zone != null && a.zone >= 1 && a.zone <= 18);

  const heatmapData = useMemo(() => {
    if (zonedActions.length === 0) return null;

    // Count actions per zone and total score
    const zoneCounts: Record<number, number> = {};
    for (const a of zonedActions) {
      zoneCounts[a.zone!] = (zoneCounts[a.zone!] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(zoneCounts), 1);

    // Generate heat points with intensity based on action count
    const points: { x: number; y: number; intensity: number; count: number }[] = [];
    for (const [zoneStr, count] of Object.entries(zoneCounts)) {
      const zone = parseInt(zoneStr);
      const centre = ZONE_CENTRES[zone];
      if (!centre) continue;
      points.push({
        x: centre.x,
        y: centre.y,
        intensity: count / maxCount,
        count,
      });
    }

    return { points, maxCount, zoneCounts };
  }, [zonedActions]);

  if (!heatmapData || heatmapData.points.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No zone data available for heatmap
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Pitch Heatmap</h4>
        <span className="text-xs text-muted-foreground">{zonedActions.length} zoned actions</span>
      </div>
      
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[280px] md:max-w-[320px]"
          style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        >
          <defs>
            {/* Radial gradient for each heat point */}
            {heatmapData.points.map((point, i) => (
              <radialGradient key={`grad-${i}`} id={`heat-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={`rgba(255, 50, 0, ${0.3 + point.intensity * 0.55})`} />
                <stop offset="40%" stopColor={`rgba(255, 120, 0, ${0.15 + point.intensity * 0.35})`} />
                <stop offset="70%" stopColor={`rgba(255, 200, 0, ${0.05 + point.intensity * 0.15})`} />
                <stop offset="100%" stopColor="rgba(255, 200, 0, 0)" />
              </radialGradient>
            ))}
          </defs>

          {/* Pitch background */}
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="6" fill="#1a472a" />
          
          {/* Pitch markings */}
          {/* Outer border */}
          <rect x="10" y="10" width={WIDTH - 20} height={HEIGHT - 20} rx="2" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          
          {/* Centre line */}
          <line x1="10" y1={HEIGHT / 2} x2={WIDTH - 10} y2={HEIGHT / 2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          
          {/* Centre circle */}
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="2" fill="rgba(255,255,255,0.25)" />
          
          {/* Top penalty box (attacking) */}
          <rect x="60" y="10" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <rect x="100" y="10" width="100" height="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          
          {/* Bottom penalty box (defending) */}
          <rect x="60" y={HEIGHT - 65} width="180" height="55" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <rect x="100" y={HEIGHT - 35} width="100" height="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          
          {/* Heatmap blobs */}
          {heatmapData.points.map((point, i) => {
            const radius = 40 + point.intensity * 35;
            return (
              <ellipse
                key={`blob-${i}`}
                cx={point.x}
                cy={point.y}
                rx={radius}
                ry={radius * 0.85}
                fill={`url(#heat-${i})`}
                style={{ mixBlendMode: "screen" }}
              />
            );
          })}
          
          {/* Zone count labels */}
          {heatmapData.points.map((point, i) => (
            <text
              key={`label-${i}`}
              x={point.x}
              y={point.y + 4}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              {point.count}
            </text>
          ))}
          
          {/* Direction arrow */}
          <text x={WIDTH / 2} y={HEIGHT - 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            Own Goal
          </text>
          <text x={WIDTH / 2} y="7" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">
            ↑ Attacking
          </text>
        </svg>
      </div>
    </div>
  );
};
