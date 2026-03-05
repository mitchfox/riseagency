import React, { useState, useEffect, useRef, useCallback } from "react";
import { playSuccess } from "@/lib/soundEffects";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, EyeOff, AlertTriangle, Search, Loader2, ChevronDown, ChevronUp, List, GripVertical, ArrowLeft, Save, X, ArrowUp, ArrowDown, ChevronsUpDown, Check } from "lucide-react";
import { VisibilityStatusButton, VisibilityStatus } from "./VisibilityStatusButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toTitleCase } from "@/lib/titleCase";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { R90RatingsViewer } from "./R90RatingsViewer";
import { formatScoreWithFrequency } from "@/lib/utils";
import { ActionsByTypeDialog } from "./ActionsByTypeDialog";
import { ActionVideoUpload } from "./ActionVideoUpload";
import { ActionStatRecorder, aggregateRecordedStats, RecordedStat, STAT_TYPE_CONFIGS, StatTypeConfig } from "./ActionStatRecorder";
import { UnifiedStatsEditor, UnifiedStat, mergeStatsForEditor, unifiedStatsToStrikerStats } from "./UnifiedStatsEditor";
import { FixtureStatsEditor, UNIFIED_TO_FIXTURE_MAP, FIXTURE_TO_UNIFIED_MAP } from "./FixtureStatsEditor";
import { InlineFixtureCreator } from "./InlineFixtureCreator";
import { logActivity } from "@/lib/activityLogger";
import { ReportLanguageSelector } from "./ReportLanguageSelector";
import { parseMinuteToSeconds } from "@/lib/actionSorting";
import { ZonePitchSelector, type ZonePoint } from "@/components/report/ZonePitchSelector";
import { fetchPlayerActionFrequencies, canonicalActionType } from "@/lib/playerActionFrequency";

// Format minute as MM.SS with proper zero padding (e.g., 0.3 → "0.30", 10.5 → "10.50")
const formatMinuteForInput = (minute: number | null): string => {
  if (minute === null) return "";
  const minPart = Math.floor(minute);
  const secPart = Math.round((minute - minPart) * 100);
  return `${minPart}.${secPart.toString().padStart(2, '0')}`;
};

// Sort actions chronologically by game time; actions without a minute keep their current position
const sortActionsChronologically = (actions: PerformanceAction[]): PerformanceAction[] => {
  // Separate actions with and without minutes
  const withMinute: { action: PerformanceAction; originalIndex: number; seconds: number }[] = [];
  const withoutMinute: { action: PerformanceAction; originalIndex: number }[] = [];
  
  actions.forEach((action, i) => {
    const secs = parseMinuteToSeconds(action.minute);
    if (secs === Infinity) {
      withoutMinute.push({ action, originalIndex: i });
    } else {
      withMinute.push({ action, originalIndex: i, seconds: secs });
    }
  });
  
  // Sort only the actions that have minutes
  withMinute.sort((a, b) => a.seconds - b.seconds);
  
  // Rebuild: place sorted actions with minutes in their slots, keep empty-minute actions in place
  const result: PerformanceAction[] = new Array(actions.length);
  
  // First, place actions without minutes in their original positions
  withoutMinute.forEach(({ action, originalIndex }) => {
    result[originalIndex] = action;
  });
  
  // Then fill remaining slots with sorted actions that have minutes
  let sortedIdx = 0;
  for (let i = 0; i < result.length; i++) {
    if (!result[i] && sortedIdx < withMinute.length) {
      result[i] = withMinute[sortedIdx].action;
      sortedIdx++;
    }
  }
  
  // Renumber
  result.forEach((action, i) => { action.action_number = i + 1; });
  return result;
};

interface CreatePerformanceReportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  playerId: string;
  playerName: string;
  onSuccess?: () => void;
  analysisId?: string; // For edit mode
  inline?: boolean; // When true, renders without Dialog wrapper
  onClose?: () => void; // Required for inline mode
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
  id?: string;
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
  video_url?: string | null;
  recorded_stat?: RecordedStat | RecordedStat[] | null;
  zone?: number | null;
  zone_details?: ZonePoint[] | null;
}

interface SortableStatItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableStatItem = ({ id, children }: SortableStatItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-1 hover:bg-accent/50 rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-7">
        {children}
      </div>
    </div>
  );
};

