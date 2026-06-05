import React, { useState, useEffect, useMemo, useDeferredValue, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BlurInput } from '@/components/staff/BlurInput';
import { BlurTextarea } from '@/components/staff/BlurTextarea';
import { StaffSearchInput } from '@/components/staff/StaffSearchInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Users, Edit, CheckCircle2, HelpCircle, Clock, Star } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { calculateAge, calculatePreciseAge, getEligibleDate } from '@/lib/ageUtils';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { normalizeClubName, findClubCountry, findClubRating } from '@/lib/clubNameUtils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { TableSettingsPopover, useTableSettings, type ColumnConfig } from './TableSettingsPopover';
import { Switch } from '@/components/ui/switch';
import { PlayerNotesBoard } from './PlayerNotesBoard';
import { useStatsUpdaterAssignments } from '@/hooks/useStatsUpdaterAssignments';
import { FitScoreBadge } from './recruitment/FitScoreBadge';
import { normalisePosition } from '@/lib/positionNormalise';
import { computeFitScore } from '@/lib/fitScore';
import { useRecruitmentTargets, useScoringSettings } from '@/hooks/useRecruitmentScoring';

const buildPlayerKey = (name: string | null | undefined, dob: string | null | undefined) =>
  name && dob ? `${name.trim().toLowerCase()}::${dob}` : '';

interface PlayerData {
  id: string;
  player_name: string;
  position: string | null;
  age: number | null;
  current_club: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  report_count: number;
  source: 'scouting' | 'youth_outreach' | 'pro_outreach';
  notes?: string | null;
  ig_handle?: string | null;
  created_at?: string;
  profile_image_url?: string | null;
  club_logo_url?: string | null;
  parents_name?: string | null;
  parent_contact?: string | null;
  parent_approval?: boolean;
  messaged?: boolean;
  response_received?: boolean;
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
}

type SortField = 'player_name' | 'age' | 'position' | 'nationality' | 'current_club' | 'report_count' | 'created_at' | 'date_of_birth' | 'fit_score';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;
const UPCOMING_BIRTHDAY_DAYS = 7;

const getMonthDayFromDob = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;
  const [_, month, day] = dateOfBirth.split('-').map(Number);
  if (!month || !day) return null;
  return { month, day };
};

const isBirthdayOnOffset = (dateOfBirth: string | null, offset: number) => {
  const dob = getMonthDayFromDob(dateOfBirth);
  if (!dob) return false;

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + offset);

  return dob.month === target.getMonth() + 1 && dob.day === target.getDate();
};

