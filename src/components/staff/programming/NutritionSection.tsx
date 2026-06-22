import { useState, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, BookOpen } from "lucide-react";
import { NutritionProgramManagement } from "@/components/staff/NutritionProgramManagement";
import { NutritionRecipes } from "@/components/staff/NutritionRecipes";

const STATUS_ORDER = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'prospect', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel For Football',
  prospect: 'Prospect',
  other: 'Other',
  scouted: 'Scouted',
};

export const NutritionSection = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [players, setPlayers] = useState<{ id: string; name: string; position: string; representation_status: string }[]>([]);
  const [activeTab, setActiveTab] = useState("programming");

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, position, image_url, representation_status")
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="programming" className="text-xs sm:text-sm">
            <UtensilsCrossed className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Programming
          </TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs sm:text-sm">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programming" className="space-y-4">
          <PlayerCombobox
            players={players}
            value={selectedPlayer}
            onChange={setSelectedPlayer}
            allLabel="Select a player..."
            allValue="all"
            className="w-full sm:w-[300px]"
          />

          {selectedPlayer === "all" && (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <PlayerCombobox
            players={players}
            value={selectedPlayer}
            onChange={setSelectedPlayer}
            allLabel="All Recipes (no player)"
            allValue="all"
            placeholder="Select a player (optional)..."
            className="w-full sm:w-[300px]"
          />

          <NutritionRecipes
            playerId={selectedPlayer !== "all" ? selectedPlayer : undefined}
            playerName={currentPlayer?.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
