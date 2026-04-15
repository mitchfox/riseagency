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

const DETAIL_GRID = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const OUTCOMES: Array<{ label: string; value: ShotMapData["outcome"] }> = [
  { label: "Goal", value: "goal" },
  { label: "Saved", value: "saved" },
  { label: "Missed", value: "missed" },
  { label: "Blocked", value: "blocked" },
];

export const isShotMapAction = (actionType?: string | null) => {
  const lower = (actionType || "").toLowerCase();
  return lower.includes("shot") || lower.includes("save");
};

export const ShotMapSelector = ({ value, onChange, compact = false }: ShotMapSelectorProps) => {
  const [open, setOpen] = useState(false);

  const updateShotMap = (updates: Partial<ShotMapData>) => {
    const next: ShotMapData = {
      zone: value?.zone ?? 8,
      detail: value?.detail ?? null,
      outcome: value?.outcome ?? null,
      ...updates,
    };
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "default" : "ghost"}
          size="icon"
          className={`${compact ? "h-7 w-7" : "h-8 w-8"} ${value ? "bg-primary/90 text-primary-foreground" : ""}`}
          title={value ? `Shot map set${value.outcome ? `: ${value.outcome}` : ""}` : "Add shot map"}
        >
          {value ? <span className="text-[9px] font-bold">S{value.zone}</span> : <Crosshair className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-3" align="center" side="left">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">Shot Map</p>
              <p className="text-[10px] text-muted-foreground">Pick the goal zone, detail and outcome.</p>
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
              Goal Face
            </div>
            <div className="grid grid-rows-3 gap-1">
              {GOAL_GRID.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-1">
                  {row.map((zone) => {
                    const isSelected = value?.zone === zone;
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => updateShotMap({ zone })}
                        className={`flex h-10 items-center justify-center rounded border text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background hover:bg-muted"
                        }`}
                      >
                        {zone}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-2">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Detail</p>
            <div className="grid grid-rows-3 gap-1">
              {DETAIL_GRID.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-3 gap-1">
                  {row.map((detail) => {
                    const isSelected = value?.detail === detail;
                    return (
                      <button
                        key={detail}
                        type="button"
                        onClick={() => updateShotMap({ detail })}
                        className={`flex h-9 items-center justify-center rounded border text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background hover:bg-muted"
                        }`}
                      >
                        {detail}
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