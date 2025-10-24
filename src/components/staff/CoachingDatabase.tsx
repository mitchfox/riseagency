import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";


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
  reps?: string | null;
  rest_time?: number | null;
  analysis_type?: string | null;
}

const tableConfigs = {
  coaching_sessions: {
    label: 'Sessions',
    singular: 'Session',
    fields: ['title', 'description', 'content', 'duration', 'category'],
  },
  coaching_programmes: {
    label: 'Programmes',
    singular: 'Programme',
    fields: ['title', 'description', 'content', 'weeks', 'category'],
  },
  coaching_drills: {
    label: 'Drills',
    singular: 'Drill',
    fields: ['title', 'description', 'content', 'setup', 'equipment', 'players_required', 'category'],
  },
  coaching_exercises: {
    label: 'Exercises',
    singular: 'Exercise',
    fields: ['title', 'description', 'content', 'sets', 'reps', 'rest_time', 'category'],
  },
  coaching_analysis: {
    label: 'Analysis',
    singular: 'Analysis',
    fields: ['title', 'description', 'content', 'analysis_type', 'category'],
  },
  psychological_sessions: {
    label: 'Psychological Sessions',
    singular: 'Psychological Session',
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
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const itemsPerPage = 20;
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategory('all');
    setSelectedMuscleGroup('all');
    setSelectedPosition('all');
    setSelectedSkill('all');
    fetchCategories();
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    fetchItems();
  }, [selectedCategory, selectedMuscleGroup, selectedPosition, selectedSkill]);

  useEffect(() => {
    fetchItems();
  }, [currentPage]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from(activeTab)
        .select('category, tags');

      if (error) throw error;
      
      const uniqueCategories = new Set<string>();
      const uniqueMuscleGroups = new Set<string>();
      const uniquePositions = new Set<string>();
      const uniqueSkills = new Set<string>();
      
      data?.forEach(item => {
        if (item.category) uniqueCategories.add(item.category);
        if (item.tags && Array.isArray(item.tags)) {
          if (activeTab === 'coaching_exercises') {
            // For exercises: Tags contain [Category, ...MuscleGroups]
            item.tags.slice(1).forEach((tag: string) => uniqueMuscleGroups.add(tag));
          } else if (activeTab === 'coaching_drills') {
            // For drills: Tags contain [Position, Skill, ...]
            if (item.tags[0]) uniquePositions.add(item.tags[0]);
            if (item.tags[1]) uniqueSkills.add(item.tags[1]);
          }
        }
      });
      
      setCategories(Array.from(uniqueCategories).sort());
      setMuscleGroups(Array.from(uniqueMuscleGroups).sort());
      setPositions(Array.from(uniquePositions).sort());
      setSkills(Array.from(uniqueSkills).sort());
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(activeTab)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters based on table type
      if (activeTab === 'coaching_exercises') {
        // Apply category filter
        if (selectedCategory !== 'all') {
          query = query.eq('category', selectedCategory);
        }
        // Apply muscle group filter
        if (selectedMuscleGroup !== 'all') {
          query = query.contains('tags', [selectedMuscleGroup]);
        }
      } else if (activeTab === 'coaching_drills') {
        // Apply position filter
        if (selectedPosition !== 'all') {
          query = query.contains('tags', [selectedPosition]);
        }
        // Apply skill filter
        if (selectedSkill !== 'all') {
          query = query.contains('tags', [selectedSkill]);
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setItems(data || []);
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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

  const handleImportExercises = async () => {
    if (!confirm('This will clear all existing exercises and import 848 new ones from the CSV. Continue?')) {
      return;
    }
    
    setIsImporting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-exercises-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Exercises imported successfully!');
        fetchItems();
        fetchCategories();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to import exercises: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Coaching Database</h2>
        {activeTab === 'coaching_exercises' && (
          <Button
            onClick={handleImportExercises}
            disabled={isImporting}
            variant="outline"
          >
            {isImporting ? 'Importing...' : 'Import 848 Exercises from CSV'}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableType)}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
          {Object.entries(tableConfigs).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
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
                    Add {config.singular}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? `Edit ${config.singular}` : `Add ${config.singular}`}
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
                              value={formData.reps}
                              onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
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

            {/* Filters - Show based on table type */}
            {(activeTab === 'coaching_exercises' || activeTab === 'coaching_drills') && (
              <div className="flex flex-wrap gap-2 md:gap-4 mb-4">
                {activeTab === 'coaching_exercises' && (
                  <>
                    <div className="w-full md:w-48">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full md:w-48">
                      <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Muscle Groups" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">All Muscle Groups</SelectItem>
                          {muscleGroups.map((mg) => (
                            <SelectItem key={mg} value={mg}>{mg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {activeTab === 'coaching_drills' && (
                  <>
                    <div className="w-full md:w-48">
                      <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Positions" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">All Positions</SelectItem>
                          {positions.map((pos) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full md:w-48">
                      <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Skills" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">All Skills</SelectItem>
                          {skills.map((skill) => (
                            <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {items.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      No {config.label.toLowerCase()} found. Click "Add {config.singular}" to create one.
                    </CardContent>
                  </Card>
                </div>
              ) : (
                items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium line-clamp-2 flex-1 pr-2">
                        {item.title}
                      </h3>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
