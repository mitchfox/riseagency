import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Link2, Loader2 } from "lucide-react";
import { sortPlayersByRepresentation, getStatusLabel } from "@/lib/playerSorting";
import { InlineFixtureCreator } from "@/components/staff/InlineFixtureCreator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sharedSupabase as supabase } from "@/integrations/supabase/sharedClient";
import { toast } from "sonner";

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  competition: string | null;
}

interface Player {
  id: string;
  name: string;
  club?: string | null;
}

interface AnalysisQuickLinkProps {
  formData: any;
  setFormData: (data: any) => void;
  analysisType: "pre-match" | "post-match";
  defaultOpen?: boolean;
}

export const AnalysisQuickLink = ({
  formData,
  setFormData,
  analysisType,
  defaultOpen = true,
}: AnalysisQuickLinkProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [playerFixtures, setPlayerFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("none");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, name, club, representation_status")
          .order("name");

        if (error) throw error;
        setPlayers(data || []);
      } catch (error) {
        console.error("Failed to fetch players:", error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, []);

  // Auto-apply when fixture is selected
  useEffect(() => {
    if (selectedPlayerId && selectedPlayerId !== "none" && 
        selectedFixtureId && selectedFixtureId !== "none") {
      handleApplyFixture();
    }
  }, [selectedFixtureId]);

  useEffect(() => {
    if (selectedPlayerId && selectedPlayerId !== "none") {
      fetchPlayerFixtures(selectedPlayerId);
    } else {
      setPlayerFixtures([]);
      setSelectedFixtureId("none");
    }
  }, [selectedPlayerId]);

  const fetchPlayerFixtures = async (playerId: string) => {
    setLoadingFixtures(true);
    try {
      const { data: playerFixtureLinks, error: pfError } = await supabase
        .from("player_fixtures")
        .select("fixture_id")
        .eq("player_id", playerId);

      if (pfError) throw pfError;

      if (playerFixtureLinks && playerFixtureLinks.length > 0) {
        const fixtureIds = playerFixtureLinks.map(pf => pf.fixture_id);

        const { data: fixturesData, error: fError } = await supabase
          .from("fixtures")
          .select("*")
          .in("id", fixtureIds)
          .order("match_date", { ascending: false });

        if (fError) throw fError;
        setPlayerFixtures(fixturesData || []);
      } else {
        setPlayerFixtures([]);
      }
    } catch (error) {
      console.error("Failed to fetch fixtures:", error);
      setPlayerFixtures([]);
    } finally {
      setLoadingFixtures(false);
    }
  };

  const handleApplyFixture = () => {
    if (selectedFixtureId === "none") {
      toast.error("Please select a fixture first");
      return;
    }

    const fixture = playerFixtures.find(f => f.id === selectedFixtureId);
    const player = players.find(p => p.id === selectedPlayerId);

    if (!fixture || !player) return;

    const playerClub = player.club?.toLowerCase() || "";
    const homeTeamLower = fixture.home_team.toLowerCase();
    const awayTeamLower = fixture.away_team.toLowerCase();

    let playerTeam: "home" | "away" | null = null;
    if (playerClub && (homeTeamLower.includes(playerClub) || playerClub.includes(homeTeamLower))) {
      playerTeam = "home";
    } else if (playerClub && (awayTeamLower.includes(playerClub) || playerClub.includes(awayTeamLower))) {
      playerTeam = "away";
    }

    const updateData: any = {
      ...formData,
      match_date: fixture.match_date,
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      home_score: fixture.home_score,
      away_score: fixture.away_score,
    };

    if (analysisType === "pre-match" && playerTeam) {
      updateData.player_team = playerTeam;
    }

    if (analysisType === "post-match") {
      updateData.player_name = player.name.toUpperCase();
    }

    setFormData(updateData);
    toast.success("Match details imported from fixture");
  };

  const formatFixtureLabel = (fixture: Fixture) => {
    const date = new Date(fixture.match_date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const score = fixture.home_score !== null && fixture.away_score !== null 
      ? ` (${fixture.home_score}-${fixture.away_score})` 
      : '';
    return `${fixture.home_team} vs ${fixture.away_team}${score} - ${date}`;
  };

  return (
    <div className="mb-4 p-3 bg-risegold/10 border border-risegold/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">QUICK LINK TO FIXTURE</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Select a player and fixture to automatically import match details.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Player</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={loadingPlayers}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select a player</SelectItem>
              {sortPlayersByRepresentation(players).map((player: any) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                  {player.representation_status && player.representation_status !== 'other' && (
                    <span className="text-xs text-muted-foreground ml-1">({getStatusLabel(player.representation_status)})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Fixture</Label>
          <div className="flex gap-1.5">
            <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId} disabled={loadingFixtures || playerFixtures.length === 0}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder={loadingFixtures ? "Loading..." : selectedPlayerId === "none" ? "Select player first" : playerFixtures.length === 0 ? "No fixtures" : "Select a fixture"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a fixture</SelectItem>
                {playerFixtures.map((fixture) => (
                  <SelectItem key={fixture.id} value={fixture.id}>
                    {formatFixtureLabel(fixture)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineFixtureCreator
              playerId={selectedPlayerId !== "none" ? selectedPlayerId : undefined}
              onFixtureCreated={(fixtureId) => {
                if (selectedPlayerId && selectedPlayerId !== "none") {
                  fetchPlayerFixtures(selectedPlayerId);
                  setSelectedFixtureId(fixtureId);
                }
              }}
            />
          </div>
        </div>
      </div>

      {selectedFixtureId !== "none" && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Match details imported automatically
        </p>
      )}
    </div>
  );
};
