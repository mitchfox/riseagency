import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, LineChart, Search, Loader2, Sparkles, ChevronDown, ChevronUp, List, Video } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { R90RatingsViewer } from "./R90RatingsViewer";
import { Card, CardContent } from "@/components/ui/card";
import { getR90Grade, getXGGrade, getXAGrade, getRegainsGrade, getInterceptionsGrade } from "@/lib/gradeCalculations";
import { ActionsByTypeDialog } from "./ActionsByTypeDialog";
import { calculateAdjustedScore, isDefensiveR90Category } from "@/lib/zoneMultipliers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ActionVideoUpload } from "./ActionVideoUpload";
import { ActionVideoPopup } from "@/components/ActionVideoPopup";

// Format minute as MM.SS with proper zero padding (e.g., 0.3 → "0.30", 10.5 → "10.50")
const formatMinute = (minute: number | null | undefined): string => {
  if (minute === null || minute === undefined) return "-";
  const minPart = Math.floor(minute);
  const secPart = Math.round((minute - minPart) * 100);
  return `${minPart}.${secPart.toString().padStart(2, '0')}`;
};

interface PerformanceAction {
  id?: string;
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  action_description: string;
  notes: string;
  zone?: number | null;
  is_successful?: boolean;
  video_url?: string | null;
}

interface PerformanceActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  playerName: string;
  isAdmin: boolean;
}

