import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { User, Calendar, MapPin, Trophy, Pencil, Check, X } from "lucide-react";
import { METRIC_CATEGORIES, ALL_METRICS } from "@/components/staff/ComparisonPlayerData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  minutes_played: number | null;
  opponent: string | null;
  result: string | null;
  striker_stats?: any;
  fixture_stats?: any;
}

interface Props {
  analyses: Analysis[];
  playerData: any;
  embedded?: boolean;
}

// Use STAT_DEFS from the original plus support fixture_stats
const STAT_DEFS = [
  { key: 'xG_adj_per90', label: 'xG (p90)' },
  { key: 'xA_adj_per90', label: 'xA (p90)' },
  { key: 'regains_adj_per90', label: 'Regains (p90)' },
  { key: 'interceptions_per90', label: 'Interceptions (p90)' },
  { key: 'progressive_passes_adj_per90', label: 'Prog. Passes (p90)' },
  { key: 'dribbles_per90', label: 'Dribbles (p90)' },
  { key: 'turnovers_adj_per90', label: 'Turnovers (p90)' },
  { key: 'ShotsOnTarget_per90', label: 'Shots on Target (p90)' },
];

const getR90Color = (score: number) => {
  if (score < 0) return "hsl(0, 70%, 35%)";
  if (score < 0.2) return "hsl(0, 60%, 50%)";
  if (score < 0.5) return "hsl(30, 70%, 50%)";
  if (score < 1) return "hsl(45, 80%, 50%)";
  return "hsl(140, 60%, 40%)";
};

// Get a stat value from either fixture_stats or striker_stats
const getStatValue = (analysis: Analysis, key: string): number | null => {
  // Check fixture_stats first
  if (analysis.fixture_stats?.[key] != null) {
    return Number(analysis.fixture_stats[key]);
  }
  // Then striker_stats
  if (analysis.striker_stats?.[key] != null) {
    return Number(analysis.striker_stats[key]);
  }
  return null;
};

