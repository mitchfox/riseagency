import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Search, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { calculateAdjustedScore, isDefensiveR90Category } from "@/lib/zoneMultipliers";
import { XGPitchMap } from "./XGPitchMap";

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

interface R90RatingsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  searchTerm?: string;
  portalContainer?: HTMLElement | null;
}

const R90_CATEGORIES = [
  'all',
  'Pressing',
  'Defensive',
  'Aerial Duels',
  'Attacking Crosses',
  'On-Ball Decision-Making',
  'Off-Ball Movement',
  'Shots'
];

export const R90RatingsViewer = ({ open, onOpenChange, initialCategory, searchTerm }: R90RatingsViewerProps) => {
  const [ratings, setRatings] = useState<R90Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedRatings, setExpandedRatings] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  // Always reset to 'all' when opening - never auto-filter to a specific category
  // initialCategory is intentionally ignored to ensure all categories are visible

  // Reset when dialog opens - start with Offensive expanded
  useEffect(() => {
    if (open) {
      setSelectedCategory('all');
      setSearchFilter('');
      setExpandedCategories(new Set(['Offensive']));
      setExpandedSubcategories(new Set());
      setExpandedRatings(new Set());
    }
  }, [open]);

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

      // For most categories, filter directly in SQL. For synthetic "Shots" category,
      // we fetch everything and filter in-memory so we can match Finishing/Shot, etc.
      if (selectedCategory !== 'all' && selectedCategory !== 'Shots') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];
      
      // Apply live search filter
      if (searchFilter && searchFilter.trim()) {
        const filterWords = searchFilter.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        filteredData = filteredData.filter(rating => {
          const searchableText = [
            rating.title || '',
            rating.description || '',
            rating.content || '',
            rating.category || '',
            rating.subcategory || ''
          ].join(' ').toLowerCase();
          
          return filterWords.some(word => searchableText.includes(word));
        });
      }

      // Special handling for the synthetic "Shots" category: show any rating
      // whose category, subcategory or text clearly relates to shots.
      if (selectedCategory === 'Shots') {
        filteredData = filteredData.filter(rating => {
          const text = [
            rating.category || '',
            rating.subcategory || '',
            rating.title || '',
            rating.description || '',
            rating.content || ''
          ].join(' ').toLowerCase();
          return text.includes('shot');
        });
      }
      
      setRatings(filteredData);
    } catch (error) {
      console.error('Error fetching R90 ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for score colors
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

  // Group ratings by category and subcategory
  const groupedRatings = () => {
    const groups: Record<string, Record<string, R90Rating[]>> = {};
    
    ratings.forEach(rating => {
      const category = rating.category || 'Uncategorized';
      const subcategory = rating.subcategory || 'General';
      
      if (!groups[category]) {
        groups[category] = {};
      }
      if (!groups[category][subcategory]) {
        groups[category][subcategory] = [];
      }
      groups[category][subcategory].push(rating);
    });
    
    return groups;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col z-[500]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary" />
            R90 Ratings Reference
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Quick Search Filter - Primary search method */}
          <div className="space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Quick search ratings by action name..."
                className="pl-9 w-full"
              />
            </div>
            {searchFilter && (
              <p className="text-xs text-muted-foreground">
                Showing ratings containing "{searchFilter}"
              </p>
            )}
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full flex-shrink-0">
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

          {/* Ratings List */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="pr-4 pb-4">
                {/* Show xG Map for Shots category */}
                
                {loading ? (
                  <LoadingSpinner size="lg" className="py-12" />
                ) : ratings.length === 0 ? (
                  selectedCategory === 'Shots' ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="max-w-md mx-auto">
                        <XGPitchMap />
                      </div>
                      <p className="text-muted-foreground">
                        No specific R90 ratings saved yet for Shots, but you can still use the xG pitch map as a visual reference.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <LineChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                      <p className="text-muted-foreground">
                        No R90 ratings found
                        {selectedCategory !== 'all' && ` for ${selectedCategory}`}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedRatings()).sort(([a], [b]) => {
                      // Offensive always first
                      if (a === 'Offensive') return -1;
                      if (b === 'Offensive') return 1;
                      return a.localeCompare(b);
                    }).map(([category, subcategories]) => {
                      const categoryKey = category;
                      const isCategoryExpanded = expandedCategories.has(categoryKey);
                      
                      return (
                        <Collapsible
                          key={categoryKey}
                          open={isCategoryExpanded}
                          onOpenChange={(open) => {
                            setExpandedCategories(prev => {
                              const newSet = new Set(prev);
                              if (open) {
                                newSet.add(categoryKey);
                              } else {
                                newSet.delete(categoryKey);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <Card className="border-2 border-primary/20">
                            <CollapsibleTrigger className="w-full">
                              <CardHeader className="pb-3 hover:bg-accent/50 transition-colors cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg font-bold text-primary">
                                    {category}
                                  </CardTitle>
                                  <ChevronDown 
                                    className={`h-5 w-5 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`}
                                  />
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="space-y-3 pt-0">
                                {category === 'Offensive' && Object.keys(subcategories).includes('Finishing') && (
                                  <div className="mb-4">
                                    <XGPitchMap />
                                  </div>
                                )}

                                {Object.entries(subcategories).map(([subcategory, ratingsInSubcat]) => {
                                  const subcategoryKey = `${categoryKey}-${subcategory}`;
                                  const isSubcategoryExpanded = expandedSubcategories.has(subcategoryKey);
                                  
                                  return (
                                    <Collapsible
                                      key={subcategoryKey}
                                      open={isSubcategoryExpanded}
                                      onOpenChange={(open) => {
                                        setExpandedSubcategories(prev => {
                                          const newSet = new Set(prev);
                                          if (open) {
                                            newSet.add(subcategoryKey);
                                          } else {
                                            newSet.delete(subcategoryKey);
                                          }
                                          return newSet;
                                        });
                                      }}
                                    >
                                      <Card className="border-l-4 border-l-indigo-400">
                                        <CollapsibleTrigger className="w-full">
                                          <CardHeader className="pb-2 hover:bg-accent/30 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                              <CardTitle className="text-base font-semibold">
                                                {subcategory}
                                              </CardTitle>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {ratingsInSubcat.length}
                                                </Badge>
                                                <ChevronDown 
                                                  className={`h-4 w-4 transition-transform ${isSubcategoryExpanded ? 'rotate-180' : ''}`}
                                                />
                                              </div>
                                            </div>
                                          </CardHeader>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <CardContent className="space-y-2 pt-0">
                                            {ratingsInSubcat.map((rating) => {
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
                                                  <Card className="border">
                                                    <CollapsibleTrigger className="w-full">
                                                       <CardHeader className="pb-2 hover:bg-accent/20 transition-colors cursor-pointer">
                                                         <div className="flex items-start justify-between gap-3">
                                                           <div className="flex-1 min-w-0 text-left">
                                                             <div className="flex items-center gap-2 flex-wrap">
                                                               <CardTitle className="text-sm">
                                                                 {rating.title}
                                                               </CardTitle>
                                                               {rating.score !== null && rating.score !== undefined && (
                                                                 <Badge 
                                                                   className={`${getScoreColor(rating.score)} text-xs font-mono px-2 shrink-0`}
                                                                 >
                                                                   {typeof rating.score === 'string' 
                                                                     ? (isNaN(parseFloat(rating.score)) ? rating.score : Number(rating.score).toFixed(4))
                                                                     : String(rating.score)}
                                                                 </Badge>
                                                               )}
                                                               <ChevronDown 
                                                                 className={`h-3 w-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                                               />
                                                             </div>
                                                           </div>
                                                         </div>
                                                        {rating.description && (
                                                          <CardDescription className="text-xs mt-1 text-left">
                                                            {rating.description}
                                                          </CardDescription>
                                                        )}
                                                      </CardHeader>
                                                    </CollapsibleTrigger>
                                                     <CollapsibleContent>
                                                       <CardContent className="pt-0 space-y-4">
                                                         {/* Original Content */}
                                                         {parsedContent ? (
                                                           <div>
                                                             <h4 className="text-xs font-semibold mb-2">Action Context</h4>
                                                             <Table>
                                                               <TableHeader>
                                                                 <TableRow>
                                                                   <TableHead className="w-2/3 text-xs">Context</TableHead>
                                                                   <TableHead className="text-xs">Score Value</TableHead>
                                                                 </TableRow>
                                                               </TableHeader>
                                                               <TableBody>
                                                                 {parsedContent.map((row, idx) => (
                                                                   <TableRow key={idx}>
                                                                     <TableCell className="text-xs">{row.label}</TableCell>
                                                                     <TableCell className={`text-xs ${
                                                                       row.value.includes('+') ? 'text-green-600 font-bold' : 
                                                                       row.value.includes('-') ? 'text-red-600 font-bold' : ''
                                                                     }`}>
                                                                       {row.value}
                                                                     </TableCell>
                                                                   </TableRow>
                                                                 ))}
                                                               </TableBody>
                                                             </Table>
                                                           </div>
                                                         ) : rating.content && (
                                                           <div>
                                                             <h4 className="text-xs font-semibold mb-2">Details</h4>
                                                             <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                                               {rating.content}
                                                             </p>
                                                           </div>
                                                         )}
                                                         
                                                         {/* Zone Multiplier Breakdown */}
                                                         {rating.score && !isNaN(parseFloat(rating.score)) && (
                                                           <div>
                                                             <h4 className="text-xs font-semibold mb-2">Zone Adjusted Scores</h4>
                                                             <p className="text-xs text-muted-foreground mb-3">
                                                               Base score: <span className="font-mono font-bold">{parseFloat(rating.score).toFixed(5)}</span>
                                                               {rating.category && ` • ${isDefensiveR90Category(rating.category) ? 'Defensive' : 'Offensive'} action`}
                                                             </p>
                                                             <Table>
                                                               <TableHeader>
                                                                 <TableRow>
                                                                   <TableHead className="text-xs">Zone</TableHead>
                                                                   <TableHead className="text-xs">Successful</TableHead>
                                                                   <TableHead className="text-xs">Unsuccessful</TableHead>
                                                                 </TableRow>
                                                               </TableHeader>
                                                               <TableBody>
                                                                 {Array.from({ length: 18 }, (_, i) => i + 1).map(zone => {
                                                                   const baseScore = parseFloat(rating.score!);
                                                                   const isDefensive = isDefensiveR90Category(rating.category);
                                                                   const successScore = calculateAdjustedScore(baseScore, zone, true, isDefensive);
                                                                   const failScore = calculateAdjustedScore(baseScore, zone, false, isDefensive);
                                                                   
                                                                   return (
                                                                     <TableRow key={zone}>
                                                                       <TableCell className="text-xs font-medium">Zone {zone}</TableCell>
                                                                       <TableCell className={`text-xs font-mono ${
                                                                         successScore && successScore >= 0.1 ? 'text-green-600 font-bold' :
                                                                         successScore && successScore > 0 ? 'text-green-500' :
                                                                         successScore && successScore < 0 ? 'text-red-500' : ''
                                                                       }`}>
                                                                         {successScore?.toFixed(5) || 'N/A'}
                                                                       </TableCell>
                                                                       <TableCell className={`text-xs font-mono ${
                                                                         failScore && failScore >= 0.1 ? 'text-green-600 font-bold' :
                                                                         failScore && failScore > 0 ? 'text-green-500' :
                                                                         failScore && failScore < 0 ? 'text-red-500' : ''
                                                                       }`}>
                                                                         {failScore?.toFixed(5) || 'N/A'}
                                                                       </TableCell>
                                                                     </TableRow>
                                                                   );
                                                                 })}
                                                               </TableBody>
                                                             </Table>
                                                           </div>
                                                         )}
                                                       </CardContent>
                                                     </CollapsibleContent>
                                                  </Card>
                                                </Collapsible>
                                              );
                                            })}
                                          </CardContent>
                                        </CollapsibleContent>
                                      </Card>
                                    </Collapsible>
                                    );
                                  })}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
