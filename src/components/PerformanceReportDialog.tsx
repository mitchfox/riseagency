import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { Download, X, ImageIcon, Video, Play } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { ActionVideoPopup } from "@/components/ActionVideoPopup";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";

// Format minute as MM.SS with proper zero padding (e.g., 0.3 → "0.30", 10.5 → "10.50")
const formatMinute = (minute: number | null | undefined): string => {
  if (minute === null || minute === undefined) return "-";
  const minPart = Math.floor(minute);
  const secPart = Math.round((minute - minPart) * 100);
  return `${minPart}.${secPart.toString().padStart(2, '0')}`;
};

interface PerformanceAction {
  id: string;
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  action_description: string;
  notes: string | null;
  video_url?: string | null;
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
  const [savingImage, setSavingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [showClippedActions, setShowClippedActions] = useState(false);

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

  const handleSaveAsWebp = async () => {
    if (!contentRef.current || !analysis) return;
    
    setSavingImage(true);
    try {
      // Temporarily add background for capture
      const originalBg = contentRef.current.style.backgroundColor;
      contentRef.current.style.backgroundColor = '#000000';
      
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#000000',
        useCORS: true,
        logging: false,
        scale: 2,
      } as any);
      
      // Restore original background
      contentRef.current.style.backgroundColor = originalBg;
      
      const fileName = `${analysis.player_name}-vs-${analysis.opponent}-performance-report`;
      
      // Check if on mobile (touch device or small screen)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      
      if (isMobile) {
        // On mobile, convert to PNG dataURL and open in new tab for long-press save
        // Using dataURL instead of blob for better mobile compatibility
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        
        if (!dataUrl || dataUrl === 'data:,') {
          toast.error('Failed to create image');
          return;
        }
        
        // Open image in new tab - user can long-press to save
        const newTab = window.open();
        if (newTab) {
          newTab.document.write(`<html><head><title>${fileName}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;}</style></head><body><img src="${dataUrl}" style="max-width:100%;height:auto;" /></body></html>`);
          newTab.document.close();
          toast.success('Image opened - long-press to save');
        } else {
          // If popup blocked, try download
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${fileName}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Image saved');
        }
      } else {
        // On desktop, use WebP with direct download
        const dataUrl = canvas.toDataURL('image/webp', 0.9);
        const link = document.createElement('a');
        link.download = `${fileName}.webp`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Image saved successfully');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image');
    } finally {
      setSavingImage(false);
    }
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
    const stats: { 
      key: string; 
      value: number | string; 
      per90Value?: number | string;
      isPaired?: boolean;
      successful?: number;
      attempted?: number;
      percentage?: string;
    }[] = [];
    const processedKeys = new Set<string>();
    
    // Get ordered stats if available
    const statsOrder = analysis.striker_stats.stats_order as string[] | undefined;
    const selectedStats = analysis.striker_stats.selected_stats as string[] | undefined;
    
    // Use stats_order if available, otherwise use selected_stats, otherwise use all keys
    // Filter out internal keys from whatever source we use
    const rawKeysToShow = statsOrder || selectedStats || Object.keys(analysis.striker_stats);
    const keysToShow = rawKeysToShow.filter(key => !excludeKeys.includes(key));
    
    for (const key of keysToShow) {
      if (key.includes('_per90')) continue;
      if (processedKeys.has(key)) continue;
      if (key.includes('_per90')) continue;
      if (processedKeys.has(key)) continue;
      
      const value = analysis.striker_stats[key];
      // Skip stats that haven't been filled in
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.trim() === '') continue;
      if (typeof value === 'number' && isNaN(value)) continue;
      
      // Check for paired stat (e.g., dribbles + dribbles_attempted)
      const attemptedKey = `${key}_attempted`;
      if (analysis.striker_stats[attemptedKey] != null && !key.endsWith('_attempted')) {
        const attempted = Number(analysis.striker_stats[attemptedKey]);
        const successful = Number(value);
        if (attempted > 0 && !isNaN(successful)) {
          processedKeys.add(attemptedKey);
          const per90Key = `${key}_per90`;
          const per90Value = analysis.striker_stats[per90Key];
          stats.push({
            key,
            value: successful,
            per90Value: per90Value !== null && per90Value !== undefined ? per90Value as number | string : undefined,
            isPaired: true,
            successful,
            attempted,
            percentage: ((successful / attempted) * 100).toFixed(1)
          });
          continue;
        }
      }
      
      // Skip _attempted keys (they're shown with their pair)
      if (key.endsWith('_attempted')) {
        processedKeys.add(key);
        continue;
      }
      
      if (typeof value !== 'number' && typeof value !== 'string') continue;
      
      // Only show per90 for rate-based stats (xG, xA, xC, xGChain types), not count-based stats
      const keyLower = key.toLowerCase();
      const rateBasedPrefixes = ['xg', 'xa', 'xc', 'xgchain'];
      const isRateBased = rateBasedPrefixes.some(prefix => keyLower.includes(prefix));
      
      const per90Key = `${key}_per90`;
      const per90Value = isRateBased ? analysis.striker_stats[per90Key] : undefined;
      
