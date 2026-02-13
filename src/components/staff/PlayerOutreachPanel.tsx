import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateAge, calculatePreciseAge, getEligibleDate } from '@/lib/ageUtils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FaInstagram } from 'react-icons/fa';
import { Plus, Edit, CheckCircle2, HelpCircle, Clock, Star, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { TableSettingsPopover, useTableSettings, type ColumnConfig } from './TableSettingsPopover';

interface Props {
  type: 'youth' | 'pro';
}

interface AgeRule {
  country: string;
  country_code: string;
  min_contact_age: number | null;
}

const normalizeClubName = (name: string): string => {
  return name.toLowerCase().replace(/[''`]/g, '').replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
};

const findClubCountry = (clubName: string | null, clubCountryMap: Record<string, string>): string | null => {
  if (!clubName) return null;
  const lower = clubName.toLowerCase();
  if (clubCountryMap[lower]) return clubCountryMap[lower];
  const normalized = normalizeClubName(clubName);
  for (const [key, country] of Object.entries(clubCountryMap)) {
    const normKey = normalizeClubName(key);
    if (normKey.includes(normalized) || normalized.includes(normKey)) return country;
  }
  return null;
};

interface ClubRating {
  club_name: string;
  first_team_rating: string;
  academy_rating: string;
}

const findClubRating = (clubName: string | null, ratings: ClubRating[], isYouth: boolean): string | null => {
  if (!clubName || ratings.length === 0) return null;
  const normalized = normalizeClubName(clubName);
  for (const rating of ratings) {
    const normRating = normalizeClubName(rating.club_name);
    if (normRating === normalized || normRating.includes(normalized) || normalized.includes(normRating)) {
      return isYouth ? rating.academy_rating : rating.first_team_rating;
    }
  }
  return null;
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

const IgLink = ({ handle }: { handle: string | null }) => {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;
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

const EligibilityBadge = ({ item, type, clubCountryMap, ageRules }: {
  item: any; type: 'youth' | 'pro'; clubCountryMap: Record<string, string>; ageRules: AgeRule[];
}) => {
  if (type === 'pro') {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex items-center"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /></span>
      </TooltipTrigger><TooltipContent><p>Pro player, can be contacted directly</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  if (!item.date_of_birth) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex items-center"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>No date of birth set</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  const clubCountry = findClubCountry(item.current_club, clubCountryMap);
  if (!clubCountry) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex items-center"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>Club country unknown</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  const rule = ageRules.find(r => r.country.toLowerCase() === clubCountry.toLowerCase());
  if (!rule || rule.min_contact_age === null) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex items-center"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>No age rules for {clubCountry}</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  const preciseAge = calculatePreciseAge(item.date_of_birth);
  if (preciseAge === null) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  if (preciseAge >= rule.min_contact_age) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>
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

type SortField = 'player_name' | 'age' | 'current_club' | 'nationality' | 'date_of_birth';
type SortDir = 'asc' | 'desc';

const YOUTH_COLUMNS: ColumnConfig[] = [
  { key: 'eligibility', label: 'Eligibility', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'position', label: 'Position', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'parent', label: 'Parent', defaultVisible: true },
  { key: 'parent_ig', label: 'Parent IG', defaultVisible: true },
  { key: 'approval', label: 'Approval', defaultVisible: true },
  { key: 'messaged', label: 'Messaged', defaultVisible: true },
  { key: 'response', label: 'Response', defaultVisible: true },
  { key: 'notes', label: 'Notes', defaultVisible: false },
];

const PRO_COLUMNS: ColumnConfig[] = [
  { key: 'eligibility', label: 'Eligibility', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'position', label: 'Position', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'messaged', label: 'Messaged', defaultVisible: true },
  { key: 'response', label: 'Response', defaultVisible: true },
  { key: 'notes', label: 'Notes', defaultVisible: false },
];

export const PlayerOutreachPanel = ({ type }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageRules, setAgeRules] = useState<AgeRule[]>([]);
  const [clubCountryMap, setClubCountryMap] = useState<Record<string, string>>({});
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('player_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const columns = type === 'youth' ? YOUTH_COLUMNS : PRO_COLUMNS;
  const settings = useTableSettings(`outreach-panel-${type}`, columns);

  const emptyYouthForm = {
    player_name: '', ig_handle: '', current_club: '', date_of_birth: '',
    position: '', nationality: '',
    parents_name: '', parent_contact: '', parent_approval: false,
    messaged: false, response_received: false, initial_message: '', notes: ''
  };
  const emptyProForm = {
    player_name: '', ig_handle: '', current_club: '', date_of_birth: '',
    position: '', nationality: '',
    messaged: false, response_received: false, initial_message: '', notes: ''
  };

  const [formData, setFormData] = useState<any>(type === 'youth' ? emptyYouthForm : emptyProForm);

  useEffect(() => { fetchData(); }, [type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
      const [dataResult, rulesResult, clubsResult, ratingsResult] = await Promise.all([
        supabase.from(tableName).select('*').order('created_at', { ascending: false }),
        supabase.from('recruitment_age_rules').select('country, country_code, min_contact_age'),
        supabase.from('club_map_positions').select('club_name, country'),
        supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating')
      ]);
      if (dataResult.error) throw dataResult.error;

      const countryMap: Record<string, string> = {};
      clubsResult.data?.forEach(club => {
        if (club.club_name && club.country) countryMap[club.club_name.toLowerCase()] = club.country;
      });

      let outreachData = dataResult.data || [];
      setAgeRules(rulesResult.data || []);
      setClubCountryMap(countryMap);
      setClubRatings(ratingsResult.data || []);

      // Auto-move 18+ youth to pro
      if (type === 'youth') {
        const toMove = outreachData.filter(item => {
          if (!item.date_of_birth) return false;
          const age = calculateAge(item.date_of_birth);
          return age !== null && age >= 18;
        });
        if (toMove.length > 0) {
          for (const item of toMove) {
            await supabase.from('player_outreach_pro').insert({
              player_name: item.player_name, ig_handle: item.ig_handle,
              current_club: item.current_club, date_of_birth: item.date_of_birth,
              messaged: item.messaged, response_received: item.response_received,
              initial_message: item.initial_message, notes: item.notes,
              age: 18, position: item.position, nationality: item.nationality
            });
            await supabase.from('player_outreach_youth').delete().eq('id', item.id);
          }
          toast.info(`${toMove.length} player(s) auto-moved to Pro (turned 18)`);
          const { data: refreshed } = await supabase.from('player_outreach_youth')
            .select('*').order('created_at', { ascending: false });
          outreachData = refreshed || [];
        }
      }
      setData(outreachData);
    } catch (error) {
      console.error(`Error fetching ${type} outreach:`, error);
      toast.error(`Failed to load ${type} outreach data`);
    } finally {
      setLoading(false);
    }
  };

  const toggleField = async (id: string, field: string, currentValue: boolean) => {
    const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
    setData(prev => prev.map(item => item.id === id ? { ...item, [field]: !currentValue } : item));
    try {
      const { error } = await supabase.from(tableName).update({ [field]: !currentValue }).eq('id', id);
      if (error) throw error;
    } catch {
      setData(prev => prev.map(item => item.id === id ? { ...item, [field]: currentValue } : item));
      toast.error('Failed to save');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (type === 'youth') {
      setFormData({
        player_name: item.player_name || '', ig_handle: item.ig_handle || '',
        current_club: item.current_club || '', date_of_birth: item.date_of_birth || '',
        position: item.position || '', nationality: item.nationality || '',
        parents_name: item.parents_name || '', parent_contact: item.parent_contact || '',
        parent_approval: item.parent_approval || false,
        messaged: item.messaged || false, response_received: item.response_received || false,
        initial_message: item.initial_message || '', notes: item.notes || ''
      });
    } else {
      setFormData({
        player_name: item.player_name || '', ig_handle: item.ig_handle || '',
        current_club: item.current_club || '', date_of_birth: item.date_of_birth || '',
        position: item.position || '', nationality: item.nationality || '',
        messaged: item.messaged || false, response_received: item.response_received || false,
        initial_message: item.initial_message || '', notes: item.notes || ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
    const submitData = { ...formData };
    if (submitData.date_of_birth) submitData.age = calculateAge(submitData.date_of_birth);
    try {
      if (editingItem) {
        const { error } = await supabase.from(tableName).update(submitData).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Entry updated');
      } else {
        const { error } = await supabase.from(tableName).insert([submitData]);
        if (error) throw error;
        toast.success('Entry added');
      }
      setDialogOpen(false);
      setEditingItem(null);
      setFormData(type === 'youth' ? emptyYouthForm : emptyProForm);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
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

  const sortAndFilter = (items: any[]): any[] => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.player_name?.toLowerCase().includes(q) ||
        d.current_club?.toLowerCase().includes(q) ||
        d.nationality?.toLowerCase().includes(q) ||
        d.position?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'player_name': cmp = (a.player_name || '').localeCompare(b.player_name || ''); break;
        case 'age': cmp = (calculateAge(a.date_of_birth) ?? 999) - (calculateAge(b.date_of_birth) ?? 999); break;
        case 'current_club': cmp = (a.current_club || 'ZZZ').localeCompare(b.current_club || 'ZZZ'); break;
        case 'nationality': cmp = (a.nationality || 'ZZZ').localeCompare(b.nationality || 'ZZZ'); break;
        case 'date_of_birth': cmp = (a.date_of_birth || '9999').localeCompare(b.date_of_birth || '9999'); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text={`Loading ${type} outreach...`} />;
  }

  const notMessaged = data.filter(d => !d.messaged);
  const noResponse = data.filter(d => d.messaged && !d.response_received);
  const responded = data.filter(d => d.response_received);
  const isYouth = type === 'youth';

  const renderTableSection = (items: any[], title: string) => {
    const sorted = sortAndFilter(items);
    return (
      <div className="border rounded-lg overflow-hidden mb-4">
        <div className="bg-muted/50 px-3 py-2 font-semibold text-sm">
          {title} ({sorted.length})
        </div>
        {sorted.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No entries</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {settings.isVisible('eligibility') && <TableHead className="w-10"></TableHead>}
                    {settings.isVisible('name') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('player_name')}>
                        <div className="flex items-center">Name {getSortIcon('player_name')}</div>
                      </TableHead>
                    )}
                    {settings.isVisible('ig') && <TableHead className="w-12 text-center">IG</TableHead>}
                    {settings.isVisible('nationality') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('nationality')}>
                        <div className="flex items-center">Nat {getSortIcon('nationality')}</div>
                      </TableHead>
                    )}
                    {settings.isVisible('position') && <TableHead>Pos</TableHead>}
                    {settings.isVisible('age') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                        <div className="flex items-center">Age {getSortIcon('age')}</div>
                      </TableHead>
                    )}
                    {settings.isVisible('dob') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date_of_birth')}>
                        <div className="flex items-center">DOB {getSortIcon('date_of_birth')}</div>
                      </TableHead>
                    )}
                    {settings.isVisible('club') && (
                      <TableHead className="cursor-pointer" onClick={() => handleSort('current_club')}>
                        <div className="flex items-center">Club {getSortIcon('current_club')}</div>
                      </TableHead>
                    )}
                    {isYouth && settings.isVisible('parent') && <TableHead>Parent</TableHead>}
                    {isYouth && settings.isVisible('parent_ig') && <TableHead className="w-10 text-center">P.IG</TableHead>}
                    {isYouth && settings.isVisible('approval') && <TableHead className="text-center">Apr</TableHead>}
                    {settings.isVisible('messaged') && <TableHead className="text-center">MSG</TableHead>}
                    {settings.isVisible('response') && <TableHead className="text-center">RSP</TableHead>}
                    {settings.isVisible('notes') && <TableHead>Notes</TableHead>}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(item => {
                    const age = calculateAge(item.date_of_birth);
                    return (
                      <TableRow key={item.id}>
                        {settings.isVisible('eligibility') && (
                          <TableCell className="py-1.5">
                            <EligibilityBadge item={item} type={type} clubCountryMap={clubCountryMap} ageRules={ageRules} />
                          </TableCell>
                        )}
                        {settings.isVisible('name') && (
                          <TableCell className="bg-muted/30 font-bold py-1.5">{item.player_name}</TableCell>
                        )}
                        {settings.isVisible('ig') && (
                          <TableCell className="text-center py-1.5"><IgLink handle={item.ig_handle} /></TableCell>
                        )}
                        {settings.isVisible('nationality') && (
                          <TableCell className="py-1.5">
                            {item.nationality ? (
                              <img src={getCountryFlagUrl(item.nationality)} alt={item.nationality} className="w-5 h-auto rounded-sm" title={item.nationality} />
                            ) : '-'}
                          </TableCell>
                        )}
                        {settings.isVisible('position') && (
                          <TableCell className="py-1.5">
                            {item.position ? <Badge variant="outline" className="text-[10px] px-1 py-0">{item.position}</Badge> : '-'}
                          </TableCell>
                        )}
                        {settings.isVisible('age') && (
                          <TableCell className="py-1.5 text-sm">{age ?? '-'}</TableCell>
                        )}
                        {settings.isVisible('dob') && (
                          <TableCell className="py-1.5 text-xs text-muted-foreground">
                            {item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                          </TableCell>
                        )}
                        {settings.isVisible('club') && (
                          <TableCell className="py-1.5">
                            <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={isYouth} />
                          </TableCell>
                        )}
                        {isYouth && settings.isVisible('parent') && (
                          <TableCell className="py-1.5 text-sm">{item.parents_name || '-'}</TableCell>
                        )}
                        {isYouth && settings.isVisible('parent_ig') && (
                          <TableCell className="text-center py-1.5"><IgLink handle={item.parent_contact} /></TableCell>
                        )}
                        {isYouth && settings.isVisible('approval') && (
                          <TableCell className="text-center py-1.5">
                            <Checkbox checked={item.parent_approval} onCheckedChange={() => toggleField(item.id, 'parent_approval', item.parent_approval)} />
                          </TableCell>
                        )}
                        {settings.isVisible('messaged') && (
                          <TableCell className="text-center py-1.5">
                            <Checkbox checked={item.messaged} onCheckedChange={() => toggleField(item.id, 'messaged', item.messaged)} />
                          </TableCell>
                        )}
                        {settings.isVisible('response') && (
                          <TableCell className="text-center py-1.5">
                            <Checkbox checked={item.response_received} onCheckedChange={() => toggleField(item.id, 'response_received', item.response_received)} />
                          </TableCell>
                        )}
                        {settings.isVisible('notes') && (
                          <TableCell className="py-1.5 text-xs text-muted-foreground max-w-[150px] truncate">{item.notes || '-'}</TableCell>
                        )}
                        <TableCell className="py-1.5">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {sorted.map(item => {
                const age = calculateAge(item.date_of_birth);
                return (
                  <div key={item.id} className="p-3 border-b last:border-b-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <EligibilityBadge item={item} type={type} clubCountryMap={clubCountryMap} ageRules={ageRules} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{item.player_name}</span>
                          {age !== null && <span className="text-xs text-muted-foreground flex-shrink-0">{age}y</span>}
                          {item.position && <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">{item.position}</Badge>}
                          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                            <IgLink handle={item.ig_handle} />
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(item)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {item.current_club && (
                          <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                            <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={isYouth} />
                          </div>
                        )}
                        {isYouth && item.parents_name && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>Parent: {item.parents_name}</span>
                            <IgLink handle={item.parent_contact} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={item.messaged} onCheckedChange={() => toggleField(item.id, 'messaged', item.messaged)} />
                            <span className="text-[10px] text-muted-foreground">MSG</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={item.response_received} onCheckedChange={() => toggleField(item.id, 'response_received', item.response_received)} />
                            <span className="text-[10px] text-muted-foreground">RSP</span>
                          </label>
                          {isYouth && (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <Checkbox checked={item.parent_approval} onCheckedChange={() => toggleField(item.id, 'parent_approval', item.parent_approval)} />
                              <span className="text-[10px] text-muted-foreground">APR</span>
                            </label>
                          )}
                        </div>
                        {item.notes && <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.notes}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {data.length} {type} outreach entries
        </div>
        <div className="flex items-center gap-1">
          <TableSettingsPopover
            storageKey={`outreach-panel-${type}`}
            columns={columns}
            visibleColumns={settings.visibleColumns}
            onToggleColumn={settings.toggleColumn}
            showViewToggle={false}
          />
          <Button size="sm" variant="outline" onClick={() => {
            setEditingItem(null);
            setFormData(type === 'youth' ? emptyYouthForm : emptyProForm);
            setDialogOpen(true);
          }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, club, nationality..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-2 px-1">
        {type === 'youth' ? (
          <>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Can contact</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> Date from which contact allowed</span>
            <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> No DOB/rules</span>
          </>
        ) : (
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pro: can be contacted directly</span>
        )}
      </div>

      {renderTableSection(notMessaged, 'Not Messaged')}
      {renderTableSection(noResponse, 'Awaiting Response')}
      {renderTableSection(responded, 'Responded')}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingItem(null); setFormData(type === 'youth' ? emptyYouthForm : emptyProForm); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {type === 'youth' ? 'Youth' : 'Pro'} Outreach</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Player Name *</Label><Input value={formData.player_name} onChange={e => setFormData({ ...formData, player_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>IG Handle</Label><Input value={formData.ig_handle} onChange={e => setFormData({ ...formData, ig_handle: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Current Club</Label><Input value={formData.current_club} onChange={e => setFormData({ ...formData, current_club: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Position</Label><Input value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nationality</Label><Input value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} /></div>
            </div>
            {type === 'youth' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Parent's Name</Label><Input value={formData.parents_name} onChange={e => setFormData({ ...formData, parents_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Parent Contact (IG)</Label><Input value={formData.parent_contact} onChange={e => setFormData({ ...formData, parent_contact: e.target.value })} /></div>
              </div>
            )}
            <div className="space-y-2"><Label>Initial Message</Label><Textarea value={formData.initial_message} onChange={e => setFormData({ ...formData, initial_message: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2"><Switch checked={formData.messaged} onCheckedChange={v => setFormData({ ...formData, messaged: v })} /><Label>Messaged</Label></div>
              <div className="flex items-center space-x-2"><Switch checked={formData.response_received} onCheckedChange={v => setFormData({ ...formData, response_received: v })} /><Label>Response</Label></div>
              {type === 'youth' && (
                <div className="flex items-center space-x-2"><Switch checked={formData.parent_approval} onCheckedChange={v => setFormData({ ...formData, parent_approval: v })} /><Label>Parent Approval</Label></div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">{editingItem ? 'Update' : 'Add'}</Button>
              {editingItem && (
                <Button type="button" variant="destructive" onClick={() => { handleDelete(editingItem.id); setDialogOpen(false); }}>Delete</Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
