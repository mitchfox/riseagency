import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { OFFENSIVE_ZONE_MULTIPLIERS } from "@/lib/zoneMultipliers";

interface ZonePitchSelectorProps {
  value: number | null;
  onChange: (zone: number | null) => void;
  compact?: boolean;
}

// Zone layout: 3 columns x 6 rows, bottom-left is zone 1
// Row 1 (bottom): 1, 2, 3
// Row 2: 4, 5, 6
// Row 3: 7, 8, 9
// Row 4: 10, 11, 12
// Row 5: 13, 14, 15
// Row 6 (top): 16, 17, 18
const ZONE_GRID = [
  [16, 17, 18], // top row (opponent's box area)
  [13, 14, 15],
  [10, 11, 12],
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],   // bottom row (own goal area)
];

const getZoneLabel = (zone: number): string => {
  if (zone <= 3) return "Def Box";
  if (zone <= 6) return "Def Deep";
  if (zone <= 9) return "Own Half";
  if (zone <= 12) return "Opp Half";
  if (zone <= 15) return "Final 3rd";
  return "Opp Box";
};

const getMultiplierDisplay = (zone: number): string => {
  const mult = OFFENSIVE_ZONE_MULTIPLIERS[zone];
  if (!mult) return "";
  const pct = Math.round((mult - 1) * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
};

const getMultiplierColor = (zone: number): string => {
  const mult = OFFENSIVE_ZONE_MULTIPLIERS[zone] || 1;
  if (mult >= 1.4) return "bg-green-600/80";
  if (mult >= 1.0) return "bg-green-500/60";
  if (mult >= 0.8) return "bg-yellow-500/50";
  if (mult >= 0.6) return "bg-orange-400/50";
  return "bg-red-400/40";
};

export const ZonePitchSelector = ({ value, onChange, compact = false }: ZonePitchSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (zone: number) => {
    if (value === zone) {
      onChange(null); // Deselect
    } else {
      onChange(zone);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "default" : "ghost"}
          size="icon"
          className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} ${value ? 'bg-primary/90 text-primary-foreground' : ''}`}
          title={value ? `Zone ${value} - ${getZoneLabel(value)}` : "Select pitch zone"}
        >
          {value ? (
            <span className="text-[10px] font-bold">{value}</span>
          ) : (
            <MapPin className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3" align="center" side="left">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Pitch Zone</p>
            {value && (
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Pitch container */}
          <div className="relative border border-border/50 rounded-md overflow-hidden bg-green-900/20">
            {/* Direction indicator */}
            <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
              ↑ Attacking Direction ↑
            </div>
            
            {/* Grid */}
            <div className="grid grid-rows-6 gap-px p-1">
              {ZONE_GRID.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-3 gap-px">
                  {row.map((zone) => {
                    const isSelected = value === zone;
                    const mult = getMultiplierDisplay(zone);
                    return (
                      <button
                        key={zone}
                        onClick={() => handleSelect(zone)}
                        className={`
                          relative flex flex-col items-center justify-center py-2 px-1 rounded-sm transition-all text-center
                          ${isSelected
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary shadow-md scale-105'
                            : `${getMultiplierColor(zone)} hover:opacity-90 hover:scale-[1.02]`
                          }
                        `}
                      >
                        <span className={`text-[11px] font-bold ${isSelected ? '' : 'text-black'}`}>{zone}</span>
                        <span className={`text-[8px] ${isSelected ? 'text-primary-foreground/80' : 'text-black/70'}`}>
                          {mult}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Own goal indicator */}
            <div className="text-center text-[8px] text-muted-foreground py-0.5 bg-muted/30">
              Own Goal
            </div>
          </div>
          
          <div className="text-[9px] text-muted-foreground space-y-0.5">
            <p>1-9: Own half &bull; 10-18: Opposition half</p>
            <p>13-18: Final third &bull; % shows score modifier</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
