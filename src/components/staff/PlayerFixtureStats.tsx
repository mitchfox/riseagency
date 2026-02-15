import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { METRIC_CATEGORIES, ALL_METRICS } from "./ComparisonPlayerData";

interface FixtureAnalysis {
  id: string;
  analysis_date: string;
  opponent: string | null;
  minutes_played: number | null;
  r90_score: number | null;
  fixture_stats: Record<string, number>;
}

interface Props {
  playerId: string;
  playerName: string;
}

export const PlayerFixtureStats = ({ playerId, playerName }: Props) => {
  const [analyses, setAnalyses] = useState<FixtureAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedStats, setEditedStats] = useState<Record<string, Record<string, number>>>({});
  const [activeCategory, setActiveCategory] = useState("Shooting");

  useEffect(() => {
    fetchAnalyses();
  }, [playerId]);

  const fetchAnalyses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_analysis')
      .select('id, analysis_date, opponent, minutes_played, r90_score, fixture_stats')
      .eq('player_id', playerId)
      .order('analysis_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching analyses:', error);
      toast.error('Failed to load fixture data');
    } else {
      const parsed = (data || []).map(a => ({
        ...a,
        fixture_stats: (a.fixture_stats as Record<string, number>) || {},
      }));
      setAnalyses(parsed);
      // Initialise edited stats from existing data
      const initial: Record<string, Record<string, number>> = {};
      parsed.forEach(a => {
        initial[a.id] = { ...a.fixture_stats };
      });
      setEditedStats(initial);
    }
    setLoading(false);
  };

  const handleStatChange = (analysisId: string, metricKey: string, value: string) => {
    setEditedStats(prev => ({
      ...prev,
      [analysisId]: {
        ...(prev[analysisId] || {}),
        [metricKey]: value === '' ? undefined as any : parseFloat(value),
      }
    }));
  };

  const saveFixtureStats = async (analysisId: string) => {
    setSaving(analysisId);
    const stats = editedStats[analysisId] || {};
    // Remove undefined values
    const cleaned: Record<string, number> = {};
    Object.entries(stats).forEach(([k, v]) => {
      if (v !== undefined && !isNaN(v)) cleaned[k] = v;
    });

    const { error } = await supabase
      .from('player_analysis')
      .update({ fixture_stats: cleaned })
      .eq('id', analysisId);

    if (error) {
      toast.error('Failed to save stats');
    } else {
      toast.success('Fixture stats saved');
      // Update local state
      setAnalyses(prev => prev.map(a =>
        a.id === analysisId ? { ...a, fixture_stats: cleaned } : a
      ));
    }
    setSaving(null);
  };

  const saveAllStats = async () => {
    setSaving('all');
    let errors = 0;
    for (const analysis of analyses) {
      const stats = editedStats[analysis.id] || {};
      const cleaned: Record<string, number> = {};
      Object.entries(stats).forEach(([k, v]) => {
        if (v !== undefined && !isNaN(v)) cleaned[k] = v;
      });
      const { error } = await supabase
        .from('player_analysis')
        .update({ fixture_stats: cleaned })
        .eq('id', analysis.id);
      if (error) errors++;
    }
    if (errors) toast.error(`Failed to save ${errors} fixture(s)`);
    else toast.success('All fixture stats saved');
    setSaving(null);
    fetchAnalyses();
  };

  // Calculate averages from current data
  const averages = useMemo(() => {
    const result: Record<string, number | null> = {};
    ALL_METRICS.forEach(m => {
      const vals = analyses
        .map(a => (editedStats[a.id] || a.fixture_stats)?.[m.key])
        .filter((v): v is number => v != null && !isNaN(v));
      result[m.key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    });
    return result;
  }, [analyses, editedStats]);

  const currentCategoryMetrics = METRIC_CATEGORIES.find(c => c.category === activeCategory)?.metrics || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading fixture data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">Player Data — {playerName}</CardTitle>
          <Button onClick={saveAllStats} disabled={saving === 'all'} size="sm">
            {saving === 'all' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save All
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last {analyses.length} fixtures. Edit per-90 stats per game. Averages update automatically and feed into portal comparisons.
        </p>
      </CardHeader>
      <CardContent className="px-0 md:px-6">
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No performance reports found for this player.</p>
        ) : (
          <>
            {/* Category tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="mx-3 md:mx-0 grid grid-cols-4 gap-1 mb-4">
                {METRIC_CATEGORIES.map(cat => (
                  <TabsTrigger key={cat.category} value={cat.category} className="text-xs">
                    {cat.category}
                  </TabsTrigger>
                ))}
              </TabsList>

              {METRIC_CATEGORIES.map(cat => (
                <TabsContent key={cat.category} value={cat.category} className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Fixture</TableHead>
                          <TableHead className="min-w-[60px] text-center">Mins</TableHead>
                          <TableHead className="min-w-[60px] text-center">R90</TableHead>
                          {cat.metrics.map(m => (
                            <TableHead key={m.key} className="min-w-[90px] text-center text-xs">
                              {m.label}
                            </TableHead>
                          ))}
                          <TableHead className="min-w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyses.map(a => {
                          const stats = editedStats[a.id] || a.fixture_stats;
                          const hasChanges = JSON.stringify(stats) !== JSON.stringify(a.fixture_stats);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium text-xs">
                                <div>{a.opponent || 'Unknown'}</div>
                                <div className="text-muted-foreground text-[10px]">{a.analysis_date}</div>
                              </TableCell>
                              <TableCell className="text-center text-xs">{a.minutes_played ?? '-'}</TableCell>
                              <TableCell className="text-center text-xs font-semibold">
                                {a.r90_score != null ? a.r90_score.toFixed(2) : '-'}
                              </TableCell>
                              {cat.metrics.map(m => (
                                <TableCell key={m.key} className="p-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={stats[m.key] ?? ''}
                                    onChange={(e) => handleStatChange(a.id, m.key, e.target.value)}
                                    className="w-[80px] h-7 text-xs text-center mx-auto"
                                    placeholder="-"
                                  />
                                </TableCell>
                              ))}
                              <TableCell>
                                {hasChanges && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => saveFixtureStats(a.id)}
                                    disabled={saving === a.id}
                                    className="h-7 px-2"
                                  >
                                    {saving === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Averages row */}
                        <TableRow className="bg-muted/50 font-semibold border-t-2">
                          <TableCell className="sticky left-0 bg-muted/50 z-10 text-xs">
                            Average ({analyses.length} games)
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {analyses.filter(a => a.minutes_played).length > 0
                              ? Math.round(analyses.reduce((s, a) => s + (a.minutes_played || 0), 0) / analyses.filter(a => a.minutes_played).length)
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {analyses.filter(a => a.r90_score != null).length > 0
                              ? (analyses.reduce((s, a) => s + (a.r90_score || 0), 0) / analyses.filter(a => a.r90_score != null).length).toFixed(2)
                              : '-'}
                          </TableCell>
                          {cat.metrics.map(m => (
                            <TableCell key={m.key} className="text-center text-xs">
                              {averages[m.key] != null ? averages[m.key]!.toFixed(2) : '-'}
                            </TableCell>
                          ))}
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
};
