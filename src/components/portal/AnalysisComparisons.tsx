import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { computeAllStatAverages } from "@/lib/statAggregation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, BarChart3, Target, Box, Crosshair, ChevronsUpDown, X, Search, ScatterChart } from "lucide-react";
import { getMetricCategoriesForPosition, getMetricsForPosition, getPositionVariants, isGoalkeeperPosition } from "@/components/staff/ComparisonPlayerData";
import { GoalTracking } from "@/components/portal/GoalTracking";
import { ScoutingComparisonMatrix } from "@/components/portal/ScoutingComparisonMatrix";
import { ScatterComparisonChart } from "@/components/portal/ScatterComparisonChart";
import { toast } from "sonner";

const RadarChart3D = lazy(() => import("@/components/portal/RadarChart3D").then(m => ({ default: m.RadarChart3D })));

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  minutes_played: number | null;
  striker_stats?: any;
  opponent?: string | null;
  fixture_stats?: Record<string, number>;
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
const PORTAL_COLOUR = 'hsl(43, 49%, 61%)';

interface Props {
  analyses: Analysis[];
  playerData: any;
  embedded?: boolean;
}

export const AnalysisComparisons = ({ analyses, playerData, embedded }: Props) => {
  const [comparisonPlayers, setComparisonPlayers] = useState<ComparisonPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [formWindow, setFormWindow] = useState<number>(5);
  const [subTab, setSubTab] = useState<string>("scatter");
  const [fixtureAnalyses, setFixtureAnalyses] = useState<Analysis[]>([]);
  const playerPosition = playerData?.position || '';
  const positionCategories = getMetricCategoriesForPosition(playerPosition);
  const positionMetrics = getMetricsForPosition(playerPosition);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>(positionMetrics[0]?.key || 'goals_per90');
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestingPlayer, setRequestingPlayer] = useState(false);

  const playerName = playerData?.name || 'You';

  useEffect(() => {
    if (positionMetrics.length > 0 && !positionMetrics.some(metric => metric.key === selectedMetricKey)) {
      setSelectedMetricKey(positionMetrics[0].key);
    }
  }, [positionMetrics, selectedMetricKey]);

  // Fetch fixture analyses with fixture_stats for the portal player
  useEffect(() => {
    const fetchFixtureData = async () => {
      if (!playerData?.id) return;
      const { data } = await supabase
        .from('player_analysis')
        .select('id, analysis_date, r90_score, minutes_played, opponent, fixture_stats, visibility_status, placeholder_raw_score, placeholder_minutes')
        .eq('player_id', playerData.id)
        .order('analysis_date', { ascending: false })
        .limit(20);
      if (data) {
        // Use ALL reports with fixture_stats for stat comparisons (visibility only affects R90 display)
        setFixtureAnalyses(data.filter(a => a.fixture_stats != null).map((a: any) => {
          const isHidden = String(a.visibility_status || '').toLowerCase() === 'hidden';
          const r90 = isHidden && a.placeholder_raw_score != null && (a.placeholder_minutes ?? 0) > 0
            ? (Number(a.placeholder_raw_score) / Number(a.placeholder_minutes)) * 90
            : (a.r90_score ?? 0);
          return {
            ...a,
            r90_score: r90,
            fixture_stats: (a.fixture_stats as Record<string, number>) || {},
          };
        }));
      }
    };
    fetchFixtureData();
  }, [playerData?.id]);

  useEffect(() => {
    const fetchComps = async () => {
      const positionVariants = getPositionVariants(playerPosition);
      let query = supabase.from('comparison_players').select('*').order('name');

      if (positionVariants.length > 0) {
        query = query.in('position', positionVariants);
      }

      const { data } = await query;
      if (data) {
        const filteredPlayers = data.filter((player) => {
          if (isGoalkeeperPosition(playerPosition)) return isGoalkeeperPosition(player.position);
          return player.position === playerPosition;
        });
        setComparisonPlayers(filteredPlayers.map(p => ({ ...p, metrics: (p.metrics || {}) as Record<string, number> })));
      }
    };
    if (playerPosition) fetchComps();
  }, [playerPosition]);

  const selectedComps = comparisonPlayers.filter(p => selectedPlayerIds.includes(p.id));

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Compute portal player's per-90 averages from last N fixtures
  const portalMetrics = useMemo(() => {
    const windowAnalyses = fixtureAnalyses.slice(0, formWindow);
    return computeAllStatAverages(windowAnalyses, positionMetrics);
  }, [fixtureAnalyses, formWindow, positionMetrics]);

  const hasPortalData = Object.values(portalMetrics).some(v => v != null);

  // Bar chart data for selected metric comparison
  const selectedMetric = positionMetrics.find(m => m.key === selectedMetricKey);
  const barData = useMemo(() => {
    if (!selectedMetric) return [];
    const isPercentage = selectedMetricKey.endsWith('_pct');
    const items: { name: string; value: number; colour: string }[] = [];
    if (hasPortalData && portalMetrics[selectedMetricKey] != null) {
      items.push({ name: playerName, value: portalMetrics[selectedMetricKey]!, colour: PORTAL_COLOUR });
    }
    selectedComps.forEach((cp, idx) => {
      if (cp.metrics[selectedMetricKey] != null) {
        items.push({ name: cp.name, value: cp.metrics[selectedMetricKey], colour: PLAYER_COLOURS[idx % PLAYER_COLOURS.length] });
      }
    });
    return items;
  }, [selectedComps, portalMetrics, hasPortalData, playerName, selectedMetricKey, selectedMetric]);

  return (
    <Card className={embedded ? "rounded-none border-0 shadow-none" : "w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0"}>
      {!embedded && (
        <CardHeader marble>
          <div className="container mx-auto px-4">
            <CardTitle className="font-heading tracking-tight">Comparisons</CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className={embedded ? "p-0 space-y-6" : "container mx-auto px-4 space-y-6 py-6"}>
        {/* Form window selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Form window:</span>
          {[5, 10, 20].map(n => (
            <button
              key={n}
              onClick={() => setFormWindow(n)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                formWindow === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Last {n}
            </button>
          ))}
        </div>

        {/* Player picker - searchable dropdown */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Select comparison players ({playerPosition} only):</p>
          {comparisonPlayers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No players stored for this position.</p>
          ) : (
            <div className="space-y-3">
              <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[320px] justify-between">
                    <span className="text-muted-foreground">
                      <Search className="w-3.5 h-3.5 inline mr-2" />
                      Search players...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search players..."
                      value={playerSearchQuery}
                      onValueChange={setPlayerSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No players found</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-primary"
                            onClick={() => {
                              setPlayerSearchOpen(false);
                              setRequestName(playerSearchQuery);
                              setShowRequestDialog(true);
                            }}
                          >
                            Request this player
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {comparisonPlayers.map(cp => (
                          <CommandItem
                            key={cp.id}
                            value={`${cp.name} ${cp.club || ''}`}
                            onSelect={() => {
                              togglePlayer(cp.id);
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Avatar className="h-5 w-5">
                                {cp.image_url ? <AvatarImage src={cp.image_url} /> : null}
                                <AvatarFallback className="text-[10px]">{cp.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1">{cp.name}</span>
                              <span className="text-xs text-muted-foreground">{cp.club} · {cp.season}</span>
                              {selectedPlayerIds.includes(cp.id) && (
                                <span className="text-primary text-xs font-bold">✓</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="border-t px-3 py-2">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        setPlayerSearchOpen(false);
                        setShowRequestDialog(true);
                      }}
                    >
                      Can't find a player? Request one
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Selected player badges */}
              {selectedComps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedComps.map(cp => (
                    <span
                      key={cp.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm"
                    >
                      <Avatar className="h-4 w-4">
                        {cp.image_url ? <AvatarImage src={cp.image_url} /> : null}
                        <AvatarFallback className="text-[8px]">{cp.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {cp.name}
                      <button onClick={() => togglePlayer(cp.id)} className="ml-1 hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request Player Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request a Comparison Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Enter the player name and we'll add them to the database.
              </p>
              <Input
                placeholder="Player name"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
              <Button
                disabled={!requestName.trim() || requestingPlayer}
                onClick={async () => {
                  setRequestingPlayer(true);
                  try {
                    const { error } = await supabase
                      .from('staff_notification_events')
                      .insert({
                        event_type: 'comparison_request',
                        title: 'Player Request',
                        body: requestName.trim(),
                        event_data: {
                          requested_by: playerName,
                          player_id: playerData?.id,
                          position: playerPosition,
                          requested_name: requestName.trim(),
                        },
                      });
                    if (error) throw error;
                    toast.success('Player requested. We\'ll add them soon.');
                    setShowRequestDialog(false);
                    setRequestName('');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to submit request');
                  }
                  setRequestingPlayer(false);
                }}
              >
                {requestingPlayer ? 'Sending...' : 'Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList>
            <TabsTrigger value="scatter"><ScatterChart className="w-4 h-4 mr-1" /> Scatter</TabsTrigger>
            <TabsTrigger value="percentile"><BarChart3 className="w-4 h-4 mr-1" /> Percentile</TabsTrigger>
            <TabsTrigger value="radar3d"><Box className="w-4 h-4 mr-1" /> 3D Radar</TabsTrigger>
            <TabsTrigger value="comparison"><Users className="w-4 h-4 mr-1" /> Player Comparison</TabsTrigger>
            <TabsTrigger value="scouting"><Crosshair className="w-4 h-4 mr-1" /> Scouting Matrix</TabsTrigger>
            <TabsTrigger value="goals"><Target className="w-4 h-4 mr-1" /> Goals</TabsTrigger>
          </TabsList>

          {/* Scatter Tab */}
          <TabsContent value="scatter" className="mt-4">
            <ScatterComparisonChart
              playerName={playerName}
              portalMetrics={portalMetrics}
              hasPortalData={hasPortalData}
              comparisonPlayers={comparisonPlayers}
              playerPosition={playerPosition}
            />
          </TabsContent>

          {/* 3D Radar Tab */}
          <TabsContent value="radar3d" className="mt-4">
            {hasPortalData ? (
              <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-muted-foreground">Loading 3D radar...</div>}>
                <RadarChart3D
                  playerName={playerName}
                  metrics={(() => {
                    const radarMetrics = positionMetrics
                      .filter(m => portalMetrics[m.key] != null)
                      .slice(0, 8)
                      .map(m => {
                        const value = portalMetrics[m.key]!;
                        const allVals = comparisonPlayers.map(cp => cp.metrics[m.key]).filter((v): v is number => v != null);
                        const belowCount = allVals.filter(v => v < value).length;
                        const pct = allVals.length > 0 ? Math.round((belowCount / allVals.length) * 100) : 50;
                        return { label: m.label.replace(/ \/ Game$/, ''), value: pct };
                      });
                    return radarMetrics;
                  })()}
                />
              </Suspense>
            ) : (
              <p className="text-muted-foreground text-center py-6">No fixture stats recorded yet.</p>
            )}
          </TabsContent>

          {/* Percentile Tab */}
          <TabsContent value="percentile" className="space-y-6 mt-4">
            {comparisonPlayers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No comparison players stored for position: {playerPosition}</p>
            ) : !hasPortalData ? (
              <p className="text-muted-foreground text-center py-6">
                No fixture stats recorded yet. Stats will appear once your performance data is entered.
              </p>
            ) : (
              <div className="space-y-6">
                {positionCategories.map(cat => {
                  const metricsWithValues = cat.metrics.filter(m => portalMetrics[m.key] != null);
                  if (metricsWithValues.length === 0) return null;

                  return (
                    <div key={cat.category}>
                      <h4 className="font-semibold text-sm mb-3">{cat.category}</h4>
                      <div className="space-y-3">
                        {metricsWithValues.map(m => {
                          const value = portalMetrics[m.key]!;
                          // Calculate percentile: how many comparison players does the portal player beat?
                          const allVals = comparisonPlayers
                            .map(cp => cp.metrics[m.key])
                            .filter((v): v is number => v != null);
                          const belowCount = allVals.filter(v => v < value).length;
                          const pct = allVals.length > 0 ? Math.round((belowCount / allVals.length) * 100) : 50;

                          return (
                            <div key={m.key} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{m.label}{m.key.endsWith('_pct') ? '' : ' / Game'}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">{value.toFixed(2)}{m.key.endsWith('_pct') ? '%' : ''}</span>
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
          </TabsContent>

          {/* Direct Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6 mt-4">
            {(selectedComps.length > 0 || hasPortalData) && (
              <>
                {/* Stat Picker Comparison */}
                <div className="bg-card border rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h4 className="font-semibold">Stat Comparison</h4>
                    <Select value={selectedMetricKey} onValueChange={setSelectedMetricKey}>
                      <SelectTrigger className="w-full sm:w-[260px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positionCategories.map(cat => (
                          <div key={cat.category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.category}</div>
                            {cat.metrics.map(m => (
                              <SelectItem key={m.key} value={m.key}>
                                {m.label}{m.key.endsWith('_pct') ? '' : ' / Game'}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {barData.length > 0 ? (
                    <div className="space-y-3">
                      {/* Horizontal bars */}
                      {(() => {
                        const maxVal = Math.max(...barData.map(d => d.value), 0.01);
                        const isPercentage = selectedMetricKey.endsWith('_pct');
                        return barData.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{item.name}</span>
                              <span className="font-bold tabular-nums">
                                {item.value.toFixed(2)}{isPercentage ? '%' : ''}
                              </span>
                            </div>
                            <div className="h-6 bg-muted rounded-md overflow-hidden">
                              <div
                                className="h-full rounded-md transition-all duration-700"
                                style={{
                                  width: `${(item.value / (isPercentage ? 100 : maxVal)) * 100}%`,
                                  backgroundColor: item.colour,
                                }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                      <p className="text-xs text-muted-foreground pt-1">
                        {selectedMetric?.label}{selectedMetricKey.endsWith('_pct') ? '' : ' per game'} · Last {formWindow} avg for {playerName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Select players above to compare stats
                    </p>
                  )}
                </div>

                {/* Comparison Table by Category */}
                {positionCategories.map(cat => {
                  const catMetrics = cat.metrics.filter(m =>
                    (hasPortalData && portalMetrics[m.key] != null) ||
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
                            <TableHead>Metric / Game</TableHead>
                            {hasPortalData && (
                              <TableHead>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PORTAL_COLOUR }} />
                                  <div>
                                    <div className="text-xs font-medium">{playerName}</div>
                                    <div className="text-[10px] text-muted-foreground">Last {formWindow} avg</div>
                                  </div>
                                </div>
                              </TableHead>
                            )}
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
                              {hasPortalData && (
                                <TableCell className="font-semibold">
                                  {portalMetrics[m.key] != null ? portalMetrics[m.key]!.toFixed(2) : '-'}
                                </TableCell>
                              )}
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
          {/* Scouting Matrix Tab */}
          <TabsContent value="scouting" className="mt-4">
            <ScoutingComparisonMatrix
              playerName={playerName}
              portalMetrics={portalMetrics}
              hasPortalData={hasPortalData}
              comparisonPlayers={comparisonPlayers}
              selectedPlayerIds={selectedPlayerIds}
              formWindow={formWindow}
              playerPosition={playerPosition}
            />
          </TabsContent>
          {/* Goals Tab */}
          <TabsContent value="goals" className="mt-4">
            <GoalTracking playerData={playerData} fixtureAnalyses={fixtureAnalyses} formWindow={formWindow} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
