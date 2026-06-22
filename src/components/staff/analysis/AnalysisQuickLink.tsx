import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
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
  club_logo?: string | null;
  representation_status?: string | null;
}

interface AnalysisQuickLinkProps {
  formData: any;
  setFormData: (data: any) => void;
  analysisType: "pre-match" | "post-match";
  defaultOpen?: boolean;
  taggedPlayerIds?: string[];
  setTaggedPlayerIds?: (ids: string[]) => void;
}

export const AnalysisQuickLink = ({
  formData,
  setFormData,
  analysisType,
  defaultOpen = true,
  taggedPlayerIds,
  setTaggedPlayerIds,
}: AnalysisQuickLinkProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [playerFixtures, setPlayerFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("none");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [recentPlayerIds, setRecentPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, name, club, club_logo, image_url, representation_status")
          .order("name");

        if (error) throw error;
        setPlayers(data || []);
      } catch (error) {
        console.error("Failed to fetch players:", error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    const fetchRecentActivity = async () => {
      try {
        // Get players with the most recently created analyses/reports
        const { data: recentAnalyses } = await supabase
          .from("player_analysis")
          .select("player_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        const { data: recentTags } = await supabase
          .from("analysis_player_tags")
          .select("player_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        // Combine and dedupe, keeping order of most recent
        const seen = new Set<string>();
        const ordered: string[] = [];
        const all = [
          ...(recentAnalyses || []).map(r => r.player_id),
          ...(recentTags || []).map(r => r.player_id),
        ];
        // Sort by how many recent entries they have (most active first)
        for (const pid of all) {
          if (!seen.has(pid)) {
            seen.add(pid);
            ordered.push(pid);
          }
        }
        setRecentPlayerIds(ordered);
      } catch {
        // Non-critical
      }
    };

    fetchPlayers();
    fetchRecentActivity();
  }, []);

  // Sort players: recently active first, then by representation status
  const sortedPlayers = useMemo(() => {
    const sorted = sortPlayersByRepresentation(players);
    if (recentPlayerIds.length === 0) return sorted;

    const recentSet = new Set(recentPlayerIds);
    const recentIndexMap = new Map(recentPlayerIds.map((id, i) => [id, i]));

    const recent = sorted
      .filter((p: any) => recentSet.has(p.id))
      .sort((a: any, b: any) => (recentIndexMap.get(a.id) ?? 999) - (recentIndexMap.get(b.id) ?? 999));
    const rest = sorted.filter((p: any) => !recentSet.has(p.id));

    return [...recent, ...rest];
  }, [players, recentPlayerIds]);

  // Filter by search
  const filteredPlayers = useMemo(() => {
    if (!playerSearch.trim()) return sortedPlayers;
    const q = playerSearch.toLowerCase();
    return sortedPlayers.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      (p.club && p.club.toLowerCase().includes(q))
    );
  }, [sortedPlayers, playerSearch]);

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

      // Auto-tag the player
      if (setTaggedPlayerIds && taggedPlayerIds) {
        if (!taggedPlayerIds.includes(selectedPlayerId)) {
          setTaggedPlayerIds([...taggedPlayerIds, selectedPlayerId]);
        }
      }
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

  const handleApplyFixture = async () => {
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

    // Determine opponent name — don't guess if we can't match the player's team
    const opponentName = playerTeam === "home" ? fixture.away_team : playerTeam === "away" ? fixture.home_team : "";

    const updateData: any = {
      ...formData,
      fixture_id: fixture.id,
      match_date: fixture.match_date,
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      home_score: fixture.home_score,
      away_score: fixture.away_score,
    };

    // Auto-generate title
    if (analysisType === "pre-match") {
      if (playerTeam) {
        updateData.player_team = playerTeam;
      }
      updateData.title = `Opposition Analysis - ${opponentName}`;
    }

    if (analysisType === "post-match") {
      updateData.player_name = player.name.toUpperCase();
      updateData.title = `${player.name.toUpperCase()} vs ${opponentName}`;
    }

    // Auto-fill player's club logo and colour from club_logo
    if (player.club_logo && playerTeam) {
      if (playerTeam === "home") {
        updateData.home_team_logo = player.club_logo;
      } else {
        updateData.away_team_logo = player.club_logo;
      }
    }

    // Try to pull team bg colours from the most recent analysis with the same team names
    try {
      const { data: prevAnalysis } = await supabase
        .from("analyses")
        .select("home_team, away_team, home_team_logo, away_team_logo, home_team_bg_color, away_team_bg_color")
        .or(`home_team.ilike.%${fixture.home_team}%,away_team.ilike.%${fixture.home_team}%`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (prevAnalysis && prevAnalysis.length > 0) {
        for (const prev of prevAnalysis) {
          const prevHome = prev.home_team?.toLowerCase() || "";
          const prevAway = prev.away_team?.toLowerCase() || "";

          // Match home team
          if (prevHome.includes(homeTeamLower) || homeTeamLower.includes(prevHome)) {
            if (!updateData.home_team_logo && prev.home_team_logo) updateData.home_team_logo = prev.home_team_logo;
            if (!updateData.home_team_bg_color && prev.home_team_bg_color) updateData.home_team_bg_color = prev.home_team_bg_color;
          }
          if (prevAway.includes(homeTeamLower) || homeTeamLower.includes(prevAway)) {
            if (!updateData.home_team_logo && prev.away_team_logo) updateData.home_team_logo = prev.away_team_logo;
            if (!updateData.home_team_bg_color && prev.away_team_bg_color) updateData.home_team_bg_color = prev.away_team_bg_color;
          }
          // Match away team
          if (prevHome.includes(awayTeamLower) || awayTeamLower.includes(prevHome)) {
            if (!updateData.away_team_logo && prev.home_team_logo) updateData.away_team_logo = prev.home_team_logo;
            if (!updateData.away_team_bg_color && prev.home_team_bg_color) updateData.away_team_bg_color = prev.home_team_bg_color;
          }
          if (prevAway.includes(awayTeamLower) || awayTeamLower.includes(prevAway)) {
            if (!updateData.away_team_logo && prev.away_team_logo) updateData.away_team_logo = prev.away_team_logo;
            if (!updateData.away_team_bg_color && prev.away_team_bg_color) updateData.away_team_bg_color = prev.away_team_bg_color;
          }
        }
      }
    } catch {
      // Non-critical — colours will just need manual entry
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
          <PlayerCombobox
            players={players as any}
            value={selectedPlayerId === "none" ? null : selectedPlayerId}
            onChange={(val) => {
              setSelectedPlayerId(val);
              setPlayerSearch("");
            }}
            placeholder="Select a player"
            disabled={loadingPlayers}
            showClub
            className="h-9"
          />
        </div>

        <div>
          <Label className="text-xs">Fixture</Label>
          <div className="flex gap-1.5 mt-[calc(2rem+0.25rem)]">
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
