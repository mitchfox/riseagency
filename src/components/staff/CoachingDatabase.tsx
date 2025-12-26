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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Database, Search, Calendar, Clock, Dumbbell, Brain, Target, BookOpen, Quote, LineChart, Settings, Upload, Grid, List, SortAsc, FileText, Download, FolderPlus, Building2 } from "lucide-react";
import { ExerciseDatabaseSelector } from "./ExerciseDatabaseSelector";
import { R90RatingsManagement } from "./R90RatingsManagement";
import { TacticalSchemes } from "./TacticalSchemes";
import { SchemeEditor } from "./SchemeEditor";
import { PositionalGuides } from "./PositionalGuides";
import { ClubRatings } from "./ClubRatings";
import { MarkdownText } from "@/utils/markdownRenderer";
import { downloadFile } from "@/utils/openExternalUrl";


type TableType = 'coaching_sessions' | 'coaching_programmes' | 'coaching_drills' | 'coaching_exercises' | 'coaching_analysis' | 'coaching_concepts' | 'psychological_sessions' | 'coaching_aphorisms' | 'r90_ratings' | 'tactical_schemes' | 'performance_statistics' | 'scheme_view' | 'positional_guides' | 'club_ratings';

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
  subcategory?: string | null;
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
  score?: number | string | null;
  // Performance statistics fields
  stat_name?: string;
  stat_key?: string;
  positions?: string[];
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
  coaching_concepts: {
    label: 'Concepts',
    singular: 'Concept',
    fields: ['title', 'description', 'content', 'category'],
    icon: BookOpen,
    color: 'violet',
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
  r90_ratings: {
    label: 'R90 Ratings',
    singular: 'R90 Rating',
    fields: ['title', 'description', 'content', 'category'],
    icon: LineChart,
    color: 'indigo',
  },
  tactical_schemes: {
    label: 'Schemes',
    singular: 'Scheme',
    fields: [],
    icon: Settings,
    color: 'emerald',
  },
  performance_statistics: {
    label: 'Statistics',
    singular: 'Statistic',
    fields: ['stat_name', 'stat_key', 'positions', 'description'],
    icon: LineChart,
    color: 'rose',
  },
  scheme_view: {
    label: 'Scheme View',
    singular: 'Scheme',
    fields: [],
    icon: Target,
    color: 'indigo',
  },
  positional_guides: {
    label: 'Positional Guides',
    singular: 'Guide',
    fields: [],
    icon: Target,
    color: 'teal',
  },
  club_ratings: {
    label: 'Club Ratings',
    singular: 'Club Rating',
    fields: [],
    icon: Building2,
    color: 'slate',
  },
};

