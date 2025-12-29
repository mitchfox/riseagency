import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Apple, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface NutritionProgramManagementProps {
  playerId: string;
  playerName: string;
}

const defaultProgram: Partial<NutritionProgram> = {
  phase_name: "",
  diet_framework: "",
  weekly_structure: "",
  key_additions: "",
  overview: "",
  is_current: true,
  calories: "",
  carbohydrates: "",
  protein: "",
  fat: "",
  micro_1_name: "Omega-3's",
  micro_1_amount: "3g",
  micro_2_name: "Vitamin D",
  micro_2_amount: "3g",
  supplement_1_name: "",
  supplement_1_amount: "",
  supplement_2_name: "",
  supplement_2_amount: "",
  supplement_3_name: "",
  supplement_3_amount: "",
  training_day_overview: "",
  training_day_timings: "",
  calories_training_day: "",
  carbs_training_day: "",
  protein_training_day: "",
  fat_training_day: "",
  match_day_overview: "",
  pre_match_timings: "",
  in_match_timings: "",
  post_match_timings: "",
  calories_match_day: "",
  carbs_match_day: "",
  protein_match_day: "",
  fat_match_day: "",
  recovery_day_overview: "",
  recovery_day_timings: "",
  calories_recovery_day: "",
  carbs_recovery_day: "",
  protein_recovery_day: "",
  fat_recovery_day: "",
};

