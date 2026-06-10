import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Upload, Search, ImagePlus, Wand2, Merge } from "lucide-react";
import { StaffSearchInput } from "./StaffSearchInput";
import { matchesQuery } from "@/lib/searchMatch";
import { toast } from "sonner";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { normalizeClubName } from "@/lib/clubNameUtils";
import { findDuplicateClubs, inferYouthTeamCountry } from "@/lib/clubDeduplication";

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
  const [selectedClubForUpload, setSelectedClubForUpload] = useState<string | null>(null);
  const [detectingCountries, setDetectingCountries] = useState(false);
  const [mergingDuplicates, setMergingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const [ratingsResult, logosResult, youthClubs, proClubs, scoutingClubs] = await Promise.all([
        supabase.from('club_ratings').select('*').order('country').order('club_name'),
        supabase.from('club_map_positions').select('club_name, image_url, country'),
        supabase.from('player_outreach_youth').select('current_club'),
        supabase.from('player_outreach_pro').select('current_club'),
        supabase.from('scouting_reports').select('current_club'),
      ]);

      if (ratingsResult.error) throw ratingsResult.error;
      const existingRatings = ratingsResult.data || [];

      const logos: Record<string, string> = {};
      const clubCountryLookup: Record<string, string> = {};
      logosResult.data?.forEach(club => {
        if (club.club_name) {
          const norm = normalizeClubName(club.club_name);
          if (club.image_url) logos[norm] = club.image_url;
          if (club.country) clubCountryLookup[norm] = club.country;
        }
      });
      setClubLogos(logos);

      const existingNorms = new Set(existingRatings.map(r => normalizeClubName(r.club_name)));

      const allClubNames = new Set<string>();
      [youthClubs.data, proClubs.data, scoutingClubs.data].forEach(dataset => {
        dataset?.forEach((row: any) => {
          const name = row.current_club?.trim();
          if (name && name !== 'Unknown' && name !== '-' && name !== '') {
            allClubNames.add(name);
          }
        });
      });

      const missingClubs: { name: string; country: string }[] = [];
      allClubNames.forEach(clubName => {
        const norm = normalizeClubName(clubName);
        if (!norm) return;

        let found = false;
        for (const existingNorm of existingNorms) {
          if (existingNorm === norm || existingNorm.includes(norm) || norm.includes(existingNorm)) {
            found = true;
            break;
          }
        }
        if (!found) {
          let country = 'Unknown';
          // Try youth team inference first
          const youthCountry = inferYouthTeamCountry(clubName, existingRatings);
          if (youthCountry) {
            country = youthCountry;
          } else {
            for (const [key, ctry] of Object.entries(clubCountryLookup)) {
              if (key === norm || key.includes(norm) || norm.includes(key)) {
                country = ctry;
                break;
              }
            }
          }
          missingClubs.push({ name: clubName, country });
        }
      });

      if (missingClubs.length > 0) {
        const inserts = missingClubs.map(c => ({
          club_name: c.name,
          country: c.country,
          first_team_rating: 'R3',
          academy_rating: 'R3',
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('club_ratings')
          .insert(inserts)
          .select();

        if (insertError) {
          console.warn('Could not auto-insert clubs:', insertError);
        } else if (inserted) {
          existingRatings.push(...inserted);
          toast.info(`${inserted.length} new club(s) added to ratings`);
        }
      }

      setRatings(existingRatings);
    } catch (error) {
      console.error('Error fetching club ratings:', error);
      toast.error('Failed to load club ratings');
    } finally {
      setLoading(false);
    }
  };

  const detectCountriesWithAI = async () => {
    const unknownClubs = ratings.filter(r => r.country === 'Unknown');
    if (unknownClubs.length === 0) {
      toast.info('No clubs with unknown countries');
      return;
    }

    setDetectingCountries(true);
    try {
      const clubNames = unknownClubs.map(c => c.club_name);
      const { data, error } = await invokeEdgeFunction('detect-club-countries', {
        body: { clubs: clubNames }
      });

      if (error) throw error;
      
      const results = data?.results || [];
      let updated = 0;

      for (const result of results) {
        if (result.country && result.country !== 'Unknown') {
          const club = unknownClubs.find(c => c.club_name === result.name);
          if (club) {
            const { error: updateError } = await supabase
              .from('club_ratings')
              .update({ country: result.country })
              .eq('id', club.id);
            
            if (!updateError) {
              updated++;
            }
          }
        }
      }

      if (updated > 0) {
        toast.success(`Assigned countries to ${updated} club(s)`);
        await fetchRatings();
      } else {
        toast.info('Could not identify any additional countries');
      }
    } catch (error: any) {
      console.error('Error detecting countries:', error);
      toast.error(error.message || 'Failed to detect countries');
    } finally {
      setDetectingCountries(false);
    }
  };

  const mergeDuplicateClubs = async () => {
    const dupes = findDuplicateClubs(ratings);
    if (dupes.size === 0) {
      toast.info('No duplicate clubs found');
      return;
    }

    setMergingDuplicates(true);
    try {
      let merged = 0;
      for (const [, group] of dupes) {
        // Keep the one with a known country, or the first one
        const primary = group.find(c => c.country !== 'Unknown') || group[0];
        const duplicates = group.filter(c => c.id !== primary.id);
        
        for (const dupe of duplicates) {
          await supabase.from('club_ratings').delete().eq('id', dupe.id);
          merged++;
        }
      }

      if (merged > 0) {
        toast.success(`Merged ${merged} duplicate club(s)`);
        await fetchRatings();
      }
    } catch (error) {
      console.error('Error merging duplicates:', error);
      toast.error('Failed to merge duplicates');
    } finally {
      setMergingDuplicates(false);
    }
  };

  const findClubLogo = (clubName: string): string | null => {
    const norm = normalizeClubName(clubName);
    if (!norm) return null;
    if (clubLogos[norm]) return clubLogos[norm];
    for (const [key, url] of Object.entries(clubLogos)) {
      if (key.includes(norm) || norm.includes(key)) return url;
    }
    return null;
  };

  const updateRating = async (id: string, field: 'first_team_rating' | 'academy_rating', value: string) => {
    try {
      const { error } = await supabase.from('club_ratings').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      setRatings(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
      toast.success('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error('Failed to update rating');
    }
  };

  const updateCountry = async (id: string, country: string) => {
    try {
      const { error } = await supabase.from('club_ratings').update({ country }).eq('id', id);
      if (error) throw error;
      setRatings(prev => prev.map(r => r.id === id ? { ...r, country } : r));
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

      const { error: uploadError } = await supabase.storage.from('club-logos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('club-logos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase.from('club_map_positions').update({ image_url: publicUrl }).ilike('club_name', `%${club.club_name}%`);

      setClubLogos(prev => ({ ...prev, [normalizeClubName(club.club_name)]: publicUrl }));
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

  const unknownCount = useMemo(() => ratings.filter(r => r.country === 'Unknown').length, [ratings]);
  const duplicateCount = useMemo(() => {
    let count = 0;
    const dupes = findDuplicateClubs(ratings);
    for (const [, group] of dupes) count += group.length - 1;
    return count;
  }, [ratings]);

  const ratingsByCountry = useMemo(() => {
    let filtered = ratings;
    if (searchQuery) {
      filtered = ratings.filter(r => matchesQuery(searchQuery, [r.club_name, r.country]));
    }

    const grouped = new Map<string, ClubRating[]>();
    filtered.forEach(rating => {
      const country = rating.country || 'Unknown';
      if (!grouped.has(country)) grouped.set(country, []);
      grouped.get(country)!.push(rating);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === 'Unknown') return -1;
      if (b === 'Unknown') return 1;
      return a.localeCompare(b);
    });
  }, [ratings, searchQuery]);

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
          <StaffSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search clubs or countries..."
            className="flex-1 min-w-[200px]"
          />
          {unknownCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={detectCountriesWithAI}
              disabled={detectingCountries}
              className="gap-1.5 text-xs"
            >
              {detectingCountries ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              Auto-detect {unknownCount} countries
            </Button>
          )}
          {duplicateCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={mergeDuplicateClubs}
              disabled={mergingDuplicates}
              className="gap-1.5 text-xs"
            >
              {mergingDuplicates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
              Merge {duplicateCount} duplicates
            </Button>
          )}
          {missingLogoCount > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
              <ImagePlus className="w-3 h-3 mr-1" />
              {missingLogoCount} missing logos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

        <Accordion type="single" collapsible value={openCountry} onValueChange={setOpenCountry} className="space-y-2">
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
                  <span className={`font-medium ${country === 'Unknown' ? 'text-amber-600' : ''}`}>{country}</span>
                  <Badge variant="secondary" className="text-xs">{clubs.length} clubs</Badge>
                  {country === 'Unknown' && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">Needs country assignment</Badge>
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
                              <button onClick={() => triggerUpload(club.id)} className="relative group" title={logo ? "Replace logo" : "Upload logo"}>
                                {isUploading ? (
                                  <div className="w-8 h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                                ) : (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={logo || undefined} alt={club.club_name} className="object-contain" />
                                    <AvatarFallback className="bg-muted text-[8px]"><Upload className="w-3 h-3 text-muted-foreground" /></AvatarFallback>
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
                                  <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Select country" /></SelectTrigger>
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
                              <Select value={club.first_team_rating} onValueChange={(value) => updateRating(club.id, 'first_team_rating', value)}>
                                <SelectTrigger className="w-20 h-8 mx-auto">
                                  <SelectValue><Badge className={`${getRatingColor(club.first_team_rating)} text-xs`}>{club.first_team_rating}</Badge></SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {RATINGS.map(rating => (
                                    <SelectItem key={rating} value={rating}><Badge className={`${getRatingColor(rating)} text-xs`}>{rating}</Badge></SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-2">
                              <Select value={club.academy_rating} onValueChange={(value) => updateRating(club.id, 'academy_rating', value)}>
                                <SelectTrigger className="w-20 h-8 mx-auto">
                                  <SelectValue><Badge className={`${getRatingColor(club.academy_rating)} text-xs`}>{club.academy_rating}</Badge></SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {RATINGS.map(rating => (
                                    <SelectItem key={rating} value={rating}><Badge className={`${getRatingColor(rating)} text-xs`}>{rating}</Badge></SelectItem>
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
            <p className="text-sm">No clubs found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