export const CreatePerformanceReportDialog = ({
  open = true,
  onOpenChange,
  playerId,
  playerName,
  onSuccess,
  analysisId,
  inline = false,
  onClose,
}: CreatePerformanceReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");
  const [showStrikerStats, setShowStrikerStats] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [playerClub, setPlayerClub] = useState<string>("");
  const [playerPosition, setPlayerPosition] = useState<string>("");
  const [availableStats, setAvailableStats] = useState<Array<{id: string; stat_name: string; stat_key: string; description: string | null}>>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<string[]>([]);
  const [allStats, setAllStats] = useState<Array<{id: string; stat_name: string; stat_key: string; description: string | null}>>([]);
  const [isAddStatDialogOpen, setIsAddStatDialogOpen] = useState(false);
  const [hiddenStatKeys, setHiddenStatKeys] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [actionTypeFrequencyMap, setActionTypeFrequencyMap] = useState<Record<string, number>>({});
  const [descriptionsByType, setDescriptionsByType] = useState<Record<string, string[]>>({});
  const [descriptionPopoverOpen, setDescriptionPopoverOpen] = useState<Record<number, boolean>>({});
  const [actionTypePopoverOpen, setActionTypePopoverOpen] = useState<Record<number, boolean>>({});
  const [allR90Ratings, setAllR90Ratings] = useState<Array<{score: string | number | null, title: string, description: string}>>([]);
  const [expandedScores, setExpandedScores] = useState<Set<number>>(new Set());
  const [selectedScores, setSelectedScores] = useState<Record<number, Set<number>>>({}); // actionIndex -> Set of score indices
  const [isR90ViewerOpen, setIsR90ViewerOpen] = useState(false);
  const [r90ViewerCategory, setR90ViewerCategory] = useState<string | undefined>(undefined);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);
  
  const [actionSearchFilters, setActionSearchFilters] = useState<Record<number, string>>({});
  const [isByActionDialogOpen, setIsByActionDialogOpen] = useState(false);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedStat[]>([]);
  const [fixtureStats, setFixtureStats] = useState<Record<string, number>>({});
  const [previousFixtureStats, setPreviousFixtureStats] = useState<Record<string, number>>({});
  const [dragOverAction, setDragOverAction] = useState<number | null>(null);
  const [dropUploading, setDropUploading] = useState<number | null>(null);
  const [reportLanguage, setReportLanguage] = useState("en");
  const [visibilityStatus, setVisibilityStatus] = useState<VisibilityStatus>("draft");
  const [placeholderRawScore, setPlaceholderRawScore] = useState("");
  const [placeholderMinutes, setPlaceholderMinutes] = useState("");
  const initialVisibilityRef = useRef<VisibilityStatus | null>(null);

  // Key stats
  const [r90Score, setR90Score] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState("");
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("");
  const [performanceOverview, setPerformanceOverview] = useState("");

  // Function to intelligently map action type/description to R90 category
  const getR90CategoryFromAction = (actionType: string, actionDescription: string): string => {
    const combined = `${actionType} ${actionDescription}`.toLowerCase();
    
    if (combined.includes('press') || combined.includes('counter-press') || combined.includes('high press')) {
      return 'Pressing';
    }
    if (combined.includes('tackle') || combined.includes('block') || combined.includes('intercept') || 
        combined.includes('defend') || combined.includes('recovery')) {
      return 'Defensive';
    }
    if (combined.includes('aerial') || combined.includes('header') || combined.includes('duel in air')) {
      return 'Aerial Duels';
    }
    if (combined.includes('cross') || combined.includes('cutback') || combined.includes('delivery')) {
      return 'Attacking Crosses';
    }
    if (combined.includes('dribble') || combined.includes('carry') || combined.includes('turn') || 
        combined.includes('1v1') || combined.includes('pass') || combined.includes('shot')) {
      return 'On-Ball Decision-Making';
    }
    if (combined.includes('run') || combined.includes('movement') || combined.includes('position') || 
        combined.includes('space') || combined.includes('support')) {
      return 'Off-Ball Movement';
    }
    
    return 'all';
  };

  const openSmartR90Viewer = async (actionIndex: number) => {
    const action = actions[actionIndex];
    if (!action.action_type) {
      // Fallback to generic R90 viewer
      setR90ViewerCategory(undefined);
      setR90ViewerSearch(undefined);
      setIsR90ViewerOpen(true);
      return;
    }
    
    // First, try to get category from database mapping
    // Check for both exact subcategory matches and wildcard (null subcategory) matches
    try {
      const { data: mappings } = await supabase
        .from('action_r90_category_mappings')
        .select('r90_category, r90_subcategory, selected_rating_ids')
        .eq('action_type', action.action_type.trim());
      
      // Prioritize specific subcategory mappings over wildcard mappings
      const mapping = mappings?.find(m => m.r90_subcategory !== null) || mappings?.[0];
      
      if (mapping?.r90_category) {
        console.log(`Using mapped category: ${action.action_type} -> ${mapping.r90_category}`);
        setR90ViewerCategory(mapping.r90_category);
        setR90ViewerSearch(action.action_type);
        setIsR90ViewerOpen(true);
        return;
      }
    } catch (error) {
      console.error('Error fetching category mapping:', error);
    }
    
    // Fallback to keyword-based matching
    const category = getR90CategoryFromAction(action.action_type, action.action_description);
    const searchTerm = action.action_type;
    
    setR90ViewerCategory(category);
    setR90ViewerSearch(searchTerm);
    setIsR90ViewerOpen(true);
  };

  const openR90Viewer = (actionIndex: number) => {
    const action = actions[actionIndex];
    const category = getR90CategoryFromAction(action.action_type || '', action.action_description || '');
    setR90ViewerCategory(category);
    setR90ViewerSearch(action.action_type || '');
    setIsR90ViewerOpen(true);
  };

  // Filter R90 ratings based on action-level search - requires search term
  const getFilteredScores = (index: number) => {
    const filter = actionSearchFilters[index]?.toLowerCase().trim();
    if (!filter) return []; // Don't show anything until user types a search
    return allR90Ratings.filter(s => 
      s.title?.toLowerCase().includes(filter) || 
      s.description?.toLowerCase().includes(filter)
    );
  };
  
  // Fetch all R90 ratings once for local filtering
  const fetchAllR90Ratings = async () => {
    try {
      const { data, error } = await supabase
        .from("r90_ratings")
        .select("score, description, title")
        .not("score", "is", null);
      
      if (error) throw error;
      
      if (data) {
        setAllR90Ratings(data.map(item => ({
          score: item.score,
          title: item.title || "",
          description: item.description || ""
        })));
      }
    } catch (error) {
      console.error("Error fetching R90 ratings:", error);
    }
  };

  // Dynamic stats based on position
  const [additionalStats, setAdditionalStats] = useState<Record<string, string>>({});
  
  // Store original striker_stats from database to preserve unmodified fields
  const [originalStrikerStats, setOriginalStrikerStats] = useState<Record<string, any> | null>(null);
  
  // Striker stats (keeping for backwards compatibility)
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedStatKeys((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle video file drop onto an action row
  const handleActionDrop = async (e: React.DragEvent, actionIndex: number) => {
    e.preventDefault();
    setDragOverAction(null);
    const file = e.dataTransfer.files?.[0];
    const action = actions[actionIndex];
    if (!file || !file.type.startsWith('video/') || !action.id) return;

    setDropUploading(actionIndex);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `action-clips/${action.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('analysis-files')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('analysis-files').getPublicUrl(fileName);
      
      await supabase.from('performance_report_actions').update({ video_url: publicUrl }).eq('id', action.id);
      updateAction(actionIndex, 'video_url', publicUrl);
      toast.success('Clip uploaded via drag and drop');
    } catch (err: any) {
      toast.error('Failed to upload: ' + err.message);
    } finally {
      setDropUploading(null);
    }
  };

  // Fetch previous fixture stats from the player's most recent report
  const fetchPreviousFixtureStats = async () => {
    try {
      const { data } = await supabase
        .from("player_analysis")
        .select("fixture_stats")
        .eq("player_id", playerId)
        .not("fixture_stats", "is", null)
        .order("analysis_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.fixture_stats) {
        setPreviousFixtureStats(data.fixture_stats as Record<string, number>);
      }
    } catch (err) {
      console.error("Error fetching previous fixture stats:", err);
    }
  };

  useEffect(() => {
    // In inline mode, always load; in dialog mode, only when open
    if ((inline || open) && playerId) {
      console.log('CreatePerformanceReportDialog opened for player:', playerId);
      fetchActionTypes();
      fetchAllR90Ratings(); // Fetch all R90 ratings once for local filtering
      fetchPreviousFixtureStats();
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
  }, [inline, open, analysisId, playerId]);

  // Auto-calculate per90 statistics
  useEffect(() => {
    const minutes = parseFloat(minutesPlayed);
    if (!minutes || minutes <= 0) return;

    const calculatePer90 = (baseValue: string) => {
      const value = parseFloat(baseValue);
      if (!value || isNaN(value)) return "";
      return ((value / minutes) * 90).toFixed(3);
    };

    setStrikerStats(prev => ({
      ...prev,
      xGChain_per90: calculatePer90(prev.xGChain),
      xG_adj_per90: calculatePer90(prev.xG_adj),
      xA_adj_per90: calculatePer90(prev.xA_adj),
      movement_in_behind_xC_per90: calculatePer90(prev.movement_in_behind_xC),
      movement_down_side_xC_per90: calculatePer90(prev.movement_down_side_xC),
      triple_threat_xC_per90: calculatePer90(prev.triple_threat_xC),
      movement_to_feet_xC_per90: calculatePer90(prev.movement_to_feet_xC),
      crossing_movement_xC_per90: calculatePer90(prev.crossing_movement_xC),
      interceptions_per90: calculatePer90(prev.interceptions),
      regains_adj_per90: calculatePer90(prev.regains_adj),
      turnovers_adj_per90: calculatePer90(prev.turnovers_adj),
      progressive_passes_adj_per90: calculatePer90(prev.progressive_passes_adj),
    }));

    // Auto-calculate per90 ONLY for rate-based stats (xG, xA, xC, xGChain types)
    // Do NOT calculate per90 for count-based stats (dribbles, passes, shots, touches, etc.)
    const rateBasedStatPrefixes = ['xg', 'xa', 'xc', 'xgchain'];
    setAdditionalStats(prev => {
      const updatedStats: Record<string, string> = { ...prev };
      let changed = false;
      Object.keys(prev).forEach(key => {
        if (!key.endsWith('_per90')) {
          const keyLower = key.toLowerCase();
          const isRateBasedStat = rateBasedStatPrefixes.some(prefix => keyLower.includes(prefix));
          if (isRateBasedStat) {
            const per90Key = `${key}_per90`;
            const newVal = calculatePer90(prev[key]);
            if (updatedStats[per90Key] !== newVal) {
              updatedStats[per90Key] = newVal;
              changed = true;
            }
          }
        }
      });
      return changed ? updatedStats : prev;
    });
  }, [minutesPlayed, strikerStats.xGChain, strikerStats.xG_adj, strikerStats.xA_adj, 
      strikerStats.movement_in_behind_xC, strikerStats.movement_down_side_xC, 
      strikerStats.triple_threat_xC, strikerStats.movement_to_feet_xC, 
      strikerStats.crossing_movement_xC, strikerStats.interceptions, 
      strikerStats.regains_adj, strikerStats.turnovers_adj, strikerStats.progressive_passes_adj,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(additionalStats)]);

  // Auto-calculate xGChain and xGChain_per90 directly from actions
  useEffect(() => {
    // Sum only positive action scores
    const totalXGChain = actions.reduce((sum, action) => {
      const score = parseFloat(action.action_score || "");
      if (isNaN(score) || score <= 0) return sum;
      return sum + score;
    }, 0);

    const minutes = parseFloat(minutesPlayed);

    setStrikerStats(prev => {
      const updated: typeof prev = {
        ...prev,
        xGChain: totalXGChain ? totalXGChain.toFixed(3) : "",
      };

      if (minutes && minutes > 0 && totalXGChain) {
        const per90 = (totalXGChain / minutes) * 90;
        updated.xGChain_per90 = per90.toFixed(3);
      }

      if (!minutes || minutes <= 0 || !totalXGChain) {
        updated.xGChain_per90 = "";
      }

      return updated;
    });
  }, [actions, minutesPlayed]);

  // Sync unified stats when actions change (from recorded stats)
  useEffect(() => {
    const actionRecordedStats = aggregateRecordedStats(actions);
    const minutes = parseInt(minutesPlayed) || 0;
    
    // Merge action-recorded stats with existing manual stats
    // Preserve manual stats that don't have a corresponding action-recorded stat
    setUnifiedStats(prevStats => {
      const actionStatKeys = new Set<string>();
      const newStats: UnifiedStat[] = [];
      
      // Add action-recorded stats
      Object.entries(actionRecordedStats).forEach(([statType, stat]) => {
        // Try to find matching config for proper key
        const config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => 
          c.name.toLowerCase() === statType.toLowerCase() ||
          c.key === statType.toLowerCase().replace(/\s+/g, '_')
        );
        
        const key = config?.key || statType.toLowerCase().replace(/\s+/g, '_');
        const displayName = config?.name || statType;
        
        actionStatKeys.add(key);
        
        const unified: UnifiedStat = {
          key,
          displayName,
          type: stat.type,
          isFromActions: true,
        };

        if (stat.type === 'success_fail') {
          unified.successful = stat.successful;
          unified.total = stat.total;
        } else if (stat.type === 'count') {
          unified.count = stat.count;
        } else if (stat.type === 'score') {
          unified.score = stat.totalScore;
          const keyLower = key.toLowerCase();
          if (['xg', 'xa', 'xc', 'xgchain', 'npxg'].some(p => keyLower.includes(p)) && minutes > 0) {
            unified.per90 = ((stat.totalScore / minutes) * 90).toFixed(3);
          }
        }

        newStats.push(unified);
      });
      
      // Keep manual stats that aren't from actions
      prevStats.forEach(stat => {
        if (!stat.isFromActions && !actionStatKeys.has(stat.key)) {
          newStats.push(stat);
        }
      });
      
      return newStats;
    });
  }, [actions, minutesPlayed]);

  /** Look up descriptions using canonical key so case/spacing variants still match */
  const getDescriptionsForType = (actionType: string): string[] => {
    const canon = canonicalActionType(actionType);
    return descriptionsByType[canon] || [];
  };

  const fetchActionTypes = async () => {
    const result = await fetchPlayerActionFrequencies(playerId);
    setActionTypes(result.sortedTypes);
    setActionTypeFrequencyMap(result.frequencyMap);
    setDescriptionsByType(result.descriptionsByType);
  };

  const fetchPlayerClub = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("club, position")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      setPlayerClub(data?.club || "");
      setPlayerPosition(data?.position || "");
      
      // Fetch all stats for the add dialog
      const { data: allStatsData, error: allStatsError } = await supabase
        .from("performance_statistics")
        .select("id, stat_name, stat_key, description")
        .order("stat_name");
      
      if (!allStatsError && allStatsData) {
        // Filter out per90 stats from manual selection
        const nonPer90Stats = allStatsData.filter(stat => !stat.stat_key.endsWith('_per90'));
        setAllStats(nonPer90Stats);
      }
      
      // Fetch hidden stats for this player
      const { data: hiddenStats } = await supabase
        .from("player_hidden_stats")
        .select("stat_key")
        .eq("player_id", playerId);
      
      const hiddenKeys = hiddenStats?.map(h => h.stat_key) || [];
      setHiddenStatKeys(hiddenKeys);
      
      // Fetch available stats for this position
      if (data?.position) {
        const { data: stats, error: statsError } = await supabase
          .from("performance_statistics")
          .select("id, stat_name, stat_key, description")
          .contains("positions", [data.position])
          .order("stat_name");
        
        if (!statsError && stats) {
          setAvailableStats(stats);
          // Only auto-select position stats in CREATE mode, not edit mode
          // In edit mode, selectedStatKeys will be set by fetchExistingData
          if (!analysisId) {
            const nonPer90Keys = stats
              .filter(s => !s.stat_key.endsWith('_per90') && !hiddenKeys.includes(s.stat_key))
              .map(s => s.stat_key);
            setSelectedStatKeys(nonPer90Keys);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching player club:", error);
    }
  };

  const fetchFixtures = async () => {
    console.log('fetchFixtures called for playerId:', playerId);
    try {
      const { data: playerFixtures, error: pfError } = await supabase
        .from("player_fixtures")
        .select("fixture_id")
        .eq("player_id", playerId);

      console.log('player_fixtures result:', playerFixtures, 'error:', pfError);

      if (pfError) throw pfError;

      if (playerFixtures && playerFixtures.length > 0) {
        const fixtureIds = playerFixtures.map(pf => pf.fixture_id);
        
        const { data: fixturesData, error: fError } = await supabase
          .from("fixtures")
          .select("*")
          .in("id", fixtureIds)
          .order("match_date", { ascending: false });

        console.log('fixtures data:', fixturesData, 'error:', fError);

        if (fError) throw fError;
        setFixtures(fixturesData || []);
      } else {
        // No linked fixtures - fetch all recent fixtures for scouted players
        console.log('No linked fixtures, fetching all fixtures');
        const { data: allFixtures, error: allError } = await supabase
          .from("fixtures")
          .select("*")
          .order("match_date", { ascending: false })
          .limit(100);

        console.log('all fixtures:', allFixtures?.length, 'error:', allError);

        if (allError) throw allError;
        setFixtures(allFixtures || []);
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
      // Intelligently determine opponent based on player's club or "For" placeholder
      let opponentTeam = fixture.away_team; // Default to away team
      
      // First check for "For" placeholder (used to represent player's team)
      const homeIsFor = fixture.home_team.toLowerCase() === "for" || fixture.home_team.toLowerCase().includes("for ");
      const awayIsFor = fixture.away_team.toLowerCase() === "for" || fixture.away_team.toLowerCase().includes("for ");
      
      if (homeIsFor) {
        opponentTeam = fixture.away_team;
      } else if (awayIsFor) {
        opponentTeam = fixture.home_team;
      } else if (playerClub) {
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
      setSelectedFixtureId(analysisData.fixture_id || "");
      setPerformanceOverview(analysisData.performance_overview || "");
      setVisibilityStatus((analysisData as any).visibility_status || "draft");
      initialVisibilityRef.current = (analysisData as any).visibility_status || "draft";
      setPlaceholderRawScore((analysisData as any).placeholder_raw_score?.toString() || "");
      setPlaceholderMinutes((analysisData as any).placeholder_minutes?.toString() || "");
      setFixtureStats((analysisData.fixture_stats as Record<string, number>) || {});
      
      // Re-derive opponent from fixture data to reflect any changes to fixture
      // (fixture team names may have been edited since report was saved)
      if (analysisData.fixture_id) {
        // Fetch the fixture directly to get latest data
        const { data: fixtureData } = await supabase
          .from("fixtures")
          .select("*")
          .eq("id", analysisData.fixture_id)
          .single();
        
        if (fixtureData) {
          // Intelligently determine opponent based on player's club or "For" placeholder
          let opponentTeam = fixtureData.away_team;
          const homeIsFor = fixtureData.home_team.toLowerCase() === "for" || fixtureData.home_team.toLowerCase().includes("for ");
          const awayIsFor = fixtureData.away_team.toLowerCase() === "for" || fixtureData.away_team.toLowerCase().includes("for ");
          
          if (homeIsFor) {
            opponentTeam = fixtureData.away_team;
          } else if (awayIsFor) {
            opponentTeam = fixtureData.home_team;
          } else if (playerClub) {
            if (fixtureData.home_team === playerClub) {
              opponentTeam = fixtureData.away_team;
            } else if (fixtureData.away_team === playerClub) {
              opponentTeam = fixtureData.home_team;
            }
          }
          setOpponent(opponentTeam);
          if (fixtureData.home_score !== null && fixtureData.away_score !== null) {
            setResult(`${fixtureData.home_score}-${fixtureData.away_score}`);
          } else {
            setResult(analysisData.result || "");
          }
        } else {
          // Fixture not found, use stored values
          setOpponent(analysisData.opponent || "");
          setResult(analysisData.result || "");
        }
      } else {
        // No fixture_id, use stored values
        setOpponent(analysisData.opponent || "");
        setResult(analysisData.result || "");
      }

      // Populate striker stats if they exist
      if (analysisData.striker_stats) {
        const stats = analysisData.striker_stats as any;
        // Store original stats to preserve any fields not loaded into form
        setOriginalStrikerStats(stats);
        
        // Populate legacy striker stats
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
        
        // Populate additional stats (any keys not in legacy striker stats)
        // Only truly legacy stats that are NOT in the performance_statistics table
        // xG_adj, xA_adj, etc. are now in performance_statistics and should load via additionalStats
        const legacyKeys = new Set([
          'xGChain', 'xGChain_per90',
          'movement_in_behind_xC', 'movement_in_behind_xC_per90', 
          'movement_down_side_xC', 'movement_down_side_xC_per90', 
          'triple_threat_xC', 'triple_threat_xC_per90',
          'movement_to_feet_xC', 'movement_to_feet_xC_per90', 
          'crossing_movement_xC', 'crossing_movement_xC_per90',
          'interceptions', 'interceptions_per90',
          'regains_adj', 'regains_adj_per90', 
          'turnovers_adj', 'turnovers_adj_per90',
          'progressive_passes_adj', 'progressive_passes_adj_per90'
        ]);
        
        const newStats: Record<string, string> = {};
        // Use stats_order if available for proper ordering
        const savedStatsOrder = stats.stats_order as string[] | undefined;
        let statsKeys: string[] = [];
        
        Object.entries(stats).forEach(([key, value]) => {
          if (!legacyKeys.has(key) && key !== 'stats_order' && value != null) {
            newStats[key] = value.toString();
            // Only add non-per90 keys to selectedStatKeys (per90 will be auto-calculated)
            if (!key.endsWith('_per90') && !savedStatsOrder) {
              statsKeys.push(key);
            }
          }
        });
        
        // Use saved order if available
        if (savedStatsOrder && savedStatsOrder.length > 0) {
          statsKeys = savedStatsOrder;
        }
        
        if (Object.keys(newStats).length > 0) {
          setAdditionalStats(newStats);
          setSelectedStatKeys(statsKeys);
        }
        
        // Load unified stats from saved striker_stats
        const minutes = analysisData.minutes_played || 0;
        const loadedUnifiedStats: UnifiedStat[] = [];
        
        // Helper to find config by key (case-insensitive with fallbacks)
        const findStatConfig = (key: string): StatTypeConfig | undefined => {
          // Try exact match first
          let config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key === key);
          if (config) return config;
          
          // Try lowercase match
          const keyLower = key.toLowerCase();
          config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => c.key.toLowerCase() === keyLower);
          if (config) return config;
          
          // Try normalized key (replace special chars, lowercase)
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
          config = STAT_TYPE_CONFIGS.find((c: StatTypeConfig) => 
            c.key.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalizedKey
          );
          return config;
        };
        
        // Look for paired stats (successful/total) and single stats
        const processedKeys = new Set<string>();
        const pairedStats = new Map<string, { successful?: number; total?: number }>();
        
        Object.keys(stats).forEach(key => {
          if (key === 'stats_order' || legacyKeys.has(key)) return;
          if (key.endsWith('_successful')) {
            const baseKey = key.replace('_successful', '');
            if (!pairedStats.has(baseKey)) pairedStats.set(baseKey, {});
            pairedStats.get(baseKey)!.successful = stats[key];
          } else if (key.endsWith('_total')) {
            const baseKey = key.replace('_total', '');
            if (!pairedStats.has(baseKey)) pairedStats.set(baseKey, {});
            pairedStats.get(baseKey)!.total = stats[key];
          }
        });
        
        // Add paired stats as success_fail type
        pairedStats.forEach((values, baseKey) => {
          processedKeys.add(baseKey);
          processedKeys.add(`${baseKey}_successful`);
          processedKeys.add(`${baseKey}_total`);
          
          const config = findStatConfig(baseKey);
          const displayName = config?.name || baseKey
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          
          loadedUnifiedStats.push({
            key: config?.key || baseKey,
            displayName,
            type: 'success_fail',
            successful: values.successful ?? 0,
            total: values.total ?? 0,
            isFromActions: false,
          });
        });
        
        // Add remaining single stats
        Object.keys(stats).forEach(key => {
          if (processedKeys.has(key) || legacyKeys.has(key) || key === 'stats_order') return;
          if (key.endsWith('_per90') || key.endsWith('_successful') || key.endsWith('_total')) return;
          
          const value = stats[key];
          if (typeof value !== 'number') return;
          
          // Find the config for this stat
          const config = findStatConfig(key);
          const displayName = config?.name || key
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          
          // Determine type from config or patterns
          const keyLower = key.toLowerCase();
          let statType: 'score' | 'count' = 'count';
          
          if (config) {
            statType = config.mode === 'score' ? 'score' : (config.mode === 'count' ? 'count' : 'count');
          } else {
            // Fallback pattern matching for unlisted stats
            const isScoreType = ['xg', 'xa', 'xc', 'xgchain', 'ratio'].some(p => keyLower.includes(p));
            statType = isScoreType ? 'score' : 'count';
          }
          
          // Use the config key if available to ensure consistency
          const statKey = config?.key || key;
          
          if (statType === 'score') {
            loadedUnifiedStats.push({
              key: statKey,
              displayName,
              type: 'score',
              score: value,
              per90: minutes > 0 ? ((value / minutes) * 90).toFixed(3) : undefined,
              isFromActions: false,
            });
          } else {
            loadedUnifiedStats.push({
              key: statKey,
              displayName,
              type: 'count',
              count: value,
              isFromActions: false,
            });
          }
        });
        
        if (loadedUnifiedStats.length > 0) {
          setUnifiedStats(loadedUnifiedStats);
        }
        
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
        const mappedActions = actionsData.map((action) => ({
            id: action.id,
            action_number: action.action_number,
            minute: formatMinuteForInput(action.minute),
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
            video_url: action.video_url || null,
            recorded_stat: action.recorded_stat as unknown as RecordedStat | null,
            zone: action.zone || null,
            zone_details: (action as any).zone_details || null,
          }));
        setActions(sortActionsChronologically(mappedActions));
        
        // R90 scores are now fetched once and filtered locally - no per-action fetching needed
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
    setFixtureStats({});
    setResult("");
    setSelectedFixtureId("");
    setPerformanceOverview("");
    setShowStrikerStats(false);
    setAdditionalStats({});
    setOriginalStrikerStats(null);
    setSelectedStatKeys(availableStats.filter(s => !s.stat_key.endsWith('_per90') && !hiddenStatKeys.includes(s.stat_key)).map(s => s.stat_key)); // Reset to position-specific stats (excluding per90 and hidden)
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

  const refreshActions = async () => {
    if (!analysisId) return;
    
    try {
      const { data: actionsData, error } = await supabase
        .from("performance_report_actions")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("action_number", { ascending: true });

      if (error) throw error;

      if (actionsData && actionsData.length > 0) {
        const mappedActions = actionsData.map((action) => ({
            id: action.id,
            action_number: action.action_number,
            minute: formatMinuteForInput(action.minute),
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
            video_url: action.video_url || null,
            recorded_stat: action.recorded_stat as unknown as RecordedStat | null,
            zone: action.zone || null,
            zone_details: (action as any).zone_details || null,
          }));
        setActions(sortActionsChronologically(mappedActions));
      }
    } catch (error: any) {
      console.error("Error refreshing actions:", error);
      toast.error("Failed to refresh actions");
    }
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

  const insertActionAt = (position: number) => {
    const newAction = {
      action_number: position + 1,
      minute: "",
      action_score: "",
      action_type: "",
      action_description: "",
      notes: ""
    };
    
    const newActions = [
      ...actions.slice(0, position),
      newAction,
      ...actions.slice(position)
    ];
    
    // Renumber all actions
    newActions.forEach((action, i) => {
      action.action_number = i + 1;
    });
    
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    // Renumber actions
    newActions.forEach((action, i) => {
      action.action_number = i + 1;
    });
    setActions(newActions);
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= actions.length) return;
    const newActions = [...actions];
    [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
    newActions.forEach((action, i) => { action.action_number = i + 1; });
    setActions(newActions);
  };

  const updateAction = (
    index: number,
    field: keyof PerformanceAction,
    value: string | number | null | RecordedStat | RecordedStat[] | ZonePoint[]
  ) => {
    setActions((prevActions) => {
      const newActions = [...prevActions];
      newActions[index] = { ...newActions[index], [field]: value } as PerformanceAction;
      return newActions;
    });
  };

  // Sort actions on minute blur instead of every keystroke
  const handleMinuteBlur = useCallback(() => {
    setActions((prev) => sortActionsChronologically(prev));
  }, []);

  // Extract keywords from description for better matching
  const getKeywords = (text: string) => {
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'and', 'or', 'but'];
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
  };

  // fetchCategoryScores is no longer used - we fetch all R90 ratings once and filter locally

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

  // AI score filling function removed - users should use R90 Ratings Viewer for manual lookup

  // Bulk AI score filling function removed - users should use R90 Ratings Viewer for manual lookup

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

    setLoading(true);

    try {
      const fixture = fixtures.find(f => f.id === selectedFixtureId);
      
      // Calculate R90 from actions
      const rawScore = actions.reduce((sum, a) => sum + (parseFloat(a.action_score) || 0), 0);
      const calculatedR90 = (rawScore / parseInt(minutesPlayed)) * 90;
      
      // Prepare striker stats JSONB - from unified stats editor
      let strikerStatsJson: Record<string, any> | null = null;
      
      // Include legacy striker stats if any have values
      const hasLegacyStrikerStats = Object.values(strikerStats).some(v => v !== "");
      const hasUnifiedStats = unifiedStats.length > 0;
      
      if (hasLegacyStrikerStats || hasUnifiedStats || originalStrikerStats) {
        // Start with original stats to preserve any fields not in the form
        strikerStatsJson = originalStrikerStats ? { ...originalStrikerStats } : {};
        
        // Add legacy striker stats
        if (hasLegacyStrikerStats) {
          Object.entries(strikerStats)
            .filter(([_, value]) => value !== "")
            .forEach(([key, value]) => {
              strikerStatsJson![key] = parseFloat(value);
            });
        }
        
        // Merge unified stats into striker_stats
        if (hasUnifiedStats) {
          const unifiedData = unifiedStatsToStrikerStats(unifiedStats);
          Object.entries(unifiedData).forEach(([key, value]) => {
            strikerStatsJson![key] = value;
          });
        }
      }

      let analysisIdToUse = analysisId;

      if (analysisId) {
        // Edit mode - update existing record
        const parsedMinutes = parseInt(minutesPlayed);
        const { error: analysisError } = await supabase
          .from("player_analysis")
          .update({
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: !isNaN(parsedMinutes) ? parsedMinutes : null,
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
            fixture_stats: Object.keys(fixtureStats).length > 0 ? fixtureStats : null,
            performance_overview: performanceOverview || null,
            visibility_status: visibilityStatus,
            placeholder_raw_score: visibilityStatus === "hidden" && placeholderRawScore ? parseFloat(placeholderRawScore) : null,
            placeholder_minutes: visibilityStatus === "hidden" && placeholderMinutes ? parseInt(placeholderMinutes) : null,
          } as any)
          .eq("id", analysisId);

        if (analysisError) throw analysisError;

        // Fetch existing actions to preserve video_url before deleting
        const { data: existingActions } = await supabase
          .from("performance_report_actions")
          .select("action_number, video_url")
          .eq("analysis_id", analysisId);
        
        // Create a map of action_number to video_url
        const existingVideoUrls = new Map<number, string | null>();
        if (existingActions) {
          existingActions.forEach(a => {
            if (a.video_url) {
              existingVideoUrls.set(a.action_number, a.video_url);
            }
          });
        }

        // Delete existing actions
        const { error: deleteError } = await supabase
          .from("performance_report_actions")
          .delete()
          .eq("analysis_id", analysisId);

        if (deleteError) throw deleteError;
        
        // Store the map for use when inserting
        (window as any).__preservedVideoUrls = existingVideoUrls;
      } else {
        // Create mode - check for existing analysis by fixture_id
        const { data: existingAnalysis } = await supabase
          .from("player_analysis")
          .select("id")
          .eq("player_id", playerId)
          .eq("fixture_id", selectedFixtureId)
          .maybeSingle();

        if (existingAnalysis) {
          toast.error("A performance report already exists for this fixture. Please edit the existing report instead.");
          setLoading(false);
          return;
        }

        // Insert new record
        const parsedMinutesInsert = parseInt(minutesPlayed);
        const { data: analysisData, error: analysisError } = await supabase
          .from("player_analysis")
          .insert({
            player_id: playerId,
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: !isNaN(parsedMinutesInsert) ? parsedMinutesInsert : null,
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
            fixture_stats: Object.keys(fixtureStats).length > 0 ? fixtureStats : null,
            performance_overview: performanceOverview || null,
            visibility_status: visibilityStatus,
            placeholder_raw_score: visibilityStatus === "hidden" && placeholderRawScore ? parseFloat(placeholderRawScore) : null,
            placeholder_minutes: visibilityStatus === "hidden" && placeholderMinutes ? parseInt(placeholderMinutes) : null,
          } as any)
          .select()
          .single();

        if (analysisError) throw analysisError;
        analysisIdToUse = analysisData.id;
      }

      // Insert performance actions
      // Retrieve preserved video URLs if in edit mode
      const preservedVideoUrls = (window as any).__preservedVideoUrls as Map<number, string | null> | undefined;
      
      const actionsToInsert = actions
        .filter(a => a.action_number && (a.minute || a.action_score || a.action_type || a.action_description || a.notes || a.video_url))
        .map(a => ({
          analysis_id: analysisIdToUse,
          action_number: a.action_number,
          minute: a.minute ? parseFloat(a.minute) : null,
          action_score: a.action_score ? parseFloat(a.action_score) : null,
          action_type: a.action_type ? canonicalActionType(a.action_type) : null,
          action_description: a.action_description?.trim() || null,
          notes: a.notes?.trim() || null,
          // Preserve video_url: use the one from the action state, or fall back to preserved from DB
          video_url: a.video_url || preservedVideoUrls?.get(a.action_number) || null,
          recorded_stat: (a.recorded_stat || null) as any,
          zone: a.zone_details?.length ? a.zone_details[0].zone : (a.zone || null),
          zone_details: (a.zone_details?.length ? a.zone_details : null) as any,
        }));
      
      // Clean up the temporary storage
      delete (window as any).__preservedVideoUrls;

      if (actionsToInsert.length > 0) {
        const { data: insertedActions, error: actionsError } = await supabase
          .from("performance_report_actions")
          .insert(actionsToInsert)
          .select('id, action_number');

        if (actionsError) throw actionsError;
        
        // Update local actions with real database IDs so video uploads work immediately
        if (insertedActions) {
          const idMap = new Map(insertedActions.map(a => [a.action_number, a.id]));
          setActions(prevActions => 
            prevActions.map(action => ({
              ...action,
              id: idMap.get(action.action_number) || action.id
            }))
          );
        }
      }

      toast.success(`Performance report ${analysisId ? 'updated' : 'created'} successfully`);

      // Prompt highlight compilation when report transitions to Live
      const wentLive = visibilityStatus === "live" && initialVisibilityRef.current !== "live";
      if (wentLive && analysisId) {
        playSuccess();
        setTimeout(() => {
          toast("Report is now live! Consider compiling highlights for this player.", {
            duration: 8000,
            action: {
              label: "Open Highlights",
              onClick: () => {
                // Navigate to highlight compiler section
                const event = new CustomEvent("navigate-highlight-compiler", { detail: { playerId } });
                window.dispatchEvent(event);
              },
            },
          });
        }, 600);
        initialVisibilityRef.current = "live";
      }

      // Refresh action type + description cache so newly entered types/descriptions are available
      fetchActionTypes();
      logActivity({
        action: analysisId ? 'updated' : 'created',
        entityType: 'performance_report',
        entityId: analysisIdToUse || null,
        entityName: `${playerName} vs ${opponent}`,
      });

      // Check for performance improvements and notify staff (non-blocking)
      try {
        const { data: recentReports } = await supabase
          .from("player_analysis")
          .select("r90_score, fixture_stats, opponent, analysis_date")
          .eq("player_id", playerId)
          .order("analysis_date", { ascending: false })
          .limit(3);

        if (recentReports && recentReports.length >= 2) {
          const current = recentReports[0];
          const previous = recentReports[1];
          const improvements: string[] = [];

          if (current.r90_score && previous.r90_score && current.r90_score > previous.r90_score) {
            const pctChange = ((current.r90_score - previous.r90_score) / Math.abs(previous.r90_score || 1) * 100).toFixed(0);
            improvements.push(`R90: ${previous.r90_score.toFixed(2)} → ${current.r90_score.toFixed(2)} (+${pctChange}%)`);
          }

          try {
            const currentFS = (current.fixture_stats as Record<string, number>) || {};
            const previousFS = (previous.fixture_stats as Record<string, number>) || {};
            const keyStats = ['goals_per90', 'assists_per90', 'npxg_per90', 'xa_per90', 'successful_dribbles_per90', 'progressive_carries_per90', 'tackles_won_per90'];
            for (const key of keyStats) {
              if (currentFS[key] != null && previousFS[key] != null && currentFS[key] > previousFS[key]) {
                const label = key.replace(/_per90$/, '').replace(/_/g, ' ');
                improvements.push(`${label}: ${previousFS[key]} → ${currentFS[key]}`);
              }
            }
          } catch { /* fixture_stats parsing issue - ignore */ }

          if (improvements.length > 0) {
            await supabase.from('staff_notification_events').insert({
              event_type: 'performance_improvement',
              title: `📈 ${playerName} Performance Improvement`,
              body: `${playerName} showed improvement vs ${opponent}:\n${improvements.join('\n')}`,
              event_data: {
                player_id: playerId,
                player_name: playerName,
                opponent,
                improvements,
                r90_score: calculatedR90,
                analysis_id: analysisIdToUse,
              },
            }).throwOnError();
          }
        }
      } catch (notifErr) {
        console.warn("Non-blocking: performance notification failed:", notifErr);
      }
      
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

  // Handler for closing - works for both inline and dialog modes
  const handleClose = () => {
    if (inline && onClose) {
      onClose();
    } else if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const getTranslatableFields = useCallback(() => {
    const fields: Record<string, string> = {};
    if (opponent) fields.opponent = opponent;
    if (performanceOverview) fields.performanceOverview = performanceOverview;
    actions.forEach((action, i) => {
      if (action.action_type) fields[`action_${i}_type`] = action.action_type;
      if (action.action_description) fields[`action_${i}_description`] = action.action_description;
      if (action.notes) fields[`action_${i}_notes`] = action.notes;
    });
    return fields;
  }, [opponent, performanceOverview, actions]);

  const handleTranslated = useCallback((translations: Record<string, string>) => {
    if (translations.opponent) setOpponent(translations.opponent);
    if (translations.performanceOverview) setPerformanceOverview(translations.performanceOverview);
    const updatedActions = [...actions];
    actions.forEach((_, i) => {
      if (translations[`action_${i}_type`]) updatedActions[i] = { ...updatedActions[i], action_type: translations[`action_${i}_type`] };
      if (translations[`action_${i}_description`]) updatedActions[i] = { ...updatedActions[i], action_description: translations[`action_${i}_description`] };
      if (translations[`action_${i}_notes`]) updatedActions[i] = { ...updatedActions[i], notes: translations[`action_${i}_notes`] };
    });
    setActions(updatedActions);
  }, [actions]);

  const languageSelector = (
    <ReportLanguageSelector
      selectedLanguage={reportLanguage}
      onLanguageChange={setReportLanguage}
      getTranslatableFields={getTranslatableFields}
      onTranslated={handleTranslated}
    />
  );

  // The main content (used in both inline and dialog modes)
  const mainContent = (
    <>
      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 pb-20">
          {/* Fixture Selection */}
          <div>
            <Label htmlFor="fixture">Select Fixture *</Label>
            <Select value={selectedFixtureId} onValueChange={handleFixtureChange}>
              <SelectTrigger id="fixture">
                <SelectValue placeholder="Choose a fixture" />
              </SelectTrigger>
              <SelectContent>
                {fixtures.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No fixtures found. Create one below or add fixtures in the Fixtures tab.
                  </div>
                ) : (
                  fixtures.map((fixture) => {
                    const homeIsFor = fixture.home_team.toLowerCase() === "for" || fixture.home_team.toLowerCase().startsWith("for ");
                    const awayIsFor = fixture.away_team.toLowerCase() === "for" || fixture.away_team.toLowerCase().startsWith("for ");
                    const hasForPlaceholder = homeIsFor || awayIsFor;
                    const displayOpponent = homeIsFor ? fixture.away_team : awayIsFor ? fixture.home_team : null;
                    
                    return (
                      <SelectItem key={fixture.id} value={fixture.id}>
                        {new Date(fixture.match_date).toLocaleDateString('en-GB')} - {hasForPlaceholder ? `vs ${displayOpponent}` : `${fixture.home_team} vs ${fixture.away_team}`}
                        {fixture.competition && ` (${fixture.competition})`}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <div className="mt-2">
              <InlineFixtureCreator
                playerId={playerId}
                onFixtureCreated={(newFixtureId) => {
                  fetchFixtures();
                  setSelectedFixtureId(newFixtureId);
                }}
              />
            </div>
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
              {/* xG Chain - Pinned at top */}
              <div className="p-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">xG Chain (Auto-calculated)</Label>
                  <span className="text-xs text-muted-foreground">Sum of positive actions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total</div>
                    <Input
                      type="number"
                      step="0.001"
                      value={strikerStats.xGChain || 0}
                      readOnly
                      className="h-8 bg-muted text-sm"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Per 90</div>
                    <Input
                      type="number"
                      step="0.001"
                      value={
                        minutesPlayed && actions.length > 0
                          ? ((actions.reduce((sum, a) => {
                              const score = parseFloat(a.action_score);
                              return score > 0 ? sum + score : sum;
                            }, 0) / parseInt(minutesPlayed)) * 90).toFixed(3)
                          : "0.000"
                      }
                      readOnly
                      className="h-8 bg-muted text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Unified Statistics Editor */}
              <UnifiedStatsEditor
                stats={unifiedStats}
                onStatsChange={(newStats) => {
                  setUnifiedStats(newStats);
                  // Sync matching stats to fixture stats
                  const updatedFixture = { ...fixtureStats };
                  newStats.forEach(stat => {
                    const fixtureKey = UNIFIED_TO_FIXTURE_MAP[stat.key];
                    if (fixtureKey) {
                      const val = stat.type === 'count' ? stat.count : stat.type === 'score' ? stat.score : undefined;
                      if (val != null) {
                        updatedFixture[fixtureKey] = val;
                      }
                    }
                  });
                  setFixtureStats(updatedFixture);
                }}
                minutesPlayed={parseInt(minutesPlayed) || 0}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Per-90 Fixture Stats (synced to Player Data) */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full text-sm sm:text-base">
                Fixture Stats (Optional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <FixtureStatsEditor
                fixtureStats={fixtureStats}
                onStatsChange={(newFixtureStats) => {
                  setFixtureStats(newFixtureStats);
                  // Sync matching fixture stats to existing unified stats (don't auto-add new ones)
                  setUnifiedStats(prev => {
                    const updated = prev.map(stat => {
                      const fixtureKey = UNIFIED_TO_FIXTURE_MAP[stat.key];
                      if (fixtureKey && newFixtureStats[fixtureKey] != null) {
                        if (stat.type === 'count') {
                          return { ...stat, count: newFixtureStats[fixtureKey] };
                        } else if (stat.type === 'score') {
                          return { ...stat, score: newFixtureStats[fixtureKey] };
                        }
                      }
                      return stat;
                    });
                    return updated;
                  });
                }}
                onAddToMatchStats={(fixtureKey, label, value) => {
                  // Check if this fixture key maps to a unified stat key
                  const mapping = FIXTURE_TO_UNIFIED_MAP[fixtureKey];
                  const unifiedKey = mapping?.key || fixtureKey.replace('_per90', '').replace('_pct', '_pct');
                  
                  // Check if already in unified stats
                  if (unifiedStats.some(s => s.key === unifiedKey)) {
                    toast.info(`${label} is already in Match Statistics`);
                    return;
                  }
                  
                  const isPercentage = fixtureKey.endsWith('_pct');
                  const newStat: UnifiedStat = {
                    key: unifiedKey,
                    displayName: label,
                    type: isPercentage ? 'score' : (mapping?.type === 'score' ? 'score' : 'count'),
                    ...(isPercentage || mapping?.type === 'score' ? { score: value } : { count: value }),
                    isFromActions: false,
                  };
                  
                  setUnifiedStats(prev => [...prev, newStat]);
                  toast.success(`${label} added to Match Statistics`);
                }}
                actions={actions}
                previousFixtureStats={previousFixtureStats}
              />
            </CollapsibleContent>
          </Collapsible>

          <div>
            <Label htmlFor="performance-overview">Performance Overview (Optional)</Label>
            <Textarea
              id="performance-overview"
              value={performanceOverview}
              onChange={(e) => setPerformanceOverview(e.target.value)}
              placeholder="Briefly summarise what improved, what to continue working on, key focus areas, etc."
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Performance Actions */}
          <div>
            <div className="mb-4">
              <Label className="text-base sm:text-lg font-semibold">Performance Actions *</Label>
            </div>
            
            {/* Action Stats Summary removed - now integrated into Additional Statistics section */}
            {/* Mobile Card View */}
            <div className="space-y-4 sm:hidden">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 space-y-3 bg-card transition-colors ${dragOverAction === index ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverAction(index); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragOverAction(index); }}
                  onDragLeave={() => setDragOverAction(null)}
                  onDrop={(e) => handleActionDrop(e, index)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Action #{action.action_number}</span>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => openR90Viewer(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 [&>svg]:hover:text-black"
                        title="R90 Ratings Reference"
                      >
                        <Search className="h-4 w-4 text-primary hover:text-black" />
                      </Button>
                      {/* Record Stat button - mobile */}
                      {/* Zone selector - mobile */}
                      <ZonePitchSelector
                        value={action.zone_details || (action.zone ? [{ zone: action.zone }] : [])}
                        onChange={(zd) => { updateAction(index, 'zone_details', zd as any); updateAction(index, 'zone', (zd.length ? zd[0].zone : null) as any); }}
                        actionType={action.action_type}
                        compact
                      />
                      <ActionStatRecorder
                        currentStat={action.recorded_stat || null}
                        onStatRecorded={(stat) => updateAction(index, 'recorded_stat', stat)}
                      />
                      {action.id ? (
                        <ActionVideoUpload
                          actionId={action.id}
                          currentVideoUrl={action.video_url || null}
                          onVideoUploaded={(videoUrl) => {
                            updateAction(index, 'video_url', videoUrl);
                          }}
                          analysisId={analysisId}
                        />
                      ) : (
                        <span className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground text-xs" title="Save report first to add clips">💾</span>
                      )}
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
                  </div>
                  
                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Minute *</Label>
                      <Input
                        type="text"
                        value={action.minute}
                        onChange={(e) => updateAction(index, "minute", e.target.value)}
                        onBlur={handleMinuteBlur}
                        placeholder="45"
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
                    <div className="relative">
                      <Input
                        value={action.action_type}
                        onChange={(e) => {
                          updateAction(index, "action_type", e.target.value);
                          setActionTypePopoverOpen(prev => ({ ...prev, [index]: true }));
                        }}
                        onFocus={() => setActionTypePopoverOpen(prev => ({ ...prev, [index]: true }))}
                        onBlur={() => {
                          setTimeout(() => setActionTypePopoverOpen(prev => ({ ...prev, [index]: false })), 200);
                          if (action.action_type) updateAction(index, "action_type", canonicalActionType(action.action_type));
                        }}
                        placeholder="Type or select action type"
                        className="text-sm h-9 pr-8"
                      />
                      {action.action_type && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateAction(index, "action_type", "");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {actionTypePopoverOpen[index] && (
                      <div className="absolute z-50 mt-1 w-[calc(100%-2rem)] max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        {actionTypes
                          .filter(type => !action.action_type || type.toLowerCase().includes(action.action_type.toLowerCase()))
                          .slice(0, 15)
                          .map((type) => (
                            <button
                              key={type}
                              type="button"
                              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex justify-between items-center"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateAction(index, "action_type", type);
                                setActionTypePopoverOpen(prev => ({ ...prev, [index]: false }));
                              }}
                            >
                              <span>{type}</span>
                              <span className="text-xs text-muted-foreground">{actionTypeFrequencyMap[type] || 0}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">Description *</Label>
                    <div className="relative">
                      <Textarea
                        value={action.action_description}
                        onChange={(e) => {
                          updateAction(index, "action_description", e.target.value);
                          setDescriptionPopoverOpen(prev => ({ ...prev, [index]: true }));
                        }}
                        onFocus={() => {
                          if (action.action_type && getDescriptionsForType(action.action_type).length > 0) {
                            setDescriptionPopoverOpen(prev => ({ ...prev, [index]: true }));
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setDescriptionPopoverOpen(prev => ({ ...prev, [index]: false })), 200);
                        }}
                        placeholder="Describe the action"
                        className="text-sm min-h-[60px]"
                        rows={2}
                      />
                      {descriptionPopoverOpen[index] && action.action_type && getDescriptionsForType(action.action_type).length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                          {getDescriptionsForType(action.action_type)
                            .filter(desc => !action.action_description || desc.toLowerCase().includes(action.action_description.toLowerCase()))
                            .slice(0, 12)
                            .map((desc, di) => (
                              <button
                                key={di}
                                type="button"
                                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateAction(index, "action_description", desc);
                                  setDescriptionPopoverOpen(prev => ({ ...prev, [index]: false }));
                                }}
                              >
                                {desc}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
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
                    {/* Suggested R90 Scores - search based */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="text-[9px] mt-1 p-1.5 rounded bg-muted/50 font-medium w-full text-left flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors text-muted-foreground">
                        <span>Suggested R90 Scores</span>
                        <ChevronDown className="h-3 w-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="text-[10px] p-2 rounded bg-muted/50 mt-1 space-y-2">
                        {/* Search input for R90 scores */}
                        <Input
                          value={actionSearchFilters[index] || ''}
                          onChange={(e) => setActionSearchFilters(prev => ({ ...prev, [index]: e.target.value }))}
                          placeholder="Search R90 scores by action name..."
                          className="h-7 text-xs"
                        />
                        {actionSearchFilters[index]?.trim() ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {getFilteredScores(index).map((item, scoreIdx) => {
                              const isSelected = selectedScores[index]?.has(scoreIdx) ?? false;
                              return (
                                <div key={scoreIdx} className="flex items-start gap-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const newSelected = { ...selectedScores };
                                      if (!newSelected[index]) {
                                        newSelected[index] = new Set();
                                      }
                                      if (checked) {
                                        newSelected[index].add(scoreIdx);
                                      } else {
                                        newSelected[index].delete(scoreIdx);
                                      }
                                      setSelectedScores(newSelected);
                                    }}
                                    className="mt-0.5"
                                  />
                                  <label className="font-mono flex-1 cursor-pointer text-muted-foreground">
                                    {item.title} {typeof item.score === 'number' ? item.score.toFixed(4) : item.score}
                                  </label>
                                </div>
                              );
                            })}
                            {getFilteredScores(index).length === 0 && (
                              <p className="text-muted-foreground text-center py-1">No matching scores</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-1 text-[9px]">Type to search R90 scores</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  {/* Mobile save/insert between actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => insertActionAt(index + 1)}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Insert Action
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-1"
                      disabled={loading || deleting}
                    >
                      {loading ? "Saving..." : (analysisId ? "Update" : "Save")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Two-Line View */}
            <div className="hidden sm:block space-y-1">
              {actions.map((action, index) => (
                <React.Fragment key={index}>
                  <div
                    className={`border rounded-lg p-2 space-y-2 transition-all duration-500 ${dragOverAction === index ? 'ring-2 ring-primary bg-primary/5' : 'bg-background'} animate-in fade-in slide-in-from-bottom-2`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverAction(index); }}
                    onDragEnter={(e) => { e.preventDefault(); setDragOverAction(index); }}
                    onDragLeave={() => setDragOverAction(null)}
                    onDrop={(e) => handleActionDrop(e, index)}
                  >
                    {/* Line 1: #, Minute, Type, Description, Notes */}
                    <div className="flex items-start gap-2 rounded-md border bg-card/50 p-2">
                      <span className="text-sm font-medium text-muted-foreground pt-2 shrink-0 w-6 text-center">{action.action_number}</span>

                      <Input
                        type="text"
                        value={action.minute}
                        onChange={(e) => updateAction(index, "minute", e.target.value)}
                        onBlur={handleMinuteBlur}
                        placeholder="Min"
                        className="w-16 h-9 text-sm shrink-0"
                      />

                      <div className="relative shrink-0">
                        <Input
                          value={action.action_type}
                          onChange={(e) => {
                            updateAction(index, "action_type", e.target.value);
                            setActionTypePopoverOpen(prev => ({ ...prev, [1000 + index]: true }));
                          }}
                          onFocus={() => setActionTypePopoverOpen(prev => ({ ...prev, [1000 + index]: true }))}
                          onBlur={() => {
                            setTimeout(() => setActionTypePopoverOpen(prev => ({ ...prev, [1000 + index]: false })), 200);
                            if (action.action_type) updateAction(index, "action_type", canonicalActionType(action.action_type));
                          }}
                          placeholder="Type"
                          className="w-36 text-sm h-9 pr-7"
                        />
                        {action.action_type && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateAction(index, "action_type", "");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {actionTypePopoverOpen[1000 + index] && (
                          <div className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                            {actionTypes
                              .filter(type => !action.action_type || type.toLowerCase().includes(action.action_type.toLowerCase()))
                              .slice(0, 15)
                              .map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex justify-between items-center"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateAction(index, "action_type", type);
                                    setActionTypePopoverOpen(prev => ({ ...prev, [1000 + index]: false }));
                                  }}
                                >
                                  <span>{type}</span>
                                  <span className="text-xs text-muted-foreground">{actionTypeFrequencyMap[type] || 0}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="relative flex-1 min-w-0">
                        <Textarea
                          value={action.action_description}
                          onChange={(e) => {
                            updateAction(index, "action_description", e.target.value);
                            setDescriptionPopoverOpen(prev => ({ ...prev, [1000 + index]: true }));
                          }}
                          onFocus={() => {
                            if (action.action_type && getDescriptionsForType(action.action_type).length > 0) {
                              setDescriptionPopoverOpen(prev => ({ ...prev, [1000 + index]: true }));
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setDescriptionPopoverOpen(prev => ({ ...prev, [1000 + index]: false })), 200);
                          }}
                          placeholder="Description"
                          className="min-h-[36px] text-sm"
                          rows={1}
                        />
                        {descriptionPopoverOpen[1000 + index] && action.action_type && getDescriptionsForType(action.action_type).length > 0 && (
                          <div className="absolute z-50 mt-1 w-72 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                            {getDescriptionsForType(action.action_type)
                              .filter(desc => !action.action_description || desc.toLowerCase().includes(action.action_description.toLowerCase()))
                              .slice(0, 12)
                              .map((desc, di) => (
                                <button
                                  key={di}
                                  type="button"
                                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateAction(index, "action_description", desc);
                                    setDescriptionPopoverOpen(prev => ({ ...prev, [1000 + index]: false }));
                                  }}
                                >
                                  {desc}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <Textarea
                        value={action.notes}
                        onChange={(e) => updateAction(index, "notes", e.target.value)}
                        placeholder="Notes"
                        className="min-w-[120px] max-w-[200px] min-h-[36px] text-sm shrink-0"
                        rows={1}
                      />
                    </div>

                    {/* Line 2: Zone, Search R90, R90 Reference, Score | Clip | Delete, Reorder */}
                     <div className="flex items-center gap-2 rounded-md border bg-card/50 p-2">
                      {/* Zone selector - own bordered box */}
                      <div className="flex items-center rounded-md border border-[hsl(43,49%,61%)]/30 bg-background px-2 py-1 shrink-0">
                        <div className="w-6 flex justify-center">
                          <ZonePitchSelector
                            value={action.zone_details || (action.zone ? [{ zone: action.zone }] : [])}
                            onChange={(zd) => { updateAction(index, 'zone_details', zd as any); updateAction(index, 'zone', (zd.length ? zd[0].zone : null) as any); }}
                            actionType={action.action_type}
                          />
                        </div>
                      </div>

                      {/* R90 search + reference + score */}
                      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1">
                        <Input
                          value={actionSearchFilters[index] || ''}
                          onChange={(e) => setActionSearchFilters(prev => ({ ...prev, [index]: e.target.value }))}
                          placeholder="Search R90..."
                          className="h-7 text-xs w-32 px-2"
                        />
                        <Button
                          onClick={() => openR90Viewer(index)}
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs shrink-0 [&>svg]:hover:text-black"
                          title="R90 Ratings Reference"
                        >
                          <Search className="h-3.5 w-3.5 text-primary mr-1" />
                          R90
                        </Button>
                        <Input
                          type="number"
                          step="0.00001"
                          value={action.action_score}
                          onChange={(e) => updateAction(index, "action_score", e.target.value)}
                          placeholder="Score"
                          className="w-24 h-7 text-sm"
                        />
                      </div>

                      <div className="mx-4 shrink-0 rounded-md border bg-background px-3 py-1">
                        {action.id ? (
                          <ActionVideoUpload
                            actionId={action.id}
                            currentVideoUrl={action.video_url || null}
                            onVideoUploaded={(videoUrl) => {
                              updateAction(index, 'video_url', videoUrl);
                            }}
                            analysisId={analysisId}
                          />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground shrink-0">
                                <span className="text-xs">💾</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Save report first to add video clips</TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex-1" />

                      <div className="flex items-center gap-0.5 shrink-0 rounded-md border bg-background px-1 py-1">
                        <Button
                          onClick={() => removeAction(index)}
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-7 w-7"
                          disabled={actions.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => moveAction(index, 'up')}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => moveAction(index, 'down')}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === actions.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Suggested R90 Scores */}
                  {actionSearchFilters[index]?.trim() && (
                    <div className="ml-8 p-2 bg-muted/20 space-y-1 max-h-40 overflow-y-auto rounded border">
                      {getFilteredScores(index).map((item, scoreIdx) => {
                        const isSelected = selectedScores[index]?.has(scoreIdx) ?? false;
                        const filteredScores = getFilteredScores(index);
                        return (
                          <div key={scoreIdx} className="flex items-start gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelected = { ...selectedScores };
                                if (!newSelected[index]) {
                                  newSelected[index] = new Set();
                                }
                                if (checked) {
                                  newSelected[index].add(scoreIdx);
                                } else {
                                  newSelected[index].delete(scoreIdx);
                                }
                                setSelectedScores(newSelected);
                                
                                const selectedIndices = checked 
                                  ? [...Array.from(newSelected[index] || []), scoreIdx]
                                  : Array.from(newSelected[index] || []).filter(i => i !== scoreIdx);
                                
                                const totalScore = selectedIndices.reduce((sum, idx) => {
                                  const score = filteredScores[idx]?.score;
                                  const numScore = typeof score === 'number' ? score : (typeof score === 'string' && !isNaN(parseFloat(score)) ? parseFloat(score) : 0);
                                  return sum + numScore;
                                }, 0);
                                
                                updateAction(index, "action_score", totalScore.toString());
                              }}
                              className="mt-0.5"
                            />
                            <label className="font-mono flex-1 cursor-pointer text-xs text-muted-foreground">
                              {item.title} {formatScoreWithFrequency(item.score)}
                            </label>
                          </div>
                        );
                      })}
                      {getFilteredScores(index).length === 0 && (
                        <p className="text-muted-foreground text-center py-1 text-xs">No matching scores</p>
                      )}
                    </div>
                  )}

                  {/* Insert Action Row */}
                  <div className="flex gap-2 justify-center py-0.5">
                    <Button
                      onClick={() => insertActionAt(index + 1)}
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add New Action
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs flex-1"
                      disabled={loading || deleting}
                    >
                      {loading ? "Saving..." : "Update Report"}
                    </Button>
                  </div>
                </React.Fragment>
              ))}
            </div>
            
          </div>

          {/* Datalist removed - replaced with Popover+Command combobox */}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Top row: Add Action + Update Report */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={addAction} size="sm" variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
              <VisibilityStatusButton
                value={visibilityStatus}
                onChange={setVisibilityStatus}
                placeholderRawScore={placeholderRawScore}
                placeholderMinutes={placeholderMinutes}
                onPlaceholderRawScoreChange={setPlaceholderRawScore}
                onPlaceholderMinutesChange={setPlaceholderMinutes}
              />
              <Button onClick={handleSave} disabled={loading || deleting} className="w-full sm:w-auto">
                {loading ? (analysisId ? "Updating..." : "Creating...") : (analysisId ? "Update Report" : "Create Report")}
              </Button>
              {analysisId && (
                <Button
                  variant="outline"
                  onClick={() => setIsByActionDialogOpen(true)}
                  disabled={loading || deleting}
                  className="w-full sm:w-auto"
                >
                  <List className="h-4 w-4 mr-2" />
                  By Action
                </Button>
              )}
            </div>
            
            {/* Cancel button */}
            <Button variant="outline" onClick={handleClose} disabled={loading || deleting} className="w-full sm:w-auto">
              Cancel
            </Button>
            
            {/* Delete Report at bottom */}
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
          </div>
        </div>
        )}
      </>
    );

  // Additional dialogs that need to be rendered regardless of mode
  const additionalDialogs = (
    <>
      {/* R90 Ratings Viewer */}
      <R90RatingsViewer
        open={isR90ViewerOpen}
        onOpenChange={(open) => {
          setIsR90ViewerOpen(open);
          if (!open) {
            setR90ViewerCategory(undefined);
            setR90ViewerSearch(undefined);
          }
        }}
        initialCategory={r90ViewerCategory}
        searchTerm={r90ViewerSearch}
      />

      {/* Actions By Type Dialog */}
      {analysisId && (
        <ActionsByTypeDialog
          open={isByActionDialogOpen}
          onOpenChange={setIsByActionDialogOpen}
          actions={actions.map(a => ({
            id: a.id,
            action_number: a.action_number,
            minute: parseFloat(a.minute) || 0,
            action_score: parseFloat(a.action_score) || 0,
            action_type: a.action_type,
            action_description: a.action_description,
            notes: a.notes,
          }))}
          onActionsUpdated={refreshActions}
          isAdmin={true}
          analysisId={analysisId}
        />
      )}

      {/* Add Stat Dialog */}
      <Dialog open={isAddStatDialogOpen} onOpenChange={setIsAddStatDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Add Statistic</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {(() => {
                // Build grouped list of available stats so linked metrics (e.g. dribbles attempted/completed)
                // are added together instead of as separate items.
                const availableStatsFiltered = allStats.filter(
                  (stat) => !selectedStatKeys.includes(stat.stat_key)
                );

                type Stat = { id: string; stat_name: string; stat_key: string; description: string | null };
                const processedKeys = new Set<string>();
                const statGroups: Array<{
                  primary: Stat;
                  secondary?: Stat;
                  isPair: boolean;
                }> = [];

                const findStatByKey = (key: string) =>
                  availableStatsFiltered.find((s) => s.stat_key === key);

                availableStatsFiltered.forEach((stat) => {
                  const key = stat.stat_key;
                  if (processedKeys.has(key)) return;

                  // Attempt to find a matching attempted/successful pair using
                  // the same naming conventions as the main stats grid.
                  let successKey: string | null = null;
                  let attemptedKey: string | null = null;

                  if (
                    key.endsWith("_attempted") ||
                    key === "shots_attempted" ||
                    key === "one_v_one_attempts"
                  ) {
                    // This is an attempted stat – look for its successful counterpart.
                    const baseKey = key
                      .replace("_attempted", "")
                      .replace("_attempts", "");

                    const candidateSuccessKeys = [
                      baseKey,
                      `${baseKey}_completed`,
                      `${baseKey}_won`,
                      baseKey === "shots" ? "shots_on_target" : null,
                      baseKey === "one_v_one" ? "one_v_one_won" : null,
                    ].filter(Boolean) as string[];

                    const foundSuccessKey = candidateSuccessKeys.find((k) =>
                      availableStatsFiltered.some((s) => s.stat_key === k)
                    );

                    if (foundSuccessKey) {
                      successKey = foundSuccessKey;
                      attemptedKey = key;
                    }
                  } else {
                    // This is a success stat – look for its attempted counterpart.
                    const candidateAttemptedKeys = [
                      `${key}_attempted`,
                      key === "shots_on_target" ? "shots_attempted" : null,
                      key === "one_v_one_won" ? "one_v_one_attempts" : null,
                    ].filter(Boolean) as string[];

                    const foundAttemptedKey = candidateAttemptedKeys.find((k) =>
                      availableStatsFiltered.some((s) => s.stat_key === k)
                    );

                    if (foundAttemptedKey) {
                      successKey = key;
                      attemptedKey = foundAttemptedKey;
                    }
                  }

                  if (successKey && attemptedKey) {
                    const successStat = findStatByKey(successKey);
                    const attemptedStat = findStatByKey(attemptedKey);

                    if (successStat && attemptedStat) {
                      statGroups.push({
                        primary: successStat,
                        secondary: attemptedStat,
                        isPair: true,
                      });
                      processedKeys.add(successKey);
                      processedKeys.add(attemptedKey);
                      return;
                    }
                  }

                  // Fallback: treat as a single stat.
                  statGroups.push({ primary: stat, isPair: false });
                  processedKeys.add(key);
                });

                return statGroups.map((group) => {
                  if (group.isPair && group.secondary) {
                    const successKeyVal = group.primary.stat_key;
                    const attemptedKeyVal = group.secondary.stat_key;

                    // Clean up the base name for display, matching the main grid.
                    let baseName = group.primary.stat_name
                      .replace("Aerials Won", "Aerial Duels")
                      .replace(" Completed", "")
                      .replace(" Won", "")
                      .replace(" On Target", "");

                    const displayName = `${baseName} (Successful/Attempted)`;
                    const isHidden = [successKeyVal, attemptedKeyVal].some((k) =>
                      hiddenStatKeys.includes(k)
                    );

                    const addPair = async () => {
                      setSelectedStatKeys((prev) => [
                        ...prev,
                        successKeyVal,
                        attemptedKeyVal,
                      ]);

                      if (playerId) {
                        // If re-adding hidden stats, unhide both.
                        for (const k of [successKeyVal, attemptedKeyVal]) {
                          if (hiddenStatKeys.includes(k)) {
                            await supabase
                              .from("player_hidden_stats")
                              .delete()
                              .eq("player_id", playerId)
                              .eq("stat_key", k);
                          }
                        }
                        setHiddenStatKeys((prev) =>
                          prev.filter((k) => k !== successKeyVal && k !== attemptedKeyVal)
                        );
                      }

                      setIsAddStatDialogOpen(false);
                    };

                    return (
                      <div
                        key={`${successKeyVal}-${attemptedKeyVal}`}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={addPair}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {displayName}
                            {isHidden && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (hidden)
                              </span>
                            )}
                          </div>
                          {group.primary.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {group.primary.description}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addPair();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }

                  const stat = group.primary;
                  const isHidden = hiddenStatKeys.includes(stat.stat_key);

                  const addSingle = async () => {
                    setSelectedStatKeys((prev) => [...prev, stat.stat_key]);

                    if (isHidden && playerId) {
                      await supabase
                        .from("player_hidden_stats")
                        .delete()
                        .eq("player_id", playerId)
                        .eq("stat_key", stat.stat_key);
                      setHiddenStatKeys((prev) =>
                        prev.filter((k) => k !== stat.stat_key)
                      );
                    }

                    setIsAddStatDialogOpen(false);
                  };

                  return (
                    <div
                      key={stat.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={addSingle}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {stat.stat_name}
                          {isHidden && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (hidden)
                            </span>
                          )}
                        </div>
                        {stat.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {stat.description}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSingle();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                });
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );

  // Inline mode: render with a header and full-page layout
  if (inline) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        {/* X close button in top right corner */}
        <button 
          onClick={handleClose}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="container max-w-6xl mx-auto pt-16 pb-6 px-4">
          {/* Header with back button */}
          <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b mb-6">
            <Button variant="ghost" onClick={handleClose} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Player
            </Button>
            <div className="flex gap-2 items-center">
              {languageSelector}
              {analysisId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs">
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Performance Report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the performance report and all associated actions. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <VisibilityStatusButton
                value={visibilityStatus}
                onChange={setVisibilityStatus}
                placeholderRawScore={placeholderRawScore}
                placeholderMinutes={placeholderMinutes}
                onPlaceholderRawScoreChange={setPlaceholderRawScore}
                onPlaceholderMinutesChange={setPlaceholderMinutes}
              />
              <Button onClick={handleSave} disabled={loading} size="sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {analysisId ? 'Update' : 'Create'} Report
              </Button>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-6">{analysisId ? 'Edit' : 'Create'} Performance Report - {playerName}</h1>
          
          {mainContent}
        </div>
        {additionalDialogs}
      </div>
    );
  }

  // Dialog mode: render with Dialog wrapper
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg sm:text-xl">{analysisId ? 'Edit' : 'Create'} Performance Report - {playerName}</DialogTitle>
            {languageSelector}
          </div>
        </DialogHeader>

        {mainContent}
      </DialogContent>
      {additionalDialogs}
    </Dialog>
  );
};
