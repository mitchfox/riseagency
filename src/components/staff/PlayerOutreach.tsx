import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Users, Save, Star, CheckCircle2, HelpCircle, Clock, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FaInstagram } from 'react-icons/fa';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { calculateAge, calculatePreciseAge, getEligibleDate } from '@/lib/ageUtils';
import { TableSettingsPopover, useTableSettings, type ColumnConfig } from './TableSettingsPopover';
import { normalizeClubName, findClubCountry, findClubRating as findClubRatingShared } from '@/lib/clubNameUtils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';

// Instagram link
const InstagramIconLink = ({ handle }: { handle: string | null }) => {
  if (!handle) return <span className="text-muted-foreground">-</span>;
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return <span className="text-muted-foreground">-</span>;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); window.open(`https://instagram.com/${clean}`, '_blank', 'noopener,noreferrer'); }}
      className="p-0.5 hover:scale-110 transition-transform"
      title={`@${clean}`}
    >
      <FaInstagram className="h-4 w-4 text-[#E1306C]" />
    </button>
  );
};

// Club rating
interface ClubRating {
  club_name: string;
  first_team_rating: string;
  academy_rating: string;
}

const findClubRating = (clubName: string | null, ratings: ClubRating[], isYouth: boolean): string | null => {
  return findClubRatingShared(clubName, ratings, isYouth);
};