const getUpcomingBirthdayLabel = (offset: number, date: Date) => {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const POSITION_ORDER: Record<string, number> = {
  'GK': 1, 'Goalkeeper': 1,
  'CB': 2, 'Centre-Back': 2, 'Center Back': 2,
  'RB': 3, 'Right-Back': 3, 'Right Back': 3,
  'LB': 4, 'Left-Back': 4, 'Left Back': 4,
  'RWB': 5, 'Right Wing-Back': 5,
  'LWB': 6, 'Left Wing-Back': 6,
  'CDM': 7, 'DM': 7, 'Defensive Midfield': 7,
  'CM': 8, 'Central Midfield': 8,
  'CAM': 9, 'AM': 9, 'Attacking Midfield': 9,
  'RM': 10, 'Right Midfield': 10,
  'LM': 11, 'Left Midfield': 11,
  'RW': 12, 'Right Winger': 12,
  'LW': 13, 'Left Winger': 13,
  'CF': 14, 'Centre-Forward': 14,
  'ST': 15, 'Striker': 15,
};

const getPositionOrder = (position: string | null): number => {
  if (!position) return 999;
  return POSITION_ORDER[position] || 100;
};

const DB_COLUMNS: ColumnConfig[] = [
  { key: 'avatar', label: 'Avatar', defaultVisible: true },
  { key: 'fit', label: 'Fit', defaultVisible: true },
  { key: 'eligibility', label: 'Eligibility', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'position', label: 'Position', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'parent', label: 'Parent Name', defaultVisible: false },
  { key: 'parent_ig', label: 'Parent IG', defaultVisible: false },
  { key: 'source', label: 'Source', defaultVisible: false },
  { key: 'added', label: 'Date Added', defaultVisible: false },
  { key: 'reports', label: 'Reports', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: true },
];

const EligibilityBadge = ({ player, clubCountryMap, ageRules }: {
  player: PlayerData; clubCountryMap: Record<string, string>; ageRules: AgeRule[];
}) => {
  if (player.source === 'pro_outreach') {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /></span>
      </TooltipTrigger><TooltipContent><p>Pro player, can be contacted directly</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  if (!player.date_of_birth) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><HelpCircle className="h-4 w-4 text-muted-foreground" /></span>
      </TooltipTrigger><TooltipContent><p>No date of birth set</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  const clubCountry = findClubCountry(player.current_club, clubCountryMap);
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
  const preciseAge = calculatePreciseAge(player.date_of_birth);
  if (preciseAge === null) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  if (preciseAge >= rule.min_contact_age) {
    return (
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <span className="inline-flex"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>
      </TooltipTrigger><TooltipContent><p>Eligible to contact (parent) in {clubCountry}</p></TooltipContent></Tooltip></TooltipProvider>
    );
  }
  const eligibleDate = getEligibleDate(player.date_of_birth, rule.min_contact_age);
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

const IgTooltipIcon = ({ handle }: { handle: string | null | undefined }) => {
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

export const PlayerDatabase = () => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const { isScoped, allowedIds } = useStatsUpdaterAssignments();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Defer the heavy filter pipeline so typing stays responsive.
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [nationFilter, setNationFilter] = useState<string>('all');
  const [dobFrom, setDobFrom] = useState('');
  const [dobTo, setDobTo] = useState('');
  const [birthMonthFilter, setBirthMonthFilter] = useState<string>('all');
  const [birthdayFilterOffset, setBirthdayFilterOffset] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [clubCountryMap, setClubCountryMap] = useState<Record<string, string>>({});
  const [ageRules, setAgeRules] = useState<AgeRule[]>([]);
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);

  const settings = useTableSettings('player-database', DB_COLUMNS);
  const dragScrollRef = useHorizontalDragScroll();
  const { getHeaderProps, ResizeHandle } = useResizableColumns('player-database');

  useEffect(() => { fetchAllPlayers(); }, []);

  const fetchAllPlayers = async () => {
    try {
      const [scoutingResult, youthResult, proResult, clubLogosResult, clubCountryResult, rulesResult, ratingsResult] = await Promise.all([
        supabase.from('scouting_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_youth').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_pro').select('*').order('created_at', { ascending: false }),
        supabase.from('club_map_positions').select('club_name, image_url'),
        supabase.from('club_map_positions').select('club_name, country'),
        supabase.from('recruitment_age_rules').select('country, country_code, min_contact_age'),
        supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating, country'),
      ]);

      if (scoutingResult.error) throw scoutingResult.error;
      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      const clubLogoMap: Record<string, string> = {};
      clubLogosResult.data?.forEach(club => {
        if (club.club_name && club.image_url) clubLogoMap[normalizeClubName(club.club_name)] = club.image_url;
      });

      const countryMap: Record<string, string> = {};
      // First populate from club_map_positions
      clubCountryResult.data?.forEach(c => {
        if (c.club_name && c.country) countryMap[c.club_name.toLowerCase()] = c.country;
      });
      // Then enrich from club_ratings (which has AI-detected countries)
      ratingsResult.data?.forEach((r: any) => {
        if (r.club_name && r.country && r.country !== 'Unknown') {
          const lower = r.club_name.toLowerCase();
          if (!countryMap[lower]) {
            countryMap[lower] = r.country;
          }
          // Also add normalised version for fuzzy matching
          const norm = normalizeClubName(r.club_name);
          if (norm && !countryMap[norm]) {
            countryMap[norm] = r.country;
          }
        }
      });
      setClubCountryMap(countryMap);
      setAgeRules(rulesResult.data || []);
      setClubRatings(ratingsResult.data || []);

      const getClubLogo = (clubName: string | null): string | null => {
        if (!clubName) return null;
        const norm = normalizeClubName(clubName);
        if (clubLogoMap[norm]) return clubLogoMap[norm];
        for (const [key, url] of Object.entries(clubLogoMap)) {
          if (key.includes(norm) || norm.includes(key)) return url;
        }
        return null;
      };

      const playerMap: Record<string, PlayerData> = {};

      scoutingResult.data?.forEach(report => {
        const name = report.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: report.id, player_name: name, position: report.position,
            age: calculateAge(report.date_of_birth) ?? report.age,
            current_club: report.current_club, nationality: report.nationality,
            date_of_birth: report.date_of_birth, report_count: 1, source: 'scouting',
            notes: report.notes, created_at: report.created_at,
            profile_image_url: (report as any).profile_image_url || null,
            club_logo_url: getClubLogo(report.current_club)
          };
        } else {
          playerMap[name].report_count++;
          if (report.created_at && (!playerMap[name].created_at || report.created_at > playerMap[name].created_at)) {
            playerMap[name].created_at = report.created_at;
          }
          if ((report as any).profile_image_url && !playerMap[name].profile_image_url) {
            playerMap[name].profile_image_url = (report as any).profile_image_url;
          }
        }
      });

      youthResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: outreach.id, player_name: name, position: (outreach as any).position || null,
            age: calculateAge((outreach as any).date_of_birth) ?? (outreach as any).age ?? null,
            current_club: (outreach as any).current_club || null, nationality: (outreach as any).nationality || null,
            date_of_birth: (outreach as any).date_of_birth || null, report_count: 0, source: 'youth_outreach',
            notes: outreach.notes, ig_handle: outreach.ig_handle, created_at: outreach.created_at,
            profile_image_url: null, club_logo_url: getClubLogo((outreach as any).current_club),
            parents_name: outreach.parents_name, parent_contact: outreach.parent_contact,
            parent_approval: outreach.parent_approval, messaged: outreach.messaged,
            response_received: outreach.response_received,
          };
        } else {
          if (!playerMap[name].parents_name && outreach.parents_name) playerMap[name].parents_name = outreach.parents_name;
          if (!playerMap[name].parent_contact && outreach.parent_contact) playerMap[name].parent_contact = outreach.parent_contact;
          if (!playerMap[name].ig_handle && outreach.ig_handle) playerMap[name].ig_handle = outreach.ig_handle;
        }
      });

      proResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: outreach.id, player_name: name, position: (outreach as any).position || null,
            age: calculateAge((outreach as any).date_of_birth) ?? (outreach as any).age ?? null,
            current_club: (outreach as any).current_club || null, nationality: (outreach as any).nationality || null,
            date_of_birth: (outreach as any).date_of_birth || null, report_count: 0, source: 'pro_outreach',
            notes: outreach.notes, ig_handle: outreach.ig_handle, created_at: outreach.created_at,
            profile_image_url: null, club_logo_url: getClubLogo((outreach as any).current_club),
            messaged: outreach.messaged, response_received: outreach.response_received,
          };
        } else {
          if (!playerMap[name].ig_handle && outreach.ig_handle) playerMap[name].ig_handle = outreach.ig_handle;
        }
      });

      setPlayers(Object.values(playerMap).sort((a, b) => {
        if (b.created_at && a.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return 0;
      }));
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load player database');
    } finally {
      setLoading(false);
    }
  };

  const uniqueNations = useMemo(() => {
    return [...new Set(players.map(p => p.nationality).filter((n): n is string => !!n))].sort();
  }, [players]);

  const uniquePositions = useMemo(() => {
    return [...new Set(players.map(p => p.position).filter((p): p is string => !!p))].sort((a, b) => getPositionOrder(a) - getPositionOrder(b));
  }, [players]);

  const upcomingBirthdayOptions = useMemo(() => {
    return Array.from({ length: UPCOMING_BIRTHDAY_DAYS }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + offset);

      return {
        offset,
        label: getUpcomingBirthdayLabel(offset, date),
        count: players.filter(player => isBirthdayOnOffset(player.date_of_birth, offset)).length,
      };
    });
  }, [players]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSortedPlayers = useMemo(() => {
    let result = players.filter(player => {
      if (isScoped) {
        if (!allowedIds || !allowedIds.has(player.id)) return false;
      }
      if (deferredSearchQuery) {
        const query = deferredSearchQuery.toLowerCase();
        if (!player.player_name.toLowerCase().includes(query) && !player.current_club?.toLowerCase().includes(query) && !player.position?.toLowerCase().includes(query)) return false;
      }
      if (ageFilter !== 'all') {
        const age = player.date_of_birth ? calculateAge(player.date_of_birth) : player.age;
        if (!age) return false;
        switch (ageFilter) {
          case 'u18': if (age >= 18) return false; break;
          case '18-21': if (age < 18 || age > 21) return false; break;
          case '22-25': if (age < 22 || age > 25) return false; break;
          case '26-30': if (age < 26 || age > 30) return false; break;
          case '30+': if (age < 30) return false; break;
        }
      }
      if (dobFrom && player.date_of_birth && player.date_of_birth < dobFrom) return false;
      if (dobTo && player.date_of_birth && player.date_of_birth > dobTo) return false;
      if ((dobFrom || dobTo) && !player.date_of_birth) return false;
      if (birthMonthFilter !== 'all') {
        const month = getMonthDayFromDob(player.date_of_birth)?.month;
        if (month !== Number(birthMonthFilter)) return false;
      }
      if (nationFilter !== 'all' && player.nationality !== nationFilter) return false;
      if (positionFilter.length > 0 && (!player.position || !positionFilter.includes(player.position))) return false;
      if (sourceFilter.length > 0 && !sourceFilter.includes(player.source)) return false;
      if (birthdayFilterOffset !== null && !isBirthdayOnOffset(player.date_of_birth, birthdayFilterOffset)) return false;
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'player_name': comparison = a.player_name.localeCompare(b.player_name); break;
        case 'age': comparison = (a.age || 999) - (b.age || 999); break;
        case 'position': comparison = getPositionOrder(a.position) - getPositionOrder(b.position); break;
        case 'nationality': comparison = (a.nationality || 'ZZZ').localeCompare(b.nationality || 'ZZZ'); break;
        case 'current_club': comparison = (a.current_club || 'ZZZ').localeCompare(b.current_club || 'ZZZ'); break;
        case 'report_count': comparison = a.report_count - b.report_count; break;
        case 'date_of_birth': comparison = (a.date_of_birth || '9999').localeCompare(b.date_of_birth || '9999'); break;
        case 'created_at':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateA - dateB; break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [players, deferredSearchQuery, ageFilter, nationFilter, positionFilter, sourceFilter, dobFrom, dobTo, birthMonthFilter, birthdayFilterOffset, sortField, sortDirection, isScoped, allowedIds]);

  const visiblePlayers = filteredAndSortedPlayers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedPlayers.length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setAgeFilter('all');
    setNationFilter('all');
    setPositionFilter([]);
    setSourceFilter([]);
    setDobFrom('');
    setDobTo('');
    setBirthMonthFilter('all');
    setBirthdayFilterOffset(null);
  };

  const activeBirthdayLabel = birthdayFilterOffset !== null
    ? upcomingBirthdayOptions.find(option => option.offset === birthdayFilterOffset)?.label ?? null
    : null;

  const hasActiveFilters = !!(searchQuery || ageFilter !== 'all' || nationFilter !== 'all' || positionFilter.length > 0 || sourceFilter.length > 0 || dobFrom || dobTo || birthMonthFilter !== 'all' || birthdayFilterOffset !== null);

  const openPlayerDetail = (player: PlayerData) => {
    setSelectedPlayer(player);
    setEditMode(false);
    setEditForm({
      player_name: player.player_name,
      position: player.position || '',
      nationality: player.nationality || '',
      current_club: player.current_club || '',
      date_of_birth: player.date_of_birth || '',
      ig_handle: player.ig_handle || '',
      notes: player.notes || '',
      parents_name: player.parents_name || '',
      parent_contact: player.parent_contact || '',
    });
    setDetailOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPlayer) return;
    try {
      const tableName = selectedPlayer.source === 'scouting' ? 'scouting_reports'
        : selectedPlayer.source === 'youth_outreach' ? 'player_outreach_youth' : 'player_outreach_pro';
      const { error } = await supabase.from(tableName).update({
        player_name: editForm.player_name,
        position: editForm.position || null,
        nationality: editForm.nationality || null,
        current_club: editForm.current_club || null,
        date_of_birth: editForm.date_of_birth || null,
        ig_handle: editForm.ig_handle || null,
        notes: editForm.notes || null,
        ...(selectedPlayer.source === 'youth_outreach' ? {
          parents_name: editForm.parents_name || null,
          parent_contact: editForm.parent_contact || null,
        } : {}),
      }).eq('id', selectedPlayer.id);
      if (error) throw error;
      toast.success('Player updated');
      setDetailOpen(false);
      fetchAllPlayers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  // Dynamic column renderers
  const orderedVisibleKeys = settings.columnOrder.filter(k => settings.isVisible(k));

  const renderHeader = (key: string): ReactNode => {
    const sortableHeader = (label: string, field: SortField, extraClass = '') => (
      <TableHead key={key} className={`font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs relative ${extraClass}`} onClick={() => handleSort(field)} {...getHeaderProps(key)}>
        <div className="flex items-center">{label} {getSortIcon(field)}</div>
        <ResizeHandle columnKey={key} />
      </TableHead>
    );
    const plainHeader = (label: string, extraClass = '') => (
      <TableHead key={key} className={`font-semibold text-xs relative ${extraClass}`} {...getHeaderProps(key)}>
        {label}<ResizeHandle columnKey={key} />
      </TableHead>
    );
    switch (key) {
      case 'avatar': return plainHeader('', 'w-12');
      case 'fit': return plainHeader('FIT', 'w-12 text-center');
      case 'eligibility': return plainHeader('', 'w-10');
      case 'name': return sortableHeader('NAME', 'player_name');
      case 'nationality': return sortableHeader('NAT', 'nationality', 'w-12');
      case 'position': return sortableHeader('POS', 'position', 'w-16');
      case 'age': return sortableHeader('AGE', 'age', 'w-12');
      case 'club': return sortableHeader('CLUB', 'current_club');
      case 'dob': return sortableHeader('DOB', 'date_of_birth', 'w-20');
      case 'parent': return plainHeader('PARENT');
      case 'parent_ig': return plainHeader('P.IG', 'w-10 text-center');
      case 'source': return plainHeader('SRC', 'w-16');
      case 'added': return sortableHeader('ADDED', 'created_at', 'w-20');
      case 'ig': return plainHeader('IG', 'w-10 text-center');
      case 'reports': return plainHeader('#', 'w-10 text-center');
      default: return null;
    }
  };

  const renderCell = (key: string, player: PlayerData): ReactNode => {
    const clubCountry = findClubCountry(player.current_club, clubCountryMap);
    const clubRatingVal = findClubRating(player.current_club, clubRatings, player.source === 'youth_outreach');
    switch (key) {
      case 'avatar':
        return (
          <TableCell key={key} className="py-1.5 pr-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={player.profile_image_url || undefined} alt={player.player_name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold text-[10px]">
                {player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TableCell>
        );
      case 'eligibility':
        return <TableCell key={key} className="py-1.5"><EligibilityBadge player={player} clubCountryMap={clubCountryMap} ageRules={ageRules} /></TableCell>;
      case 'fit':
        return (
          <TableCell key={key} className="py-1.5 text-center">
            <FitScoreBadge
              player={{
                position: player.position,
                age: player.age,
                date_of_birth: player.date_of_birth,
                nationality: player.nationality,
                current_club: player.current_club,
                club_country: clubCountry,
                club_first_team_rating: clubRatingVal as any,
                messaged: player.messaged,
                response_received: player.response_received,
              }}
              scope={player.source === 'youth_outreach' ? 'youth' : player.source === 'pro_outreach' ? 'pro' : undefined}
            />
          </TableCell>
        );
      case 'name':
        return <TableCell key={key} className="font-medium text-sm py-1.5">{player.player_name}</TableCell>;
      case 'nationality':
        return (
          <TableCell key={key} className="py-1.5">
            {player.nationality ? (
              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <img src={getCountryFlagUrl(player.nationality)} alt={player.nationality} className="w-6 h-auto rounded-sm shadow-sm" />
              </TooltipTrigger><TooltipContent><p>{player.nationality}</p></TooltipContent></Tooltip></TooltipProvider>
            ) : <span className="text-muted-foreground">-</span>}
          </TableCell>
        );
      case 'position':
        return <TableCell key={key} className="text-sm py-1.5"><Badge variant="outline" className="text-[10px] font-medium">{normalisePosition(player.position) || player.position || '-'}</Badge></TableCell>;
      case 'age':
        return <TableCell key={key} className="text-sm py-1.5">{player.age || '-'}</TableCell>;
      case 'club':
        return (
          <TableCell key={key} className="text-sm py-1.5">
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {clubCountry && <img src={getCountryFlagUrl(clubCountry)} alt={clubCountry} className="w-4 h-3 object-cover rounded-sm" />}
                {player.club_logo_url && <img src={player.club_logo_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />}
                <span className="truncate">{player.current_club || '-'}</span>
                {clubRatingVal && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">{clubRatingVal}</Badge>}
              </div>
            </TooltipTrigger><TooltipContent><p>{player.current_club}{clubCountry ? ` (${clubCountry})` : ''}{clubRatingVal ? ` - ${clubRatingVal}` : ''}</p></TooltipContent></Tooltip></TooltipProvider>
          </TableCell>
        );
      case 'dob':
        return (
          <TableCell key={key} className="text-xs text-muted-foreground py-1.5">
            {player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
          </TableCell>
        );
      case 'parent':
        return <TableCell key={key} className="text-sm py-1.5">{player.parents_name || '-'}</TableCell>;
      case 'parent_ig':
        return <TableCell key={key} className="text-center py-1.5"><IgTooltipIcon handle={player.parent_contact} /></TableCell>;
      case 'source':
        return (
          <TableCell key={key} className="text-xs py-1.5">
            <Badge variant="secondary" className="text-[9px]">{player.source === 'scouting' ? 'Scout' : player.source === 'youth_outreach' ? 'Youth' : 'Pro'}</Badge>
          </TableCell>
        );
      case 'added':
        return (
          <TableCell key={key} className="text-xs text-muted-foreground py-1.5">
            {player.created_at ? new Date(player.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
          </TableCell>
        );
      case 'ig':
        return <TableCell key={key} className="text-center py-1.5"><IgTooltipIcon handle={player.ig_handle} /></TableCell>;
      case 'reports':
        return (
          <TableCell key={key} className="text-center py-1.5">
            {player.report_count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">{player.report_count}</span>
            )}
          </TableCell>
        );
      default: return null;
    }
  };

  if (loading) return <LoadingSpinner size="md" className="py-8" text="Loading player database..." />;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Player Database
        </h2>
        <TableSettingsPopover
          storageKey="player-database"
          columns={DB_COLUMNS}
          visibleColumns={settings.visibleColumns}
          onToggleColumn={settings.toggleColumn}
          columnOrder={settings.columnOrder}
          onReorderColumns={settings.setColumnOrder}
          showViewToggle={false}
          filters={
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground font-medium">Filters</p>
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
              <div className="space-y-2">
                <Label className="text-xs">Source</Label>
                <div className="flex gap-1">
                  {['scouting', 'youth_outreach', 'pro_outreach'].map(src => (
                    <button key={src} onClick={() => setSourceFilter(prev => prev.includes(src) ? prev.filter(v => v !== src) : [...prev, src])}
                      className={`text-[10px] px-1.5 py-0.5 border rounded ${sourceFilter.includes(src) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                    >{src === 'scouting' ? 'Scout' : src === 'youth_outreach' ? 'Youth' : 'Pro'}</button>
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
              <div className="space-y-2">
                <Label className="text-xs">Birth Month</Label>
                <select value={birthMonthFilter} onChange={e => setBirthMonthFilter(e.target.value)} className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                  <option value="all">Any Month</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1 border rounded">Clear All Filters</button>
              )}
            </div>
          }
        />
      </div>

      {/* Search */}
      <StaffSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name, club, position..."
      />

      <div className="rounded-lg border border-border/60 bg-card/60 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium">Birthdays next 7 days</p>
            <p className="text-[11px] text-muted-foreground">Filter the database day by day so nothing gets missed.</p>
          </div>
          {birthdayFilterOffset !== null && (
            <button
              onClick={() => setBirthdayFilterOffset(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear birthday filter
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingBirthdayOptions.map((option) => {
            const isActive = birthdayFilterOffset === option.offset;

            return (
              <Button
                key={option.offset}
                type="button"
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className="h-8 gap-2 text-xs"
                onClick={() => setBirthdayFilterOffset(current => current === option.offset ? null : option.offset)}
              >
                <span>{option.label}</span>
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {option.count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 items-center">
          {ageFilter !== 'all' && <Badge variant="secondary" className="text-[10px]">{ageFilter}</Badge>}
          {nationFilter !== 'all' && <Badge variant="secondary" className="text-[10px]">{nationFilter}</Badge>}
          {positionFilter.map(p => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
          {sourceFilter.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s === 'scouting' ? 'Scout' : s === 'youth_outreach' ? 'Youth' : 'Pro'}</Badge>)}
          {(dobFrom || dobTo) && <Badge variant="secondary" className="text-[10px]">DOB filtered</Badge>}
          {birthMonthFilter !== 'all' && <Badge variant="secondary" className="text-[10px]">Born {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(birthMonthFilter) - 1]}</Badge>}
          {activeBirthdayLabel && <Badge variant="secondary" className="text-[10px]">Birthday: {activeBirthdayLabel}</Badge>}
          <button onClick={clearAllFilters} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">Clear</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Can contact</span>
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pro</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> Eligible from date</span>
        <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /> No DOB/rules</span>
      </div>

      <div className="text-xs text-muted-foreground">{visiblePlayers.length} of {filteredAndSortedPlayers.length} players</div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {visiblePlayers.map((player) => (
          <div key={`${player.source}-${player.id}`} className="p-3 border rounded-lg bg-card/80 backdrop-blur-sm hover:bg-card transition-colors cursor-pointer" onClick={() => openPlayerDetail(player)}>
            <div className="flex items-center gap-3">
              <EligibilityBadge player={player} clubCountryMap={clubCountryMap} ageRules={ageRules} />
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={player.profile_image_url || undefined} alt={player.player_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold text-xs">
                  {player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {player.nationality && <img src={getCountryFlagUrl(player.nationality)} alt={player.nationality} className="w-5 h-auto rounded-sm flex-shrink-0" />}
                  <span className="font-medium truncate">{player.player_name}</span>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-auto">{player.position || '-'}</Badge>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {player.club_logo_url && <img src={player.club_logo_url} alt="" className="w-4 h-4 object-contain" />}
                    <span className="truncate">{player.current_club || '-'}</span>
                  </div>
                  <span>{player.age ? `${player.age}y` : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table - columns rendered in settings order */}
      <div ref={dragScrollRef} className="hidden md:block border rounded-lg overflow-x-auto bg-card/50 cursor-grab active:cursor-grabbing">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {orderedVisibleKeys.map(key => renderHeader(key))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePlayers.map((player) => (
              <TableRow key={`${player.source}-${player.id}`} className="hover:bg-muted/30 cursor-pointer group" onClick={() => openPlayerDetail(player)}>
                {orderedVisibleKeys.map(key => renderCell(key, player))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)} className="gap-2">
            <ChevronDown className="h-4 w-4" />
            Load More ({filteredAndSortedPlayers.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {filteredAndSortedPlayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No players found matching your filters</div>
      )}

      {/* Player Detail/Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editMode ? 'Edit Player' : 'Player Details'}</span>
              {!editMode && (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1">
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedPlayer && !editMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedPlayer.profile_image_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold">
                    {selectedPlayer.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedPlayer.player_name}</h3>
                  <div className="flex items-center gap-2">
                    <EligibilityBadge player={selectedPlayer} clubCountryMap={clubCountryMap} ageRules={ageRules} />
                    <Badge variant="secondary" className="text-[10px]">{selectedPlayer.source === 'scouting' ? 'Scouting' : selectedPlayer.source === 'youth_outreach' ? 'Youth' : 'Pro'}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Position</span><p className="font-medium">{selectedPlayer.position || '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">Age</span><p className="font-medium">{selectedPlayer.age || '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">Date of Birth</span><p className="font-medium">{selectedPlayer.date_of_birth ? new Date(selectedPlayer.date_of_birth).toLocaleDateString('en-GB') : '-'}</p></div>
                <div><span className="text-muted-foreground text-xs">Nationality</span><p className="font-medium">{selectedPlayer.nationality || '-'}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground text-xs">Club</span><p className="font-medium">{selectedPlayer.current_club || '-'}</p></div>
                {selectedPlayer.ig_handle && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Instagram</span><p className="font-medium">@{selectedPlayer.ig_handle.replace(/^@/, '')}</p></div>
                )}
                {selectedPlayer.parents_name && (
                  <div><span className="text-muted-foreground text-xs">Parent Name</span><p className="font-medium">{selectedPlayer.parents_name}</p></div>
                )}
                {selectedPlayer.parent_contact && (
                  <div><span className="text-muted-foreground text-xs">Parent IG</span><p className="font-medium">@{selectedPlayer.parent_contact.replace(/^@/, '')}</p></div>
                )}
                <div><span className="text-muted-foreground text-xs">Reports</span><p className="font-medium">{selectedPlayer.report_count}</p></div>
                {selectedPlayer.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">Notes</span><p className="text-muted-foreground text-sm">{selectedPlayer.notes}</p></div>}
              </div>
              <div className="pt-2 border-t border-border/40">
                <PlayerNotesBoard
                  playerKey={buildPlayerKey(selectedPlayer.player_name, selectedPlayer.date_of_birth)}
                  playerName={selectedPlayer.player_name}
                  source={selectedPlayer.source}
                  sourceId={selectedPlayer.id}
                />
              </div>
            </div>
          )}
          {selectedPlayer && editMode && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Name</Label><BlurInput value={editForm.player_name} onCommit={v => setEditForm((f: any) => ({ ...f, player_name: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Position</Label><BlurInput value={editForm.position} onCommit={v => setEditForm((f: any) => ({ ...f, position: v }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nationality</Label><BlurInput value={editForm.nationality} onCommit={v => setEditForm((f: any) => ({ ...f, nationality: v }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Club</Label><BlurInput value={editForm.current_club} onCommit={v => setEditForm((f: any) => ({ ...f, current_club: v }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Instagram</Label><BlurInput value={editForm.ig_handle} onCommit={v => setEditForm((f: any) => ({ ...f, ig_handle: v }))} /></div>
              </div>
              {selectedPlayer.source === 'youth_outreach' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Parent Name</Label><BlurInput value={editForm.parents_name} onCommit={v => setEditForm((f: any) => ({ ...f, parents_name: v }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Parent IG</Label><BlurInput value={editForm.parent_contact} onCommit={v => setEditForm((f: any) => ({ ...f, parent_contact: v }))} /></div>
                </div>
              )}
              <div className="space-y-1"><Label className="text-xs">Notes</Label><BlurTextarea value={editForm.notes} onCommit={v => setEditForm((f: any) => ({ ...f, notes: v }))} rows={2} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
