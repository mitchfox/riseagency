import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Link2, Loader2 } from "lucide-react";
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
          .select("id, name, club")
          .in("representation_status", ["represented", "mandated"])
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-risegold/20 rounded-lg hover:bg-risegold/30 transition-colors">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          <h3 className="font-semibold">QUICK LINK</h3>
          <span className="text-sm text-muted-foreground">(Import from fixture)</span>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a player and their fixture to automatically import match details.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Player</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={loadingPlayers}>
              <SelectTrigger>
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a player</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fixture</Label>
            <Select value={selectedFixtureId} onValueChange={setSelectedFixtureId} disabled={loadingFixtures || playerFixtures.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select a fixture" />
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
          </div>
        </div>

        <Button 
          onClick={handleApplyFixture} 
          disabled={selectedFixtureId === "none" || loadingFixtures}
          className="w-full"
        >
          {loadingFixtures ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Import Match Details
            </>
          )}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};
