import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PerformanceAction {
  id: string;
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  action_description: string;
  notes: string | null;
}

interface StrikerStats {
  // Common stats (both positions)
  xGChain?: number;
  xGChain_per90?: number;
  xG_adj?: number;
  xG_adj_per90?: number;
  xA_adj?: number;
  xA_adj_per90?: number;
  // Striker-specific stats
  movement_in_behind_xC?: number;
  movement_in_behind_xC_per90?: number;
  movement_down_side_xC?: number;
  movement_down_side_xC_per90?: number;
  triple_threat_xC?: number;
  triple_threat_xC_per90?: number;
  movement_to_feet_xC?: number;
  movement_to_feet_xC_per90?: number;
  crossing_movement_xC?: number;
  crossing_movement_xC_per90?: number;
  // Defensive midfielder stats
  interceptions?: number;
  interceptions_per90?: number;
  regains_adj?: number;
  regains_adj_per90?: number;
  turnovers_adj?: number;
  turnovers_adj_per90?: number;
  progressive_passes_adj?: number;
  progressive_passes_adj_per90?: number;
}

interface AnalysisDetails {
  id: string;
  analysis_date: string;
  opponent: string;
  result: string;
  r90_score: number | null;
  minutes_played: number | null;
  player_name: string;
  striker_stats?: StrikerStats | null;
}

