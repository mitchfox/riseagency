import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Save, Search, Sparkles, LineChart, RefreshCw } from "lucide-react";
import { R90RatingsViewer } from "./R90RatingsViewer";

interface PerformanceAction {
  id?: string;
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  action_description: string;
  notes: string;
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
                  onClick={handleUpdateR90Score}
                  disabled={updatingR90}
                  size="sm"
                  variant="outline"
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
                                    type="number"
                                    step="0.01"
                                    value={edited.minute}
                                    onChange={(e) =>
                                      updateEditedAction(action.id!, {
                                        minute: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    disabled={!isAdmin}
                                    className="h-9"
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
                                </div>
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
                                    onClick={() => openSmartR90Viewer(edited)}
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
