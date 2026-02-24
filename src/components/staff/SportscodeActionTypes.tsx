import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Clock, Eye, Video } from "lucide-react";

interface ActionType {
  id: string;
  action_name: string;
  description: string | null;
  visual_cues: string | null;
  typical_duration_seconds: number | null;
  default_before_seconds: number | null;
  default_after_seconds: number | null;
  category: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["On Ball", "Defensive", "Off Ball", "Set Piece", "Other"];

export const SportscodeActionTypes = () => {
  const [actions, setActions] = useState<ActionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionType | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [formData, setFormData] = useState({
    action_name: "",
    description: "",
    visual_cues: "",
    typical_duration_seconds: 10,
    default_before_seconds: 5,
    default_after_seconds: 5,
    category: "On Ball",
  });

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from("sportscode_action_types")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setActions(data);
    if (error) toast.error("Failed to load action types");
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.action_name.trim()) {
      toast.error("Action name is required");
      return;
    }

    if (editingAction) {
      const { error } = await supabase
        .from("sportscode_action_types")
        .update({
          action_name: formData.action_name,
          description: formData.description || null,
          visual_cues: formData.visual_cues || null,
          typical_duration_seconds: formData.typical_duration_seconds,
          default_before_seconds: formData.default_before_seconds,
          default_after_seconds: formData.default_after_seconds,
          category: formData.category,
        })
        .eq("id", editingAction.id);
      if (error) {
        toast.error("Failed to update");
        return;
      }
      toast.success("Action type updated");
    } else {
      const maxOrder = actions.length > 0 ? Math.max(...actions.map(a => a.display_order || 0)) : 0;
      const { error } = await supabase
        .from("sportscode_action_types")
        .insert({
          action_name: formData.action_name,
          description: formData.description || null,
          visual_cues: formData.visual_cues || null,
          typical_duration_seconds: formData.typical_duration_seconds,
          default_before_seconds: formData.default_before_seconds,
          default_after_seconds: formData.default_after_seconds,
          category: formData.category,
          display_order: maxOrder + 1,
        });
      if (error) {
        toast.error("Failed to create");
        return;
      }
      toast.success("Action type added");
    }

    setDialogOpen(false);
    setEditingAction(null);
    resetForm();
    fetchActions();
  };

  const handleEdit = (action: ActionType) => {
    setEditingAction(action);
    setFormData({
      action_name: action.action_name,
      description: action.description || "",
      visual_cues: action.visual_cues || "",
      typical_duration_seconds: action.typical_duration_seconds || 10,
      default_before_seconds: action.default_before_seconds || 5,
      default_after_seconds: action.default_after_seconds || 5,
      category: action.category || "On Ball",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this action type?")) return;
    const { error } = await supabase.from("sportscode_action_types").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    fetchActions();
  };

  const resetForm = () => {
    setFormData({
      action_name: "",
      description: "",
      visual_cues: "",
      typical_duration_seconds: 10,
      default_before_seconds: 5,
      default_after_seconds: 5,
      category: "On Ball",
    });
  };

  const filtered = filterCategory === "all" ? actions : actions.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sportscode Action Types</h3>
          <p className="text-sm text-muted-foreground">
            Define action types and their visual cues to improve AI detection accuracy during video analysis.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingAction(null); setDialogOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> Add Action
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="self-center">{filtered.length} action{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(action => (
            <Card key={action.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{action.action_name}</h4>
                      <Badge variant="outline" className="text-[10px]">{action.category}</Badge>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {action.default_before_seconds || 5}s before / {action.default_after_seconds || 5}s after
                      </div>
                    </div>
                    {action.description && (
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    )}
                    {action.visual_cues && (
                      <div className="text-xs text-muted-foreground/80 bg-muted/40 rounded p-2 mt-1">
                        <span className="flex items-center gap-1 font-medium text-muted-foreground mb-0.5">
                          <Eye className="h-3 w-3" /> Visual Cues for AI
                        </span>
                        {action.visual_cues}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(action)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(action.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No action types found. Add one to get started.</p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAction ? "Edit" : "Add"} Action Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Action Name *</Label>
                <Input
                  value={formData.action_name}
                  onChange={e => setFormData(prev => ({ ...prev, action_name: e.target.value }))}
                  placeholder="e.g. Through Ball"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the action"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visual Cues for AI</Label>
              <Textarea
                value={formData.visual_cues}
                onChange={e => setFormData(prev => ({ ...prev, visual_cues: e.target.value }))}
                placeholder="Describe what this action looks like in video frames so the AI can identify it. E.g. 'Player extends leg towards ball while opponent has possession. Physical contact likely.'"
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">The more specific you are about body positions, ball movement and spatial context, the better the AI will detect it.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Seconds Before Action</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={formData.default_before_seconds}
                  onChange={e => setFormData(prev => ({ ...prev, default_before_seconds: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seconds After Action</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={formData.default_after_seconds}
                  onChange={e => setFormData(prev => ({ ...prev, default_after_seconds: parseInt(e.target.value) || 5 }))}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">How many seconds before and after the action the AI should include in the clip. Shorter for quick actions like clearances, longer for dribbles or runs.</p>
            <Button onClick={handleSave} className="w-full">
              {editingAction ? "Update" : "Add"} Action Type
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
