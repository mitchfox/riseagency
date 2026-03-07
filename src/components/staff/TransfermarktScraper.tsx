import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, UserX, Users, X } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";

interface SearchFilters {
  position?: string;
  ageMin?: number;
  ageMax?: number;
  nationality?: string;
  countryPlayingIn?: string;
  contractUntil?: string;
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
  { value: '31', label: 'Cameroon' },
  { value: '68', label: 'Jamaica' },
  { value: '185', label: 'USA' },
  { value: '32', label: 'Canada' },
  { value: '14', label: 'Australia' },
  { value: '39', label: 'Belgium' },
];

const COUNTRIES_PLAYING_IN = [
  { value: 'any', label: 'Any Country' },
  { value: 'GB1', label: 'England' },
  { value: 'SC1', label: 'Scotland' },
  { value: 'WAL1', label: 'Wales' },
  { value: 'NI1', label: 'Northern Ireland' },
  { value: 'IR1', label: 'Republic of Ireland' },
  { value: 'FR1', label: 'France' },
  { value: 'ES1', label: 'Spain' },
  { value: 'L1', label: 'Germany' },
  { value: 'IT1', label: 'Italy' },
  { value: 'NL1', label: 'Netherlands' },
  { value: 'PO1', label: 'Portugal' },
  { value: 'BE1', label: 'Belgium' },
  { value: 'TS1', label: 'Turkiye' },
  { value: 'A1', label: 'Austria' },
  { value: 'C1', label: 'Switzerland' },
  { value: 'SE1', label: 'Sweden' },
  { value: 'NO1', label: 'Norway' },
  { value: 'DK1', label: 'Denmark' },
  { value: 'PL1', label: 'Poland' },
  { value: 'CZ1', label: 'Czech Republic' },
  { value: 'RO1', label: 'Romania' },
  { value: 'KR1', label: 'Croatia' },
  { value: 'UKR1', label: 'Ukraine' },
  { value: 'GR1', label: 'Greece' },
  { value: 'RU1', label: 'Russia' },
  { value: 'SER1', label: 'Serbia' },
];

export const TransfermarktScraper = ({ visible, onClose }: TransfermarktScraperProps) => {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [hasSearched, setHasSearched] = useState(false);

  if (!visible) return null;

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await invokeEdgeFunction<any>('scrape-transfermarkt', {
        body: {
          filters: {
            ...filters,
            position: filters.position === 'any' ? undefined : filters.position,
            nationality: filters.nationality === 'any' ? undefined : filters.nationality,
            countryPlayingIn: filters.countryPlayingIn === 'any' ? undefined : filters.countryPlayingIn,
          },
          confederation: 'UEFA',
        },
      });

      if (error) throw error;

      if (data?.success) {
        setResults(data.players || []);
        setTotalFound(data.totalFound || 0);
        if (data.players?.length === 0) {
          toast.info("No unrepresented players found matching your criteria");
        } else {
          toast.success(`Found ${data.filteredCount} unrepresented player${data.filteredCount !== 1 ? 's' : ''} from ${data.totalFound} results`);
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

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Nation Playing In</Label>
              <Select value={filters.countryPlayingIn || 'any'} onValueChange={v => setFilters(f => ({ ...f, countryPlayingIn: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES_PLAYING_IN.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <UserX className="h-3 w-3 mr-1" />
                {results.length} unrepresented player{results.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {totalFound} total results scanned
              </Badge>
            </div>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((player, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-sm">{player.position || '-'}</TableCell>
                      <TableCell>{player.age || '-'}</TableCell>
                      <TableCell className="text-sm">{player.nationality || '-'}</TableCell>
                      <TableCell className="text-sm">{player.club || '-'}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
