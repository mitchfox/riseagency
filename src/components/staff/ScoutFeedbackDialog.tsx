import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Star, Send } from "lucide-react";

interface ScoutFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  scoutId: string;
  playerName: string;
  onSuccess?: () => void;
}

export const ScoutFeedbackDialog = ({
  open,
  onOpenChange,
  reportId,
  scoutId,
  playerName,
  onSuccess,
}: ScoutFeedbackDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    player_feedback: "",
    next_steps: "",
    future_reference_notes: "",
    is_exclusive: false,
    commission_percentage: 0,
    staff_notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.player_feedback && !formData.next_steps && !formData.future_reference_notes) {
      toast.error("Please provide at least one piece of feedback");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("scout_report_feedback").insert({
        report_id: reportId,
        scout_id: scoutId,
        player_feedback: formData.player_feedback || null,
        next_steps: formData.next_steps || null,
        future_reference_notes: formData.future_reference_notes || null,
        is_exclusive: formData.is_exclusive,
        commission_percentage: formData.commission_percentage,
        staff_notes: formData.staff_notes || null,
        created_by: "Staff",
      });

      if (error) throw error;

      // Also update the scouting_reports contribution_type
      await supabase
        .from("scouting_reports")
        .update({
          contribution_type: formData.is_exclusive ? "exclusive" : formData.commission_percentage > 0 ? "contribution" : null,
        })
        .eq("id", reportId);

      toast.success("Feedback sent to scout");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        player_feedback: "",
        next_steps: "",
        future_reference_notes: "",
        is_exclusive: false,
        commission_percentage: 0,
        staff_notes: "",
      });
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Feedback for {playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Player Assessment</Label>
            <Textarea
              placeholder="Your assessment of the player..."
              value={formData.player_feedback}
              onChange={(e) => setFormData({ ...formData, player_feedback: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Next Steps</Label>
            <Textarea
              placeholder="What should be done next..."
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Future Reference Notes</Label>
            <Textarea
              placeholder="Notes for future reporting and scouting..."
              value={formData.future_reference_notes}
              onChange={(e) => setFormData({ ...formData, future_reference_notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-purple-500" />
              <div>
                <Label className="text-base">Exclusive Rights</Label>
                <p className="text-xs text-muted-foreground">Scout has exclusive rights to this player</p>
              </div>
            </div>
            <Switch
              checked={formData.is_exclusive}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                is_exclusive: checked,
                commission_percentage: checked ? 10 : formData.commission_percentage
              })}
            />
          </div>

          <div>
            <Label>Commission Percentage (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={formData.commission_percentage}
              onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.is_exclusive ? "Exclusive scouts typically get 10%" : "Contributors typically get 2-5%"}
            </p>
          </div>

          <div>
            <Label>Internal Staff Notes (not visible to scout)</Label>
            <Textarea
              placeholder="Private notes for staff only..."
              value={formData.staff_notes}
              onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
