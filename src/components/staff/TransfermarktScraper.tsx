import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, UserX, Users, X, UserPlus, Check } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchFilters {
  position?: string;
  ageMin?: number;
  ageMax?: number;
  nationality?: string;
  countryPlayingIn?: string;
  clubName?: string;
  marketValueMin?: number;
  marketValueMax?: number;
}

interface PlayerResult {
  name: string;
  position: string;
  age: string;
  nationality: string;
  club: string;
  marketValue: string;
  contractUntil: string;
  agentStatus: 'no_agent' | 'family_agent' | 'unknown';
  agentName?: string;
  transfermarktUrl: string;
}

interface TransfermarktScraperProps {
  visible: boolean;
  onClose: () => void;
}

const POSITIONS = [
  { value: 'any', label: 'Any Position' },
  { value: 'goalkeeper', label: 'Goalkeeper' },
  { value: 'centre-back', label: 'Centre-Back' },
  { value: 'left-back', label: 'Left-Back' },
  { value: 'right-back', label: 'Right-Back' },
  { value: 'defensive midfield', label: 'Defensive Midfield' },
  { value: 'central midfield', label: 'Central Midfield' },
  { value: 'attacking midfield', label: 'Attacking Midfield' },
  { value: 'left winger', label: 'Left Winger' },
  { value: 'right winger', label: 'Right Winger' },
  { value: 'centre-forward', label: 'Centre-Forward' },
];

const NATIONALITIES = [
  { value: 'any', label: 'Any Nationality' },
  { value: '189', label: 'England' },
  { value: '190', label: 'Scotland' },
  { value: '191', label: 'Wales' },
  { value: '192', label: 'Northern Ireland' },
  { value: '193', label: 'Republic of Ireland' },
  { value: '50', label: 'France' },
  { value: '157', label: 'Spain' },
  { value: '40', label: 'Germany' },
  { value: '75', label: 'Italy' },
  { value: '122', label: 'Netherlands' },
  { value: '136', label: 'Portugal' },
  { value: '24', label: 'Brazil' },
  { value: '9', label: 'Argentina' },
  { value: '125', label: 'Nigeria' },
  { value: '152', label: 'Senegal' },
  { value: '54', label: 'Ghana' },
  { value: '68', label: 'Jamaica' },
  { value: '185', label: 'USA' },
  { value: '32', label: 'Canada' },
  { value: '14', label: 'Australia' },
  { value: '39', label: 'Belgium' },
];

const LEAGUES = [
  { group: 'England', items: [
    { value: 'GB1', label: 'Premier League' },
    { value: 'GB2', label: 'Championship' },
    { value: 'GB3', label: 'League One' },
    { value: 'GB4', label: 'League Two' },
  ]},
  { group: 'Scotland', items: [
    { value: 'SC1', label: 'Premiership' },
    { value: 'SC2', label: 'Championship' },
  ]},
  { group: 'France', items: [
    { value: 'FR1', label: 'Ligue 1' },
    { value: 'FR2', label: 'Ligue 2' },
  ]},
  { group: 'Spain', items: [
    { value: 'ES1', label: 'La Liga' },
    { value: 'ES2', label: 'La Liga 2' },
  ]},
  { group: 'Germany', items: [
    { value: 'L1', label: 'Bundesliga' },
    { value: 'L2', label: '2. Bundesliga' },
  ]},
  { group: 'Italy', items: [
    { value: 'IT1', label: 'Serie A' },
    { value: 'IT2', label: 'Serie B' },
  ]},
  { group: 'Netherlands', items: [
    { value: 'NL1', label: 'Eredivisie' },
  ]},
  { group: 'Portugal', items: [
    { value: 'PO1', label: 'Liga Portugal' },
  ]},
  { group: 'Belgium', items: [
    { value: 'BE1', label: 'Pro League' },
  ]},
  { group: 'Turkiye', items: [
    { value: 'TS1', label: 'Super Lig' },
  ]},
  { group: 'Austria', items: [
    { value: 'A1', label: 'Bundesliga' },
  ]},
  { group: 'Switzerland', items: [
    { value: 'C1', label: 'Super League' },
  ]},
  { group: 'Scandinavia', items: [
    { value: 'SE1', label: 'Sweden - Allsvenskan' },
    { value: 'NO1', label: 'Norway - Eliteserien' },
    { value: 'DK1', label: 'Denmark - Superliga' },
  ]},
  { group: 'Eastern Europe', items: [
    { value: 'PL1', label: 'Poland - Ekstraklasa' },
    { value: 'CZ1', label: 'Czech Republic - First League' },
    { value: 'RO1', label: 'Romania - Liga I' },
    { value: 'KR1', label: 'Croatia - HNL' },
    { value: 'UKR1', label: 'Ukraine - Premier League' },
    { value: 'GR1', label: 'Greece - Super League' },
    { value: 'RU1', label: 'Russia - Premier League' },
    { value: 'SER1', label: 'Serbia - SuperLiga' },
  ]},
  { group: 'Other', items: [
    { value: 'WAL1', label: 'Wales - Cymru Premier' },
    { value: 'NI1', label: 'Northern Ireland - Premiership' },
    { value: 'IR1', label: 'Republic of Ireland - Premier Division' },
  ]},
];

