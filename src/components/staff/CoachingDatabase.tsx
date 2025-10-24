import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ExerciseDatabaseImport } from "./ExerciseDatabaseImport";

type TableType = 'coaching_sessions' | 'coaching_programmes' | 'coaching_drills' | 'coaching_exercises' | 'coaching_analysis' | 'psychological_sessions';

interface CoachingItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Table-specific fields
  duration?: number | null;
  weeks?: number | null;
  setup?: string | null;
  equipment?: string | null;
  players_required?: string | null;
  sets?: number | null;
  reps?: number | null;
  rest_time?: number | null;
  analysis_type?: string | null;
}

const tableConfigs = {
  coaching_sessions: {
    label: 'Sessions',
    fields: ['title', 'description', 'content', 'duration', 'category'],
  },
  coaching_programmes: {
    label: 'Programmes',
    fields: ['title', 'description', 'content', 'weeks', 'category'],
  },
  coaching_drills: {
    label: 'Drills',
    fields: ['title', 'description', 'content', 'setup', 'equipment', 'players_required', 'category'],
  },
  coaching_exercises: {
    label: 'Exercises',
    fields: ['title', 'description', 'content', 'sets', 'reps', 'rest_time', 'category'],
  },
  coaching_analysis: {
    label: 'Analysis',
    fields: ['title', 'description', 'content', 'analysis_type', 'category'],
  },
  psychological_sessions: {
    label: 'Psychological Sessions',
    fields: ['title', 'description', 'content', 'duration', 'category'],
  },
};

export const CoachingDatabase = () => {
  const [activeTab, setActiveTab] = useState<TableType>('coaching_sessions');
  const [items, setItems] = useState<CoachingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CoachingItem | null>(null);
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    content: '',
    category: '',
  });

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        const { error } = await supabase
          .from(activeTab)
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from(activeTab)
          .insert(formData);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      setFormData({
        title: '',
        description: '',
        content: '',
        category: '',
      });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      toast.error('Failed to save item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: CoachingItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      content: item.content || '',
      category: item.category || '',
      duration: item.duration || '',
      weeks: item.weeks || '',
      setup: item.setup || '',
      equipment: item.equipment || '',
      players_required: item.players_required || '',
      sets: item.sets || '',
      reps: item.reps || '',
      rest_time: item.rest_time || '',
      analysis_type: item.analysis_type || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      category: '',
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Coaching Database</h2>
      </div>

      {/* Import section at the top */}
      <ExerciseDatabaseImport />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableType)}>
        <TabsList className="grid w-full grid-cols-6">
          {Object.entries(tableConfigs).map(([key, config]) => (
            <TabsTrigger key={key} value={key}>
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(tableConfigs).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add {config.label}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? `Edit ${config.label}` : `Add ${config.label}`}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>

                    {/* Table-specific fields */}
                    {(key === 'coaching_sessions' || key === 'psychological_sessions') && (
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || null })}
                        />
                      </div>
                    )}

                    {key === 'coaching_programmes' && (
                      <div className="space-y-2">
                        <Label htmlFor="weeks">Duration (weeks)</Label>
                        <Input
                          id="weeks"
                          type="number"
                          value={formData.weeks}
                          onChange={(e) => setFormData({ ...formData, weeks: parseInt(e.target.value) || null })}
                        />
                      </div>
                    )}

                    {key === 'coaching_drills' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="setup">Setup</Label>
                          <Textarea
                            id="setup"
                            value={formData.setup}
                            onChange={(e) => setFormData({ ...formData, setup: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="equipment">Equipment</Label>
                          <Input
                            id="equipment"
                            value={formData.equipment}
                            onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="players_required">Players Required</Label>
                          <Input
                            id="players_required"
                            value={formData.players_required}
                            onChange={(e) => setFormData({ ...formData, players_required: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {key === 'coaching_exercises' && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sets">Sets</Label>
                            <Input
                              id="sets"
                              type="number"
                              value={formData.sets}
                              onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || null })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reps">Reps</Label>
                            <Input
                              id="reps"
                              type="number"
                              value={formData.reps}
                              onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) || null })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rest_time">Rest (seconds)</Label>
                            <Input
                              id="rest_time"
                              type="number"
                              value={formData.rest_time}
                              onChange={(e) => setFormData({ ...formData, rest_time: parseInt(e.target.value) || null })}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {key === 'coaching_analysis' && (
                      <div className="space-y-2">
                        <Label htmlFor="analysis_type">Analysis Type</Label>
                        <Input
                          id="analysis_type"
                          value={formData.analysis_type}
                          onChange={(e) => setFormData({ ...formData, analysis_type: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {items.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No {config.label.toLowerCase()} found. Click "Add {config.label}" to create one.
                  </CardContent>
                </Card>
              ) : (
                items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle>{item.title}</CardTitle>
                          {item.category && (
                            <p className="text-sm text-muted-foreground">
                              Category: {item.category}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                      )}
                      {item.content && (
                        <p className="text-sm line-clamp-3">{item.content}</p>
                      )}
                      <div className="mt-4 text-xs text-muted-foreground">
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
