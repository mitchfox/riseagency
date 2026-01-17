import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface NutritionProgram {
  id: string;
  player_id: string;
  phase_name: string;
  diet_framework: string | null;
  weekly_structure: string | null;
  key_additions: string | null;
  overview: string | null;
  is_current: boolean;
  calories: string | null;
  carbohydrates: string | null;
  protein: string | null;
  fat: string | null;
  micro_1_name: string | null;
  micro_1_amount: string | null;
  micro_2_name: string | null;
  micro_2_amount: string | null;
  supplement_1_name: string | null;
  supplement_1_amount: string | null;
  supplement_2_name: string | null;
  supplement_2_amount: string | null;
  supplement_3_name: string | null;
  supplement_3_amount: string | null;
  training_day_overview: string | null;
  training_day_timings: string | null;
  calories_training_day: string | null;
  carbs_training_day: string | null;
  protein_training_day: string | null;
  fat_training_day: string | null;
  match_day_overview: string | null;
  pre_match_timings: string | null;
  in_match_timings: string | null;
  post_match_timings: string | null;
  calories_match_day: string | null;
  carbs_match_day: string | null;
  protein_match_day: string | null;
  fat_match_day: string | null;
  recovery_day_overview: string | null;
  recovery_day_timings: string | null;
  calories_recovery_day: string | null;
  carbs_recovery_day: string | null;
  protein_recovery_day: string | null;
  fat_recovery_day: string | null;
  created_at: string;
}

interface SaveNutritionToCoachingDBDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nutritionProgram: NutritionProgram | null;
  playerName: string;
}

export const SaveNutritionToCoachingDBDialog = ({
  isOpen,
  onClose,
  nutritionProgram,
  playerName,
}: SaveNutritionToCoachingDBDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [programmeName, setProgrammeName] = useState("");
  const [saveProgramme, setSaveProgramme] = useState(true);

  useEffect(() => {
    if (isOpen && nutritionProgram) {
      setProgrammeName(
        `${nutritionProgram.phase_name} - ${playerName || "Nutrition Program"}`
      );
      setSaveProgramme(true);
    }
  }, [isOpen, nutritionProgram, playerName]);

  const handleSave = async () => {
    if (!saveProgramme) {
      toast.error("Please select to save the programme");
      return;
    }

    if (!nutritionProgram) {
      toast.error("No nutrition program to save");
      return;
    }

    setSaving(true);
    try {
      // Build a structured content from the nutrition program
      const contentParts: string[] = [];
      
      if (nutritionProgram.overview) {
        contentParts.push(`## Overview\n${nutritionProgram.overview}`);
      }
      if (nutritionProgram.diet_framework) {
        contentParts.push(`## Diet Framework\n${nutritionProgram.diet_framework}`);
      }
      if (nutritionProgram.weekly_structure) {
        contentParts.push(`## Weekly Structure\n${nutritionProgram.weekly_structure}`);
      }
      if (nutritionProgram.key_additions) {
        contentParts.push(`## Key Additions\n${nutritionProgram.key_additions}`);
      }

      // Build description with key macros
      const descParts: string[] = [];
      if (nutritionProgram.calories) descParts.push(`Calories: ${nutritionProgram.calories}`);
      if (nutritionProgram.protein) descParts.push(`Protein: ${nutritionProgram.protein}`);
      if (nutritionProgram.carbohydrates) descParts.push(`Carbs: ${nutritionProgram.carbohydrates}`);
      if (nutritionProgram.fat) descParts.push(`Fat: ${nutritionProgram.fat}`);

      // Clone the entire program data for attachments (excluding id and player_id for privacy)
      const { id, player_id, created_at, ...programData } = nutritionProgram;

      const { error } = await supabase.from("coaching_programmes").insert([
        {
          title: programmeName,
          description: descParts.join(" | ") || `Nutrition program: ${nutritionProgram.phase_name}`,
          content: contentParts.join("\n\n") || nutritionProgram.overview || "",
          category: "Nutrition",
          attachments: {
            nutrition_data: programData,
          } as any,
        },
      ]);

      if (error) throw error;
      toast.success(`Nutrition programme "${programmeName}" saved to database`);
      onClose();
    } catch (error) {
      console.error("Error saving to coaching database:", error);
      toast.error("Failed to save to coaching database");
    } finally {
      setSaving(false);
    }
  };

  if (!nutritionProgram) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Nutrition to Coaching Database
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="save-programme"
              checked={saveProgramme}
              onCheckedChange={(checked) => setSaveProgramme(checked === true)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="save-programme" className="text-base font-medium cursor-pointer">
                Save Nutrition Programme
              </Label>
              <p className="text-sm text-muted-foreground">
                Save "{nutritionProgram.phase_name}" to the coaching database for reuse with other players.
              </p>
              <div className="pt-2">
                <Label htmlFor="programme-name" className="text-sm">
                  Programme Name
                </Label>
                <Input
                  id="programme-name"
                  value={programmeName}
                  onChange={(e) => setProgrammeName(e.target.value)}
                  placeholder="Enter programme name"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 border rounded-lg bg-muted/20">
            <h4 className="font-medium mb-2">Programme Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Phase:</span> {nutritionProgram.phase_name}</p>
              {nutritionProgram.diet_framework && (
                <p><span className="font-medium">Framework:</span> {nutritionProgram.diet_framework}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {nutritionProgram.calories && <span>🔥 {nutritionProgram.calories} cal</span>}
                {nutritionProgram.protein && <span>💪 {nutritionProgram.protein} protein</span>}
                {nutritionProgram.carbohydrates && <span>🍞 {nutritionProgram.carbohydrates} carbs</span>}
                {nutritionProgram.fat && <span>🥑 {nutritionProgram.fat} fat</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !saveProgramme}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Database
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
