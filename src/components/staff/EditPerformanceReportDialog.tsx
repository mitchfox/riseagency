import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown, Trash2 } from "lucide-react";

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
  id?: string;
  action_number: number;
  minute: number | string;
  action_score: number | string;
  action_type: string;
  action_description: string;
  notes: string;
}

interface EditPerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  onSuccess: () => void;
}

export function EditPerformanceReportDialog({
  open,
  onOpenChange,
  analysisId,
  onSuccess,
}: EditPerformanceReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");
  const [showStrikerStats, setShowStrikerStats] = useState(false);

  // Form data
  const [r90Score, setR90Score] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState("");
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");

  // Striker/midfielder stats
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
  const [actions, setActions] = useState<PerformanceAction[]>([]);

  useEffect(() => {
    if (open && analysisId) {
      fetchExistingData();
    }
  }, [open, analysisId]);

  const fetchExistingData = async () => {
    setLoadingData(true);
    try {
      // Fetch analysis data with player info
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select(`
          *,
          players!inner (id, name, email)
        `)
        .eq("id", analysisId)
        .single();

      if (analysisError) throw analysisError;

      // Populate form with existing data
      setPlayerId(analysisData.player_id);
      setPlayerName(analysisData.players.name);
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

      setActions(
        actionsData.map((action) => ({
          id: action.id,
          action_number: action.action_number,
          minute: action.minute.toString(),
          action_score: action.action_score.toString(),
          action_type: action.action_type,
          action_description: action.action_description,
          notes: action.notes || "",
        }))
      );

      // Fetch player fixtures
      const { data: fixturesData, error: fixturesError } = await supabase
        .from("player_fixtures")
        .select(`
          fixture_id,
          fixtures!inner (*)
        `)
        .eq("player_id", analysisData.player_id)
        .order("fixtures(match_date)", { ascending: false });

      if (fixturesError) throw fixturesError;

      const formattedFixtures = fixturesData.map((pf: any) => ({
        id: pf.fixtures.id,
        match_date: pf.fixtures.match_date,
        home_team: pf.fixtures.home_team,
        away_team: pf.fixtures.away_team,
        competition: pf.fixtures.competition,
        home_score: pf.fixtures.home_score,
        away_score: pf.fixtures.away_score,
      }));

      setFixtures(formattedFixtures);
    } catch (error: any) {
      console.error("Error fetching existing data:", error);
      toast.error("Failed to load performance report data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleFixtureChange = (fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (fixture) {
      setOpponent(`${fixture.home_team} vs ${fixture.away_team}`);
      if (fixture.home_score !== null && fixture.away_score !== null) {
        setResult(`${fixture.home_score}-${fixture.away_score}`);
      }
    }
  };

  const addAction = () => {
    const newActionNumber = actions.length > 0 ? Math.max(...actions.map((a) => a.action_number)) + 1 : 1;
    setActions([
      ...actions,
      {
        action_number: newActionNumber,
        minute: "",
        action_score: "",
        action_type: "",
        action_description: "",
        notes: "",
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof PerformanceAction, value: string | number) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleSave = async () => {
    if (!r90Score || !minutesPlayed) {
      toast.error("Please fill in all required fields (R90 Score, Minutes Played)");
      return;
    }

    if (actions.length === 0) {
      toast.error("Please add at least one performance action");
      return;
    }

    setLoading(true);
    try {
      // Prepare striker stats JSONB
      const hasStrikerStats = Object.values(strikerStats).some((val) => val !== "");
      const strikerStatsData = hasStrikerStats
        ? Object.entries(strikerStats).reduce((acc, [key, value]) => {
            if (value !== "") {
              acc[key] = parseFloat(value);
            }
            return acc;
          }, {} as any)
        : null;

      // Update player_analysis record
      const { error: analysisError } = await supabase
        .from("player_analysis")
        .update({
          fixture_id: selectedFixtureId || null,
          r90_score: parseFloat(r90Score),
          minutes_played: parseInt(minutesPlayed),
          opponent: opponent || null,
          result: result || null,
          striker_stats: strikerStatsData,
        })
        .eq("id", analysisId);

      if (analysisError) throw analysisError;

      // Delete existing actions
      const { error: deleteError } = await supabase
        .from("performance_report_actions")
        .delete()
        .eq("analysis_id", analysisId);

      if (deleteError) throw deleteError;

      // Insert updated actions
      const actionsToInsert = actions.map((action) => ({
        analysis_id: analysisId,
        action_number: action.action_number,
        minute: parseFloat(action.minute.toString()),
        action_score: parseFloat(action.action_score.toString()),
        action_type: action.action_type,
        action_description: action.action_description,
        notes: action.notes || null,
      }));

      const { error: actionsError } = await supabase
        .from("performance_report_actions")
        .insert(actionsToInsert);

      if (actionsError) throw actionsError;

      toast.success("Performance report updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating performance report:", error);
      toast.error("Failed to update performance report");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Performance Report</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Performance Report - {playerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fixture Selection */}
          <div>
            <Label htmlFor="fixture">Fixture</Label>
            <Select value={selectedFixtureId} onValueChange={handleFixtureChange}>
              <SelectTrigger id="fixture">
                <SelectValue placeholder="Select fixture (optional)" />
              </SelectTrigger>
              <SelectContent>
                {fixtures.map((fixture) => (
                  <SelectItem key={fixture.id} value={fixture.id}>
                    {new Date(fixture.match_date).toLocaleDateString("en-GB")} -{" "}
                    {fixture.home_team} vs {fixture.away_team}{" "}
                    {fixture.competition && `(${fixture.competition})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="r90Score">R90 Score *</Label>
              <Input
                id="r90Score"
                type="number"
                step="0.01"
                value={r90Score}
                onChange={(e) => setR90Score(e.target.value)}
                placeholder="e.g., 0.45"
              />
            </div>
            <div>
              <Label htmlFor="minutesPlayed">Minutes Played *</Label>
              <Input
                id="minutesPlayed"
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
                placeholder="e.g., Arsenal FC"
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

          {/* Optional Striker/Midfielder Stats */}
          <Collapsible open={showStrikerStats} onOpenChange={setShowStrikerStats}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                Advanced Statistics (Optional)
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Common Stats */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Common Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="xGChain" className="text-xs">xGChain</Label>
                    <Input
                      id="xGChain"
                      type="number"
                      step="0.001"
                      value={strikerStats.xGChain}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xGChain: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="xGChain_per90" className="text-xs">xGChain per 90</Label>
                    <Input
                      id="xGChain_per90"
                      type="number"
                      step="0.001"
                      value={strikerStats.xGChain_per90}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xGChain_per90: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="xG_adj" className="text-xs">xG (adj.)</Label>
                    <Input
                      id="xG_adj"
                      type="number"
                      step="0.001"
                      value={strikerStats.xG_adj}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xG_adj: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="xG_adj_per90" className="text-xs">xG (adj.) per 90</Label>
                    <Input
                      id="xG_adj_per90"
                      type="number"
                      step="0.001"
                      value={strikerStats.xG_adj_per90}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xG_adj_per90: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="xA_adj" className="text-xs">xA (adj.)</Label>
                    <Input
                      id="xA_adj"
                      type="number"
                      step="0.001"
                      value={strikerStats.xA_adj}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xA_adj: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="xA_adj_per90" className="text-xs">xA (adj.) per 90</Label>
                    <Input
                      id="xA_adj_per90"
                      type="number"
                      step="0.001"
                      value={strikerStats.xA_adj_per90}
                      onChange={(e) => setStrikerStats({ ...strikerStats, xA_adj_per90: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                </div>
              </div>

              {/* Striker-Specific Stats */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Striker Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries({
                    movement_in_behind_xC: "Movement In Behind xC",
                    movement_in_behind_xC_per90: "Movement In Behind xC per 90",
                    movement_down_side_xC: "Movement Down Side xC",
                    movement_down_side_xC_per90: "Movement Down Side xC per 90",
                    triple_threat_xC: "Triple Threat xC",
                    triple_threat_xC_per90: "Triple Threat xC per 90",
                    movement_to_feet_xC: "Movement To Feet xC",
                    movement_to_feet_xC_per90: "Movement To Feet xC per 90",
                    crossing_movement_xC: "Crossing Movement xC",
                    crossing_movement_xC_per90: "Crossing Movement xC per 90",
                  }).map(([key, label]) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-xs">{label}</Label>
                      <Input
                        id={key}
                        type="number"
                        step="0.001"
                        value={strikerStats[key as keyof typeof strikerStats]}
                        onChange={(e) => setStrikerStats({ ...strikerStats, [key]: e.target.value })}
                        placeholder="0.000"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Defensive Midfielder Stats */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Defensive Midfielder Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries({
                    interceptions: "Interceptions",
                    interceptions_per90: "Interceptions per 90",
                    regains_adj: "Regains (Adj.)",
                    regains_adj_per90: "Regains (Adj.) per 90",
                    turnovers_adj: "Turnovers (Adj.)",
                    turnovers_adj_per90: "Turnovers (Adj.) per 90",
                    progressive_passes_adj: "Progressive Passes (Adj.)",
                    progressive_passes_adj_per90: "Progressive Passes (Adj.) per 90",
                  }).map(([key, label]) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-xs">{label}</Label>
                      <Input
                        id={key}
                        type="number"
                        step={key.includes("per90") ? "0.01" : "1"}
                        value={strikerStats[key as keyof typeof strikerStats]}
                        onChange={(e) => setStrikerStats({ ...strikerStats, [key]: e.target.value })}
                        placeholder={key.includes("per90") ? "0.00" : "0"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Performance Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Performance Actions</Label>
              <Button onClick={addAction} type="button" variant="outline" size="sm">
                Add Action
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted text-xs font-semibold">
                    <th className="p-2 text-left w-12">#</th>
                    <th className="p-2 text-left w-20">Min</th>
                    <th className="p-2 text-left w-24">Score</th>
                    <th className="p-2 text-left w-32">Type</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left w-48">Notes</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action, index) => (
                    <tr key={index} className="border-t hover:bg-muted/50">
                      <td className="p-2">
                        <Input
                          type="number"
                          value={action.action_number}
                          onChange={(e) => updateAction(index, "action_number", parseInt(e.target.value) || 0)}
                          className="w-full h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={action.minute}
                          onChange={(e) => updateAction(index, "minute", e.target.value)}
                          placeholder="45.5"
                          className="w-full h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.00001"
                          value={action.action_score}
                          onChange={(e) => updateAction(index, "action_score", e.target.value)}
                          placeholder="0.05"
                          className="w-full h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={action.action_type}
                          onChange={(e) => updateAction(index, "action_type", e.target.value)}
                          placeholder="Pressing"
                          className="w-full h-8 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={action.action_description}
                          onChange={(e) => updateAction(index, "action_description", e.target.value)}
                          placeholder="Describe the action..."
                          className="w-full min-h-8 text-xs resize-none"
                          rows={1}
                        />
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={action.notes}
                          onChange={(e) => updateAction(index, "notes", e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full min-h-8 text-xs resize-none"
                          rows={1}
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          onClick={() => removeAction(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button onClick={() => onOpenChange(false)} variant="outline" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