const getScoreColor = (score: number | string | null) => {
  if (score === null || score === undefined) return 'bg-muted text-muted-foreground';
  
  // Check if it's a text value (not a number)
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  if (isNaN(numScore)) return 'bg-[hsl(var(--gold))] text-background';
  
  // Positive scores
  if (numScore >= 0.1) return 'bg-green-600 text-white font-bold';
  if (numScore > 0.01) return 'bg-green-500 text-white';
  if (numScore > 0) return 'bg-green-400 text-white';
  
  // Negative scores
  if (numScore <= -0.1) return 'bg-red-600 text-white font-bold';
  if (numScore < -0.01) return 'bg-red-500 text-white';
  if (numScore < 0) return 'bg-red-400 text-white';
  
  // Exactly 0
  return 'bg-muted text-muted-foreground';
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
    subcategory: '',
    load: '',
    video_url: '',
    is_own_video: false,
    featured_text: '',
    body_text: '',
    author: '',
    stat_name: '',
    stat_key: '',
    positions: [] as string[],
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
  const [isR90ManagementOpen, setIsR90ManagementOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { status: 'uploading' | 'processing' | 'success' | 'error', progress: number, added?: number, error?: string }>>({});
  const [analysisViewMode, setAnalysisViewMode] = useState<'grid' | 'list'>('grid');
  const [analysisSortAlpha, setAnalysisSortAlpha] = useState(false);
  const [analysisCategories, setAnalysisCategories] = useState<string[]>([]);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showManageCategoriesDialog, setShowManageCategoriesDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  // Refetch when analysis sort changes
  useEffect(() => {
    if (activeTab === 'coaching_analysis') {
      fetchItems();
    }
  }, [analysisSortAlpha]);

  const fetchCategories = async () => {
    // Skip for aphorisms, tactical schemes, performance statistics, scheme view, positional guides, and club ratings as they don't have category/tags
    if (activeTab === 'coaching_aphorisms' || activeTab === 'tactical_schemes' || activeTab === 'performance_statistics' || activeTab === 'scheme_view' || activeTab === 'positional_guides' || activeTab === 'club_ratings') {
      return;
    }
    
    // For R90 ratings, use predefined categories
    if (activeTab === 'r90_ratings') {
      setCategories([
        'Pressing',
        'Defensive',
        'Aerial Duels',
        'Attacking Crosses',
        'On-Ball Decision-Making',
        'Off-Ball Movement'
      ]);
      return;
    }
    
    try {
      // Map coaching_concepts to coaching_analysis table
      const tableName = activeTab === 'coaching_concepts' ? 'coaching_analysis' : activeTab;
      
      const { data, error } = await supabase
        .from(tableName as any)
        .select('category, tags');

      if (error) throw error;
      
      const uniqueCategories = new Set<string>();
      const uniqueMuscleGroups = new Set<string>();
      const uniquePositions = new Set<string>();
      const uniqueSkills = new Set<string>();
      
      (data as any[])?.forEach(item => {
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
      
      // Also set analysis categories if on analysis tab
      if (activeTab === 'coaching_analysis') {
        setAnalysisCategories(Array.from(uniqueCategories).sort());
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    // Skip fetching for tabs that don't use the database list view
    if (activeTab === 'scheme_view' || activeTab === 'tactical_schemes' || activeTab === 'positional_guides' || activeTab === 'club_ratings') {
      setItems([]);
      setTotalItems(0);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Map coaching_concepts to coaching_analysis table
      const tableName = activeTab === 'coaching_concepts' ? 'coaching_analysis' : activeTab;
      
      // Determine sort order
      const sortColumn = (activeTab === 'coaching_analysis' && analysisSortAlpha) ? 'title' : 'created_at';
      const sortAscending = (activeTab === 'coaching_analysis' && analysisSortAlpha) ? true : false;
      
      let query: any = supabase
        .from(tableName as any)
        .select('*', { count: 'exact' })
        .order(sortColumn, { ascending: sortAscending });

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
      } else if (activeTab === 'r90_ratings') {
        // Apply category filter for R90 ratings
        if (selectedCategory !== 'all') {
          query = query.eq('category', selectedCategory);
        }
      } else if (activeTab === 'coaching_analysis') {
        // Analysis tab shows non-concept items
        query = query.or('analysis_type.is.null,analysis_type.neq.concept');
        // Apply category filter for analysis
        if (selectedCategory !== 'all') {
          query = query.eq('category', selectedCategory);
        }
      } else if (activeTab === 'coaching_concepts') {
        // Concepts tab shows only concept items
        query = query.eq('analysis_type', 'concept');
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
      // Map coaching_concepts to coaching_analysis table
      const tableName = activeTab === 'coaching_concepts' ? 'coaching_analysis' : activeTab;
      
      // Create a clean copy of formData with only the fields we need for each table type
      const dataToSubmit: any = {};
      
      if (activeTab === 'coaching_aphorisms') {
        // For aphorisms, only keep featured_text, body_text, and author
        dataToSubmit.featured_text = formData.featured_text;
        if (formData.body_text) dataToSubmit.body_text = formData.body_text;
        if (formData.author) dataToSubmit.author = formData.author;
      } else if (activeTab === 'performance_statistics') {
        // For performance statistics
        dataToSubmit.stat_name = formData.stat_name;
        dataToSubmit.stat_key = formData.stat_key;
        dataToSubmit.positions = formData.positions || [];
        if (formData.description) dataToSubmit.description = formData.description;
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
      } else if (activeTab === 'coaching_analysis') {
        // For analysis, only include valid fields
        dataToSubmit.title = formData.title;
        if (formData.description) dataToSubmit.description = formData.description;
        if (formData.content) dataToSubmit.content = formData.content;
        if (formData.category) dataToSubmit.category = formData.category;
        if (formData.analysis_type) dataToSubmit.analysis_type = formData.analysis_type;
      } else if (activeTab === 'coaching_concepts') {
        // For concepts, set analysis_type to 'concept'
        dataToSubmit.title = formData.title;
        if (formData.description) dataToSubmit.description = formData.description;
        if (formData.content) dataToSubmit.content = formData.content;
        if (formData.category) dataToSubmit.category = formData.category;
        dataToSubmit.analysis_type = 'concept';
      } else {
        // For other tables, include all fields
        Object.assign(dataToSubmit, formData);
      }
      
      if (editingItem) {
        const { error } = await supabase
          .from(tableName as any)
          .update(dataToSubmit)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        const { error } = await supabase
          .from(tableName as any)
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
        subcategory: '',
        load: '',
        video_url: '',
        is_own_video: false,
        featured_text: '',
        body_text: '',
        author: '',
        stat_name: '',
        stat_key: '',
        positions: [],
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
      // Map coaching_concepts to coaching_analysis table
      const tableName = activeTab === 'coaching_concepts' ? 'coaching_analysis' : activeTab;
      
      const { error } = await supabase
        .from(tableName as any)
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

  const handleEdit = async (item: CoachingItem) => {
    setEditingItem(item);
    
    // Load analysis categories if editing an analysis item
    if (activeTab === 'coaching_analysis' && analysisCategories.length === 0) {
      try {
        const { data } = await supabase
          .from('coaching_analysis')
          .select('category');
        
        if (data) {
          const uniqueCats = new Set<string>();
          data.forEach((d: any) => {
            if (d.category) uniqueCats.add(d.category);
          });
          setAnalysisCategories(Array.from(uniqueCats).sort());
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    }
    
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
      subcategory: (item as any).subcategory || '',
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
      stat_name: item.stat_name || '',
      stat_key: item.stat_key || '',
      positions: item.positions || [],
    });
    setIsDialogOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Initialize progress for all files
    const initialProgress: Record<string, any> = {};
    fileArray.forEach(file => {
      initialProgress[file.name] = { status: 'uploading', progress: 0 };
    });
    setUploadProgress(initialProgress);

    // Process all files in parallel
    const uploadPromises = fileArray.map(async (file) => {
      try {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 50 }
        }));

        // Upload PDF to storage
        const fileName = `analysis-pdfs/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('analysis-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(fileName);

        // Create database entry
        const { error: dbError } = await supabase.from('coaching_analysis').insert({
          title: file.name.replace('.pdf', ''),
          description: null,
          content: urlData.publicUrl,
          category: 'Uncategorized',
        });

        if (dbError) throw dbError;

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'success', progress: 100 }
        }));

        toast.success(`Successfully uploaded ${file.name}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
        }));
        toast.error(`Failed to upload ${file.name}`);
      }
    });

    await Promise.all(uploadPromises);
    
    // Clear progress after 2 seconds
    setTimeout(() => {
      setUploadProgress({});
    }, 2000);
    
    e.target.value = ''; // Reset input
    fetchItems(); // Refresh the list
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      exercises: { preSession: [], session: [] },
      category: '',
      subcategory: '',
      load: '',
      video_url: '',
      is_own_video: false,
      featured_text: '',
      body_text: '',
      author: '',
      stat_name: '',
      stat_key: '',
      positions: [] as string[],
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableType)} className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
            {Object.entries(tableConfigs).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key} 
                  className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:shadow-md rounded-lg"
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {Object.entries(tableConfigs).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            {key === 'tactical_schemes' ? (
              <TacticalSchemes isAdmin={isAdmin} />
            ) : key === 'scheme_view' ? (
              <SchemeEditor />
            ) : key === 'positional_guides' ? (
              <PositionalGuides isAdmin={isAdmin} />
            ) : key === 'club_ratings' ? (
              <ClubRatings />
            ) : (
              <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-end gap-4">
              {!isAdmin && (
                <div className="text-sm text-muted-foreground">View Only</div>
              )}
              {isAdmin && (
                <>
                  {key === 'r90_ratings' ? (
                    <Button 
                      onClick={() => setIsR90ManagementOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Manage R90
                    </Button>
                  ) : key === 'coaching_analysis' ? (
                    <>
                      <Input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handlePdfUpload}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <Button 
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                        className="w-full sm:w-auto"
                        disabled={Object.keys(uploadProgress).length > 0}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {Object.keys(uploadProgress).length > 0 ? 'Uploading...' : 'Upload PDFs'}
                      </Button>
                      <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} variant="outline" className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    </>
                  ) : key === 'coaching_concepts' ? (
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Concept
                    </Button>
                  ) : (
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Add {config.singular}
                    </Button>
                  )}
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit' : 'Add'} {config.singular}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-1 -mx-6 px-6">
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                      {activeTab === 'coaching_aphorisms' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="featured_text">Featured Text *</Label>
                            <Input
                              id="featured_text"
                              value={formData.featured_text}
                              onChange={(e) => setFormData({ ...formData, featured_text: e.target.value })}
                              placeholder="Main quote or featured text"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="body_text">Body Text</Label>
                            <Textarea
                              id="body_text"
                              value={formData.body_text}
                              onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                              placeholder="Additional context or explanation"
                              rows={4}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="author">Author</Label>
                            <Input
                              id="author"
                              value={formData.author}
                              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                              placeholder="Author name (optional)"
                            />
                          </div>
                        </>
                       ) : activeTab === 'performance_statistics' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="stat_name">Statistic Name *</Label>
                            <Input
                              id="stat_name"
                              value={formData.stat_name}
                              onChange={(e) => setFormData({ ...formData, stat_name: e.target.value })}
                              placeholder="e.g., Shots on Target"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stat_key">JSON Key *</Label>
                            <Input
                              id="stat_key"
                              value={formData.stat_key}
                              onChange={(e) => setFormData({ ...formData, stat_key: e.target.value })}
                              placeholder="e.g., shots_on_target (no spaces, lowercase)"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Brief description of this statistic"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Positions</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {['GK', 'FB', 'CB', 'CDM', 'CM', 'CAM', 'W', 'CF'].map((position) => (
                                <label key={position} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.positions?.includes(position) || false}
                                    onChange={(e) => {
                                      const newPositions = e.target.checked
                                        ? [...(formData.positions || []), position]
                                        : (formData.positions || []).filter((p: string) => p !== position);
                                      setFormData({ ...formData, positions: newPositions });
                                    }}
                                    className="rounded border-input"
                                  />
                                  <span className="text-sm">{position}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : activeTab === 'coaching_analysis' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Analysis title"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description"
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. Match Analysis, Training, Tactical"
                                list="analysis-categories"
                              />
                              <datalist id="analysis-categories">
                                {analysisCategories.map((cat) => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="content">Content / PDF URL</Label>
                            <Textarea
                              id="content"
                              value={formData.content}
                              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                              placeholder="Content or PDF URL..."
                              rows={4}
                            />
                          </div>
                        </>
                      ) : activeTab === 'coaching_concepts' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Concept title"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description"
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Category (optional)"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                              id="content"
                              value={formData.content}
                              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                              placeholder="Full concept content..."
                              rows={4}
                            />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Form fields for other types not shown in this view
                        </p>
                      )}
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
                </>
              )}
            </div>

            {/* Filters - Show based on table type */}
            {activeTab !== 'coaching_aphorisms' && activeTab !== 'tactical_schemes' && (
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
                
                {activeTab === 'r90_ratings' && (
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {activeTab === 'coaching_analysis' && (
                  <>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All Categories</SelectItem>
                        {analysisCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowManageCategoriesDialog(true)}
                      title="Manage Categories"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant={analysisSortAlpha ? "default" : "outline"}
                      size="icon"
                      onClick={() => setAnalysisSortAlpha(!analysisSortAlpha)}
                      title={analysisSortAlpha ? "Sort by Date" : "Sort A-Z"}
                    >
                      <SortAsc className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex border rounded-md">
                      <Button 
                        variant={analysisViewMode === 'grid' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-r-none"
                        onClick={() => setAnalysisViewMode('grid')}
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={analysisViewMode === 'list' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-l-none"
                        onClick={() => setAnalysisViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PDF Upload Progress */}
            {key === 'coaching_analysis' && Object.keys(uploadProgress).length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Upload Progress</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setUploadProgress({})}
                  >
                    Clear
                  </Button>
                </div>
                {Object.entries(uploadProgress).map(([filename, status]) => (
                  <Card key={filename} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate flex-1">{filename}</span>
                        <Badge variant={
                          status.status === 'success' ? 'default' :
                          status.status === 'error' ? 'destructive' :
                          'secondary'
                        }>
                          {status.status === 'uploading' ? 'Uploading' :
                           status.status === 'success' ? 'Uploaded' :
                           'Failed'}
                        </Badge>
                      </div>
                      <Progress value={status.progress} className="h-2" />
                      {status.error && (
                        <p className="text-xs text-destructive mt-2">{status.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Items Grid/List */}
            {activeTab === 'coaching_analysis' && analysisViewMode === 'list' ? (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="pt-12 pb-12 text-center">
                      <config.icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                      <p className="text-muted-foreground mb-4">No analysis found</p>
                    </CardContent>
                  </Card>
                ) : (
                  items.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-cyan-500/10 flex-shrink-0">
                            {item.content?.includes('.pdf') ? (
                              <FileText className="w-5 h-5 text-cyan-600" />
                            ) : (
                              <Database className="w-5 h-5 text-cyan-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.title}</h4>
                            {item.description && !item.description.startsWith('Uploaded PDF:') && (
                              <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                            )}
                          </div>
                          {item.category && (
                            <Badge variant="secondary" className="flex-shrink-0">{item.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.content?.includes('http') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => downloadFile(item.content!, item.title + '.pdf')}
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
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
                    'indigo': 'border-l-indigo-500',
                    'emerald': 'border-l-emerald-500',
                    'rose': 'border-l-rose-500',
                  }[config.color] || 'border-l-primary';
                  
                  const bgClass = {
                    'blue': 'bg-blue-500/10',
                    'purple': 'bg-purple-500/10',
                    'green': 'bg-green-500/10',
                    'orange': 'bg-orange-500/10',
                    'cyan': 'bg-cyan-500/10',
                    'pink': 'bg-pink-500/10',
                    'amber': 'bg-amber-500/10',
                    'indigo': 'bg-indigo-500/10',
                    'emerald': 'bg-emerald-500/10',
                    'rose': 'bg-rose-500/10',
                  }[config.color] || 'bg-primary/10';
                  
                  const iconColorClass = {
                    'blue': 'text-blue-600',
                    'purple': 'text-purple-600',
                    'green': 'text-green-600',
                    'orange': 'text-orange-600',
                    'cyan': 'text-cyan-600',
                    'pink': 'text-pink-600',
                    'amber': 'text-amber-600',
                    'indigo': 'text-indigo-600',
                    'emerald': 'text-emerald-600',
                    'rose': 'text-rose-600',
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
                                {activeTab === 'coaching_aphorisms' 
                                  ? item.featured_text 
                                  : activeTab === 'performance_statistics'
                                  ? item.stat_name
                                  : item.title}
                              </CardTitle>
                              <div className="flex flex-wrap gap-2 items-center">
                                {activeTab === 'performance_statistics' && item.stat_key && (
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {item.stat_key}
                                  </Badge>
                                )}
                                {activeTab !== 'performance_statistics' && item.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.category}
                                  </Badge>
                                )}
                                {activeTab === 'r90_ratings' && item.subcategory && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.subcategory}
                                  </Badge>
                                )}
                                {activeTab === 'r90_ratings' && item.score !== null && item.score !== undefined && (
                                  <Badge className={`${getScoreColor(item.score)} text-xs font-mono px-2`}>
                                    {typeof item.score === 'number' || !isNaN(parseFloat(item.score.toString())) 
                                      ? parseFloat(item.score.toString()).toFixed(4) 
                                      : item.score}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {activeTab === 'coaching_analysis' && item.content?.includes('http') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => downloadFile(item.content!, item.title + '.pdf')}
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {activeTab === 'coaching_aphorisms' ? (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            <MarkdownText text={item.body_text || ''} />
                          </p>
                        ) : activeTab === 'performance_statistics' ? (
                          <>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                <MarkdownText text={item.description} />
                              </p>
                            )}
                            {item.positions && item.positions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.positions.map((position) => (
                                  <Badge key={position} variant="outline" className="text-xs">
                                    {position}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {item.description && !item.description.startsWith('Uploaded PDF:') && (
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                <MarkdownText text={item.description} />
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
            )}
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
              </>
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

      <R90RatingsManagement
        open={isR90ManagementOpen}
        onOpenChange={setIsR90ManagementOpen}
      />

      {/* Manage Categories Dialog */}
      <Dialog open={showManageCategoriesDialog} onOpenChange={setShowManageCategoriesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add new category */}
            <div className="space-y-2">
              <Label htmlFor="new-category">Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      e.preventDefault();
                      setAnalysisCategories(prev => [...prev, newCategoryName.trim()].sort());
                      toast.success(`Category "${newCategoryName.trim()}" added`);
                      setNewCategoryName('');
                    }
                  }}
                />
                <Button onClick={() => {
                  if (newCategoryName.trim()) {
                    setAnalysisCategories(prev => [...prev, newCategoryName.trim()].sort());
                    toast.success(`Category "${newCategoryName.trim()}" added`);
                    setNewCategoryName('');
                  }
                }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Existing categories */}
            <div className="space-y-2">
              <Label>Existing Categories</Label>
              <ScrollArea className="h-[250px] border rounded-md p-2">
                {analysisCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
                ) : (
                  <div className="space-y-2">
                    {analysisCategories.map((category) => (
                      <div key={category} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted">
                        <span className="text-sm">{category}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm(`Delete category "${category}"? Items with this category will be set to Uncategorized.`)) return;
                            
                            try {
                              // Update all items with this category to 'Uncategorized'
                              const { error } = await supabase
                                .from('coaching_analysis')
                                .update({ category: 'Uncategorized' })
                                .eq('category', category);
                              
                              if (error) throw error;
                              
                              setAnalysisCategories(prev => prev.filter(c => c !== category));
                              toast.success(`Category "${category}" deleted`);
                              fetchItems();
                            } catch (error) {
                              console.error('Error deleting category:', error);
                              toast.error('Failed to delete category');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => {
                setShowManageCategoriesDialog(false);
                setNewCategoryName('');
              }}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
