import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import type { ShotMapData } from "@/components/report/ShotMapSelector";

const SHOT_MAP_STAT_KEY = "__shot_map";

// Goal zones: 3 rows x 5 cols (1-15), viewed from behind the goal
const GOAL_ROWS = 3;
const GOAL_COLS = 5;

// Off-target zones mapped to positions around the goal
const OFF_TARGET_POSITIONS: Record<number, { x: number; y: number }> = {
  // Top row (above crossbar)
  16: { x: 0.15, y: 0.06 }, 17: { x: 0.32, y: 0.06 }, 18: { x: 0.5, y: 0.06 },
  19: { x: 0.68, y: 0.06 }, 20: { x: 0.85, y: 0.06 },
  // Left side
  21: { x: 0.08, y: 0.3 }, 23: { x: 0.08, y: 0.5 }, 25: { x: 0.08, y: 0.7 },
  // Right side
  22: { x: 0.92, y: 0.3 }, 24: { x: 0.92, y: 0.5 }, 26: { x: 0.92, y: 0.7 },
  // Bottom row (below goal line)
  27: { x: 0.15, y: 0.94 }, 28: { x: 0.32, y: 0.94 }, 29: { x: 0.5, y: 0.94 },
  30: { x: 0.68, y: 0.94 }, 31: { x: 0.85, y: 0.94 },
};

const GOAL_ZONES = new Set(Array.from({ length: 15 }, (_, i) => i + 1));

// GK view: from the goalkeeper's perspective — a goal conceded is bad (red),
// a save is positive (rise gold), missed/blocked are neutral wins.
const GK_OUTCOME_COLORS: Record<string, string> = {
  goal: "#ef4444",       // Red — conceded
  saved: "#C6A332",      // Rise Gold — saved
  missed: "#6b7280",     // Grey
  blocked: "#3b82f6",    // Blue
  default: "#9ca3af",
};

// Outfield view: from the attacker's perspective — a goal is the desired
// outcome (rise gold), a miss/save/block are progressively worse.
const OUTFIELD_OUTCOME_COLORS: Record<string, string> = {
  goal: "#C6A332",       // Rise Gold — goal scored
  missed: "#ef4444",     // Red — missed the target
  saved: "#f97316",      // Orange — saved by keeper
  blocked: "#eab308",    // Yellow — blocked
  default: "#9ca3af",
};

interface ShotMapCarrier {
  id: string;
  action_number?: number;
  minute?: number | null;
  action_type?: string | null;
  action_description?: string | null;
  action_score?: number | null;
  notes?: string | null;
  recorded_stat?: unknown;
  shot_map?: ShotMapData | null;
}

interface ShotPoint {
  id: string;
  zone: number;
  detail: number;
  outcome: ShotMapData["outcome"];
  x: number;
  y: number;
  stackIndex: number;
  actionLabel: string;
  actionType: string;
  actionDescription: string | null;
  actionScore: number | null;
  minute: number | null;
  notes: string | null;
}

export const extractShotMapFromRecordedStat = (recordedStat?: unknown): ShotMapData | null => {
  const stats = Array.isArray(recordedStat) ? recordedStat : recordedStat ? [recordedStat] : [];
  const shotMapEntry = stats.find((stat: any) => stat?.stat_type === SHOT_MAP_STAT_KEY && stat?.shot_map);
  return (shotMapEntry as any)?.shot_map || null;
};

export const getShotMapFromAction = (action: ShotMapCarrier): ShotMapData | null => {
  return action.shot_map || extractShotMapFromRecordedStat(action.recorded_stat);
};

export const hasShotMapData = (actions: ShotMapCarrier[]) => {
  return actions.some((action) => !!getShotMapFromAction(action)?.zone);
};

// Goal frame occupies the centre of the graphic — wider to look like a real goal
const GOAL_LEFT = 0.12;
const GOAL_RIGHT = 0.88;
const GOAL_TOP = 0.22;
const GOAL_BOTTOM = 0.82;

