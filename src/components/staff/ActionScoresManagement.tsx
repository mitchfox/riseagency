import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
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

export const ActionScoresManagement = () => {
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [allRatings, setAllRatings] = useState<R90Rating[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Add mapping form
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [newSubcat, setNewSubcat] = useState("");
  const [availableRatings, setAvailableRatings] = useState<R90Rating[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

      // Extract categories
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

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return actionTypes;
    const q = search.toLowerCase();
    return actionTypes.filter(t => t.toLowerCase().includes(q));
  }, [actionTypes, search]);

  const fetchRatingsForCategory = async (cat: string, subcat?: string) => {
    let query = supabase.from("r90_ratings").select("id, title, score, description, category, subcategory").eq("category", cat).not("score", "is", null);
    if (subcat) query = query.eq("subcategory", subcat);
    const { data } = await query;
    setAvailableRatings((data || []) as R90Rating[]);
  };

  const handleAddMapping = async (actionType: string) => {
    if (!newCat) return;
    try {
      // If no specific ratings selected, get all for this category/subcategory
      let ratingIds = selectedIds;
      if (ratingIds.length === 0) {
        let query = supabase.from("r90_ratings").select("id").eq("category", newCat).not("score", "is", null);
        if (newSubcat) query = query.eq("subcategory", newSubcat);
        const { data } = await query;
        ratingIds = (data || []).map((r: any) => r.id);
      }

      const { data, error } = await supabase.from("action_r90_category_mappings").insert({
        action_type: actionType,
        r90_category: newCat,
        r90_subcategory: newSubcat || null,
        selected_rating_ids: ratingIds,
      }).select().single();

      if (error) throw error;
      setMappings(prev => [...prev, data as ActionMapping]);
      setAddingFor(null);
      setNewCat("");
      setNewSubcat("");
      setSelectedIds([]);
      setAvailableRatings([]);
      toast.success("Mapping added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add mapping");
    }
  };

  const handleDeleteMapping = async (id: string) => {
    const { error } = await supabase.from("action_r90_category_mappings").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setMappings(prev => prev.filter(m => m.id !== id));
    toast.success("Mapping removed");
  };

  const getRatingTitle = (id: string) => {
    const r = allRatings.find(r => r.id === id);
    return r ? `${r.title} (${r.score})` : id.slice(0, 8);
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
            const typeMappings = mappingsByType[type] || [];
            const isExpanded = expandedType === type;
            return (
              <div key={type} className="border rounded-lg">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="text-sm font-medium flex-1">{type}</span>
                  <Badge variant={typeMappings.length > 0 ? "default" : "secondary"} className="text-xs">
                    {typeMappings.length} mapping{typeMappings.length !== 1 ? "s" : ""}
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t pt-2">
                    {typeMappings.map(m => (
                      <div key={m.id} className="flex items-start gap-2 bg-muted/30 rounded p-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{m.r90_category}</span>
                            {m.r90_subcategory && <span className="text-xs text-muted-foreground">› {m.r90_subcategory}</span>}
                          </div>
                          {m.selected_rating_ids && m.selected_rating_ids.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {m.selected_rating_ids.slice(0, 6).map(id => (
                                <Badge key={id} variant="outline" className="text-[10px] h-5">{getRatingTitle(id)}</Badge>
                              ))}
                              {m.selected_rating_ids.length > 6 && (
                                <Badge variant="outline" className="text-[10px] h-5">+{m.selected_rating_ids.length - 6} more</Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeleteMapping(m.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    {addingFor === type ? (
                      <div className="space-y-2 bg-muted/20 rounded p-3 border">
                        <div className="flex gap-2">
                          <Select value={newCat} onValueChange={v => { setNewCat(v); setNewSubcat(""); setSelectedIds([]); fetchRatingsForCategory(v); }}>
                            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {newCat && subcategories[newCat]?.length > 0 && (
                            <Select value={newSubcat} onValueChange={v => { setNewSubcat(v); fetchRatingsForCategory(newCat, v); }}>
                              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Subcategory (optional)" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All</SelectItem>
                                {subcategories[newCat].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {availableRatings.length > 0 && (
                          <div className="max-h-40 overflow-auto space-y-1 border rounded p-2">
                            <p className="text-[10px] text-muted-foreground mb-1">Select specific ratings (or leave empty for all):</p>
                            {availableRatings.map(r => (
                              <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded p-1">
                                <Checkbox
                                  checked={selectedIds.includes(r.id)}
                                  onCheckedChange={checked => {
                                    setSelectedIds(prev => checked ? [...prev, r.id] : prev.filter(id => id !== r.id));
                                  }}
                                />
                                <span className="font-mono text-primary">{r.score}</span>
                                <span className="truncate">{r.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleAddMapping(type)} disabled={!newCat}>Add</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingFor(null); setNewCat(""); setNewSubcat(""); setSelectedIds([]); setAvailableRatings([]); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingFor(type)}>
                        <Plus className="h-3 w-3" /> Add Mapping
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
