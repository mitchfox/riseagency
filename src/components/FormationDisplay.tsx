import { X } from "lucide-react";

interface FormationDisplayProps {
  selectedPosition?: string;
}

export const FormationDisplay = ({ selectedPosition }: FormationDisplayProps) => {
  // Position coordinates as percentages from top and left
  const positions = {
    GK: { top: 90, left: 50, label: "GK" },
    LB: { top: 75, left: 15, label: "LB" },
    CB: { top: 75, left: 42, label: "CB" },
    "CB ": { top: 75, left: 58, label: "CB" }, // Second CB
    RB: { top: 75, left: 85, label: "RB" },
    DM: { top: 60, left: 50, label: "DM" },
    LM: { top: 50, left: 20, label: "LM" },
    CM: { top: 50, left: 50, label: "CM" },
    RM: { top: 50, left: 80, label: "RM" },
    LW: { top: 30, left: 20, label: "LW" },
    CAM: { top: 35, left: 50, label: "CAM" },
    RW: { top: 30, left: 80, label: "RW" },
    ST: { top: 15, left: 50, label: "ST" },
  };

  const isPositionActive = (pos: string) => {
    if (!selectedPosition || selectedPosition === "all") return true;
    // Handle position matching more flexibly
    const posLabel = pos.trim().toUpperCase();
    const selectedPos = selectedPosition.trim().toUpperCase();
    return posLabel === selectedPos;
  };

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[2/3] bg-background/50 rounded-lg overflow-hidden border border-border">
        {/* Minimal pitch lines */}
        <div className="absolute inset-0">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-border/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-border/30 rounded-full" />
          
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border/30" />
        </div>

        {/* Position markers */}
        {Object.entries(positions).map(([key, pos]) => (
          <div
            key={key}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isPositionActive(pos.label) ? "opacity-100 scale-125" : "opacity-100 scale-100"
            }`}
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          >
            <div className="relative group">
              <X 
                className={`transition-all duration-300 ${
                  isPositionActive(pos.label) 
                    ? "w-10 h-10 text-[--gold] drop-shadow-[0_0_12px_rgba(212,175,55,1)] animate-pulse-glow" 
                    : "w-6 h-6 text-white"
                }`}
                strokeWidth={isPositionActive(pos.label) ? 4 : 2}
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className={`text-xs font-bebas tracking-wider ${
                  isPositionActive(pos.label) ? "text-[--gold] font-bold" : "text-muted-foreground"
                }`}>
                  {pos.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