const getPointPosition = (zone: number, detail?: number | null): { x: number; y: number } | null => {
  if (GOAL_ZONES.has(zone)) {
    // Zone 1-5 = bottom row, 6-10 = middle, 11-15 = top
    const row = 2 - Math.floor((zone - 1) / 5); // 0=top, 1=mid, 2=bottom
    const col = (zone - 1) % 5;

    const cellW = (GOAL_RIGHT - GOAL_LEFT) / GOAL_COLS;
    const cellH = (GOAL_BOTTOM - GOAL_TOP) / GOAL_ROWS;

    // Sub-grid detail (1-9)
    const safeDetail = detail && detail >= 1 && detail <= 9 ? detail : 5;
    const dCol = (safeDetail - 1) % 3;
    const dRow = 2 - Math.floor((safeDetail - 1) / 3);

    return {
      x: GOAL_LEFT + cellW * col + cellW * (dCol + 0.5) / 3,
      y: GOAL_TOP + cellH * row + cellH * (dRow + 0.5) / 3,
    };
  }

  return OFF_TARGET_POSITIONS[zone] || null;
};

const formatActionLabel = (action: ShotMapCarrier, shotMap: ShotMapData) => {
  const numberPrefix = action.action_number ? `#${action.action_number}` : "Shot";
  const minuteLabel = action.minute != null ? ` · ${action.minute}'` : "";
  const outcomeLabel = shotMap.outcome ? ` · ${shotMap.outcome}` : "";
  const scoreLabel = typeof action.action_score === "number" ? ` · ${action.action_score.toFixed(2)}` : "";
  return `${numberPrefix}${minuteLabel}${outcomeLabel}${scoreLabel}`;
};

