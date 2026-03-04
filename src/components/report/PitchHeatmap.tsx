import { useMemo } from "react";

interface PitchHeatmapAction {
  action_number: number;
  action_score: number;
  zone?: number | null;
  zone_details?: { zone: number; sub?: number }[] | null;
}

interface PitchHeatmapProps {
  actions: PitchHeatmapAction[];
}

const WIDTH = 300;
const HEIGHT = 450;

// Major zone grid: 3 cols x 6 rows
// Each major zone is 100w x 75h (approx)
const ZONE_W = (WIDTH - 20) / 3;   // ~93
const ZONE_H = (HEIGHT - 20) / 6;  // ~72

// Get pixel position for a zone + optional sub-zone
const getPosition = (zone: number, sub?: number): { x: number; y: number } => {
  // Zone 1 = bottom-left, zone 18 = top-right
  const col = (zone - 1) % 3;        // 0, 1, 2
  const row = Math.floor((zone - 1) / 3); // 0-5 (0=bottom)

  const majorX = 10 + col * ZONE_W + ZONE_W / 2;
  const majorY = HEIGHT - 10 - row * ZONE_H - ZONE_H / 2;

  if (!sub || sub < 1 || sub > 9) return { x: majorX, y: majorY };

  // Sub-zone offsets within the major zone
  const subCol = (sub - 1) % 3;        // 0, 1, 2
  const subRow = Math.floor((sub - 1) / 3); // 0-2 (0=bottom)
  const subOffsetX = (subCol - 1) * (ZONE_W / 3.5);
  const subOffsetY = -(subRow - 1) * (ZONE_H / 3.5);

  return { x: majorX + subOffsetX, y: majorY + subOffsetY };
};

export const PitchHeatmap = ({ actions }: PitchHeatmapProps) => {
  const heatmapData = useMemo(() => {
    // Collect all zone points from all actions
    const points: { x: number; y: number }[] = [];

    for (const a of actions) {
      // Prefer zone_details if available
      if (a.zone_details && Array.isArray(a.zone_details) && a.zone_details.length > 0) {
        for (const zp of a.zone_details) {
          if (zp.zone >= 1 && zp.zone <= 18) {
            points.push(getPosition(zp.zone, zp.sub));
          }
        }
      } else if (a.zone != null && a.zone >= 1 && a.zone <= 18) {
        points.push(getPosition(a.zone));
      }
    }

    if (points.length === 0) return null;

    // Cluster nearby points into heat blobs using a simple grid binning
    const GRID_SIZE = 25;
    const bins: Record<string, { x: number; y: number; count: number; totalX: number; totalY: number }> = {};

    for (const p of points) {
      const bx = Math.floor(p.x / GRID_SIZE);
      const by = Math.floor(p.y / GRID_SIZE);
      const key = `${bx},${by}`;
      if (!bins[key]) {
        bins[key] = { x: 0, y: 0, count: 0, totalX: 0, totalY: 0 };
      }
      bins[key].count++;
      bins[key].totalX += p.x;
      bins[key].totalY += p.y;
    }

    const blobs = Object.values(bins).map(b => ({
      x: b.totalX / b.count,
      y: b.totalY / b.count,
      count: b.count,
    }));

    const maxCount = Math.max(...blobs.map(b => b.count), 1);

    return { blobs, maxCount, totalPoints: points.length };
  }, [actions]);

  if (!heatmapData || heatmapData.blobs.length === 0) {
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
        <span className="text-xs text-muted-foreground">{heatmapData.totalPoints} zone points</span>
      </div>
      
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[280px] md:max-w-[320px]"
          style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        >
          <defs>
            {heatmapData.blobs.map((blob, i) => {
              const intensity = blob.count / heatmapData.maxCount;
              return (
                <radialGradient key={`grad-${i}`} id={`heat-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={`rgba(255, 50, 0, ${0.3 + intensity * 0.55})`} />
                  <stop offset="40%" stopColor={`rgba(255, 120, 0, ${0.15 + intensity * 0.35})`} />
                  <stop offset="70%" stopColor={`rgba(255, 200, 0, ${0.05 + intensity * 0.15})`} />
                  <stop offset="100%" stopColor="rgba(255, 200, 0, 0)" />
                </radialGradient>
              );
            })}
          </defs>

          {/* Pitch background */}
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="6" fill="#1a472a" />
          
          {/* Pitch markings */}
          <rect x="10" y="10" width={WIDTH - 20} height={HEIGHT - 20} rx="2" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1="10" y1={HEIGHT / 2} x2={WIDTH - 10} y2={HEIGHT / 2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="2" fill="rgba(255,255,255,0.25)" />
          
          {/* Top penalty box (attacking) */}
          <rect x="60" y="10" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <rect x="100" y="10" width="100" height="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          
          {/* Bottom penalty box (defending) */}
          <rect x="60" y={HEIGHT - 65} width="180" height="55" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <rect x="100" y={HEIGHT - 35} width="100" height="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          
          {/* Heatmap blobs */}
          {heatmapData.blobs.map((blob, i) => {
            const intensity = blob.count / heatmapData.maxCount;
            const radius = 35 + intensity * 40;
            return (
              <ellipse
                key={`blob-${i}`}
                cx={blob.x}
                cy={blob.y}
                rx={radius}
                ry={radius * 0.85}
                fill={`url(#heat-${i})`}
                style={{ mixBlendMode: "screen" }}
              />
            );
          })}
          
          {/* Count labels */}
          {heatmapData.blobs.map((blob, i) => (
            <text
              key={`label-${i}`}
              x={blob.x}
              y={blob.y + 4}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="bold"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              {blob.count}
            </text>
          ))}
          
          {/* Direction labels */}
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
