import { useState, useEffect } from "react";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, ChevronDown } from "lucide-react";
import { ProgrammingManagement } from "@/components/staff/ProgrammingManagement";
import { SpsSection } from "@/components/staff/programming/SpsSection";
import { AddTestResultDialog } from "@/components/staff/AddTestResultDialog";
import { SPSTimeline } from "@/components/staff/programming/SPSTimeline";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const STATUS_ORDER = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel For Football',
  other: 'Other',
  scouted: 'Scouted',
};

export const StrengthPowerSpeedSection = () => {
  const [selectedPlayer, setSelectedPlayer] = usePersistedState<string>("programming.sps.selectedPlayer", "all");
  const [players, setPlayers] = useState<{ id: string; name: string; position: string; representation_status: string }[]>([]);
  const [playerPrograms, setPlayerPrograms] = useState<any[]>([]);
  // The "new normalised" editor (SpsSection) was a wrong turn — it never
  // received the player_programs JSONB data so all existing programmes
  // appeared empty. We've moved the original editor back to primary; the
  // normalised one is parked behind a collapsible until we decide to delete
  // it entirely.
  const [normalisedOpen, setNormalisedOpen] = useState(false);

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

  useEffect(() => {
    if (selectedPlayer && selectedPlayer !== "all") {
      const fetchPrograms = async () => {
        const { data } = await supabase
          .from("player_programs")
          .select("id, program_name, end_date, is_current, display_order, created_at")
          .eq("player_id", selectedPlayer)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });
        setPlayerPrograms(data || []);
      };
      fetchPrograms();
    } else {
      setPlayerPrograms([]);
    }
  }, [selectedPlayer]);

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const groupedPlayers = STATUS_ORDER
    .map(status => ({
      status,
      label: STATUS_LABELS[status] || status,
      players: players.filter(p => (p.representation_status || 'other') === status),
    }))
    .filter(g => g.players.length > 0);

  return (
    <div className="space-y-4 -mx-6 sm:mx-0 px-2 sm:px-0">
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
          <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a player to manage their strength, power and speed programming</p>
        </div>
      )}

      {selectedPlayer !== "all" && currentPlayer && (
        <div className="space-y-4">
          {/* Visual Timeline */}
          <SPSTimeline programs={playerPrograms} playerName={currentPlayer.name} />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Testing Results</h3>
            <AddTestResultDialog
              playerId={currentPlayer.id}
              playerName={currentPlayer.name}
              onSuccess={() => {}}
            />
          </div>

          <ProgrammingManagement
            embedded
            playerId={currentPlayer.id}
            playerName={currentPlayer.name}
            isAdmin={true}
          />

          <Collapsible open={normalisedOpen} onOpenChange={setNormalisedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide">Normalised editor (do not use — pending removal)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${normalisedOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <SpsSection playerId={currentPlayer.id} playerName={currentPlayer.name} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
};
