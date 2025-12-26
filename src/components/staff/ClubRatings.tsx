import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ClubRating {
  id: string;
  club_name: string;
  country: string;
  first_team_rating: string;
  academy_rating: string;
}

const RATINGS = ['R1', 'R2', 'R3', 'R4', 'R5'];

const getRatingColor = (rating: string) => {
  switch (rating) {
    case 'R1': return 'bg-emerald-500 text-white';
    case 'R2': return 'bg-green-500 text-white';
    case 'R3': return 'bg-amber-500 text-white';
    case 'R4': return 'bg-orange-500 text-white';
    case 'R5': return 'bg-red-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ClubRatings = () => {
  const [ratings, setRatings] = useState<ClubRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCountry, setOpenCountry] = useState<string>("");

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('club_ratings')
        .select('*')
        .order('country')
        .order('club_name');

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error('Error fetching club ratings:', error);
      toast.error('Failed to load club ratings');
    } finally {
      setLoading(false);
    }
  };

  const updateRating = async (id: string, field: 'first_team_rating' | 'academy_rating', value: string) => {
    try {
      const { error } = await supabase
        .from('club_ratings')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setRatings(prev => prev.map(r => 
        r.id === id ? { ...r, [field]: value } : r
      ));
      toast.success('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error('Failed to update rating');
    }
  };

  // Group ratings by country
  const ratingsByCountry = useMemo(() => {
    const grouped = new Map<string, ClubRating[]>();
    ratings.forEach(rating => {
      const country = rating.country || 'Unknown';
      if (!grouped.has(country)) {
        grouped.set(country, []);
      }
      grouped.get(country)!.push(rating);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [ratings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5" />
          Club Ratings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Rate clubs from R1 (highest) to R5 (lowest) for 1st Team and Academy levels.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="single" 
          collapsible 
          value={openCountry} 
          onValueChange={setOpenCountry}
          className="space-y-2"
        >
          {ratingsByCountry.map(([country, clubs]) => (
            <AccordionItem 
              key={country} 
              value={country}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{country}</span>
                  <Badge variant="secondary" className="text-xs">
                    {clubs.length} clubs
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Club</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-32">1st Team</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-32">Academy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubs.map(club => (
                        <tr key={club.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-2 text-sm">{club.club_name}</td>
                          <td className="py-2 px-2">
                            <Select
                              value={club.first_team_rating}
                              onValueChange={(value) => updateRating(club.id, 'first_team_rating', value)}
                            >
                              <SelectTrigger className="w-20 h-8 mx-auto">
                                <SelectValue>
                                  <Badge className={`${getRatingColor(club.first_team_rating)} text-xs`}>
                                    {club.first_team_rating}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {RATINGS.map(rating => (
                                  <SelectItem key={rating} value={rating}>
                                    <Badge className={`${getRatingColor(rating)} text-xs`}>
                                      {rating}
                                    </Badge>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-2">
                            <Select
                              value={club.academy_rating}
                              onValueChange={(value) => updateRating(club.id, 'academy_rating', value)}
                            >
                              <SelectTrigger className="w-20 h-8 mx-auto">
                                <SelectValue>
                                  <Badge className={`${getRatingColor(club.academy_rating)} text-xs`}>
                                    {club.academy_rating}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {RATINGS.map(rating => (
                                  <SelectItem key={rating} value={rating}>
                                    <Badge className={`${getRatingColor(rating)} text-xs`}>
                                      {rating}
                                    </Badge>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {ratingsByCountry.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No clubs found. Add clubs to the scouting network map first.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
