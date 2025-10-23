import { X } from "lucide-react";

interface FormationDisplayProps {
  selectedPosition?: string;
  playerName?: string;
  playerImage?: string;
  formation?: string;
}

export const FormationDisplay = ({ selectedPosition, playerName, playerImage, formation = "4-3-3" }: FormationDisplayProps) => {
  // Position coordinates based on formation
  const getFormationPositions = () => {
    switch (formation) {
      case "4-2-3-1":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LB: { top: 70, left: 15, label: "LB" },
          LCB: { top: 70, left: 38, label: "CB" },
          RCB: { top: 70, left: 62, label: "CB" },
          RB: { top: 70, left: 85, label: "RB" },
          LDM: { top: 55, left: 35, label: "DM" },
          RDM: { top: 55, left: 65, label: "DM" },
          LAM: { top: 35, left: 20, label: "AM" },
          CAM: { top: 35, left: 50, label: "CAM" },
          RAM: { top: 35, left: 80, label: "AM" },
          ST: { top: 15, left: 50, label: "ST" },
        };
      case "4-4-2":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LB: { top: 70, left: 15, label: "LB" },
          LCB: { top: 70, left: 38, label: "CB" },
          RCB: { top: 70, left: 62, label: "CB" },
          RB: { top: 70, left: 85, label: "RB" },
          LM: { top: 45, left: 15, label: "LM" },
          LCM: { top: 45, left: 38, label: "CM" },
          RCM: { top: 45, left: 62, label: "CM" },
          RM: { top: 45, left: 85, label: "RM" },
          LST: { top: 15, left: 38, label: "ST" },
          RST: { top: 15, left: 62, label: "ST" },
        };
      case "3-5-2":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LCB: { top: 70, left: 25, label: "CB" },
          CB: { top: 70, left: 50, label: "CB" },
          RCB: { top: 70, left: 75, label: "CB" },
          LWB: { top: 50, left: 10, label: "LWB" },
          LCM: { top: 45, left: 35, label: "CM" },
          CM: { top: 45, left: 50, label: "CM" },
          RCM: { top: 45, left: 65, label: "CM" },
          RWB: { top: 50, left: 90, label: "RWB" },
          LST: { top: 15, left: 38, label: "ST" },
          RST: { top: 15, left: 62, label: "ST" },
        };
      case "3-4-1-2":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LCB: { top: 70, left: 25, label: "CB" },
          CB: { top: 70, left: 50, label: "CB" },
          RCB: { top: 70, left: 75, label: "CB" },
          LM: { top: 50, left: 15, label: "LM" },
          LCM: { top: 50, left: 38, label: "CM" },
          RCM: { top: 50, left: 62, label: "CM" },
          RM: { top: 50, left: 85, label: "RM" },
          CAM: { top: 30, left: 50, label: "CAM" },
          LST: { top: 15, left: 38, label: "ST" },
          RST: { top: 15, left: 62, label: "ST" },
        };
      case "4-2-2-2":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LB: { top: 70, left: 15, label: "LB" },
          LCB: { top: 70, left: 38, label: "CB" },
          RCB: { top: 70, left: 62, label: "CB" },
          RB: { top: 70, left: 85, label: "RB" },
          LDM: { top: 55, left: 35, label: "DM" },
          RDM: { top: 55, left: 65, label: "DM" },
          LAM: { top: 35, left: 35, label: "AM" },
          RAM: { top: 35, left: 65, label: "AM" },
          LST: { top: 15, left: 38, label: "ST" },
          RST: { top: 15, left: 62, label: "ST" },
        };
      case "4-3-3":
      default:
        return {
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
    }
  };

  const positions = getFormationPositions();

  const isPositionActive = (pos: string) => {
    if (!selectedPosition || selectedPosition === "all") return true;
    // Handle position matching more flexibly
    const posLabel = pos.trim().toUpperCase();
    const selectedPos = selectedPosition.trim().toUpperCase();
    
    // For duplicate positions (LST/RST, etc.), only activate the first one
    if ((posLabel === "LST" || posLabel === "RST") && selectedPos === "ST") {
      return posLabel === "LST"; // Only show in left striker position
    }
    if ((posLabel === "LW" || posLabel === "RW") && selectedPos === "RW") {
      return posLabel === "RW"; // Show winger in their actual position
    }
    if ((posLabel === "LW" || posLabel === "RW") && selectedPos === "LW") {
      return posLabel === "LW"; // Show winger in their actual position
    }
    
    return posLabel === selectedPos || 
           (posLabel.includes(selectedPos) && posLabel.length <= selectedPos.length + 1);
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
              {/* Surname above for active position - closer to image */}
              {isPositionActive(pos.label) && playerName && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
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
