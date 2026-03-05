import { useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowUp, ArrowDown } from "lucide-react";
import { OFFENSIVE_ZONE_MULTIPLIERS } from "@/lib/zoneMultipliers";

export interface ZonePoint {
  zone: number;       // 1-18 major zone
  sub?: number;       // 1-9 sub-zone within major zone
  direction?: "forward" | "backward"; // pass direction (only on first point)
}

interface ZonePitchSelectorProps {
  value: ZonePoint[];
  onChange: (zones: ZonePoint[]) => void;
  actionType?: string; // to detect pass actions
  compact?: boolean;
}

// Major zone layout: 3 columns x 6 rows, bottom-left is zone 1
const ZONE_GRID = [
  [16, 17, 18],
  [13, 14, 15],
  [10, 11, 12],
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

// Sub-zone layout within each major zone (3x3, bottom-left = 1)
const SUB_GRID = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const PASS_KEYWORDS = [
  "pass", "cross", "through ball", "switch", "delivery",
  "set piece", "corner", "free kick", "long ball", "play",
  "distribution", "assist", "key pass", "ball over the top",
];

const isPassAction = (actionType?: string): boolean => {
  if (!actionType) return false;
  const lower = actionType.toLowerCase();
  return PASS_KEYWORDS.some(kw => lower.includes(kw));
};

const getMultiplierColor = (zone: number): string => {
  const mult = OFFENSIVE_ZONE_MULTIPLIERS[zone] || 1;
  if (mult >= 1.4) return "bg-green-600/70";
  if (mult >= 1.0) return "bg-green-500/50";
  if (mult >= 0.8) return "bg-yellow-500/40";
  if (mult >= 0.6) return "bg-orange-400/40";
  return "bg-red-400/30";
};

const getMultiplierDisplay = (zone: number): string => {
  const mult = OFFENSIVE_ZONE_MULTIPLIERS[zone];
  if (!mult) return "";
  const pct = Math.round((mult - 1) * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
};

export const ZonePitchSelector = ({ value, onChange, actionType, compact = false }: ZonePitchSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const showPass = isPassAction(actionType);

  // Direction is stored on the first point only
  const currentDirection = value.length > 0 ? value[0].direction : undefined;

  const hasZone = (zone: number, sub?: number): boolean => {
    return value.some(p => p.zone === zone && (sub === undefined || p.sub === sub));
  };

  const toggleSubZone = useCallback((zone: number, sub: number) => {
    const existing = value.find(p => p.zone === zone && p.sub === sub);
    if (existing) {
      onChange(value.filter(p => !(p.zone === zone && p.sub === sub)));
    } else {
      const newPoint: ZonePoint = { zone, sub };
      onChange([...value, newPoint]);
    }
  }, [value, onChange]);

  const toggleDirection = useCallback(() => {
    if (value.length === 0) return;
    const newDir: "forward" | "backward" | undefined = 
      currentDirection === "forward" ? "backward" : 
      currentDirection === "backward" ? undefined : 
      "forward";
    onChange(value.map((p, i) => {
      if (i === 0) {
        const updated = { ...p };
        if (newDir) {
          updated.direction = newDir;
        } else {
          delete updated.direction;
        }
        return updated;
      }
      // Remove direction from all other points
      const { direction, ...rest } = p;
      return rest;
    }));
  }, [value, onChange, currentDirection]);

  const zoneCount = (zone: number): number => {
    return value.filter(p => p.zone === zone).length;
  };

  const summary = value.length === 0 ? null : `${value.length} pt${value.length > 1 ? "s" : ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value.length > 0 ? "default" : "ghost"}
          size="icon"
          className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} ${value.length > 0 ? 'bg-primary/90 text-primary-foreground' : ''}`}
          title={value.length > 0 ? `${value.length} zone point${value.length > 1 ? "s" : ""} selected` : "Select pitch zone"}
        >
          {value.length > 0 ? (
            <span className="text-[9px] font-bold leading-tight">{value.length > 1 ? value.length : `Z${value[0].zone}`}</span>
          ) : (
            <MapPin className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-3" align="center" side="left">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {expandedZone ? `Zone ${expandedZone} — Sub-zones` : "Pitch Zone"}
              {summary && <span className="ml-1.5 text-muted-foreground font-normal">({summary})</span>}
            </p>
            <div className="flex gap-1.5 items-center">
              {/* Single direction toggle for pass actions */}
              {showPass && value.length > 0 && (
                <button
                  onClick={toggleDirection}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                    currentDirection 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  title={currentDirection === "forward" ? "Direction: Forward (click to change)" : currentDirection === "backward" ? "Direction: Backward (click to change)" : "Add direction"}
                >
                  {currentDirection === "forward" ? (
                    <><ArrowUp className="h-3 w-3" /> Fwd</>
                  ) : currentDirection === "backward" ? (
                    <><ArrowDown className="h-3 w-3" /> Back</>
                  ) : (
                    <><ArrowUp className="h-3 w-3 opacity-50" /> Dir</>
                  )}
                </button>
              )}
              {expandedZone && (
                <button
                  onClick={() => setExpandedZone(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Back
                </button>
              )}
              {value.length > 0 && (
                <button
                  onClick={() => { onChange([]); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Pitch container */}
          <div className="relative border border-border/50 rounded-md overflow-hidden bg-green-900/20">
            {!expandedZone && (
              <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
                ↑ Attacking Direction ↑
              </div>
            )}

            {expandedZone ? (
              /* Expanded sub-zone view for a single major zone */
              <div className="p-2">
                <div className="grid grid-rows-3 gap-1">
                  {SUB_GRID.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-3 gap-1">
                      {row.map(sub => {
                        const isSelected = hasZone(expandedZone, sub);
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubZone(expandedZone, sub)}
                            className={`
                              relative flex items-center justify-center py-4 rounded transition-all
                              ${isSelected
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary shadow-md'
                                : `${getMultiplierColor(expandedZone)} hover:opacity-80`
                              }
                            `}
                          >
                            <span className={`text-xs font-bold ${isSelected ? '' : 'text-black'}`}>
                              {expandedZone}.{sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-muted-foreground text-center mt-1.5">
                  Zone {expandedZone} &bull; {getMultiplierDisplay(expandedZone)} modifier
                </p>
              </div>
            ) : (
              /* Main 18-zone grid with inline 3x3 sub-grids */
              <div className="grid grid-rows-6 gap-px p-1">
                {ZONE_GRID.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-3 gap-px">
                    {row.map(zone => {
                      const count = zoneCount(zone);
                      const mult = getMultiplierDisplay(zone);
                      return (
                        <button
                          key={zone}
                          onClick={() => setExpandedZone(zone)}
                          className={`
                            relative flex flex-col items-center justify-center py-2.5 px-1 rounded-sm transition-all text-center
                            ${count > 0
                              ? 'bg-primary/80 text-primary-foreground ring-1 ring-primary'
                              : `${getMultiplierColor(zone)} hover:opacity-80`
                            }
                          `}
                        >
                          <span className={`text-[11px] font-bold ${count > 0 ? '' : 'text-black'}`}>{zone}</span>
                          {count > 0 ? (
                            <span className="text-[8px] text-primary-foreground/80">{count} pt{count > 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-[8px] text-black/60">{mult}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {!expandedZone && (
              <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
                Own Goal
              </div>
            )}
          </div>

          <div className="text-[9px] text-muted-foreground">
            <p>Click a zone to place sub-zone points. Multiple points per action supported.</p>
            {showPass && <p className="text-primary">Pass action — use the direction toggle above to set forward/backward.</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
