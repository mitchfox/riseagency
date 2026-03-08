import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Search, UtensilsCrossed, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Recipe {
  id: string;
  title: string;
  category: string;
  description: string | null;
  ingredients: string | null;
  method: string | null;
  calories: string | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  image_url: string | null;
  tags: string[];
  created_at: string;
}

interface RecipeAssignment {
  id: string;
  recipe_id: string;
  player_id: string;
  phase_name: string | null;
  is_visible: boolean;
}

const CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Pre-Match",
  "Post-Match",
  "Recovery",
  "Smoothie",
  "General",
];

interface NutritionRecipesProps {
  playerId?: string;
  playerName?: string;
  currentPhase?: string;
}

export const NutritionRecipes = ({ playerId, playerName, currentPhase }: NutritionRecipesProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [assignments, setAssignments] = useState<RecipeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    category: "General",
    description: "",
    ingredients: "",
    method: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    image_url: "",
  });

  useEffect(() => {
    fetchRecipes();
    if (playerId) fetchAssignments();
  }, [playerId]);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("nutrition_recipes")
        .select("*")
        .order("category")
        .order("title");
      if (error) throw error;
      setRecipes(data || []);
    } catch (err: any) {
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!playerId) return;
    const { data } = await supabase
      .from("player_recipe_assignments")
      .select("*")
      .eq("player_id", playerId);
    setAssignments(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error("Title is required"); return; }

    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        description: formData.description || null,
        ingredients: formData.ingredients || null,
        method: formData.method || null,
        calories: formData.calories || null,
        protein: formData.protein || null,
        carbs: formData.carbs || null,
        fat: formData.fat || null,
        image_url: formData.image_url || null,
      };

      if (editingRecipe) {
        const { error } = await supabase
          .from("nutrition_recipes")
          .update(payload)
          .eq("id", editingRecipe.id);
        if (error) throw error;
        toast.success("Recipe updated");
      } else {
        const { error } = await supabase
          .from("nutrition_recipes")
          .insert([payload]);
        if (error) throw error;
        toast.success("Recipe added");
      }

      setDialogOpen(false);
      resetForm();
      fetchRecipes();
    } catch (err: any) {
      toast.error("Failed to save recipe");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("nutrition_recipes").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Recipe deleted");
    fetchRecipes();
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title,
      category: recipe.category,
      description: recipe.description || "",
      ingredients: recipe.ingredients || "",
      method: recipe.method || "",
      calories: recipe.calories || "",
      protein: recipe.protein || "",
      carbs: recipe.carbs || "",
      fat: recipe.fat || "",
      image_url: recipe.image_url || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRecipe(null);
    setFormData({ title: "", category: "General", description: "", ingredients: "", method: "", calories: "", protein: "", carbs: "", fat: "", image_url: "" });
  };

  const toggleAssignment = async (recipeId: string) => {
    if (!playerId) return;
    const existing = assignments.find(a => a.recipe_id === recipeId);
    if (existing) {
      await supabase.from("player_recipe_assignments").delete().eq("id", existing.id);
      setAssignments(prev => prev.filter(a => a.id !== existing.id));
      toast.success("Recipe removed from player");
    } else {
      const { data, error } = await supabase
        .from("player_recipe_assignments")
        .insert([{ player_id: playerId, recipe_id: recipeId, phase_name: currentPhase || null, is_visible: true }])
        .select()
        .single();
      if (error) { toast.error("Failed to assign"); return; }
      setAssignments(prev => [...prev, data]);
      toast.success("Recipe assigned to player");
    }
  };

  const filtered = recipes.filter(r => {
    const matchSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === "all" || r.category === filterCategory;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(r => r.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Recipe[]>);

  // Also capture uncategorised
  const uncategorised = filtered.filter(r => !CATEGORIES.includes(r.category));
  if (uncategorised.length > 0) grouped["Other"] = uncategorised;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Recipe
        </Button>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading recipes...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-1">No recipes yet</p>
          <p className="text-sm">Add your first recipe to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(recipe => {
                  const isAssigned = assignments.some(a => a.recipe_id === recipe.id);
                  return (
                    <Card key={recipe.id} className={`group relative transition-all hover:shadow-md ${isAssigned ? 'ring-2 ring-primary/50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm leading-tight">{recipe.title}</h4>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(recipe)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(recipe.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {recipe.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
                        )}

                        {/* Macros */}
                        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat) && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.calories && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Flame className="w-3 h-3" />{recipe.calories} kcal
                              </Badge>
                            )}
                            {recipe.protein && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Beef className="w-3 h-3" />{recipe.protein}g P
                              </Badge>
                            )}
                            {recipe.carbs && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Wheat className="w-3 h-3" />{recipe.carbs}g C
                              </Badge>
                            )}
                            {recipe.fat && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Droplets className="w-3 h-3" />{recipe.fat}g F
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Assign to player toggle */}
                        {playerId && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Checkbox
                              checked={isAssigned}
                              onCheckedChange={() => toggleAssignment(recipe.id)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {isAssigned ? `Assigned to ${playerName}` : `Assign to ${playerName}`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? "Edit Recipe" : "Add Recipe"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Ingredients</Label>
              <Textarea value={formData.ingredients} onChange={e => setFormData({ ...formData, ingredients: e.target.value })} rows={4} placeholder="One ingredient per line" />
            </div>

            <div className="space-y-2">
              <Label>Method</Label>
              <Textarea value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })} rows={4} placeholder="Step-by-step instructions" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Calories (kcal)</Label>
                <Input value={formData.calories} onChange={e => setFormData({ ...formData, calories: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Protein (g)</Label>
                <Input value={formData.protein} onChange={e => setFormData({ ...formData, protein: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Carbs (g)</Label>
                <Input value={formData.carbs} onChange={e => setFormData({ ...formData, carbs: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fat (g)</Label>
                <Input value={formData.fat} onChange={e => setFormData({ ...formData, fat: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingRecipe ? "Update" : "Add"} Recipe</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
