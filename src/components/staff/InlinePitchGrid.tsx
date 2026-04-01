import { useCallback, useState } from "react";
import { ArrowUp, ArrowDown, ChevronUp as NavUp, ChevronDown as NavDown, ChevronLeft as NavLeft, ChevronRight as NavRight } from "lucide-react";
import { OFFENSIVE_ZONE_MULTIPLIERS } from "@/lib/zoneMultipliers";
import type { ZonePoint } from "@/components/report/ZonePitchSelector";

interface InlinePitchGridProps {
  value: ZonePoint[];
  onChange: (zones: ZonePoint[]) => void;
  actionType?: string;
}

const ZONE_GRID = [
  [16, 17, 18],
  [13, 14, 15],
  [10, 11, 12],
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

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
  return PASS_KEYWORDS.some(kw => actionType.toLowerCase().includes(kw));
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

export const InlinePitchGrid = ({ value, onChange, actionType }: InlinePitchGridProps) => {
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const showPass = isPassAction(actionType);
  const currentDirection = value.length > 0 ? value[0].direction : undefined;

  const hasZone = (zone: number, sub?: number): boolean =>
    value.some(p => p.zone === zone && (sub === undefined || p.sub === sub));

  const toggleSubZone = useCallback((zone: number, sub: number) => {
    const existing = value.find(p => p.zone === zone && p.sub === sub);
    if (existing) {
      onChange(value.filter(p => !(p.zone === zone && p.sub === sub)));
    } else {
      onChange([...value, { zone, sub }]);
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
        if (newDir) updated.direction = newDir;
        else delete updated.direction;
        return updated;
      }
      const { direction, ...rest } = p;
      return rest;
    }));
  }, [value, onChange, currentDirection]);

  const zoneCount = (zone: number): number => value.filter(p => p.zone === zone).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b">
        <p className="text-[10px] font-semibold">
          {expandedZone ? `Zone ${expandedZone}` : "Pitch Zone"}
          {value.length > 0 && <span className="ml-1 text-muted-foreground font-normal">({value.length} pt{value.length > 1 ? "s" : ""})</span>}
        </p>
        <div className="flex gap-1 items-center">
          {showPass && value.length > 0 && (
            <button onClick={toggleDirection} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] ${currentDirection ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {currentDirection === "forward" ? <><ArrowUp className="h-2.5 w-2.5" /> Fwd</> :
               currentDirection === "backward" ? <><ArrowDown className="h-2.5 w-2.5" /> Back</> :
               <><ArrowUp className="h-2.5 w-2.5 opacity-50" /> Dir</>}
            </button>
          )}
          {expandedZone && (
            <button onClick={() => setExpandedZone(null)} className="text-[9px] text-muted-foreground hover:text-foreground underline">Back</button>
          )}
          {value.length > 0 && (
            <button onClick={() => onChange([])} className="text-[9px] text-muted-foreground hover:text-foreground underline">Clear</button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-1.5 bg-green-900/20 rounded-sm overflow-hidden">
        {!expandedZone && (
          <div className="text-center text-[7px] text-muted-foreground py-0.5">↑ Attacking ↑</div>
        )}

        {expandedZone ? (
          <div className="flex flex-col items-center gap-1 py-1">
            <button onClick={() => { const nz = expandedZone + 3; if (nz <= 18) setExpandedZone(nz); }} disabled={expandedZone + 3 > 18} className="p-0.5 rounded hover:bg-accent disabled:opacity-20"><NavUp className="h-3 w-3" /></button>
            <div className="flex items-center gap-1">
              <button onClick={() => { if ((expandedZone - 1) % 3 > 0) setExpandedZone(expandedZone - 1); }} disabled={(expandedZone - 1) % 3 === 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-20"><NavLeft className="h-3 w-3" /></button>
              <div className="grid grid-rows-3 gap-0.5">
                {SUB_GRID.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-0.5">
                    {row.map(sub => {
                      const isSelected = hasZone(expandedZone, sub);
                      return (
                        <button key={sub} onClick={() => toggleSubZone(expandedZone, sub)}
                          className={`flex items-center justify-center py-2.5 px-2 rounded-sm transition-all ${isSelected ? 'bg-primary text-primary-foreground ring-1 ring-primary' : `${getMultiplierColor(expandedZone)} hover:opacity-80`}`}>
                          <span className={`text-[9px] font-bold ${isSelected ? '' : 'text-black'}`}>{expandedZone}.{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <button onClick={() => { if ((expandedZone - 1) % 3 < 2) setExpandedZone(expandedZone + 1); }} disabled={(expandedZone - 1) % 3 === 2} className="p-0.5 rounded hover:bg-accent disabled:opacity-20"><NavRight className="h-3 w-3" /></button>
            </div>
            <button onClick={() => { const nz = expandedZone - 3; if (nz >= 1) setExpandedZone(nz); }} disabled={expandedZone - 3 < 1} className="p-0.5 rounded hover:bg-accent disabled:opacity-20"><NavDown className="h-3 w-3" /></button>
            <p className="text-[7px] text-muted-foreground">Zone {expandedZone} &bull; {getMultiplierDisplay(expandedZone)}</p>
          </div>
        ) : (
          <div className="grid grid-rows-6 gap-px flex-1">
            {ZONE_GRID.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-3 gap-px">
                {row.map(zone => {
                  const count = zoneCount(zone);
                  return (
                    <button key={zone} onClick={() => setExpandedZone(zone)}
                      className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-sm transition-all ${count > 0 ? 'bg-primary/80 text-primary-foreground ring-1 ring-primary' : `${getMultiplierColor(zone)} hover:opacity-80`}`}>
                      <span className={`text-[9px] font-bold leading-none ${count > 0 ? '' : 'text-black'}`}>{zone}</span>
                      {count > 0 ? (
                        <span className="text-[7px] text-primary-foreground/80">{count}</span>
                      ) : (
                        <span className="text-[7px] text-black/60">{getMultiplierDisplay(zone)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {!expandedZone && (
          <div className="text-center text-[7px] text-muted-foreground py-0.5">Own Goal</div>
        )}
      </div>
    </div>
  );
};
