import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Save, Search, Sparkles, LineChart, RefreshCw, ChevronDown, Loader2 } from "lucide-react";
import { R90RatingsViewer } from "./R90RatingsViewer";
import { formatScoreWithFrequency } from "@/lib/utils";
import { calculateAdjustedScore, isDefensiveR90Category } from "@/lib/zoneMultipliers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
}

interface ActionsByTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PerformanceAction[];
  onActionsUpdated: () => void;
  isAdmin: boolean;
  analysisId?: string;
}

export const ActionsByTypeDialog = ({
  open,
  onOpenChange,
  actions,
  onActionsUpdated,
  isAdmin,
  analysisId,
}: ActionsByTypeDialogProps) => {
  const [editedActions, setEditedActions] = useState<Record<string, PerformanceAction>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [isR90ViewerOpen, setIsR90ViewerOpen] = useState(false);
  const [r90ViewerCategory, setR90ViewerCategory] = useState<string | undefined>(undefined);
  const [r90ViewerSearch, setR90ViewerSearch] = useState<string | undefined>(undefined);
  const [aiSearchAction, setAiSearchAction] = useState<{ type: string; context: string } | null>(null);
  const [updatingR90, setUpdatingR90] = useState(false);
  const [previousScores, setPreviousScores] = useState<Record<string, Array<{score: string | number | null, title: string, description: string}>>>({});
  const [expandedScores, setExpandedScores] = useState<Set<string>>(new Set());
  const [selectedScores, setSelectedScores] = useState<Record<string, Set<number>>>({}); // actionId -> Set of score indices
  const [loadingScores, setLoadingScores] = useState<Set<string>>(new Set());
  const [actionCategories, setActionCategories] = useState<Record<string, string>>({});

  // Fetch R90 category for each action type
  useEffect(() => {
    const fetchCategories = async () => {
      const uniqueTypes = Array.from(new Set(actions.map(a => a.action_type)));
      const categories: Record<string, string> = {};
      
      for (const type of uniqueTypes) {
        if (!type) continue;
        try {
          const { data: mappings } = await supabase
            .from('action_r90_category_mappings')
            .select('r90_category')
            .eq('action_type', type.trim())
            .limit(1);
          
          if (mappings && mappings[0]?.r90_category) {
            categories[type] = mappings[0].r90_category;
          }
        } catch (error) {
          console.error('Error fetching category for', type, error);
        }
      }
      
      setActionCategories(categories);
    };
    
    if (open && actions.length > 0) {
      fetchCategories();
    }
  }, [open, actions]);

  // Fetch suggested scores when actions change
  useEffect(() => {
    if (open && actions.length > 0) {
      const newExpandedScores = new Set<string>();
      actions.forEach(action => {
        if (action.id && action.action_type) {
          fetchSuggestedScores(action.id, action.action_type);
          newExpandedScores.add(action.id); // Auto-expand all scores
        }
      });
      setExpandedScores(newExpandedScores);
    }
  }, [open, actions]);

  const fetchSuggestedScores = async (actionId: string, actionType: string) => {
    if (!actionType || previousScores[actionId]) return;

    setLoadingScores(prev => new Set(prev).add(actionId));
    try {
      const { data: mappings } = await supabase
        .from('action_r90_category_mappings')
        .select('r90_category, selected_rating_ids')
        .eq('action_type', actionType.trim());

      if (mappings && mappings.length > 0) {
        const mapping = mappings[0];
        
        let query = supabase
          .from('r90_ratings')
          .select('id, title, description, score');

        if (mapping.selected_rating_ids && mapping.selected_rating_ids.length > 0) {
          query = query.in('id', mapping.selected_rating_ids);
        } else if (mapping.r90_category) {
          query = query.eq('category', mapping.r90_category);
        }

        const { data: ratings, error } = await query;

        if (!error && ratings) {
          const scores = ratings.map(r => ({
            score: r.score,
            title: r.title,
            description: r.description || ''
          }));
          
          setPreviousScores(prev => ({
            ...prev,
            [actionId]: scores
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching suggested scores:', error);
    } finally {
      setLoadingScores(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const applySelectedScores = (actionId: string) => {
    const selected = selectedScores[actionId];
    const scores = previousScores[actionId];
    
    if (!selected || !scores || selected.size === 0) return;

    const selectedScoreValues = Array.from(selected).map(idx => {
      const score = scores[idx].score;
      return typeof score === 'string' ? parseFloat(score) : (score || 0);
    });

    const averageScore = selectedScoreValues.reduce((sum, s) => sum + s, 0) / selectedScoreValues.length;
    
    updateEditedAction(actionId, { action_score: averageScore });
    
    // Clear selection after applying
    setSelectedScores(prev => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
    
    toast.success(`Applied average score: ${averageScore.toFixed(5)}`);
  };

  // Group actions by type
  const groupedActions = actions.reduce((acc, action) => {
    const type = action.action_type || "Uncategorized";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(action);
    return acc;
  }, {} as Record<string, PerformanceAction[]>);

  const sortedTypes = Object.keys(groupedActions).sort();

  const getEditedAction = (action: PerformanceAction): PerformanceAction => {
    return editedActions[action.id || ""] || action;
  };

  const updateEditedAction = (actionId: string, updates: Partial<PerformanceAction>) => {
    const currentAction = actions.find(a => a.id === actionId);
    if (!currentAction) return;

    setEditedActions(prev => ({
      ...prev,
      [actionId]: {
        ...currentAction,
        ...prev[actionId],
        ...updates,
      },
    }));
  };

  const handleSaveAction = async (action: PerformanceAction) => {
    if (!action.id) return;

    const edited = getEditedAction(action);
    setSavingIds(prev => new Set(prev).add(action.id!));

    try {
      const { error } = await supabase
        .from("performance_report_actions")
        .update({
          action_number: edited.action_number,
          minute: edited.minute,
          action_score: edited.action_score,
          action_type: edited.action_type,
          action_description: edited.action_description,
          notes: edited.notes || null,
          zone: edited.zone,
          is_successful: edited.is_successful ?? true,
        })
        .eq("id", action.id);

      if (error) throw error;

      toast.success("Action updated");
      // Remove from edited state after successful save
      setEditedActions(prev => {
        const next = { ...prev };
        delete next[action.id!];
        return next;
      });
      onActionsUpdated();
    } catch (error: any) {
      console.error("Error updating action:", error);
      toast.error("Failed to update action");
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(action.id!);
        return next;
      });
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
      onActionsUpdated();
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

  const hasUnsavedChanges = (actionId: string) => {
    return !!editedActions[actionId];
  };

  const getAdjustedScore = (action: PerformanceAction) => {
    if (!action.zone || action.action_score === null) return null;
    const category = actionCategories[action.action_type] || null;
    const isDefensive = isDefensiveR90Category(category);
    return calculateAdjustedScore(
      action.action_score,
      action.zone,
      action.is_successful ?? true,
      isDefensive
    );
  };

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
      setR90ViewerCategory(undefined);
      setR90ViewerSearch(undefined);
      setAiSearchAction(null);
      setIsR90ViewerOpen(true);
      return;
    }
    
    // Try to get category from database mapping
    try {
      const { data: mappings } = await supabase
        .from('action_r90_category_mappings')
        .select('r90_category, r90_subcategory, selected_rating_ids')
        .eq('action_type', action.action_type.trim());
      
      const mapping = mappings?.find(m => m.r90_subcategory !== null) || mappings?.[0];
      
      if (mapping?.r90_category) {
        setR90ViewerCategory(mapping.r90_category);
        setR90ViewerSearch(action.action_type);
        setAiSearchAction(null);
        setIsR90ViewerOpen(true);
        return;
      }
    } catch (error) {
      console.error('Error fetching category mapping:', error);
    }
    
    // Fallback to keyword-based matching
    const category = getR90CategoryFromAction(action.action_type, action.action_description);
    setR90ViewerCategory(category);
    setR90ViewerSearch(action.action_type);
    setAiSearchAction(null);
    setIsR90ViewerOpen(true);
  };

  const openAiSearch = (action: PerformanceAction) => {
    setAiSearchAction({
      type: action.action_type || '',
      context: action.action_description || ''
    });
    setR90ViewerCategory(undefined);
    setR90ViewerSearch(undefined);
    setIsR90ViewerOpen(true);
  };

  const handleUpdateR90Score = async () => {
    if (!analysisId) return;
    
    setUpdatingR90(true);
    try {
      // Calculate total score from all actions
      const totalScore = actions.reduce((sum, a) => sum + (a.action_score || 0), 0);
      
      const { error } = await supabase
        .from("player_analysis")
        .update({ r90_score: totalScore })
        .eq("id", analysisId);

      if (error) throw error;

      toast.success(`Report R90 score updated to ${totalScore.toFixed(5)}`);
      onActionsUpdated();
    } catch (error: any) {
      console.error("Error updating R90 score:", error);
      toast.error("Failed to update R90 score");
    } finally {
      setUpdatingR90(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Actions Grouped by Type</span>
              {analysisId && isAdmin && (
                <Button
                  variant="outline"
                  onClick={handleUpdateR90Score}
                  disabled={updatingR90}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${updatingR90 ? 'animate-spin' : ''}`} />
                  Update Report R90
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-4">
          {sortedTypes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No actions to display</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {sortedTypes.map((type) => {
                const typeActions = groupedActions[type];
                const totalScore = typeActions.reduce((sum, a) => sum + (a.action_score || 0), 0);

                return (
                  <AccordionItem key={type} value={type} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-lg">{type}</span>
                          <span className="text-sm text-muted-foreground">
                            ({typeActions.length} action{typeActions.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className={`text-sm font-mono ${getActionScoreColor(totalScore)}`}>
                          Total: {totalScore.toFixed(5)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {typeActions.map((action) => {
                          const edited = getEditedAction(action);
                          const isSaving = savingIds.has(action.id || "");
                          const hasChanges = hasUnsavedChanges(action.id || "");

                          return (
                            <div
                              key={action.id}
                              className={`border rounded-lg p-4 space-y-3 ${
                                hasChanges ? "border-primary bg-primary/5" : ""
                              }`}
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Action #</Label>
                                  <Input
                                    type="number"
                                    value={edited.action_number}
                                    onChange={(e) =>
                                      updateEditedAction(action.id!, {
                                        action_number: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isAdmin}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Minute</Label>
                                  <Input
                                    type="text"
                                    value={edited.minute.toFixed(2)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) {
                                        updateEditedAction(action.id!, {
                                          minute: val,
                                        });
                                      }
                                    }}
                                    disabled={!isAdmin}
                                    className="h-9"
                                    placeholder="MM.SS"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Score</Label>
                                  <Input
                                    type="number"
                                    step="0.00001"
                                    value={edited.action_score}
                                    onChange={(e) =>
                                      updateEditedAction(action.id!, {
                                        action_score: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isAdmin}
                                    className={`h-9 font-mono ${getActionScoreColor(edited.action_score)}`}
                                  />
                                  {edited.zone && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Adjusted: {getAdjustedScore(edited)?.toFixed(5) || 'N/A'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Zone and Success Row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Zone (1-18)</Label>
                                  <Select
                                    value={edited.zone?.toString() || "none"}
                                    onValueChange={(v) => updateEditedAction(action.id!, { zone: v === "none" ? null : parseInt(v) })}
                                    disabled={!isAdmin}
                                  >
                                    <SelectTrigger className="h-9">
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
                                <div className="space-y-1">
                                  <Label className="text-xs flex items-center gap-2">
                                    <span>Successful</span>
                                    <Switch
                                      checked={edited.is_successful ?? true}
                                      onCheckedChange={(checked) => updateEditedAction(action.id!, { is_successful: checked })}
                                      disabled={!isAdmin}
                                    />
                                  </Label>
                                  <div className="text-xs text-muted-foreground">
                                    {edited.is_successful ? 'Positive' : 'Negative'}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Type</Label>
                                  <Input
                                    value={edited.action_type}
                                    onChange={(e) =>
                                      updateEditedAction(action.id!, {
                                        action_type: e.target.value,
                                      })
                                    }
                                    disabled={!isAdmin}
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                  value={edited.action_description}
                                  onChange={(e) =>
                                    updateEditedAction(action.id!, {
                                      action_description: e.target.value,
                                    })
                                  }
                                  disabled={!isAdmin}
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Notes</Label>
                                <Textarea
                                  value={edited.notes || ""}
                                  onChange={(e) =>
                                    updateEditedAction(action.id!, {
                                      notes: e.target.value,
                                    })
                                  }
                                  disabled={!isAdmin}
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>

                              {/* Suggested Scores from R90 */}
                              {action.id && previousScores[action.id] && previousScores[action.id].length > 0 && (
                                <Collapsible
                                  open={expandedScores.has(action.id)}
                                  onOpenChange={(isOpen) => {
                                    setExpandedScores(prev => {
                                      const next = new Set(prev);
                                      if (isOpen) {
                                        next.add(action.id!);
                                      } else {
                                        next.delete(action.id!);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="border rounded-md p-3 bg-muted/30"
                                >
                                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-muted/50 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Suggested Scores from R90</span>
                                      {selectedScores[action.id] && selectedScores[action.id].size > 0 && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            applySelectedScores(action.id!);
                                          }}
                                          className="h-6 text-xs"
                                        >
                                          Apply Selected ({selectedScores[action.id].size})
                                        </Button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        See all ({previousScores[action.id].length})
                                      </span>
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedScores.has(action.id) ? 'rotate-180' : ''}`} />
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-2 pt-2">
                                    {previousScores[action.id].map((score, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-sm">
                                        <Checkbox
                                          checked={selectedScores[action.id]?.has(idx) || false}
                                          onCheckedChange={(checked) => {
                                            setSelectedScores(prev => {
                                              const actionScores = new Set(prev[action.id!] || []);
                                              if (checked) {
                                                actionScores.add(idx);
                                              } else {
                                                actionScores.delete(idx);
                                              }
                                              return { ...prev, [action.id!]: actionScores };
                                            });
                                          }}
                                          className="mt-1"
                                        />
                                        <span className="flex-1">
                                          {score.title} - {score.description || 'No description'}{' '}
                                          <span className="font-mono font-semibold">
                                            {formatScoreWithFrequency(score.score)}
                                          </span>
                                        </span>
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}

                              {/* Loading indicator for suggested scores */}
                              {action.id && loadingScores.has(action.id) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Loading suggested scores...</span>
                                </div>
                              )}

                              <div className="flex gap-2 justify-between pt-2">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAiSearch(edited)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    AI Search
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setR90ViewerCategory(undefined);
                                      setR90ViewerSearch(undefined);
                                      setAiSearchAction(null);
                                      setIsR90ViewerOpen(true);
                                    }}
                                  >
                                    <Search className="w-4 h-4 mr-2" />
                                    R90 Ratings
                                  </Button>
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-2">
                                    {hasChanges && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveAction(action)}
                                        disabled={isSaving}
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isSaving ? "Saving..." : "Save"}
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => action.id && handleDeleteAction(action.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <R90RatingsViewer
      open={isR90ViewerOpen}
      onOpenChange={setIsR90ViewerOpen}
      initialCategory={r90ViewerCategory}
      searchTerm={r90ViewerSearch}
      prefilledSearch={aiSearchAction}
    />
    </>
  );
};
