import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";

const FORMATIONS = [
  "4-3-3",
  "4-2-1-3",
  "4-2-4",
  "4-2-2-2",
  "4-3-1-2",
  "3-4-3",
  "3-3-1-3",
  "3-3-4",
  "3-3-2-2",
  "3-4-1-2",
];

// Default positions for each formation
const getDefaultPositions = (formation: string) => {
  const defaults: Record<string, Record<string, { x: number; y: number; label: string }>> = {
    "4-3-3": {
      GK: { x: 50, y: 95, label: "GK" },
      LB: { x: 20, y: 75, label: "LB" },
      LCB: { x: 40, y: 80, label: "LCB" },
      RCB: { x: 60, y: 80, label: "RCB" },
      RB: { x: 80, y: 75, label: "RB" },
      LCM: { x: 35, y: 55, label: "LCM" },
      CM: { x: 50, y: 50, label: "CM" },
      RCM: { x: 65, y: 55, label: "RCM" },
      LW: { x: 20, y: 25, label: "LW" },
      ST: { x: 50, y: 20, label: "ST" },
      RW: { x: 80, y: 25, label: "RW" },
    },
    "4-2-1-3": {
      GK: { x: 50, y: 95, label: "GK" },
      LB: { x: 20, y: 75, label: "LB" },
      LCB: { x: 40, y: 80, label: "LCB" },
      RCB: { x: 60, y: 80, label: "RCB" },
      RB: { x: 80, y: 75, label: "RB" },
      LDM: { x: 40, y: 60, label: "LDM" },
      RDM: { x: 60, y: 60, label: "RDM" },
      CAM: { x: 50, y: 40, label: "CAM" },
      LW: { x: 20, y: 25, label: "LW" },
      ST: { x: 50, y: 20, label: "ST" },
      RW: { x: 80, y: 25, label: "RW" },
    },
    "4-2-4": {
      GK: { x: 50, y: 95, label: "GK" },
      LB: { x: 20, y: 75, label: "LB" },
      LCB: { x: 40, y: 80, label: "LCB" },
      RCB: { x: 60, y: 80, label: "RCB" },
      RB: { x: 80, y: 75, label: "RB" },
      LDM: { x: 40, y: 55, label: "LDM" },
      RDM: { x: 60, y: 55, label: "RDM" },
      LW: { x: 15, y: 25, label: "LW" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
      RW: { x: 85, y: 25, label: "RW" },
    },
    "4-2-2-2": {
      GK: { x: 50, y: 95, label: "GK" },
      LB: { x: 20, y: 75, label: "LB" },
      LCB: { x: 40, y: 80, label: "LCB" },
      RCB: { x: 60, y: 80, label: "RCB" },
      RB: { x: 80, y: 75, label: "RB" },
      LDM: { x: 40, y: 60, label: "LDM" },
      RDM: { x: 60, y: 60, label: "RDM" },
      LAM: { x: 35, y: 35, label: "LAM" },
      RAM: { x: 65, y: 35, label: "RAM" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
    },
    "4-3-1-2": {
      GK: { x: 50, y: 95, label: "GK" },
      LB: { x: 20, y: 75, label: "LB" },
      LCB: { x: 40, y: 80, label: "LCB" },
      RCB: { x: 60, y: 80, label: "RCB" },
      RB: { x: 80, y: 75, label: "RB" },
      LCM: { x: 35, y: 55, label: "LCM" },
      CM: { x: 50, y: 55, label: "CM" },
      RCM: { x: 65, y: 55, label: "RCM" },
      CAM: { x: 50, y: 35, label: "CAM" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
    },
    "3-4-3": {
      GK: { x: 50, y: 95, label: "GK" },
      LCB: { x: 30, y: 80, label: "LCB" },
      CB: { x: 50, y: 85, label: "CB" },
      RCB: { x: 70, y: 80, label: "RCB" },
      LM: { x: 15, y: 50, label: "LM" },
      LCM: { x: 40, y: 55, label: "LCM" },
      RCM: { x: 60, y: 55, label: "RCM" },
      RM: { x: 85, y: 50, label: "RM" },
      LW: { x: 20, y: 25, label: "LW" },
      ST: { x: 50, y: 20, label: "ST" },
      RW: { x: 80, y: 25, label: "RW" },
    },
    "3-3-1-3": {
      GK: { x: 50, y: 95, label: "GK" },
      LCB: { x: 30, y: 80, label: "LCB" },
      CB: { x: 50, y: 85, label: "CB" },
      RCB: { x: 70, y: 80, label: "RCB" },
      LCM: { x: 35, y: 55, label: "LCM" },
      CM: { x: 50, y: 55, label: "CM" },
      RCM: { x: 65, y: 55, label: "RCM" },
      CAM: { x: 50, y: 35, label: "CAM" },
      LW: { x: 20, y: 25, label: "LW" },
      ST: { x: 50, y: 20, label: "ST" },
      RW: { x: 80, y: 25, label: "RW" },
    },
    "3-3-4": {
      GK: { x: 50, y: 95, label: "GK" },
      LCB: { x: 30, y: 80, label: "LCB" },
      CB: { x: 50, y: 85, label: "CB" },
      RCB: { x: 70, y: 80, label: "RCB" },
      LCM: { x: 35, y: 60, label: "LCM" },
      CM: { x: 50, y: 60, label: "CM" },
      RCM: { x: 65, y: 60, label: "RCM" },
      LW: { x: 15, y: 25, label: "LW" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
      RW: { x: 85, y: 25, label: "RW" },
    },
    "3-3-2-2": {
      GK: { x: 50, y: 95, label: "GK" },
      LCB: { x: 30, y: 80, label: "LCB" },
      CB: { x: 50, y: 85, label: "CB" },
      RCB: { x: 70, y: 80, label: "RCB" },
      LCM: { x: 35, y: 60, label: "LCM" },
      CM: { x: 50, y: 60, label: "CM" },
      RCM: { x: 65, y: 60, label: "RCM" },
      LAM: { x: 35, y: 35, label: "LAM" },
      RAM: { x: 65, y: 35, label: "RAM" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
    },
    "3-4-1-2": {
      GK: { x: 50, y: 95, label: "GK" },
      LCB: { x: 30, y: 80, label: "LCB" },
      CB: { x: 50, y: 85, label: "CB" },
      RCB: { x: 70, y: 80, label: "RCB" },
      LM: { x: 15, y: 55, label: "LM" },
      LCM: { x: 40, y: 60, label: "LCM" },
      RCM: { x: 60, y: 60, label: "RCM" },
      RM: { x: 85, y: 55, label: "RM" },
      CAM: { x: 50, y: 35, label: "CAM" },
      LST: { x: 40, y: 20, label: "LST" },
      RST: { x: 60, y: 20, label: "RST" },
    },
  };

  return defaults[formation] || {};
};

export const SchemeEditor = () => {
  const [selectedFormation, setSelectedFormation] = useState<string>("");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; label: string }>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedFormation) {
      loadFormationPositions(selectedFormation);
    }
  }, [selectedFormation]);

  const loadFormationPositions = async (formation: string) => {
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
        setPositions(data.positions as Record<string, { x: number; y: number; label: string }>);
      } else {
        setPositions(getDefaultPositions(formation));
      }
    } catch (error) {
      console.error("Error loading formation:", error);
      setPositions(getDefaultPositions(formation));
    }
  };

  const handleMouseDown = (positionKey: string) => {
    setDragging(positionKey);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPositions(prev => ({
      ...prev,
      [dragging]: {
        ...prev[dragging],
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      },
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleSave = async () => {
    if (!selectedFormation) {
      toast.error("Please select a formation");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("formation_positions")
        .upsert({
          formation: selectedFormation,
          positions: positions,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Formation positions saved successfully");
    } catch (error) {
      console.error("Error saving positions:", error);
      toast.error("Failed to save positions");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (selectedFormation) {
      setPositions(getDefaultPositions(selectedFormation));
      toast.info("Reset to default positions");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedFormation} onValueChange={setSelectedFormation}>
            <SelectTrigger>
              <SelectValue placeholder="Select formation to edit..." />
            </SelectTrigger>
            <SelectContent>
              {FORMATIONS.map((formation) => (
                <SelectItem key={formation} value={formation}>
                  {formation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleReset} variant="outline" disabled={!selectedFormation}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!selectedFormation || loading}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>

      {selectedFormation && (
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground mb-4">
            Drag the position markers to customize the formation layout
          </p>
          <div
            className="relative w-full aspect-[2/3] bg-green-600 rounded-lg overflow-hidden cursor-move select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Pitch markings */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-16 border-2 border-white/30" />
            </div>

            {/* Position markers */}
            {Object.entries(positions).map(([key, pos]) => (
              <div
                key={key}
                className="absolute w-10 h-10 -ml-5 -mt-5 cursor-grab active:cursor-grabbing"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onMouseDown={() => handleMouseDown(key)}
              >
                <div className="w-full h-full rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-lg">
                  <span className="text-xs font-bold text-primary">{pos.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
