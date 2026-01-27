import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Users, UserPlus } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LateralFilter } from '@/components/LateralFilter';

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
  const [positionFilterExpanded, setPositionFilterExpanded] = useState(false);
  const [sourceFilterExpanded, setSourceFilterExpanded] = useState(false);

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

      // Add scouting reports
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
          // Keep the most recent created_at
          if (report.created_at && (!playerMap[name].created_at || report.created_at > playerMap[name].created_at)) {
            playerMap[name].created_at = report.created_at;
          }
        }
      });

      // Add youth outreach players
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

      // Add pro outreach players
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

  const positionOptions = useMemo(() => 
    uniquePositions.map(p => ({ label: p, value: p })), 
    [uniquePositions]
  );

  const sourceOptions = [
    { label: 'Scouting', value: 'scouting' },
    { label: 'Youth', value: 'youth_outreach' },
    { label: 'Pro', value: 'pro_outreach' }
  ];

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
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = player.player_name.toLowerCase().includes(query);
        const matchesClub = player.current_club?.toLowerCase().includes(query);
        const matchesPosition = player.position?.toLowerCase().includes(query);
        if (!matchesName && !matchesClub && !matchesPosition) return false;
      }

      // Age filter
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

      // Nation filter
      if (nationFilter !== 'all') {
        if (player.nationality !== nationFilter) return false;
      }

      // Position filter
      if (positionFilter.length > 0) {
        if (!player.position || !positionFilter.includes(player.position)) return false;
      }

      // Source filter
      if (sourceFilter.length > 0) {
        if (!sourceFilter.includes(player.source)) return false;
      }

      return true;
    });

    // Sort
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

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text="Loading player database..." />;
  }

  const renderDatabaseTable = () => (
    <div className="space-y-3 md:space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, club, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="flex-1 sm:w-[120px]">
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="u18">Under 18</SelectItem>
                <SelectItem value="18-21">18-21</SelectItem>
                <SelectItem value="22-25">22-25</SelectItem>
                <SelectItem value="26-30">26-30</SelectItem>
                <SelectItem value="30+">30+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={nationFilter} onValueChange={setNationFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px]">
                <SelectValue placeholder="Nation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nations</SelectItem>
                {uniqueNations.map(nation => (
                  <SelectItem key={nation} value={nation}>{nation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lateral Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <LateralFilter
            label="Position"
            options={positionOptions}
            selectedValues={positionFilter}
            onToggle={(value) => setPositionFilter(prev => 
              prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            )}
            onClear={() => setPositionFilter([])}
            isExpanded={positionFilterExpanded}
            onExpandedChange={setPositionFilterExpanded}
          />
          
          <LateralFilter
            label="Source"
            options={sourceOptions}
            selectedValues={sourceFilter}
            onToggle={(value) => setSourceFilter(prev => 
              prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            )}
            onClear={() => setSourceFilter([])}
            isExpanded={sourceFilterExpanded}
            onExpandedChange={setSourceFilterExpanded}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs md:text-sm text-muted-foreground">
        Showing {visiblePlayers.length} of {filteredAndSortedPlayers.length} players
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto -mx-4 md:mx-0">
        <div className="min-w-[700px] md:min-w-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('player_name')}
              >
                <div className="flex items-center">
                  NAME {getSortIcon('player_name')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('nationality')}
              >
                <div className="flex items-center">
                  NATIONALITY {getSortIcon('nationality')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center">
                  POSITION {getSortIcon('position')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('age')}
              >
                <div className="flex items-center">
                  AGE {getSortIcon('age')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('current_club')}
              >
                <div className="flex items-center">
                  CLUB {getSortIcon('current_club')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  ADDED {getSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-center cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('report_count')}
              >
                <div className="flex items-center justify-center">
                  REPORTS {getSortIcon('report_count')}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePlayers.map((player) => (
              <TableRow key={`${player.source}-${player.id}`} className="hover:bg-muted/30">
                <TableCell className="font-medium">{player.player_name}</TableCell>
                <TableCell>
                  {player.nationality ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={getCountryFlagUrl(player.nationality)} 
                        alt={player.nationality}
                        className="w-5 h-auto rounded-sm"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="text-sm">{player.nationality}</span>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>{player.position || '-'}</TableCell>
                <TableCell>{player.age || '-'}</TableCell>
                <TableCell>{player.current_club || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {player.created_at ? new Date(player.created_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium ${
                    player.report_count > 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {player.report_count}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(player)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        </div>
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

// Embedded outreach component that shows only youth or pro
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

  if (loading) {
    return <LoadingSpinner size="md" className="py-8" text={`Loading ${type} outreach...`} />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {data.length} {type} outreach entries
      </div>
      
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">NAME</TableHead>
              <TableHead className="font-semibold">CLUB</TableHead>
              <TableHead className="font-semibold">INSTAGRAM</TableHead>
              <TableHead className="font-semibold text-center">MESSAGED</TableHead>
              <TableHead className="font-semibold text-center">RESPONSE</TableHead>
              {type === 'youth' && <TableHead className="font-semibold text-center">PARENT APPROVAL</TableHead>}
              <TableHead className="font-semibold">NOTES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={type === 'youth' ? 7 : 6} className="text-center text-muted-foreground py-8">
                  No {type} outreach entries yet
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.player_name}</TableCell>
                  <TableCell>{item.current_club || '-'}</TableCell>
                  <TableCell>
                    {item.ig_handle ? (
                      <a 
                        href={`https://instagram.com/${item.ig_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{item.ig_handle.replace('@', '')}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      item.messaged ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.messaged ? '✓' : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      item.response_received ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.response_received ? '✓' : '-'}
                    </span>
                  </TableCell>
                  {type === 'youth' && (
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        item.parent_approval ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.parent_approval ? '✓' : '-'}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {item.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