const ClubRatingBadge = ({ rating }: { rating: string | null }) => {
  if (!rating) return null;
  const colorMap: Record<string, string> = {
    'R1': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    'R2': 'bg-green-500/20 text-green-600 border-green-500/30',
    'R3': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    'R4': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    'R5': 'bg-red-500/20 text-red-600 border-red-500/30',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1 py-0 ml-1 ${colorMap[rating] || ''}`}>
      {rating}
    </Badge>
  );
};

// findClubCountry now imported from @/lib/clubNameUtils

interface AgeRule {
  country: string;
  country_code: string;
  min_contact_age: number | null;
}

// Eligibility badge
const EligibilityBadge = ({ item, type, clubCountryMap, ageRules }: {
  item: any; type: 'youth' | 'pro'; clubCountryMap: Record<string, string>; ageRules: AgeRule[];
}) => {
  if (type === 'pro') {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /></span>
      </TooltipTrigger><TooltipContent><p>Pro player, can be contacted directly</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }

  if (!item.date_of_birth) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>No date of birth set</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }

  const clubCountry = findClubCountry(item.current_club, clubCountryMap);
  if (!clubCountry) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>Club country unknown</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }

  const rule = ageRules.find(r => r.country.toLowerCase() === clubCountry.toLowerCase());
  if (!rule || rule.min_contact_age === null) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>No age rules for {clubCountry}</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }

  const preciseAge = calculatePreciseAge(item.date_of_birth);
  if (preciseAge === null) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;

  if (preciseAge >= rule.min_contact_age) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>
      </TooltipTrigger><TooltipContent><p>Eligible to contact (parent) in {clubCountry}</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }

  const eligibleDate = getEligibleDate(item.date_of_birth, rule.min_contact_age);
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
        <Clock className="h-3.5 w-3.5" />
        {eligibleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
      </span>
    </TooltipTrigger><TooltipContent>
      <p>Can contact parent from {eligibleDate.toLocaleDateString('en-GB')} ({clubCountry}: min age {rule.min_contact_age})</p>
    </TooltipContent></Tooltip></TooltipProvider>
  );
};

// Club display with country flag and contact age
const ClubDisplay = ({ clubName, clubCountryMap, ageRules, clubRatings, isYouth }: {
  clubName: string | null; clubCountryMap: Record<string, string>; ageRules: AgeRule[]; clubRatings: ClubRating[]; isYouth: boolean;
}) => {
  if (!clubName) return <span className="text-muted-foreground">-</span>;
  const clubCountry = findClubCountry(clubName, clubCountryMap);
  const rule = clubCountry ? ageRules.find(r => r.country.toLowerCase() === clubCountry.toLowerCase()) : null;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {clubCountry && (
        <img src={getCountryFlagUrl(clubCountry)} alt={clubCountry} className="w-4 h-3 object-cover rounded-sm" title={clubCountry} />
      )}
      <span className="truncate">{clubName}</span>
      <ClubRatingBadge rating={findClubRating(clubName, clubRatings, isYouth)} />
      {rule?.min_contact_age != null && isYouth && (
        <Badge variant="secondary" className="text-[10px] px-1 py-0">{rule.min_contact_age}</Badge>
      )}
    </span>
  );
};

interface YouthOutreach {
  id: string;
  player_name: string;
  ig_handle: string | null;
  current_club: string | null;
  date_of_birth: string | null;
  position?: string | null;
  nationality?: string | null;
  messaged: boolean;
  response_received: boolean;
  parents_name: string | null;
  parent_contact: string | null;
  parent_approval: boolean;
  initial_message: string | null;
  notes: string | null;
  created_at?: string;
}

interface ProOutreach {
  id: string;
  player_name: string;
  ig_handle: string | null;
  current_club: string | null;
  date_of_birth: string | null;
  position?: string | null;
  nationality?: string | null;
  messaged: boolean;
  response_received: boolean;
  initial_message: string | null;
  notes: string | null;
  created_at?: string;
}

type SortField = 'player_name' | 'age' | 'current_club' | 'nationality' | 'date_of_birth';
type SortDir = 'asc' | 'desc';

const OUTREACH_YOUTH_COLS: ColumnConfig[] = [
  { key: 'eligibility', label: 'Eligibility', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'parent', label: 'Parent', defaultVisible: true },
  { key: 'parent_ig', label: 'Parent IG', defaultVisible: true },
  { key: 'approval', label: 'Approval', defaultVisible: true },
  { key: 'messaged', label: 'Messaged', defaultVisible: true },
  { key: 'response', label: 'Response', defaultVisible: true },
];

const OUTREACH_PRO_COLS: ColumnConfig[] = [
  { key: 'eligibility', label: 'Eligibility', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'messaged', label: 'Messaged', defaultVisible: true },
  { key: 'response', label: 'Response', defaultVisible: true },
];

export const PlayerOutreach = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("youth");
  const [youthData, setYouthData] = useState<YouthOutreach[]>([]);
  const [proData, setProData] = useState<ProOutreach[]>([]);
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [ageRules, setAgeRules] = useState<AgeRule[]>([]);
  const [clubCountryMap, setClubCountryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<YouthOutreach | ProOutreach | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('player_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const youthSettings = useTableSettings('outreach-youth', OUTREACH_YOUTH_COLS);
  const proSettings = useTableSettings('outreach-pro', OUTREACH_PRO_COLS);
  const dragScrollRef = useHorizontalDragScroll();

  const [youthFormData, setYouthFormData] = useState({
    player_name: "", ig_handle: "", current_club: "", date_of_birth: "",
    position: "", nationality: "",
    messaged: false, response_received: false, parents_name: "", parent_contact: "",
    parent_approval: false, initial_message: "", notes: ""
  });
  const [proFormData, setProFormData] = useState({
    player_name: "", ig_handle: "", current_club: "", date_of_birth: "",
    position: "", nationality: "",
    messaged: false, response_received: false, initial_message: "", notes: ""
  });

  const canEdit = true;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [youthResult, proResult, ratingsResult, rulesResult, clubsResult] = await Promise.all([
        supabase.from("player_outreach_youth").select("*").order("created_at", { ascending: false }),
        supabase.from("player_outreach_pro").select("*").order("created_at", { ascending: false }),
        supabase.from("club_ratings").select("club_name, first_team_rating, academy_rating"),
        supabase.from('recruitment_age_rules').select('country, country_code, min_contact_age'),
        supabase.from('club_map_positions').select('club_name, country'),
      ]);

      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      const countryMap: Record<string, string> = {};
      clubsResult.data?.forEach(c => { if (c.club_name && c.country) countryMap[c.club_name.toLowerCase()] = c.country; });

      // Auto-move 18+ youth to pro
      let youthFiltered = youthResult.data || [];
      const toMove = youthFiltered.filter(item => {
        if (!item.date_of_birth) return false;
        const age = calculateAge(item.date_of_birth);
        return age !== null && age >= 18;
      });

      if (toMove.length > 0) {
        for (const item of toMove) {
          await supabase.from('player_outreach_pro').insert({
            player_name: item.player_name,
            ig_handle: item.ig_handle,
            current_club: (item as any).current_club,
            date_of_birth: item.date_of_birth,
            messaged: item.messaged,
            response_received: item.response_received,
            initial_message: item.initial_message,
            notes: item.notes,
            position: (item as any).position,
            nationality: (item as any).nationality,
          });
          await supabase.from('player_outreach_youth').delete().eq('id', item.id);
        }
        toast.info(`${toMove.length} player(s) auto-moved to Pro (turned 18)`);
        const { data: refreshed } = await supabase.from('player_outreach_youth').select('*').order('created_at', { ascending: false });
        youthFiltered = refreshed || [];
        const { data: refreshedPro } = await supabase.from('player_outreach_pro').select('*').order('created_at', { ascending: false });
        setProData(refreshedPro || []);
      } else {
        setProData(proResult.data || []);
      }

      setYouthData(youthFiltered);
      setClubRatings(ratingsResult.data || []);
      setAgeRules(rulesResult.data || []);
      setClubCountryMap(countryMap);
    } catch (error: any) {
      console.error("Error fetching outreach data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortAndFilter = <T extends { player_name: string; current_club?: string | null; date_of_birth?: string | null; nationality?: string | null }>(data: T[]): T[] => {
    let result = data;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.player_name.toLowerCase().includes(q) ||
        d.current_club?.toLowerCase().includes(q) ||
        (d as any).nationality?.toLowerCase().includes(q) ||
        (d as any).position?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'player_name': cmp = a.player_name.localeCompare(b.player_name); break;
        case 'age': {
          const ageA = calculateAge(a.date_of_birth || null) ?? 999;
          const ageB = calculateAge(b.date_of_birth || null) ?? 999;
          cmp = ageA - ageB; break;
        }
        case 'current_club': cmp = (a.current_club || 'ZZZ').localeCompare(b.current_club || 'ZZZ'); break;
        case 'nationality': cmp = ((a as any).nationality || 'ZZZ').localeCompare((b as any).nationality || 'ZZZ'); break;
        case 'date_of_birth': cmp = (a.date_of_birth || '9999').localeCompare(b.date_of_birth || '9999'); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  };

  const handleYouthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = { ...youthFormData, age: youthFormData.date_of_birth ? calculateAge(youthFormData.date_of_birth) : null };
      if (editingItem && 'parents_name' in editingItem) {
        const { error } = await supabase.from("player_outreach_youth").update(submitData).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Youth outreach updated");
      } else {
        const { error } = await supabase.from("player_outreach_youth").insert([submitData]);
        if (error) throw error;
        toast.success("Youth outreach added");
      }
      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const handleProSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = { ...proFormData, age: proFormData.date_of_birth ? calculateAge(proFormData.date_of_birth) : null };
      if (editingItem && !('parents_name' in editingItem)) {
        const { error } = await supabase.from("player_outreach_pro").update(submitData).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Pro outreach updated");
      } else {
        const { error } = await supabase.from("player_outreach_pro").insert([submitData]);
        if (error) throw error;
        toast.success("Pro outreach added");
      }
      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const toggleYouthField = async (id: string, field: keyof Pick<YouthOutreach, 'messaged' | 'response_received' | 'parent_approval'>) => {
    const item = youthData.find(i => i.id === id);
    if (!item) return;
    const newValue = !item[field];
    setYouthData(prev => prev.map(i => i.id === id ? { ...i, [field]: newValue } : i));
    try {
      const { error } = await supabase.from("player_outreach_youth").update({ [field]: newValue }).eq("id", id);
      if (error) throw error;
    } catch {
      setYouthData(prev => prev.map(i => i.id === id ? { ...i, [field]: !newValue } : i));
      toast.error("Failed to save");
    }
  };

  const toggleProField = async (id: string, field: keyof Pick<ProOutreach, 'messaged' | 'response_received'>) => {
    const item = proData.find(i => i.id === id);
    if (!item) return;
    const newValue = !item[field];
    setProData(prev => prev.map(i => i.id === id ? { ...i, [field]: newValue } : i));
    try {
      const { error } = await supabase.from("player_outreach_pro").update({ [field]: newValue }).eq("id", id);
      if (error) throw error;
    } catch {
      setProData(prev => prev.map(i => i.id === id ? { ...i, [field]: !newValue } : i));
      toast.error("Failed to save");
    }
  };

  const handleEdit = (item: YouthOutreach | ProOutreach, type: 'youth' | 'pro') => {
    setEditingItem(item);
    if (type === 'youth' && 'parents_name' in item) {
      setYouthFormData({
        player_name: item.player_name, ig_handle: item.ig_handle || "", current_club: item.current_club || "",
        date_of_birth: item.date_of_birth || "", position: (item as any).position || "", nationality: (item as any).nationality || "",
        messaged: item.messaged, response_received: item.response_received,
        parents_name: item.parents_name || "", parent_contact: item.parent_contact || "",
        parent_approval: item.parent_approval, initial_message: item.initial_message || "", notes: item.notes || ""
      });
    } else {
      setProFormData({
        player_name: item.player_name, ig_handle: item.ig_handle || "", current_club: item.current_club || "",
        date_of_birth: item.date_of_birth || "", position: (item as any).position || "", nationality: (item as any).nationality || "",
        messaged: item.messaged, response_received: item.response_received,
        initial_message: item.initial_message || "", notes: item.notes || ""
      });
    }
    setDialogOpen(true);
  };

  const resetForms = () => {
    setEditingItem(null);
    setYouthFormData({ player_name: "", ig_handle: "", current_club: "", date_of_birth: "", position: "", nationality: "", messaged: false, response_received: false, parents_name: "", parent_contact: "", parent_approval: false, initial_message: "", notes: "" });
    setProFormData({ player_name: "", ig_handle: "", current_club: "", date_of_birth: "", position: "", nationality: "", messaged: false, response_received: false, initial_message: "", notes: "" });
  };

  const getStatusGroups = <T extends { messaged: boolean; response_received: boolean }>(data: T[]) => ({
    notMessaged: data.filter(d => !d.messaged),
    noResponse: data.filter(d => d.messaged && !d.response_received),
    responded: data.filter(d => d.response_received)
  });

  if (loading) return <div className="text-center p-8 text-muted-foreground">Loading outreach data...</div>;

  const filteredYouth = sortAndFilter(youthData);
  const filteredPro = sortAndFilter(proData);
  const youthGroups = getStatusGroups(filteredYouth);
  const proGroups = getStatusGroups(filteredPro);

  const renderYouthTable = (data: YouthOutreach[], title: string) => (
    <Card className="mb-4">
      <CardHeader><CardTitle className="text-base sm:text-lg">{title} ({data.length})</CardTitle></CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div ref={dragScrollRef} className="hidden lg:block overflow-x-auto cursor-grab active:cursor-grabbing">
          <Table>
            <TableHeader>
              <TableRow>
                {youthSettings.isVisible('eligibility') && <TableHead className="w-10"></TableHead>}
                {youthSettings.isVisible('name') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('player_name')}>
                    <div className="flex items-center">Name {getSortIcon('player_name')}</div>
                  </TableHead>
                )}
                {youthSettings.isVisible('ig') && <TableHead className="w-12 text-center">IG</TableHead>}
                {youthSettings.isVisible('nationality') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('nationality')}>
                    <div className="flex items-center">Nat {getSortIcon('nationality')}</div>
                  </TableHead>
                )}
                {youthSettings.isVisible('age') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                    <div className="flex items-center">Age {getSortIcon('age')}</div>
                  </TableHead>
                )}
                {youthSettings.isVisible('dob') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date_of_birth')}>
                    <div className="flex items-center">DOB {getSortIcon('date_of_birth')}</div>
                  </TableHead>
                )}
                {youthSettings.isVisible('club') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('current_club')}>
                    <div className="flex items-center">Club {getSortIcon('current_club')}</div>
                  </TableHead>
                )}
                {youthSettings.isVisible('parent') && <TableHead>Parent</TableHead>}
                {youthSettings.isVisible('parent_ig') && <TableHead className="w-10 text-center">P.IG</TableHead>}
                {youthSettings.isVisible('approval') && <TableHead className="text-center">Apr</TableHead>}
                {youthSettings.isVisible('messaged') && <TableHead className="text-center">MSG</TableHead>}
                {youthSettings.isVisible('response') && <TableHead className="text-center">RSP</TableHead>}
                {canEdit && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
              ) : data.map((item) => {
                const age = calculateAge(item.date_of_birth);
                return (
                  <TableRow key={item.id}>
                    {youthSettings.isVisible('eligibility') && (
                      <TableCell className="py-1.5">
                        <EligibilityBadge item={item} type="youth" clubCountryMap={clubCountryMap} ageRules={ageRules} />
                      </TableCell>
                    )}
                    {youthSettings.isVisible('name') && <TableCell className="bg-muted/30 font-bold py-1.5">{item.player_name}</TableCell>}
                    {youthSettings.isVisible('ig') && <TableCell className="text-center py-1.5"><InstagramIconLink handle={item.ig_handle} /></TableCell>}
                    {youthSettings.isVisible('nationality') && (
                      <TableCell className="py-1.5">
                        {(item as any).nationality ? (
                          <img src={getCountryFlagUrl((item as any).nationality)} alt={(item as any).nationality} className="w-5 h-auto rounded-sm" title={(item as any).nationality} />
                        ) : '-'}
                      </TableCell>
                    )}
                    {youthSettings.isVisible('age') && <TableCell className="py-1.5 text-sm">{age ?? '-'}</TableCell>}
                    {youthSettings.isVisible('dob') && (
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                      </TableCell>
                    )}
                    {youthSettings.isVisible('club') && (
                      <TableCell className="py-1.5">
                        <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={true} />
                      </TableCell>
                    )}
                    {youthSettings.isVisible('parent') && <TableCell className="py-1.5 text-sm">{item.parents_name || "-"}</TableCell>}
                    {youthSettings.isVisible('parent_ig') && <TableCell className="text-center py-1.5"><InstagramIconLink handle={item.parent_contact} /></TableCell>}
                    {youthSettings.isVisible('approval') && (
                      <TableCell className="text-center py-1.5">
                        <Checkbox checked={item.parent_approval} onCheckedChange={() => toggleYouthField(item.id, 'parent_approval')} />
                      </TableCell>
                    )}
                    {youthSettings.isVisible('messaged') && (
                      <TableCell className="text-center py-1.5">
                        <Checkbox checked={item.messaged} onCheckedChange={() => toggleYouthField(item.id, 'messaged')} />
                      </TableCell>
                    )}
                    {youthSettings.isVisible('response') && (
                      <TableCell className="text-center py-1.5">
                        <Checkbox checked={item.response_received} onCheckedChange={() => toggleYouthField(item.id, 'response_received')} />
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell className="py-1.5">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'youth')}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries</p>
          ) : data.map((item) => {
            const age = calculateAge(item.date_of_birth);
            return (
              <Card key={item.id} className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <EligibilityBadge item={item} type="youth" clubCountryMap={clubCountryMap} ageRules={ageRules} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{item.player_name}</span>
                      {age !== null && <span className="text-xs text-muted-foreground">{age}y</span>}
                      <InstagramIconLink handle={item.ig_handle} />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => handleEdit(item, 'youth')}><Edit className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={true} />
                    </div>
                    {item.parents_name && <div className="text-xs text-muted-foreground mt-0.5">Parent: {item.parents_name}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1 border-t">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={item.parent_approval} onCheckedChange={() => toggleYouthField(item.id, 'parent_approval')} />
                    <span className="text-[10px] text-muted-foreground">APR</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={item.messaged} onCheckedChange={() => toggleYouthField(item.id, 'messaged')} />
                    <span className="text-[10px] text-muted-foreground">MSG</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={item.response_received} onCheckedChange={() => toggleYouthField(item.id, 'response_received')} />
                    <span className="text-[10px] text-muted-foreground">RSP</span>
                  </label>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderProTable = (data: ProOutreach[], title: string) => (
    <Card className="mb-4">
      <CardHeader><CardTitle className="text-base sm:text-lg">{title} ({data.length})</CardTitle></CardHeader>
      <CardContent>
        <div ref={dragScrollRef} className="hidden lg:block overflow-x-auto cursor-grab active:cursor-grabbing">
          <Table>
            <TableHeader>
              <TableRow>
                {proSettings.isVisible('eligibility') && <TableHead className="w-10"></TableHead>}
                {proSettings.isVisible('name') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('player_name')}>
                    <div className="flex items-center">Name {getSortIcon('player_name')}</div>
                  </TableHead>
                )}
                {proSettings.isVisible('ig') && <TableHead className="w-12 text-center">IG</TableHead>}
                {proSettings.isVisible('nationality') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('nationality')}>
                    <div className="flex items-center">Nat {getSortIcon('nationality')}</div>
                  </TableHead>
                )}
                {proSettings.isVisible('age') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                    <div className="flex items-center">Age {getSortIcon('age')}</div>
                  </TableHead>
                )}
                {proSettings.isVisible('dob') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date_of_birth')}>
                    <div className="flex items-center">DOB {getSortIcon('date_of_birth')}</div>
                  </TableHead>
                )}
                {proSettings.isVisible('club') && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('current_club')}>
                    <div className="flex items-center">Club {getSortIcon('current_club')}</div>
                  </TableHead>
                )}
                {proSettings.isVisible('messaged') && <TableHead className="text-center">MSG</TableHead>}
                {proSettings.isVisible('response') && <TableHead className="text-center">RSP</TableHead>}
                {canEdit && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
              ) : data.map((item) => {
                const age = calculateAge(item.date_of_birth);
                return (
                  <TableRow key={item.id}>
                    {proSettings.isVisible('eligibility') && (
                      <TableCell className="py-1.5">
                        <EligibilityBadge item={item} type="pro" clubCountryMap={clubCountryMap} ageRules={ageRules} />
                      </TableCell>
                    )}
                    {proSettings.isVisible('name') && <TableCell className="bg-muted/30 font-bold py-1.5">{item.player_name}</TableCell>}
                    {proSettings.isVisible('ig') && <TableCell className="text-center py-1.5"><InstagramIconLink handle={item.ig_handle} /></TableCell>}
                    {proSettings.isVisible('nationality') && (
                      <TableCell className="py-1.5">
                        {(item as any).nationality ? (
                          <img src={getCountryFlagUrl((item as any).nationality)} alt={(item as any).nationality} className="w-5 h-auto rounded-sm" title={(item as any).nationality} />
                        ) : '-'}
                      </TableCell>
                    )}
                    {proSettings.isVisible('age') && <TableCell className="py-1.5 text-sm">{age ?? '-'}</TableCell>}
                    {proSettings.isVisible('dob') && (
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                      </TableCell>
                    )}
                    {proSettings.isVisible('club') && (
                      <TableCell className="py-1.5">
                        <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={false} />
                      </TableCell>
                    )}
                    {proSettings.isVisible('messaged') && (
                      <TableCell className="text-center py-1.5">
                        <Checkbox checked={item.messaged} onCheckedChange={() => toggleProField(item.id, 'messaged')} />
                      </TableCell>
                    )}
                    {proSettings.isVisible('response') && (
                      <TableCell className="text-center py-1.5">
                        <Checkbox checked={item.response_received} onCheckedChange={() => toggleProField(item.id, 'response_received')} />
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell className="py-1.5">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item, 'pro')}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="lg:hidden space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries</p>
          ) : data.map((item) => {
            const age = calculateAge(item.date_of_birth);
            return (
              <Card key={item.id} className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <EligibilityBadge item={item} type="pro" clubCountryMap={clubCountryMap} ageRules={ageRules} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{item.player_name}</span>
                      {age !== null && <span className="text-xs text-muted-foreground">{age}y</span>}
                      <InstagramIconLink handle={item.ig_handle} />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => handleEdit(item, 'pro')}><Edit className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={false} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1 border-t">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={item.messaged} onCheckedChange={() => toggleProField(item.id, 'messaged')} />
                    <span className="text-[10px] text-muted-foreground">MSG</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={item.response_received} onCheckedChange={() => toggleProField(item.id, 'response_received')} />
                    <span className="text-[10px] text-muted-foreground">RSP</span>
                  </label>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Player Outreach
        </h2>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForms(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Entry" : `Add ${activeTab === 'youth' ? 'Youth' : 'Pro'} Outreach`}</DialogTitle>
              </DialogHeader>
              {activeTab === 'youth' ? (
                <form onSubmit={handleYouthSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Player Name *</Label><Input value={youthFormData.player_name} onChange={e => setYouthFormData({ ...youthFormData, player_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>IG Handle</Label><Input value={youthFormData.ig_handle} onChange={e => setYouthFormData({ ...youthFormData, ig_handle: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Current Club</Label><Input value={youthFormData.current_club} onChange={e => setYouthFormData({ ...youthFormData, current_club: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={youthFormData.date_of_birth} onChange={e => setYouthFormData({ ...youthFormData, date_of_birth: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Position</Label><Input value={youthFormData.position} onChange={e => setYouthFormData({ ...youthFormData, position: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Nationality</Label><Input value={youthFormData.nationality} onChange={e => setYouthFormData({ ...youthFormData, nationality: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Parents Name</Label><Input value={youthFormData.parents_name} onChange={e => setYouthFormData({ ...youthFormData, parents_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Parent Contact (IG)</Label><Input value={youthFormData.parent_contact} onChange={e => setYouthFormData({ ...youthFormData, parent_contact: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Initial Message</Label><Textarea value={youthFormData.initial_message} onChange={e => setYouthFormData({ ...youthFormData, initial_message: e.target.value })} rows={3} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={youthFormData.notes} onChange={e => setYouthFormData({ ...youthFormData, notes: e.target.value })} rows={2} /></div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2"><Switch checked={youthFormData.messaged} onCheckedChange={v => setYouthFormData({ ...youthFormData, messaged: v })} /><Label>Messaged</Label></div>
                    <div className="flex items-center space-x-2"><Switch checked={youthFormData.response_received} onCheckedChange={v => setYouthFormData({ ...youthFormData, response_received: v })} /><Label>Response</Label></div>
                    <div className="flex items-center space-x-2"><Switch checked={youthFormData.parent_approval} onCheckedChange={v => setYouthFormData({ ...youthFormData, parent_approval: v })} /><Label>Parent Approval</Label></div>
                  </div>
                  <Button type="submit" className="w-full">{editingItem ? "Update" : "Add"} Youth Outreach</Button>
                </form>
              ) : (
                <form onSubmit={handleProSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Player Name *</Label><Input value={proFormData.player_name} onChange={e => setProFormData({ ...proFormData, player_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>IG Handle</Label><Input value={proFormData.ig_handle} onChange={e => setProFormData({ ...proFormData, ig_handle: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Current Club</Label><Input value={proFormData.current_club} onChange={e => setProFormData({ ...proFormData, current_club: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={proFormData.date_of_birth} onChange={e => setProFormData({ ...proFormData, date_of_birth: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Position</Label><Input value={proFormData.position} onChange={e => setProFormData({ ...proFormData, position: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Nationality</Label><Input value={proFormData.nationality} onChange={e => setProFormData({ ...proFormData, nationality: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Initial Message</Label><Textarea value={proFormData.initial_message} onChange={e => setProFormData({ ...proFormData, initial_message: e.target.value })} rows={3} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={proFormData.notes} onChange={e => setProFormData({ ...proFormData, notes: e.target.value })} rows={2} /></div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2"><Switch checked={proFormData.messaged} onCheckedChange={v => setProFormData({ ...proFormData, messaged: v })} /><Label>Messaged</Label></div>
                    <div className="flex items-center space-x-2"><Switch checked={proFormData.response_received} onCheckedChange={v => setProFormData({ ...proFormData, response_received: v })} /><Label>Response</Label></div>
                  </div>
                  <Button type="submit" className="w-full">{editingItem ? "Update" : "Add"} Pro Outreach</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, club, nationality..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Can contact</span>
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pro</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> Date from which contact allowed</span>
        <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> No DOB/rules</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="youth" className="text-sm sm:text-base py-2.5">Youth (U18)</TabsTrigger>
          <TabsTrigger value="pro" className="text-sm sm:text-base py-2.5">Pro</TabsTrigger>
        </TabsList>

        <TabsContent value="youth" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <TableSettingsPopover
              storageKey="outreach-youth"
              columns={OUTREACH_YOUTH_COLS}
              visibleColumns={youthSettings.visibleColumns}
              onToggleColumn={youthSettings.toggleColumn}
              showViewToggle={false}
            />
          </div>
          {renderYouthTable(youthGroups.notMessaged, "Not Messaged Yet")}
          {renderYouthTable(youthGroups.noResponse, "No Response")}
          {renderYouthTable(youthGroups.responded, "Response Received")}
        </TabsContent>

        <TabsContent value="pro" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <TableSettingsPopover
              storageKey="outreach-pro"
              columns={OUTREACH_PRO_COLS}
              visibleColumns={proSettings.visibleColumns}
              onToggleColumn={proSettings.toggleColumn}
              showViewToggle={false}
            />
          </div>
          {renderProTable(proGroups.notMessaged, "Not Messaged Yet")}
          {renderProTable(proGroups.noResponse, "No Response")}
          {renderProTable(proGroups.responded, "Response Received")}
        </TabsContent>
      </Tabs>
    </div>
  );
};
