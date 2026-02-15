import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Users, BarChart3 } from "lucide-react";
import { METRIC_CATEGORIES, ALL_METRICS } from "@/components/staff/ComparisonPlayerData";

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

  // Percentile calculation: portal player's rank among all comparison players of same position
  // Uses the comparison players' stored metrics directly (these ARE the positional averages/benchmarks)
  const percentiles = useMemo(() => {
    const result: Record<string, { percentile: number; value: number | null }> = {};
    // For percentile, we don't use the portal player's form data - we compare stored comparison players
    // The comparison players' metrics ARE the positional benchmarks from the images
    ALL_METRICS.forEach(m => {
      const allValues = comparisonPlayers
        .map(cp => cp.metrics[m.key])
        .filter((v): v is number => v != null);
      
      // For portal player, we don't have their per-90 stats in the same format
      // So percentile view shows the stored players' data as positional benchmarks
      result[m.key] = { percentile: 0, value: null };
    });
    return result;
  }, [comparisonPlayers]);

  // For the comparison table, use the stored metrics directly
  const compTableMetrics = useMemo(() => {
    // Get all metrics that have at least one value across selected comparison players
    return ALL_METRICS.filter(m => 
      selectedComps.some(cp => cp.metrics[m.key] != null)
    );
  }, [selectedComps]);

  // Radar data for comparison
  const radarData = useMemo(() => {
    if (selectedComps.length === 0) return [];
    // Pick a subset of key metrics for radar readability
    const radarMetrics = ALL_METRICS.filter(m => 
      selectedComps.some(cp => cp.metrics[m.key] != null)
    ).slice(0, 12); // Limit to 12 for readability
    
    return radarMetrics.map(m => {
      const entry: any = { metric: m.label };
      selectedComps.forEach(cp => {
        entry[cp.name] = cp.metrics[m.key] ?? 0;
      });
      return entry;
    });
  }, [selectedComps]);

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
      <CardHeader marble>
        <div className="container mx-auto px-4">
          <CardTitle className="font-heading tracking-tight">Comparisons</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 space-y-6 py-6">
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList>
            <TabsTrigger value="percentile"><BarChart3 className="w-4 h-4 mr-1" /> Percentile</TabsTrigger>
            <TabsTrigger value="comparison"><Users className="w-4 h-4 mr-1" /> Player Comparison</TabsTrigger>
          </TabsList>

          {/* Percentile Tab - shows stored players' metrics as positional benchmarks */}
          <TabsContent value="percentile" className="space-y-6 mt-4">
            {comparisonPlayers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No comparison players stored for position: {playerPosition}</p>
            ) : (
              <>
                {/* Player selector for percentile view */}
                <div>
                  <p className="text-sm font-medium mb-2">Select a player to view their percentile ranks:</p>
                  <div className="flex flex-wrap gap-2">
                    {comparisonPlayers.map(cp => (
                      <button
                        key={cp.id}
                        onClick={() => {
                          setSelectedPlayerIds(prev =>
                            prev.includes(cp.id) ? prev.filter(x => x !== cp.id) : [cp.id]
                          );
                        }}
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
                      </button>
                    ))}
                  </div>
                </div>

                {selectedComps.length > 0 && (
                  <div className="space-y-6">
                    {METRIC_CATEGORIES.map(cat => {
                      const metricsWithValues = cat.metrics.filter(m => 
                        selectedComps[0]?.metrics[m.key] != null
                      );
                      if (metricsWithValues.length === 0) return null;
                      
                      return (
                        <div key={cat.category}>
                          <h4 className="font-semibold text-sm mb-3">{cat.category}</h4>
                          <div className="space-y-3">
                            {metricsWithValues.map(m => {
                              const value = selectedComps[0].metrics[m.key];
                              // Calculate percentile among all comparison players for this metric
                              const allVals = comparisonPlayers
                                .map(cp => cp.metrics[m.key])
                                .filter((v): v is number => v != null);
                              const belowCount = allVals.filter(v => v < value).length;
                              const pct = allVals.length > 1 ? Math.round((belowCount / (allVals.length - 1)) * 100) : 50;
                              
                              return (
                                <div key={m.key} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">{m.label}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-muted-foreground">{value.toFixed(2)} /90</span>
                                      <span className="text-lg font-bold text-primary w-12 text-right">{pct}%</span>
                                    </div>
                                  </div>
                                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${
                                        pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Direct Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6 mt-4">
            <div>
              <p className="text-sm font-medium mb-2">Select comparison players ({playerPosition} only):</p>
              {comparisonPlayers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No players stored for this position.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {comparisonPlayers.map(cp => (
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
                {radarData.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <h4 className="font-semibold mb-4">Radar Comparison</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <PolarRadiusAxis tick={{ fontSize: 10 }} />
                        {selectedComps.map((cp, idx) => (
                          <Radar
                            key={cp.id}
                            name={cp.name}
                            dataKey={cp.name}
                            stroke={PLAYER_COLOURS[idx % PLAYER_COLOURS.length]}
                            fill={PLAYER_COLOURS[idx % PLAYER_COLOURS.length]}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Comparison Table by Category */}
                {METRIC_CATEGORIES.map(cat => {
                  const catMetrics = cat.metrics.filter(m =>
                    selectedComps.some(cp => cp.metrics[m.key] != null)
                  );
                  if (catMetrics.length === 0) return null;

                  return (
                    <div key={cat.category} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2">
                        <h4 className="font-semibold text-sm">{cat.category}</h4>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Metric</TableHead>
                            {selectedComps.map(cp => (
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
                          {catMetrics.map(m => (
                            <TableRow key={m.key}>
                              <TableCell className="font-medium text-sm">{m.label}</TableCell>
                              {selectedComps.map(cp => {
                                const val = cp.metrics[m.key];
                                return <TableCell key={cp.id}>{val?.toFixed(2) ?? '-'}</TableCell>;
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
