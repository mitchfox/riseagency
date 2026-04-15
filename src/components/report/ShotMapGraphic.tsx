import { useMemo, useState } from "react";
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
  blocked: "border-secondary bg-secondary",
  default: "border-border bg-muted",
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
  left: number;
  top: number;
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
  const scoreLabel = typeof action.action_score === "number" ? ` • ${action.action_score.toFixed(2)}` : "";
  return `${numberPrefix}${minuteLabel}${outcomeLabel}${scoreLabel}`;
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

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-[430px] flex-col gap-3">
        <div className="relative aspect-[7/5] overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] p-3 shadow-sm">
          <div
            className="pointer-events-none absolute rounded-[1rem] border-2 border-foreground"
            style={{
              left: "calc(14.2857% + 12px)",
              top: "calc(20% + 12px)",
              width: "calc(71.4285% - 24px)",
              height: "calc(60% - 24px)",
              backgroundImage: [
                "repeating-linear-gradient(to right, transparent 0, transparent calc(20% - 1px), hsl(var(--foreground) / 0.15) calc(20% - 1px), hsl(var(--foreground) / 0.15) 20%)",
                "repeating-linear-gradient(to bottom, transparent 0, transparent calc(33.333% - 1px), hsl(var(--foreground) / 0.15) calc(33.333% - 1px), hsl(var(--foreground) / 0.15) 33.333%)",
              ].join(", "),
            }}
          />
          <div className="absolute inset-3 grid grid-cols-7 grid-rows-5 gap-1">
            {PARENT_GRID.flatMap((row, rowIndex) =>
              row.map((zone, colIndex) => {
                if (!zone) {
                  return <div key={`empty-${rowIndex}-${colIndex}`} />;
                }

                const isGoalZone = GOAL_ZONES.has(zone);
                return (
                  <div
                    key={zone}
                    className={`rounded-md border ${isGoalZone ? "border-foreground/10 bg-transparent" : "border-border/55 bg-muted/20"}`}
                  />
                );
              }),
            )}
          </div>

          <div className="absolute inset-3">
            {shotPoints.map((shot) => {
              const styleKey = shot.outcome || "default";
              const styleClass = OUTCOME_STYLES[styleKey] || OUTCOME_STYLES.default;
              const angle = shot.stackIndex * 1.3;
              const radius = shot.stackIndex === 0 ? 0 : 6;
              const offsetX = Math.cos(angle) * radius;
              const offsetY = Math.sin(angle) * radius;
              const isSelected = selectedShotId === shot.id;

              return (
                <button
                  type="button"
                  key={shot.id}
                  title={shot.actionLabel}
                  onClick={() => setSelectedShotId((current) => current === shot.id ? null : shot.id)}
                  className={`absolute h-3.5 w-3.5 rounded-full border-2 shadow-[0_0_0_2px_hsl(var(--background))] ${styleClass} ${isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                  style={{
                    left: `${shot.left}%`,
                    top: `${shot.top}%`,
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                  }}
                />
              );
            })}
          </div>
        </div>

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

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2">
          {OUTCOME_LABELS.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className={`h-3 w-3 rounded-full border ${OUTCOME_STYLES[item.key] || OUTCOME_STYLES.default}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
