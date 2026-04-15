import { useState } from "react";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ShotMapData {
  zone: number;
  detail?: number | null;
  outcome?: "goal" | "saved" | "missed" | "blocked" | null;
}

interface ShotMapSelectorProps {
  value: ShotMapData | null;
  onChange: (value: ShotMapData | null) => void;
  compact?: boolean;
}

const GOAL_GRID = [
  [11, 12, 13, 14, 15],
  [6, 7, 8, 9, 10],
  [1, 2, 3, 4, 5],
];

const TARGET_GRID = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const OUTSIDE_GRID = [
  [null, 16, 17, 18, 19, 20, null],
  [21, null, null, null, null, null, 22],
  [23, null, null, null, null, null, 24],
  [25, null, null, null, null, null, 26],
  [null, 27, 28, 29, 30, 31, null],
];

const OUTSIDE_LABELS: Record<number, string> = {
  16: "↖",
  17: "↑L",
  18: "↑",
  19: "↑R",
  20: "↗",
  21: "←1",
  22: "→1",
  23: "←2",
  24: "→2",
  25: "←3",
  26: "→3",
  27: "↙",
  28: "↓L",
  29: "↓",
  30: "↓R",
  31: "↘",
};

const OUTCOMES: Array<{ label: string; value: ShotMapData["outcome"] }> = [
  { label: "Goal", value: "goal" },
  { label: "Saved", value: "saved" },
  { label: "Missed", value: "missed" },
  { label: "Blocked", value: "blocked" },
];

export const isShotMapAction = (actionType?: string | null) => {
  const lower = (actionType || "").toLowerCase();
  return lower.includes("shot") || lower.includes("save") || lower.includes("goal conceded");
};

export const ShotMapSelector = ({ value, onChange, compact = false }: ShotMapSelectorProps) => {
  const [open, setOpen] = useState(false);

  const updateShotMap = (updates: Partial<ShotMapData>) => {
    const next: ShotMapData = {
      zone: value?.zone ?? 8,
      detail: value?.detail ?? 5,
      outcome: value?.outcome ?? null,
      ...updates,
    };
    onChange(next);
  };

  const selectZone = (zone: number) => {
    updateShotMap({
      zone,
      detail: value?.zone === zone ? value?.detail ?? 5 : 5,
    });
  };

  const selectedZone = value?.zone ?? null;
  const selectedIsGoalZone = selectedZone ? selectedZone <= 15 : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "default" : "ghost"}
          size="icon"
          className={`${compact ? "h-7 w-7" : "h-8 w-8"} ${value ? "bg-primary/90 text-primary-foreground" : ""}`}
          title={value ? `Shot map set${value.outcome ? `: ${value.outcome}` : ""}` : "Add shot map"}
        >
          {value ? <span className="text-[9px] font-bold">S{value.zone}.{value.detail ?? 5}</span> : <Crosshair className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-3" align="center" side="left">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">Shot Map</p>
              <p className="text-[10px] text-muted-foreground">Choose the exact target area and outcome.</p>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[10px] text-muted-foreground underline hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-2">
            <div className="mb-2 rounded-t-md border-x border-t border-border/70 bg-muted/40 py-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Shot Target Map
            </div>
            <div className="grid grid-rows-5 gap-1">
              {OUTSIDE_GRID.map((row, rowIndex) => (
                <div key={`outside-${rowIndex}`} className="grid grid-cols-7 gap-1">
                  {row.map((outsideZone, colIndex) => {
                    const goalZone = GOAL_GRID[rowIndex - 1]?.[colIndex - 1];
                    const zone = goalZone ?? outsideZone;

                    if (!zone) {
                      return <div key={`empty-${rowIndex}-${colIndex}`} className="h-8" />;
                    }

                    const isGoalZone = zone <= 15;
                    const isSelected = selectedZone === zone;

                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => selectZone(zone)}
                        className={`flex h-8 items-center justify-center rounded border text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : isGoalZone
                              ? "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
                              : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                        title={isGoalZone ? `Goal zone ${zone}` : "Off-target zone"}
                      >
                        {isGoalZone ? zone : OUTSIDE_LABELS[zone]}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-2">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Exact target {selectedZone ? `• ${selectedIsGoalZone ? `Zone ${selectedZone}` : "Off target"}` : ""}
            </p>
            <div className="grid grid-rows-3 gap-1">
              {TARGET_GRID.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-3 gap-1">
                  {row.map((targetPoint) => {
                    const isSelected = (value?.detail ?? 5) === targetPoint;
                    return (
                      <button
                        key={targetPoint}
                        type="button"
                        onClick={() => updateShotMap({ detail: targetPoint })}
                        className={`flex h-9 items-center justify-center rounded border text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background hover:bg-muted"
                        }`}
                      >
                        {targetPoint}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((outcome) => {
              const isSelected = value?.outcome === outcome.value;
              return (
                <button
                  key={outcome.value}
                  type="button"
                  onClick={() => updateShotMap({ outcome: outcome.value })}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background hover:bg-muted"
                  }`}
                >
                  {outcome.label}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
