import { useState, useEffect, useMemo, useDeferredValue, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateAge, calculatePreciseAge, getEligibleDate } from '@/lib/ageUtils';
import { matchesQuery } from '@/lib/searchMatch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BlurInput } from '@/components/staff/BlurInput';
import { BlurTextarea } from '@/components/staff/BlurTextarea';
import { SearchWithSuggestions } from '@/components/staff/SearchWithSuggestions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FaInstagram } from 'react-icons/fa';
import { Plus, Edit, CheckCircle2, HelpCircle, Clock, Star, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { TableSettingsPopover, useTableSettings, type ColumnConfig } from './TableSettingsPopover';
import { FitScoreBadge } from './recruitment/FitScoreBadge';
import { StarToggle } from './recruitment/StarToggle';
import { normalisePosition } from '@/lib/positionNormalise';
import { computeFitScore } from '@/lib/fitScore';
import { useRecruitmentTargets, useScoringSettings } from '@/hooks/useRecruitmentScoring';
import { normalizeClubName, findClubCountry, findClubRating as findClubRatingUtil } from '@/lib/clubNameUtils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  type: 'youth' | 'pro';
}

interface AgeRule {
  country: string;
  country_code: string;
  min_contact_age: number | null;
}

interface ClubRating {
  club_name: string;
  first_team_rating: string;
  academy_rating: string;
  country?: string | null;
}

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

const IgTooltipIcon = ({ handle }: { handle: string | null }) => {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <button
        onClick={(e) => { e.stopPropagation(); window.open(`https://instagram.com/${clean}`, '_blank', 'noopener,noreferrer'); }}
        className="p-0.5 hover:scale-110 transition-transform"
      >
        <FaInstagram className="h-4 w-4 text-[#E1306C]" />
      </button>
    </TooltipTrigger><TooltipContent><p>@{clean}</p></TooltipContent></Tooltip></TooltipProvider>
  );
};

const ClubDisplay = ({ clubName, clubCountryMap, ageRules, clubRatings, isYouth }: {
  clubName: string | null; clubCountryMap: Record<string, string>; ageRules: AgeRule[]; clubRatings: ClubRating[]; isYouth: boolean;
}) => {
  if (!clubName) return <span className="text-muted-foreground">-</span>;
  const clubCountry = findClubCountry(clubName, clubCountryMap);
  const rule = clubCountry ? ageRules.find(r => r.country.toLowerCase() === clubCountry.toLowerCase()) : null;
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {clubCountry && <img src={getCountryFlagUrl(clubCountry)} alt={clubCountry} className="w-4 h-3 object-cover rounded-sm" />}
        <span className="truncate">{clubName}</span>
        <ClubRatingBadge rating={findClubRatingUtil(clubName, clubRatings, isYouth)} />
        {rule?.min_contact_age != null && isYouth && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">{rule.min_contact_age}</Badge>
        )}
      </span>
    </TooltipTrigger><TooltipContent><p>{clubName}{clubCountry ? ` (${clubCountry})` : ''}</p></TooltipContent></Tooltip></TooltipProvider>
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

type SortField = 'player_name' | 'age' | 'current_club' | 'nationality' | 'date_of_birth' | 'fit_score';
type SortDir = 'asc' | 'desc';

