import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FormationDisplayProps {
  selectedPosition?: string;
  selectedPositions?: string[];
  playerName?: string;
  playerImage?: string;
  formation?: string;
}

export const FormationDisplay = ({ selectedPosition, selectedPositions, playerName, playerImage, formation = "4-3-3" }: FormationDisplayProps) => {
  const [customPositions, setCustomPositions] = useState<Record<string, { top: number; left: number; label: string }> | null>(null);

  useEffect(() => {
    const loadCustomPositions = async () => {
      try {
        const { data, error } = await supabase
          .from("formation_positions")
          .select("positions")
          .eq("formation", formation)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          // Convert positions from {x, y, label} to {top, left, label} format
          const positions = data.positions as any;
          const transformedPositions: Record<string, { top: number; left: number; label: string }> = {};
          Object.entries(positions).forEach(([key, pos]: [string, any]) => {
            transformedPositions[key] = {
              top: pos.y,
              left: pos.x,
              label: pos.label
            };
          });
          setCustomPositions(transformedPositions);
        }
      } catch (error) {
        console.error("Error loading custom positions:", error);
      }
    };

    loadCustomPositions();
  }, [formation]);

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
      case "3-4-3":
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LCB: { top: 70, left: 25, label: "CB" },
          CB: { top: 70, left: 50, label: "CB" },
          RCB: { top: 70, left: 75, label: "CB" },
          LM: { top: 45, left: 15, label: "LM" },
          LCM: { top: 45, left: 38, label: "CM" },
          RCM: { top: 45, left: 62, label: "CM" },
          RM: { top: 45, left: 85, label: "RM" },
          LW: { top: 20, left: 20, label: "LW" },
          ST: { top: 15, left: 50, label: "ST" },
          RW: { top: 20, left: 80, label: "RW" },
        };
      case "4-3-3":
      default:
        return {
          GK: { top: 90, left: 50, label: "GK" },
          LB: { top: 70, left: 15, label: "LB" },
          LCB: { top: 70, left: 38, label: "CB" },
          RCB: { top: 70, left: 62, label: "CB" },
          RB: { top: 70, left: 85, label: "RB" },
          LCM: { top: 42, left: 30, label: "CM" },
          CM: { top: 50, left: 50, label: "CDM" },
          RCM: { top: 42, left: 70, label: "CM" },
          LW: { top: 20, left: 20, label: "LW" },
          ST: { top: 15, left: 50, label: "ST" },
          RW: { top: 20, left: 80, label: "RW" },
        };
    }
  };

  const positions = customPositions || getFormationPositions();

  const isPositionActive = (pos: string) => {
    // Use selectedPositions array if provided, otherwise fall back to selectedPosition
    const positions = selectedPositions || (selectedPosition ? [selectedPosition] : []);
    
    if (positions.length === 0 || positions.includes("all")) return true;
    
    const posLabel = pos.trim().toUpperCase();
    
    // Check if any of the selected positions match this position
    return positions.some(selectedPos => {
      const selected = selectedPos.trim().toUpperCase();
      
      // Exact match
      if (selected === posLabel) return true;
      
      // Common position abbreviations and variations
      const positionMappings: Record<string, string[]> = {
        'LAM': ['LAM', 'LEFT AM', 'LEFT ATTACKING MID', 'LEFT ATTACKING MIDFIELDER', 'LAM'],
        'RAM': ['RAM', 'RIGHT AM', 'RIGHT ATTACKING MID', 'RIGHT ATTACKING MIDFIELDER', 'RAM'],
        'CAM': ['CAM', 'CENTRAL AM', 'ATTACKING MID', 'ATTACKING MIDFIELDER', 'CAM', 'AM'],
        'LST': ['LST', 'LEFT ST', 'LEFT STRIKER', 'LS', 'LEFT FORWARD'],
        'RST': ['RST', 'RIGHT ST', 'RIGHT STRIKER', 'RS', 'RIGHT FORWARD'],
        'ST': ['ST', 'STRIKER', 'CENTER FORWARD', 'CF', 'CENTRAL STRIKER'],
        'LW': ['LW', 'LEFT WING', 'LEFT WINGER', 'LW'],
        'RW': ['RW', 'RIGHT WING', 'RIGHT WINGER', 'RW'],
        'LM': ['LM', 'LEFT MID', 'LEFT MIDFIELDER', 'LEFT MIDFIELD'],
        'RM': ['RM', 'RIGHT MID', 'RIGHT MIDFIELDER', 'RIGHT MIDFIELD'],
        'LCM': ['LCM', 'LEFT CM', 'LEFT CENTRAL MID', 'LEFT CENTRAL MIDFIELDER'],
        'RCM': ['RCM', 'RIGHT CM', 'RIGHT CENTRAL MID', 'RIGHT CENTRAL MIDFIELDER'],
        'CM': ['CM', 'CENTRAL MID', 'CENTRAL MIDFIELDER', 'CENTER MID'],
        'LDM': ['LDM', 'LEFT DM', 'LEFT DEFENSIVE MID', 'LEFT DEFENSIVE MIDFIELDER'],
        'RDM': ['RDM', 'RIGHT DM', 'RIGHT DEFENSIVE MID', 'RIGHT DEFENSIVE MIDFIELDER'],
        'DM': ['DM', 'DEFENSIVE MID', 'DEFENSIVE MIDFIELDER'],
        'LB': ['LB', 'LEFT BACK', 'LEFT FULL BACK', 'LFB'],
        'RB': ['RB', 'RIGHT BACK', 'RIGHT FULL BACK', 'RFB'],
        'LCB': ['LCB', 'LEFT CB', 'LEFT CENTER BACK', 'LEFT CENTRE BACK'],
        'RCB': ['RCB', 'RIGHT CB', 'RIGHT CENTER BACK', 'RIGHT CENTRE BACK'],
        'CB': ['CB', 'CENTER BACK', 'CENTRE BACK', 'CENTRAL DEFENDER'],
        'LWB': ['LWB', 'LEFT WING BACK', 'LEFT WINGBACK'],
        'RWB': ['RWB', 'RIGHT WING BACK', 'RIGHT WINGBACK'],
        'GK': ['GK', 'GOALKEEPER', 'KEEPER']
      };
      
      // Check if the position label has a mapping and if the selected position matches any variation
      if (positionMappings[posLabel]) {
        return positionMappings[posLabel].some(variant => 
          selected === variant || selected.includes(variant) || variant.includes(selected)
        );
      }
      
      // Also check reverse - if selected position has a mapping
      for (const [key, variants] of Object.entries(positionMappings)) {
        if (variants.some(variant => selected === variant)) {
          return key === posLabel;
        }
      }
      
      return false;
    });
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
              isPositionActive(key) ? "opacity-100 scale-125" : "opacity-100 scale-100"
            }`}
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          >
            <div className="relative group">
              {/* Surname above for active position - closer to image */}
              {isPositionActive(key) && playerName && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-sm font-bebas tracking-wider text-[--gold] font-bold">
                    {getSurname()}
                  </span>
                </div>
              )}
              
              {/* Player Image in Oval Golden Frame for active position */}
              {isPositionActive(key) && playerImage ? (
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
              {!isPositionActive(key) && (
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