export const PerformanceActionsDialog = ({
  open,
  onOpenChange,
  analysisId,
  playerName,
  isAdmin,
}: PerformanceActionsDialogProps) => {
  const [actions, setActions] = useState<PerformanceAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [strikerStats, setStrikerStats] = useState<any>(null);
  const [r90Score, setR90Score] = useState<number | null>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [previousScores, setPreviousScores] = useState<Array<{score: string | number | null, description: string}>>([]);
  const [isScoresExpanded, setIsScoresExpanded] = useState(false);
  const [selectedScoreIndices, setSelectedScoreIndices] = useState<Set<number>>(new Set());
  const [isR90ViewerOpen, setIsR90ViewerOpen] = useState(false);
  const [r90ViewerCategory, setR90ViewerCategory] = useState<string | undefined>(undefined);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);
  const [aiSearchAction, setAiSearchAction] = useState<{ type: string; context: string } | null>(null);
  const [fillingScores, setFillingScores] = useState(false);
  const [isByActionDialogOpen, setIsByActionDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [newAction, setNewAction] = useState<PerformanceAction>({
    action_number: 1,
    minute: 0,
    action_score: 0,
    action_type: "",
    action_description: "",
    notes: "",
    zone: null,
    is_successful: true,
    video_url: null,
  });
  const [actionCategory, setActionCategory] = useState<string | null>(null);

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

  const openSmartR90Viewer = async (action: PerformanceAction) => {
    if (!action.action_type) {
      // Fallback to generic R90 viewer
      setR90ViewerCategory(undefined);
      setR90ViewerSearch(undefined);
      setIsR90ViewerOpen(true);
      return;
    }
    
    // First, try to get category from database mapping
    try {
      const { data: mappings } = await supabase
        .from('action_r90_category_mappings')
        .select('r90_category, r90_subcategory, selected_rating_ids')
        .eq('action_type', action.action_type.trim());
      
      // Prioritize specific subcategory mappings over wildcard mappings
      const mapping = mappings?.find(m => m.r90_subcategory !== null) || mappings?.[0];
      
      if (mapping?.r90_category) {
        console.log(`Using mapped category: ${action.action_type} -> ${mapping.r90_category}${mapping.r90_subcategory ? ' > ' + mapping.r90_subcategory : ''}`);
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

  const openAiSearch = (action: PerformanceAction) => {
    setAiSearchAction({
      type: action.action_type || '',
      context: action.action_description || ''
    });
    setIsR90ViewerOpen(true);
  };

  useEffect(() => {
    if (open && analysisId) {
      fetchActionTypes();
      fetchActions();
      fetchAnalysisDetails();
    }
  }, [open, analysisId]);

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

  const fetchAnalysisDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("r90_score, striker_stats")
        .eq("id", analysisId)
        .single();

      if (error) throw error;
      setR90Score(data?.r90_score || null);
      setStrikerStats(data?.striker_stats || null);
    } catch (error: any) {
      console.error("Error fetching analysis details:", error);
    }
  };

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("*")
        .eq("analysis_id", analysisId)
        .order("action_number", { ascending: true });

      if (error) throw error;
      setActions(data || []);
      
      // Set next action number
      if (data && data.length > 0) {
        const maxNumber = Math.max(...data.map(a => a.action_number));
        setNewAction(prev => ({ ...prev, action_number: maxNumber + 1 }));
      }
    } catch (error: any) {
      console.error("Error fetching actions:", error);
      toast.error("Failed to load performance actions");
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

  const fetchCategoryScores = async (category: string, subcategory: string | null, selectedRatingIds: string[] | null) => {
    try {
      // If specific rating IDs are selected, fetch only those
      if (selectedRatingIds && selectedRatingIds.length > 0) {
        const { data: r90Data, error } = await supabase
          .from("r90_ratings")
          .select("score, description, title, category, subcategory")
          .in("id", selectedRatingIds)
          .not("score", "is", null);

        if (error) throw error;

        if (r90Data && r90Data.length > 0) {
          const scores = r90Data.map(item => ({
            score: item.score,
            description: item.description || item.title || ""
          }));
          setPreviousScores(scores);
        } else {
          setPreviousScores([]);
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

      const { data: r90Data, error } = await query;

      if (error) throw error;

      if (r90Data && r90Data.length > 0) {
        const scores = r90Data.map(item => ({
          score: item.score,
          description: item.description || item.title || ""
        }));
        setPreviousScores(scores);
      } else {
        setPreviousScores([]);
      }
    } catch (error: any) {
      console.error("Error fetching category scores:", error);
    }
  };

  const handleActionTypeChange = async (value: string) => {
    setNewAction({ ...newAction, action_type: value });
    if (value) {
      // Fetch R90 category mapping for this action type
      try {
        const { data: mappings } = await supabase
          .from('action_r90_category_mappings')
          .select('r90_category, r90_subcategory, selected_rating_ids')
          .eq('action_type', value);
        
        // Prioritize most specific mapping (with selected ratings, then subcategory, then category-only)
        const mapping = mappings?.find(m => m.selected_rating_ids && m.selected_rating_ids.length > 0) || 
                       mappings?.find(m => m.r90_subcategory !== null) || 
                       mappings?.[0];
        
        if (mapping?.r90_category) {
          setActionCategory(mapping.r90_category);
          await fetchCategoryScores(mapping.r90_category, mapping.r90_subcategory, mapping.selected_rating_ids || null);
        } else {
          setActionCategory(null);
          setPreviousScores([]);
        }
      } catch (error) {
        console.error('Error fetching category mapping:', error);
        setActionCategory(null);
        setPreviousScores([]);
      }
    } else {
      setActionCategory(null);
      setPreviousScores([]);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.action_type || !newAction.action_description) {
      toast.error("Please fill in action type and description");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("performance_report_actions")
        .insert({
          analysis_id: analysisId,
          action_number: newAction.action_number,
          minute: newAction.minute,
          action_score: newAction.action_score,
          action_type: newAction.action_type,
          action_description: newAction.action_description,
          notes: newAction.notes || null,
          zone: newAction.zone,
          is_successful: newAction.is_successful ?? true,
        });

      if (error) throw error;

      toast.success("Action added successfully");
      
      // Reset form and increment action number
      setNewAction({
        action_number: newAction.action_number + 1,
        minute: 0,
        action_score: 0,
        action_type: "",
        action_description: "",
        notes: "",
        zone: null,
        is_successful: true,
      });
      setActionCategory(null);
      
      // Refresh actions
      await fetchActions();
    } catch (error: any) {
      console.error("Error adding action:", error);
      toast.error("Failed to add action");
    } finally {
      setLoading(false);
    }
  };

  const fillSingleActionScore = async (action: PerformanceAction) => {
    if (!action.action_type || !action.action_description) {
      toast.error("Action needs type and description to fill score");
      return;
    }

    setFillingScores(true);
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
      
      // Update the action in database
      if (!action.id) return;
      
      const { error: updateError } = await supabase
        .from("performance_report_actions")
        .update({ action_score: score })
        .eq("id", action.id);

      if (updateError) throw updateError;
      
      toast.success(`Score filled: ${score.toFixed(5)}`);
      await fetchActions();
      
    } catch (error: any) {
      console.error('Error filling score:', error);
      toast.error("Failed to fill score");
    } finally {
      setFillingScores(false);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from("performance_report_actions")
        .delete()
        .eq("id", actionId);

      if (error) throw error;

      toast.success("Action deleted");
      await fetchActions();
    } catch (error: any) {
      console.error("Error deleting action:", error);
      toast.error("Failed to delete action");
    }
  };

  const getActionScoreColor = (score: number) => {
    if (score >= 0.1) return "text-green-600 font-bold";
    if (score > 0) return "text-green-500";
    if (score < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const calculateRScore = () => {
    return actions.reduce((sum, action) => sum + action.action_score, 0).toFixed(5);
  };

  const getAdjustedScore = (action: PerformanceAction) => {
    if (!action.zone || action.action_score === null) return null;
    const isDefensive = actionCategory ? isDefensiveR90Category(actionCategory) : false;
    return calculateAdjustedScore(
      action.action_score,
      action.zone,
      action.is_successful ?? true,
      isDefensive
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Report Actions - {playerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* R90 Score and Striker Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-accent/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">R90 Score</p>
                  <div className="flex items-center justify-center gap-3">
                    <p 
                      className="text-4xl font-bold"
                      style={{ color: getActionScoreColor(r90Score || 0) }}
                    >
                      {r90Score?.toFixed(2) || '0.00'}
                    </p>
                    <span 
                      className="text-2xl font-bold px-3 py-1 rounded-md"
                      style={{ 
                        color: getR90Grade(r90Score).color,
                        backgroundColor: `${getR90Grade(r90Score).color}15`
                      }}
                    >
                      {getR90Grade(r90Score).grade}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/50">
              <CardContent className="pt-6">
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-foreground mb-3">Advanced Stats</p>
                  {strikerStats?.xG !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">xG:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strikerStats.xG.toFixed(2)}</span>
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ 
                            color: getXGGrade(strikerStats.xG).color,
                            backgroundColor: `${getXGGrade(strikerStats.xG).color}15`
                          }}
                        >
                          {getXGGrade(strikerStats.xG).grade}
                        </span>
                      </div>
                    </div>
                  )}
                  {strikerStats?.xA !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">xA:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strikerStats.xA.toFixed(2)}</span>
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ 
                            color: getXAGrade(strikerStats.xA).color,
                            backgroundColor: `${getXAGrade(strikerStats.xA).color}15`
                          }}
                        >
                          {getXAGrade(strikerStats.xA).grade}
                        </span>
                      </div>
                    </div>
                  )}
                  {strikerStats?.regains !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Regains:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strikerStats.regains}</span>
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ 
                            color: getRegainsGrade(strikerStats.regains).color,
                            backgroundColor: `${getRegainsGrade(strikerStats.regains).color}15`
                          }}
                        >
                          {getRegainsGrade(strikerStats.regains).grade}
                        </span>
                      </div>
                    </div>
                  )}
                  {strikerStats?.interceptions !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Interceptions:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{strikerStats.interceptions}</span>
                        <span 
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ 
                            color: getInterceptionsGrade(strikerStats.interceptions).color,
                            backgroundColor: `${getInterceptionsGrade(strikerStats.interceptions).color}15`
                          }}
                        >
                          {getInterceptionsGrade(strikerStats.interceptions).grade}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current R Score from Actions */}
          <div className="bg-accent/20 p-4 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Current R Score (from actions)</p>
              <p className="text-3xl font-bold">{calculateRScore()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total of {actions.length} actions
              </p>
            </div>
          </div>

          {/* Add New Action Form */}
          {isAdmin && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-4">Add New Action</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action_number">Action #</Label>
                <Input
                  id="action_number"
                  type="number"
                  value={newAction.action_number}
                  onChange={(e) => setNewAction({ ...newAction, action_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minute">Minute</Label>
                <Input
                  id="minute"
                  type="number"
                  step="0.01"
                  value={newAction.minute}
                  onChange={(e) => setNewAction({ ...newAction, minute: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action_score">Action Score</Label>
                <Input
                  id="action_score"
                  type="number"
                  step="0.00001"
                  value={newAction.action_score}
                  onChange={(e) => setNewAction({ ...newAction, action_score: parseFloat(e.target.value) || 0 })}
                />
                {newAction.zone && (
                  <div className="text-xs text-muted-foreground">
                    Adjusted: {getAdjustedScore(newAction)?.toFixed(5) || 'N/A'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">Zone (1-18)</Label>
                <Select
                  value={newAction.zone?.toString() || "none"}
                  onValueChange={(v) => setNewAction({ ...newAction, zone: v === "none" ? null : parseInt(v) })}
                >
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(z => (
                      <SelectItem key={z} value={z.toString()}>Zone {z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_successful" className="flex items-center gap-2">
                  <span>Successful</span>
                  <Switch
                    id="is_successful"
                    checked={newAction.is_successful ?? true}
                    onCheckedChange={(checked) => setNewAction({ ...newAction, is_successful: checked })}
                  />
                </Label>
                <div className="text-xs text-muted-foreground mt-1">
                  {newAction.is_successful ? 'Positive outcome' : 'Negative outcome'}
                </div>
              </div>
              <div className="space-y-2 col-span-2 md:col-span-3">
                <Label htmlFor="action_type">Action Type *</Label>
                <Input
                  id="action_type"
                  list="action-types-list"
                  value={newAction.action_type}
                  onChange={(e) => handleActionTypeChange(e.target.value)}
                  placeholder="Select or type new action type"
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-3">
                <Label htmlFor="action_description">Action Description *</Label>
                <Textarea
                  id="action_description"
                  value={newAction.action_description}
                  onChange={(e) => setNewAction({ ...newAction, action_description: e.target.value })}
                  placeholder="Detailed description of the action"
                  rows={2}
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAction.notes}
                  onChange={(e) => setNewAction({ ...newAction, notes: e.target.value })}
                  placeholder="Additional notes or coaching points"
                  rows={2}
                />
                {previousScores.length > 0 && (
                  <div className="text-[10px] mt-1 p-2 rounded bg-muted/50 font-medium" style={{ color: 'hsl(43, 49%, 61%)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold">R90 ratings for this action:</div>
                      {previousScores.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsScoresExpanded(!isScoresExpanded)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {isScoresExpanded ? (
                            <>Collapse <ChevronUp className="h-3 w-3" /></>
                          ) : (
                            <>See all ({previousScores.length}) <ChevronDown className="h-3 w-3" /></>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(isScoresExpanded ? previousScores : previousScores.slice(0, 1)).map((item, idx) => {
                        const actualIdx = isScoresExpanded ? idx : 0;
                        const isSelected = selectedScoreIndices.has(actualIdx);
                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedScoreIndices);
                                if (checked) {
                                  newSelected.add(actualIdx);
                                } else {
                                  newSelected.delete(actualIdx);
                                }
                                setSelectedScoreIndices(newSelected);
                              }}
                              className="mt-0.5"
                            />
                            <label className="font-mono flex-1 cursor-pointer">
                              {item.description} {typeof item.score === 'number' ? item.score.toFixed(4) : (typeof item.score === 'string' && !isNaN(parseFloat(item.score)) ? parseFloat(item.score).toFixed(4) : item.score)}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
              <Button onClick={handleAddAction} disabled={loading} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Adding..." : "Add Action"}
              </Button>
            </div>
          )}

          {/* Actions List */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Existing Actions</h3>
              {actions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsByActionDialogOpen(true)}
                >
                  <List className="w-4 h-4 mr-2" />
                  By Action
                </Button>
              )}
            </div>
            {actions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No actions recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {actions.map((action) => (
                  <div key={action.id} className="p-3 border rounded hover:bg-accent/50 space-y-2">
                    {/* Single line header with key info */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-muted-foreground whitespace-nowrap">#{action.action_number}</span>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{formatMinute(action.minute)}'</span>
                        <span className={`text-sm font-mono whitespace-nowrap ${getActionScoreColor(action.action_score ?? 0)}`}>
                          {(action.action_score ?? 0).toFixed(5)}
                        </span>
                        <span className="font-semibold truncate">{action.action_type}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 items-center">
                        {/* Video button - show if video exists */}
                        {action.video_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVideoUrl(action.video_url!);
                              setSelectedVideoTitle(`#${action.action_number} - ${action.action_type}`);
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20"
                            title="Play Clip"
                          >
                            <Video className="w-4 h-4 text-amber-600" />
                          </Button>
                        )}
                        
                        {/* Video upload - admin only */}
                        {isAdmin && action.id && (
                          <ActionVideoUpload
                            actionId={action.id}
                            currentVideoUrl={action.video_url || null}
                            onVideoUploaded={() => fetchActions()}
                          />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAiSearch(action)}
                          title="AI Search for Rating"
                        >
                          <Search className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSmartR90Viewer(action)}
                          title="Smart Link to R90 Ratings"
                        >
                          <LineChart className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setR90ViewerCategory(undefined);
                            setR90ViewerSearch(undefined);
                            setAiSearchAction(null);
                            setIsR90ViewerOpen(true);
                          }}
                          title="View All R90 Ratings"
                        >
                          <LineChart className="w-4 h-4 text-indigo-600" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fillSingleActionScore(action)}
                              title="Fill Score with AI"
                              disabled={fillingScores}
                            >
                              {fillingScores ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-blue-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => action.id && handleDeleteAction(action.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Description on its own line */}
                    <p className="text-sm">{action.action_description}</p>
                    
                    {/* Notes if present */}
                    {action.notes && (
                      <p className="text-xs text-muted-foreground italic">{action.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Datalist for action types */}
          <datalist id="action-types-list">
            {actionTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => setIsByActionDialogOpen(true)}
            >
              <List className="w-4 h-4 mr-2" />
              By Action Type
            </Button>
          </div>
        </div>
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
      <ActionsByTypeDialog
        open={isByActionDialogOpen}
        onOpenChange={setIsByActionDialogOpen}
        actions={actions}
        onActionsUpdated={fetchActions}
        isAdmin={isAdmin}
      />

      {/* Video Popup */}
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
    </Dialog>
  );
};
