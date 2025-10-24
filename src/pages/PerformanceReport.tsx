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

interface AnalysisDetails {
  id: string;
  analysis_date: string;
  opponent: string;
  result: string;
  r90_score: number | null;
  minutes_played: number | null;
  player_name: string;
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

  const calculateRScore = () => {
    const totalScore = actions.reduce((sum, action) => sum + action.action_score, 0);
    return totalScore.toFixed(5);
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
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">Performance Report</CardTitle>
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

            <div className="grid grid-cols-3 gap-4 p-4 bg-accent/20 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">R Score</p>
                <p className="text-2xl font-bold">{calculateRScore()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">R90 Score</p>
                <p className="text-2xl font-bold">{analysis.r90_score?.toFixed(2) || "N/A"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Minutes Played</p>
                <p className="text-2xl font-bold">{analysis.minutes_played || "N/A"}</p>
              </div>
            </div>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">#</th>
                      <th className="text-left p-2 font-semibold">Minute</th>
                      <th className="text-left p-2 font-semibold">Score</th>
                      <th className="text-left p-2 font-semibold">Action</th>
                      <th className="text-left p-2 font-semibold">Description</th>
                      <th className="text-left p-2 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => (
                      <tr key={action.id} className="border-b hover:bg-accent/50">
                        <td className="p-2">{action.action_number}</td>
                        <td className="p-2">{action.minute.toFixed(2)}</td>
                        <td className={`p-2 ${getActionScoreColor(action.action_score)}`}>
                          {action.action_score.toFixed(5)}
                        </td>
                        <td className="p-2 font-medium">{action.action_type}</td>
                        <td className="p-2 text-sm">{action.action_description}</td>
                        <td className="p-2 text-sm text-muted-foreground">{action.notes || "-"}</td>
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
