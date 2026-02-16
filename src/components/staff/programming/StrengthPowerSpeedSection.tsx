import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell } from "lucide-react";
import { ProgrammingManagement } from "@/components/staff/ProgrammingManagement";

export const StrengthPowerSpeedSection = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [players, setPlayers] = useState<{ id: string; name: string; position: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name, position")
      .order("name");
    setPlayers(data || []);
  };

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const handlePlayerChange = (value: string) => {
    setSelectedPlayer(value);
    if (value !== "all") {
      setDialogOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <Select value={selectedPlayer} onValueChange={handlePlayerChange}>
        <SelectTrigger className="w-full sm:w-[300px]">
          <SelectValue placeholder="Select a player..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Select a player...</SelectItem>
          {players.map((player) => (
            <SelectItem key={player.id} value={player.id}>
              {player.name} ({player.position})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPlayer === "all" && (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a player to manage their strength, power and speed programming</p>
        </div>
      )}

      {selectedPlayer !== "all" && currentPlayer && (
        <ProgrammingManagement
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
          isAdmin={true}
        />
      )}
    </div>
  );
};
