import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Save, X, ChevronDown, Trash2 } from "lucide-react";

interface R90Rating {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string | null;
  subcategory: string | null;
  score: number | null;
  created_at: string;
}

interface R90RatingsManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const R90_CATEGORIES = [
  'Pressing',
  'Defensive',
  'Aerial Duels',
  'Attacking Crosses',
  'On-Ball Decision-Making',
  'Off-Ball Movement'
];

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  'Pressing': ['High Press', 'Mid Block', 'Low Block'],
  'Defensive': ['1v1 Defending', 'Positioning', 'Tackling'],
  'Aerial Duels': ['Attacking Headers', 'Defensive Headers'],
  'Attacking Crosses': ['Ground Delivery', 'Aerial Delivery', 'Second Balls'],
  'On-Ball Decision-Making': ['Under Pressure', 'In Space'],
  'Off-Ball Movement': ['Attacking Runs', 'Defensive Positioning']
};

export const R90RatingsManagement = ({ open, onOpenChange }: R90RatingsManagementProps) => {
  const [ratings, setRatings] = useState<R90Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [isSplitting, setIsSplitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    subcategory: '',
    score: ''
  });

  useEffect(() => {
    if (open) {
      fetchRatings();
    }
  }, [open]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('r90_ratings')
        .select('*')
        .order('category', { ascending: true })
        .order('subcategory', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error('Error fetching R90 ratings:', error);
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const groupedRatings = () => {
    const grouped: Record<string, Record<string, R90Rating[]>> = {};
    
    ratings.forEach(rating => {
      const category = rating.category || 'Uncategorized';
      const subcategory = rating.subcategory || 'General';
      
      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][subcategory]) {
        grouped[category][subcategory] = [];
      }
      grouped[category][subcategory].push(rating);
    });
    
    return grouped;
  };

  const handleEdit = (rating: R90Rating) => {
    setEditingId(rating.id);
    setFormData({
      title: rating.title,
      description: rating.description || '',
      content: rating.content || '',
      category: rating.category || '',
      subcategory: rating.subcategory || '',
      score: rating.score?.toString() || ''
    });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      content: '',
      category: '',
      subcategory: '',
      score: ''
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.category) {
      toast.error('Title and Category are required');
      return;
    }

    try {
      const scoreValue = formData.score ? parseFloat(formData.score) : null;
      
      if (isAddingNew) {
        const { error } = await supabase
          .from('r90_ratings')
          .insert([{
            title: formData.title,
            description: formData.description || null,
            content: formData.content || null,
            category: formData.category,
            subcategory: formData.subcategory || null,
            score: scoreValue
          }]);

        if (error) throw error;
        toast.success('Rating added successfully');
      } else if (editingId) {
        const { error } = await supabase
          .from('r90_ratings')
          .update({
            title: formData.title,
            description: formData.description || null,
            content: formData.content || null,
            category: formData.category,
            subcategory: formData.subcategory || null,
            score: scoreValue
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Rating updated successfully');
      }

      setEditingId(null);
      setIsAddingNew(false);
      fetchRatings();
    } catch (error: any) {
      console.error('Error saving rating:', error);
      toast.error('Failed to save rating: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rating?')) return;

    try {
      const { error } = await supabase
        .from('r90_ratings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Rating deleted successfully');
      fetchRatings();
    } catch (error: any) {
      console.error('Error deleting rating:', error);
      toast.error('Failed to delete rating: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setFormData({
      title: '',
      description: '',
      content: '',
      category: '',
      subcategory: '',
      score: ''
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'bg-muted text-muted-foreground';
    if (score <= 0.025) return 'bg-red-500 text-white';
    if (score <= 0.050) return 'bg-orange-500 text-white';
    if (score <= 0.075) return 'bg-yellow-500 text-black';
    if (score <= 0.100) return 'bg-lime-500 text-black';
    return 'bg-green-500 text-white';
  };

  const handleSplitBundledRatings = async () => {
    if (!confirm('This will split all bundled R90 ratings (with multiple scores in content) into separate entries. This cannot be undone. Continue?')) {
      return;
    }

    setIsSplitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('split-r90-ratings');
      
      if (error) throw error;
      
      toast.success(`Successfully split ratings: ${data.bundledRatingsProcessed} bundled → ${data.newRatingsCreated} individual ratings`);
      fetchRatings();
    } catch (error: any) {
      console.error('Error splitting ratings:', error);
      toast.error('Failed to split ratings: ' + error.message);
    } finally {
      setIsSplitting(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubcategories(newExpanded);
  };

  const grouped = groupedRatings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Manage R90 Ratings</DialogTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleSplitBundledRatings} 
                variant="outline" 
                size="sm"
                disabled={isSplitting}
              >
                {isSplitting ? 'Splitting...' : 'Split Bundled Ratings'}
              </Button>
              <Button onClick={handleAddNew} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add New Rating
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex gap-4">
          {/* List View */}
          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(grouped).map(([category, subcategories]) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.has(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedCategories.has(category) ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                        <span className="font-semibold">{category}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {Object.values(subcategories).reduce((sum, ratings) => sum + ratings.length, 0)}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2">
                        {Object.entries(subcategories).map(([subcategory, subRatings]) => {
                          const key = `${category}-${subcategory}`;
                          return (
                            <Collapsible
                              key={key}
                              open={expandedSubcategories.has(key)}
                              onOpenChange={() => toggleSubcategory(key)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-2 p-2 bg-background border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform ${
                                      expandedSubcategories.has(key) ? 'rotate-0' : '-rotate-90'
                                    }`}
                                  />
                                  <span className="font-medium text-sm">{subcategory}</span>
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    {subRatings.length}
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-5 mt-1 space-y-1">
                                  {subRatings.map((rating) => (
                                    <div
                                      key={rating.id}
                                      className={`p-2 rounded border cursor-pointer transition-colors ${
                                        editingId === rating.id
                                          ? 'bg-primary/10 border-primary'
                                          : 'hover:bg-muted/50'
                                      }`}
                                      onClick={() => handleEdit(rating)}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="font-medium text-sm line-clamp-1 flex-1">
                                              {rating.title}
                                            </div>
                                            {rating.score !== null && rating.score !== undefined && (
                                              <Badge 
                                                className={`${getScoreColor(rating.score)} text-xs font-mono px-2 shrink-0`}
                                              >
                                                {rating.score.toFixed(4)}
                                              </Badge>
                                            )}
                                          </div>
                                          {rating.description && (
                                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                              {rating.description}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEdit(rating);
                                            }}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(rating.id);
                                            }}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Edit Form */}
          {(editingId || isAddingNew) && (
            <div className="w-96 border-l pl-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      {isAddingNew ? 'Add New Rating' : 'Edit Rating'}
                    </h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Pass Under Pressure"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {R90_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category && SUBCATEGORY_OPTIONS[formData.category] && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <Select
                        value={formData.subcategory}
                        onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBCATEGORY_OPTIONS[formData.category].map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="score">R90 Score</Label>
                    <Input
                      id="score"
                      type="number"
                      step="0.0001"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="e.g., 0.0025"
                    />
                    <p className="text-xs text-muted-foreground">
                      Scale: 0-0.025 (Poor), 0.026-0.050 (Below Avg), 0.051-0.075 (Average), 0.076-0.100 (Good), 0.101+ (Excellent)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Brief description of this rating criterion"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Detailed Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={8}
                      placeholder="Detailed explanation, scoring guidelines, examples, etc."
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
