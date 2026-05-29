import { useEffect, useState, useRef } from "react";
import { HiddenScoresGrid } from "@/components/portal/HiddenScoresGrid";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade, getXGChainGrade, getProgressivePassesGrade, getPPTurnoversRatioGrade } from "@/lib/gradeCalculations";
import { Download, X, ImageIcon, Video, Play, Calculator, TrendingUp, BarChart3, Film, Award, HelpCircle, Link2, MessageSquareText, Filter, Lock, MapPin, Grid3X3, Timer, ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { ActionVideoPopup } from "@/components/ActionVideoPopup";
import { ClippedActionsPlayer } from "@/components/ClippedActionsPlayer";
import { downloadVideo } from "@/lib/videoDownload";
import { STAT_TYPE_CONFIGS, StatTypeConfig } from "@/components/staff/ActionStatRecorder";
import { R90FlowChart } from "@/components/report/R90FlowChart";
import { ActionHeatmap } from "@/components/report/ActionHeatmap";
import { ChanceCreationFlow } from "@/components/report/ChanceCreationFlow";
import { RankedActionsPlayer } from "@/components/report/RankedActionsPlayer";
import { PitchHeatmap } from "@/components/report/PitchHeatmap";
import { ZonePerformance } from "@/components/report/ZonePerformance";
import { MatchTimelapse } from "@/components/report/MatchTimelapse";
import { toTitleCase } from "@/lib/titleCase";
import { sortActionsByMinute } from "@/lib/actionSorting";
import { filterActionsByZone } from "@/lib/reportActionHelpers";
import { t } from "@/lib/portalTranslations";
import { getReportLanguage, getReportLocale, getTranslatedActionField, getTranslatedReportField, hasTranslatedReportContent } from "@/lib/reportTranslations";
import { translateActionType, et } from "@/lib/exampleViewerTranslations";
import { useSharedClipPlayer } from "@/hooks/useSharedClipPlayer";
import { hasPlayableClip } from "@/lib/clipVideoUtils";
import { effectiveR90 } from "@/lib/r90";
import { ShotMapGraphic, hasShotMapData } from "@/components/report/ShotMapGraphic";
import { ShaderAnimation } from "@/components/ui/shader-animation";

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
  clip_start?: number | null;
  clip_end?: number | null;
  zone?: number | null;
  zone_details?: any | null;
  recorded_stat?: unknown;
  involved_players?: Array<{ roster_id: string; score?: number | null }> | null;
}

interface StrikerStats {
  [key: string]: number | string | any[] | undefined;
}

interface AnalysisDetails {
  id: string;
  player_id?: string | null;
  analysis_date: string;
  opponent: string;
  result: string;
  r90_score: number | null;
  minutes_played: number | null;
  player_name: string;
  player_position?: string | null;
  category?: string | null;
  notes?: string | null;
  striker_stats?: StrikerStats | null;
  performance_overview?: string | null;
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
  placeholder_per?: number | null;
  placeholder_sr?: number | null;
  translated_content?: { language: string; fields: Record<string, string> } | null;
  show_descriptions?: boolean;
  club_logo_url?: string | null;
  opposition_color?: string | null;
  report_type?: 'player' | 'team' | string | null;
  team_name?: string | null;
  team_logo_url?: string | null;
  team_color?: string | null;
  opponent_logo_url?: string | null;
  team_roster?: Array<{ id: string; number: string; name?: string }> | null;
  is_scouting_report?: boolean | null;
}

interface PerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  isPortalView?: boolean;
  /** Optional explicit language override. When set, takes precedence
   *  over the portal language hint and the default English fallback.
   *  Used by the public /performance-report page so the example
   *  Cristiano Ronaldo report opens in the visitor's site language. */
  languageOverride?: string | null;
}

const hasPlayableClipWindow = (clipStart?: number | null, clipEnd?: number | null) =>
  clipStart != null && clipEnd != null && clipEnd > clipStart;