const PerformanceReport = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [actions, setActions] = useState<PerformanceAction[]>([]);

  useEffect(() => {
    if (analysisId) {
      fetchPerformanceData();
    }
  }, [analysisId]);

  const fetchPerformanceData = async () => {
    try {
      // Fetch analysis details with player name
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select(`
          *,
          players!inner (name)
        `)
        .eq("id", analysisId)
        .single();

      if (analysisError) throw analysisError;

      setAnalysis({
        id: analysisData.id,
        analysis_date: analysisData.analysis_date,
        opponent: analysisData.opponent || "",
        result: analysisData.result || "",
        r90_score: analysisData.r90_score,
        minutes_played: analysisData.minutes_played,
        player_name: analysisData.players?.name || "Unknown Player",
        striker_stats: analysisData.striker_stats as StrikerStats | null,
      });

      // Fetch performance actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("performance_report_actions")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("action_number", { ascending: true });

      if (actionsError) throw actionsError;

      setActions(actionsData || []);
    } catch (error: any) {
      console.error("Error fetching performance data:", error);
      toast.error("Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  const getActionScoreColor = (score: number) => {
    // Positive scores - greens
    if (score >= 0.15) return "text-green-800 font-bold"; // Dark green for excellent actions
    if (score >= 0.1) return "text-green-600 font-bold";  // Strong green for very good actions
    if (score >= 0.05) return "text-green-500 font-semibold"; // Medium green for good actions
    if (score >= 0.02) return "text-green-400"; // Light green for positive actions
    if (score > 0.005) return "text-lime-500"; // Very light green for small positive
    if (score > 0) return "text-lime-400"; // Minimal green for tiny positive
    
    // Zero
    if (score === 0) return "text-muted-foreground";
    
    // Negative scores - reds/oranges
    if (score > -0.005) return "text-orange-400"; // Minimal negative
    if (score > -0.02) return "text-orange-500"; // Small negative
    if (score > -0.04) return "text-red-400"; // Medium negative
    if (score > -0.06) return "text-red-500 font-semibold"; // Significant negative
    return "text-red-700 font-bold"; // Dark red for major errors
  };

  const calculateRScore = (): number => {
    const totalScore = actions.reduce((sum, action) => sum + action.action_score, 0);
    return totalScore;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Performance report not found</p>
              <Button onClick={() => navigate(-1)} className="mt-4 mx-auto block">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">Performance Report</CardTitle>
              <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Player</p>
                <p className="font-bold">{analysis.player_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-bold">{new Date(analysis.analysis_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opponent</p>
                <p className="font-bold">{analysis.opponent || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Result</p>
                <p className="font-bold">{analysis.result || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/20 rounded-lg">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Raw Score</p>
                <p className="text-xl md:text-2xl font-bold">{calculateRScore().toFixed(5)}</p>
              </div>
              <div className="text-center bg-primary text-primary-foreground rounded-lg p-4">
                <p className="text-xs md:text-sm mb-1 opacity-90">R90 Score</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {analysis.minutes_played 
                    ? ((calculateRScore() / analysis.minutes_played) * 90).toFixed(2)
                    : "N/A"
                  }
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Minutes Played</p>
                <p className="text-xl md:text-2xl font-bold">{analysis.minutes_played || "N/A"}</p>
              </div>
            </div>

            {analysis.striker_stats && (
              <div className="mt-6 p-4 bg-accent/10 rounded-lg border-2 border-primary/20">
                <h3 className="font-bold text-lg mb-4 text-primary">Additional Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.striker_stats.xGChain !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">xGChain</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.xGChain.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.xGChain_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.xG_adj !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">xG (adj.)</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.xG_adj.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.xG_adj_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.xA_adj !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">xA (adj.)</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.xA_adj.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.xA_adj_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.movement_in_behind_xC !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Movement In Behind xC</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.movement_in_behind_xC.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.movement_in_behind_xC_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.movement_down_side_xC !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Movement Down Side xC</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.movement_down_side_xC.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.movement_down_side_xC_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.triple_threat_xC !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Triple Threat xC</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.triple_threat_xC.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.triple_threat_xC_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.movement_to_feet_xC !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Movement To Feet xC</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.movement_to_feet_xC.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.movement_to_feet_xC_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.crossing_movement_xC !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Crossing Movement xC</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.crossing_movement_xC.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.crossing_movement_xC_per90?.toFixed(3)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.interceptions !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Interceptions</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.interceptions}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.interceptions_per90?.toFixed(2)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.regains_adj !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Regains (Adj.)</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.regains_adj}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.regains_adj_per90?.toFixed(2)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.turnovers_adj !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Turnovers (Adj.)</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.turnovers_adj}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.turnovers_adj_per90?.toFixed(2)}</p>
                    </div>
                  )}
                  {analysis.striker_stats.progressive_passes_adj !== undefined && (
                    <div className="text-center p-3 bg-background rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Progressive Passes (Adj.)</p>
                      <p className="font-bold text-lg">{analysis.striker_stats.progressive_passes_adj}</p>
                      <p className="text-xs text-muted-foreground mt-1">per 90: {analysis.striker_stats.progressive_passes_adj_per90?.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No performance actions recorded yet</p>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold text-xs md:text-sm whitespace-nowrap">#</th>
                      <th className="text-left p-2 font-semibold text-xs md:text-sm whitespace-nowrap">Minute</th>
                      <th className="text-left p-2 font-semibold text-xs md:text-sm whitespace-nowrap">Score</th>
                      <th className="text-left p-2 font-semibold text-xs md:text-sm whitespace-nowrap">Action</th>
                      <th className="text-left p-2 font-semibold text-xs md:text-sm">Description</th>
                      <th className="text-left p-2 font-semibold text-xs md:text-sm hidden md:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => (
                      <tr key={action.id} className="border-b hover:bg-accent/50">
                        <td className="p-2 text-xs md:text-sm whitespace-nowrap">{action.action_number}</td>
                        <td className="p-2 text-xs md:text-sm whitespace-nowrap">{action.minute.toFixed(2)}</td>
                        <td className={`p-2 text-xs md:text-sm whitespace-nowrap ${getActionScoreColor(action.action_score)}`}>
                          {action.action_score.toFixed(5)}
                        </td>
                        <td className="p-2 font-medium text-xs md:text-sm whitespace-nowrap">{action.action_type}</td>
                        <td className="p-2 text-xs md:text-sm">{action.action_description}</td>
                        <td className="p-2 text-xs md:text-sm text-muted-foreground hidden md:table-cell">{action.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PerformanceReport;