export const NutritionProgramManagement = ({ playerId, playerName }: NutritionProgramManagementProps) => {
  const [programs, setPrograms] = useState<NutritionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<NutritionProgram>>(defaultProgram);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, [playerId]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("player_nutrition_programs")
        .select("*")
        .eq("player_id", playerId)
        .order("is_current", { ascending: false });

      if (error) {
        console.error("Error fetching nutrition programs:", error);
        toast.error("Failed to load nutrition programs");
        setPrograms([]);
      } else {
        setPrograms(data as NutritionProgram[]);
      }
    } catch (err) {
      console.error("Exception fetching nutrition programs:", err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingProgram.phase_name?.trim()) {
      toast.error("Phase name is required");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingProgram.id) {
        // Update existing
        const { error } = await supabase
          .from("player_nutrition_programs")
          .update({
            ...editingProgram,
            player_id: playerId,
          })
          .eq("id", editingProgram.id);

        if (error) throw error;
        toast.success("Nutrition program updated");
      } else {
        // If setting as current, unset others first
        if (editingProgram.is_current) {
          await supabase
            .from("player_nutrition_programs")
            .update({ is_current: false })
            .eq("player_id", playerId);
        }

        // Create new
        const { id, created_at, ...programData } = editingProgram as any;
        const { error } = await supabase
          .from("player_nutrition_programs")
          .insert({
            ...programData,
            player_id: playerId,
          });

        if (error) throw error;
        toast.success("Nutrition program created");
      }

      setDialogOpen(false);
      fetchPrograms();
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this nutrition program?")) return;

    const { error } = await supabase
      .from("player_nutrition_programs")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Program deleted");
      fetchPrograms();
    }
  };

  const handleSetCurrent = async (id: string) => {
    try {
      // Unset all
      await supabase
        .from("player_nutrition_programs")
        .update({ is_current: false })
        .eq("player_id", playerId);

      // Set this one
      await supabase
        .from("player_nutrition_programs")
        .update({ is_current: true })
        .eq("id", id);

      toast.success("Current program updated");
      fetchPrograms();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const openNewDialog = () => {
    setEditingProgram({ ...defaultProgram });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEditDialog = (program: NutritionProgram) => {
    setEditingProgram(program);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const updateField = (field: keyof NutritionProgram, value: any) => {
    setEditingProgram(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nutrition Programs</h3>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Program
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No nutrition programs yet. Click "Add Program" to create one.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {programs.map((program) => (
            <Card key={program.id} className={program.is_current ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{program.phase_name}</h4>
                      {program.is_current && (
                        <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    {program.diet_framework && (
                      <p className="text-sm text-muted-foreground truncate">{program.diet_framework}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {program.calories && <span>Calories: {program.calories}</span>}
                      {program.protein && <span>Protein: {program.protein}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!program.is_current && (
                      <Button variant="outline" size="sm" onClick={() => handleSetCurrent(program.id)}>
                        Set Current
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(program)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(program.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{isEditing ? "Edit" : "New"} Nutrition Program</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
            <div className="space-y-6 pt-4">
              {/* Phase Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Phase Name *</Label>
                  <Input
                    value={editingProgram.phase_name || ""}
                    onChange={(e) => updateField("phase_name", e.target.value)}
                    placeholder="e.g., Endurance Phase"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="is_current"
                    checked={editingProgram.is_current}
                    onCheckedChange={(checked) => updateField("is_current", checked)}
                  />
                  <Label htmlFor="is_current">Set as current program</Label>
                </div>
              </div>

              <div>
                <Label>Diet Framework</Label>
                <Input
                  value={editingProgram.diet_framework || ""}
                  onChange={(e) => updateField("diet_framework", e.target.value)}
                  placeholder="e.g., Cardiovascular endurance improvement and controlled weight increase"
                />
              </div>

              <div>
                <Label>Weekly Structure</Label>
                <Input
                  value={editingProgram.weekly_structure || ""}
                  onChange={(e) => updateField("weekly_structure", e.target.value)}
                  placeholder="e.g., Maintain consistency with minor calorie surplus"
                />
              </div>

              <div>
                <Label>Key Additions</Label>
                <Input
                  value={editingProgram.key_additions || ""}
                  onChange={(e) => updateField("key_additions", e.target.value)}
                  placeholder="e.g., +150 calories daily; new supplements"
                />
              </div>

              <div>
                <Label>Overview</Label>
                <Textarea
                  value={editingProgram.overview || ""}
                  onChange={(e) => updateField("overview", e.target.value)}
                  placeholder="Detailed overview of this nutrition phase..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Key Macros */}
              <div>
                <h4 className="font-semibold mb-3 text-primary">Key Macros (Base Values)</h4>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <Label>Calories</Label>
                    <Input
                      value={editingProgram.calories || ""}
                      onChange={(e) => updateField("calories", e.target.value)}
                      placeholder="3650"
                    />
                  </div>
                  <div>
                    <Label>Carbohydrates</Label>
                    <Input
                      value={editingProgram.carbohydrates || ""}
                      onChange={(e) => updateField("carbohydrates", e.target.value)}
                      placeholder="475g"
                    />
                  </div>
                  <div>
                    <Label>Protein</Label>
                    <Input
                      value={editingProgram.protein || ""}
                      onChange={(e) => updateField("protein", e.target.value)}
                      placeholder="200g"
                    />
                  </div>
                  <div>
                    <Label>Fat</Label>
                    <Input
                      value={editingProgram.fat || ""}
                      onChange={(e) => updateField("fat", e.target.value)}
                      placeholder="105g"
                    />
                  </div>
                </div>
              </div>

              {/* Key Micros */}
              <div>
                <h4 className="font-semibold mb-3 text-primary">Key Micros</h4>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <Label>Micro 1 Name</Label>
                    <Input
                      value={editingProgram.micro_1_name || ""}
                      onChange={(e) => updateField("micro_1_name", e.target.value)}
                      placeholder="Omega-3's"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      value={editingProgram.micro_1_amount || ""}
                      onChange={(e) => updateField("micro_1_amount", e.target.value)}
                      placeholder="3g"
                    />
                  </div>
                  <div>
                    <Label>Micro 2 Name</Label>
                    <Input
                      value={editingProgram.micro_2_name || ""}
                      onChange={(e) => updateField("micro_2_name", e.target.value)}
                      placeholder="Vitamin D"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      value={editingProgram.micro_2_amount || ""}
                      onChange={(e) => updateField("micro_2_amount", e.target.value)}
                      placeholder="3g"
                    />
                  </div>
                </div>
              </div>

              {/* Supplements */}
              <div>
                <h4 className="font-semibold mb-3 text-primary">Supplements</h4>
                <div className="grid gap-3 md:grid-cols-6">
                  <div>
                    <Label>Supplement 1</Label>
                    <Input
                      value={editingProgram.supplement_1_name || ""}
                      onChange={(e) => updateField("supplement_1_name", e.target.value)}
                      placeholder="Beta-Alanine"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      value={editingProgram.supplement_1_amount || ""}
                      onChange={(e) => updateField("supplement_1_amount", e.target.value)}
                      placeholder="5g"
                    />
                  </div>
                  <div>
                    <Label>Supplement 2</Label>
                    <Input
                      value={editingProgram.supplement_2_name || ""}
                      onChange={(e) => updateField("supplement_2_name", e.target.value)}
                      placeholder="Beet Shots"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      value={editingProgram.supplement_2_amount || ""}
                      onChange={(e) => updateField("supplement_2_amount", e.target.value)}
                      placeholder="2 Shots"
                    />
                  </div>
                  <div>
                    <Label>Supplement 3</Label>
                    <Input
                      value={editingProgram.supplement_3_name || ""}
                      onChange={(e) => updateField("supplement_3_name", e.target.value)}
                      placeholder="Omega-3's"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      value={editingProgram.supplement_3_amount || ""}
                      onChange={(e) => updateField("supplement_3_amount", e.target.value)}
                      placeholder="up to 3g"
                    />
                  </div>
                </div>
              </div>

              {/* Training Day */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-primary">Training Day</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Important Timings</Label>
                    <Textarea
                      value={editingProgram.training_day_timings || ""}
                      onChange={(e) => updateField("training_day_timings", e.target.value)}
                      placeholder="Protein evenly split across meals..."
                      className="min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label>Notes/Overview</Label>
                    <Textarea
                      value={editingProgram.training_day_overview || ""}
                      onChange={(e) => updateField("training_day_overview", e.target.value)}
                      placeholder="On training days, the focus is..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <Label>Calories</Label>
                      <Input
                        value={editingProgram.calories_training_day || ""}
                        onChange={(e) => updateField("calories_training_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Carbs</Label>
                      <Input
                        value={editingProgram.carbs_training_day || ""}
                        onChange={(e) => updateField("carbs_training_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Protein</Label>
                      <Input
                        value={editingProgram.protein_training_day || ""}
                        onChange={(e) => updateField("protein_training_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fat</Label>
                      <Input
                        value={editingProgram.fat_training_day || ""}
                        onChange={(e) => updateField("fat_training_day", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Day */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-primary">Match Day</h4>
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label>Pre-Match Timings</Label>
                      <Input
                        value={editingProgram.pre_match_timings || ""}
                        onChange={(e) => updateField("pre_match_timings", e.target.value)}
                        placeholder="Highest-carb meal 3-4h before..."
                      />
                    </div>
                    <div>
                      <Label>In-Match Timings</Label>
                      <Input
                        value={editingProgram.in_match_timings || ""}
                        onChange={(e) => updateField("in_match_timings", e.target.value)}
                        placeholder="Simple carbs at half-time..."
                      />
                    </div>
                    <div>
                      <Label>Post-Match Timings</Label>
                      <Input
                        value={editingProgram.post_match_timings || ""}
                        onChange={(e) => updateField("post_match_timings", e.target.value)}
                        placeholder="Carbs within 60m..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes/Overview</Label>
                    <Textarea
                      value={editingProgram.match_day_overview || ""}
                      onChange={(e) => updateField("match_day_overview", e.target.value)}
                      placeholder="In general, look for leaner meats..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <Label>Calories</Label>
                      <Input
                        value={editingProgram.calories_match_day || ""}
                        onChange={(e) => updateField("calories_match_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Carbs</Label>
                      <Input
                        value={editingProgram.carbs_match_day || ""}
                        onChange={(e) => updateField("carbs_match_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Protein</Label>
                      <Input
                        value={editingProgram.protein_match_day || ""}
                        onChange={(e) => updateField("protein_match_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fat</Label>
                      <Input
                        value={editingProgram.fat_match_day || ""}
                        onChange={(e) => updateField("fat_match_day", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recovery Day */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-primary">Recovery Day</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Important Timings</Label>
                    <Textarea
                      value={editingProgram.recovery_day_timings || ""}
                      onChange={(e) => updateField("recovery_day_timings", e.target.value)}
                      placeholder="Fibre-rich carbs should be consumed earlier..."
                      className="min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label>Notes/Overview</Label>
                    <Textarea
                      value={editingProgram.recovery_day_overview || ""}
                      onChange={(e) => updateField("recovery_day_overview", e.target.value)}
                      placeholder="Retain a similar intake all-around..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <Label>Calories</Label>
                      <Input
                        value={editingProgram.calories_recovery_day || ""}
                        onChange={(e) => updateField("calories_recovery_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Carbs</Label>
                      <Input
                        value={editingProgram.carbs_recovery_day || ""}
                        onChange={(e) => updateField("carbs_recovery_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Protein</Label>
                      <Input
                        value={editingProgram.protein_recovery_day || ""}
                        onChange={(e) => updateField("protein_recovery_day", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fat</Label>
                      <Input
                        value={editingProgram.fat_recovery_day || ""}
                        onChange={(e) => updateField("fat_recovery_day", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? "Update" : "Create"} Program
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
