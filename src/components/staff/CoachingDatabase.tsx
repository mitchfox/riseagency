import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Database, Search, Calendar, Clock, Dumbbell, Brain, Target, BookOpen, Quote } from "lucide-react";
import { ExerciseDatabaseSelector } from "./ExerciseDatabaseSelector";


type TableType = 'coaching_sessions' | 'coaching_programmes' | 'coaching_drills' | 'coaching_exercises' | 'coaching_analysis' | 'psychological_sessions' | 'coaching_aphorisms';

interface Exercise {
  name: string;
  description: string;
  repetitions: string;
  sets: string;
  load: string;
  recoveryTime: string;
  videoUrl: string;
}

interface CoachingItem {
  id: string;
  title?: string;
  description?: string | null;
  content?: string | null;
  exercises?: Exercise[] | null;
  category?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  // Aphorism fields
  featured_text?: string;
  body_text?: string;
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
  video_url?: string | null;
  is_own_video?: boolean | null;
  author?: string | null;
}

const tableConfigs = {
  coaching_sessions: {
    label: 'Sessions',
    singular: 'Session',
    fields: ['title', 'description', 'exercises', 'duration', 'category'],
    icon: Calendar,
    color: 'blue',
  },
  coaching_programmes: {
    label: 'Programmes',
    singular: 'Programme',
    fields: ['title', 'description', 'content', 'weeks', 'category'],
    icon: BookOpen,
    color: 'purple',
  },
  coaching_drills: {
    label: 'Drills',
    singular: 'Drill',
    fields: ['title', 'description', 'content', 'setup', 'equipment', 'players_required', 'category'],
    icon: Target,
    color: 'green',
  },
  coaching_exercises: {
    label: 'Exercises',
    singular: 'Exercise',
    fields: ['title', 'description', 'content', 'sets', 'reps', 'rest_time', 'category'],
    icon: Dumbbell,
    color: 'orange',
  },
  coaching_analysis: {
    label: 'Analysis',
    singular: 'Analysis',
    fields: ['title', 'description', 'content', 'analysis_type', 'category'],
    icon: Database,
    color: 'cyan',
  },
  psychological_sessions: {
    label: 'Psychological Sessions',
    singular: 'Psychological Session',
    fields: ['title', 'description', 'content', 'duration', 'category'],
    icon: Brain,
    color: 'pink',
  },
  coaching_aphorisms: {
    label: 'Aphorisms',
    singular: 'Aphorism',
    fields: ['featured_text', 'body_text'],
    icon: Quote,
    color: 'amber',
  },
};

