import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LineChart } from "lucide-react";

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

export const R90RatingsViewer = ({ open, onOpenChange, initialCategory, searchTerm }: R90RatingsViewerProps) => {
  const [ratings, setRatings] = useState<R90Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Update category when initialCategory changes
  useEffect(() => {
    if (initialCategory && open) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, open]);

  useEffect(() => {
    if (open) {
      fetchRatings();
    }
  }, [open, selectedCategory]);

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
      
      // Filter by search term if provided
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(rating => 
          rating.title?.toLowerCase().includes(searchLower) ||
          rating.description?.toLowerCase().includes(searchLower) ||
          rating.content?.toLowerCase().includes(searchLower)
        );
      }
      
      setRatings(filteredData);
    } catch (error) {
      console.error('Error fetching R90 ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-600" />
            R90 Ratings Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                {ratings.map((rating) => (
                  <Card key={rating.id} className="border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2 mb-1">
                            {rating.title}
                          </CardTitle>
                          {rating.category && (
                            <Badge variant="secondary" className="text-xs">
                              {rating.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {rating.description && (
                        <CardDescription className="text-sm mt-2 line-clamp-2">
                          {rating.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    {rating.content && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {rating.content}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