const YOUTH_COLUMNS: ColumnConfig[] = [
  { key: 'star', label: 'Star', defaultVisible: true },
  { key: 'fit', label: 'Fit', defaultVisible: true },
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
  { key: 'star', label: 'Star', defaultVisible: true },
  { key: 'fit', label: 'Fit', defaultVisible: true },
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

const DEFAULT_SECTION_CAP = 100;
const PAGE_SIZE = 50;

export const PlayerOutreachPanel = ({ type }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageRules, setAgeRules] = useState<AgeRule[]>([]);
  const [clubCountryMap, setClubCountryMap] = useState<Record<string, string>>({});
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortField, setSortField] = useState<SortField>('player_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    notMessaged: true, noResponse: true, responded: true
  });
  const [sectionCaps, setSectionCaps] = useState<Record<string, number>>({});
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});

  // Filters
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [nationFilter, setNationFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [dobFrom, setDobFrom] = useState('');
  const [dobTo, setDobTo] = useState('');
  const [minFit, setMinFit] = useState<number>(0);

  // Reset pagination when the result set changes, but keep the current page when only the order changes.
  useEffect(() => { setSectionPages({}); }, [deferredSearchQuery, ageFilter, nationFilter, positionFilter, dobFrom, dobTo, minFit]);

  const columns = type === 'youth' ? YOUTH_COLUMNS : PRO_COLUMNS;
  const settings = useTableSettings(`outreach-panel-${type}`, columns);
  const dragScrollRef = useHorizontalDragScroll();
  const { targets } = useRecruitmentTargets();
  const { settings: scoringSettings } = useScoringSettings();

  // Pre-compute fit score per row so sorting/filtering by Fit applies across ALL pages,
  // not just the rows the FitScoreBadge has lazily rendered.
  const fitScoreById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of data) {
      try {
        const r = computeFitScore({
          position: row.position,
          age: calculateAge(row.date_of_birth) ?? row.age ?? null,
          date_of_birth: row.date_of_birth,
          nationality: row.nationality,
          current_club: row.current_club,
          club_country: findClubCountry(row.current_club, clubCountryMap),
          club_first_team_rating: findClubRatingUtil(row.current_club, clubRatings, type === 'youth') as any,
          messaged: row.messaged,
          response_received: row.response_received,
          response_status: row.response_status,
          parent_approval: row.parent_approval,
          last_contact_at: row.last_contact_at,
          national_team: row.national_team,
          star_of_team: row.star_of_team,
          previous_serious_injury: row.previous_serious_injury,
          agent_name: row.agent_name,
          agent_status: row.agent_status,
        } as any, targets, scoringSettings.weights, scoringSettings.age_sweet_spot_band, type, scoringSettings.bonus_weights,
           scoringSettings.position_adjacency_factor, scoringSettings.league_strength_weight,
           scoringSettings.position_weights);
        map[row.id] = Math.max(0, Math.min(100, Math.round(r.total)));
      } catch { map[row.id] = 0; }
    }
    return map;
  }, [data, targets, scoringSettings, type, clubCountryMap, clubRatings]);
  const { getHeaderProps, ResizeHandle } = useResizableColumns(`outreach-panel-${type}`);
  const isYouth = type === 'youth';

  const emptyYouthForm = {
    player_name: '', ig_handle: '', current_club: '', date_of_birth: '',
    position: '', nationality: '',
    parents_name: '', parent_contact: '', parent_approval: false,
    messaged: false, response_received: false, initial_message: '', notes: '',
    national_team: false, star_of_team: false, previous_serious_injury: '',
    transfermarkt_url: '', agent_name: '', agent_status: ''
  };
  const emptyProForm = {
    player_name: '', ig_handle: '', current_club: '', date_of_birth: '',
    position: '', nationality: '',
    messaged: false, response_received: false, initial_message: '', notes: '',
    national_team: false, star_of_team: false, previous_serious_injury: '',
    transfermarkt_url: '', agent_name: '', agent_status: ''
  };

  const [formData, setFormData] = useState<any>(isYouth ? emptyYouthForm : emptyProForm);

  useEffect(() => { fetchData(); }, [type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
      const [dataResult, rulesResult, clubsResult, ratingsResult] = await Promise.all([
        supabase.from(tableName).select('*').order('created_at', { ascending: false }),
        supabase.from('recruitment_age_rules').select('country, country_code, min_contact_age'),
        supabase.from('club_map_positions').select('club_name, country'),
        supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating, country')
      ]);
      if (dataResult.error) throw dataResult.error;

      const countryMap: Record<string, string> = {};
      clubsResult.data?.forEach(club => {
        if (club.club_name && club.country) countryMap[club.club_name.toLowerCase()] = club.country;
      });
      ratingsResult.data?.forEach((club: any) => {
        if (club.club_name && club.country && club.country !== 'Unknown') {
          countryMap[normalizeClubName(club.club_name)] = club.country;
        }
      });

      let outreachData = dataResult.data || [];
      setAgeRules(rulesResult.data || []);
      setClubCountryMap(countryMap);
      setClubRatings(ratingsResult.data || []);
      setData(outreachData);
      setLoading(false);

      // Auto-move 18+ youth → pro AFTER first paint so the table is not blocked.
      if (isYouth) {
        const toMove = outreachData.filter(item => {
          if (!item.date_of_birth) return false;
          const age = calculateAge(item.date_of_birth);
          return age !== null && age >= 18;
        });
        if (toMove.length > 0) {
          (async () => {
            try {
              await Promise.all(toMove.map(item =>
                supabase.from('player_outreach_pro').insert({
                  player_name: item.player_name, ig_handle: item.ig_handle,
                  current_club: item.current_club, date_of_birth: item.date_of_birth,
                  messaged: item.messaged, response_received: item.response_received,
                  initial_message: item.initial_message, notes: item.notes,
                  age: 18, position: item.position, nationality: item.nationality
                }).then(() => supabase.from('player_outreach_youth').delete().eq('id', item.id))
              ));
              toast.info(`${toMove.length} player(s) auto-moved to Pro (turned 18)`);
              setData(prev => prev.filter(d => !toMove.some(m => m.id === d.id)));
            } catch (e) { /* ignore background move errors */ }
          })();
        }
      }
      return;
    } catch (error) {
      console.error(`Error fetching ${type} outreach:`, error);
      toast.error(`Failed to load ${type} outreach data`);
      setLoading(false);
    }
  };

  const uniqueNations = useMemo(() => {
    return [...new Set(data.map(d => d.nationality).filter((n): n is string => !!n))].sort();
  }, [data]);

  const uniquePositions = useMemo(() => {
    return [...new Set(data.map(d => d.position).filter((p): p is string => !!p))].sort();
  }, [data]);

  const toggleField = async (id: string, field: string, currentValue: boolean) => {
    const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
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
    if (isYouth) {
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

  const openDetail = (item: any) => {
    setDetailItem(item);
    setDetailEditMode(false);
    setFormData(isYouth ? {
      player_name: item.player_name || '', ig_handle: item.ig_handle || '',
      current_club: item.current_club || '', date_of_birth: item.date_of_birth || '',
      position: item.position || '', nationality: item.nationality || '',
      parents_name: item.parents_name || '', parent_contact: item.parent_contact || '',
      parent_approval: item.parent_approval || false,
      messaged: item.messaged || false, response_received: item.response_received || false,
      initial_message: item.initial_message || '', notes: item.notes || '',
      national_team: !!item.national_team, star_of_team: !!item.star_of_team,
      previous_serious_injury: item.previous_serious_injury || ''
    } : {
      player_name: item.player_name || '', ig_handle: item.ig_handle || '',
      current_club: item.current_club || '', date_of_birth: item.date_of_birth || '',
      position: item.position || '', nationality: item.nationality || '',
      messaged: item.messaged || false, response_received: item.response_received || false,
      initial_message: item.initial_message || '', notes: item.notes || '',
      national_team: !!item.national_team, star_of_team: !!item.star_of_team,
      previous_serious_injury: item.previous_serious_injury || ''
    });
    setDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
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
      setFormData(isYouth ? emptyYouthForm : emptyProForm);
      // After adding: clear filters, expand "Not Messaged", refetch
      if (!editingItem) {
        setSearchQuery('');
        setAgeFilter('all');
        setNationFilter('all');
        setPositionFilter([]);
        setDobFrom('');
        setDobTo('');
        setExpandedSections(prev => ({ ...prev, notMessaged: true }));
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleDetailSave = async () => {
    if (!detailItem) return;
    const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
    const submitData = { ...formData };
    if (submitData.date_of_birth) submitData.age = calculateAge(submitData.date_of_birth);
    try {
      const { error } = await supabase.from(tableName).update(submitData).eq('id', detailItem.id);
      if (error) throw error;
      toast.success('Updated');
      setDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
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
      // Fit should default to highest-first; everything else stays alphabetical/ascending.
      setSortDir(field === 'fit_score' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortAndFilter = (items: any[]): any[] => {
    let result = items;
    if (deferredSearchQuery) {
      result = result.filter(d => matchesQuery(deferredSearchQuery, [
        d.player_name,
        d.current_club,
        d.nationality,
        d.position,
        d.date_of_birth,
        (d as any).agent_name,
      ]));
    }
    // Apply filters
    if (ageFilter !== 'all') {
      result = result.filter(d => {
        const age = d.date_of_birth ? calculateAge(d.date_of_birth) : null;
        if (!age) return false;
        switch (ageFilter) {
          case 'u18': return age < 18;
          case '18-21': return age >= 18 && age <= 21;
          case '22-25': return age >= 22 && age <= 25;
          case '26-30': return age >= 26 && age <= 30;
          case '30+': return age >= 30;
          default: return true;
        }
      });
    }
    if (nationFilter !== 'all') {
      result = result.filter(d => d.nationality === nationFilter);
    }
    if (positionFilter.length > 0) {
      result = result.filter(d => d.position && positionFilter.includes(d.position));
    }
    if (dobFrom) {
      result = result.filter(d => d.date_of_birth && d.date_of_birth >= dobFrom);
    }
    if (dobTo) {
      result = result.filter(d => d.date_of_birth && d.date_of_birth <= dobTo);
    }
    if (minFit > 0) {
      result = result.filter(d => (fitScoreById[d.id] ?? 0) >= minFit);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'player_name': cmp = (a.player_name || '').localeCompare(b.player_name || ''); break;
        case 'age': cmp = (calculateAge(a.date_of_birth) ?? 999) - (calculateAge(b.date_of_birth) ?? 999); break;
        case 'current_club': cmp = (a.current_club || 'ZZZ').localeCompare(b.current_club || 'ZZZ'); break;
        case 'nationality': cmp = (a.nationality || 'ZZZ').localeCompare(b.nationality || 'ZZZ'); break;
        case 'date_of_birth': cmp = (a.date_of_birth || '9999').localeCompare(b.date_of_birth || '9999'); break;
        case 'fit_score': cmp = (fitScoreById[a.id] ?? -1) - (fitScoreById[b.id] ?? -1); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasActiveFilters = ageFilter !== 'all' || nationFilter !== 'all' || positionFilter.length > 0 || dobFrom || dobTo;
  const clearAllFilters = () => {
    setAgeFilter('all'); setNationFilter('all'); setPositionFilter([]); setDobFrom(''); setDobTo(''); setMinFit(0);
  };

  // Dynamic column rendering based on settings order
  const orderedVisibleKeys = settings.columnOrder.filter(k => settings.isVisible(k));

  const renderHeader = (key: string): ReactNode => {
    const sortableHeader = (label: string, field: SortField, extraClass = '') => (
      <TableHead key={key} className={`cursor-pointer relative ${extraClass}`} onClick={() => handleSort(field)} {...getHeaderProps(key)}>
        <div className="flex items-center">{label} {getSortIcon(field)}</div>
        <ResizeHandle columnKey={key} />
      </TableHead>
    );
    const plainHeader = (label: string, extraClass = '') => (
      <TableHead key={key} className={`relative ${extraClass}`} {...getHeaderProps(key)}>
        {label}<ResizeHandle columnKey={key} />
      </TableHead>
    );
    switch (key) {
      case 'star': return plainHeader('★', 'w-8 text-center');
      case 'eligibility': return plainHeader('', 'w-10');
      case 'fit': return sortableHeader('Fit', 'fit_score', 'w-14 text-center');
      case 'name': return sortableHeader('Name', 'player_name');
      case 'ig': return plainHeader('IG', 'w-12 text-center');
      case 'nationality': return sortableHeader('Nat', 'nationality');
      case 'position': return plainHeader('Pos');
      case 'age': return sortableHeader('Age', 'age');
      case 'dob': return sortableHeader('DOB', 'date_of_birth');
      case 'club': return sortableHeader('Club', 'current_club');
      case 'parent': return plainHeader('Parent');
      case 'parent_ig': return plainHeader('P.IG', 'w-10 text-center');
      case 'approval': return plainHeader('Apr', 'text-center');
      case 'messaged': return plainHeader('MSG', 'text-center');
      case 'response': return plainHeader('RSP', 'text-center');
      case 'notes': return plainHeader('Notes');
      default: return null;
    }
  };

  const renderCell = (key: string, item: any): ReactNode => {
    const age = calculateAge(item.date_of_birth);
    switch (key) {
      case 'star':
        return (
          <TableCell key={key} className="py-1.5 text-center" onClick={e => e.stopPropagation()}>
            <StarToggle
              id={item.id}
              table={isYouth ? 'player_outreach_youth' : 'player_outreach_pro'}
              initial={!!item.is_starred}
              onChange={next => setData(prev => prev.map(d => d.id === item.id ? { ...d, is_starred: next, starred_at: next ? new Date().toISOString() : null } : d))}
            />
          </TableCell>
        );
      case 'eligibility':
        return (
          <TableCell key={key} className="py-1.5" onClick={e => e.stopPropagation()}>
            <EligibilityBadge item={item} type={type} clubCountryMap={clubCountryMap} ageRules={ageRules} />
          </TableCell>
        );
      case 'fit':
        return (
          <TableCell key={key} className="py-1.5 text-center" onClick={e => e.stopPropagation()}>
            <FitScoreBadge
              scope={type}
              player={{
                position: item.position,
                age: calculateAge(item.date_of_birth) ?? item.age ?? null,
                date_of_birth: item.date_of_birth,
                nationality: item.nationality,
                current_club: item.current_club,
                club_country: findClubCountry(item.current_club, clubCountryMap),
                club_first_team_rating: findClubRatingUtil(item.current_club, clubRatings, type === 'youth') as any,
                messaged: item.messaged,
                response_received: item.response_received,
                response_status: item.response_status,
                parent_approval: item.parent_approval,
                last_contact_at: item.last_contact_at,
                national_team: item.national_team,
                star_of_team: item.star_of_team,
                previous_serious_injury: item.previous_serious_injury,
              }}
              cachedScore={fitScoreById[item.id] ?? null}
            />
          </TableCell>
        );
      case 'name':
        return <TableCell key={key} className="bg-muted/30 font-bold py-1.5">{item.player_name}</TableCell>;
      case 'ig':
        return (
          <TableCell key={key} className="text-center py-1.5" onClick={e => e.stopPropagation()}>
            <IgTooltipIcon handle={item.ig_handle} />
          </TableCell>
        );
      case 'nationality':
        return (
          <TableCell key={key} className="py-1.5">
            {item.nationality ? (
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <img src={getCountryFlagUrl(item.nationality)} alt={item.nationality} className="w-5 h-auto rounded-sm" />
              </TooltipTrigger><TooltipContent><p>{item.nationality}</p></TooltipContent></Tooltip></TooltipProvider>
            ) : '-'}
          </TableCell>
        );
      case 'position':
        return (
          <TableCell key={key} className="py-1.5">
            {item.position ? <Badge variant="outline" className="text-[10px] px-1 py-0">{normalisePosition(item.position) || item.position}</Badge> : '-'}
          </TableCell>
        );
      case 'age':
        return <TableCell key={key} className="py-1.5 text-sm">{age ?? '-'}</TableCell>;
      case 'dob':
        return (
          <TableCell key={key} className="py-1.5 text-xs text-muted-foreground">
            {item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
          </TableCell>
        );
      case 'club':
        return (
          <TableCell key={key} className="py-1.5" onClick={e => e.stopPropagation()}>
            <ClubDisplay clubName={item.current_club} clubCountryMap={clubCountryMap} ageRules={ageRules} clubRatings={clubRatings} isYouth={isYouth} />
          </TableCell>
        );
      case 'parent':
        return <TableCell key={key} className="py-1.5 text-sm">{item.parents_name || '-'}</TableCell>;
      case 'parent_ig':
        return (
          <TableCell key={key} className="text-center py-1.5" onClick={e => e.stopPropagation()}>
            <IgTooltipIcon handle={item.parent_contact} />
          </TableCell>
        );
      case 'approval':
        return (
          <TableCell key={key} className="text-center py-1.5" onClick={e => e.stopPropagation()}>
            <Checkbox checked={item.parent_approval} onCheckedChange={() => toggleField(item.id, 'parent_approval', item.parent_approval)} />
          </TableCell>
        );
      case 'messaged':
        return (
          <TableCell key={key} className="text-center py-1.5" onClick={e => e.stopPropagation()}>
            <Checkbox checked={item.messaged} onCheckedChange={() => toggleField(item.id, 'messaged', item.messaged)} />
          </TableCell>
        );
      case 'response':
        return (
          <TableCell key={key} className="text-center py-1.5" onClick={e => e.stopPropagation()}>
            <Checkbox checked={item.response_received} onCheckedChange={() => toggleField(item.id, 'response_received', item.response_received)} />
          </TableCell>
        );
      case 'notes':
        return (
          <TableCell key={key} className="py-1.5 text-xs text-muted-foreground max-w-[150px] truncate">
            {item.notes ? (
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <span className="truncate block">{item.notes}</span>
              </TooltipTrigger><TooltipContent className="max-w-xs"><p>{item.notes}</p></TooltipContent></Tooltip></TooltipProvider>
            ) : '-'}
          </TableCell>
        );
      default: return null;
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text={`Loading ${type} outreach...`} />;
  }

  const notMessaged = data.filter(d => !d.messaged);
  const noResponse = data.filter(d => d.messaged && !d.response_received);
  const responded = data.filter(d => d.response_received);

  const renderTableSection = (items: any[], title: string, sectionKey: string) => {
    const sorted = sortAndFilter(items);
    const isOpen = expandedSections[sectionKey] !== false;
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const rawPage = sectionPages[sectionKey] ?? 0;
    const page = Math.min(rawPage, totalPages - 1);
    const start = page * PAGE_SIZE;
    const visible = sorted.slice(start, start + PAGE_SIZE);
    const goTo = (p: number) => setSectionPages(prev => ({ ...prev, [sectionKey]: Math.max(0, Math.min(totalPages - 1, p)) }));
    const Pager = sorted.length > PAGE_SIZE ? (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b last:border-b-0 last:border-t text-xs">
        <div className="text-muted-foreground">
          Showing <span className="font-medium text-foreground">{start + 1}-{Math.min(start + PAGE_SIZE, sorted.length)}</span> of {sorted.length}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page === 0} onClick={() => goTo(0)}>« First</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page === 0} onClick={() => goTo(page - 1)}>‹ Prev</Button>
          <span className="px-2 font-medium">Page {page + 1} / {totalPages}</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page >= totalPages - 1} onClick={() => goTo(page + 1)}>Next ›</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page >= totalPages - 1} onClick={() => goTo(totalPages - 1)}>Last »</Button>
        </div>
      </div>
    ) : null;
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <div className="border rounded-lg overflow-hidden mb-4">
          <CollapsibleTrigger asChild>
            <button className="w-full bg-muted/50 px-3 py-2 font-semibold text-sm flex items-center justify-between hover:bg-muted/70 transition-colors">
              <span>{title} ({sorted.length})</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {sorted.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No entries</div>
            ) : (
              <>
                {Pager}
                {/* Desktop Table - columns in settings order */}
                <div ref={dragScrollRef} className="hidden lg:block overflow-x-auto cursor-grab active:cursor-grabbing">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        {orderedVisibleKeys.map(key => renderHeader(key))}
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map(item => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(item)}>
                          {orderedVisibleKeys.map(key => renderCell(key, item))}
                          <TableCell className="py-1.5" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(item)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden">
                  {visible.map(item => {
                    const age = calculateAge(item.date_of_birth);
                    return (
                      <div key={item.id} className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/20" onClick={() => openDetail(item)}>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <EligibilityBadge item={item} type={type} clubCountryMap={clubCountryMap} ageRules={ageRules} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{item.player_name}</span>
                              {age !== null && <span className="text-xs text-muted-foreground flex-shrink-0">{age}y</span>}
                              {item.position && <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">{item.position}</Badge>}
                              <div className="ml-auto flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <IgTooltipIcon handle={item.ig_handle} />
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
                                <span onClick={e => e.stopPropagation()}><IgTooltipIcon handle={item.parent_contact} /></span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1.5" onClick={e => e.stopPropagation()}>
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Pager}
              </>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
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
            columnOrder={settings.columnOrder}
            onReorderColumns={settings.setColumnOrder}
            showViewToggle={false}
            filters={
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium">Filters</p>
                <div className="space-y-2">
                  <Label className="text-xs">Min Fit ({minFit})</Label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={minFit}
                    onChange={e => setMinFit(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Age Group</Label>
                  <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                    <option value="all">All Ages</option>
                    <option value="u18">U18</option>
                    <option value="18-21">18-21</option>
                    <option value="22-25">22-25</option>
                    <option value="26-30">26-30</option>
                    <option value="30+">30+</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nationality</Label>
                  <select value={nationFilter} onChange={e => setNationFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                    <option value="all">All Nations</option>
                    {uniqueNations.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Position</Label>
                  <div className="flex flex-wrap gap-1">
                    {uniquePositions.map(pos => (
                      <button key={pos} onClick={() => setPositionFilter(prev => prev.includes(pos) ? prev.filter(v => v !== pos) : [...prev, pos])}
                        className={`text-[10px] px-1.5 py-0.5 border rounded ${positionFilter.includes(pos) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                      >{pos}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DOB Range</Label>
                  <div className="flex gap-1 items-center">
                    <Input type="date" value={dobFrom} onChange={e => setDobFrom(e.target.value)} className="h-7 text-xs flex-1" />
                    <span className="text-[10px] text-muted-foreground">to</span>
                    <Input type="date" value={dobTo} onChange={e => setDobTo(e.target.value)} className="h-7 text-xs flex-1" />
                  </div>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1 border rounded">Clear All Filters</button>
                )}
              </div>
            }
          />
          <Button size="sm" variant="outline" onClick={() => {
            setEditingItem(null);
            setFormData(isYouth ? emptyYouthForm : emptyProForm);
            setDialogOpen(true);
          }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
          <Button size="sm" variant="outline" onClick={async () => {
            const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';
            const targets = data.filter((d: any) => (d.transfermarkt_url || '').trim().length > 0);
            if (targets.length === 0) { toast.info('No rows have a Transfermarkt URL yet'); return; }
            const t = toast.loading(`Refreshing agents for ${targets.length} player(s)…`);
            try {
              const { data: res, error } = await supabase.functions.invoke('parse-transfermarkt-profile', {
                body: { items: targets.map((d: any) => ({ id: d.id, url: d.transfermarkt_url })) },
              });
              if (error) throw error;
              const updates = (res?.results || []) as Array<{ id: string; agent_name: string | null; agent_status: string | null }>;
              await Promise.all(updates.map(u => supabase.from(tableName).update({ agent_name: u.agent_name, agent_status: u.agent_status }).eq('id', u.id)));
              toast.success(`Updated ${updates.length} player(s)`, { id: t });
              fetchData();
            } catch (e: any) {
              toast.error(e?.message || 'Refresh failed', { id: t });
            }
          }}>
            <Search className="w-3.5 h-3.5 mr-1" /> Refresh Agents (TM)
          </Button>
        </div>
      </div>

      {/* Search */}
      <SearchWithSuggestions
        value={searchQuery}
        onCommit={setSearchQuery}
        sources={data.flatMap((d: any) => [
          { label: d.player_name || '', sublabel: d.current_club || d.nationality || null },
          ...(d.current_club ? [{ label: d.current_club, sublabel: 'Club' }] : []),
        ])}
        placeholder="Search name, club, nationality..."
      />

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 items-center">
          {ageFilter !== 'all' && <Badge variant="secondary" className="text-[10px]">{ageFilter}</Badge>}
          {nationFilter !== 'all' && <Badge variant="secondary" className="text-[10px]">{nationFilter}</Badge>}
          {positionFilter.map(p => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
          {(dobFrom || dobTo) && <Badge variant="secondary" className="text-[10px]">DOB filtered</Badge>}
          <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">Clear</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-2 px-1">
        {isYouth ? (
          <>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Can contact</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> Date from which contact allowed</span>
            <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> No DOB/rules</span>
          </>
        ) : (
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pro: can be contacted directly</span>
        )}
      </div>

      {renderTableSection(notMessaged, 'Not Messaged', 'notMessaged')}
      {renderTableSection(noResponse, 'Awaiting Response', 'noResponse')}
      {renderTableSection(responded, 'Responded', 'responded')}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingItem(null); setFormData(isYouth ? emptyYouthForm : emptyProForm); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {isYouth ? 'Youth' : 'Pro'} Outreach</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Player Name *</Label><BlurInput value={formData.player_name} onCommit={v => setFormData((f: any) => ({ ...f, player_name: v }))} /></div>
              <div className="space-y-2"><Label>IG Handle</Label><BlurInput value={formData.ig_handle} onCommit={v => setFormData((f: any) => ({ ...f, ig_handle: v }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Current Club</Label><BlurInput value={formData.current_club} onCommit={v => setFormData((f: any) => ({ ...f, current_club: v }))} /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Position</Label><BlurInput value={formData.position} onCommit={v => setFormData((f: any) => ({ ...f, position: v }))} /></div>
              <div className="space-y-2"><Label>Nationality</Label><BlurInput value={formData.nationality} onCommit={v => setFormData((f: any) => ({ ...f, nationality: v }))} /></div>
            </div>
            {isYouth && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Parent's Name</Label><BlurInput value={formData.parents_name} onCommit={v => setFormData((f: any) => ({ ...f, parents_name: v }))} /></div>
                <div className="space-y-2"><Label>Parent Contact (IG)</Label><BlurInput value={formData.parent_contact} onCommit={v => setFormData((f: any) => ({ ...f, parent_contact: v }))} /></div>
              </div>
            )}
            <div className="space-y-2"><Label>Initial Message</Label><BlurTextarea value={formData.initial_message} onCommit={v => setFormData((f: any) => ({ ...f, initial_message: v }))} rows={3} /></div>
            <div className="space-y-2"><Label>Notes</Label><BlurTextarea value={formData.notes} onCommit={v => setFormData((f: any) => ({ ...f, notes: v }))} rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Transfermarkt URL</Label><BlurInput value={formData.transfermarkt_url || ''} onCommit={v => setFormData((f: any) => ({ ...f, transfermarkt_url: v }))} placeholder="https://www.transfermarkt.com/.../spieler/123456" /></div>
              <div className="space-y-2"><Label>Agent / Agency</Label><BlurInput value={formData.agent_name || ''} onCommit={v => setFormData((f: any) => ({ ...f, agent_name: v }))} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2"><Switch checked={formData.messaged} onCheckedChange={v => setFormData({ ...formData, messaged: v })} /><Label>Messaged</Label></div>
              <div className="flex items-center space-x-2"><Switch checked={formData.response_received} onCheckedChange={v => setFormData({ ...formData, response_received: v })} /><Label>Response</Label></div>
              {isYouth && (
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

      {/* Player Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{detailEditMode ? 'Edit Player' : 'Player Details'}</span>
              {!detailEditMode && (
                <Button size="sm" variant="outline" onClick={() => setDetailEditMode(true)} className="gap-1">
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailItem && !detailEditMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <EligibilityBadge item={detailItem} type={type} clubCountryMap={clubCountryMap} ageRules={ageRules} />
                <div>
                  <h3 className="font-bold text-lg">{detailItem.player_name}</h3>
                  <p className="text-xs text-muted-foreground">{isYouth ? 'Youth' : 'Pro'} Outreach</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Position</span><p className="font-medium">{detailItem.position || '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">Age</span><p className="font-medium">{calculateAge(detailItem.date_of_birth) ?? '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">DOB</span><p className="font-medium">{detailItem.date_of_birth ? new Date(detailItem.date_of_birth).toLocaleDateString('en-GB') : '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">Nationality</span><p className="font-medium">{detailItem.nationality || '-'}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground text-xs">Club</span><p className="font-medium">{detailItem.current_club || '-'}</p></div>
                {detailItem.ig_handle && <div className="col-span-2"><span className="text-muted-foreground text-xs">Instagram</span><p className="font-medium">@{detailItem.ig_handle.replace(/^@/, '')}</p></div>}
                {isYouth && detailItem.parents_name && <div><span className="text-muted-foreground text-xs">Parent Name</span><p className="font-medium">{detailItem.parents_name}</p></div>}
                {isYouth && detailItem.parent_contact && <div><span className="text-muted-foreground text-xs">Parent IG</span><p className="font-medium">@{detailItem.parent_contact.replace(/^@/, '')}</p></div>}
                <div><span className="text-muted-foreground text-xs">Messaged</span><p className="font-medium">{detailItem.messaged ? 'Yes' : 'No'}</p></div>
                <div><span className="text-muted-foreground text-xs">Response</span><p className="font-medium">{detailItem.response_received ? 'Yes' : 'No'}</p></div>
                {isYouth && <div><span className="text-muted-foreground text-xs">Parent Approval</span><p className="font-medium">{detailItem.parent_approval ? 'Yes' : 'No'}</p></div>}
                <div><span className="text-muted-foreground text-xs">National Team</span><p className="font-medium">{detailItem.national_team ? 'Yes' : 'No'}</p></div>
                <div><span className="text-muted-foreground text-xs">Star of Team</span><p className="font-medium">{detailItem.star_of_team ? 'Yes' : 'No'}</p></div>
                {detailItem.previous_serious_injury && <div className="col-span-2"><span className="text-muted-foreground text-xs">Previous Serious Injury</span><p className="font-medium">{detailItem.previous_serious_injury}</p></div>}
                {detailItem.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">Notes</span><p className="text-muted-foreground text-sm">{detailItem.notes}</p></div>}
                {detailItem.initial_message && <div className="col-span-2"><span className="text-muted-foreground text-xs">Initial Message</span><p className="text-muted-foreground text-sm">{detailItem.initial_message}</p></div>}
              </div>
            </div>
          )}
          {detailItem && detailEditMode && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Name</Label><BlurInput value={formData.player_name} onCommit={v => setFormData((f: any) => ({ ...f, player_name: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Position</Label><BlurInput value={formData.position} onCommit={v => setFormData((f: any) => ({ ...f, position: v }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nationality</Label><BlurInput value={formData.nationality} onCommit={v => setFormData((f: any) => ({ ...f, nationality: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Club</Label><BlurInput value={formData.current_club} onCommit={v => setFormData((f: any) => ({ ...f, current_club: v }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">DOB</Label><Input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Instagram</Label><BlurInput value={formData.ig_handle} onCommit={v => setFormData((f: any) => ({ ...f, ig_handle: v }))} /></div>
              </div>
              {isYouth && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Parent Name</Label><BlurInput value={formData.parents_name} onCommit={v => setFormData((f: any) => ({ ...f, parents_name: v }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Parent IG</Label><BlurInput value={formData.parent_contact} onCommit={v => setFormData((f: any) => ({ ...f, parent_contact: v }))} /></div>
                </div>
              )}
              <div className="space-y-1"><Label className="text-xs">Notes</Label><BlurTextarea value={formData.notes} onCommit={v => setFormData((f: any) => ({ ...f, notes: v }))} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Initial Message</Label><BlurTextarea value={formData.initial_message} onCommit={v => setFormData((f: any) => ({ ...f, initial_message: v }))} rows={2} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Previous Serious Injury (e.g. ACL 2023)</Label>
                <BlurInput value={formData.previous_serious_injury} onCommit={v => setFormData((f: any) => ({ ...f, previous_serious_injury: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Transfermarkt URL</Label><BlurInput value={formData.transfermarkt_url || ''} onCommit={v => setFormData((f: any) => ({ ...f, transfermarkt_url: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Agent / Agency</Label><BlurInput value={formData.agent_name || ''} onCommit={v => setFormData((f: any) => ({ ...f, agent_name: v }))} /></div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2"><Switch checked={formData.messaged} onCheckedChange={v => setFormData({ ...formData, messaged: v })} /><Label className="text-xs">Messaged</Label></div>
                <div className="flex items-center space-x-2"><Switch checked={formData.response_received} onCheckedChange={v => setFormData({ ...formData, response_received: v })} /><Label className="text-xs">Response</Label></div>
                {isYouth && <div className="flex items-center space-x-2"><Switch checked={formData.parent_approval} onCheckedChange={v => setFormData({ ...formData, parent_approval: v })} /><Label className="text-xs">Parent Approval</Label></div>}
                <div className="flex items-center space-x-2"><Switch checked={formData.national_team} onCheckedChange={v => setFormData({ ...formData, national_team: v })} /><Label className="text-xs">National Team</Label></div>
                <div className="flex items-center space-x-2"><Switch checked={formData.star_of_team} onCheckedChange={v => setFormData({ ...formData, star_of_team: v })} /><Label className="text-xs">Star of Team</Label></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDetailSave} className="flex-1">Save</Button>
                <Button variant="outline" onClick={() => setDetailEditMode(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { handleDelete(detailItem.id); setDetailOpen(false); }}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
