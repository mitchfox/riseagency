import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { extractAnalysisIdFromSlug } from "@/lib/urlHelpers";
import { SEO } from "@/components/SEO";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  [key: string]: number | undefined;
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
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [actions, setActions] = useState<PerformanceAction[]>([]);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const analysisId = slug ? extractAnalysisIdFromSlug(slug) : null;

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
    const totalScore = actions.reduce((sum, action) => sum + (action.action_score ?? 0), 0);
    return totalScore;
  };

  const handleSaveAsPDF = async () => {
    if (!contentRef.current || !analysis) return;
    
    setIsSavingPdf(true);
    toast.info("Generating PDF...");

    try {
      // Scroll to top to ensure everything is rendered
      window.scrollTo(0, 0);
      
      // Wait a bit for any rendering to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowHeight: document.documentElement.scrollHeight,
        height: contentRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      
      const fileName = `${analysis.player_name}_vs_${analysis.opponent}_${new Date(analysis.analysis_date).toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF saved successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsSavingPdf(false);
    }
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
      <SEO 
        title={`${analysis.player_name} vs ${analysis.opponent} - Performance Report | RISE Sports`}
        description={`Detailed performance analysis for ${analysis.player_name} in the match against ${analysis.opponent} on ${new Date(analysis.analysis_date).toLocaleDateString('en-GB')}. R90 Score: ${analysis.minutes_played ? ((calculateRScore() / analysis.minutes_played) * 90).toFixed(2) : 'N/A'}.`}
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div ref={contentRef}>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">Performance Report</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveAsPDF} 
                  variant="outline" 
                  size="sm"
                  disabled={isSavingPdf}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isSavingPdf ? "Generating..." : "Save as PDF"}
                </Button>
                <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
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

            {analysis.striker_stats && Object.keys(analysis.striker_stats).some(key => analysis.striker_stats![key] !== null && analysis.striker_stats![key] !== undefined) && (
              <div className="mt-6 p-4 bg-accent/10 rounded-lg border-2 border-primary/20">
                <h3 className="font-bold text-lg mb-4 text-primary">Additional Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysis.striker_stats)
                    .filter(([key, value]) => value !== null && value !== undefined && !key.includes('_per90'))
                    .map(([key, value]) => {
                      const per90Key = `${key}_per90`;
                      const per90Value = analysis.striker_stats![per90Key];
                      const displayName = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())
                        .replace(/Xg/g, 'xG')
                        .replace(/Xa/g, 'xA')
                        .replace(/Xc/g, 'xC')
                        .replace(/Adj/g, '(adj.)');
                      
                      return (
                        <div key={key} className="text-center p-3 bg-background rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">{displayName}</p>
                          <p className="font-bold text-lg">
                            {typeof value === 'number' 
                              ? (key.includes('turnovers') || key.includes('interceptions') || key.includes('progressive_passes') || key.includes('regains'))
                                ? Math.round(value)
                                : value < 10 
                                  ? value.toFixed(3) 
                                  : value
                              : value}
                          </p>
                          {per90Value !== undefined && per90Value !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              per 90: {typeof per90Value === 'number' 
                                ? per90Value < 10 
                                  ? per90Value.toFixed(3) 
                                  : per90Value
                                : per90Value}
                            </p>
                          )}
                        </div>
                      );
                    })}
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
                        <td className="p-2 text-xs md:text-sm whitespace-nowrap">{(action.minute ?? 0).toFixed(2)}</td>
                        <td className={`p-2 text-xs md:text-sm whitespace-nowrap ${getActionScoreColor(action.action_score ?? 0)}`}>
                          {(action.action_score ?? 0).toFixed(5)}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PerformanceReport;