export const PerformanceReportDialog = ({ open, onOpenChange, analysisId, isPortalView = false, languageOverride = null }: PerformanceReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [actions, setActions] = useState<PerformanceAction[]>([]);
  const [prefetchedId, setPrefetchedId] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [selectedClipStart, setSelectedClipStart] = useState<number | null>(null);
  const [selectedClipEnd, setSelectedClipEnd] = useState<number | null>(null);
  const [showR90Flow, setShowR90Flow] = useState(false);
  const [showR90Info, setShowR90Info] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPitchHeatmap, setShowPitchHeatmap] = useState(false);
  const [showZonePerformance, setShowZonePerformance] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [showChanceCreation, setShowChanceCreation] = useState(false);
  const [showRankedPlayer, setShowRankedPlayer] = useState(false);
  const [rankedMode, setRankedMode] = useState<"chronological" | "ranked" | "noted">("chronological");
  const [showClippedActions, setShowClippedActions] = useState(false);
  const [showFilteredPlayer, setShowFilteredPlayer] = useState(false);
  const [showZonePlayer, setShowZonePlayer] = useState(false);
  const [zonePlayerTitle, setZonePlayerTitle] = useState("");
  const [zonePlayerClips, setZonePlayerClips] = useState<Array<{ id: string; action_number: number; action_type: string; action_description: string; video_url: string; minute: number; notes?: string | null; clip_start?: number | null; clip_end?: number | null }>>([]);
  const [showActionFilters, setShowActionFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterRating, setFilterRating] = useState<string | null>(null);
  const [filterHasNotes, setFilterHasNotes] = useState(false);
  const sharedClipPlayer = useSharedClipPlayer();
  const [showMatchStats, setShowMatchStats] = useState(false);
  const [showShotMap, setShowShotMap] = useState(false);

  const openClip = (action: PerformanceAction) => {
    if (!hasPlayableClip(action)) {
      toast.error('Clip unavailable. Full match playback has been blocked.');
      return;
    }

    const translated = getTranslatedActionData(action);
    setSelectedVideoUrl(action.video_url!);
    setSelectedVideoTitle(`#${action.action_number} - ${translated.action_type}`);
    setSelectedClipStart(action.clip_start ?? null);
    setSelectedClipEnd(action.clip_end ?? null);
  };

  const openClipCollection = (setter: (open: boolean) => void) => {
    if (reportClips.length === 0) {
      toast.error('No valid clips available. Full match playback has been blocked.');
      return;
    }

    setter(true);
  };

  const portalLanguage = languageOverride
    ? languageOverride
    : isPortalView
      ? (localStorage.getItem("portal_language_hint") || "en")
      : "en";
  // When the report itself has no stored translation, fall back to the
  // requested portal/override language so UI labels still localise.
  const reportLanguage = hasTranslatedReportContent(analysis?.translated_content)
    ? getReportLanguage(analysis?.translated_content, portalLanguage)
    : (portalLanguage || "en");
  const portalLocale = getReportLocale(reportLanguage);

  const tc = analysis?.translated_content;
  const hasTranslation = hasTranslatedReportContent(tc);
  const tf = (key: string, fallback: string) => getTranslatedReportField(tc, key, fallback);
  const tAction = (index: number, field: "type" | "description" | "notes", fallback: string) => getTranslatedActionField(tc, index, field, fallback);
  const getTranslatedActionData = (action: PerformanceAction) => {
    const baseType = tAction(action.action_number - 1, "type", action.action_type);
    // If the report has no stored per-action translation, translate
    // common action labels using the shared example viewer dictionary so
    // public links like /performance-report/...?lang=pt show the right
    // language even before staff have translated the report.
    const localised = hasTranslation
      ? baseType
      : translateActionType(reportLanguage, baseType);
    const translatedType = toTitleCase(localised);
    const translatedDescription = tAction(action.action_number - 1, "description", action.action_description);
    const translatedNotes = tAction(action.action_number - 1, "notes", action.notes || "") || null;

    return {
      ...action,
      action_type: translatedType,
      action_description: translatedDescription,
      notes: translatedNotes,
    };
  };

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
          .select("id, player_id, analysis_date, opponent, result, r90_score, minutes_played, striker_stats, performance_overview, visibility_status, placeholder_raw_score, placeholder_minutes, placeholder_per, placeholder_sr, translated_content, show_descriptions, club_logo_url, opposition_color, category, notes, report_type, team_name, team_logo_url, team_color, opponent_logo_url, team_roster, is_scouting_report, players!player_analysis_player_id_fkey (name, position)")
          .eq("id", id)
          .single(),
        supabase
          .from("performance_report_actions")
          .select("id, action_number, minute, action_score, action_type, action_description, notes, video_url, clip_start, clip_end, zone, zone_details, recorded_stat, is_first_half, involved_players")
          .eq("analysis_id", id)
          .order("action_number", { ascending: true })
      ]);

      if (analysisResult.error) throw analysisResult.error;

      const analysisRow = analysisResult.data as any;
      const isTeamReport = analysisRow.report_type === 'team';
      const teamName = analysisRow.team_name || "Team Report";
      setAnalysis({
        id: analysisResult.data.id,
        analysis_date: analysisResult.data.analysis_date,
        opponent: analysisResult.data.opponent || "",
        result: analysisResult.data.result || "",
        r90_score: analysisResult.data.r90_score,
        minutes_played: analysisResult.data.minutes_played,
        player_name: isTeamReport ? teamName : (analysisRow.players?.name || "Unknown Player"),
        player_position: analysisRow.players?.position || null,
        striker_stats: analysisResult.data.striker_stats as StrikerStats | null,
        performance_overview: analysisResult.data.performance_overview,
        visibility_status: (analysisResult.data as any).visibility_status || "live",
        placeholder_raw_score: (analysisResult.data as any).placeholder_raw_score,
        placeholder_minutes: (analysisResult.data as any).placeholder_minutes,
        placeholder_per: (analysisResult.data as any).placeholder_per,
        placeholder_sr: (analysisResult.data as any).placeholder_sr,
        translated_content: (analysisResult.data as any).translated_content || null,
        show_descriptions: (analysisResult.data as any).show_descriptions !== false,
        club_logo_url: (analysisResult.data as any).club_logo_url || null,
        opposition_color: (analysisResult.data as any).opposition_color || null,
        category: (analysisResult.data as any).category || "match",
        notes: (analysisResult.data as any).notes || null,
        report_type: (analysisResult.data as any).report_type || 'player',
        team_name: (analysisResult.data as any).team_name || null,
        team_logo_url: (analysisResult.data as any).team_logo_url || null,
        team_color: (analysisResult.data as any).team_color || null,
        opponent_logo_url: (analysisResult.data as any).opponent_logo_url || null,
        team_roster: Array.isArray((analysisResult.data as any).team_roster) ? (analysisResult.data as any).team_roster : [],
        is_scouting_report: !!(analysisResult.data as any).is_scouting_report,
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

  const calculateR90FromActions = (mins: number): number => {
    const fixedTotal = actions
      .filter(a => a.action_score === 1 || a.action_score === -1)
      .reduce((sum, a) => sum + a.action_score, 0);
    const variableTotal = actions
      .filter(a => a.action_score !== 1 && a.action_score !== -1)
      .reduce((sum, a) => sum + (a.action_score ?? 0), 0);
    return ((variableTotal / mins) * 90) + fixedTotal;
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

  // Format stat key to readable label — strip all GK prefixes and force Title Case
  const formatStatLabel = (key: string): string => {
    let cleanKey = key.replace(/^gk[_\s]*/i, '');
    let config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key === cleanKey);
    if (config) return config.name.replace(/^Gk\s+/i, '');
    config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key === key);
    if (config) return config.name.replace(/^Gk\s+/i, '');
    const keyLower = cleanKey.toLowerCase();
    config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key.toLowerCase() === keyLower);
    if (config) return config.name.replace(/^Gk\s+/i, '');
    return cleanKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
    // Merge in any striker_stats keys not already in the ordered list (e.g. xC stats from legacy form)
    const orderedKeys = statsOrder || selectedStats || Object.keys(analysis.striker_stats);
    const allStrikerKeys = Object.keys(analysis.striker_stats);
    const orderedSet = new Set(orderedKeys);
    const extraKeys = allStrikerKeys.filter(k => !orderedSet.has(k) && !excludeKeys.includes(k));
    const keysToShow = [...orderedKeys.filter(key => !excludeKeys.includes(key)), ...extraKeys];
    
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

  const reportClips = actions.filter((action) => !!action.video_url);
  const filteredReportClips = filteredActions.filter((action) => !!action.video_url);

  const hasActiveFilters = filterTypes.length > 0 || filterRating !== null || filterHasNotes;

  const handleOpenZoneClips = (zone: number, sub?: number) => {
    const clips = filterActionsByZone(actions, zone, sub)
      .filter((action) => action.video_url)
      .map((action) => {
        const translated = getTranslatedActionData(action);
        return {
          id: translated.id,
          action_number: translated.action_number,
          action_type: translated.action_type,
          action_description: translated.action_description,
          video_url: translated.video_url!,
          minute: translated.minute,
          notes: translated.notes,
          clip_start: (action as any).clip_start,
          clip_end: (action as any).clip_end,
        };
      });

    if (clips.length === 0) {
      toast.error(t(reportLanguage, "no_zone_clips"));
      return;
    }

    setZonePlayerTitle(sub ? `${t(reportLanguage, "zone_clips_title")} ${zone}.${sub}` : `${t(reportLanguage, "zone_clips_title")} ${zone}`);
    setZonePlayerClips(clips);
    setShowZonePlayer(true);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] md:max-w-[95vw] w-full max-h-[95dvh] overflow-y-auto overflow-x-hidden p-0 pt-12 md:pt-0">
        <div className="sticky top-0 z-10 bg-background border-b p-2 md:p-4 flex items-center justify-between gap-2">
          <h2 className="text-base md:text-xl font-bebas uppercase tracking-wider truncate">{t(reportLanguage, "performance_report")}</h2>
          <div className="flex gap-1 md:gap-2 flex-shrink-0">
            <Button onClick={handleSaveAsWebp} variant="default" size="sm" className="px-2 md:px-3" disabled={savingImage || loading}>
              <ImageIcon className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{savingImage ? t(reportLanguage, "saving_label") : t(reportLanguage, "save_label")}</span>
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
              <span className="hidden md:inline">{t(reportLanguage, "share_label")}</span>
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="px-2 md:px-3">
              <X className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t(reportLanguage, "close")}</span>
            </Button>
          </div>
        </div>

        <div className="p-3 md:p-6 overflow-x-hidden">
          {loading ? (
            <div className="relative min-h-[68vh] overflow-hidden rounded-lg bg-background">
              <ShaderAnimation />
            </div>
          ) : !analysis ? (
            <div className="text-center py-8 text-muted-foreground">{et(reportLanguage, "analysis_not_found", "Performance report not found")}</div>
          ) : (analysis.visibility_status || "").toLowerCase() === "hidden" ? (
            <div className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-2">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <HiddenScoresGrid
                placeholderRawScore={analysis.placeholder_raw_score}
                placeholderMinutes={analysis.placeholder_minutes}
                placeholderPer={analysis.placeholder_per}
                placeholderSr={analysis.placeholder_sr}
                t={t}
                reportLanguage={reportLanguage}
              />
              <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
                <p className="text-sm font-medium">{t(reportLanguage, "report_locked")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t(reportLanguage, "contact_to_unlock_report")}</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isPortalView && (analysis.visibility_status === "draft" || analysis.visibility_status === "clipped") && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 dark:bg-black/40 rounded-lg flex items-center justify-center">
                  <div className="text-center p-6 bg-background/90 rounded-xl border shadow-lg max-w-xs">
                    <p className="font-semibold text-sm">{t(reportLanguage, "report_in_progress")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t(reportLanguage, "report_in_progress_message")}</p>
                    {(analysis as any).estimated_ready_at && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        {t(reportLanguage, "expected_by")}: {new Date((analysis as any).estimated_ready_at).toLocaleDateString(portalLocale, { weekday: 'short', day: 'numeric', month: 'short' })} {t(reportLanguage, "at")} {new Date((analysis as any).estimated_ready_at).toLocaleTimeString(portalLocale, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            <div ref={contentRef} className="space-y-2 md:space-y-3 bg-background p-2 md:p-4 rounded-lg overflow-x-hidden">
              {/* Opposition branding strip */}
              {analysis.opposition_color && (
                <div
                  className="w-full h-10 md:h-12 rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: analysis.opposition_color }}
                >
                  {analysis.club_logo_url && (
                    <img
                      src={analysis.club_logo_url}
                      alt="Club logo"
                      className="h-7 md:h-9 object-contain drop-shadow-lg"
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
              )}
              {/* Player Info with Clipped Actions Button */}
              <div className="flex flex-col gap-3">
                <div className={`grid gap-2 md:gap-4 ${analysis.category === "highlights" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{t(reportLanguage, "player_label")}</p>
                    <p className="font-bold text-sm md:text-base truncate">{analysis.player_name}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{t(reportLanguage, "date")}</p>
                    <p className="font-bold text-sm md:text-base">{new Date(analysis.analysis_date).toLocaleDateString(portalLocale)}</p>
                  </div>
                  {analysis.category !== "highlights" && (
                    <>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">{t(reportLanguage, "opponent")}</p>
                        <p className="font-bold text-sm md:text-base truncate">{tf("opponent", analysis.opponent) || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">{t(reportLanguage, "result")}</p>
                        <p className="font-bold text-sm md:text-base">{analysis.result || "N/A"}</p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Video Options Row - directly below player info */}
                {reportClips.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {reportClips.some(a => a.notes) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 text-[11px] md:text-xs font-semibold px-1 md:px-3 truncate"
                        onClick={() => { setRankedMode("noted"); openClipCollection(setShowRankedPlayer); }}
                      >
                        <MessageSquareText className="hidden md:inline-block h-3.5 w-3.5 mr-1" />
                        {t(reportLanguage, "noted_actions")}
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="h-10 text-[11px] md:text-xs font-semibold px-1 md:px-3 truncate bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-black"
                      onClick={() => { setRankedMode("chronological"); openClipCollection(setShowRankedPlayer); }}
                    >
                      <Film className="hidden md:inline-block h-3.5 w-3.5 mr-1" />
                      {t(reportLanguage, "full_match_video")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-[11px] md:text-xs font-semibold px-1 md:px-3 truncate"
                      onClick={() => { setRankedMode("ranked"); openClipCollection(setShowRankedPlayer); }}
                    >
                      <Award className="hidden md:inline-block h-3.5 w-3.5 mr-1" />
                      {t(reportLanguage, "ranked_actions")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Key Stats */}
              {analysis.category !== "highlights" && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 p-2 md:p-4 bg-accent/20 rounded-lg">
                <div className="text-center p-2">
                  <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">{t(reportLanguage, "raw_score")}</p>
                  <p className="text-base md:text-2xl font-bold">
                    {actions.length > 0 ? calculateRScore().toFixed(3) : (() => {
                      const r = effectiveR90(analysis as any);
                      return r !== null && analysis.minutes_played ? ((r / 90) * analysis.minutes_played).toFixed(3) : "N/A";
                    })()}
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
                    {(() => {
                      const r = effectiveR90(analysis as any);
                      if (r !== null && r !== undefined) return r.toFixed(2);
                      if (analysis.minutes_played && actions.length > 0) return calculateR90FromActions(analysis.minutes_played).toFixed(2);
                      return "N/A";
                    })()}
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">{t(reportLanguage, "mins_short")}</p>
                  <p className="text-base md:text-2xl font-bold">{analysis.minutes_played ?? "N/A"}</p>
                </div>
              </div>
              )}

              {/* Advanced Stats (Match Statistics) - Collapsible */}
              {analysis.category !== "highlights" && advancedStats.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2 cursor-pointer" onClick={() => setShowMatchStats(!showMatchStats)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm md:text-lg">{t(reportLanguage, "match_statistics")}</CardTitle>
                      {showMatchStats ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                  {showMatchStats && (
                    <CardContent className="p-2 md:p-4">
                      <div className="grid grid-cols-3 gap-1 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
                        {advancedStats.map((stat) => {
                          const isGoals = stat.key === 'goals';
                          const goalsValue = isGoals ? (stat.isPaired ? stat.successful : stat.value) : 0;
                          const hasGoalBorder = isGoals && typeof goalsValue === 'number' && goalsValue >= 1;
                          return (
                          <div key={stat.key} className={`text-center p-1.5 md:p-3 bg-accent/10 rounded ${hasGoalBorder ? 'ring-2 ring-gold' : ''}`}>
                            <p className="text-[9px] md:text-xs text-muted-foreground mb-0.5 truncate">{formatStatLabel(stat.key)}</p>
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
                                {t(reportLanguage, "per_90")}: {stat.per90Value}
                              </p>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Auto-Calculated Ratios */}
              {calculatedStats.length > 0 && (
                <Card className="overflow-hidden border-primary/20">
                  <CardHeader className="py-1.5 md:py-2 bg-primary/5">
                    <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-primary">{t(reportLanguage, "calculated_ratios")}</span>
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

              {/* Graphics Buttons Row - between match stats and actions */}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showR90Flow ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setShowR90Flow(!showR90Flow); setShowHeatmap(false); setShowPitchHeatmap(false); setShowChanceCreation(false); setShowShotMap(false); }}
                    className="text-xs"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    {t(reportLanguage, "r90_flow")}
                  </Button>
                  <Button
                    variant={showHeatmap ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setShowHeatmap(!showHeatmap); setShowR90Flow(false); setShowPitchHeatmap(false); setShowChanceCreation(false); setShowShotMap(false); }}
                    className="text-xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    {t(reportLanguage, "period_grade_map")}
                  </Button>
                  {hasShotMapData(actions) && (
                    <Button
                      variant={showShotMap ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setShowShotMap(!showShotMap); setShowR90Flow(false); setShowHeatmap(false); setShowPitchHeatmap(false); setShowZonePerformance(false); setShowTimelapse(false); setShowChanceCreation(false); }}
                      className="text-xs"
                    >
                      <Crosshair className="h-3.5 w-3.5 mr-1.5" />Shot Map
                    </Button>
                  )}
                  {actions.some(a => a.zone || (a.zone_details && a.zone_details.length > 0)) && (
                    <>
                      <Button
                        variant={showPitchHeatmap ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setShowPitchHeatmap(!showPitchHeatmap); setShowZonePerformance(false); setShowR90Flow(false); setShowHeatmap(false); setShowChanceCreation(false); setShowShotMap(false); }}
                        className="text-xs"
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        {t(reportLanguage, "pitch_heatmap")}
                      </Button>
                      <Button
                        variant={showZonePerformance ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setShowZonePerformance(!showZonePerformance); setShowPitchHeatmap(false); setShowR90Flow(false); setShowHeatmap(false); setShowChanceCreation(false); setShowTimelapse(false); setShowShotMap(false); }}
                        className="text-xs"
                      >
                        <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
                        {t(reportLanguage, "zone_performance")}
                      </Button>
                      <Button
                        variant={showTimelapse ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setShowTimelapse(!showTimelapse); setShowZonePerformance(false); setShowPitchHeatmap(false); setShowR90Flow(false); setShowHeatmap(false); setShowChanceCreation(false); setShowShotMap(false); }}
                        className="text-xs"
                      >
                        <Timer className="h-3.5 w-3.5 mr-1.5" />
                        {t(reportLanguage, "match_timelapse")}
                      </Button>
                    </>
                  )}
                  {/* Chance Creation Flow - only show if xC data exists */}
                  {analysis.striker_stats && ['crossing_movement_xC', 'movement_in_behind_xC', 'movement_down_side_xC', 'triple_threat_xC', 'movement_to_feet_xC'].some(k => (analysis.striker_stats as any)?.[k] > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowChanceCreation(!showChanceCreation); setShowR90Flow(false); setShowHeatmap(false); setShowPitchHeatmap(false); setShowShotMap(false); }}
                      className="text-xs"
                    >
                      <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                      {t(reportLanguage, "chance_creation_flow")}
                    </Button>
                  )}
                </div>
              )}

              {/* R90 Flow Chart */}
              {showR90Flow && analysis.minutes_played && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><R90FlowChart actions={actions} minutesPlayed={analysis.minutes_played} language={reportLanguage} /></CardContent></Card>
              )}

              {/* Action Heatmap */}
              {showHeatmap && analysis.minutes_played && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><ActionHeatmap actions={actions} minutesPlayed={analysis.minutes_played} language={reportLanguage} /></CardContent></Card>
              )}

              {/* Shot Map */}
              {showShotMap && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><ShotMapGraphic actions={actions} isGoalkeeper={/gk|goalkeeper|keeper|portiere|portero|gardien|tor(?:wart|hüter)?/i.test(analysis?.player_position || "")} /></CardContent></Card>
              )}

              {/* Pitch Heatmap */}
              {showPitchHeatmap && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><PitchHeatmap actions={actions} language={reportLanguage} /></CardContent></Card>
              )}

              {/* Zone Performance */}
              {showZonePerformance && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><ZonePerformance actions={actions} language={reportLanguage} onSelectZone={(zone, sub) => {
                  const zoneActions = filterActionsByZone(actions, zone, sub);
                  const clips = zoneActions.filter(a => hasPlayableClip(a)).map(a => ({
                    id: a.id, action_number: a.action_number, action_type: a.action_type,
                    action_description: a.action_description, video_url: a.video_url!, minute: a.minute,
                    notes: a.notes, clip_start: a.clip_start, clip_end: a.clip_end,
                  }));
                  if (clips.length > 0) {
                    setZonePlayerTitle(`Zone ${zone}${sub ? `.${sub}` : ''}`);
                    setZonePlayerClips(clips);
                    setShowZonePlayer(true);
                  }
                }} /></CardContent></Card>
              )}

              {/* Match Timelapse */}
              {showTimelapse && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><MatchTimelapse actions={actions} language={reportLanguage} /></CardContent></Card>
              )}

              {/* Chance Creation Flow */}
              {showChanceCreation && analysis.striker_stats && (
                <Card className="overflow-hidden"><CardContent className="p-3 md:p-6"><ChanceCreationFlow strikerStats={analysis.striker_stats as Record<string, any>} language={reportLanguage} /></CardContent></Card>
              )}

              {/* Performance Overview */}
              {analysis.performance_overview && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2">
                    <CardTitle className="text-sm md:text-lg">{t(reportLanguage, "overview")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    <p className="text-muted-foreground whitespace-pre-wrap text-center text-xs md:text-sm">{tf("performanceOverview", analysis.performance_overview)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Performance Actions */}
              {actions.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="py-1.5 md:py-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm md:text-lg">
                          {t(reportLanguage, "actions_label")} ({hasActiveFilters ? `${filteredActions.length}/${actions.length}` : actions.length})
                        </CardTitle>
                      <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                          <button
                            onClick={() => { setFilterTypes([]); setFilterRating(null); setFilterHasNotes(false); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          >
                            {t(reportLanguage, "clear_filters")}
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
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{t(reportLanguage, "action_type_label")}</p>
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
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{t(reportLanguage, "rating_label")}</p>
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
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{t(reportLanguage, "notes_label")}</p>
                          <button
                            onClick={() => setFilterHasNotes(!filterHasNotes)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                              filterHasNotes
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/30 text-foreground/70 border-border hover:bg-muted/50'
                            }`}
                          >
                            {t(reportLanguage, "with_notes")}
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
                              {t(reportLanguage, "watch_selected")} ({filteredActions.filter(a => a.video_url).length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-2 md:p-4">
                    {analysis?.report_type === 'team' && Array.isArray(analysis?.team_roster) && analysis.team_roster.length > 0 && (
                      <div className="mb-3 rounded-md border bg-muted/30 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Team roster{analysis?.is_scouting_report ? ' · Scouting report' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.team_roster.map((r: any) => (
                            <span key={r.id} className="px-2 h-6 inline-flex items-center rounded-full border bg-background text-[11px]" title={r.name || ''}>
                              <span className="font-semibold mr-1">#{r.number || '?'}</span>
                              {r.name && <span className="text-muted-foreground">{r.name}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
                                  openClip(action);
                                }}
                                className="text-risegold hover:text-risegold/80 p-0.5 flex-shrink-0"
                              >
                                <Video className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="font-medium text-xs mt-1 truncate">{toTitleCase(tAction(action.action_number - 1, "type", action.action_type))}</div>
                          {(analysis?.show_descriptions !== false) && <div className="text-[10px] text-foreground/80">{tAction(action.action_number - 1, "description", action.action_description)}</div>}
                          {analysis?.report_type === 'team' && Array.isArray((action as any).involved_players) && (action as any).involved_players.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(action as any).involved_players.map((p: any) => {
                                const entry = (analysis?.team_roster || []).find((r: any) => r.id === p.roster_id);
                                if (!entry) return null;
                                return (
                                  <span key={p.roster_id} className="px-1.5 h-4 inline-flex items-center rounded-full bg-primary/15 text-primary text-[9px] font-medium" title={entry.name || ''}>
                                    #{entry.number || '?'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {(action.notes || tAction(action.action_number - 1, "notes", "")) && (
                            <div className="text-[9px] text-muted-foreground italic mt-1 pt-1 border-t border-border/50 break-words">
                              {tAction(action.action_number - 1, "notes", action.notes || "")}
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
                            <th className="text-left py-2 px-2">{t(reportLanguage, "min_short")}</th>
                            <th className="text-left py-2 px-2">{t(reportLanguage, "type_label")}</th>
                            {(analysis?.show_descriptions !== false) && <th className="text-left py-2 px-2">{t(reportLanguage, "description_label")}</th>}
                            <th className="text-left py-2 px-2">{t(reportLanguage, "notes_label")}</th>
                            <th className="text-right py-2 px-2">{t(reportLanguage, "score_label")}</th>
                            <th className="text-center py-2 px-2">{t(reportLanguage, "clip_label")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActions.map((action) => (
                            <tr key={action.id} className="border-b border-border/50">
                              <td className="py-2 px-2">{action.action_number}</td>
                              <td className="py-2 px-2">{formatMinute(action.minute)}'</td>
                              <td className="py-2 px-2">
                                {toTitleCase(hasTranslation ? tAction(action.action_number - 1, "type", action.action_type) : translateActionType(reportLanguage, tAction(action.action_number - 1, "type", action.action_type)))}
                                {analysis?.report_type === 'team' && Array.isArray((action as any).involved_players) && (action as any).involved_players.length > 0 && (
                                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                                    {(action as any).involved_players.map((p: any) => {
                                      const entry = (analysis?.team_roster || []).find((r: any) => r.id === p.roster_id);
                                      if (!entry) return null;
                                      return (
                                        <span key={p.roster_id} className="px-1.5 h-4 inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-medium" title={entry.name || ''}>
                                          #{entry.number || '?'}
                                        </span>
                                      );
                                    })}
                                  </span>
                                )}
                              </td>
                              {(analysis?.show_descriptions !== false) && <td className="py-2 px-2">{tAction(action.action_number - 1, "description", action.action_description)}</td>}
                              <td className="py-2 px-2 text-muted-foreground">{tAction(action.action_number - 1, "notes", action.notes || "") || "-"}</td>
                              <td className={`py-2 px-2 text-right ${getActionScoreColor(action.action_score)}`}>
                                {action.action_score?.toFixed(5)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {action.video_url ? (
                                  <button
                                    onClick={() => {
                                      const translated = getTranslatedActionData(action);
                                      openClip(action);
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
              setSelectedClipStart(null);
              setSelectedClipEnd(null);
            }
          }}
          videoUrl={selectedVideoUrl}
          actionTitle={selectedVideoTitle}
          language={reportLanguage}
          clipStart={selectedClipStart}
          clipEnd={selectedClipEnd}
          player={sharedClipPlayer}
        />
      )}

      {/* Clipped Actions Player */}
      <ClippedActionsPlayer
        open={showClippedActions}
        onOpenChange={setShowClippedActions}
        language={reportLanguage}
          clips={reportClips.map(a => {
            const translated = getTranslatedActionData(a);
            return {
              id: a.id,
              action_number: a.action_number,
              action_type: translated.action_type,
              action_description: translated.action_description,
              video_url: a.video_url!,
              minute: a.minute,
              notes: translated.notes,
              clip_start: a.clip_start,
              clip_end: a.clip_end,
            };
          })}
        player={sharedClipPlayer}
        showDownloads={analysis?.category === "highlights"}
        onDownloadCurrent={(clip: any) => {
          if (!clip?.video_url) return;
          downloadVideo(clip.video_url, `clip-${clip.action_number}-${clip.action_type || "highlight"}`);
        }}
        onDownloadAll={(clips: any[]) => {
          const valid = clips.filter((c) => c.video_url);
          if (valid.length === 0) { toast.error("No downloadable clips"); return; }
          valid.forEach((c, i) => {
            setTimeout(() => downloadVideo(c.video_url, `clip-${i + 1}-${c.action_type || "highlight"}`), i * 500);
          });
          toast.success(`Downloading ${valid.length} clips…`);
        }}
        playerId={analysis?.player_id || undefined}
      />

      {/* Ranked/Full Match Video Player */}
      <RankedActionsPlayer
        open={showRankedPlayer}
        onOpenChange={setShowRankedPlayer}
        mode={rankedMode}
        language={reportLanguage}
          clips={reportClips.map(a => {
            const translated = getTranslatedActionData(a);
            return {
              id: a.id,
              action_number: a.action_number,
              action_type: translated.action_type,
              action_description: translated.action_description,
              action_score: a.action_score,
              video_url: a.video_url!,
              minute: a.minute,
              notes: translated.notes,
              clip_start: a.clip_start,
              clip_end: a.clip_end,
            };
          })}
        player={sharedClipPlayer}
      />

      {/* Filtered Video Player */}
      <RankedActionsPlayer
        open={showFilteredPlayer}
        onOpenChange={setShowFilteredPlayer}
        mode="chronological"
        language={reportLanguage}
          clips={filteredReportClips.map(a => {
            const translated = getTranslatedActionData(a);
            return {
              id: a.id,
              action_number: a.action_number,
              action_type: translated.action_type,
              action_description: translated.action_description,
              action_score: a.action_score,
              video_url: a.video_url!,
              minute: a.minute,
              notes: translated.notes,
              clip_start: a.clip_start,
              clip_end: a.clip_end,
            };
          })}
        player={sharedClipPlayer}
      />

      {/* Zone Clips Player */}
      <ClippedActionsPlayer
        open={showZonePlayer}
        onOpenChange={setShowZonePlayer}
        clips={zonePlayerClips}
        language={reportLanguage}
        title={zonePlayerTitle}
        player={sharedClipPlayer}
        playerId={analysis?.player_id || undefined}
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
