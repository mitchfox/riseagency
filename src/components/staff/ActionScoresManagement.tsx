import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Plus, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { canonicalActionType } from "@/lib/playerActionFrequency";

interface R90Rating {
  id: string;
  title: string;
  description: string | null;
  score: string | null;
  category: string | null;
  subcategory: string | null;
}

interface ActionMapping {
  id: string;
  action_type: string;
  r90_category: string;
  r90_subcategory: string | null;
  selected_rating_ids: string[] | null;
}

interface ActionScoresManagementProps {
  initialFilter?: string;
}

export const ActionScoresManagement = ({ initialFilter }: ActionScoresManagementProps = {}) => {
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [allRatings, setAllRatings] = useState<R90Rating[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialFilter || "");
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Add rating dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<string>("");
  const [addDialogMappingId, setAddDialogMappingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterSubcat, setFilterSubcat] = useState("");
  const [ratingSearch, setRatingSearch] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [actionsRes, mappingsRes, ratingsRes] = await Promise.all([
        supabase.from("performance_report_actions").select("action_type").not("action_type", "is", null),
        supabase.from("action_r90_category_mappings").select("*"),
        supabase.from("r90_ratings").select("id, title, description, score, category, subcategory").not("score", "is", null),
      ]);

      const uniqueTypes = [...new Set((actionsRes.data || []).map((a: any) => a.action_type as string))].sort();
      setActionTypes(uniqueTypes);
      setMappings((mappingsRes.data || []) as ActionMapping[]);
      setAllRatings((ratingsRes.data || []) as R90Rating[]);

      const cats = [...new Set((ratingsRes.data || []).map((r: any) => r.category).filter(Boolean))] as string[];
      setCategories(cats.sort());

      const subcatMap: Record<string, string[]> = {};
      cats.forEach(cat => {
        const subs = [...new Set((ratingsRes.data || []).filter((r: any) => r.category === cat).map((r: any) => r.subcategory).filter(Boolean))] as string[];
        subcatMap[cat] = subs.sort();
      });
      setSubcategories(subcatMap);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load action score mappings");
    } finally {
      setLoading(false);
    }
  };

  const mappingsByType = useMemo(() => {
    const map: Record<string, ActionMapping[]> = {};
    mappings.forEach(m => {
      if (!map[m.action_type]) map[m.action_type] = [];
      map[m.action_type].push(m);
    });
    return map;
  }, [mappings]);

  // Get all rating IDs for a given action type
  const getRatingIdsForType = (type: string): string[] => {
    const typeMappings = mappingsByType[type] || [];
    return typeMappings.flatMap(m => m.selected_rating_ids || []);
  };

  // Get ratings objects for a type
  const getRatingsForType = (type: string): R90Rating[] => {
    const ids = getRatingIdsForType(type);
    return allRatings.filter(r => ids.includes(r.id));
  };

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return actionTypes;
    const q = search.toLowerCase();
    return actionTypes.filter(t => t.toLowerCase().includes(q));
  }, [actionTypes, search]);

  // Remove a single rating from a mapping
  const handleRemoveRating = async (actionType: string, ratingId: string) => {
    const typeMappings = mappingsByType[actionType] || [];
    for (const m of typeMappings) {
      if (m.selected_rating_ids?.includes(ratingId)) {
        const newIds = m.selected_rating_ids.filter(id => id !== ratingId);
        if (newIds.length === 0) {
          // Delete the entire mapping
          await supabase.from("action_r90_category_mappings").delete().eq("id", m.id);
          setMappings(prev => prev.filter(p => p.id !== m.id));
        } else {
          await supabase.from("action_r90_category_mappings").update({ selected_rating_ids: newIds }).eq("id", m.id);
          setMappings(prev => prev.map(p => p.id === m.id ? { ...p, selected_rating_ids: newIds } : p));
        }
        toast.success("Rating removed");
        return;
      }
    }
  };

  // Add ratings to a type
  const handleAddRatings = async (ratingIds: string[]) => {
    if (!addDialogType || ratingIds.length === 0) return;
    const existingIds = getRatingIdsForType(addDialogType);
    const newIds = ratingIds.filter(id => !existingIds.includes(id));
    if (newIds.length === 0) { toast.info("All selected ratings already added"); return; }

    const typeMappings = mappingsByType[addDialogType] || [];
    if (typeMappings.length > 0) {
      // Add to existing mapping
      const m = typeMappings[0];
      const updatedIds = [...(m.selected_rating_ids || []), ...newIds];
      const { error } = await supabase.from("action_r90_category_mappings").update({ selected_rating_ids: updatedIds }).eq("id", m.id);
      if (error) { toast.error("Failed to add"); return; }
      setMappings(prev => prev.map(p => p.id === m.id ? { ...p, selected_rating_ids: updatedIds } : p));
    } else {
      // Create new mapping - use the category of first rating
      const firstRating = allRatings.find(r => newIds.includes(r.id));
      const { data, error } = await supabase.from("action_r90_category_mappings").insert({
        action_type: addDialogType,
        r90_category: firstRating?.category || "General",
        r90_subcategory: firstRating?.subcategory || null,
        selected_rating_ids: newIds,
      }).select().single();
      if (error) { toast.error("Failed to add"); return; }
      setMappings(prev => [...prev, data as ActionMapping]);
    }
    toast.success(`Added ${newIds.length} rating${newIds.length > 1 ? "s" : ""}`);
    setAddDialogOpen(false);
  };

  // Filter ratings for add dialog
  const addDialogRatings = useMemo(() => {
    let filtered = allRatings;
    const existingIds = addDialogType ? getRatingIdsForType(addDialogType) : [];
    filtered = filtered.filter(r => !existingIds.includes(r.id));
    if (filterCat) filtered = filtered.filter(r => r.category === filterCat);
    if (filterSubcat) filtered = filtered.filter(r => r.subcategory === filterSubcat);
    if (ratingSearch.trim()) {
      const q = ratingSearch.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q));
    }
    return filtered;
  }, [allRatings, filterCat, filterSubcat, ratingSearch, addDialogType, mappings]);

  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);

  const openAddDialog = (actionType: string) => {
    setAddDialogType(actionType);
    setFilterCat("");
    setFilterSubcat("");
    setRatingSearch("");
    setSelectedAddIds([]);
    setAddDialogOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Action Score Mappings</h3>
          <p className="text-sm text-muted-foreground">Configure which R90 ratings appear for each action type in the Action Edit view</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action types..." className="pl-8" />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-1">
          {filteredTypes.map(type => {
            const ratings = getRatingsForType(type);
            const isExpanded = expandedType === type;
            return (
              <div key={type} className="border rounded-lg">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="text-sm font-medium flex-1">{type}</span>
                  <Badge variant={ratings.length > 0 ? "default" : "secondary"} className="text-xs">
                    {ratings.length} rating{ratings.length !== 1 ? "s" : ""}
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t pt-2">
                    {ratings.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ratings.map(r => (
                          <div key={r.id} className="flex items-center gap-1 bg-muted/40 rounded-md px-2 py-1 text-xs group">
                            <span className="font-mono font-bold text-primary">{r.score}</span>
                            <span className="truncate max-w-[200px]">{r.title}</span>
                            <button
                              className="ml-1 opacity-50 group-hover:opacity-100 hover:text-destructive transition-opacity"
                              onClick={(e) => { e.stopPropagation(); handleRemoveRating(type, r.id); }}
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No ratings assigned yet</p>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openAddDialog(type)}>
                      <Plus className="h-3 w-3" /> Add Ratings
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Add ratings dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Ratings to: <span className="text-primary">{addDialogType}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={ratingSearch} onChange={e => setRatingSearch(e.target.value)} placeholder="Search ratings..." className="pl-8 h-9" />
              </div>
              <Select value={filterCat} onValueChange={v => { setFilterCat(v === "__all__" ? "" : v); setFilterSubcat(""); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {filterCat && subcategories[filterCat]?.length > 0 && (
                <Select value={filterSubcat} onValueChange={v => setFilterSubcat(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Subcategory" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {subcategories[filterCat].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <ScrollArea className="h-[350px] border rounded-md">
              <div className="p-2 space-y-0.5">
                {addDialogRatings.map(r => (
                  <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer text-xs">
                    <Checkbox
                      checked={selectedAddIds.includes(r.id)}
                      onCheckedChange={checked => setSelectedAddIds(prev => checked ? [...prev, r.id] : prev.filter(id => id !== r.id))}
                    />
                    <span className="font-mono font-bold text-primary min-w-[50px]">{r.score}</span>
                    <span className="flex-1 truncate">{r.title}</span>
                    <span className="text-[10px] text-muted-foreground">{r.category}</span>
                  </label>
                ))}
                {addDialogRatings.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No matching ratings found</p>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{selectedAddIds.length} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => handleAddRatings(selectedAddIds)} disabled={selectedAddIds.length === 0}>
                  Add {selectedAddIds.length > 0 ? selectedAddIds.length : ""} Rating{selectedAddIds.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