export const ShotMapGraphic = ({ actions, isGoalkeeper = false }: { actions: ShotMapCarrier[]; isGoalkeeper?: boolean }) => {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const OUTCOME_COLORS = isGoalkeeper ? GK_OUTCOME_COLORS : OUTFIELD_OUTCOME_COLORS;
  const OUTCOME_LABELS: Array<{ label: string; key: string; color: string }> = [
    { label: "Goal", key: "goal", color: OUTCOME_COLORS.goal },
    { label: "Saved", key: "saved", color: OUTCOME_COLORS.saved },
    { label: "Missed", key: "missed", color: OUTCOME_COLORS.missed },
    { label: "Blocked", key: "blocked", color: OUTCOME_COLORS.blocked },
  ];

  const shotPoints = useMemo<ShotPoint[]>(() => {
    const stackMap = new Map<string, number>();

    return actions.flatMap((action) => {
      const shotMap = getShotMapFromAction(action);
      if (!shotMap?.zone) return [];

      const position = getPointPosition(shotMap.zone, shotMap.detail);
      if (!position) return [];

      const stackKey = `${shotMap.zone}-${shotMap.detail ?? 5}`;
      const stackIndex = stackMap.get(stackKey) ?? 0;
      stackMap.set(stackKey, stackIndex + 1);

      return [{
        id: action.id,
        zone: shotMap.zone,
        detail: shotMap.detail ?? 5,
        outcome: shotMap.outcome ?? null,
        x: position.x,
        y: position.y,
        stackIndex,
        actionLabel: formatActionLabel(action, shotMap),
        actionType: action.action_type ?? "Shot",
        actionDescription: action.action_description ?? null,
        actionScore: typeof action.action_score === "number" ? action.action_score : null,
        minute: action.minute ?? null,
        notes: action.notes ?? null,
      }];
    });
  }, [actions]);

  const selectedShot = shotPoints.find((shot) => shot.id === selectedShotId) ?? null;

  if (shotPoints.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
        <Crosshair className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No shot map data recorded yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Once shots are tagged, every attempt will appear here.</p>
      </div>
    );
  }

  const goalL = GOAL_LEFT * 100;
  const goalT = GOAL_TOP * 100;
  const goalW = (GOAL_RIGHT - GOAL_LEFT) * 100;
  const goalH = (GOAL_BOTTOM - GOAL_TOP) * 100;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-[430px] flex-col gap-3">
        {/* Goal frame SVG */}
        <div className="relative aspect-[2/1] overflow-hidden rounded-[1.5rem] border border-border/70 bg-[hsl(var(--background))]">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {/* Grass / pitch background */}
            <rect x="0" y="0" width="100" height="100" fill="hsl(142 40% 12%)" />

            {/* Net pattern inside goal */}
            <defs>
              <pattern id="net-pattern" x="0" y="0" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="3.2" y2="3.2" stroke="white" strokeWidth="0.15" strokeOpacity="0.18" />
                <line x1="3.2" y1="0" x2="0" y2="3.2" stroke="white" strokeWidth="0.15" strokeOpacity="0.18" />
              </pattern>
            </defs>
            <rect x={goalL} y={goalT} width={goalW} height={goalH} fill="url(#net-pattern)" />
            <rect x={goalL} y={goalT} width={goalW} height={goalH} fill="hsl(0 0% 0% / 0.25)" />

            {/* Goal frame (white posts and crossbar) */}
            {/* Crossbar */}
            <rect x={goalL - 0.8} y={goalT - 1.6} width={goalW + 1.6} height={1.6} rx="0.8" fill="white" />
            {/* Left post */}
            <rect x={goalL - 1.2} y={goalT - 1.6} width={1.4} height={goalH + 2} rx="0.6" fill="white" />
            {/* Right post */}
            <rect x={goalL + goalW - 0.2} y={goalT - 1.6} width={1.4} height={goalH + 2} rx="0.6" fill="white" />

            {/* Goal line */}
            <line x1={goalL} y1={goalT + goalH + 0.4} x2={goalL + goalW} y2={goalT + goalH + 0.4}
              stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />

            {/* Internal grid lines for zones */}
            {[1, 2, 3, 4].map(i => (
              <line key={`vcol-${i}`}
                x1={goalL + (goalW / 5) * i} y1={goalT}
                x2={goalL + (goalW / 5) * i} y2={goalT + goalH}
                stroke="white" strokeWidth="0.2" strokeOpacity="0.12"
              />
            ))}
            {[1, 2].map(i => (
              <line key={`hrow-${i}`}
                x1={goalL} y1={goalT + (goalH / 3) * i}
                x2={goalL + goalW} y2={goalT + (goalH / 3) * i}
                stroke="white" strokeWidth="0.2" strokeOpacity="0.12"
              />
            ))}
          </svg>

          {/* Shot markers */}
          <div className="absolute inset-0">
            {shotPoints.map((shot) => {
              const color = OUTCOME_COLORS[shot.outcome || "default"] || OUTCOME_COLORS.default;
              const angle = shot.stackIndex * 1.3;
              const radius = shot.stackIndex === 0 ? 0 : 6;
              const offsetX = Math.cos(angle) * radius;
              const offsetY = Math.sin(angle) * radius;
              const isSelected = selectedShotId === shot.id;

              // Deterministic pseudo-random jitter ±2px seeded from ID
              const hash = shot.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
              const jitterX = ((hash % 5) - 2);
              const jitterY = (((hash >> 8) % 5) - 2);

              return (
                <button
                  type="button"
                  key={shot.id}
                  title={shot.actionLabel}
                  onClick={() => setSelectedShotId((c) => c === shot.id ? null : shot.id)}
                  className="absolute h-3.5 w-3.5 rounded-full shadow-md transition-transform hover:scale-125"
                  style={{
                    left: `${shot.x * 100}%`,
                    top: `${shot.y * 100}%`,
                    transform: `translate(calc(-50% + ${offsetX + jitterX}px), calc(-50% + ${offsetY + jitterY}px))`,
                    backgroundColor: color,
                    border: isSelected ? "2px solid white" : "2px solid rgba(0,0,0,0.3)",
                    boxShadow: isSelected
                      ? `0 0 0 3px white, 0 0 8px ${color}`
                      : `0 1px 3px rgba(0,0,0,0.4)`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Selected shot detail card */}
        {selectedShot && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{selectedShot.actionLabel}</p>
                <p className="text-xs text-muted-foreground">{selectedShot.actionType}</p>
              </div>
              {selectedShot.actionScore != null && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {selectedShot.actionScore.toFixed(2)}
                </span>
              )}
            </div>
            {selectedShot.actionDescription && <p className="mt-2 text-xs text-foreground/85">{selectedShot.actionDescription}</p>}
            {selectedShot.notes && <p className="mt-2 text-xs text-muted-foreground">{selectedShot.notes}</p>}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
          {OUTCOME_LABELS.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
