import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Users, BarChart3 } from "lucide-react";

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  minutes_played: number | null;
  striker_stats?: any;
  opponent?: string | null;
}

interface ComparisonPlayer {
  id: string;
  name: string;
  position: string;
  club: string | null;
  season: string;
  image_url: string | null;
  metrics: Record<string, number>;
  r90_average: number | null;
}

const PLAYER_COLOURS = ['hsl(220, 70%, 50%)', 'hsl(0, 70%, 50%)', 'hsl(140, 60%, 40%)', 'hsl(45, 80%, 50%)'];

const METRIC_DEFS = [
  { key: 'r90', label: 'R90', statKey: null },
  { key: 'xG_adj_per90', label: 'xG (p90)', statKey: 'xG_adj_per90' },
  { key: 'xA_adj_per90', label: 'xA (p90)', statKey: 'xA_adj_per90' },
  { key: 'regains_adj_per90', label: 'Regains (p90)', statKey: 'regains_adj_per90' },
  { key: 'interceptions_per90', label: 'Interceptions (p90)', statKey: 'interceptions_per90' },
  { key: 'xGChain_per90', label: 'xG Chain (p90)', statKey: 'xGChain_per90' },
  { key: 'progressive_passes_adj_per90', label: 'Prog. Passes (p90)', statKey: 'progressive_passes_adj_per90' },
  { key: 'dribbles_per90', label: 'Dribbles (p90)', statKey: 'dribbles_per90' },
  { key: 'turnovers_adj_per90', label: 'Turnovers (p90)', statKey: 'turnovers_adj_per90' },
];

