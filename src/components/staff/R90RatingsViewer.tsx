import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LineChart, Search, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface R90Rating {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string | null;
  created_at: string;
}

interface R90RatingsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  searchTerm?: string;
  prefilledSearch?: { type: string; context: string } | null;
}

const R90_CATEGORIES = [
  'all',
  'Pressing',
  'Defensive',
  'Aerial Duels',
  'Attacking Crosses',
  'On-Ball Decision-Making',
  'Off-Ball Movement'
];

export const R90RatingsViewer = ({ open, onOpenChange, initialCategory, searchTerm, prefilledSearch }: R90RatingsViewerProps) => {
  const [ratings, setRatings] = useState<R90Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [aiSearching, setAiSearching] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionContext, setActionContext] = useState('');
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [expandedRatings, setExpandedRatings] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  // Update category when initialCategory changes
  useEffect(() => {
    if (initialCategory && open) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, open]);

  // Prefill search and auto-expand when prefilledSearch is provided
  useEffect(() => {
    if (prefilledSearch && open) {
      setActionType(prefilledSearch.type);
      setActionContext(prefilledSearch.context);
      setShowAiSearch(true);
    }
  }, [prefilledSearch, open]);

  useEffect(() => {
    if (open) {
      fetchRatings();
    }
  }, [open, selectedCategory]);

  // Re-filter when search filter changes
  useEffect(() => {
    if (open) {
      fetchRatings();
    }
  }, [searchFilter]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('r90_ratings')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filter by search term if provided (legacy support for prop)
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(rating => 
          rating.title?.toLowerCase().includes(searchLower) ||
          rating.description?.toLowerCase().includes(searchLower) ||
          rating.content?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply live search filter
      if (searchFilter && searchFilter.trim()) {
        const filterLower = searchFilter.toLowerCase();
        filteredData = filteredData.filter(rating => 
          rating.title?.toLowerCase().includes(filterLower) ||
          rating.description?.toLowerCase().includes(filterLower) ||
          rating.content?.toLowerCase().includes(filterLower) ||
          rating.category?.toLowerCase().includes(filterLower)
        );
      }
      
      setRatings(filteredData);
    } catch (error) {
      console.error('Error fetching R90 ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSearch = async () => {
    if (!actionType.trim()) {
      toast.error("Please enter an action type");
      return;
    }

    setAiSearching(true);
    try {
      // Fetch all ratings to pass to AI
      const { data: allRatings, error: ratingsError } = await supabase
        .from('r90_ratings')
        .select('*');

      if (ratingsError) throw ratingsError;

      // Use AI to find the most relevant rating
      const { data, error } = await supabase.functions.invoke('find-r90-rating', {
        body: {
          actionType,
          actionContext,
          ratings: allRatings?.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            category: r.category,
            content: r.content
          }))
        }
      });

      if (error) {
        console.error('AI search error:', error);
        toast.error("Failed to search ratings: " + error.message);
        return;
      }

      if (data?.matchedRatings && data.matchedRatings.length > 0) {
        const matchedIds = data.matchedRatings.map((r: any) => r.id);
        const matchedRatings = allRatings?.filter(r => matchedIds.includes(r.id)) || [];
        setRatings(matchedRatings);
        toast.success(`Found ${matchedRatings.length} relevant rating${matchedRatings.length > 1 ? 's' : ''}`);
      } else {
        toast.info("No matching ratings found. Try different terms.");
      }
    } catch (error: any) {
      console.error('Error in AI search:', error);
      toast.error("Failed to search ratings");
    } finally {
      setAiSearching(false);
    }
  };

  // Parse content into structured data
  const parseContent = (content: string | null) => {
    if (!content) return null;
    
    const lines = content.split('\n').filter(line => line.trim());
    const tableData: Array<{ label: string; value: string }> = [];
    
    lines.forEach(line => {
      // Match patterns like "Successful: +0.05"
      const match = line.match(/^(.+?):\s*(.+)$/);
      if (match) {
        tableData.push({ label: match[1].trim(), value: match[2].trim() });
      }
    });
    
    return tableData.length > 0 ? tableData : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-600" />
            R90 Ratings Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI-Powered Search - Collapsible */}
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardHeader 
              className="pb-3 cursor-pointer hover:bg-purple-100/30 transition-colors"
              onClick={() => setShowAiSearch(!showAiSearch)}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI-Powered Search
                </span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {showAiSearch ? '−' : '+'}
                </Button>
              </CardTitle>
              {!showAiSearch && (
                <CardDescription className="text-xs">
                  Click to search by action and context
                </CardDescription>
              )}
            </CardHeader>
            {showAiSearch && (
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="action-type" className="text-xs">Action Type *</Label>
                  <Input
                    id="action-type"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    placeholder="e.g., pass, tackle, dribble"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="action-context" className="text-xs">Context & Details</Label>
                  <Input
                    id="action-context"
                    value={actionContext}
                    onChange={(e) => setActionContext(e.target.value)}
                    placeholder="e.g., under pressure, in space, forward, backwards"
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAiSearch} 
                    disabled={aiSearching}
                    className="flex-1"
                    size="sm"
                  >
                    {aiSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Find Ratings
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setActionType('');
                      setActionContext('');
                      setShowAiSearch(false);
                      fetchRatings();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {R90_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Live Search Filter */}
          <div className="space-y-2">
            <Label htmlFor="search-filter" className="text-sm font-medium">
              Search Ratings
            </Label>
            <Input
              id="search-filter"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Type to filter ratings..."
              className="w-full"
            />
            {searchFilter && (
              <p className="text-xs text-muted-foreground">
                Showing ratings containing "{searchFilter}"
              </p>
            )}
          </div>

          {/* Ratings List */}
          <ScrollArea className="h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : ratings.length === 0 ? (
              <div className="text-center py-12">
                <LineChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No R90 ratings found
                  {selectedCategory !== 'all' && ` for ${selectedCategory}`}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {ratings.map((rating) => {
                  const parsedContent = parseContent(rating.content);
                  const isExpanded = expandedRatings.has(rating.id);
                  
                  return (
                    <Collapsible
                      key={rating.id}
                      open={isExpanded}
                      onOpenChange={(open) => {
                        setExpandedRatings(prev => {
                          const newSet = new Set(prev);
                          if (open) {
                            newSet.add(rating.id);
                          } else {
                            newSet.delete(rating.id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <Card className="border-l-4 border-l-indigo-500">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="pb-3 hover:bg-accent/50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base mb-1">
                                    {rating.title}
                                  </CardTitle>
                                  <ChevronDown 
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </div>
                                {rating.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {rating.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {rating.description && (
                              <CardDescription className="text-sm mt-2 text-left">
                                {rating.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {parsedContent ? (
                            <CardContent className="pt-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-2/3">Action Context</TableHead>
                                    <TableHead>Score Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {parsedContent.map((row, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium">{row.label}</TableCell>
                                      <TableCell className={
                                        row.value.includes('+') ? 'text-green-600 font-bold' : 
                                        row.value.includes('-') ? 'text-red-600 font-bold' : ''
                                      }>
                                        {row.value}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          ) : rating.content && (
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {rating.content}
                              </p>
                            </CardContent>
                          )}
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
