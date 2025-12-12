import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { Download, X } from "lucide-react";
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
  [key: string]: number | string | any[] | undefined;
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
  performance_overview?: string | null;
}

interface PerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
}

export const PerformanceReportDialog = ({ open, onOpenChange, analysisId }: PerformanceReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [actions, setActions] = useState<PerformanceAction[]>([]);
  const [prefetchedId, setPrefetchedId] = useState<string | null>(null);

  // Pre-fetch data when analysisId changes (even before dialog opens)
  useEffect(() => {
    if (analysisId && analysisId !== prefetchedId) {
      fetchPerformanceData(analysisId);
    }
  }, [analysisId]);

  // Re-fetch if dialog opens with a different ID than what's cached
  useEffect(() => {
    if (open && analysisId && analysisId !== prefetchedId) {
      fetchPerformanceData(analysisId);
    }
  }, [open, analysisId, prefetchedId]);

  const fetchPerformanceData = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch both in parallel for faster loading
      const [analysisResult, actionsResult] = await Promise.all([
        supabase
          .from("player_analysis")
          .select(`
            *,
            players!inner (name)
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("performance_report_actions")
          .select("*")
          .eq("analysis_id", id)
          .order("action_number", { ascending: true })
      ]);

      if (analysisResult.error) throw analysisResult.error;

      setAnalysis({
        id: analysisResult.data.id,
        analysis_date: analysisResult.data.analysis_date,
        opponent: analysisResult.data.opponent || "",
        result: analysisResult.data.result || "",
        r90_score: analysisResult.data.r90_score,
        minutes_played: analysisResult.data.minutes_played,
        player_name: analysisResult.data.players?.name || "Unknown Player",
        striker_stats: analysisResult.data.striker_stats as StrikerStats | null,
        performance_overview: analysisResult.data.performance_overview,
      });

      if (actionsResult.error) throw actionsResult.error;
      setActions(actionsResult.data || []);
      
      // Mark this ID as prefetched
      setPrefetchedId(id);
    } catch (error: any) {
      console.error("Error fetching performance data:", error);
      toast.error("Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  const getActionScoreColor = (score: number) => {
    if (score >= 0.15) return "text-green-800 font-bold";
    if (score >= 0.1) return "text-green-600 font-bold";
    if (score >= 0.05) return "text-green-500 font-semibold";
    if (score >= 0.02) return "text-green-400";
    if (score > 0.005) return "text-lime-500";
    if (score > 0) return "text-lime-400";
    if (score === 0) return "text-muted-foreground";
    if (score > -0.005) return "text-orange-400";
    if (score > -0.02) return "text-orange-500";
    if (score > -0.04) return "text-red-400";
    if (score > -0.06) return "text-red-500 font-semibold";
    return "text-red-700 font-bold";
  };

  const calculateRScore = (): number => {
    return actions.reduce((sum, action) => sum + (action.action_score ?? 0), 0);
  };

  const calculateXGChain = (): number => {
    return actions.reduce((sum, action) => {
      const score = action.action_score ?? 0;
      return score > 0 ? sum + score : sum;
    }, 0);
  };

  const handleSaveAsPDF = () => {
    window.print();
  };

  // Format stat key to readable label
  const formatStatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Get advanced stats from striker_stats, excluding internal fields
  const getAdvancedStats = () => {
    if (!analysis?.striker_stats) return [];
    
    const excludeKeys = ['selected_stats', 'stats_order'];
    const stats: { key: string; value: number | string }[] = [];
    
    for (const [key, value] of Object.entries(analysis.striker_stats)) {
      if (excludeKeys.includes(key)) continue;
      if (typeof value === 'number' || typeof value === 'string') {
        stats.push({ key, value });
      }
    }
    
    return stats;
  };

  const advancedStats = getAdvancedStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bebas uppercase tracking-wider">Performance Report</h2>
          <div className="flex gap-2">
            <Button onClick={handleSaveAsPDF} variant="default" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Save as PDF
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-16 bg-muted rounded mb-2"></div>
                    <div className="h-6 w-24 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-4 p-4 bg-accent/20 rounded-lg">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center">
                    <div className="h-4 w-16 bg-muted rounded mx-auto mb-2"></div>
                    <div className="h-8 w-20 bg-muted rounded mx-auto"></div>
                  </div>
                ))}
              </div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
          ) : !analysis ? (
            <div className="text-center py-8 text-muted-foreground">Performance report not found</div>
          ) : (
            <div className="space-y-6">
              {/* Player Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/20 rounded-lg">
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
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">xG Chain</p>
                  <p className="text-xl md:text-2xl font-bold">{calculateXGChain().toFixed(3)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Minutes Played</p>
                  <p className="text-xl md:text-2xl font-bold">{analysis.minutes_played || "N/A"}</p>
                </div>
              </div>

              {/* Advanced Stats */}
              {advancedStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Match Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {advancedStats.map(({ key, value }) => (
                        <div key={key} className="text-center p-3 bg-accent/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1 capitalize">{formatStatLabel(key)}</p>
                          <p className="text-lg font-bold">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Overview */}
              {analysis.performance_overview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{analysis.performance_overview}</p>
                  </CardContent>
                </Card>
              )}

              {/* Performance Actions */}
              {actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Actions ({actions.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">#</th>
                            <th className="text-left py-2 px-2">Min</th>
                            <th className="text-left py-2 px-2">Type</th>
                            <th className="text-left py-2 px-2">Description</th>
                            <th className="text-left py-2 px-2">Notes</th>
                            <th className="text-right py-2 px-2">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actions.map((action) => (
                            <tr key={action.id} className="border-b border-border/50">
                              <td className="py-2 px-2">{action.action_number}</td>
                              <td className="py-2 px-2">{action.minute}'</td>
                              <td className="py-2 px-2">{action.action_type}</td>
                              <td className="py-2 px-2">{action.action_description}</td>
                              <td className="py-2 px-2 text-muted-foreground">{action.notes || "-"}</td>
                              <td className={`py-2 px-2 text-right ${getActionScoreColor(action.action_score)}`}>
                                {action.action_score?.toFixed(5)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
