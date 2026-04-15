import { useEffect, useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import type { ShotMapData } from "@/components/report/ShotMapSelector";

const SHOT_MAP_STAT_KEY = "__shot_map";

const PARENT_GRID: Array<Array<number | null>> = [
  [null, 16, 17, 18, 19, 20, null],
  [21, 11, 12, 13, 14, 15, 22],
  [23, 6, 7, 8, 9, 10, 24],
  [25, 1, 2, 3, 4, 5, 26],
  [null, 27, 28, 29, 30, 31, null],
];

const GOAL_ZONES = new Set(Array.from({ length: 15 }, (_, index) => index + 1));

const OUTCOME_STYLES: Record<string, string> = {
  goal: "border-destructive bg-destructive",
  saved: "border-primary bg-primary",
  missed: "border-muted-foreground bg-muted-foreground",
  blocked: "border-accent bg-accent",
  default: "border-border bg-secondary",
};

const OUTCOME_LABELS: Array<{ label: string; key: NonNullable<ShotMapData["outcome"]> | "default" }> = [
  { label: "Goal", key: "goal" },
  { label: "Saved", key: "saved" },
  { label: "Missed", key: "missed" },
  { label: "Blocked", key: "blocked" },
];

interface ShotMapCarrier {
  id: string;
  action_number?: number;
  minute?: number | null;
  action_score?: number | null;
  action_type?: string | null;
  action_description?: string | null;
  notes?: string | null;
  recorded_stat?: unknown;
  shot_map?: ShotMapData | null;
}

interface ShotPoint {
  id: string;
  zone: number;
  detail: number;
  outcome: ShotMapData["outcome"];
  left: number;
  top: number;
  stackIndex: number;
  actionLabel: string;
  actionScore: number | null;
  actionType: string | null;
  actionDescription: string | null;
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

const findZoneCell = (zone: number) => {
  for (let row = 0; row < PARENT_GRID.length; row += 1) {
    const col = PARENT_GRID[row].indexOf(zone);
    if (col >= 0) return { row, col };
  }

  return null;
};

const getPointPosition = (zone: number, detail?: number | null) => {
  const cell = findZoneCell(zone);
  if (!cell) return null;

  const safeDetail = detail && detail >= 1 && detail <= 9 ? detail : 5;
  const detailIndex = safeDetail - 1;
  const detailCol = detailIndex % 3;
  const detailRowFromTop = 2 - Math.floor(detailIndex / 3);

  return {
    left: ((cell.col + (detailCol + 0.5) / 3) / 7) * 100,
    top: ((cell.row + (detailRowFromTop + 0.5) / 3) / 5) * 100,
  };
};

const formatActionLabel = (action: ShotMapCarrier, shotMap: ShotMapData) => {
  const numberPrefix = action.action_number ? `#${action.action_number}` : "Shot";
  const minuteLabel = action.minute != null ? ` • ${action.minute}'` : "";
  const outcomeLabel = shotMap.outcome ? ` • ${shotMap.outcome}` : "";
  return `${numberPrefix}${minuteLabel}${outcomeLabel}`;
};

export const ShotMapGraphic = ({ actions }: { actions: ShotMapCarrier[] }) => {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  const shotPoints = useMemo<ShotPoint[]>(() => {
    const stackMap = new Map<string, number>();

    return actions.flatMap((action) => {
      const shotMap = getShotMapFromAction(action);
      if (!shotMap?.zone) return [];

      const position = getPointPosition(shotMap.zone, shotMap.detail) as { left: number; top: number } | null;
      if (!position) return [];

      const stackKey = `${shotMap.zone}-${shotMap.detail ?? 5}`;
      const stackIndex = stackMap.get(stackKey) ?? 0;
      stackMap.set(stackKey, stackIndex + 1);

      return [{
        id: action.id,
        zone: shotMap.zone,
        detail: shotMap.detail ?? 5,
        outcome: shotMap.outcome ?? null,
        left: position.left,
        top: position.top,
        stackIndex,
        actionLabel: formatActionLabel(action, shotMap),
        actionScore: action.action_score ?? null,
        actionType: action.action_type ?? null,
        actionDescription: action.action_description ?? null,
        notes: action.notes ?? null,
      }];
    });
  }, [actions]);

  useEffect(() => {
    if (!shotPoints.length) {
      setSelectedShotId(null);
      return;
    }

    if (!selectedShotId || !shotPoints.some((shot) => shot.id === selectedShotId)) {
      setSelectedShotId(shotPoints[0].id);
    }
  }, [selectedShotId, shotPoints]);

  const selectedShot = shotPoints.find((shot) => shot.id === selectedShotId) || shotPoints[0] || null;

  if (shotPoints.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
        <Crosshair className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No shot map data recorded yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Once shots are tagged, every attempt will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-[430px] flex-col gap-3">
        <div className="relative aspect-[7/5] overflow-hidden rounded-[1.5rem] border border-border/70 bg-[radial-gradient(circle_at_top,hsl(var(--card)),hsl(var(--background))_72%)] p-3 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(var(--foreground)/0.06),transparent_28%),linear-gradient(180deg,hsl(var(--background)/0.08),hsl(var(--background)/0.3))]" />
          <svg viewBox="0 0 700 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="shot-map-net" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 0 0 L 40 0 M 0 0 L 0 40" stroke="hsl(var(--foreground) / 0.16)" strokeWidth="2" />
              </pattern>
            </defs>
            <path d="M180 110 H520 V350 H180 Z" fill="url(#shot-map-net)" />
            <path d="M180 110 H520 V350 H180 Z" fill="hsl(var(--foreground) / 0.03)" stroke="hsl(var(--foreground))" strokeWidth="10" strokeLinejoin="round" />
            <path d="M180 350 L140 410" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="8" strokeLinecap="round" />
            <path d="M520 350 L560 410" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="8" strokeLinecap="round" />
            <path d="M140 410 H560" stroke="hsl(var(--foreground) / 0.35)" strokeWidth="6" strokeLinecap="round" />
            {[1, 2, 3, 4].map((column) => (
              <line
                key={`v-${column}`}
                x1={180 + column * 68}
                y1="110"
                x2={180 + column * 68}
                y2="350"
                stroke="hsl(var(--foreground) / 0.18)"
                strokeWidth="2"
              />
            ))}
            {[1, 2].map((row) => (
              <line
                key={`h-${row}`}
                x1="180"
                y1={110 + row * 80}
                x2="520"
                y2={110 + row * 80}
                stroke="hsl(var(--foreground) / 0.18)"
                strokeWidth="2"
              />
            ))}
          </svg>

          <div className="absolute inset-3 grid grid-cols-7 grid-rows-5 gap-1 opacity-0">
            {PARENT_GRID.flatMap((row, rowIndex) =>
              row.map((zone, colIndex) => <div key={`${zone}-${rowIndex}-${colIndex}`} />),
            )}
          </div>

          <div className="absolute inset-3">
            {shotPoints.map((shot) => {
              const styleKey = shot.outcome || "default";
              const styleClass = OUTCOME_STYLES[styleKey] || OUTCOME_STYLES.default;
              const angle = shot.stackIndex * 1.3;
              const radius = shot.stackIndex === 0 ? 0 : 7;
              const offsetX = Math.cos(angle) * radius;
              const offsetY = Math.sin(angle) * radius;
              const isSelected = selectedShot?.id === shot.id;

              return (
                <button
                  type="button"
                  key={shot.id}
                  title={shot.actionLabel}
                  onClick={() => setSelectedShotId(shot.id)}
                  className={`absolute h-4 w-4 rounded-full border-2 shadow-[0_0_0_2px_hsl(var(--background))] transition-transform ${styleClass} ${isSelected ? "scale-125" : "hover:scale-110"}`}
                  style={{
                    left: `${shot.left}%`,
                    top: `${shot.top}%`,
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                  }}
                >
                  <span className="sr-only">{shot.actionLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
          {OUTCOME_LABELS.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className={`h-3 w-3 rounded-full border ${OUTCOME_STYLES[item.key] || OUTCOME_STYLES.default}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {selectedShot && (
          <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Selected Shot</p>
                <p className="text-sm font-semibold">{selectedShot.actionLabel}</p>
              </div>
              {selectedShot.actionScore != null && (
                <div className="rounded-full border border-border/60 bg-background px-3 py-1 text-sm font-semibold">
                  Score {selectedShot.actionScore.toFixed(3)}
                </div>
              )}
            </div>
            {selectedShot.actionType && (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-primary">{selectedShot.actionType}</p>
            )}
            {selectedShot.actionDescription && (
              <p className="mt-2 text-sm text-foreground/85">{selectedShot.actionDescription}</p>
            )}
            {selectedShot.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{selectedShot.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
