import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Edit, ChevronDown } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
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
}

const ITEMS_PER_PAGE = 50;

export const PlayerDatabase = () => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [nationFilter, setNationFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  const fetchAllPlayers = async () => {
    try {
      const [scoutingResult, youthResult, proResult] = await Promise.all([
        supabase.from('scouting_reports').select('*').order('player_name', { ascending: true }),
        supabase.from('player_outreach_youth').select('*').order('player_name', { ascending: true }),
        supabase.from('player_outreach_pro').select('*').order('player_name', { ascending: true })
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
            notes: report.notes
          };
        } else {
          playerMap[name].report_count++;
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
            ig_handle: outreach.ig_handle
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
            ig_handle: outreach.ig_handle
          };
        }
      });

      const sortedPlayers = Object.values(playerMap).sort((a, b) => 
        a.player_name.localeCompare(b.player_name)
      );

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

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
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

      return true;
    });
  }, [players, searchQuery, ageFilter, nationFilter]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlayers.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleEditClick = (player: PlayerData) => {
    setSelectedPlayer(player);
    setEditDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading player database...</div>;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Filters */}
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

      {/* Results count */}
      <div className="text-xs md:text-sm text-muted-foreground">
        Showing {visiblePlayers.length} of {filteredPlayers.length} players
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto -mx-4 md:mx-0">
        <div className="min-w-[700px] md:min-w-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">NAME</TableHead>
              <TableHead className="font-semibold">NATIONALITY</TableHead>
              <TableHead className="font-semibold">POSITION</TableHead>
              <TableHead className="font-semibold">AGE</TableHead>
              <TableHead className="font-semibold">CLUB</TableHead>
              <TableHead className="font-semibold">BASED</TableHead>
              <TableHead className="font-semibold text-center">REPORTS</TableHead>
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
                <TableCell>{player.nationality || '-'}</TableCell>
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
            Load More ({filteredPlayers.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {filteredPlayers.length === 0 && (
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
};
