import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Search, ExternalLink, UserX, Users, X, Star, Cake, ChevronDown, Terminal } from "lucide-react";
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
  excludeLoans?: boolean;
  contractStatus?: string;
  birthdayToday?: boolean;
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
  isLoan?: boolean;
  dateOfBirth?: string;
}

interface TransfermarktScraperProps {
  visible: boolean;
  onClose: () => void;
}
const POSITION_ABBREVIATIONS: Record<string, string> = {
  'goalkeeper': 'GK',
  'centre-back': 'CB',
  'left-back': 'LB',
  'right-back': 'RB',
  'defensive midfield': 'DM',
  'central midfield': 'CM',
  'attacking midfield': 'AM',
  'left winger': 'LW',
  'right winger': 'RW',
  'centre-forward': 'CF',
  'second striker': 'SS',
  'left midfield': 'LM',
  'right midfield': 'RM',
};

const abbreviatePosition = (pos: string): string => {
  if (!pos) return '-';
  const key = pos.toLowerCase();
  return POSITION_ABBREVIATIONS[key] || pos;
};


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

// Countries that are semi-European / non-UEFA but have talented players — no UEFA filter applied
const NON_UEFA_LEAGUE_CODES = new Set([
  'GEO1', 'KAZ1', 'AZE1', 'ISR1', 'CYP1',
]);

