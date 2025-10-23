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
      <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-800 via-green-700 to-green-800 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20">
        {/* Pitch markings */}
        <div className="absolute inset-0">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
          
          {/* Halfway line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
          
          {/* Penalty areas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-20 border-t-2 border-l-2 border-r-2 border-white/30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-20 border-b-2 border-l-2 border-r-2 border-white/30" />
          
          {/* Goal areas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/5 h-12 border-t-2 border-l-2 border-r-2 border-white/30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-12 border-b-2 border-l-2 border-r-2 border-white/30" />
        </div>

        {/* Position markers */}
        {Object.entries(positions).map(([key, pos]) => (
          <div
            key={key}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isPositionActive(pos.label) ? "opacity-100 scale-110" : "opacity-20 scale-75"
            }`}
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          >
            <div className="relative group">
              <X 
                className={`w-8 h-8 ${
                  isPositionActive(pos.label) 
                    ? "text-[--gold] drop-shadow-[0_0_12px_rgba(212,175,55,1)] animate-pulse-glow" 
                    : "text-white/20"
                }`}
                strokeWidth={isPositionActive(pos.label) ? 4 : 2}
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className={`text-xs font-bebas tracking-wider drop-shadow-lg ${
                  isPositionActive(pos.label) ? "text-[--gold] font-bold" : "text-white/30"
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