export const AnalysisDataTab = ({ analyses, playerData, embedded }: Props) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(analyses.map(a => a.id)));
  const [activeStatCategory, setActiveStatCategory] = useState("Shooting");
  const [editingCell, setEditingCell] = useState<{ analysisId: string; metricKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleMatch = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelectedIds(new Set(analyses.map(a => a.id)));

  const selectedAnalyses = analyses.filter(a => selectedIds.has(a.id));

  const currentMetrics = useMemo(() => {
    return METRIC_CATEGORIES.find(c => c.category === activeStatCategory)?.metrics || [];
  }, [activeStatCategory]);

  // Season averages including fixture_stats
  const seasonAverages = useMemo(() => {
    if (selectedAnalyses.length === 0) return {};
    const result: Record<string, number> = {};
    
    const r90Values = selectedAnalyses.filter(a => a.r90_score != null).map(a => a.r90_score);
    if (r90Values.length > 0) result.r90 = r90Values.reduce((s, v) => s + v, 0) / r90Values.length;

    const mins = selectedAnalyses.filter(a => a.minutes_played != null).map(a => a.minutes_played!);
    if (mins.length > 0) result.totalMinutes = mins.reduce((s, v) => s + v, 0);

    // All metrics from all categories
    ALL_METRICS.forEach(m => {
      const values = selectedAnalyses
        .map(a => getStatValue(a, m.key))
        .filter((v): v is number => v != null);
      if (values.length > 0) result[m.key] = values.reduce((s, v) => s + v, 0) / values.length;
    });

    // Also check STAT_DEFS for striker_stats
    STAT_DEFS.forEach(sd => {
      if (result[sd.key] != null) return; // Already calculated
      const values = selectedAnalyses
        .filter(a => a.striker_stats?.[sd.key] != null)
        .map(a => Number(a.striker_stats[sd.key]));
      if (values.length > 0) result[sd.key] = values.reduce((s, v) => s + v, 0) / values.length;
    });

    return result;
  }, [selectedAnalyses]);

  const r90BarData = useMemo(() => {
    return selectedAnalyses
      .filter(a => a.r90_score != null)
      .sort((a, b) => a.analysis_date.localeCompare(b.analysis_date))
      .map(a => ({
        name: a.opponent || new Date(a.analysis_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        r90: a.r90_score,
      }));
  }, [selectedAnalyses]);

  const radarData = useMemo(() => {
    return STAT_DEFS
      .filter(sd => seasonAverages[sd.key] != null)
      .map(sd => ({ metric: sd.label, value: seasonAverages[sd.key] }));
  }, [seasonAverages]);

  const handleStartEdit = (analysisId: string, metricKey: string, currentValue: number | null) => {
    setEditingCell({ analysisId, metricKey });
    setEditValue(currentValue != null ? String(currentValue) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    const { analysisId, metricKey } = editingCell;
    const analysis = analyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const numVal = editValue === "" ? null : parseFloat(editValue);
    
    // Update fixture_stats
    const updatedFixtureStats = { ...(analysis.fixture_stats || {}), [metricKey]: numVal };
    if (numVal === null) delete updatedFixtureStats[metricKey];

    const { error } = await supabase
      .from("player_analysis")
      .update({ fixture_stats: updatedFixtureStats })
      .eq("id", analysisId);

    if (error) {
      toast.error("Failed to save");
    } else {
      // Update local state
      analysis.fixture_stats = updatedFixtureStats;
      toast.success("Saved");
    }
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  return (
    <Card className={embedded ? "rounded-none border-0 shadow-none" : "w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0"}>
      {!embedded && (
        <CardHeader marble>
          <div className="container mx-auto px-4">
            <CardTitle className="font-heading tracking-tight">Data</CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className={embedded ? "p-0 space-y-6" : "container mx-auto px-4 space-y-8 py-6"}>
        {/* Player Summary */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Player Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
              <p className="font-semibold">{playerData?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Age</p>
              <p className="font-semibold">{playerData?.age || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Position</p>
              <p className="font-semibold">{playerData?.position || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Club</p>
              <p className="font-semibold">{playerData?.club || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Minutes Played</p>
              <p className="font-semibold text-primary">{seasonAverages.totalMinutes?.toFixed(0) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Season R90</p>
              <p className="font-semibold text-primary">{seasonAverages.r90?.toFixed(2) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Matches</p>
              <p className="font-semibold">{selectedAnalyses.length}</p>
            </div>
          </div>

          {/* Core averages from all categories */}
          {(() => {
            const availableStats = ALL_METRICS.filter(m => seasonAverages[m.key] != null);
            if (availableStats.length === 0) return null;
            return (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Season Averages</p>
                <div className="flex flex-wrap gap-3">
                  {availableStats.map(m => (
                    <div key={m.key} className="bg-muted/50 px-3 py-1.5 rounded text-sm">
                      <span className="text-muted-foreground">{m.label}:</span>{' '}
                      <span className="font-semibold">{seasonAverages[m.key]?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Category filter tabs for match data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">Match-by-Match</h3>
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
          </div>

          <Tabs value={activeStatCategory} onValueChange={setActiveStatCategory} className="mb-4">
            <TabsList className="grid grid-cols-4 gap-1">
              {METRIC_CATEGORIES.map(cat => (
                <TabsTrigger key={cat.category} value={cat.category} className="text-xs">
                  {cat.category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Match table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Mins</TableHead>
                <TableHead>R90</TableHead>
                {currentMetrics.map(m => (
                  <TableHead key={m.key} className="text-xs min-w-[80px]">{m.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map(a => (
                <TableRow key={a.id} className={selectedIds.has(a.id) ? '' : 'opacity-40'}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(a.id)}
                      onCheckedChange={() => toggleMatch(a.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{new Date(a.analysis_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="text-sm font-medium">{a.opponent || '-'}</TableCell>
                  <TableCell className="text-sm">{a.minutes_played ?? '-'}</TableCell>
                  <TableCell>
                    {a.r90_score != null ? (
                      <span className="font-bold text-sm" style={{ color: getR90Color(a.r90_score) }}>
                        {a.r90_score.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  {currentMetrics.map(m => {
                    const val = getStatValue(a, m.key);
                    const isEditing = editingCell?.analysisId === a.id && editingCell?.metricKey === m.key;
                    
                    return (
                      <TableCell key={m.key} className="text-sm">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-16 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-400">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={handleCancelEdit} className="text-destructive hover:text-destructive/80">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(a.id, m.key, val)}
                            className="group flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                          >
                            <span>{val != null ? val.toFixed(2) : '-'}</span>
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Visual Stats */}
        {selectedAnalyses.length > 0 && (
          <>
            {r90BarData.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-semibold mb-4">R90 Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={r90BarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="r90" radius={[4, 4, 0, 0]}>
                      {r90BarData.map((entry, i) => (
                        <Cell key={i} fill={getR90Color(entry.r90)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {radarData.length >= 3 && (
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-semibold mb-4">Performance Radar</h4>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="Average" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
