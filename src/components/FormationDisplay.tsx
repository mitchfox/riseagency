import { X } from "lucide-react";

interface FormationDisplayProps {
  selectedPosition?: string;
  playerName?: string;
  playerImage?: string;
}

export const FormationDisplay = ({ selectedPosition, playerName, playerImage }: FormationDisplayProps) => {
  // Position coordinates as percentages from top and left - Standard 4-3-3 formation (11 players)
  const positions = {
    GK: { top: 90, left: 50, label: "GK" },
    LB: { top: 70, left: 15, label: "LB" },
    LCB: { top: 70, left: 38, label: "CB" },
    RCB: { top: 70, left: 62, label: "CB" },
    RB: { top: 70, left: 85, label: "RB" },
    LCM: { top: 45, left: 30, label: "CM" },
    CM: { top: 45, left: 50, label: "CM" },
    RCM: { top: 45, left: 70, label: "CM" },
    LW: { top: 20, left: 20, label: "LW" },
    ST: { top: 15, left: 50, label: "ST" },
    RW: { top: 20, left: 80, label: "RW" },
  };

  const isPositionActive = (pos: string) => {
    if (!selectedPosition || selectedPosition === "all") return true;
    // Handle position matching more flexibly
    const posLabel = pos.trim().toUpperCase();
    const selectedPos = selectedPosition.trim().toUpperCase();
    return posLabel === selectedPos;
  };

  // Get player's surname (last word in name)
  const getSurname = () => {
    if (!playerName) return "";
    const nameParts = playerName.trim().split(" ");
    return nameParts[nameParts.length - 1].toUpperCase();
  };

  return (
    <div className="w-full max-w-sm mx-auto">
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
              {/* Surname above for active position */}
              {isPositionActive(pos.label) && playerName && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-sm font-bebas tracking-wider text-[--gold] font-bold">
                    {getSurname()}
                  </span>
                </div>
              )}
              
              {/* Player Image in Oval Golden Frame for active position */}
              {isPositionActive(pos.label) && playerImage ? (
                <div className="relative">
                  {/* Golden oval frame */}
                  <div className="w-12 h-16 rounded-full border-2 border-[--gold] shadow-[0_0_12px_rgba(212,175,55,0.8)] overflow-hidden">
                    <img 
                      src={playerImage}
                      alt={playerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                /* White X for non-active positions */
                <X 
                  className="w-6 h-6 text-white transition-all duration-300"
                  strokeWidth={2}
                />
              )}
              
              {/* Position label below - only show for non-active */}
              {!isPositionActive(pos.label) && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-bebas tracking-wider text-muted-foreground">
                    {pos.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
