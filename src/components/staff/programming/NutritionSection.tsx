import { useState, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Apple } from "lucide-react";
import { NutritionProgramManagement } from "@/components/staff/NutritionProgramManagement";

const STATUS_ORDER = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel For Football',
  other: 'Other',
  scouted: 'Scouted',
};

export const NutritionSection = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [players, setPlayers] = useState<{ id: string; name: string; position: string; representation_status: string }[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, position, representation_status")
        .order("name");
      setPlayers(data || []);
    };
    fetchPlayers();
  }, []);

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const groupedPlayers = STATUS_ORDER
    .map(status => ({
      status,
      label: STATUS_LABELS[status] || status,
      players: players.filter(p => (p.representation_status || 'other') === status),
    }))
    .filter(g => g.players.length > 0);

  return (
    <div className="space-y-4">
      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
        <SelectTrigger className="w-full sm:w-[300px]">
          <SelectValue placeholder="Select a player..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Select a player...</SelectItem>
          {groupedPlayers.map((group) => (
            <SelectGroup key={group.status}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name} ({player.position})
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {selectedPlayer === "all" && (
        <div className="text-center py-12 text-muted-foreground">
          <Apple className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a player to manage their nutrition programming</p>
        </div>
      )}

      {selectedPlayer !== "all" && currentPlayer && (
        <NutritionProgramManagement
          embedded
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      )}
    </div>
  );
};