export const CoachingDatabase = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState<TableType>('coaching_sessions');
  const [items, setItems] = useState<CoachingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CoachingItem | null>(null);
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedExerciseTab, setSelectedExerciseTab] = useState<'pre' | 'session'>('pre');
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    content: '',
    exercises: { preSession: [] as Exercise[], session: [] as Exercise[] },
    category: '',
    load: '',
    video_url: '',
    is_own_video: false,
    featured_text: '',
    body_text: '',
    author: '',
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
    // Skip for aphorisms as they don't have category/tags
    if (activeTab === 'coaching_aphorisms') {
      return;
    }
    
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
      let query: any = supabase
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
      setItems((data || []) as any);
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const renderExerciseTable = (key: 'preSession' | 'session') => {
    const exercises = formData.exercises[key] || [];
    
    if (exercises.length === 0) {
      return (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No exercises added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Use the buttons above to add exercises.</p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left text-xs font-semibold w-20">Order</th>
              <th className="p-2 text-left text-xs font-semibold">Exercise Name</th>
              <th className="p-2 text-left text-xs font-semibold">Description</th>
              <th className="p-2 text-left text-xs font-semibold w-20">Reps</th>
              <th className="p-2 text-left text-xs font-semibold w-16">Sets</th>
              <th className="p-2 text-left text-xs font-semibold w-20">Load</th>
              <th className="p-2 text-left text-xs font-semibold w-24">Recovery</th>
              <th className="p-2 text-left text-xs font-semibold w-32">Video URL</th>
              <th className="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise: Exercise, idx: number) => (
              <tr key={idx} className="border-t hover:bg-muted/50">
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveExercise(idx, 'up')}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveExercise(idx, 'down')}
                      disabled={idx === exercises.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Exercise name"
                    value={exercise.name}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].name = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Description"
                    value={exercise.description}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].description = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Reps"
                    value={exercise.repetitions}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].repetitions = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Sets"
                    value={exercise.sets}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].sets = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Load"
                    value={exercise.load}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].load = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Recovery"
                    value={exercise.recoveryTime}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].recoveryTime = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Video URL"
                    value={exercise.videoUrl}
                    onChange={(e) => {
                      const newExercises = [...exercises];
                      newExercises[idx].videoUrl = e.target.value;
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                    className="text-sm"
                  />
                </td>
                <td className="p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newExercises = exercises.filter((_: any, i: number) => i !== idx);
                      setFormData({ ...formData, exercises: { ...formData.exercises, [key]: newExercises } });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const key = selectedExerciseTab === 'pre' ? 'preSession' : 'session';
    const exercises = [...(formData.exercises[key] || [])];
    
    if (direction === 'up' && index > 0) {
      [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
    } else if (direction === 'down' && index < exercises.length - 1) {
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
    }
    
    setFormData({ ...formData, exercises: { ...formData.exercises, [key]: exercises } });
  };

  const parsePastedExercises = () => {
    if (!pasteText.trim()) {
      toast.error("Please paste exercise data");
      return;
    }

    const lines = pasteText.trim().split('\n').filter(line => line.trim());
    const newExercises: Exercise[] = [];

    for (const line of lines) {
      const fields = line.split('\t').map(f => f.trim());
      
      if (fields.length < 4) {
        console.warn(`Skipping invalid line (needs at least 4 fields): ${line.substring(0, 50)}...`);
        continue;
      }

      const exercise: Exercise = {
        name: fields[0] || '',
        description: fields[1] || '',
        repetitions: fields[2] || '',
        sets: fields[3] || '',
        load: fields[4] || '',
        recoveryTime: fields[5] || '',
        videoUrl: fields[6] || '',
      };

      newExercises.push(exercise);
    }

    if (newExercises.length > 0) {
      const key = selectedExerciseTab === 'pre' ? 'preSession' : 'session';
      setFormData({
        ...formData,
        exercises: {
          ...formData.exercises,
          [key]: [...(formData.exercises[key] || []), ...newExercises]
        }
      });

      toast.success(`Added ${newExercises.length} exercise${newExercises.length > 1 ? 's' : ''}`);
      setShowPasteDialog(false);
      setPasteText("");
    } else {
      toast.error("No valid exercises found in pasted data");
    }
  };

  const addExerciseFromDatabase = (exercise: Exercise) => {
    const key = selectedExerciseTab === 'pre' ? 'preSession' : 'session';
    setFormData({
      ...formData,
      exercises: {
        ...formData.exercises,
        [key]: [...(formData.exercises[key] || []), exercise]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create a clean copy of formData with only the fields we need for each table type
      const dataToSubmit: any = {};
      
      if (activeTab === 'coaching_aphorisms') {
        // For aphorisms, only keep featured_text, body_text, and author
        dataToSubmit.featured_text = formData.featured_text;
        if (formData.body_text) dataToSubmit.body_text = formData.body_text;
        if (formData.author) dataToSubmit.author = formData.author;
      } else if (activeTab === 'coaching_sessions') {
        // For sessions, keep title, description, duration, category, exercises, tags, attachments
        dataToSubmit.title = formData.title;
        if (formData.description) dataToSubmit.description = formData.description;
        if (formData.duration) dataToSubmit.duration = formData.duration;
        if (formData.category) dataToSubmit.category = formData.category;
        if (formData.exercises) dataToSubmit.exercises = formData.exercises;
        if (formData.tags) dataToSubmit.tags = formData.tags;
        if (formData.attachments) dataToSubmit.attachments = formData.attachments;
      } else if (activeTab === 'coaching_exercises') {
        // For exercises, include all relevant fields
        dataToSubmit.title = formData.title;
        if (formData.description) dataToSubmit.description = formData.description;
        if (formData.content) dataToSubmit.content = formData.content;
        if (formData.category) dataToSubmit.category = formData.category;
        if (formData.sets) dataToSubmit.sets = formData.sets;
        if (formData.reps) dataToSubmit.reps = formData.reps;
        if (formData.rest_time) dataToSubmit.rest_time = formData.rest_time;
        if (formData.load) dataToSubmit.load = formData.load;
        if (formData.video_url) dataToSubmit.video_url = formData.video_url;
        if (formData.is_own_video !== undefined) dataToSubmit.is_own_video = formData.is_own_video;
        if (formData.tags) dataToSubmit.tags = formData.tags;
        if (formData.attachments) dataToSubmit.attachments = formData.attachments;
      } else {
        // For other tables, include all fields
        Object.assign(dataToSubmit, formData);
      }
      
      if (editingItem) {
        const { error } = await supabase
          .from(activeTab)
          .update(dataToSubmit)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from(activeTab)
          .insert(dataToSubmit);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      setFormData({
        title: '',
        description: '',
        content: '',
        exercises: { preSession: [], session: [] },
        category: '',
        load: '',
        video_url: '',
        is_own_video: false,
        featured_text: '',
        body_text: '',
        author: '',
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
    // Convert old format to new format if needed
    let exercisesData: any = item.exercises;
    if (Array.isArray(exercisesData)) {
      exercisesData = { preSession: [], session: exercisesData };
    } else if (!exercisesData) {
      exercisesData = { preSession: [], session: [] };
    } else if (!exercisesData.preSession) {
      // Ensure both keys exist
      exercisesData = { preSession: exercisesData.preSession || [], session: exercisesData.session || exercisesData || [] };
    }
    
    setFormData({
      title: item.title,
      description: item.description || '',
      content: item.content || '',
      exercises: exercisesData,
      category: item.category || '',
      duration: item.duration || '',
      weeks: item.weeks || '',
      setup: item.setup || '',
      equipment: item.equipment || '',
      players_required: item.players_required || '',
      sets: item.sets || '',
      reps: item.reps || '',
      rest_time: item.rest_time || '',
      load: (item as any).load || '',
      analysis_type: item.analysis_type || '',
      video_url: item.video_url || '',
      is_own_video: item.is_own_video || false,
      featured_text: item.featured_text || '',
      body_text: item.body_text || '',
      author: item.author || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      exercises: { preSession: [], session: [] },
      category: '',
      load: '',
      video_url: '',
      is_own_video: false,
      featured_text: '',
      body_text: '',
      author: '',
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
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableType)}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-1">
          {Object.entries(tableConfigs).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(tableConfigs).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-end gap-4">
              {!isAdmin && (
                <div className="text-sm text-muted-foreground">View Only</div>
              )}
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Add {config.singular}
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                      {editingItem ? `Edit ${config.singular}` : `Add ${config.singular}`}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    {key === 'coaching_aphorisms' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="featured_text">Featured Text *</Label>
                          <Textarea
                            id="featured_text"
                            value={formData.featured_text || ''}
                            onChange={(e) => setFormData({ ...formData, featured_text: e.target.value })}
                            required
                            rows={2}
                            placeholder="Short, impactful text (will be displayed in gold)"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="author">Author (Optional)</Label>
                          <Input
                            id="author"
                            value={formData.author || ''}
                            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            placeholder="e.g., Albert Einstein, Unknown, etc."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="body_text">Body Text (Optional)</Label>
                          <Textarea
                            id="body_text"
                            value={formData.body_text || ''}
                            onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                            rows={4}
                            placeholder="Main text content (will be displayed in white)"
                          />
                        </div>
                      </>
                    ) : (
                      <>
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

                        {key === 'coaching_sessions' ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g., Strength, Speed, Technical"
                              />
                            </div>
                            
                            <Tabs value={selectedExerciseTab} onValueChange={(v) => setSelectedExerciseTab(v as 'pre' | 'session')}>
                              <div className="flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-4">
                                  <Label className="text-lg font-semibold">Session Exercises</Label>
                                  <TabsList>
                                    <TabsTrigger value="pre">Pre-Session</TabsTrigger>
                                    <TabsTrigger value="session">Session</TabsTrigger>
                                  </TabsList>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsExerciseSelectorOpen(true)}
                                  >
                                    <Database className="w-4 h-4 mr-2" />
                                    From Database
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowPasteDialog(true)}
                                  >
                                    📋 Paste Exercises
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      const key = selectedExerciseTab === 'pre' ? 'preSession' : 'session';
                                      setFormData({
                                        ...formData,
                                        exercises: {
                                          ...formData.exercises,
                                          [key]: [
                                            ...(formData.exercises[key] || []),
                                            { name: '', description: '', repetitions: '', sets: '', load: '', recoveryTime: '', videoUrl: '' }
                                          ]
                                        }
                                      });
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Manual
                                  </Button>
                                </div>
                              </div>

                              <TabsContent value="pre" className="mt-4">
                                {renderExerciseTable('preSession')}
                              </TabsContent>

                              <TabsContent value="session" className="mt-4">
                                {renderExerciseTable('session')}
                              </TabsContent>
                            </Tabs>
                          </div>
                        ) : key !== 'coaching_exercises' && (
                          <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                              id="content"
                              value={formData.content}
                              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                              rows={8}
                            />
                          </div>
                        )}

                        {key !== 'coaching_sessions' && (
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                              id="category"
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                          </div>
                        )}
                      </>
                    )}

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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reps">Reps</Label>
                            <Input
                              id="reps"
                              value={formData.reps}
                              onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                            />
                          </div>
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
                            <Label htmlFor="load">Load (kg)</Label>
                            <Input
                              id="load"
                              value={formData.load}
                              onChange={(e) => setFormData({ ...formData, load: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rest_time">Recovery Time (seconds)</Label>
                            <Input
                              id="rest_time"
                              type="number"
                              value={formData.rest_time}
                              onChange={(e) => setFormData({ ...formData, rest_time: parseInt(e.target.value) || null })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="video_url">Video URL</Label>
                          <Input
                            id="video_url"
                            value={formData.video_url}
                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                            placeholder="https://... or upload a video below"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="video_file">Or Upload Video</Label>
                          <Input
                            id="video_file"
                            type="file"
                            accept="video/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const fileName = `exercise-videos/${Date.now()}-${file.name}`;
                                  const { data, error } = await supabase.storage
                                    .from('analysis-files')
                                    .upload(fileName, file);
                                  
                                  if (error) throw error;
                                  
                                  const { data: urlData } = supabase.storage
                                    .from('analysis-files')
                                    .getPublicUrl(fileName);
                                  
                                  setFormData({ ...formData, video_url: urlData.publicUrl, is_own_video: true });
                                  toast.success('Video uploaded successfully');
                                } catch (error: any) {
                                  toast.error('Failed to upload video: ' + error.message);
                                }
                              }
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_own_video"
                            checked={formData.is_own_video || false}
                            onChange={(e) => setFormData({ ...formData, is_own_video: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="is_own_video" className="cursor-pointer">
                            This is our own video
                          </Label>
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

                    <div className="flex justify-between gap-2">
                      {editingItem && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            handleDelete(editingItem.id);
                            setIsDialogOpen(false);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </form>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>

            {/* Filters - Show based on table type */}
            {activeTab !== 'coaching_aphorisms' && (
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${config.label.toLowerCase()}...`}
                    className="pl-9"
                  />
                </div>
                
                {activeTab === 'coaching_exercises' && (
                  <>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Muscle Groups" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All Muscle Groups</SelectItem>
                        {muscleGroups.map((mg) => (
                          <SelectItem key={mg} value={mg}>{mg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                
                {activeTab === 'coaching_drills' && (
                  <>
                    <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All Positions</SelectItem>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Skills" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All Skills</SelectItem>
                        {skills.map((skill) => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.length === 0 ? (
                <div className="col-span-full">
                  <Card className="border-dashed">
                    <CardContent className="pt-12 pb-12 text-center">
                      <config.icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                      <p className="text-muted-foreground mb-4">
                        No {config.label.toLowerCase()} found
                      </p>
                      <p className="text-sm text-muted-foreground/60">
                        Click "Add {config.singular}" above to create your first one
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                items.map((item) => {
                  const colorClass = {
                    'blue': 'border-l-blue-500',
                    'purple': 'border-l-purple-500',
                    'green': 'border-l-green-500',
                    'orange': 'border-l-orange-500',
                    'cyan': 'border-l-cyan-500',
                    'pink': 'border-l-pink-500',
                    'amber': 'border-l-amber-500',
                  }[config.color] || 'border-l-primary';
                  
                  const bgClass = {
                    'blue': 'bg-blue-500/10',
                    'purple': 'bg-purple-500/10',
                    'green': 'bg-green-500/10',
                    'orange': 'bg-orange-500/10',
                    'cyan': 'bg-cyan-500/10',
                    'pink': 'bg-pink-500/10',
                    'amber': 'bg-amber-500/10',
                  }[config.color] || 'bg-primary/10';
                  
                  const iconColorClass = {
                    'blue': 'text-blue-600',
                    'purple': 'text-purple-600',
                    'green': 'text-green-600',
                    'orange': 'text-orange-600',
                    'cyan': 'text-cyan-600',
                    'pink': 'text-pink-600',
                    'amber': 'text-amber-600',
                  }[config.color] || 'text-primary';

                  return (
                    <Card 
                      key={item.id} 
                      className={`group hover:shadow-lg transition-all duration-200 overflow-hidden border-l-4 ${colorClass}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${bgClass} flex-shrink-0`}>
                              <config.icon className={`w-5 h-5 ${iconColorClass}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base line-clamp-2 mb-1">
                                {activeTab === 'coaching_aphorisms' ? item.featured_text : item.title}
                              </CardTitle>
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {activeTab === 'coaching_aphorisms' ? (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {item.body_text}
                          </p>
                        ) : (
                          <>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                {item.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {item.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.duration} min
                                </div>
                              )}
                              {item.weeks && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {item.weeks} weeks
                                </div>
                              )}
                              {item.sets && (
                                <div className="flex items-center gap-1">
                                  <Dumbbell className="w-3 h-3" />
                                  {item.sets} sets
                                </div>
                              )}
                              {item.players_required && (
                                <Badge variant="outline" className="text-xs">
                                  {item.players_required} players
                                </Badge>
                              )}
                              {item.analysis_type && (
                                <Badge variant="outline" className="text-xs">
                                  {item.analysis_type}
                                </Badge>
                              )}
                            </div>
                            {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {item.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{item.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
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

      <ExerciseDatabaseSelector
        isOpen={isExerciseSelectorOpen}
        onClose={() => setIsExerciseSelectorOpen(false)}
        onSelect={addExerciseFromDatabase}
      />

      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste Exercises</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste tab-separated exercise data. Each line should have fields in this order:<br/>
              <strong>Name → Description → Reps → Sets → Load → Recovery → Video URL</strong>
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your exercise data here..."
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowPasteDialog(false);
                setPasteText("");
              }}>
                Cancel
              </Button>
              <Button onClick={parsePastedExercises}>
                Import Exercises
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
