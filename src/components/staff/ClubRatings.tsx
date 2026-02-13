import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Upload, Search, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

// Get all unique countries from club_map_positions for the country assignment dropdown
const COMMON_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czech Republic', 'Denmark',
  'England', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece',
  'Hungary', 'Iceland', 'Ireland', 'Italy', 'Netherlands', 'Norway', 'Poland',
  'Portugal', 'Romania', 'Russia', 'Scotland', 'Serbia', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'Wales'
];

export const ClubRatings = () => {
  const [ratings, setRatings] = useState<ClubRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCountry, setOpenCountry] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clubLogos, setClubLogos] = useState<Record<string, string>>({});
  const [uploadingClubId, setUploadingClubId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClubForUpload, setSelectedClubForUpload] = useState<string | null>(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const [ratingsResult, logosResult] = await Promise.all([
        supabase.from('club_ratings').select('*').order('country').order('club_name'),
        supabase.from('club_map_positions').select('club_name, image_url')
      ]);

      if (ratingsResult.error) throw ratingsResult.error;
      setRatings(ratingsResult.data || []);

      // Build logo lookup (normalized name -> url)
      const logos: Record<string, string> = {};
      logosResult.data?.forEach(club => {
        if (club.club_name && club.image_url) {
          logos[club.club_name.toLowerCase()] = club.image_url;
        }
      });
      setClubLogos(logos);
    } catch (error) {
      console.error('Error fetching club ratings:', error);
      toast.error('Failed to load club ratings');
    } finally {
      setLoading(false);
    }
  };

  const findClubLogo = (clubName: string): string | null => {
    const lower = clubName.toLowerCase();
    if (clubLogos[lower]) return clubLogos[lower];
    // Fuzzy match
    const normalized = lower.replace(/[^a-z0-9 ]/g, '').trim();
    for (const [key, url] of Object.entries(clubLogos)) {
      const normKey = key.replace(/[^a-z0-9 ]/g, '').trim();
      if (normKey.includes(normalized) || normalized.includes(normKey)) return url;
    }
    return null;
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

  const updateCountry = async (id: string, country: string) => {
    try {
      const { error } = await supabase
        .from('club_ratings')
        .update({ country })
        .eq('id', id);

      if (error) throw error;

      setRatings(prev => prev.map(r =>
        r.id === id ? { ...r, country } : r
      ));
      toast.success(`Country updated to ${country}`);
    } catch (error) {
      console.error('Error updating country:', error);
      toast.error('Failed to update country');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClubForUpload) return;

    const club = ratings.find(r => r.id === selectedClubForUpload);
    if (!club) return;

    setUploadingClubId(selectedClubForUpload);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const slug = club.club_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const path = `${slug}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('club-logos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Update club_map_positions with the new logo
      const { error: updateError } = await supabase
        .from('club_map_positions')
        .update({ image_url: publicUrl })
        .ilike('club_name', `%${club.club_name}%`);

      // If no row matched, try inserting
      if (updateError) {
        console.warn('Could not update club_map_positions:', updateError);
      }

      // Update local state
      setClubLogos(prev => ({ ...prev, [club.club_name.toLowerCase()]: publicUrl }));
      toast.success(`Logo uploaded for ${club.club_name}`);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingClubId(null);
      setSelectedClubForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (clubId: string) => {
    setSelectedClubForUpload(clubId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  // Group ratings by country
  const ratingsByCountry = useMemo(() => {
    let filtered = ratings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = ratings.filter(r =>
        r.club_name.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q)
      );
    }

    const grouped = new Map<string, ClubRating[]>();
    filtered.forEach(rating => {
      const country = rating.country || 'Unknown';
      if (!grouped.has(country)) {
        grouped.set(country, []);
      }
      grouped.get(country)!.push(rating);
    });

    // Sort with "Unknown" first so it's prominent
    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === 'Unknown') return -1;
      if (b === 'Unknown') return 1;
      return a.localeCompare(b);
    });
  }, [ratings, searchQuery]);

  // Count clubs missing logos
  const missingLogoCount = useMemo(() => {
    return ratings.filter(r => !findClubLogo(r.club_name)).length;
  }, [ratings, clubLogos]);

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
          Rate clubs from R1 (highest) to R5 (lowest). Click a club logo area to upload.
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs or countries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {missingLogoCount > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
              <ImagePlus className="w-3 h-3 mr-1" />
              {missingLogoCount} missing logos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />

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
              className={`border rounded-lg px-4 ${country === 'Unknown' ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  {country !== 'Unknown' && (
                    <img src={getCountryFlagUrl(country)} alt={country} className="w-6 h-4 object-cover rounded-sm" />
                  )}
                  <span className={`font-medium ${country === 'Unknown' ? 'text-amber-600' : ''}`}>
                    {country}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {clubs.length} clubs
                  </Badge>
                  {country === 'Unknown' && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                      Needs country assignment
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground w-10">Logo</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Club</th>
                        {country === 'Unknown' && (
                          <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-40">Assign Country</th>
                        )}
                        <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-32">1st Team</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-32">Academy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubs.map(club => {
                        const logo = findClubLogo(club.club_name);
                        const isUploading = uploadingClubId === club.id;

                        return (
                          <tr key={club.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-2">
                              <button
                                onClick={() => triggerUpload(club.id)}
                                className="relative group"
                                title={logo ? "Replace logo" : "Upload logo"}
                              >
                                {isUploading ? (
                                  <div className="w-8 h-8 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  </div>
                                ) : (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={logo || undefined} alt={club.club_name} className="object-contain" />
                                    <AvatarFallback className="bg-muted text-[8px]">
                                      <Upload className="w-3 h-3 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                {logo && (
                                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-sm font-medium">{club.club_name}</td>
                            {country === 'Unknown' && (
                              <td className="py-2 px-2">
                                <Select onValueChange={(value) => updateCountry(club.id, value)}>
                                  <SelectTrigger className="w-36 h-8">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COMMON_COUNTRIES.map(c => (
                                      <SelectItem key={c} value={c}>
                                        <span className="flex items-center gap-2">
                                          <img src={getCountryFlagUrl(c)} alt={c} className="w-4 h-3 object-cover rounded-sm" />
                                          {c}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            )}
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
                        );
                      })}
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
