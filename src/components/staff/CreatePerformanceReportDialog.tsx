import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, LineChart, Sparkles, Search, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { R90RatingsViewer } from "./R90RatingsViewer";
import { formatScoreWithFrequency } from "@/lib/utils";

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
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
}

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
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [previousScores, setPreviousScores] = useState<Record<number, Array<{score: number, title: string, description: string}>>>({});
  const [expandedScores, setExpandedScores] = useState<Set<number>>(new Set());
  const [selectedScores, setSelectedScores] = useState<Record<number, Set<number>>>({}); // actionIndex -> Set of score indices
  const [isR90ViewerOpen, setIsR90ViewerOpen] = useState(false);
  const [r90ViewerCategory, setR90ViewerCategory] = useState<string | undefined>(undefined);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);
  const [isFillingScores, setIsFillingScores] = useState(false);
  const [aiSearchAction, setAiSearchAction] = useState<{ type: string; context: string } | null>(null);

  // Key stats
  const [r90Score, setR90Score] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState("");
  const [opponent, setOpponent] = useState("");
  const [result, setResult] = useState("");

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

  // Striker stats
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

  useEffect(() => {
    if (open) {
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
  }, [open, analysisId]);

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
  }, [minutesPlayed, strikerStats.xGChain, strikerStats.xG_adj, strikerStats.xA_adj, 
      strikerStats.movement_in_behind_xC, strikerStats.movement_down_side_xC, 
      strikerStats.triple_threat_xC, strikerStats.movement_to_feet_xC, 
      strikerStats.crossing_movement_xC, strikerStats.interceptions, 
      strikerStats.regains_adj, strikerStats.turnovers_adj, strikerStats.progressive_passes_adj]);

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
        .select("club")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      setPlayerClub(data?.club || "");
    } catch (error: any) {
      console.error("Error fetching player club:", error);
    }
  };

  const fetchFixtures = async () => {
    try {
      const { data: playerFixtures, error: pfError } = await supabase
        .from("player_fixtures")
        .select("fixture_id")
        .eq("player_id", playerId);

      if (pfError) throw pfError;

      if (playerFixtures && playerFixtures.length > 0) {
        const fixtureIds = playerFixtures.map(pf => pf.fixture_id);
        
        const { data: fixturesData, error: fError } = await supabase
          .from("fixtures")
          .select("*")
          .in("id", fixtureIds)
          .order("match_date", { ascending: false });

        if (fError) throw fError;
        setFixtures(fixturesData || []);
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
      // Intelligently determine opponent based on player's club
      let opponentTeam = fixture.away_team; // Default to away team
      
      if (playerClub) {
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

      if (actionsData && actionsData.length > 0) {
        setActions(
          actionsData.map((action) => ({
            action_number: action.action_number,
            minute: action.minute !== null ? Number(action.minute).toFixed(2) : "",
            action_score: action.action_score !== null ? action.action_score.toString() : "",
            action_type: action.action_type || "",
            action_description: action.action_description || "",
            notes: action.notes || "",
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
    setShowStrikerStats(false);
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

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    // Renumber actions
    newActions.forEach((action, i) => {
      action.action_number = i + 1;
    });
    setActions(newActions);
  };

  const updateAction = async (index: number, field: keyof PerformanceAction, value: string) => {
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
      
      // Prepare striker stats JSONB
      const hasStrikerStats = Object.values(strikerStats).some(v => v !== "");
      const strikerStatsJson = hasStrikerStats ? Object.fromEntries(
        Object.entries(strikerStats)
          .filter(([_, value]) => value !== "")
          .map(([key, value]) => [key, parseFloat(value)])
      ) : null;

      let analysisIdToUse = analysisId;

      if (analysisId) {
        // Edit mode - update existing record
        const { error: analysisError } = await supabase
          .from("player_analysis")
          .update({
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parseInt(minutesPlayed),
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
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
        const { data: analysisData, error: analysisError } = await supabase
          .from("player_analysis")
          .insert({
            player_id: playerId,
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parseInt(minutesPlayed),
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
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
            <div className="text-center">Loading...</div>
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
                {fixtures.map((fixture) => (
                  <SelectItem key={fixture.id} value={fixture.id}>
                    {new Date(fixture.match_date).toLocaleDateString('en-GB')} - {fixture.home_team} vs {fixture.away_team}
                    {fixture.competition && ` (${fixture.competition})`}
                  </SelectItem>
                ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>xGChain</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xGChain}
                    onChange={(e) => setStrikerStats({...strikerStats, xGChain: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xGChain per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xGChain_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>xG (adj.)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xG_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, xG_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xG (adj.) per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xG_adj_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>xA (adj.)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xA_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, xA_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>xA (adj.) per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.xA_adj_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Movement In Behind xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_in_behind_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_in_behind_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement In Behind xC per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_in_behind_xC_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Movement Down Side xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_down_side_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_down_side_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement Down Side xC per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_down_side_xC_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Triple Threat xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.triple_threat_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, triple_threat_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Triple Threat xC per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.triple_threat_xC_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Movement To Feet xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_to_feet_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, movement_to_feet_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Movement To Feet xC per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.movement_to_feet_xC_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Crossing Movement xC</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.crossing_movement_xC}
                    onChange={(e) => setStrikerStats({...strikerStats, crossing_movement_xC: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Crossing Movement xC per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={strikerStats.crossing_movement_xC_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Interceptions</Label>
                  <Input
                    type="number"
                    value={strikerStats.interceptions}
                    onChange={(e) => setStrikerStats({...strikerStats, interceptions: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Interceptions per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.interceptions_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Regains (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.regains_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, regains_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Regains (Adj.) per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.regains_adj_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Turnovers (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.turnovers_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, turnovers_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Turnovers (Adj.) per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.turnovers_adj_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Progressive Passes (Adj.)</Label>
                  <Input
                    type="number"
                    value={strikerStats.progressive_passes_adj}
                    onChange={(e) => setStrikerStats({...strikerStats, progressive_passes_adj: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Progressive Passes (Adj.) per90 (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={strikerStats.progressive_passes_adj_per90}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
                        placeholder="2.30"
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
                                  {item.description} {item.score.toFixed(4)}
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
                          placeholder="2.30"
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
                      <tr className="border-t bg-muted/20">
                        <td colSpan={7} className="p-2">
                          <div className="text-[10px] p-2 rounded bg-muted/50 font-medium" style={{ color: 'hsl(43, 49%, 61%)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold">R90 ratings in this category mapping:</div>
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
                                        
                                        // Calculate sum of selected scores and update action
                                        const selectedIndices = checked 
                                          ? [...Array.from(newSelected[index] || []), actualIdx]
                                          : Array.from(newSelected[index] || []).filter(i => i !== actualIdx);
                                        
                                        const totalScore = selectedIndices.reduce((sum, idx) => {
                                          return sum + (previousScores[index][idx]?.score || 0);
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
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <Button onClick={addAction} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>
          </div>

          {/* Datalist for action types */}
          <datalist id="action-types-list">
            {actionTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>

          {/* Save and Delete Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2">
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
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting || isFillingScores} className="w-full sm:w-auto">
                Cancel
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
              <Button onClick={handleSave} disabled={loading || deleting || isFillingScores} className="w-full sm:w-auto">
                {loading ? (analysisId ? "Updating..." : "Creating...") : (analysisId ? "Update Report" : "Create Report")}
              </Button>
            </div>
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
    </Dialog>
  );
};