      stats.push({ 
        key, 
        value,
        per90Value: per90Value !== null && per90Value !== undefined ? per90Value as number | string : undefined
      });
    }
    
    return stats;
  };

  const advancedStats = getAdvancedStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-3 md:p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg md:text-xl font-bebas uppercase tracking-wider">Performance Report</h2>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSaveAsWebp} variant="default" size="sm" className="flex-1 md:flex-none" disabled={savingImage || loading}>
              <ImageIcon className="mr-2 h-4 w-4" />
              {savingImage ? 'Saving...' : 'Save as Image'}
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="flex-1 md:flex-none">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/20 rounded-lg">
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
            <div ref={contentRef} className="space-y-6 bg-background p-4 rounded-lg">
              {/* Player Info with Clipped Actions Button */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
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
                
                {/* Clipped Actions Button */}
                {actions.filter(a => a.video_url).length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold flex items-center gap-2"
                    onClick={() => setShowClippedActions(true)}
                  >
                    <Play className="h-4 w-4" />
                    Clipped Actions ({actions.filter(a => a.video_url).length})
                  </Button>
                )}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/20 rounded-lg">
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Raw Score</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {actions.length > 0 ? calculateRScore().toFixed(5) : (analysis.r90_score !== null && analysis.minutes_played ? ((analysis.r90_score / 90) * analysis.minutes_played).toFixed(5) : "N/A")}
                  </p>
                </div>
                <div className="text-center bg-primary text-primary-foreground rounded-lg p-4">
                  <p className="text-xs md:text-sm mb-1 opacity-90">R90 Score</p>
                  <p className="text-2xl md:text-3xl font-bold">
                    {analysis.r90_score !== null 
                      ? analysis.r90_score.toFixed(2)
                      : analysis.minutes_played && actions.length > 0
                        ? ((calculateRScore() / analysis.minutes_played) * 90).toFixed(2)
                        : "N/A"
                    }
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">xG Chain</p>
                  <p className="text-xl md:text-2xl font-bold">{actions.length > 0 ? calculateXGChain().toFixed(3) : "N/A"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Minutes Played</p>
                  <p className="text-xl md:text-2xl font-bold">{analysis.minutes_played ?? "N/A"}</p>
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
                      {advancedStats.map((stat) => (
                        <div key={stat.key} className="text-center p-3 bg-accent/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1 capitalize">{formatStatLabel(stat.key)}</p>
                          {stat.isPaired ? (
                            <>
                              <p className="text-lg font-bold">{stat.percentage}%</p>
                              <p className="text-xs text-muted-foreground">{stat.successful} / {stat.attempted}</p>
                            </>
                          ) : (
                            <p className="text-lg font-bold">{stat.value}</p>
                          )}
                          {stat.per90Value !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              per 90: {stat.per90Value}
                            </p>
                          )}
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
                    {/* Mobile: Card layout */}
                    <div className="block md:hidden space-y-3">
                      {actions.map((action) => (
                        <div key={action.id} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex gap-3 items-center">
                              <span className="font-semibold">#{action.action_number}</span>
                              <span className="text-sm text-muted-foreground">{formatMinute(action.minute)}'</span>
                              {action.video_url && (
                                <button
                                  onClick={() => {
                                    setSelectedVideoUrl(action.video_url!);
                                    setSelectedVideoTitle(`#${action.action_number} - ${action.action_type}`);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-black px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"
                                >
                                  <Video className="h-3 w-3" />
                                  Clip
                                </button>
                              )}
                            </div>
                            <span className={`text-sm font-bold ${getActionScoreColor(action.action_score)}`}>
                              {action.action_score?.toFixed(5)}
                            </span>
                          </div>
                          <div className="font-medium text-sm mb-1">{action.action_type}</div>
                          <div className="text-sm text-foreground/80">{action.action_description}</div>
                          {action.notes && (
                            <div className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border/50">
                              {action.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">#</th>
                            <th className="text-left py-2 px-2">Min</th>
                            <th className="text-left py-2 px-2">Type</th>
                            <th className="text-left py-2 px-2">Description</th>
                            <th className="text-left py-2 px-2">Notes</th>
                            <th className="text-right py-2 px-2">Score</th>
                            <th className="text-center py-2 px-2">Clip</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actions.map((action) => (
                            <tr key={action.id} className="border-b border-border/50">
                              <td className="py-2 px-2">{action.action_number}</td>
                              <td className="py-2 px-2">{formatMinute(action.minute)}'</td>
                              <td className="py-2 px-2">{action.action_type}</td>
                              <td className="py-2 px-2">{action.action_description}</td>
                              <td className="py-2 px-2 text-muted-foreground">{action.notes || "-"}</td>
                              <td className={`py-2 px-2 text-right ${getActionScoreColor(action.action_score)}`}>
                                {action.action_score?.toFixed(5)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {action.video_url ? (
                                  <button
                                    onClick={() => {
                                      setSelectedVideoUrl(action.video_url!);
                                      setSelectedVideoTitle(`#${action.action_number} - ${action.action_type}`);
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-black px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1"
                                  >
                                    <Video className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
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

      {/* Video Popup for single action */}
      {selectedVideoUrl && (
        <ActionVideoPopup
          open={!!selectedVideoUrl}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVideoUrl(null);
              setSelectedVideoTitle("");
            }
          }}
          videoUrl={selectedVideoUrl}
          actionTitle={selectedVideoTitle}
        />
      )}

      {/* Clipped Actions Player */}
      <ClippedActionsPlayer
        open={showClippedActions}
        onOpenChange={setShowClippedActions}
        clips={actions
          .filter(a => a.video_url)
          .map(a => ({
            id: a.id,
            action_number: a.action_number,
            action_type: a.action_type,
            action_description: a.action_description,
            video_url: a.video_url!,
            minute: a.minute,
          }))}
      />
    </Dialog>
  );
};