const LEAGUES = [
  { group: 'England', items: [
    { value: 'GB1', label: 'Premier League' },
    { value: 'GB2', label: 'Championship' },
    { value: 'GB3', label: 'League One' },
    { value: 'GB4', label: 'League Two' },
    { value: 'GB5', label: 'National League' },
  ]},
  { group: 'Scotland', items: [
    { value: 'SC1', label: 'Premiership' },
    { value: 'SC2', label: 'Championship' },
    { value: 'SC3', label: 'League One' },
  ]},
  { group: 'France', items: [
    { value: 'FR1', label: 'Ligue 1' },
    { value: 'FR2', label: 'Ligue 2' },
    { value: 'FR3', label: 'Championnat National' },
  ]},
  { group: 'Spain', items: [
    { value: 'ES1', label: 'La Liga' },
    { value: 'ES2', label: 'La Liga 2' },
    { value: 'ES3', label: 'Primera Federación' },
  ]},
  { group: 'Germany', items: [
    { value: 'L1', label: 'Bundesliga' },
    { value: 'L2', label: '2. Bundesliga' },
    { value: 'L3', label: '3. Liga' },
  ]},
  { group: 'Italy', items: [
    { value: 'IT1', label: 'Serie A' },
    { value: 'IT2', label: 'Serie B' },
    { value: 'IT3A', label: 'Serie C' },
  ]},
  { group: 'Netherlands', items: [
    { value: 'NL1', label: 'Eredivisie' },
    { value: 'NL2', label: 'Eerste Divisie' },
    { value: 'NL3', label: 'Tweede Divisie' },
  ]},
  { group: 'Portugal', items: [
    { value: 'PO1', label: 'Liga Portugal' },
    { value: 'PO2', label: 'Liga Portugal 2' },
    { value: 'PO3', label: 'Liga 3' },
  ]},
  { group: 'Belgium', items: [
    { value: 'BE1', label: 'Pro League' },
    { value: 'BE2', label: 'Challenger Pro League' },
  ]},
  { group: 'Türkiye', items: [
    { value: 'TS1', label: 'Süper Lig' },
    { value: 'TR2', label: '1. Lig' },
    { value: 'TR3', label: '2. Lig' },
  ]},
  { group: 'Austria', items: [
    { value: 'A1', label: 'Bundesliga' },
    { value: 'A2', label: '2. Liga' },
  ]},
  { group: 'Switzerland', items: [
    { value: 'C1', label: 'Super League' },
    { value: 'C2', label: 'Challenge League' },
  ]},
  { group: 'Scandinavia', items: [
    { value: 'SE1', label: 'Sweden - Allsvenskan' },
    { value: 'SE2', label: 'Sweden - Superettan' },
    { value: 'NO1', label: 'Norway - Eliteserien' },
    { value: 'NO2', label: 'Norway - OBOS-ligaen' },
    { value: 'DK1', label: 'Denmark - Superliga' },
    { value: 'DK2', label: 'Denmark - 1st Division' },
    { value: 'FI1', label: 'Finland - Veikkausliiga' },
    { value: 'IS1', label: 'Iceland - Úrvalsdeild' },
  ]},
  { group: 'Eastern Europe', items: [
    { value: 'PL1', label: 'Poland - Ekstraklasa' },
    { value: 'PL2', label: 'Poland - I Liga' },
    { value: 'CZ1', label: 'Czechia - First League' },
    { value: 'CZ2', label: 'Czechia - FNL' },
    { value: 'RO1', label: 'Romania - Liga I' },
    { value: 'RO2', label: 'Romania - Liga II' },
    { value: 'KR1', label: 'Croatia - HNL' },
    { value: 'KR2', label: 'Croatia - Druga HNL' },
    { value: 'UKR1', label: 'Ukraine - Premier League' },
    { value: 'GR1', label: 'Greece - Super League' },
    { value: 'GR2', label: 'Greece - Super League 2' },
    { value: 'RU1', label: 'Russia - Premier League' },
    { value: 'SER1', label: 'Serbia - SuperLiga' },
    { value: 'SER2', label: 'Serbia - Prva Liga' },
    { value: 'BUL1', label: 'Bulgaria - First League' },
    { value: 'UNG1', label: 'Hungary - NB I' },
    { value: 'UNG2', label: 'Hungary - NB II' },
    { value: 'SLO1', label: 'Slovenia - PrvaLiga' },
    { value: 'SLOWK1', label: 'Slovakia - Fortuna Liga' },
    { value: 'BOS1', label: 'Bosnia - Premijer Liga' },
    { value: 'MNE1', label: 'Montenegro - First League' },
    { value: 'MKD1', label: 'North Macedonia - First League' },
    { value: 'ALB1', label: 'Albania - Superliga' },
    { value: 'MOL1', label: 'Moldova - Super Liga' },
    { value: 'LIT1', label: 'Lithuania - A Lyga' },
    { value: 'LET1', label: 'Latvia - Virsliga' },
    { value: 'EST1', label: 'Estonia - Meistriliiga' },
    { value: 'BLR1', label: 'Belarus - Premier League' },
  ]},
  { group: 'Other European', items: [
    { value: 'WAL1', label: 'Wales - Cymru Premier' },
    { value: 'NI1', label: 'Northern Ireland - Premiership' },
    { value: 'IR1', label: 'Republic of Ireland - Premier Division' },
    { value: 'LUX1', label: 'Luxembourg - BGL Ligue' },
    { value: 'MLT1', label: 'Malta - Premier League' },
    { value: 'FAR1', label: 'Faroe Islands - Betrideildin' },
    { value: 'AND1', label: 'Andorra - Primera Divisió' },
    { value: 'GIB1', label: 'Gibraltar - National League' },
    { value: 'SMR1', label: 'San Marino - Campionato' },
    { value: 'KOS1', label: 'Kosovo - Superliga' },
  ]},
  { group: 'Semi-European / Caucasus', items: [
    { value: 'GEO1', label: 'Georgia - Erovnuli Liga' },
    { value: 'KAZ1', label: 'Kazakhstan - Premier League' },
    { value: 'AZE1', label: 'Azerbaijan - Premier League' },
    { value: 'ISR1', label: 'Israel - Premier League' },
    { value: 'CYP1', label: 'Cyprus - First Division' },
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

/** Parse DD/MM/YYYY contract date to a Date object */
function parseContractDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
}

export const TransfermarktScraper = ({ visible, onClose }: TransfermarktScraperProps) => {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<PlayerResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [shortlistingPlayers, setShortlistingPlayers] = useState<Set<string>>(new Set());
  const [shortlistedUrls, setShortlistedUrls] = useState<Set<string>>(new Set());
  const [dbPlayerNames, setDbPlayerNames] = useState<Set<string>>(new Set());
  const [processLogs, setProcessLogs] = useState<Array<{ league: string; logs: string[]; timestamp: string }>>([]);
  const [showLogs, setShowLogs] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!visible) return;
    const loadExisting = async () => {
      const [shortlistRes, playersRes] = await Promise.all([
        supabase.from("transfermarkt_shortlist").select("transfermarkt_url"),
        supabase.from("players").select("name"),
      ]);
      if (shortlistRes.data) {
        setShortlistedUrls(new Set(shortlistRes.data.map(d => d.transfermarkt_url).filter(Boolean) as string[]));
      }
      if (playersRes.data) {
        setDbPlayerNames(new Set(playersRes.data.map(d => d.name.toLowerCase().trim())));
      }
    };
    loadExisting();
  }, [visible]);

  if (!visible) return null;

  /** When no specific league is chosen, randomly pick several to ensure results */
  const getLeaguesToScrape = (): string[] => {
    // Only use codes known to work reliably with the TM API
    const majorLeagues = ['GB1', 'GB2', 'FR1', 'ES1', 'IT1', 'L1', 'NL1', 'PO1', 'BE1', 'TS1', 'SC1', 'A1', 'C1'];
    const shuffled = [...majorLeagues].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const applyClientFilters = (players: PlayerResult[]) => {
    let filtered = players;

    if (filters.clubName?.trim()) {
      const search = filters.clubName.trim().toLowerCase();
      filtered = filtered.filter(p => p.club?.toLowerCase().includes(search));
    }

    if (filters.marketValueMin != null || filters.marketValueMax != null) {
      filtered = filtered.filter(p => {
        const val = parseMarketValue(p.marketValue);
        if (val === null) return false;
        if (filters.marketValueMin != null && val < filters.marketValueMin) return false;
        if (filters.marketValueMax != null && val > filters.marketValueMax) return false;
        return true;
      });
    }

    if (filters.excludeLoans) {
      filtered = filtered.filter(p => !p.isLoan);
    }

    if (filters.contractStatus && filters.contractStatus !== 'any') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const contractEnd = parseContractDate(p.contractUntil);
        if (filters.contractStatus === 'free_agent') return !contractEnd || contractEnd <= now;
        if (filters.contractStatus === 'expiring_6m') {
          if (!contractEnd) return true;
          const d = new Date(now); d.setMonth(d.getMonth() + 6);
          return contractEnd <= d;
        }
        if (filters.contractStatus === 'expiring_12m') {
          if (!contractEnd) return true;
          const d = new Date(now); d.setMonth(d.getMonth() + 12);
          return contractEnd <= d;
        }
        return true;
      });
    }

    return filtered;
  };

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setFilteredResults([]);
    try {
      const leagueCode = filters.countryPlayingIn || 'any';
      const leaguesToScrape = leagueCode === 'any' ? getLeaguesToScrape() : [leagueCode];

      const allPlayers: PlayerResult[] = [];
      let totalScanned = 0;
      let successCount = 0;
      let failCount = 0;

      const searchLogs: Array<{ league: string; logs: string[]; timestamp: string }> = [];

      for (const league of leaguesToScrape) {
        try {
          const skipUefa = NON_UEFA_LEAGUE_CODES.has(league);
          const { data, error } = await invokeEdgeFunction<any>('scrape-transfermarkt', {
            body: {
              filters: {
                ...filters,
                position: filters.position === 'any' ? undefined : filters.position,
                nationality: filters.nationality === 'any' ? undefined : filters.nationality,
                countryPlayingIn: league,
                clubName: undefined,
                marketValueMin: undefined,
                marketValueMax: undefined,
                excludeLoans: undefined,
                contractStatus: undefined,
                birthdayToday: filters.birthdayToday || false,
              },
              confederation: skipUefa ? undefined : 'UEFA',
            },
          });

          if (error) {
            console.warn(`League ${league} failed:`, error.message);
            searchLogs.push({ league, logs: [`Error: ${error.message}`], timestamp: new Date().toISOString() });
            failCount++;
            continue;
          }

          if (data?.success) {
            allPlayers.push(...(data.players || []));
            totalScanned += data.totalFound || 0;
            successCount++;
            if (data.processLog) {
              searchLogs.push({ league, logs: data.processLog, timestamp: new Date().toISOString() });
            }
          }
        } catch (leagueError: any) {
          console.warn(`League ${league} threw:`, leagueError?.message);
          searchLogs.push({ league, logs: [`Exception: ${leagueError?.message}`], timestamp: new Date().toISOString() });
          failCount++;
        }
      }

      setProcessLogs(prev => [...searchLogs, ...prev].slice(0, 20));

      if (successCount === 0 && failCount > 0) {
        toast.error("All league searches failed. Try selecting a specific league.");
        return;
      }
      if (failCount > 0) {
        toast.warning(`${failCount} league(s) were skipped due to errors`);
      }

      // Remove duplicates by transfermarkt URL
      const seen = new Set<string>();
      const uniquePlayers = allPlayers.filter(p => {
        if (!p.transfermarktUrl || seen.has(p.transfermarktUrl)) return false;
        seen.add(p.transfermarktUrl);
        return true;
      });

      // Filter out players already on shortlist or in our database
      let filtered = uniquePlayers.filter(p => {
        if (shortlistedUrls.has(p.transfermarktUrl)) return false;
        if (dbPlayerNames.has(p.name.toLowerCase().trim())) return false;
        return true;
      });

      // Defensive client-side birthday guard
      if (filters.birthdayToday) {
        const now = new Date();
        const todayMonth = now.getUTCMonth() + 1;
        const todayDay = now.getUTCDate();
        filtered = filtered.filter(p => {
          if (!p.dateOfBirth) return false;
          const dateOnly = p.dateOfBirth.includes('T') ? p.dateOfBirth.split('T')[0] : p.dateOfBirth;
          const parts = dateOnly.split('-');
          if (parts.length < 3) return false;
          return parseInt(parts[1], 10) === todayMonth && parseInt(parts[2], 10) === todayDay;
        });
      }

      setResults(filtered);
      setTotalFound(totalScanned);

      const clientFiltered = applyClientFilters(filtered);
      setFilteredResults(clientFiltered);

      if (clientFiltered.length === 0) {
        toast.info("No unrepresented players found matching your criteria");
      } else {
        toast.success(`Found ${clientFiltered.length} unrepresented player${clientFiltered.length !== 1 ? 's' : ''} from ${totalScanned} scanned`);
      }
    } catch (error: any) {
      console.error('Scraper error:', error);
      toast.error(error?.message || "Failed to search Transfermarkt. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleClientFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    if (results.length > 0) {
      const filtered = (() => {
        let f = results;
        if (newFilters.clubName?.trim()) {
          const search = newFilters.clubName.trim().toLowerCase();
          f = f.filter(p => p.club?.toLowerCase().includes(search));
        }
        if (newFilters.marketValueMin != null || newFilters.marketValueMax != null) {
          f = f.filter(p => {
            const val = parseMarketValue(p.marketValue);
            if (val === null) return false;
            if (newFilters.marketValueMin != null && val < newFilters.marketValueMin) return false;
            if (newFilters.marketValueMax != null && val > newFilters.marketValueMax) return false;
            return true;
          });
        }
        if (newFilters.excludeLoans) {
          f = f.filter(p => !p.isLoan);
        }
        if (newFilters.contractStatus && newFilters.contractStatus !== 'any') {
          const now = new Date();
          f = f.filter(p => {
            const contractEnd = parseContractDate(p.contractUntil);
            if (newFilters.contractStatus === 'free_agent') return !contractEnd || contractEnd <= now;
            if (newFilters.contractStatus === 'expiring_6m') {
              if (!contractEnd) return true;
              const d = new Date(now); d.setMonth(d.getMonth() + 6);
              return contractEnd <= d;
            }
            if (newFilters.contractStatus === 'expiring_12m') {
              if (!contractEnd) return true;
              const d = new Date(now); d.setMonth(d.getMonth() + 12);
              return contractEnd <= d;
            }
            return true;
          });
        }
        return f;
      })();
      setFilteredResults(filtered);
    }
  };

  const handleShortlistPlayer = async (player: PlayerResult) => {
    const url = player.transfermarktUrl;
    setShortlistingPlayers(prev => new Set(prev).add(url));
    try {
      const { error } = await supabase.from("transfermarkt_shortlist").insert({
        player_name: player.name,
        position: player.position || null,
        age: parseInt(player.age) || null,
        nationality: player.nationality || null,
        club: player.club || null,
        market_value: player.marketValue || null,
        agent_status: player.agentStatus,
        transfermarkt_url: url || null,
      });
      if (error) throw error;
      setShortlistedUrls(prev => new Set(prev).add(url));
      toast.success(`${player.name} added to shortlist`);
    } catch (error: any) {
      toast.error(error.message || "Failed to shortlist player");
    } finally {
      setShortlistingPlayers(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const displayResults = filteredResults;

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

            {/* Contract Status */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Contract Status</Label>
              <Select value={filters.contractStatus || 'any'} onValueChange={v => handleClientFilterChange({ ...filters, contractStatus: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="free_agent">Free Agent / Expired</SelectItem>
                  <SelectItem value="expiring_6m">Expiring within 6 months</SelectItem>
                  <SelectItem value="expiring_12m">Expiring within 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exclude Loans */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.excludeLoans || false}
                  onCheckedChange={(checked) => handleClientFilterChange({ ...filters, excludeLoans: checked === true })}
                />
                <span className="text-sm">Exclude loan players</span>
              </label>
            </div>

            {/* Birthday Today toggle */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.birthdayToday || false}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, birthdayToday: checked === true }))}
                />
                <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">Birthday today only</span>
              </label>
            </div>

            {/* Search button */}
            <div className="flex items-end">
              <Button onClick={() => handleSearch()} disabled={searching} className="w-full h-9">
                {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {filters.countryPlayingIn && NON_UEFA_LEAGUE_CODES.has(filters.countryPlayingIn)
                ? 'No confederation filter'
                : 'Confederation: UEFA'}
            </Badge>
            {processLogs.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowLogs(!showLogs)}>
                <Terminal className="h-3 w-3" />
                Process Log ({processLogs.length})
                <ChevronDown className={`h-3 w-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
              </Button>
            )}
          </div>

          {showLogs && processLogs.length > 0 && (
            <div className="mt-3 max-h-[300px] overflow-y-auto rounded-md border bg-black/90 p-3 space-y-3">
              {processLogs.map((entry, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{entry.league}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="space-y-0.5">
                    {entry.logs.map((line, j) => (
                      <p key={j} className={`text-[11px] font-mono ${line.startsWith('Error') || line.startsWith('Exception') ? 'text-red-400' : 'text-green-400'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            </div>

            {/* Mobile: compact card layout */}
            {isMobile ? (
              <div className="space-y-2">
                {displayResults.map((player, idx) => {
                  const isShortlisted = shortlistedUrls.has(player.transfermarktUrl);
                  const isShortlisting = shortlistingPlayers.has(player.transfermarktUrl);
                  return (
                    <div key={idx} className="p-3 rounded-md border bg-card flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{player.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{player.position} · {player.age} · {player.club}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {player.marketValue && (
                            <span className="text-xs text-primary font-medium">{player.marketValue}</span>
                          )}
                          {player.contractUntil && (
                            <span className="text-xs text-muted-foreground">📋 {player.contractUntil}</span>
                          )}
                          {player.isLoan && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Loan</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={player.transfermarktUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        {isShortlisted ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" disabled>
                            <Star className="h-4 w-4 fill-current" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isShortlisting}
                            onClick={() => handleShortlistPlayer(player)}
                            title="Add to shortlist"
                          >
                            {isShortlisting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Star className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop: full table */
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Pos</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Link</TableHead>
                      <TableHead className="w-[70px]">Shortlist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayResults.map((player, idx) => {
                      const isShortlisted = shortlistedUrls.has(player.transfermarktUrl);
                      const isShortlisting = shortlistingPlayers.has(player.transfermarktUrl);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {player.name}
                            {player.isLoan && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">Loan</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{abbreviatePosition(player.position) || '-'}</TableCell>
                          <TableCell>{player.age || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{player.dateOfBirth || '-'}</TableCell>
                          <TableCell className="text-sm">{player.nationality || '-'}</TableCell>
                          <TableCell className="text-sm">{player.club || '-'}</TableCell>
                          <TableCell className="text-sm font-medium text-primary">{player.marketValue || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{player.contractUntil || '-'}</TableCell>
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
                            {isShortlisted ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" disabled>
                                <Star className="h-3.5 w-3.5 fill-current" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={isShortlisting}
                                onClick={() => handleShortlistPlayer(player)}
                                title="Add to shortlist"
                              >
                                {isShortlisting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Star className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
