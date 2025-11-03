import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CreatePerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
  onSuccess?: () => void;
  analysisId?: string; // For edit mode
}

interface Fixture {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  competition: string;
  home_score: number | null;
  away_score: number | null;
}

interface PerformanceAction {
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
}

export const CreatePerformanceReportDialog = ({
  open,
  onOpenChange,
  playerId,
  playerName,
  onSuccess,
  analysisId,
}: CreatePerformanceReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");
  const [showStrikerStats, setShowStrikerStats] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [playerClub, setPlayerClub] = useState<string>("");
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  // Key stats
  const [r90Score, setR90Score] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState("");
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("");

  // Striker stats
  const [strikerStats, setStrikerStats] = useState({
    xGChain: "",
    xGChain_per90: "",
    xG_adj: "",
    xG_adj_per90: "",
    xA_adj: "",
    xA_adj_per90: "",
    movement_in_behind_xC: "",
    movement_in_behind_xC_per90: "",
    movement_down_side_xC: "",
    movement_down_side_xC_per90: "",
    triple_threat_xC: "",
    triple_threat_xC_per90: "",
    movement_to_feet_xC: "",
    movement_to_feet_xC_per90: "",
    crossing_movement_xC: "",
    crossing_movement_xC_per90: "",
    interceptions: "",
    interceptions_per90: "",
    regains_adj: "",
    regains_adj_per90: "",
    turnovers_adj: "",
    turnovers_adj_per90: "",
    progressive_passes_adj: "",
    progressive_passes_adj_per90: "",
  });

  // Performance actions
  const [actions, setActions] = useState<PerformanceAction[]>([
    { action_number: 1, minute: "", action_score: "", action_type: "", action_description: "", notes: "" }
  ]);

  useEffect(() => {
    if (open) {
      fetchActionTypes();
      if (analysisId) {
        // Edit mode
        setIsEditMode(true);
        fetchExistingData();
      } else {
        // Create mode
        setIsEditMode(false);
        resetForm();
      }
      fetchFixtures();
      fetchPlayerClub();
    }
  }, [open, analysisId]);

  const fetchActionTypes = async () => {
    const { data, error } = await supabase
      .from("performance_report_actions")
      .select("action_type")
      .not("action_type", "is", null)
      .order("action_type");

    if (!error && data) {
      const uniqueTypes = Array.from(new Set(data.map(item => item.action_type)));
      setActionTypes(uniqueTypes);
    }
  };

  const fetchPlayerClub = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("club")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      setPlayerClub(data?.club || "");
    } catch (error: any) {
      console.error("Error fetching player club:", error);
    }
  };

  const fetchFixtures = async () => {
    try {
      const { data: playerFixtures, error: pfError } = await supabase
        .from("player_fixtures")
        .select("fixture_id")
        .eq("player_id", playerId);

      if (pfError) throw pfError;

      if (playerFixtures && playerFixtures.length > 0) {
        const fixtureIds = playerFixtures.map(pf => pf.fixture_id);
        
        const { data: fixturesData, error: fError } = await supabase
          .from("fixtures")
          .select("*")
          .in("id", fixtureIds)
          .order("match_date", { ascending: false });

        if (fError) throw fError;
        setFixtures(fixturesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching fixtures:", error);
      toast.error("Failed to load fixtures");
    }
  };

  const handleFixtureChange = (fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    const fixture = fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      // Intelligently determine opponent based on player's club
      let opponentTeam = fixture.away_team; // Default to away team
      
      if (playerClub) {
        // Check if player's club matches home or away team
        if (fixture.home_team === playerClub) {
          opponentTeam = fixture.away_team;
        } else if (fixture.away_team === playerClub) {
          opponentTeam = fixture.home_team;
        }
      }
      
      setOpponent(opponentTeam);
      if (fixture.home_score !== null && fixture.away_score !== null) {
        setResult(`${fixture.home_score}-${fixture.away_score}`);
      }
    }
  };

  const fetchExistingData = async () => {
    if (!analysisId) return;
    
    setLoadingData(true);
    try {
      // Fetch analysis data
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (analysisError) throw analysisError;

      // Populate form
      setR90Score(analysisData.r90_score?.toString() || "");
      setMinutesPlayed(analysisData.minutes_played?.toString() || "");
      setOpponent(analysisData.opponent || "");
      setResult(analysisData.result || "");
      setSelectedFixtureId(analysisData.fixture_id || "");

      // Populate striker stats if they exist
      if (analysisData.striker_stats) {
        const stats = analysisData.striker_stats as any;
        setStrikerStats({
          xGChain: stats.xGChain?.toString() || "",
          xGChain_per90: stats.xGChain_per90?.toString() || "",
          xG_adj: stats.xG_adj?.toString() || "",
          xG_adj_per90: stats.xG_adj_per90?.toString() || "",
          xA_adj: stats.xA_adj?.toString() || "",
          xA_adj_per90: stats.xA_adj_per90?.toString() || "",
          movement_in_behind_xC: stats.movement_in_behind_xC?.toString() || "",
          movement_in_behind_xC_per90: stats.movement_in_behind_xC_per90?.toString() || "",
          movement_down_side_xC: stats.movement_down_side_xC?.toString() || "",
          movement_down_side_xC_per90: stats.movement_down_side_xC_per90?.toString() || "",
          triple_threat_xC: stats.triple_threat_xC?.toString() || "",
          triple_threat_xC_per90: stats.triple_threat_xC_per90?.toString() || "",
          movement_to_feet_xC: stats.movement_to_feet_xC?.toString() || "",
          movement_to_feet_xC_per90: stats.movement_to_feet_xC_per90?.toString() || "",
          crossing_movement_xC: stats.crossing_movement_xC?.toString() || "",
          crossing_movement_xC_per90: stats.crossing_movement_xC_per90?.toString() || "",
          interceptions: stats.interceptions?.toString() || "",
          interceptions_per90: stats.interceptions_per90?.toString() || "",
          regains_adj: stats.regains_adj?.toString() || "",
          regains_adj_per90: stats.regains_adj_per90?.toString() || "",
          turnovers_adj: stats.turnovers_adj?.toString() || "",
          turnovers_adj_per90: stats.turnovers_adj_per90?.toString() || "",
          progressive_passes_adj: stats.progressive_passes_adj?.toString() || "",
          progressive_passes_adj_per90: stats.progressive_passes_adj_per90?.toString() || "",
        });
        setShowStrikerStats(true);
      }

      // Fetch performance actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("performance_report_actions")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("action_number", { ascending: true });

      if (actionsError) throw actionsError;

      if (actionsData && actionsData.length > 0) {
        setActions(
          actionsData.map((action) => ({
            action_number: action.action_number,
            minute: action.minute !== null ? Number(action.minute).toFixed(2) : "",
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
          }))
        );
      }
    } catch (error: any) {
      console.error("Error fetching existing data:", error);
      toast.error("Failed to load performance report data");
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setR90Score("");
    setMinutesPlayed("");
    setOpponent("");
    setResult("");
    setSelectedFixtureId("");
    setShowStrikerStats(false);
    setStrikerStats({
      xGChain: "",
      xGChain_per90: "",
      xG_adj: "",
      xG_adj_per90: "",
      xA_adj: "",
      xA_adj_per90: "",
      movement_in_behind_xC: "",
      movement_in_behind_xC_per90: "",
      movement_down_side_xC: "",
      movement_down_side_xC_per90: "",
      triple_threat_xC: "",
      triple_threat_xC_per90: "",
      movement_to_feet_xC: "",
      movement_to_feet_xC_per90: "",
      crossing_movement_xC: "",
      crossing_movement_xC_per90: "",
      interceptions: "",
      interceptions_per90: "",
      regains_adj: "",
      regains_adj_per90: "",
      turnovers_adj: "",
      turnovers_adj_per90: "",
      progressive_passes_adj: "",
      progressive_passes_adj_per90: "",
    });
    setActions([
      { action_number: 1, minute: "", action_score: "", action_type: "", action_description: "", notes: "" }
    ]);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        action_number: actions.length + 1,
        minute: "",
        action_score: "",
        action_type: "",
        action_description: "",
        notes: ""
      }
    ]);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    // Renumber actions
    newActions.forEach((action, i) => {
      action.action_number = i + 1;
    });
    setActions(newActions);
  };

  const updateAction = (index: number, field: keyof PerformanceAction, value: string) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);
  };

  const handleDelete = async () => {
    if (!analysisId) return;

    setDeleting(true);
    try {
      // Delete performance actions first
      const { error: actionsError } = await supabase
        .from("performance_report_actions")
        .delete()
        .eq("analysis_id", analysisId);

      if (actionsError) throw actionsError;

      // Delete the analysis record
      const { error: analysisError } = await supabase
        .from("player_analysis")
        .delete()
        .eq("id", analysisId);

      if (analysisError) throw analysisError;

      toast.success("Performance report deleted successfully");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error deleting performance report:", error);
      toast.error("Failed to delete performance report: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!selectedFixtureId) {
      toast.error("Please select a fixture");
      return;
    }
    if (!minutesPlayed) {
      toast.error("Please fill in Minutes Played");
      return;
    }
    if (actions.length === 0 || !actions[0].minute) {
      toast.error("Please add at least one performance action");
      return;
    }

    setLoading(true);

    try {
      const fixture = fixtures.find(f => f.id === selectedFixtureId);
      
      // Calculate R90 from actions
      const rawScore = actions.reduce((sum, a) => sum + (parseFloat(a.action_score) || 0), 0);
      const calculatedR90 = (rawScore / parseInt(minutesPlayed)) * 90;
      
      // Prepare striker stats JSONB
      const hasStrikerStats = Object.values(strikerStats).some(v => v !== "");
      const strikerStatsJson = hasStrikerStats ? Object.fromEntries(
        Object.entries(strikerStats)
          .filter(([_, value]) => value !== "")
          .map(([key, value]) => [key, parseFloat(value)])
      ) : null;

      let analysisIdToUse = analysisId;

      if (analysisId) {
        // Edit mode - update existing record
        const { error: analysisError } = await supabase
          .from("player_analysis")
          .update({
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parseInt(minutesPlayed),
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
          })
          .eq("id", analysisId);

        if (analysisError) throw analysisError;

        // Delete existing actions
        const { error: deleteError } = await supabase
          .from("performance_report_actions")
          .delete()
          .eq("analysis_id", analysisId);

        if (deleteError) throw deleteError;
      } else {
        // Create mode - check for existing analysis first
        const { data: existingAnalysis } = await supabase
          .from("player_analysis")
          .select("id")
          .eq("player_id", playerId)
          .eq("analysis_date", fixture?.match_date)
          .eq("opponent", opponent)
          .maybeSingle();

        if (existingAnalysis) {
          toast.error("A performance report already exists for this player, date, and opponent. Please edit the existing report instead.");
          setLoading(false);
          return;
        }

        // Insert new record
        const { data: analysisData, error: analysisError } = await supabase
          .from("player_analysis")
          .insert({
            player_id: playerId,
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parseInt(minutesPlayed),
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
          })
          .select()
          .single();

        if (analysisError) throw analysisError;
        analysisIdToUse = analysisData.id;
      }

      // Insert performance actions
      const actionsToInsert = actions
        .filter(a => a.action_number)
        .map(a => ({
          analysis_id: analysisIdToUse,
          action_number: a.action_number,
          minute: a.minute ? parseFloat(a.minute) : null,
          action_score: a.action_score ? parseFloat(a.action_score) : null,
          action_type: a.action_type || null,
          action_description: a.action_description || null,
          notes: a.notes || null,
        }));

      if (actionsToInsert.length > 0) {
        const { error: actionsError } = await supabase
          .from("performance_report_actions")
          .insert(actionsToInsert);

        if (actionsError) throw actionsError;
      }

      toast.success(`Performance report ${analysisId ? 'updated' : 'created'} successfully`);
      
      // Only close dialog and call onSuccess in create mode
      // In edit mode, keep dialog open for continued editing
      if (!analysisId) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Error saving performance report:", error);
      toast.error("Failed to save performance report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{analysisId ? 'Edit' : 'Create'} Performance Report - {playerName}</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading...</div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
          {/* Fixture Selection */}
          <div>
            <Label htmlFor="fixture">Select Fixture *</Label>
            <Select value={selectedFixtureId} onValueChange={handleFixtureChange}>
              <SelectTrigger id="fixture">
                <SelectValue placeholder="Choose a fixture" />
              </SelectTrigger>
              <SelectContent>
                {fixtures.map((fixture) => (
                  <SelectItem key={fixture.id} value={fixture.id}>
                    {new Date(fixture.match_date).toLocaleDateString('en-GB')} - {fixture.home_team} vs {fixture.away_team}
                    {fixture.competition && ` (${fixture.competition})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="r90">R90 Score (Auto-calculated)</Label>
              <Input
                id="r90"
                type="number"
                step="0.01"
                value={
                  minutesPlayed && actions.length > 0
                    ? (
                        (actions.reduce((sum, a) => sum + (parseFloat(a.action_score) || 0), 0) / parseInt(minutesPlayed)) * 90
                      ).toFixed(2)
                    : r90Score
                }
                onChange={(e) => setR90Score(e.target.value)}
                placeholder="Calculated from actions"
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div>
              <Label htmlFor="minutes">Minutes Played *</Label>
              <Input
                id="minutes"
                type="number"
                value={minutesPlayed}
                onChange={(e) => setMinutesPlayed(e.target.value)}
                placeholder="e.g., 90"
              />
            </div>
            <div>
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Auto-filled from fixture"
              />
            </div>
            <div>
              <Label htmlFor="result">Result</Label>
              <Input
                id="result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="e.g., W 2-1"
              />
            </div>
          </div>

          {/* Optional Striker Stats */}
          <Collapsible open={showStrikerStats} onOpenChange={setShowStrikerStats}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full text-sm sm:text-base">
                {showStrikerStats ? "Hide" : "Show"} Additional Statistics (Optional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>xGChain</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xGChain}
                    onChange={(e) => setStrikerStats({...strikerStats, xGChain: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xGChain per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xGChain_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, xGChain_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xG (adj.)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xG_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, xG_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xG (adj.) per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xG_adj_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, xG_adj_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xA (adj.)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xA_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, xA_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xA (adj.) per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xA_adj_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, xA_adj_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement In Behind xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_in_behind_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_in_behind_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement In Behind xC per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_in_behind_xC_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_in_behind_xC_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement Down Side xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_down_side_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_down_side_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement Down Side xC per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_down_side_xC_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_down_side_xC_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Triple Threat xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.triple_threat_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, triple_threat_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Triple Threat xC per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.triple_threat_xC_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, triple_threat_xC_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement To Feet xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_to_feet_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_to_feet_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement To Feet xC per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_to_feet_xC_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_to_feet_xC_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Crossing Movement xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.crossing_movement_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, crossing_movement_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Crossing Movement xC per90</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.crossing_movement_xC_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, crossing_movement_xC_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Interceptions</Label>
                  <Input
                    type="number"
                    value={strikerStats.interceptions}
                    onChange={(e) => setStrikerStats({...strikerStats, interceptions: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Interceptions per90</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.interceptions_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, interceptions_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Regains (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.regains_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, regains_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Regains (Adj.) per90</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.regains_adj_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, regains_adj_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Turnovers (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.turnovers_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, turnovers_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Turnovers (Adj.) per90</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.turnovers_adj_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, turnovers_adj_per90: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Progressive Passes (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.progressive_passes_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, progressive_passes_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Progressive Passes (Adj.) per90</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.progressive_passes_adj_per90}
                    onChange={(e) => setStrikerStats({...strikerStats, progressive_passes_adj_per90: e.target.value})}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Performance Actions */}
          <div>
            <div className="mb-4">
              <Label className="text-base sm:text-lg font-semibold">Performance Actions *</Label>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-4 sm:hidden">
              {actions.map((action, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Action #{action.action_number}</span>
                    <Button
                      onClick={() => removeAction(index)}
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-8 w-8"
                      disabled={actions.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Minute *</Label>
                      <Input
                        type="text"
                        value={action.minute}
                        onChange={(e) => updateAction(index, "minute", e.target.value)}
                        placeholder="2.30"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Score</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        value={action.action_score}
                        onChange={(e) => updateAction(index, "action_score", e.target.value)}
                        placeholder="0.15"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Action Type *</Label>
                    <Input
                      list="action-types-list"
                      value={action.action_type}
                      onChange={(e) => updateAction(index, "action_type", e.target.value)}
                      placeholder="Select or type new"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Description *</Label>
                    <Textarea
                      value={action.action_description}
                      onChange={(e) => updateAction(index, "action_description", e.target.value)}
                      placeholder="Describe the action"
                      className="text-sm min-h-[60px]"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={action.notes}
                      onChange={(e) => updateAction(index, "notes", e.target.value)}
                      placeholder="Optional notes"
                      className="text-sm min-h-[60px]"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left p-2 text-sm font-semibold">#</th>
                    <th className="text-left p-2 text-sm font-semibold">Minute</th>
                    <th className="text-left p-2 text-sm font-semibold">Score</th>
                    <th className="text-left p-2 text-sm font-semibold">Type</th>
                    <th className="text-left p-2 text-sm font-semibold">Description</th>
                    <th className="text-left p-2 text-sm font-semibold">Notes</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-sm">{action.action_number}</td>
                      <td className="p-2">
                        <Input
                          type="text"
                          value={action.minute}
                          onChange={(e) => updateAction(index, "minute", e.target.value)}
                          placeholder="2.30"
                          className="w-20 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.00001"
                          value={action.action_score}
                          onChange={(e) => updateAction(index, "action_score", e.target.value)}
                          placeholder="0.15"
                          className="w-24 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          list="action-types-list"
                          value={action.action_type}
                          onChange={(e) => updateAction(index, "action_type", e.target.value)}
                          placeholder="Select or type"
                          className="w-40 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={action.action_description}
                          onChange={(e) => updateAction(index, "action_description", e.target.value)}
                          placeholder="Describe"
                          className="min-w-[180px] min-h-[40px] text-sm"
                          rows={1}
                        />
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={action.notes}
                          onChange={(e) => updateAction(index, "notes", e.target.value)}
                          placeholder="Notes"
                          className="min-w-[140px] min-h-[40px] text-sm"
                          rows={1}
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          onClick={() => removeAction(index)}
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-8 w-8"
                          disabled={actions.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <Button onClick={addAction} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>
          </div>

          {/* Datalist for action types */}
          <datalist id="action-types-list">
            {actionTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>

          {/* Save and Delete Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            {analysisId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting || loading} className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? "Deleting..." : "Delete Report"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Performance Report
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this performance report? This will permanently delete all associated data including performance actions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading || deleting} className="w-full sm:w-auto">
                {loading ? (analysisId ? "Updating..." : "Creating...") : (analysisId ? "Update Report" : "Create Report")}
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
