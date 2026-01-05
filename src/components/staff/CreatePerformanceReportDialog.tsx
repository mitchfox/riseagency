import React, { useState, useEffect } from "react";
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
import { Plus, Trash2, EyeOff, AlertTriangle, LineChart, Sparkles, Search, Loader2, ChevronDown, ChevronUp, List, GripVertical } from "lucide-react";
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

// Format minute as MM.SS with proper zero padding (e.g., 0.3 → "0.30", 10.5 → "10.50")
const formatMinuteForInput = (minute: number | null): string => {
  if (minute === null) return "";
  const minPart = Math.floor(minute);
  const secPart = Math.round((minute - minPart) * 100);
  return `${minPart}.${secPart.toString().padStart(2, '0')}`;
};

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
  id?: string;
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
  video_url?: string | null;
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
  const [playerPosition, setPlayerPosition] = useState<string>("");
  const [availableStats, setAvailableStats] = useState<Array<{id: string; stat_name: string; stat_key: string; description: string | null}>>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<string[]>([]);
  const [allStats, setAllStats] = useState<Array<{id: string; stat_name: string; stat_key: string; description: string | null}>>([]);
  const [isAddStatDialogOpen, setIsAddStatDialogOpen] = useState(false);
  const [hiddenStatKeys, setHiddenStatKeys] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [previousScores, setPreviousScores] = useState<Record<number, Array<{score: string | number | null, title: string, description: string}>>>({});
  const [expandedScores, setExpandedScores] = useState<Set<number>>(new Set());
  const [selectedScores, setSelectedScores] = useState<Record<number, Set<number>>>({}); // actionIndex -> Set of score indices
  const [isR90ViewerOpen, setIsR90ViewerOpen] = useState(false);
  const [r90ViewerCategory, setR90ViewerCategory] = useState<string | undefined>(undefined);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);
  const [isFillingScores, setIsFillingScores] = useState(false);
  const [aiSearchAction, setAiSearchAction] = useState<{ type: string; context: string } | null>(null);
  const [isByActionDialogOpen, setIsByActionDialogOpen] = useState(false);

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

  const openAiSearch = (actionIndex: number) => {
    const action = actions[actionIndex];
    setAiSearchAction({
      type: action.action_type || '',
      context: action.action_description || ''
    });
    setIsR90ViewerOpen(true);
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

  useEffect(() => {
    if (open && playerId) {
      console.log('CreatePerformanceReportDialog opened for player:', playerId);
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
  }, [open, analysisId, playerId]);

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
    const updatedStats: Record<string, string> = { ...additionalStats };
    Object.keys(additionalStats).forEach(key => {
      if (!key.endsWith('_per90')) {
        const keyLower = key.toLowerCase();
        const isRateBasedStat = rateBasedStatPrefixes.some(prefix => keyLower.includes(prefix));
        if (isRateBasedStat) {
          const per90Key = `${key}_per90`;
          updatedStats[per90Key] = calculatePer90(additionalStats[key]);
        }
      }
    });
    setAdditionalStats(updatedStats);
  }, [minutesPlayed, strikerStats.xGChain, strikerStats.xG_adj, strikerStats.xA_adj, 
      strikerStats.movement_in_behind_xC, strikerStats.movement_down_side_xC, 
      strikerStats.triple_threat_xC, strikerStats.movement_to_feet_xC, 
      strikerStats.crossing_movement_xC, strikerStats.interceptions, 
      strikerStats.regains_adj, strikerStats.turnovers_adj, strikerStats.progressive_passes_adj,
      ...Object.values(additionalStats)]);

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
      setOpponent(analysisData.opponent || "");
      setResult(analysisData.result || "");
      setSelectedFixtureId(analysisData.fixture_id || "");
      setPerformanceOverview(analysisData.performance_overview || "");

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
            id: action.id,
            action_number: action.action_number,
            minute: formatMinuteForInput(action.minute),
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
            video_url: action.video_url || null,
          }))
        );
        
        // Fetch category scores for each action based on mapping
        actionsData.forEach(async (action, index) => {
          if (action.action_type) {
            try {
              const { data: mappings } = await supabase
                .from('action_r90_category_mappings')
                .select('r90_category, r90_subcategory, selected_rating_ids')
                .eq('action_type', action.action_type);
              
              // Prioritize most specific mapping (with selected ratings, then subcategory, then category-only)
              const mapping = mappings?.find(m => m.selected_rating_ids && m.selected_rating_ids.length > 0) || 
                             mappings?.find(m => m.r90_subcategory !== null) || 
                             mappings?.[0];
              
              if (mapping?.r90_category) {
                await fetchCategoryScores(index, mapping.r90_category, mapping.r90_subcategory, mapping.selected_rating_ids || null);
              } else {
                // Fallback to keyword-based detection
                const category = getR90CategoryFromAction(action.action_type, action.action_description || '');
                if (category && category !== 'all') {
                  await fetchCategoryScores(index, category);
                }
              }
            } catch (error) {
              console.error('Error fetching scores for action:', error);
            }
          }
        });
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
        setActions(
          actionsData.map((action) => ({
            id: action.id,
            action_number: action.action_number,
            minute: formatMinuteForInput(action.minute),
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
          }))
        );
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

  const updateAction = async (index: number, field: keyof PerformanceAction, value: string | null) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);

    // If action_type changed, fetch category scores and mapping
    if (field === "action_type" && value) {
      const trimmedValue = value.trim();
      console.log(`Action type changed to: "${trimmedValue}" for action index ${index}`);
      
      // Fetch R90 category mapping for this action type
      try {
        const { data: mappings } = await supabase
          .from('action_r90_category_mappings')
          .select('r90_category, r90_subcategory, selected_rating_ids')
          .eq('action_type', trimmedValue);
        
        // Prioritize most specific mapping (with selected ratings, then subcategory, then category-only)
        const mapping = mappings?.find(m => m.selected_rating_ids && m.selected_rating_ids.length > 0) || 
                       mappings?.find(m => m.r90_subcategory !== null) || 
                       mappings?.[0];
        
        if (mapping?.r90_category) {
          const mappingPath = `${mapping.r90_category}${mapping.r90_subcategory ? ' > ' + mapping.r90_subcategory : ''}${mapping.selected_rating_ids?.length ? ` (${mapping.selected_rating_ids.length} ratings)` : ''}`;
          console.log(`Found category mapping: ${trimmedValue} -> ${mappingPath}`);
          
          // Fetch all scores for this R90 category hierarchy
          await fetchCategoryScores(index, mapping.r90_category, mapping.r90_subcategory, mapping.selected_rating_ids || null);
          
          toast.success(`Suggested R90 category: ${mappingPath}`, {
            description: 'Scores filtered by this category hierarchy'
          });
        } else {
          // No mapping found, try keyword-based detection
          const category = getR90CategoryFromAction(trimmedValue, '');
          if (category && category !== 'all') {
            await fetchCategoryScores(index, category);
          }
        }
      } catch (error) {
        console.error('Error fetching category mapping:', error);
      }
    }
  };

  // Extract keywords from description for better matching
  const getKeywords = (text: string) => {
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'and', 'or', 'but'];
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
  };

  const fetchCategoryScores = async (actionIndex: number, category: string, subcategory: string | null = null, selectedRatingIds: string[] | null = null) => {
    try {
      // If specific rating IDs are selected, fetch only those
      if (selectedRatingIds && selectedRatingIds.length > 0) {
        const { data: r90Data, error: r90Error } = await supabase
          .from("r90_ratings")
          .select("score, description, title, category, subcategory")
          .in("id", selectedRatingIds)
          .not("score", "is", null);

        if (r90Error) {
          console.error("Error fetching R90 scores:", r90Error);
          throw r90Error;
        }

        if (r90Data && r90Data.length > 0) {
          const scores = r90Data.map(item => ({
            score: item.score,
            title: item.title || "",
            description: item.description || ""
          }));
          
          setPreviousScores(prev => ({
            ...prev,
            [actionIndex]: scores
          }));
        } else {
          setPreviousScores(prev => ({
            ...prev,
            [actionIndex]: []
          }));
        }
        return;
      }

      // Otherwise, build query based on mapping specificity
      let query = supabase
        .from("r90_ratings")
        .select("score, description, title, category, subcategory")
        .eq("category", category)
        .not("score", "is", null);

      // If subcategory is specified in mapping, filter by it
      if (subcategory) {
        query = query.eq("subcategory", subcategory);
      }

      const { data: r90Data, error: r90Error } = await query;

      if (r90Error) {
        console.error("Error fetching R90 scores:", r90Error);
        throw r90Error;
      }

      if (r90Data && r90Data.length > 0) {
        // Map R90 ratings to the format expected by the UI
        const scores = r90Data.map(item => ({
          score: item.score,
          title: item.title || "",
          description: item.description || ""
        }));
        
        setPreviousScores(prev => ({
          ...prev,
          [actionIndex]: scores
        }));
      } else {
        setPreviousScores(prev => ({
          ...prev,
          [actionIndex]: []
        }));
      }
    } catch (error: any) {
      console.error("Error fetching category scores:", error);
    }
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

  const fillSingleActionScore = async (index: number) => {
    const action = actions[index];
    
    if (!action.action_type || !action.action_description) {
      toast.error("Action needs type and description to fill score");
      return;
    }

    setIsFillingScores(true);
    try {
      // Call the fill-action-scores edge function with single action
      const { data, error } = await supabase.functions.invoke('fill-action-scores', {
        body: { actions: [{ ...action, index: 0 }] }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data?.scores || data.scores.length === 0) {
        throw new Error("No score returned from function");
      }

      const score = data.scores[0]?.score || 0;
      
      // Update the action with the filled score
      const updatedActions = [...actions];
      updatedActions[index] = {
        ...updatedActions[index],
        action_score: score.toString()
      };
      setActions(updatedActions);
      
      toast.success(`Score filled: ${score.toFixed(5)}`);
      
    } catch (error: any) {
      console.error('Error filling score:', error);
      toast.error("Failed to fill score");
    } finally {
      setIsFillingScores(false);
    }
  };

  const handleFillEmptyScores = async () => {
    // Get actions that have empty scores
    const actionsToFill = actions
      .map((action, index) => ({ ...action, index }))
      .filter(action => !action.action_score || action.action_score === "");

    if (actionsToFill.length === 0) {
      toast.info("All actions already have scores");
      return;
    }

    if (!actionsToFill.every(a => a.action_type && a.action_description)) {
      toast.error("Please fill in action type and description for all actions before auto-filling scores");
      return;
    }

    setIsFillingScores(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fill-action-scores', {
        body: {
          actions: actionsToFill.map(a => ({
            action_type: a.action_type,
            action_description: a.action_description
          }))
        }
      });

      if (error) {
        console.error('Error filling scores:', error);
        toast.error("Failed to fill scores: " + error.message);
        return;
      }

      if (!data?.scores || !Array.isArray(data.scores)) {
        toast.error("Invalid response from AI service");
        return;
      }

      // Update actions with AI-generated scores
      const updatedActions = [...actions];
      actionsToFill.forEach((action, i) => {
        const score = data.scores[i]?.score || 0;
        updatedActions[action.index] = {
          ...updatedActions[action.index],
          action_score: score.toString()
        };
      });

      setActions(updatedActions);
      toast.success(`Successfully filled ${actionsToFill.length} empty score${actionsToFill.length > 1 ? 's' : ''}`);
      
    } catch (error: any) {
      console.error('Error in handleFillEmptyScores:', error);
      toast.error("Failed to auto-fill scores");
    } finally {
      setIsFillingScores(false);
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
      
      // Prepare striker stats JSONB - merge legacy and new stats
      const hasStrikerStats = Object.values(strikerStats).some(v => v !== "");
      const hasAdditionalStats = Object.values(additionalStats).some(v => v !== "");
      
      let strikerStatsJson: Record<string, any> | null = null;
      if (hasStrikerStats || hasAdditionalStats || originalStrikerStats) {
        // Start with original stats to preserve any fields not in the form
        strikerStatsJson = originalStrikerStats ? { ...originalStrikerStats } : {};
        
        // Add legacy striker stats
        if (hasStrikerStats) {
          Object.entries(strikerStats)
            .filter(([_, value]) => value !== "")
            .forEach(([key, value]) => {
              strikerStatsJson[key] = parseFloat(value);
            });
        }
        
        // Add new position-based additional stats
        if (hasAdditionalStats) {
          Object.entries(additionalStats)
            .filter(([_, value]) => value !== "")
            .forEach(([key, value]) => {
              strikerStatsJson[key] = parseFloat(value);
            });
        }
        
        // Save the stats order so display knows which stats to show and in what order
        const statsToSave = selectedStatKeys.filter(key => 
          additionalStats[key] !== undefined && additionalStats[key] !== ""
        );
        if (statsToSave.length > 0) {
          strikerStatsJson.stats_order = statsToSave;
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
            performance_overview: performanceOverview || null,
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
            performance_overview: performanceOverview || null,
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
                    No fixtures found. Add fixtures in the Fixtures tab first.
                  </div>
                ) : (
                  fixtures.map((fixture) => {
                    // Determine the opponent for display (handle "For" placeholder)
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

              {selectedStatKeys.length > 0 ? (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={selectedStatKeys} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        // Group stats into pairs (attempted/successful) and singles
                        const processedKeys = new Set<string>();
                        const statGroups: Array<{ id: string, keys: string[], isPair: boolean }> = [];
                      
                      selectedStatKeys.forEach(statKey => {
                        if (processedKeys.has(statKey)) return;
                        
                        // Check if this is an attempted stat
                        if (statKey.endsWith('_attempted') || statKey === 'shots_attempted' || statKey === 'one_v_one_attempts') {
                          const baseKey = statKey.replace('_attempted', '').replace('_attempts', '');
                          const successKeys = [
                            baseKey,
                            `${baseKey}_completed`,
                            `${baseKey}_won`,
                            baseKey === 'shots' ? 'shots_on_target' : null,
                            baseKey === 'one_v_one' ? 'one_v_one_won' : null
                          ].filter(Boolean) as string[];
                          
                          const matchingSuccessKey = successKeys.find(k => selectedStatKeys.includes(k));
                          
                            if (matchingSuccessKey) {
                              statGroups.push({ id: statKey, keys: [matchingSuccessKey, statKey], isPair: true });
                              processedKeys.add(statKey);
                              processedKeys.add(matchingSuccessKey);
                            } else {
                              statGroups.push({ id: statKey, keys: [statKey], isPair: false });
                              processedKeys.add(statKey);
                            }
                        } else {
                          // Check if there's a matching attempted stat
                          const attemptedKeys = [
                            `${statKey}_attempted`,
                            statKey === 'shots_on_target' ? 'shots_attempted' : null,
                            statKey === 'one_v_one_won' ? 'one_v_one_attempts' : null
                          ].filter(Boolean) as string[];
                          
                          const matchingAttemptedKey = attemptedKeys.find(k => selectedStatKeys.includes(k));
                          
                            if (matchingAttemptedKey && !processedKeys.has(matchingAttemptedKey)) {
                              statGroups.push({ id: statKey, keys: [statKey, matchingAttemptedKey], isPair: true });
                              processedKeys.add(statKey);
                              processedKeys.add(matchingAttemptedKey);
                            } else if (!processedKeys.has(statKey)) {
                              statGroups.push({ id: statKey, keys: [statKey], isPair: false });
                              processedKeys.add(statKey);
                            }
                        }
                      });
                      
                      return statGroups.map((group, groupIndex) => {
                        if (group.isPair) {
                          const [successKey, attemptedKey] = group.keys;
                          const successStat = allStats.find(s => s.stat_key === successKey);
                          const attemptedStat = allStats.find(s => s.stat_key === attemptedKey);
                          if (!successStat || !attemptedStat) return null;
                          
                          const successValue = parseFloat(additionalStats[successKey] || "0");
                          const attemptedValue = parseFloat(additionalStats[attemptedKey] || "0");
                          const percentage = attemptedValue > 0 ? ((successValue / attemptedValue) * 100).toFixed(1) : "0.0";
                          
                          const per90SuccessKey = `${successKey}_per90`;
                          const per90AttemptedKey = `${attemptedKey}_per90`;
                          const per90SuccessValue = additionalStats[per90SuccessKey];
                          const per90AttemptedValue = additionalStats[per90AttemptedKey];
                          
                          // Fix stat names and create combined display name
                          let baseName = successStat.stat_name
                            .replace('Aerials Won', 'Aerial Duels')
                            .replace(' Completed', '')
                            .replace(' Won', '')
                            .replace(' On Target', '');
                          
                          const displayName = `${baseName} (Successful/Attempted)`;
                          
                          return (
                            <SortableStatItem key={group.id} id={group.id}>
                              <div className="p-2 border rounded-lg bg-muted/20">
                              <div className="flex items-center justify-between mb-1.5">
                                <Label className="text-xs font-semibold">{displayName}</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (playerId) {
                                      await supabase.from("player_hidden_stats").insert([
                                        { player_id: playerId, stat_key: successKey },
                                        { player_id: playerId, stat_key: attemptedKey }
                                      ]);
                                      setHiddenStatKeys(prev => [...prev, successKey, attemptedKey]);
                                    }
                                    setSelectedStatKeys(prev => prev.filter(k => k !== successKey && k !== attemptedKey));
                                    const newStats = {...additionalStats};
                                    delete newStats[successKey];
                                    delete newStats[attemptedKey];
                                    delete newStats[per90SuccessKey];
                                    delete newStats[per90AttemptedKey];
                                    setAdditionalStats(newStats);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <EyeOff className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-1">
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-0.5">Successful</div>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      value={additionalStats[successKey] || ""}
                                      onChange={(e) => {
                                        const newStats = {...additionalStats};
                                        newStats[successKey] = e.target.value;
                                        setAdditionalStats(newStats);
                                      }}
                                      placeholder="0"
                                      className="h-7 text-xs"
                                    />
                                    <Input
                                      type="number"
                                      value={per90SuccessValue || ""}
                                      readOnly
                                      className="h-7 text-xs bg-muted w-14"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-muted-foreground mb-0.5">Attempted</div>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      value={additionalStats[attemptedKey] || ""}
                                      onChange={(e) => {
                                        const newStats = {...additionalStats};
                                        newStats[attemptedKey] = e.target.value;
                                        setAdditionalStats(newStats);
                                      }}
                                      placeholder="0"
                                      className="h-7 text-xs"
                                    />
                                    <Input
                                      type="number"
                                      value={per90AttemptedValue || ""}
                                      readOnly
                                      className="h-7 text-xs bg-muted w-14"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] text-center text-muted-foreground">
                                {percentage}% success
                              </div>
                              </div>
                            </SortableStatItem>
                          );
                        } else {
                          const statKey = group.keys[0];
                          const stat = allStats.find(s => s.stat_key === statKey);
                          if (!stat) return null;
                          const per90Key = `${statKey}_per90`;
                          const per90Value = additionalStats[per90Key];
                          
                          return (
                            <SortableStatItem key={group.id} id={group.id}>
                              <div className="p-2 border rounded-lg bg-muted/20">
                              <div className="flex items-center justify-between mb-1.5">
                                <Label className="text-xs">
                                  {stat.stat_name}
                                  {stat.description && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ml-1 text-muted-foreground cursor-help text-[10px]">ⓘ</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{stat.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (playerId) {
                                      await supabase.from("player_hidden_stats").insert({
                                        player_id: playerId,
                                        stat_key: statKey
                                      });
                                      setHiddenStatKeys(prev => [...prev, statKey]);
                                    }
                                    setSelectedStatKeys(prev => prev.filter(k => k !== statKey));
                                    const newStats = {...additionalStats};
                                    delete newStats[statKey];
                                    delete newStats[per90Key];
                                    setAdditionalStats(newStats);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <EyeOff className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="1"
                                  value={additionalStats[statKey] || ""}
                                  onChange={(e) => setAdditionalStats({
                                    ...additionalStats,
                                    [statKey]: e.target.value
                                  })}
                                  placeholder="0"
                                  className="flex-1 h-7 text-xs"
                                />
                                <Input
                                  type="number"
                                  value={per90Value || ""}
                                  readOnly
                                  className="w-14 h-7 text-xs bg-muted"
                                />
                              </div>
                              </div>
                            </SortableStatItem>
                          );
                        }
                      });
                      })()}
                    </div>
                  </SortableContext>
                </DndContext>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddStatDialogOpen(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Stat
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    No statistics added yet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddStatDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stat
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Performance Overview */}
          <div>
            <Label htmlFor="performance-overview">Performance Overview (Optional)</Label>
            <Textarea
              id="performance-overview"
              value={performanceOverview}
              onChange={(e) => setPerformanceOverview(e.target.value)}
              placeholder="Briefly summarize what improved, what to continue working on, key focus areas, etc."
              rows={4}
              className="mt-2"
            />
          </div>

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
                    <div className="flex gap-1">
                      <Button
                        onClick={() => openAiSearch(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="AI Search for Rating"
                      >
                        <Search className="h-4 w-4 text-purple-600" />
                      </Button>
                      <Button
                        onClick={() => openSmartR90Viewer(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Smart Link to R90 Ratings"
                      >
                        <LineChart className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        onClick={() => {
                          setR90ViewerCategory(undefined);
                          setR90ViewerSearch(undefined);
                          setAiSearchAction(null);
                          setIsR90ViewerOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="View All R90 Ratings"
                      >
                        <LineChart className="h-4 w-4 text-indigo-600" />
                      </Button>
                      <Button
                        onClick={() => fillSingleActionScore(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Fill Score with AI"
                        disabled={isFillingScores}
                      >
                        {isFillingScores ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-blue-600" />
                        )}
                      </Button>
                      {action.id ? (
                        <ActionVideoUpload
                          actionId={action.id}
                          currentVideoUrl={action.video_url || null}
                          onVideoUploaded={(videoUrl) => {
                            updateAction(index, 'video_url', videoUrl);
                          }}
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
                    {previousScores[index] && previousScores[index].length > 0 && (
                      <div className="text-[10px] mt-1 p-2 rounded bg-muted/50 font-medium" style={{ color: 'hsl(43, 49%, 61%)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold">R90 ratings for this action:</div>
                          {previousScores[index].length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newExpanded = new Set(expandedScores);
                                if (newExpanded.has(index)) {
                                  newExpanded.delete(index);
                                } else {
                                  newExpanded.add(index);
                                }
                                setExpandedScores(newExpanded);
                              }}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {expandedScores.has(index) ? (
                                <>Collapse <ChevronUp className="h-3 w-3" /></>
                              ) : (
                                <>See all ({previousScores[index].length}) <ChevronDown className="h-3 w-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {(expandedScores.has(index) ? previousScores[index] : previousScores[index].slice(0, 1)).map((item, scoreIdx) => {
                            const actualIdx = expandedScores.has(index) ? scoreIdx : 0;
                            const isSelected = selectedScores[index]?.has(actualIdx) ?? false;
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
                                      newSelected[index].add(actualIdx);
                                    } else {
                                      newSelected[index].delete(actualIdx);
                                    }
                                    setSelectedScores(newSelected);
                                  }}
                                  className="mt-0.5"
                                />
                                <label className="font-mono flex-1 cursor-pointer">
                                  {item.description} {typeof item.score === 'number' ? item.score.toFixed(4) : item.score}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action, index) => (
                    <React.Fragment key={index}>
                      <tr className="border-t">
                        <td className="p-2 text-sm">{action.action_number}</td>
                      <td className="p-2">
                        <Input
                          type="text"
                          value={action.minute}
                          onChange={(e) => updateAction(index, "minute", e.target.value)}
                          placeholder="45"
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
                        <div className="flex gap-1">
                          <Button
                            onClick={() => openAiSearch(index)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="AI Search for Rating"
                          >
                            <Search className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button
                            onClick={() => openSmartR90Viewer(index)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Smart Link to R90 Ratings"
                          >
                            <LineChart className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            onClick={() => {
                              setR90ViewerCategory(undefined);
                              setR90ViewerSearch(undefined);
                              setAiSearchAction(null);
                              setIsR90ViewerOpen(true);
                            }}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="View All R90 Ratings"
                          >
                            <LineChart className="h-4 w-4 text-indigo-600" />
                          </Button>
                          <Button
                            onClick={() => fillSingleActionScore(index)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Fill Score with AI"
                            disabled={isFillingScores}
                          >
                            {isFillingScores ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                          {action.id ? (
                            <ActionVideoUpload
                              actionId={action.id}
                              currentVideoUrl={action.video_url || null}
                              onVideoUploaded={(videoUrl) => {
                                updateAction(index, 'video_url', videoUrl);
                              }}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground">
                                  <span className="text-xs">💾</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Save report first to add video clips</TooltipContent>
                            </Tooltip>
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
                      </td>
                    </tr>
                    {previousScores[index] && previousScores[index].length > 0 && (
                      <tr>
                        <td colSpan={7} className="p-2 bg-muted/30">
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-muted-foreground">Suggested Scores from R90</Label>
                            {previousScores[index].length > 1 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedScores);
                                  if (expandedScores.has(index)) {
                                    newExpanded.delete(index);
                                  } else {
                                    newExpanded.add(index);
                                  }
                                  setExpandedScores(newExpanded);
                                }}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {expandedScores.has(index) ? (
                                  <>Collapse <ChevronUp className="h-3 w-3" /></>
                                ) : (
                                  <>See all ({previousScores[index].length}) <ChevronDown className="h-3 w-3" /></>
                                )}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1">
                            {(expandedScores.has(index) ? previousScores[index] : previousScores[index].slice(0, 1)).map((item, scoreIdx) => {
                              const actualIdx = expandedScores.has(index) ? scoreIdx : 0;
                              const isSelected = selectedScores[index]?.has(actualIdx) ?? false;
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
                                        newSelected[index].add(actualIdx);
                                      } else {
                                        newSelected[index].delete(actualIdx);
                                      }
                                      setSelectedScores(newSelected);
                                      
                                      // Calculate sum of selected scores and update action
                                      const selectedIndices = checked 
                                        ? [...Array.from(newSelected[index] || []), actualIdx]
                                        : Array.from(newSelected[index] || []).filter(i => i !== actualIdx);
                                      
                                      const totalScore = selectedIndices.reduce((sum, idx) => {
                                        const score = previousScores[index][idx]?.score;
                                        const numScore = typeof score === 'number' ? score : (typeof score === 'string' && !isNaN(parseFloat(score)) ? parseFloat(score) : 0);
                                        return sum + numScore;
                                      }, 0);
                                      
                                      updateAction(index, "action_score", totalScore.toString());
                                    }}
                                    className="mt-0.5"
                                  />
                                  <label className="font-mono flex-1 cursor-pointer">
                                    {item.title} {formatScoreWithFrequency(item.score)}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {/* Insert Action & Update Row (Desktop) */}
                    <tr className="border-t border-dashed hover:bg-accent/50 transition-colors">
                      <td colSpan={7} className="p-1 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => insertActionAt(index + 1)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs flex-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add New Action
                          </Button>
                          <Button
                            onClick={handleSave}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            disabled={loading || deleting || isFillingScores}
                          >
                            {loading ? "Saving..." : "Update Report"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
          </div>

          {/* Datalist for action types */}
          <datalist id="action-types-list">
            {actionTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Top row: Add Action + Update Report */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={addAction} size="sm" variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
              <Button onClick={handleSave} disabled={loading || deleting || isFillingScores} className="w-full sm:w-auto">
                {loading ? (analysisId ? "Updating..." : "Creating...") : (analysisId ? "Update Report" : "Create Report")}
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleFillEmptyScores} 
                disabled={loading || deleting || isFillingScores || actions.length === 0}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isFillingScores ? "Filling Scores..." : "Fill Empty Scores"}
              </Button>
              {analysisId && (
                <Button
                  variant="outline"
                  onClick={() => setIsByActionDialogOpen(true)}
                  disabled={loading || deleting || isFillingScores}
                  className="w-full sm:w-auto"
                >
                  <List className="h-4 w-4 mr-2" />
                  By Action
                </Button>
              )}
            </div>
            
            {/* Cancel button */}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting || isFillingScores} className="w-full sm:w-auto">
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
      </DialogContent>

      {/* R90 Ratings Viewer */}
      <R90RatingsViewer
        open={isR90ViewerOpen}
        onOpenChange={(open) => {
          setIsR90ViewerOpen(open);
          if (!open) {
            setAiSearchAction(null);
            setR90ViewerCategory(undefined);
            setR90ViewerSearch(undefined);
          }
        }}
        initialCategory={r90ViewerCategory}
        searchTerm={r90ViewerSearch}
        prefilledSearch={aiSearchAction}
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
                const availableStats = allStats.filter(
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
                  availableStats.find((s) => s.stat_key === key);

                availableStats.forEach((stat) => {
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
                      availableStats.some((s) => s.stat_key === k)
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
                      availableStats.some((s) => s.stat_key === k)
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
                    const successKey = group.primary.stat_key;
                    const attemptedKey = group.secondary.stat_key;

                    // Clean up the base name for display, matching the main grid.
                    let baseName = group.primary.stat_name
                      .replace("Aerials Won", "Aerial Duels")
                      .replace(" Completed", "")
                      .replace(" Won", "")
                      .replace(" On Target", "");

                    const displayName = `${baseName} (Successful/Attempted)`;
                    const isHidden = [successKey, attemptedKey].some((k) =>
                      hiddenStatKeys.includes(k)
                    );

                    const addPair = async () => {
                      setSelectedStatKeys((prev) => [
                        ...prev,
                        successKey,
                        attemptedKey,
                      ]);

                      if (playerId) {
                        // If re-adding hidden stats, unhide both.
                        for (const k of [successKey, attemptedKey]) {
                          if (hiddenStatKeys.includes(k)) {
                            await supabase
                              .from("player_hidden_stats")
                              .delete()
                              .eq("player_id", playerId)
                              .eq("stat_key", k);
                          }
                        }
                        setHiddenStatKeys((prev) =>
                          prev.filter((k) => k !== successKey && k !== attemptedKey)
                        );
                      }

                      setIsAddStatDialogOpen(false);
                    };

                    return (
                      <div
                        key={`${successKey}-${attemptedKey}`}
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
    </Dialog>
  );
};
