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
import { Plus, Trash2, EyeOff, AlertTriangle, Sparkles, Search, Loader2, ChevronDown, ChevronUp, List, GripVertical, ArrowLeft, Save } from "lucide-react";
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
import { ActionStatRecorder, aggregateRecordedStats, RecordedStat } from "./ActionStatRecorder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This component is a wrapper that re-exports the existing CreatePerformanceReportDialog content
// but allows it to be rendered inline (without the Dialog wrapper)

export interface PerformanceReportEditorContentProps {
  playerId: string;
  playerName: string;
  onSuccess?: () => void;
  onClose: () => void;
  analysisId?: string;
}

// Format minute as MM.SS with proper zero padding
const formatMinuteForInput = (minute: number | null): string => {
  if (minute === null) return "";
  const minPart = Math.floor(minute);
  const secPart = Math.round((minute - minPart) * 100);
  return `${minPart}.${secPart.toString().padStart(2, '0')}`;
};

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
  recorded_stat?: RecordedStat | null;
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

export const PerformanceReportEditorContent = ({
  playerId,
  playerName,
  onSuccess,
  onClose,
  analysisId,
}: PerformanceReportEditorContentProps) => {
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
  const [selectedScores, setSelectedScores] = useState<Record<number, Set<number>>>({});
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

  // Dynamic stats based on position
  const [additionalStats, setAdditionalStats] = useState<Record<string, string>>({});
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
    if (playerId) {
      fetchActionTypes();
      if (analysisId) {
        setIsEditMode(true);
        fetchExistingData();
      } else {
        setIsEditMode(false);
        resetForm();
      }
      fetchFixtures();
      fetchPlayerClub();
    }
  }, [analysisId, playerId]);

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
      
      const { data: allStatsData, error: allStatsError } = await supabase
        .from("performance_statistics")
        .select("id, stat_name, stat_key, description")
        .order("stat_name");
      
      if (!allStatsError && allStatsData) {
        const nonPer90Stats = allStatsData.filter(stat => !stat.stat_key.endsWith('_per90'));
        setAllStats(nonPer90Stats);
      }
      
      const { data: hiddenStats } = await supabase
        .from("player_hidden_stats")
        .select("stat_key")
        .eq("player_id", playerId);
      
      const hiddenKeys = hiddenStats?.map(h => h.stat_key) || [];
      setHiddenStatKeys(hiddenKeys);
      
      if (data?.position) {
        const { data: stats, error: statsError } = await supabase
          .from("performance_statistics")
          .select("id, stat_name, stat_key, description")
          .contains("positions", [data.position])
          .order("stat_name");
        
        if (!statsError && stats) {
          setAvailableStats(stats);
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
      } else {
        const { data: allFixtures, error: allError } = await supabase
          .from("fixtures")
          .select("*")
          .order("match_date", { ascending: false })
          .limit(100);

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
      let opponentTeam = fixture.away_team;
      
      const homeIsFor = fixture.home_team.toLowerCase() === "for" || fixture.home_team.toLowerCase().includes("for ");
      const awayIsFor = fixture.away_team.toLowerCase() === "for" || fixture.away_team.toLowerCase().includes("for ");
      
      if (homeIsFor) {
        opponentTeam = fixture.away_team;
      } else if (awayIsFor) {
        opponentTeam = fixture.home_team;
      } else if (playerClub) {
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
      const { data: analysisData, error: analysisError } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (analysisError) throw analysisError;

      setR90Score(analysisData.r90_score?.toString() || "");
      setMinutesPlayed(analysisData.minutes_played?.toString() || "");
      setOpponent(analysisData.opponent || "");
      setResult(analysisData.result || "");
      setSelectedFixtureId(analysisData.fixture_id || "");
      setPerformanceOverview(analysisData.performance_overview || "");

      if (analysisData.striker_stats) {
        const stats = analysisData.striker_stats as any;
        setOriginalStrikerStats(stats);
        
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
        const savedStatsOrder = stats.stats_order as string[] | undefined;
        let statsKeys: string[] = [];
        
        Object.entries(stats).forEach(([key, value]) => {
          if (!legacyKeys.has(key) && key !== 'stats_order' && value != null) {
            newStats[key] = value.toString();
            if (!key.endsWith('_per90') && !savedStatsOrder) {
              statsKeys.push(key);
            }
          }
        });
        
        if (savedStatsOrder && savedStatsOrder.length > 0) {
          statsKeys = savedStatsOrder;
        }
        
        if (Object.keys(newStats).length > 0) {
          setAdditionalStats(newStats);
          setSelectedStatKeys(statsKeys);
        }
        
        setShowStrikerStats(true);
      }

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
            recorded_stat: action.recorded_stat as unknown as RecordedStat | null,
          }))
        );
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
    setSelectedStatKeys(availableStats.filter(s => !s.stat_key.endsWith('_per90') && !hiddenStatKeys.includes(s.stat_key)).map(s => s.stat_key));
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

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    (updated[index] as any)[field] = value;
    setActions(updated);
  };

  const removeAction = (index: number) => {
    if (actions.length === 1) return;
    const updated = actions.filter((_, i) => i !== index);
    setActions(updated);
  };

  const addAction = () => {
    const nextNumber = actions.length > 0 ? Math.max(...actions.map(a => a.action_number)) + 1 : 1;
    setActions([
      ...actions,
      { action_number: nextNumber, minute: "", action_score: "", action_type: "", action_description: "", notes: "" }
    ]);
  };

  const handleSave = async () => {
    if (!selectedFixtureId) {
      toast.error("Please select a fixture");
      return;
    }

    if (!minutesPlayed) {
      toast.error("Please enter minutes played");
      return;
    }

    setLoading(true);
    try {
      const fixture = fixtures.find(f => f.id === selectedFixtureId);
      
      const strikerStatsJson = {
        ...originalStrikerStats,
        ...additionalStats,
        stats_order: selectedStatKeys,
      };

      const parsedMinutes = parseFloat(minutesPlayed);
      const totalActionScore = actions.reduce((sum, a) => sum + (parseFloat(a.action_score) || 0), 0);
      const calculatedR90 = parsedMinutes > 0 ? (totalActionScore / parsedMinutes) * 90 : 0;

      let analysisIdToUse = analysisId;

      if (analysisId) {
        // Delete existing actions
        await supabase
          .from("performance_report_actions")
          .delete()
          .eq("analysis_id", analysisId);

        // Update analysis
        const { error: updateError } = await supabase
          .from("player_analysis")
          .update({
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parsedMinutes,
            opponent: opponent,
            result: result || null,
            striker_stats: strikerStatsJson,
            performance_overview: performanceOverview || null,
          })
          .eq("id", analysisId);

        if (updateError) throw updateError;
      } else {
        // Create new analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from("player_analysis")
          .insert({
            player_id: playerId,
            fixture_id: selectedFixtureId,
            analysis_date: fixture?.match_date,
            r90_score: calculatedR90,
            minutes_played: parsedMinutes,
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
          video_url: a.video_url || null,
          recorded_stat: (a.recorded_stat || null) as any,
        }));

      if (actionsToInsert.length > 0) {
        const { error: actionsError } = await supabase
          .from("performance_report_actions")
          .insert(actionsToInsert);

        if (actionsError) throw actionsError;
      }

      toast.success(`Performance report ${analysisId ? 'updated' : 'created'} successfully`);
      
      if (!analysisId) {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Error saving performance report:", error);
      toast.error("Failed to save performance report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!analysisId) return;
    
    setDeleting(true);
    try {
      await supabase
        .from("performance_report_actions")
        .delete()
        .eq("analysis_id", analysisId);

      const { error } = await supabase
        .from("player_analysis")
        .delete()
        .eq("id", analysisId);

      if (error) throw error;

      toast.success("Performance report deleted");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error deleting performance report:", error);
      toast.error("Failed to delete performance report");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <Button variant="ghost" onClick={onClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Player
        </Button>
        <div className="flex gap-2">
          {analysisId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
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
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {analysisId ? 'Update' : 'Create'} Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{analysisId ? 'Edit' : 'Create'} Performance Report - {playerName}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
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
                    placeholder="e.g., 2-1"
                  />
                </div>
              </div>

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
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Performance Actions *</Label>
                  <Button onClick={addAction} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add Action
                  </Button>
                </div>

                {/* Action Stats Summary */}
                {Object.keys(aggregateRecordedStats(actions)).length > 0 && (
                  <div className="bg-accent/30 p-4 rounded-lg mb-4">
                    <p className="font-semibold text-sm mb-3">Action Stats Summary</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.entries(aggregateRecordedStats(actions)).map(([statType, counts]) => (
                        <div key={statType} className="flex justify-between items-center bg-background/50 px-3 py-2 rounded">
                          <span className="text-sm text-muted-foreground">{statType}:</span>
                          <span className="font-semibold text-sm">
                            <span className="text-green-600">{counts.successful}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span>{counts.total}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions List */}
                <div className="space-y-4">
                  {actions.map((action, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">Action #{action.action_number}</span>
                        <div className="flex gap-1">
                          <ActionStatRecorder
                            currentStat={action.recorded_stat || null}
                            onStatRecorded={(stat) => updateAction(index, 'recorded_stat', stat)}
                          />
                          {action.id && (
                            <ActionVideoUpload
                              actionId={action.id}
                              currentVideoUrl={action.video_url || null}
                              onVideoUploaded={(videoUrl) => {
                                updateAction(index, 'video_url', videoUrl);
                              }}
                            />
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
                          rows={2}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={action.notes}
                          onChange={(e) => updateAction(index, "notes", e.target.value)}
                          placeholder="Additional notes"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action types datalist */}
                <datalist id="action-types-list">
                  {actionTypes.map(type => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
