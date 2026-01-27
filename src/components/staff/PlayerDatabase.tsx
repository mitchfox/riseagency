import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Users, UserPlus, ExternalLink } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

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
}

type SortField = 'player_name' | 'age' | 'position' | 'nationality' | 'current_club' | 'report_count' | 'created_at';
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

// Filter chip button component for unified styling
const FilterChip = ({ 
  label, 
  isActive, 
  onClick, 
  count 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
  count?: number;
}) => (
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
      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
      }`}>
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
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState('database');

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  const fetchAllPlayers = async () => {
    try {
      const [scoutingResult, youthResult, proResult] = await Promise.all([
        supabase.from('scouting_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_youth').select('*').order('created_at', { ascending: false }),
        supabase.from('player_outreach_pro').select('*').order('created_at', { ascending: false })
      ]);

      if (scoutingResult.error) throw scoutingResult.error;
      if (youthResult.error) throw youthResult.error;
      if (proResult.error) throw proResult.error;

      const playerMap: Record<string, PlayerData> = {};

      scoutingResult.data?.forEach(report => {
        const name = report.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: report.id,
            player_name: name,
            position: report.position,
            age: report.age,
            current_club: report.current_club,
            nationality: report.nationality,
            date_of_birth: report.date_of_birth,
            report_count: 1,
            source: 'scouting',
            notes: report.notes,
            created_at: report.created_at
          };
        } else {
          playerMap[name].report_count++;
          if (report.created_at && (!playerMap[name].created_at || report.created_at > playerMap[name].created_at)) {
            playerMap[name].created_at = report.created_at;
          }
        }
      });

      youthResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: outreach.id,
            player_name: name,
            position: (outreach as any).position || null,
            age: (outreach as any).age || null,
            current_club: (outreach as any).current_club || null,
            nationality: (outreach as any).nationality || null,
            date_of_birth: (outreach as any).date_of_birth || null,
            report_count: 0,
            source: 'youth_outreach',
            notes: outreach.notes,
            ig_handle: outreach.ig_handle,
            created_at: outreach.created_at
          };
        }
      });

      proResult.data?.forEach(outreach => {
        const name = outreach.player_name;
        if (!playerMap[name]) {
          playerMap[name] = {
            id: outreach.id,
            player_name: name,
            position: (outreach as any).position || null,
            age: (outreach as any).age || null,
            current_club: (outreach as any).current_club || null,
            nationality: (outreach as any).nationality || null,
            date_of_birth: (outreach as any).date_of_birth || null,
            report_count: 0,
            source: 'pro_outreach',
            notes: outreach.notes,
            ig_handle: outreach.ig_handle,
            created_at: outreach.created_at
          };
        }
      });

      const sortedPlayers = Object.values(playerMap).sort((a, b) => {
        if (b.created_at && a.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
      });

      setPlayers(sortedPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load player database');
    } finally {
      setLoading(false);
    }
  };

  const uniqueNations = useMemo(() => {
    const nations = players
      .map(p => p.nationality)
      .filter((n): n is string => !!n);
    return [...new Set(nations)].sort();
  }, [players]);

  const uniquePositions = useMemo(() => {
    const positions = players
      .map(p => p.position)
      .filter((p): p is string => !!p);
    return [...new Set(positions)].sort((a, b) => getPositionOrder(a) - getPositionOrder(b));
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
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSortedPlayers = useMemo(() => {
    let result = players.filter(player => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = player.player_name.toLowerCase().includes(query);
        const matchesClub = player.current_club?.toLowerCase().includes(query);
        const matchesPosition = player.position?.toLowerCase().includes(query);
        if (!matchesName && !matchesClub && !matchesPosition) return false;
      }

      if (ageFilter !== 'all' && player.age) {
        const age = player.age;
        switch (ageFilter) {
          case 'u18': if (age >= 18) return false; break;
          case '18-21': if (age < 18 || age > 21) return false; break;
          case '22-25': if (age < 22 || age > 25) return false; break;
          case '26-30': if (age < 26 || age > 30) return false; break;
          case '30+': if (age < 30) return false; break;
        }
      }

      if (nationFilter !== 'all') {
        if (player.nationality !== nationFilter) return false;
      }

      if (positionFilter.length > 0) {
        if (!player.position || !positionFilter.includes(player.position)) return false;
      }

      if (sourceFilter.length > 0) {
        if (!sourceFilter.includes(player.source)) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'player_name':
          comparison = a.player_name.localeCompare(b.player_name);
          break;
        case 'age':
          comparison = (a.age || 999) - (b.age || 999);
          break;
        case 'position':
          comparison = getPositionOrder(a.position) - getPositionOrder(b.position);
          break;
        case 'nationality':
          comparison = (a.nationality || 'ZZZ').localeCompare(b.nationality || 'ZZZ');
          break;
        case 'current_club':
          comparison = (a.current_club || 'ZZZ').localeCompare(b.current_club || 'ZZZ');
          break;
        case 'report_count':
          comparison = a.report_count - b.report_count;
          break;
        case 'created_at':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [players, searchQuery, ageFilter, nationFilter, positionFilter, sourceFilter, sortField, sortDirection]);

  const visiblePlayers = filteredAndSortedPlayers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedPlayers.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleEditClick = (player: PlayerData) => {
    setSelectedPlayer(player);
    setEditDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setAgeFilter('all');
    setNationFilter('all');
    setPositionFilter([]);
    setSourceFilter([]);
  };

  const hasActiveFilters = searchQuery || ageFilter !== 'all' || nationFilter !== 'all' || positionFilter.length > 0 || sourceFilter.length > 0;

  const togglePositionFilter = (pos: string) => {
    setPositionFilter(prev => 
      prev.includes(pos) ? prev.filter(v => v !== pos) : [...prev, pos]
    );
  };

  const toggleSourceFilter = (src: string) => {
    setSourceFilter(prev => 
      prev.includes(src) ? prev.filter(v => v !== src) : [...prev, src]
    );
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text="Loading player database..." />;
  }

  const renderDatabaseTable = () => (
    <div className="space-y-3">
      {/* Unified Filters */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, club, position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filter chips row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Age filters */}
          <FilterChip label="All Ages" isActive={ageFilter === 'all'} onClick={() => setAgeFilter('all')} />
          <FilterChip label="U18" isActive={ageFilter === 'u18'} onClick={() => setAgeFilter('u18')} />
          <FilterChip label="18-21" isActive={ageFilter === '18-21'} onClick={() => setAgeFilter('18-21')} />
          <FilterChip label="22-25" isActive={ageFilter === '22-25'} onClick={() => setAgeFilter('22-25')} />
          <FilterChip label="26-30" isActive={ageFilter === '26-30'} onClick={() => setAgeFilter('26-30')} />
          <FilterChip label="30+" isActive={ageFilter === '30+'} onClick={() => setAgeFilter('30+')} />
          
          <span className="w-px h-4 bg-border mx-1" />
          
          {/* Source filters */}
          <FilterChip 
            label="Scouting" 
            isActive={sourceFilter.includes('scouting')} 
            onClick={() => toggleSourceFilter('scouting')} 
          />
          <FilterChip 
            label="Youth" 
            isActive={sourceFilter.includes('youth_outreach')} 
            onClick={() => toggleSourceFilter('youth_outreach')} 
          />
          <FilterChip 
            label="Pro" 
            isActive={sourceFilter.includes('pro_outreach')} 
            onClick={() => toggleSourceFilter('pro_outreach')} 
          />
          
          {hasActiveFilters && (
            <>
              <span className="w-px h-4 bg-border mx-1" />
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Position filters (collapsible on mobile) */}
        <div className="flex flex-wrap gap-1">
          {uniquePositions.slice(0, 8).map(pos => (
            <FilterChip 
              key={pos}
              label={pos} 
              isActive={positionFilter.includes(pos)} 
              onClick={() => togglePositionFilter(pos)} 
            />
          ))}
          {uniquePositions.length > 8 && (
            <Select value={nationFilter} onValueChange={setNationFilter}>
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue placeholder="Nation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nations</SelectItem>
                {uniqueNations.map(nation => (
                  <SelectItem key={nation} value={nation}>{nation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {visiblePlayers.length} of {filteredAndSortedPlayers.length} players
      </div>

      {/* Responsive Table - Mobile cards, Desktop table */}
      <div className="md:hidden space-y-2">
        {visiblePlayers.map((player) => (
          <div 
            key={`${player.source}-${player.id}`} 
            className="p-3 border rounded-lg bg-card"
            onClick={() => handleEditClick(player)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {player.nationality && (
                  <img 
                    src={getCountryFlagUrl(player.nationality)} 
                    alt={player.nationality}
                    className="w-5 h-auto rounded-sm flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span className="font-medium truncate">{player.player_name}</span>
              </div>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {player.position || '-'}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{player.current_club || '-'}</span>
              <span>{player.age ? `${player.age}y` : '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs"
                onClick={() => handleSort('player_name')}
              >
                <div className="flex items-center">
                  NAME {getSortIcon('player_name')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-10"
                onClick={() => handleSort('nationality')}
              >
                <div className="flex items-center">
                  NAT {getSortIcon('nationality')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center">
                  POS {getSortIcon('position')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-12"
                onClick={() => handleSort('age')}
              >
                <div className="flex items-center">
                  AGE {getSortIcon('age')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs"
                onClick={() => handleSort('current_club')}
              >
                <div className="flex items-center">
                  CLUB {getSortIcon('current_club')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors text-xs w-20"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  ADDED {getSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs w-8 text-center">#</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePlayers.map((player) => (
              <TableRow 
                key={`${player.source}-${player.id}`} 
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => handleEditClick(player)}
              >
                <TableCell className="font-medium text-sm py-2">{player.player_name}</TableCell>
                <TableCell className="py-2">
                  {player.nationality ? (
                    <img 
                      src={getCountryFlagUrl(player.nationality)} 
                      alt={player.nationality}
                      className="w-5 h-auto rounded-sm"
                      title={player.nationality}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : '-'}
                </TableCell>
                <TableCell className="text-sm py-2">{player.position || '-'}</TableCell>
                <TableCell className="text-sm py-2">{player.age || '-'}</TableCell>
                <TableCell className="text-sm py-2">{player.current_club || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">
                  {player.created_at ? new Date(player.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                </TableCell>
                <TableCell className="text-center py-2">
                  {player.report_count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">
                      {player.report_count}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore} className="gap-2">
            <ChevronDown className="h-4 w-4" />
            Load More ({filteredAndSortedPlayers.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {filteredAndSortedPlayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No players found matching your filters
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Details</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Name</span>
                  <p>{selectedPlayer.player_name}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Position</span>
                  <p>{selectedPlayer.position || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Age</span>
                  <p>{selectedPlayer.age || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Date of Birth</span>
                  <p>{selectedPlayer.date_of_birth ? new Date(selectedPlayer.date_of_birth).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Club</span>
                  <p>{selectedPlayer.current_club || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Nationality</span>
                  <p>{selectedPlayer.nationality || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Source</span>
                  <p className="capitalize">{selectedPlayer.source.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Reports</span>
                  <p>{selectedPlayer.report_count}</p>
                </div>
                {selectedPlayer.ig_handle && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Instagram</span>
                    <p>@{selectedPlayer.ig_handle}</p>
                  </div>
                )}
                {selectedPlayer.notes && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Notes</span>
                    <p className="text-muted-foreground">{selectedPlayer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full h-10 p-1 grid grid-cols-3 mb-4">
        <TabsTrigger value="database" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">All Players</span>
          <span className="sm:hidden">All</span>
        </TabsTrigger>
        <TabsTrigger value="youth" className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Youth Outreach</span>
          <span className="sm:hidden">Youth</span>
        </TabsTrigger>
        <TabsTrigger value="pro" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Pro Outreach</span>
          <span className="sm:hidden">Pro</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="database" className="mt-0">
        {renderDatabaseTable()}
      </TabsContent>

      <TabsContent value="youth" className="mt-0">
        <PlayerOutreachEmbed type="youth" />
      </TabsContent>

      <TabsContent value="pro" className="mt-0">
        <PlayerOutreachEmbed type="pro" />
      </TabsContent>
    </Tabs>
  );
};

// Embedded outreach component with full features
const PlayerOutreachEmbed = ({ type }: { type: 'youth' | 'pro' }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
        const { data: result, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setData(result || []);
      } catch (error) {
        console.error(`Error fetching ${type} outreach:`, error);
        toast.error(`Failed to load ${type} outreach data`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type]);

  const toggleField = async (id: string, field: string, currentValue: boolean) => {
    const tableName = type === 'youth' ? 'player_outreach_youth' : 'player_outreach_pro';
    
    // Optimistic update
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: !currentValue } : item
    ));
    
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: !currentValue })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      // Revert on error
      setData(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: currentValue } : item
      ));
      toast.error('Failed to save');
    }
  };

  const openInstagram = (handle: string | null) => {
    if (!handle) return;
    const cleanHandle = handle.replace('@', '').trim();
    if (!cleanHandle) return;
    // Open in new tab to avoid iframe blocking
    window.open(`https://instagram.com/${cleanHandle}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text={`Loading ${type} outreach...`} />;
  }

  // Group by status
  const notMessaged = data.filter(d => !d.messaged);
  const noResponse = data.filter(d => d.messaged && !d.response_received);
  const responded = data.filter(d => d.response_received);

  const renderSection = (items: any[], title: string) => (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div className="bg-muted/50 px-3 py-2 font-semibold text-sm">
        {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">No entries</div>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{item.player_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.current_club || '-'}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.ig_handle && (
                    <button
                      onClick={() => openInstagram(item.ig_handle)}
                      className="text-primary hover:text-primary/80 p-1"
                      title={`@${item.ig_handle.replace('@', '')}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={item.messaged}
                      onCheckedChange={() => toggleField(item.id, 'messaged', item.messaged)}
                    />
                    <span className="text-[10px] text-muted-foreground">MSG</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={item.response_received}
                      onCheckedChange={() => toggleField(item.id, 'response_received', item.response_received)}
                    />
                    <span className="text-[10px] text-muted-foreground">RSP</span>
                  </div>
                  {type === 'youth' && (
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={item.parent_approval}
                        onCheckedChange={() => toggleField(item.id, 'parent_approval', item.parent_approval)}
                      />
                      <span className="text-[10px] text-muted-foreground">APR</span>
                    </div>
                  )}
                </div>
              </div>
              {type === 'youth' && item.parents_name && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <span>Parent: {item.parents_name}</span>
                  {item.parent_contact && (
                    <button
                      onClick={() => openInstagram(item.parent_contact)}
                      className="text-primary hover:text-primary/80"
                      title={`@${item.parent_contact.replace('@', '')}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              {item.notes && (
                <div className="mt-1 text-xs text-muted-foreground truncate">{item.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-2">
        {data.length} {type} outreach entries
      </div>
      
      {renderSection(notMessaged, 'Not Messaged')}
      {renderSection(noResponse, 'Awaiting Response')}
      {renderSection(responded, 'Responded')}
    </div>
  );
};
