import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { Download, X, ImageIcon, Video, Play, Calculator, TrendingUp, BarChart3, Film, Award, HelpCircle, Link2, MessageSquareText, Filter, Lock, MapPin, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { ActionVideoPopup } from "@/components/ActionVideoPopup";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";
import { STAT_TYPE_CONFIGS, StatTypeConfig } from "@/components/staff/ActionStatRecorder";
import { R90FlowChart } from "@/components/report/R90FlowChart";
import { ActionHeatmap } from "@/components/report/ActionHeatmap";
import { ChanceCreationFlow } from "@/components/report/ChanceCreationFlow";
import { RankedActionsPlayer } from "@/components/report/RankedActionsPlayer";
import { PitchHeatmap } from "@/components/report/PitchHeatmap";
import { ZonePerformance } from "@/components/report/ZonePerformance";
import { toTitleCase } from "@/lib/titleCase";
import { sortActionsByMinute } from "@/lib/actionSorting";
import { t, normalizePortalLanguage } from "@/lib/portalTranslations";

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
  zone?: number | null;
  zone_details?: any | null;
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
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
}

interface PerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  isPortalView?: boolean;
}

export const PerformanceReportDialog = ({ open, onOpenChange, analysisId, isPortalView = false }: PerformanceReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [actions, setActions] = useState<PerformanceAction[]>([]);
  const [prefetchedId, setPrefetchedId] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [showR90Flow, setShowR90Flow] = useState(false);
  const [showR90Info, setShowR90Info] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPitchHeatmap, setShowPitchHeatmap] = useState(false);
  const [showZonePerformance, setShowZonePerformance] = useState(false);
  const [showChanceCreation, setShowChanceCreation] = useState(false);
  const [showRankedPlayer, setShowRankedPlayer] = useState(false);
  const [rankedMode, setRankedMode] = useState<"chronological" | "ranked" | "noted">("chronological");
  const [showClippedActions, setShowClippedActions] = useState(false);
  const [showFilteredPlayer, setShowFilteredPlayer] = useState(false);
  const [showActionFilters, setShowActionFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterRating, setFilterRating] = useState<string | null>(null);
  const [filterHasNotes, setFilterHasNotes] = useState(false);

  const portalLanguage = isPortalView ? (localStorage.getItem("portal_language_hint") || "en") : "en";
  const portalLocale = normalizePortalLanguage(portalLanguage) === "fr" ? "fr-FR" : "en-GB";

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
        visibility_status: (analysisResult.data as any).visibility_status || "live",
        placeholder_raw_score: (analysisResult.data as any).placeholder_raw_score,
        placeholder_minutes: (analysisResult.data as any).placeholder_minutes,
      });

      if (actionsResult.error) throw actionsResult.error;
      setActions(sortActionsByMinute((actionsResult.data || []) as any));
      
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

  // Format stat key to readable label using config lookup
  const formatStatLabel = (key: string): string => {
    // Try exact match first
    let config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key === key);
    if (config) return config.name;
    
    // Try lowercase match
    const keyLower = key.toLowerCase();
    config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key.toLowerCase() === keyLower);
    if (config) return config.name;
    
    // Fallback to formatted key
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
      
      // Check for paired stat patterns:
      // Pattern 1: dribbles + dribbles_attempted
      // Pattern 2: aerial_duels_won + aerial_duels_attempted
      // Pattern 3: long_passes_completed + long_passes_attempted
      let attemptedKey = `${key}_attempted`;
      let baseKey = key;
      
      // Handle _won suffix (e.g., aerial_duels_won -> aerial_duels_attempted)
      if (key.endsWith('_won')) {
        baseKey = key.replace('_won', '');
        attemptedKey = `${baseKey}_attempted`;
      }
      // Handle _completed suffix (e.g., long_passes_completed -> long_passes_attempted)
      else if (key.endsWith('_completed')) {
        baseKey = key.replace('_completed', '');
        attemptedKey = `${baseKey}_attempted`;
      }
      
      if (analysis.striker_stats[attemptedKey] != null && !key.endsWith('_attempted')) {
        const attempted = Number(analysis.striker_stats[attemptedKey]);
        const successful = Number(value);
        // Show paired stats even if attempted is 0 (display as 0/0)
        if (!isNaN(attempted) && !isNaN(successful)) {
          processedKeys.add(attemptedKey);
          const per90Key = `${key}_per90`;
          const per90Value = analysis.striker_stats[per90Key];
          stats.push({
            key: baseKey !== key ? baseKey : key, // Use cleaner base key for display
            value: successful,
            per90Value: per90Value !== null && per90Value !== undefined ? per90Value as number | string : undefined,
            isPaired: true,
            successful,
            attempted,
            percentage: attempted > 0 ? ((successful / attempted) * 100).toFixed(1) : '0'
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

  // Calculate derived stats from the base stats
  const getCalculatedStats = () => {
    if (!analysis?.striker_stats) return [];
    
    const strikerStats = analysis.striker_stats;
    const calculated: { key: string; displayName: string; value: number; description: string }[] = [];
    
    // Helper to get a numeric value from striker_stats
    const getVal = (key: string): number | null => {
      const val = strikerStats[key];
      if (val === null || val === undefined) return null;
      return typeof val === 'number' ? val : null;
    };
    
    const getSuccessVal = (baseKey: string): number | null => {
      return getVal(`${baseKey}_successful`) ?? getVal(baseKey);
    };
    
    const getTotalVal = (baseKey: string): number | null => {
      return getVal(`${baseKey}_total`) ?? getVal(`${baseKey}_attempted`);
    };
    
    // Recovery to Turnover Ratio
    const recoveries = getVal('recoveries');
    const turnovers = getVal('turnovers');
    if (recoveries !== null && turnovers !== null) {
      const ratio = turnovers === 0 ? (recoveries > 0 ? recoveries : 0) : recoveries / turnovers;
      calculated.push({
        key: 'recovery_turnover_ratio',
        displayName: 'Recovery/Turnover',
        value: ratio,
        description: 'Recoveries ÷ Turnovers'
      });
    }
    
    // PP to Turnovers Ratio
    const ppSuccess = getSuccessVal('progressive_passes');
    if (ppSuccess !== null && turnovers !== null) {
      const ratio = turnovers === 0 ? (ppSuccess > 0 ? ppSuccess : 0) : ppSuccess / turnovers;
      calculated.push({
        key: 'pp_turnovers_ratio',
        displayName: 'PP/Turnovers',
        value: ratio,
        description: 'Progressive Passes ÷ Turnovers'
      });
    }
    
    // Aerial Duel Win %
    const aerialSuccess = getSuccessVal('aerial_duels');
    const aerialTotal = getTotalVal('aerial_duels');
    if (aerialSuccess !== null && aerialTotal !== null && aerialTotal > 0) {
      calculated.push({
        key: 'aerial_duel_win_pct',
        displayName: 'Aerial Duel Win %',
        value: (aerialSuccess / aerialTotal) * 100,
        description: 'Aerial Duels Won ÷ Total'
      });
    }
    
    // Pass Completion %
    const passSuccess = getSuccessVal('passes');
    const passTotal = getTotalVal('passes');
    if (passSuccess !== null && passTotal !== null && passTotal > 0) {
      calculated.push({
        key: 'pass_completion',
        displayName: 'Pass Completion %',
        value: (passSuccess / passTotal) * 100,
        description: 'Passes Completed ÷ Total'
      });
    }
    
    // Dribble Success %
    const dribbleSuccess = getSuccessVal('dribbles');
    const dribbleTotal = getTotalVal('dribbles');
    if (dribbleSuccess !== null && dribbleTotal !== null && dribbleTotal > 0) {
      calculated.push({
        key: 'dribble_success_pct',
        displayName: 'Dribble Success %',
        value: (dribbleSuccess / dribbleTotal) * 100,
        description: 'Dribbles Completed ÷ Total'
      });
    }
    
    // Tackle Success %
    const tackleSuccess = getSuccessVal('tackles');
    const tackleTotal = getTotalVal('tackles');
    if (tackleSuccess !== null && tackleTotal !== null && tackleTotal > 0) {
      calculated.push({
        key: 'tackle_success_pct',
        displayName: 'Tackle Success %',
        value: (tackleSuccess / tackleTotal) * 100,
        description: 'Tackles Won ÷ Total'
      });
    }
    
    // xG per Shot
    const xg = getVal('xg');
    const shotsTotal = getTotalVal('shots') ?? getVal('shots');
    if (xg !== null && shotsTotal !== null && shotsTotal > 0) {
      calculated.push({
        key: 'xg_per_shot',
        displayName: 'xG per Shot',
        value: xg / shotsTotal,
        description: 'xG ÷ Total Shots'
      });
    }
    
    return calculated;
  };

  const advancedStats = getAdvancedStats();
  const calculatedStats = getCalculatedStats();

  // Get unique action types (split by comma)
  const allActionTypes = Array.from(new Set(
    actions.flatMap(a => (a.action_type || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  )).sort();

  // Rating colour buckets
  const getRatingBucket = (score: number): string => {
    if (score >= 0.15) return "dark-green";
    if (score >= 0.05) return "green";
    if (score > 0) return "lime";
    if (score === 0) return "neutral";
    if (score > -0.04) return "orange";
    return "red";
  };

  const ratingBuckets = [
    { key: "dark-green", className: "bg-green-700" },
    { key: "green", className: "bg-green-500" },
    { key: "lime", className: "bg-lime-400" },
    { key: "neutral", className: "bg-muted" },
    { key: "orange", className: "bg-orange-500" },
    { key: "red", className: "bg-red-600" },
  ];

  // Filtered actions
  const filteredActions = actions.filter(a => {
    if (filterTypes.length > 0) {
      const actionTypes = (a.action_type || '').split(',').map(t => t.trim().toLowerCase());
      if (!filterTypes.some(ft => actionTypes.includes(ft))) return false;
    }
    if (filterRating) {
      if (getRatingBucket(a.action_score) !== filterRating) return false;
    }
    if (filterHasNotes) {
      if (!a.notes) return false;
    }
    return true;
  });

  const hasActiveFilters = filterTypes.length > 0 || filterRating !== null || filterHasNotes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] md:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto overflow-x-hidden p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-2 md:p-4 flex items-center justify-between gap-2">
          <h2 className="text-base md:text-xl font-bebas uppercase tracking-wider truncate">Performance Report</h2>
          <div className="flex gap-1 md:gap-2 flex-shrink-0">
            <Button onClick={handleSaveAsWebp} variant="default" size="sm" className="px-2 md:px-3" disabled={savingImage || loading}>
              <ImageIcon className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{savingImage ? 'Saving...' : 'Save'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2 md:px-3"
              onClick={() => {
                if (analysis) {
                  const playerName = analysis.player_name || 'player';
                  const opponent = analysis.opponent || 'opponent';
                  const slug = `${playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-vs-${opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${analysisId}`;
                  const url = `${window.location.origin}/performance-report/${slug}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Report link copied to clipboard");
                }
              }}
              disabled={!analysis}
            >
              <Link2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Share</span>
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="px-2 md:px-3">
              <X className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Close</span>
            </Button>
          </div>
        </div>

        <div className="p-3 md:p-6 overflow-x-hidden">
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
          ) : (analysis.visibility_status || "").toLowerCase() === "hidden" ? (
            <div className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-2">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              {analysis.placeholder_raw_score != null && (analysis.placeholder_minutes ?? 0) > 0 ? (
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto p-4 bg-accent/20 rounded-lg">
                  <div className="text-center p-2">
                    <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Raw Score</p>
                    <p className="text-base md:text-2xl font-bold">{analysis.placeholder_raw_score.toFixed(3)}</p>
                  </div>
                  <div className="text-center bg-primary text-primary-foreground rounded-lg p-2 md:p-4">
                    <p className="text-[10px] md:text-sm opacity-90 mb-0.5 md:mb-1">R90</p>
                    <p className="text-lg md:text-3xl font-bold">{((analysis.placeholder_raw_score / analysis.placeholder_minutes!) * 90).toFixed(2)}</p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Mins</p>
                    <p className="text-base md:text-2xl font-bold">{analysis.placeholder_minutes}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Placeholder stats are not set yet.</p>
              )}
              <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
                <p className="text-sm font-medium">This report is locked</p>
                <p className="text-xs text-muted-foreground mt-1">Contact us to unlock the full performance breakdown.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isPortalView && analysis.visibility_status === "draft" && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 dark:bg-black/40 rounded-lg flex items-center justify-center">
                  <div className="text-center p-6 bg-background/90 rounded-xl border shadow-lg max-w-xs">
                    <p className="font-semibold text-sm">Report In Progress</p>
                    <p className="text-xs text-muted-foreground mt-1">This report is still being prepared. Check back soon.</p>
                  </div>
                </div>
              )}
            <div ref={contentRef} className="space-y-2 md:space-y-3 bg-background p-2 md:p-4 rounded-lg overflow-x-hidden">
              {/* Player Info with Clipped Actions Button */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Player</p>
                    <p className="font-bold text-sm md:text-base truncate">{analysis.player_name}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{t(portalLanguage, "date")}</p>
                    <p className="font-bold text-sm md:text-base">{new Date(analysis.analysis_date).toLocaleDateString(portalLocale)}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Opponent</p>
                    <p className="font-bold text-sm md:text-base truncate">{analysis.opponent || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Result</p>
                    <p className="font-bold text-sm md:text-base">{analysis.result || "N/A"}</p>
                  </div>
                </div>
                
                {/* Clipped Actions Button */}
                {actions.filter(a => a.video_url).length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-risegold hover:bg-risegold/90 text-black font-semibold flex items-center gap-2"
                    onClick={() => setShowClippedActions(true)}
                  >
                    <Play className="h-4 w-4" />
                    {actions.filter(a => a.video_url).length}
                  </Button>
                )}
              </div>

              {/* Graphics Buttons Row */}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showR90Flow ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setShowR90Flow(!showR90Flow); setShowHeatmap(false); setShowPitchHeatmap(false); setShowChanceCreation(false); }}
                    className="text-xs"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    R90 Flow
                  </Button>
                  <Button
                    variant={showHeatmap ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setShowHeatmap(!showHeatmap); setShowR90Flow(false); setShowPitchHeatmap(false); setShowChanceCreation(false); }}
                    className="text-xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Period Grade Map
                  </Button>
                  {actions.some(a => a.zone || (a.zone_details && a.zone_details.length > 0)) && (
                    <>
                      <Button
                        variant={showPitchHeatmap ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setShowPitchHeatmap(!showPitchHeatmap); setShowZonePerformance(false); setShowR90Flow(false); setShowHeatmap(false); setShowChanceCreation(false); }}
                        className="text-xs"
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        Pitch Heatmap
                      </Button>
                      <Button
                        variant={showZonePerformance ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setShowZonePerformance(!showZonePerformance); setShowPitchHeatmap(false); setShowR90Flow(false); setShowHeatmap(false); setShowChanceCreation(false); }}
                        className="text-xs"
                      >
                        <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
                        Zone Performance
                      </Button>
                    </>
                  )}
                  {/* Chance Creation Flow - only show if xC data exists */}
                  {analysis.striker_stats && ['crossing_movement_xC', 'movement_in_behind_xC', 'movement_down_side_xC', 'triple_threat_xC', 'movement_to_feet_xC'].some(k => (analysis.striker_stats as any)?.[k] > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowChanceCreation(!showChanceCreation); setShowR90Flow(false); setShowHeatmap(false); setShowPitchHeatmap(false); }}
                      className="text-xs"
                    >
                      <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                      Chance Creation Flow
                    </Button>
                  )}
                  {actions.filter(a => a.video_url).length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRankedMode("chronological"); setShowRankedPlayer(true); }}
                        className="text-xs"
                      >
                        <Film className="h-3.5 w-3.5 mr-1.5" />
                        Full Match Video
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRankedMode("ranked"); setShowRankedPlayer(true); }}
                        className="text-xs"
                      >
                        <Award className="h-3.5 w-3.5 mr-1.5" />
                        Ranked Actions
                      </Button>
                      {actions.some(a => a.video_url && a.notes) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setRankedMode("noted"); setShowRankedPlayer(true); }}
                          className="text-xs"
                        >
                          <MessageSquareText className="h-3.5 w-3.5 mr-1.5" />
                          Noted Actions
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* R90 Flow Chart */}
              {showR90Flow && analysis.minutes_played && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3 md:p-6">
                    <R90FlowChart actions={actions} minutesPlayed={analysis.minutes_played} />
                  </CardContent>
                </Card>
              )}

              {/* Action Heatmap */}
              {showHeatmap && analysis.minutes_played && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3 md:p-6">
                    <ActionHeatmap actions={actions} minutesPlayed={analysis.minutes_played} />
                  </CardContent>
              </Card>
              )}

              {/* Pitch Heatmap */}
              {showPitchHeatmap && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3 md:p-6">
                    <PitchHeatmap actions={actions} />
                  </CardContent>
                </Card>
              )}

              {/* Zone Performance */}
              {showZonePerformance && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3 md:p-6">
                    <ZonePerformance actions={actions} />
                  </CardContent>
                </Card>
              )}

              {/* Chance Creation Flow */}
              {showChanceCreation && analysis.striker_stats && (
                <Card className="overflow-hidden">
                  <CardContent className="p-3 md:p-6">
                    <ChanceCreationFlow strikerStats={analysis.striker_stats as Record<string, any>} />
                  </CardContent>
                </Card>
              )}

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 p-2 md:p-4 bg-accent/20 rounded-lg">
                <div className="text-center p-2">
                  <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Raw Score</p>
                  <p className="text-base md:text-2xl font-bold">
                    {actions.length > 0 ? calculateRScore().toFixed(3) : (analysis.r90_score !== null && analysis.minutes_played ? ((analysis.r90_score / 90) * analysis.minutes_played).toFixed(3) : "N/A")}
                  </p>
                </div>
                <div className="text-center bg-primary text-primary-foreground rounded-lg p-2 md:p-4 relative">
                  <div className="flex items-center justify-center gap-1 mb-0.5 md:mb-1">
                    <p className="text-[10px] md:text-sm opacity-90">R90</p>
                    <button
                      onClick={() => setShowR90Info(true)}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      title="How is R90 calculated?"
                    >
                      <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                  <p className="text-lg md:text-3xl font-bold">
                    {analysis.r90_score !== null 
                      ? analysis.r90_score.toFixed(2)
                      : analysis.minutes_played && actions.length > 0
                        ? ((calculateRScore() / analysis.minutes_played) * 90).toFixed(2)
                        : "N/A"
                    }
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Mins</p>
                  <p className="text-base md:text-2xl font-bold">{analysis.minutes_played ?? "N/A"}</p>
                </div>
              </div>

              {/* Advanced Stats */}
              {advancedStats.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2">
                    <CardTitle className="text-sm md:text-lg">Match Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    <div className="grid grid-cols-3 gap-1 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
                      {advancedStats.map((stat) => {
                        const isGoals = stat.key === 'goals';
                        const goalsValue = isGoals ? (stat.isPaired ? stat.successful : stat.value) : 0;
                        const hasGoalBorder = isGoals && typeof goalsValue === 'number' && goalsValue >= 1;
                        return (
                        <div key={stat.key} className={`text-center p-1.5 md:p-3 bg-accent/10 rounded ${hasGoalBorder ? 'ring-2 ring-gold' : ''}`}>
                          <p className="text-[9px] md:text-xs text-muted-foreground mb-0.5 capitalize truncate">{formatStatLabel(stat.key)}</p>
                          {stat.isPaired ? (
                            <>
                              <p className="text-sm md:text-lg font-bold">{stat.percentage}%</p>
                              <p className="text-[9px] md:text-xs text-muted-foreground">{stat.successful}/{stat.attempted}</p>
                            </>
                          ) : (
                            <p className="text-sm md:text-lg font-bold">{stat.value}</p>
                          )}
                          {stat.per90Value !== undefined && (
                            <p className="text-[8px] md:text-xs text-muted-foreground mt-0.5">
                              p90: {stat.per90Value}
                            </p>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto-Calculated Ratios */}
              {calculatedStats.length > 0 && (
                <Card className="overflow-hidden border-primary/20">
                  <CardHeader className="py-1.5 md:py-2 bg-primary/5">
                    <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-primary">Calculated Ratios</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    <div className="grid grid-cols-3 gap-1 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
                      {calculatedStats.map((stat) => (
                        <div key={stat.key} className="text-center p-1.5 md:p-3 bg-primary/5 rounded border border-primary/10">
                          <p className="text-[9px] md:text-xs text-muted-foreground mb-0.5 truncate" title={stat.description}>
                            {stat.displayName}
                          </p>
                          <p className="text-sm md:text-lg font-bold text-primary">
                            {stat.key.includes('pct') || stat.key.includes('completion') || stat.key.includes('success')
                              ? `${stat.value.toFixed(1)}%`
                              : stat.value.toFixed(2)}
                          </p>
                          <p className="text-[8px] md:text-[10px] text-muted-foreground mt-0.5">
                            {stat.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Overview */}
              {analysis.performance_overview && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2">
                    <CardTitle className="text-sm md:text-lg">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    <p className="text-muted-foreground whitespace-pre-wrap text-center text-xs md:text-sm">{analysis.performance_overview}</p>
                  </CardContent>
                </Card>
              )}

              {/* Performance Actions */}
              {actions.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm md:text-lg">
                        Actions ({hasActiveFilters ? `${filteredActions.length}/${actions.length}` : actions.length})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                          <button
                            onClick={() => { setFilterTypes([]); setFilterRating(null); setFilterHasNotes(false); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          >
                            Clear filters
                          </button>
                        )}
                        <button
                          onClick={() => setShowActionFilters(!showActionFilters)}
                          className={`p-1.5 rounded transition-colors ${hasActiveFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Filter className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {showActionFilters && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        {/* Filter by action type */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Action Type</p>
                          <div className="flex flex-wrap gap-1">
                            {allActionTypes.map(type => (
                              <button
                                key={type}
                                onClick={() => setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                                  filterTypes.includes(type)
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/30 text-foreground/70 border-border hover:bg-muted/50'
                                }`}
                              >
                                {toTitleCase(type)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Filter by rating */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Rating</p>
                          <div className="flex flex-wrap gap-1">
                            {ratingBuckets.map(bucket => (
                              <button
                                key={bucket.key}
                                onClick={() => setFilterRating(prev => prev === bucket.key ? null : bucket.key)}
                                className={`w-6 h-6 rounded-full transition-all border-2 ${bucket.className} ${
                                  filterRating === bucket.key
                                    ? 'border-foreground scale-110 ring-2 ring-foreground/20'
                                    : 'border-transparent hover:scale-110'
                                }`}
                                title={bucket.key}
                              />
                            ))}
                          </div>
                        </div>
                        {/* Filter by notes */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
                          <button
                            onClick={() => setFilterHasNotes(!filterHasNotes)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                              filterHasNotes
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/30 text-foreground/70 border-border hover:bg-muted/50'
                            }`}
                          >
                            With Notes
                          </button>
                        </div>
                        {/* Watch filtered selection */}
                        {hasActiveFilters && filteredActions.some(a => a.video_url) && (
                          <div className="pt-2 border-t border-border/30">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-gold hover:bg-gold/90 text-black font-semibold text-xs w-full"
                              onClick={() => setShowFilteredPlayer(true)}
                            >
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                              Watch Selected ({filteredActions.filter(a => a.video_url).length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    {/* Mobile: Compact card layout */}
                    <div className="block md:hidden space-y-2">
                      {filteredActions.map((action) => (
                        <div key={action.id} className="p-2 bg-muted/30 rounded">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-xs">#{action.action_number}</span>
                              <span className="text-[10px] text-muted-foreground">{formatMinute(action.minute)}'</span>
                              <span className={`text-xs font-bold ${getActionScoreColor(action.action_score)}`}>
                                {action.action_score?.toFixed(3)}
                              </span>
                            </div>
                            {action.video_url && (
                              <button
                                onClick={() => {
                                  setSelectedVideoUrl(action.video_url!);
                                  setSelectedVideoTitle(`#${action.action_number} - ${action.action_type}`);
                                }}
                                className="text-risegold hover:text-risegold/80 p-0.5 flex-shrink-0"
                              >
                                <Video className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="font-medium text-xs mt-1 truncate">{toTitleCase(action.action_type)}</div>
                          <div className="text-[10px] text-foreground/80">{action.action_description}</div>
                          {action.notes && (
                            <div className="text-[9px] text-muted-foreground italic mt-1 pt-1 border-t border-border/50 break-words">
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
                          {filteredActions.map((action) => (
                            <tr key={action.id} className="border-b border-border/50">
                              <td className="py-2 px-2">{action.action_number}</td>
                              <td className="py-2 px-2">{formatMinute(action.minute)}'</td>
                              <td className="py-2 px-2">{toTitleCase(action.action_type)}</td>
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
                                    className="text-risegold hover:text-risegold/80 p-1"
                                  >
                                    <Video className="h-4 w-4" />
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
            notes: a.notes,
          }))}
      />

      {/* Ranked/Full Match Video Player */}
      <RankedActionsPlayer
        open={showRankedPlayer}
        onOpenChange={setShowRankedPlayer}
        mode={rankedMode}
        clips={actions
          .filter(a => a.video_url)
          .map(a => ({
            id: a.id,
            action_number: a.action_number,
            action_type: a.action_type,
            action_description: a.action_description,
            action_score: a.action_score,
            video_url: a.video_url!,
            minute: a.minute,
            notes: a.notes,
          }))}
      />

      {/* Filtered Video Player */}
      <RankedActionsPlayer
        open={showFilteredPlayer}
        onOpenChange={setShowFilteredPlayer}
        mode="chronological"
        clips={filteredActions
          .filter(a => a.video_url)
          .map(a => ({
            id: a.id,
            action_number: a.action_number,
            action_type: a.action_type,
            action_description: a.action_description,
            action_score: a.action_score,
            video_url: a.video_url!,
            minute: a.minute,
            notes: a.notes,
          }))}
      />

      <Dialog open={showR90Info} onOpenChange={setShowR90Info}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto">
          <button
            onClick={() => setShowR90Info(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-muted p-1.5 hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="space-y-4">
            <h2 className="text-xl font-bold">How R90 Scores Work</h2>
            <p className="text-sm text-muted-foreground">
              R90 is a performance rating that allows us to rate actual impact on the game result, positively or negatively, by every contributable action made on and off the ball. Scores are normalised to a per-90-minute basis for fair comparison across different match durations.
            </p>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Calculation</h3>
              <div className="bg-accent/20 rounded-lg p-3 space-y-2 text-sm">
                <p><strong>Raw Score</strong> = sum of all action scores in the match</p>
                <p><strong>R90</strong> = (Raw Score / Minutes Played) × 90</p>
              </div>
              
              <h3 className="font-semibold text-sm">Action Scoring</h3>
              <p className="text-sm text-muted-foreground">
                The action scoring model was built from over 1,000 matches input between 2017 and 2026, analysing how actions affected scoring or conceding across 18 pitch zones with further breakdowns by action type. Positive actions add to the score while negative actions subtract from it.
              </p>
              
              <h3 className="font-semibold text-sm">Score Guide</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(43, 96%, 56%)' }} />
                  <span>A* (2.20+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 76%, 55%)' }} />
                  <span>A+ (1.80–2.19)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 70%, 50%)' }} />
                  <span>A (1.60–1.79)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 65%, 45%)' }} />
                  <span>A- (1.40–1.59)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 70%, 40%)' }} />
                  <span>B+ (1.20–1.39)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
                  <span>B (1.00–1.19)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(60, 70%, 50%)' }} />
                  <span>B- (0.80–0.99)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(40, 85%, 50%)' }} />
                  <span>C+ (0.60–0.79)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(25, 75%, 45%)' }} />
                  <span>C (0.40–0.59)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                  <span>C- (0.20–0.39)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 84%, 45%)' }} />
                  <span>D (0.00–0.19)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 84%, 30%)' }} />
                  <span>U (below 0)</span>
                </div>
              </div>

              <h3 className="font-semibold text-sm">Important Notes</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Short appearances (under 20 minutes) can produce inflated or deflated scores</li>
                <li>Goals win games. Always remember that while R90 is heavily influenced by chance-related actions, so is the real game. A bad performance is equalised by a goal scored and a good performance is generally not complete without creating a goal or stopping one at the other end.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