const getFormAverage = (analyses: Analysis[], count: number, metricKey: string): number | null => {
  const recent = analyses.slice(0, count);
  if (recent.length === 0) return null;

  const values = recent.map(a => {
    if (metricKey === 'r90') return a.r90_score;
    return a.striker_stats?.[metricKey] ?? null;
  }).filter((v): v is number => v != null);

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

interface Props {
  analyses: Analysis[];
  playerData: any;
}

export const AnalysisComparisons = ({ analyses, playerData }: Props) => {
  const [comparisonPlayers, setComparisonPlayers] = useState<ComparisonPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [formWindow, setFormWindow] = useState<number>(5);
  const [subTab, setSubTab] = useState<string>("percentile");

  const playerPosition = playerData?.position || '';

  useEffect(() => {
    const fetchComps = async () => {
      const { data } = await supabase
        .from('comparison_players')
        .select('*')
        .eq('position', playerPosition)
        .order('name');
      if (data) setComparisonPlayers(data.map(p => ({ ...p, metrics: (p.metrics || {}) as Record<string, number> })));
    };
    if (playerPosition) fetchComps();
  }, [playerPosition]);

  const selectedComps = comparisonPlayers.filter(p => selectedPlayerIds.includes(p.id));

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Compute portal player's form averages
  const portalMetrics = useMemo(() => {
    const result: Record<string, number | null> = {};
    METRIC_DEFS.forEach(m => {
      result[m.key] = getFormAverage(analyses, formWindow, m.key === 'r90' ? 'r90' : m.statKey!);
    });
    return result;
  }, [analyses, formWindow]);

  // Percentile calculation: portal player's rank among all comparison players of same position
  const percentiles = useMemo(() => {
    const result: Record<string, number> = {};
    METRIC_DEFS.forEach(m => {
      const portalVal = portalMetrics[m.key];
      if (portalVal == null) { result[m.key] = 0; return; }
      
      const allValues = comparisonPlayers
        .map(cp => m.key === 'r90' ? cp.r90_average : cp.metrics[m.key])
        .filter((v): v is number => v != null);
      
      if (allValues.length === 0) { result[m.key] = 50; return; }
      
      // For turnovers, lower is better
      const isLowerBetter = m.key === 'turnovers_adj_per90';
      const belowCount = allValues.filter(v => isLowerBetter ? v > portalVal : v < portalVal).length;
      result[m.key] = Math.round((belowCount / allValues.length) * 100);
    });
    return result;
  }, [portalMetrics, comparisonPlayers]);

  // Radar data
  const radarData = useMemo(() => {
    return METRIC_DEFS.filter(m => {
      const pv = portalMetrics[m.key];
      return pv != null;
    }).map(m => {
      const entry: any = { metric: m.label, [playerData?.name || 'You']: portalMetrics[m.key] };
      selectedComps.forEach(cp => {
        entry[cp.name] = m.key === 'r90' ? cp.r90_average : cp.metrics[m.key];
      });
      return entry;
    });
  }, [portalMetrics, selectedComps, playerData]);

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
      <CardHeader marble>
        <div className="container mx-auto px-4">
          <CardTitle className="font-heading tracking-tight">Comparisons</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 space-y-6 py-6">
        {/* Form window selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Form Window:</span>
          {[5, 10, 20].map(w => (
            <Button
              key={w}
              variant={formWindow === w ? "default" : "outline"}
              size="sm"
              onClick={() => setFormWindow(w)}
            >
              Last {w}
            </Button>
          ))}
        </div>

        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList>
            <TabsTrigger value="percentile"><BarChart3 className="w-4 h-4 mr-1" /> Percentile</TabsTrigger>
            <TabsTrigger value="comparison"><Users className="w-4 h-4 mr-1" /> Player Comparison</TabsTrigger>
          </TabsList>

          {/* Percentile Tab */}
          <TabsContent value="percentile" className="space-y-4 mt-4">
            {comparisonPlayers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No comparison players stored for position: {playerPosition}</p>
            ) : (
              <div className="space-y-3">
                {METRIC_DEFS.filter(m => portalMetrics[m.key] != null).map(m => {
                  const pct = percentiles[m.key];
                  return (
                    <div key={m.key} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className="text-2xl font-bold text-primary">{pct}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Your avg: {portalMetrics[m.key]?.toFixed(2)}</span>
                        <span>vs {comparisonPlayers.length} {playerPosition}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Direct Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6 mt-4">
            {/* Player selector */}
            <div>
              <p className="text-sm font-medium mb-2">Select comparison players ({playerPosition} only):</p>
              {comparisonPlayers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No players stored for this position.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {comparisonPlayers.map((cp, idx) => (
                    <button
                      key={cp.id}
                      onClick={() => togglePlayer(cp.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        selectedPlayerIds.includes(cp.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-5 w-5">
                        {cp.image_url ? <AvatarImage src={cp.image_url} /> : null}
                        <AvatarFallback className="text-[10px]">{cp.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {cp.name}
                      <span className="text-xs opacity-70">{cp.club} · {cp.season}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedComps.length > 0 && (
              <>
                {/* Radar Chart */}
                <div className="bg-card border rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Radar Comparison</h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      <Radar
                        name={playerData?.name || 'You'}
                        dataKey={playerData?.name || 'You'}
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      {selectedComps.map((cp, idx) => (
                        <Radar
                          key={cp.id}
                          name={cp.name}
                          dataKey={cp.name}
                          stroke={PLAYER_COLOURS[idx % PLAYER_COLOURS.length]}
                          fill={PLAYER_COLOURS[idx % PLAYER_COLOURS.length]}
                          fillOpacity={0.08}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Comparison Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            {playerData?.name || 'You'}
                            <Badge variant="outline" className="text-[10px] ml-1">Last {formWindow}</Badge>
                          </div>
                        </TableHead>
                        {selectedComps.map((cp, idx) => (
                          <TableHead key={cp.id}>
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                {cp.image_url ? <AvatarImage src={cp.image_url} /> : null}
                                <AvatarFallback className="text-[10px]">{cp.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-xs font-medium">{cp.name}</div>
                                <div className="text-[10px] text-muted-foreground">{cp.club} · {cp.season}</div>
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {METRIC_DEFS.filter(m => portalMetrics[m.key] != null || selectedComps.some(cp => (m.key === 'r90' ? cp.r90_average : cp.metrics[m.key]) != null)).map(m => (
                        <TableRow key={m.key}>
                          <TableCell className="font-medium text-sm">{m.label}</TableCell>
                          <TableCell className="font-semibold">{portalMetrics[m.key]?.toFixed(2) ?? '-'}</TableCell>
                          {selectedComps.map(cp => {
                            const val = m.key === 'r90' ? cp.r90_average : cp.metrics[m.key];
                            return <TableCell key={cp.id}>{val?.toFixed(2) ?? '-'}</TableCell>;
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
