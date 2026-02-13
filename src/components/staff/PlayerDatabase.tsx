import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { calculateAge } from '@/lib/ageUtils';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { normalizeClubName, findClubCountry, findClubRating } from '@/lib/clubNameUtils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { TableSettingsPopover, useTableSettings, type ColumnConfig } from './TableSettingsPopover';

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
}

type SortField = 'player_name' | 'age' | 'position' | 'nationality' | 'current_club' | 'report_count' | 'created_at' | 'date_of_birth';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

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
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'nationality', label: 'Nationality', defaultVisible: true },
  { key: 'position', label: 'Position', defaultVisible: true },
  { key: 'age', label: 'Age', defaultVisible: true },
  { key: 'club', label: 'Club', defaultVisible: true },
  { key: 'dob', label: 'DOB', defaultVisible: true },
  { key: 'source', label: 'Source', defaultVisible: false },
  { key: 'added', label: 'Date Added', defaultVisible: false },
  { key: 'reports', label: 'Reports', defaultVisible: true },
  { key: 'ig', label: 'Instagram', defaultVisible: false },
];

const FilterChip = ({ label, isActive, onClick, count }: { label: string; isActive: boolean; onClick: () => void; count?: number }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 font-bebas uppercase tracking-wider text-xs transition-all duration-200 border whitespace-nowrap ${
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
    }`}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
        {count}
      </span>
    )}
  </button>
);

export const PlayerDatabase = () => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [nationFilter, setNationFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [dobFrom, setDobFrom] = useState('');
  const [dobTo, setDobTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [clubCountryMap, setClubCountryMap] = useState<Record<string, string>>({});

  const settings = useTableSettings('player-database', DB_COLUMNS);
  const dragScrollRef = useHorizontalDragScroll();

  useEffect(() => { fetchAllPlayers(); }, []);

  const fetchAllPlayers = async () => {
    try {
      const [scoutingResult, youthResult, proResult, clubLogosResult, clubCountryResult] = await Promise.all([
        supabase.from('scouting_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_youth').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_pro').select('*').order('created_at', { ascending: false }),
        supabase.from('club_map_positions').select('club_name, image_url'),
        supabase.from('club_map_positions').select('club_name, country')
      ]);

      if (scoutingResult.error) throw scoutingResult.error;
      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      const clubLogoMap: Record<string, string> = {};
      clubLogosResult.data?.forEach(club => {
        if (club.club_name && club.image_url) clubLogoMap[normalizeClubName(club.club_name)] = club.image_url;
      });

      const countryMap: Record<string, string> = {};
      clubCountryResult.data?.forEach(c => {
        if (c.club_name && c.country) countryMap[c.club_name.toLowerCase()] = c.country;
      });
      setClubCountryMap(countryMap);

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
            profile_image_url: null, club_logo_url: getClubLogo((outreach as any).current_club)
          };
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
            profile_image_url: null, club_logo_url: getClubLogo((outreach as any).current_club)
          };
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
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
      if (nationFilter !== 'all' && player.nationality !== nationFilter) return false;
      if (positionFilter.length > 0 && (!player.position || !positionFilter.includes(player.position))) return false;
      if (sourceFilter.length > 0 && !sourceFilter.includes(player.source)) return false;
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
  }, [players, searchQuery, ageFilter, nationFilter, positionFilter, sourceFilter, dobFrom, dobTo, sortField, sortDirection]);

  const visiblePlayers = filteredAndSortedPlayers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedPlayers.length;

  const clearAllFilters = () => {
    setSearchQuery(''); setAgeFilter('all'); setNationFilter('all'); setPositionFilter([]); setSourceFilter([]); setDobFrom(''); setDobTo('');
  };

  const hasActiveFilters = searchQuery || ageFilter !== 'all' || nationFilter !== 'all' || positionFilter.length > 0 || sourceFilter.length > 0 || dobFrom || dobTo;

  const togglePositionFilter = (pos: string) => setPositionFilter(prev => prev.includes(pos) ? prev.filter(v => v !== pos) : [...prev, pos]);
  const toggleSourceFilter = (src: string) => setSourceFilter(prev => prev.includes(src) ? prev.filter(v => v !== src) : [...prev, src]);

  if (loading) return <LoadingSpinner size="md" className="py-8" text="Loading player database..." />;

  return (
    <div className="space-y-3">
      {/* Header with settings */}
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
          showViewToggle={false}
        />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, club, position..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <FilterChip label="All Ages" isActive={ageFilter === 'all'} onClick={() => setAgeFilter('all')} />
          <FilterChip label="U18" isActive={ageFilter === 'u18'} onClick={() => setAgeFilter('u18')} />
          <FilterChip label="18-21" isActive={ageFilter === '18-21'} onClick={() => setAgeFilter('18-21')} />
          <FilterChip label="22-25" isActive={ageFilter === '22-25'} onClick={() => setAgeFilter('22-25')} />
          <FilterChip label="26-30" isActive={ageFilter === '26-30'} onClick={() => setAgeFilter('26-30')} />
          <FilterChip label="30+" isActive={ageFilter === '30+'} onClick={() => setAgeFilter('30+')} />
          <span className="w-px h-4 bg-border mx-1" />
          <FilterChip label="Scouting" isActive={sourceFilter.includes('scouting')} onClick={() => toggleSourceFilter('scouting')} />
          <FilterChip label="Youth" isActive={sourceFilter.includes('youth_outreach')} onClick={() => toggleSourceFilter('youth_outreach')} />
          <FilterChip label="Pro" isActive={sourceFilter.includes('pro_outreach')} onClick={() => toggleSourceFilter('pro_outreach')} />
          {hasActiveFilters && (
            <>
              <span className="w-px h-4 bg-border mx-1" />
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {uniquePositions.slice(0, 8).map(pos => (
            <FilterChip key={pos} label={pos} isActive={positionFilter.includes(pos)} onClick={() => togglePositionFilter(pos)} />
          ))}
          {uniquePositions.length > 8 && (
            <Select value={nationFilter} onValueChange={setNationFilter}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Nation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nations</SelectItem>
                {uniqueNations.map(nation => (
                  <SelectItem key={nation} value={nation}>{nation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-bebas uppercase tracking-wider">DOB:</span>
          <Input type="date" value={dobFrom} onChange={e => setDobFrom(e.target.value)} className="h-7 w-[140px] text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dobTo} onChange={e => setDobTo(e.target.value)} className="h-7 w-[140px] text-xs" />
          {(dobFrom || dobTo) && <button onClick={() => { setDobFrom(''); setDobTo(''); }} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{visiblePlayers.length} of {filteredAndSortedPlayers.length} players</div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {visiblePlayers.map((player) => (
          <div key={`${player.source}-${player.id}`} className="p-3 border rounded-lg bg-card/80 backdrop-blur-sm hover:bg-card transition-colors" onClick={() => { setSelectedPlayer(player); setEditDialogOpen(true); }}>
            <div className="flex items-center gap-3">
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

      {/* Desktop Table with drag scroll */}
      <div ref={dragScrollRef} className="hidden md:block border rounded-lg overflow-x-auto bg-card/50 cursor-grab active:cursor-grabbing">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {settings.isVisible('avatar') && <TableHead className="font-semibold text-xs w-12"></TableHead>}
              {settings.isVisible('name') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs" onClick={() => handleSort('player_name')}>
                  <div className="flex items-center">NAME {getSortIcon('player_name')}</div>
                </TableHead>
              )}
              {settings.isVisible('nationality') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-12" onClick={() => handleSort('nationality')}>
                  <div className="flex items-center">NAT {getSortIcon('nationality')}</div>
                </TableHead>
              )}
              {settings.isVisible('position') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-16" onClick={() => handleSort('position')}>
                  <div className="flex items-center">POS {getSortIcon('position')}</div>
                </TableHead>
              )}
              {settings.isVisible('age') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-12" onClick={() => handleSort('age')}>
                  <div className="flex items-center">AGE {getSortIcon('age')}</div>
                </TableHead>
              )}
              {settings.isVisible('club') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs" onClick={() => handleSort('current_club')}>
                  <div className="flex items-center">CLUB {getSortIcon('current_club')}</div>
                </TableHead>
              )}
              {settings.isVisible('dob') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-20" onClick={() => handleSort('date_of_birth')}>
                  <div className="flex items-center">DOB {getSortIcon('date_of_birth')}</div>
                </TableHead>
              )}
              {settings.isVisible('source') && <TableHead className="font-semibold text-xs w-16">SRC</TableHead>}
              {settings.isVisible('added') && (
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-20" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">ADDED {getSortIcon('created_at')}</div>
                </TableHead>
              )}
              {settings.isVisible('ig') && <TableHead className="font-semibold text-xs w-10 text-center">IG</TableHead>}
              {settings.isVisible('reports') && <TableHead className="font-semibold text-xs w-10 text-center">#</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePlayers.map((player) => {
              const clubCountry = findClubCountry(player.current_club, clubCountryMap);
              return (
                <TableRow key={`${player.source}-${player.id}`} className="hover:bg-muted/30 cursor-pointer group" onClick={() => { setSelectedPlayer(player); setEditDialogOpen(true); }}>
                  {settings.isVisible('avatar') && (
                    <TableCell className="py-1.5 pr-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.profile_image_url || undefined} alt={player.player_name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-semibold text-[10px]">
                          {player.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                  )}
                  {settings.isVisible('name') && <TableCell className="font-medium text-sm py-1.5">{player.player_name}</TableCell>}
                  {settings.isVisible('nationality') && (
                    <TableCell className="py-1.5">
                      {player.nationality ? <img src={getCountryFlagUrl(player.nationality)} alt={player.nationality} className="w-6 h-auto rounded-sm shadow-sm" title={player.nationality} /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  {settings.isVisible('position') && (
                    <TableCell className="text-sm py-1.5"><Badge variant="outline" className="text-[10px] font-medium">{player.position || '-'}</Badge></TableCell>
                  )}
                  {settings.isVisible('age') && <TableCell className="text-sm py-1.5">{player.age || '-'}</TableCell>}
                  {settings.isVisible('club') && (
                    <TableCell className="text-sm py-1.5">
                      <div className="flex items-center gap-2">
                        {clubCountry && <img src={getCountryFlagUrl(clubCountry)} alt={clubCountry} className="w-4 h-3 object-cover rounded-sm" title={clubCountry} />}
                        {player.club_logo_url && <img src={player.club_logo_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />}
                        <span className="truncate">{player.current_club || '-'}</span>
                      </div>
                    </TableCell>
                  )}
                  {settings.isVisible('dob') && (
                    <TableCell className="text-xs text-muted-foreground py-1.5">
                      {player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                    </TableCell>
                  )}
                  {settings.isVisible('source') && (
                    <TableCell className="text-xs py-1.5">
                      <Badge variant="secondary" className="text-[9px]">{player.source === 'scouting' ? 'Scout' : player.source === 'youth_outreach' ? 'Youth' : 'Pro'}</Badge>
                    </TableCell>
                  )}
                  {settings.isVisible('added') && (
                    <TableCell className="text-xs text-muted-foreground py-1.5">
                      {player.created_at ? new Date(player.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                    </TableCell>
                  )}
                  {settings.isVisible('ig') && (
                    <TableCell className="text-center py-1.5">
                      {player.ig_handle ? (
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://instagram.com/${player.ig_handle?.replace(/^@/, '')}`, '_blank'); }} className="p-0.5 hover:scale-110 transition-transform">
                          <FaInstagram className="h-4 w-4 text-[#E1306C]" />
                        </button>
                      ) : null}
                    </TableCell>
                  )}
                  {settings.isVisible('reports') && (
                    <TableCell className="text-center py-1.5">
                      {player.report_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">{player.report_count}</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
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

      {/* Detail Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Player Details</DialogTitle></DialogHeader>
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Name</span><p>{selectedPlayer.player_name}</p></div>
                <div><span className="font-medium text-muted-foreground">Position</span><p>{selectedPlayer.position || '-'}</p></div>
                <div><span className="font-medium text-muted-foreground">Age</span><p>{selectedPlayer.age || '-'}</p></div>
                <div><span className="font-medium text-muted-foreground">Date of Birth</span><p>{selectedPlayer.date_of_birth ? new Date(selectedPlayer.date_of_birth).toLocaleDateString() : '-'}</p></div>
                <div><span className="font-medium text-muted-foreground">Club</span><p>{selectedPlayer.current_club || '-'}</p></div>
                <div><span className="font-medium text-muted-foreground">Nationality</span><p>{selectedPlayer.nationality || '-'}</p></div>
                <div><span className="font-medium text-muted-foreground">Source</span><p className="capitalize">{selectedPlayer.source.replace('_', ' ')}</p></div>
                <div><span className="font-medium text-muted-foreground">Reports</span><p>{selectedPlayer.report_count}</p></div>
                {selectedPlayer.ig_handle && <div className="col-span-2"><span className="font-medium text-muted-foreground">Instagram</span><p>@{selectedPlayer.ig_handle}</p></div>}
                {selectedPlayer.notes && <div className="col-span-2"><span className="font-medium text-muted-foreground">Notes</span><p className="text-muted-foreground">{selectedPlayer.notes}</p></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
