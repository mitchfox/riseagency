import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus } from "lucide-react";

interface PerformanceAction {
  id?: string;
  action_number: number;
  minute: number;
  action_score: number;
  action_type: string;
  action_description: string;
  notes: string;
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
  const [previousScores, setPreviousScores] = useState<string>("");
  const [newAction, setNewAction] = useState<PerformanceAction>({
    action_number: 1,
    minute: 0,
    action_score: 0,
    action_type: "",
    action_description: "",
    notes: "",
  });

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

  const fetchPreviousScores = async (actionType: string) => {
    try {
      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("action_score")
        .eq("action_type", actionType)
        .not("action_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const scores = data.map(item => item.action_score.toFixed(5)).join(", ");
        setPreviousScores(scores);
      } else {
        setPreviousScores("");
      }
    } catch (error: any) {
      console.error("Error fetching previous scores:", error);
    }
  };

  const handleActionTypeChange = async (value: string) => {
    setNewAction({ ...newAction, action_type: value });
    if (value) {
      await fetchPreviousScores(value);
    } else {
      setPreviousScores("");
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
      });
      
      // Refresh actions
      await fetchActions();
    } catch (error: any) {
      console.error("Error adding action:", error);
      toast.error("Failed to add action");
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Report Actions - {playerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* R90 Score Display */}
          {r90Score !== null && (
            <div className="bg-accent/20 p-4 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">R90 Score</p>
                <p className="text-3xl font-bold">{r90Score.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Additional Striker Stats */}
          {strikerStats && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-3">Additional Match Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(strikerStats).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-accent/10 rounded">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xl font-bold">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                {previousScores && (
                  <p className="text-[10px] font-medium" style={{ color: 'hsl(43, 49%, 61%)' }}>
                    Previous: {previousScores}
                  </p>
                )}
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
            <h3 className="font-semibold mb-4">Existing Actions</h3>
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
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{(action.minute ?? 0).toFixed(2)}'</span>
                        <span className={`text-sm font-mono whitespace-nowrap ${getActionScoreColor(action.action_score ?? 0)}`}>
                          {(action.action_score ?? 0).toFixed(5)}
                        </span>
                        <span className="font-semibold truncate">{action.action_type}</span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => action.id && handleDeleteAction(action.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
