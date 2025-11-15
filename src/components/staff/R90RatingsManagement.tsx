import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Save, X, ChevronDown, Trash2, Sparkles } from "lucide-react";

interface R90Rating {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string | null;
  subcategory: string | null;
  score: string | null; // Changed to support text values like "xG"
  created_at: string;
}

interface R90RatingsManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const R90RatingsManagement = ({ open, onOpenChange }: R90RatingsManagementProps) => {
  const [ratings, setRatings] = useState<R90Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [isSplitting, setIsSplitting] = useState(false);
  
  // Dynamic categories and subcategories from database
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Record<string, string[]>>({});
  
  // Action type mapping state
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  
  type ActionMapping = { 
    id: string;
    category: string;
    subcategory?: string;
    selected_rating_ids?: string[];
  };
  
  const [actionMappings, setActionMappings] = useState<Record<string, ActionMapping[]>>({});
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [addingMappingFor, setAddingMappingFor] = useState<string | null>(null);
  const [newMappingCategory, setNewMappingCategory] = useState('');
  const [newMappingSubcategory, setNewMappingSubcategory] = useState('');
  const [availableRatings, setAvailableRatings] = useState<Array<{ id: string, title: string, score: string | null }>>([]);
  const [selectedRatingIds, setSelectedRatingIds] = useState<string[]>([]);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  
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
      fetchCategoriesAndSubcategories();
      fetchRatings();
      fetchActionTypesAndMappings();
    }
  }, [open]);

  const fetchCategoriesAndSubcategories = async () => {
    try {
      // Fetch all unique categories
      const { data: categoryData, error: catError } = await supabase
        .from('r90_ratings')
        .select('category')
        .not('category', 'is', null)
        .order('category');

      if (catError) throw catError;

      const allCategories = [...new Set(categoryData?.map(r => r.category).filter(Boolean) || [])];
      
      // Sort categories: Defensive first, then Offensive
      const defensiveCategories = allCategories.filter(cat => 
        cat.toLowerCase().includes('defensive') || cat.toLowerCase().includes('defence')
      ).sort();
      const offensiveCategories = allCategories.filter(cat => 
        cat.toLowerCase().includes('offensive') || cat.toLowerCase().includes('attack')
      ).sort();
      const otherCategories = allCategories.filter(cat => 
        !defensiveCategories.includes(cat) && !offensiveCategories.includes(cat)
      ).sort();
      
      const uniqueCategories = [...defensiveCategories, ...offensiveCategories, ...otherCategories];
      setCategories(uniqueCategories);

      // Fetch subcategories for each category
      const subcatMap: Record<string, string[]> = {};
      for (const category of uniqueCategories) {
        const { data: subcatData, error: subcatError } = await supabase
          .from('r90_ratings')
          .select('subcategory')
          .eq('category', category)
          .not('subcategory', 'is', null)
          .order('subcategory');

        if (subcatError) throw subcatError;

        const uniqueSubcats = [...new Set(subcatData?.map(r => r.subcategory).filter(Boolean) || [])].sort();
        if (uniqueSubcats.length > 0) {
          subcatMap[category] = uniqueSubcats;
        }
      }
      setSubcategoryOptions(subcatMap);
    } catch (error) {
      console.error('Error fetching categories and subcategories:', error);
      toast.error('Failed to load categories');
    }
  };

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

  const fetchActionTypesAndMappings = async () => {
    setLoadingMappings(true);
    try {
      // Fetch all unique action types from performance_report_actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('performance_report_actions')
        .select('action_type')
        .not('action_type', 'is', null);

      if (actionsError) throw actionsError;

      // Get unique action types
      const uniqueTypes = [...new Set(actionsData?.map(a => a.action_type) || [])].sort();
      setActionTypes(uniqueTypes);

      // Fetch existing mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('action_r90_category_mappings')
        .select('*');

      if (mappingsError) throw mappingsError;

      // Create a map of action_type -> array of mappings
      const mappingsMap: Record<string, ActionMapping[]> = {};
      mappingsData?.forEach(m => {
        if (!mappingsMap[m.action_type]) {
          mappingsMap[m.action_type] = [];
        }
        mappingsMap[m.action_type].push({ 
          id: m.id,
          category: m.r90_category,
          subcategory: m.r90_subcategory || undefined,
          selected_rating_ids: m.selected_rating_ids || undefined
        });
      });
      setActionMappings(mappingsMap);

    } catch (error) {
      console.error('Error fetching action types and mappings:', error);
      toast.error('Failed to load action type mappings');
    } finally {
      setLoadingMappings(false);
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
      // Keep score as text - can be numeric or text like "xG"
      const scoreValue = formData.score && formData.score.trim() !== '' ? formData.score.trim() : null;
      
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

  const getScoreColor = (score: string | null) => {
    if (!score) return 'bg-muted text-muted-foreground';
    
    // Check if it's a text value (non-numeric)
    const numericValue = parseFloat(score);
    if (isNaN(numericValue)) {
      // Text values like "xG" display in gold
      return 'bg-[hsl(var(--gold))] text-[hsl(var(--bg-dark))] font-semibold';
    }
    
    // Positive scores
    if (numericValue >= 0.1) return 'bg-green-600 text-white font-bold';
    if (numericValue > 0.01) return 'bg-green-500 text-white';
    if (numericValue > 0) return 'bg-green-400 text-white';
    
    // Negative scores
    if (numericValue <= -0.1) return 'bg-red-600 text-white font-bold';
    if (numericValue < -0.01) return 'bg-red-500 text-white';
    if (numericValue < 0) return 'bg-red-400 text-white';
    
    // Exactly 0
    return 'bg-muted text-muted-foreground';
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


  const fetchAvailableRatings = async (category: string, subcategory: string | null) => {
    try {
      let query = supabase
        .from('r90_ratings')
        .select('id, title, score')
        .eq('category', category)
        .not('score', 'is', null);

      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }

      const { data, error } = await query.order('title');

      if (error) throw error;

      setAvailableRatings(data || []);
    } catch (error) {
      console.error('Error fetching available ratings:', error);
      setAvailableRatings([]);
    }
  };

  const handleAddMapping = async (actionType: string) => {
    if (!newMappingCategory) {
      toast.error('Please select a category');
      return;
    }

    try {
      const subcategoryValue = newMappingSubcategory?.trim() ? newMappingSubcategory : null;
      
      // Determine which rating IDs to use
      let ratingIdsToUse = selectedRatingIds;
      
      // If no individual ratings selected, use all ratings in the subcategory (or category if no subcategory)
      if (selectedRatingIds.length === 0) {
        let query = supabase
          .from('r90_ratings')
          .select('id')
          .eq('category', newMappingCategory)
          .not('score', 'is', null);
        
        if (subcategoryValue) {
          query = query.eq('subcategory', subcategoryValue);
        }
        
        const { data: allRatings, error: ratingsError } = await query;
        
        if (ratingsError) throw ratingsError;
        
        if (!allRatings || allRatings.length === 0) {
          toast.error('No ratings found for this category/subcategory');
          return;
        }
        
        ratingIdsToUse = allRatings.map(r => r.id);
      }
      
      // Check if a mapping with same category/subcategory already exists
      let query = supabase
        .from('action_r90_category_mappings')
        .select('id')
        .eq('action_type', actionType)
        .eq('r90_category', newMappingCategory);
      
      if (subcategoryValue === null) {
        query = query.is('r90_subcategory', null);
      } else {
        query = query.eq('r90_subcategory', subcategoryValue);
      }
      
      const { data: existingMapping, error: checkError } = await query.maybeSingle();

      if (checkError) throw checkError;

      if (existingMapping) {
        toast.info('This mapping already exists - skipping', {
          description: `${actionType} → ${newMappingCategory}${subcategoryValue ? ' > ' + subcategoryValue : ''}`
        });
        // Reset form
        setNewMappingCategory('');
        setNewMappingSubcategory('');
        setSelectedRatingIds([]);
        return;
      }

      const { data, error } = await supabase
        .from('action_r90_category_mappings')
        .insert({
          action_type: actionType,
          r90_category: newMappingCategory,
          r90_subcategory: subcategoryValue,
          selected_rating_ids: ratingIdsToUse
        })
        .select()
        .single();

      if (error) throw error;

      setActionMappings(prev => ({
        ...prev,
        [actionType]: [
          ...(prev[actionType] || []),
          {
            id: data.id,
            category: newMappingCategory,
            subcategory: subcategoryValue || undefined,
            selected_rating_ids: ratingIdsToUse
          }
        ]
      }));
      
      setAddingMappingFor(null);
      setNewMappingCategory('');
      setNewMappingSubcategory('');
      setAvailableRatings([]);
      setSelectedRatingIds([]);
      toast.success('Mapping added');
    } catch (error: any) {
      console.error('Error adding mapping:', error);
      const errorMessage = error?.message || 'Failed to add mapping';
      toast.error(errorMessage);
    }
  };

  const handleDeleteMapping = async (actionType: string, mappingId: string) => {
    try {
      const { error } = await supabase
        .from('action_r90_category_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      setActionMappings(prev => ({
        ...prev,
        [actionType]: prev[actionType].filter(m => m.id !== mappingId)
      }));
      
      toast.success('Mapping removed');
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    try {
      // Get all unmapped action types
      const unmappedTypes = actionTypes.filter(type => !actionMappings[type] || actionMappings[type].length === 0);
      
      if (unmappedTypes.length === 0) {
        toast.info('All action types are already mapped');
        return;
      }

      toast.info(`Auto-mapping ${unmappedTypes.length} action types...`);

      const { data, error } = await supabase.functions.invoke('auto-map-action-categories', {
        body: {
          action_types: unmappedTypes,
          auto_apply: true
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Auto-mapping completed');
        // Refresh mappings
        await fetchActionTypesAndMappings();
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error auto-mapping:', error);
      toast.error(error.message || 'Failed to auto-map action types');
    } finally {
      setIsAutoMapping(false);
    }
  };

  const grouped = groupedRatings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage R90 Ratings & Action Mappings</DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={["ratings"]} className="flex-1 min-h-0">
          {/* R90 Ratings Management Section */}
          <AccordionItem value="ratings">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <span>R90 Ratings Management</span>
                <Badge variant="secondary">{ratings.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex items-center justify-end gap-2 mb-4">
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

              <div className="flex gap-4 h-[50vh]">
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
                                                {typeof rating.score === 'string' 
                                                  ? (isNaN(parseFloat(rating.score)) ? rating.score : Number(rating.score).toFixed(4))
                                                  : String(rating.score)}
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
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category && subcategoryOptions[formData.category] && subcategoryOptions[formData.category].length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <Select
                        value={formData.subcategory}
                        onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px] bg-card border-border z-[100]" position="popper" sideOffset={4}>
                          {subcategoryOptions[formData.category].map((sub) => (
                            <SelectItem key={sub} value={sub} className="cursor-pointer">
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
                      type="text"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="e.g., 0.0025 or xG"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a number or text (like "xG"). Text values display in gold.
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
            </AccordionContent>
          </AccordionItem>

          {/* Action Type Category Mappings Section */}
          <AccordionItem value="mappings">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <span>Action Type Category Assignments</span>
                <Badge variant="secondary">{actionTypes.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Assign action types to R90 categories to automatically suggest the right category when creating performance reports.
                  </p>
                  <Button
                    onClick={handleAutoMapAll}
                    disabled={isAutoMapping || loadingMappings}
                    size="sm"
                    className="ml-4 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isAutoMapping ? 'Auto-mapping...' : 'Auto-Map All'}
                  </Button>
                </div>
              </div>
          {loadingMappings ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading action types...</div>
          ) : actionTypes.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">No action types found in performance reports yet.</div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {actionTypes.map((actionType) => {
                  const mappings = actionMappings[actionType] || [];
                  const isAddingNew = addingMappingFor === actionType;
                  
                  return (
                    <div key={actionType} className="p-3 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{actionType}</div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingMappingFor(isAddingNew ? null : actionType);
                              setNewMappingCategory('');
                              setNewMappingSubcategory('');
                              setAvailableRatings([]);
                              setSelectedRatingIds([]);
                            }}
                          >
                          {isAddingNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      {/* Existing Mappings */}
                      {mappings.length > 0 && (
                        <div className="space-y-1">
                          {mappings.map((mapping) => (
                            <div key={mapping.id} className="flex items-center gap-2 text-sm bg-accent/20 p-2 rounded">
                              <Badge variant="secondary">{mapping.category}</Badge>
                              {mapping.subcategory && (
                                <Badge variant="outline">
                                  {mapping.subcategory}
                                </Badge>
                              )}
                              {!mapping.subcategory && (
                                <Badge variant="outline" className="text-muted-foreground italic">
                                  All subcategories
                                </Badge>
                              )}
                              {mapping.selected_rating_ids && mapping.selected_rating_ids.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {mapping.selected_rating_ids.length} rating{mapping.selected_rating_ids.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-auto h-6 w-6 p-0"
                                onClick={() => handleDeleteMapping(actionType, mapping.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add New Mapping Form */}
                      {isAddingNew && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Select category (and optionally subcategory). Leave ratings unselected to include all ratings in that category.
                            </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Select
                                value={newMappingCategory}
                                 onValueChange={async (value) => {
                                  setNewMappingCategory(value);
                                  setNewMappingSubcategory('');
                                  setSelectedRatingIds([]);
                                  // Fetch all ratings for this category
                                  await fetchAvailableRatings(value, null);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category *" />
                                </SelectTrigger>
                                <SelectContent>
                                {categories.map((cat, idx) => {
                                  // Show divider after defensive categories, before offensive
                                  const isDefensive = cat.toLowerCase().includes('defensive') || cat.toLowerCase().includes('defence');
                                  const prevCat = idx > 0 ? categories[idx - 1] : null;
                                  const prevIsDefensive = prevCat && (prevCat.toLowerCase().includes('defensive') || prevCat.toLowerCase().includes('defence'));
                                  const showDivider = !isDefensive && prevIsDefensive;
                                  
                                  return (
                                    <>
                                      {showDivider && <div className="h-px bg-border my-1" />}
                                      <SelectItem key={cat} value={cat}>
                                        {cat}
                                      </SelectItem>
                                    </>
                                  );
                                })}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {newMappingCategory && subcategoryOptions[newMappingCategory] && subcategoryOptions[newMappingCategory].length > 0 && (
                              <div className="flex-1">
                                <Select
                                  value={newMappingSubcategory || '__none__'}
                                  onValueChange={async (value) => {
                                    const subcatValue = value === '__none__' ? '' : value;
                                    setNewMappingSubcategory(subcatValue);
                                    setSelectedRatingIds([]);
                                    // Fetch available ratings
                                    if (newMappingCategory) {
                                      await fetchAvailableRatings(newMappingCategory, subcatValue || null);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[400px] bg-card border-border z-[100]" position="popper" sideOffset={4}>
                                    <SelectItem value="__none__" className="cursor-pointer">
                                      All subcategories
                                    </SelectItem>
                                    {subcategoryOptions[newMappingCategory].map((sub) => (
                                      <SelectItem key={sub} value={sub} className="cursor-pointer">
                                        {sub}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            <Button 
                              onClick={() => handleAddMapping(actionType)} 
                              size="sm"
                              disabled={!newMappingCategory}
                            >
                              Add
                            </Button>
                          </div>

                          {/* Show available ratings as checkboxes */}
                          {availableRatings.length > 0 && (
                            <div className="space-y-2 mt-3 pt-3 border-t">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-medium">Select R90 Ratings (optional - leave empty to include all):</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const allSelected = selectedRatingIds.length === availableRatings.length;
                                    if (allSelected) {
                                      setSelectedRatingIds([]);
                                    } else {
                                      setSelectedRatingIds(availableRatings.map(r => r.id));
                                    }
                                  }}
                                  className="h-7 text-xs"
                                >
                                  {selectedRatingIds.length === availableRatings.length ? 'Deselect All' : 'Select All'}
                                </Button>
                              </div>
                              <ScrollArea className="h-48">
                                <div className="space-y-1 pr-4">
                                  {availableRatings.map((rating) => (
                                    <label
                                      key={rating.id}
                                      className="flex items-start gap-2 p-2 hover:bg-accent/10 rounded cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={selectedRatingIds.includes(rating.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedRatingIds(prev => [...prev, rating.id]);
                                          } else {
                                            setSelectedRatingIds(prev => prev.filter(id => id !== rating.id));
                                          }
                                        }}
                                        className="mt-1"
                                      />
                                      <div className="flex-1 text-sm">
                                        <div className="font-medium">{rating.title}</div>
                                        <div className="text-xs text-muted-foreground">Score: {rating.score}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
};