/** Parse a market value string like "€5.00m" or "€500k" into a number in millions */
function parseMarketValue(mv: string): number | null {
  if (!mv) return null;
  const cleaned = mv.replace(/[€£$\s]/g, '').toLowerCase();
  const mMatch = cleaned.match(/([\d.]+)m/);
  if (mMatch) return parseFloat(mMatch[1]);
  const kMatch = cleaned.match(/([\d.]+)k/);
  if (kMatch) return parseFloat(kMatch[1]) / 1000;
  const numMatch = cleaned.match(/([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]) / 1000000;
  return null;
}

export const TransfermarktScraper = ({ visible, onClose }: TransfermarktScraperProps) => {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<PlayerResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [addingPlayers, setAddingPlayers] = useState<Set<number>>(new Set());
  const [addedPlayers, setAddedPlayers] = useState<Set<number>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const isMobile = useIsMobile();

  if (!visible) return null;

  const applyClientFilters = (players: PlayerResult[]) => {
    let filtered = players;

    // Club name filter (client-side)
    if (filters.clubName?.trim()) {
      const search = filters.clubName.trim().toLowerCase();
      filtered = filtered.filter(p => p.club?.toLowerCase().includes(search));
    }

    // Market value filter (client-side)
    if (filters.marketValueMin != null || filters.marketValueMax != null) {
      filtered = filtered.filter(p => {
        const val = parseMarketValue(p.marketValue);
        if (val === null) return false;
        if (filters.marketValueMin != null && val < filters.marketValueMin) return false;
        if (filters.marketValueMax != null && val > filters.marketValueMax) return false;
        return true;
      });
    }

    return filtered;
  };

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    setAddedPlayers(new Set());
    try {
      const { data, error } = await invokeEdgeFunction<any>('scrape-transfermarkt', {
        body: {
          filters: {
            ...filters,
            position: filters.position === 'any' ? undefined : filters.position,
            nationality: filters.nationality === 'any' ? undefined : filters.nationality,
            countryPlayingIn: filters.countryPlayingIn === 'any' ? undefined : filters.countryPlayingIn,
            // Don't send client-side filters to server
            clubName: undefined,
            marketValueMin: undefined,
            marketValueMax: undefined,
          },
          confederation: 'UEFA',
        },
      });

      if (error) throw error;

      if (data?.success) {
        const allPlayers = data.players || [];
        setResults(allPlayers);
        setTotalFound(data.totalFound || 0);

        const clientFiltered = applyClientFilters(allPlayers);
        setFilteredResults(clientFiltered);

        if (clientFiltered.length === 0) {
          toast.info("No unrepresented players found matching your criteria");
        } else {
          toast.success(`Found ${clientFiltered.length} unrepresented player${clientFiltered.length !== 1 ? 's' : ''} from ${data.totalFound} results`);
        }
      } else {
        toast.error(data?.error || "Search failed");
      }
    } catch (error: any) {
      console.error('Scraper error:', error);
      toast.error(error?.message || "Failed to search Transfermarkt. Try again.");
    } finally {
      setSearching(false);
    }
  };

  // Re-apply client filters when club/market value changes post-search
  const handleClientFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    if (results.length > 0) {
      setFilteredResults(applyClientFilters(results));
    }
  };

  const addPlayerToDatabase = async (player: PlayerResult, idx: number): Promise<boolean> => {
    const age = parseInt(player.age);
    const isYouth = !isNaN(age) && age < 18;
    const tableName = isYouth ? 'player_outreach_youth' : 'player_outreach_pro';

    const { error } = await supabase.from(tableName).insert({
      player_name: player.name,
      position: player.position || null,
      nationality: player.nationality || null,
      current_club: player.club || null,
      age: !isNaN(age) ? age : null,
      notes: `Source: Transfermarkt\nAgent: ${player.agentStatus === 'no_agent' ? 'No Agent' : 'Family Agent'}\nMarket Value: ${player.marketValue || 'N/A'}\nProfile: ${player.transfermarktUrl}`,
    });

    if (error) throw error;
    return isYouth;
  };

  const handleAddToDatabase = async (player: PlayerResult, idx: number) => {
    setAddingPlayers(prev => new Set(prev).add(idx));
    try {
      const isYouth = await addPlayerToDatabase(player, idx);
      setAddedPlayers(prev => new Set(prev).add(idx));
      toast.success(`${player.name} added to ${isYouth ? 'Youth' : 'Pro'} outreach`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add player');
    } finally {
      setAddingPlayers(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const handleAddAllToDatabase = async () => {
    const unadded = displayResults
      .map((player, idx) => ({ player, idx }))
      .filter(({ idx }) => !addedPlayers.has(idx));

    if (unadded.length === 0) {
      toast.info("All players have already been added");
      return;
    }

    setAddingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const { player, idx } of unadded) {
      try {
        await addPlayerToDatabase(player, idx);
        setAddedPlayers(prev => new Set(prev).add(idx));
        successCount++;
      } catch {
        failCount++;
      }
    }

    setAddingAll(false);
    if (failCount === 0) {
      toast.success(`Added all ${successCount} players to outreach`);
    } else {
      toast.warning(`Added ${successCount} players, ${failCount} failed`);
    }
  };

  const displayResults = filteredResults;
  const allAdded = displayResults.length > 0 && displayResults.every((_, idx) => addedPlayers.has(idx));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5" />
            Transfermarkt Scraper
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Search for unrepresented players. Only returns players with no agent or family members listed as their representative.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* League */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">League</Label>
              <Select value={filters.countryPlayingIn || 'any'} onValueChange={v => setFilters(f => ({ ...f, countryPlayingIn: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any League" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any League</SelectItem>
                  {LEAGUES.map(group => (
                    <SelectGroup key={group.group}>
                      <SelectLabel className="text-xs text-muted-foreground font-semibold">{group.group}</SelectLabel>
                      {group.items.map(item => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Club */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Club</Label>
              <Input
                placeholder="Filter by club name"
                value={filters.clubName || ''}
                onChange={e => handleClientFilterChange({ ...filters, clubName: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Position */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Position</Label>
              <Select value={filters.position || 'any'} onValueChange={v => setFilters(f => ({ ...f, position: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Age */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Min Age</Label>
              <Input
                type="number"
                placeholder="e.g. 16"
                value={filters.ageMin || ''}
                onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="h-9"
              />
            </div>

            {/* Max Age */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Max Age</Label>
              <Input
                type="number"
                placeholder="e.g. 23"
                value={filters.ageMax || ''}
                onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="h-9"
              />
            </div>

            {/* Nationality */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Nationality</Label>
              <Select value={filters.nationality || 'any'} onValueChange={v => setFilters(f => ({ ...f, nationality: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map(n => (
                    <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Market Value Min */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Min Value (€m)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 0.5"
                value={filters.marketValueMin ?? ''}
                onChange={e => handleClientFilterChange({ ...filters, marketValueMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="h-9"
              />
            </div>

            {/* Market Value Max */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Max Value (€m)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 10"
                value={filters.marketValueMax ?? ''}
                onChange={e => handleClientFilterChange({ ...filters, marketValueMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="h-9"
              />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={searching} className="w-full h-9">
                {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Confederation: UEFA</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="min-h-[200px]">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scraping Transfermarkt for unrepresented players...</p>
            <p className="text-xs text-muted-foreground">This may take up to 30 seconds</p>
          </div>
        ) : displayResults.length > 0 ? (
          <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <UserX className="h-3 w-3 mr-1" />
                {displayResults.length} unrepresented player{displayResults.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {totalFound} total scanned
              </Badge>
              {results.length !== displayResults.length && (
                <Badge variant="secondary" className="text-xs">
                  {results.length} before client filters
                </Badge>
              )}
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllToDatabase}
                  disabled={addingAll || allAdded}
                  className="h-8 text-xs"
                >
                  {addingAll ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Adding...</>
                  ) : allAdded ? (
                    <><Check className="h-3.5 w-3.5 mr-1.5" /> All Added</>
                  ) : (
                    <><Users className="h-3.5 w-3.5 mr-1.5" /> Add All to Database</>
                  )}
                </Button>
              </div>
            </div>

            {/* Mobile: compact card layout */}
            {isMobile ? (
              <div className="space-y-2">
                {displayResults.map((player, idx) => (
                  <div key={idx} className="p-3 rounded-md border bg-card flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{player.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{player.position} · {player.age} · {player.club}</p>
                      {player.marketValue && (
                        <p className="text-xs text-primary font-medium">{player.marketValue}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={player.transfermarktUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {addedPlayers.has(idx) ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" disabled>
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={addingPlayers.has(idx)}
                          onClick={() => handleAddToDatabase(player, idx)}
                        >
                          {addingPlayers.has(idx) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: full table */
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Link</TableHead>
                      <TableHead className="w-[70px]">Add</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayResults.map((player, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="text-sm">{player.position || '-'}</TableCell>
                        <TableCell>{player.age || '-'}</TableCell>
                        <TableCell className="text-sm">{player.nationality || '-'}</TableCell>
                        <TableCell className="text-sm">{player.club || '-'}</TableCell>
                        <TableCell className="text-sm font-medium text-primary">{player.marketValue || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={player.agentStatus === 'no_agent'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }
                          >
                            {player.agentStatus === 'no_agent' ? 'No Agent' : 'Family Agent'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={player.transfermarktUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </TableCell>
                        <TableCell>
                          {addedPlayers.has(idx) ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" disabled>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={addingPlayers.has(idx)}
                              onClick={() => handleAddToDatabase(player, idx)}
                              title="Add to Player Outreach"
                            >
                              {addingPlayers.has(idx) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : hasSearched ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">No unrepresented players found</p>
            <p className="text-xs">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Search className="h-10 w-10 opacity-30" />
            <p className="text-sm">Set your filters and click Search</p>
            <p className="text-xs">Results will show only players without an agent or with family as their representative</p>
          </div>
        )}
      </div>
    </div>
  );
};
