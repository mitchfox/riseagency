import { useState, useMemo, useEffect } from "react";
import { computeAllStatAverages, computeStatAverage, formatStat } from "@/lib/statAggregation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { User, Calendar, MapPin, Trophy, Pencil, Check, X, Flag, Ban } from "lucide-react";
import { getMetricCategoriesForPosition, getMetricsForPosition } from "@/components/staff/ComparisonPlayerData";
import { supabase } from "@/integrations/supabase/client";
import { PitchHeatmap } from "@/components/report/PitchHeatmap";
import { ZonePerformance } from "@/components/report/ZonePerformance";
import { toast } from "sonner";
import { formatDate, dateLocale } from "@/lib/dateLocale";
import { effectiveR90, effectiveMinutes } from "@/lib/r90";
import { calculateAge } from "@/lib/ageUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

interface Analysis {
  id: string;
  analysis_date: string;
  r90_score: number;
  minutes_played: number | null;
  opponent: string | null;
  result: string | null;
  striker_stats?: any;
  fixture_stats?: any;
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
  season_final?: boolean | null;
  data_unavailable?: boolean | null;
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
  const positionCategories = useMemo(() => getMetricCategoriesForPosition(playerData?.position), [playerData?.position]);
  const positionMetrics = useMemo(() => getMetricsForPosition(playerData?.position), [playerData?.position]);
  const [activeStatCategory, setActiveStatCategory] = useState(positionCategories[0]?.category || "Shooting");
  const [editingCell, setEditingCell] = useState<{ analysisId: string; metricKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [seasonZoneActions, setSeasonZoneActions] = useState<Array<{ action_number: number; action_score: number; zone?: number | null; zone_details?: { zone: number; sub?: number }[] | null }>>([]);
  const [seasonZoneLoading, setSeasonZoneLoading] = useState(false);
  const [seasonFinalIds, setSeasonFinalIds] = useState<Set<string>>(
    new Set(analyses.filter(a => a.season_final).map(a => a.id))
  );
  const [savingSeasonFinal, setSavingSeasonFinal] = useState(false);

  // ---- Named seasons (player_seasons) ----
  interface SeasonRow {
    id: string;
    name: string;
    start_analysis_id: string | null;
    end_analysis_id: string | null;
  }
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStart, setNewSeasonStart] = useState<string>("");
  const [newSeasonEnd, setNewSeasonEnd] = useState<string>("");
  const [savingSeason, setSavingSeason] = useState(false);

  const playerId = playerData?.id;

  const loadSeasons = async () => {
    if (!playerId) return;
    const { data } = await supabase
      .from("player_seasons")
      .select("id, name, start_analysis_id, end_analysis_id")
      .eq("player_id", playerId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setSeasons((data || []) as SeasonRow[]);
  };

  useEffect(() => {
    void loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const matchOptions = useMemo(() =>
    [...analyses].sort((a, b) => b.analysis_date.localeCompare(a.analysis_date)),
    [analyses]
  );
  const matchLabel = (a: Analysis) =>
    `${formatDate(a.analysis_date, playerData?.portal_language, { day: '2-digit', month: 'short', year: 'numeric' })}${a.opponent ? ` vs ${a.opponent}` : ''}`;

  const handleAddSeason = async () => {
    if (!playerId || !newSeasonName.trim()) {
      toast.error("Season name required");
      return;
    }
    setSavingSeason(true);
    const { error } = await supabase.from("player_seasons").insert({
      player_id: playerId,
      name: newSeasonName.trim(),
      start_analysis_id: newSeasonStart || null,
      end_analysis_id: newSeasonEnd || null,
      sort_order: seasons.length,
    });
    if (error) {
      toast.error("Failed to add season");
    } else {
      setNewSeasonName("");
      setNewSeasonStart("");
      setNewSeasonEnd("");
      await loadSeasons();
      toast.success("Season added");
    }
    setSavingSeason(false);
  };

  const handleUpdateSeason = async (id: string, patch: Partial<SeasonRow>) => {
    const { error } = await supabase.from("player_seasons").update(patch).eq("id", id);
    if (error) { toast.error("Failed to update season"); return; }
    setSeasons(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const handleDeleteSeason = async (id: string) => {
    const { error } = await supabase.from("player_seasons").delete().eq("id", id);
    if (error) { toast.error("Failed to delete season"); return; }
    setSeasons(prev => prev.filter(s => s.id !== id));
    toast.success("Season removed");
  };

  const displayAge = playerData?.age || calculateAge(playerData?.date_of_birth) || null;

  useEffect(() => {
    setSeasonFinalIds(new Set(analyses.filter(a => a.season_final).map(a => a.id)));
  }, [analyses]);

  // Keep selectedIds in sync as analyses load/change. Without this, the
  // Set initialised on first mount (often before analyses arrive) stays
  // empty and the Player Summary shows "-" / 0 matches.
  useEffect(() => {
    setSelectedIds(prev => {
      const ids = new Set(analyses.map(a => a.id));
      // Preserve any user toggles for ids that still exist; auto-select
      // newly-arrived ids that weren't known before.
      const next = new Set<string>();
      analyses.forEach(a => {
        if (prev.size === 0 || prev.has(a.id)) next.add(a.id);
      });
      return next;
    });
  }, [analyses]);

  useEffect(() => {
    const defaultCategory = positionCategories[0]?.category;
    if (defaultCategory && !positionCategories.some(category => category.category === activeStatCategory)) {
      setActiveStatCategory(defaultCategory);
    }
  }, [activeStatCategory, positionCategories]);

  const toggleMatch = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelectedIds(new Set(analyses.map(a => a.id)));

  const selectedAnalyses = analyses.filter(a => selectedIds.has(a.id));
  // Matches flagged "no data available" never contribute to season
  // aggregates or stat averages, even though their R90 can still appear
  // in the per-match table below.
  const aggregateAnalyses = useMemo(
    () => selectedAnalyses.filter(a => !a.data_unavailable),
    [selectedAnalyses],
  );

  const currentMetrics = useMemo(() => {
    return positionCategories.find(c => c.category === activeStatCategory)?.metrics || [];
  }, [activeStatCategory, positionCategories]);

  // Season averages including fixture_stats
  const seasonAverages = useMemo(() => {
    if (aggregateAnalyses.length === 0) return {};
    const result: Record<string, number> = {};

    // Hidden reports must contribute their HIDDEN R90 / minutes, not the live values.
    const r90Values = aggregateAnalyses
      .map(a => effectiveR90(a))
      .filter((v): v is number => v != null);
    if (r90Values.length > 0) result.r90 = r90Values.reduce((s, v) => s + v, 0) / r90Values.length;

    const mins = aggregateAnalyses
      .map(a => effectiveMinutes(a))
      .filter((v): v is number => v != null);
    if (mins.length > 0) result.totalMinutes = mins.reduce((s, v) => s + v, 0);

    // All metrics from all categories using centralised aggregation
    const allAvgs = computeAllStatAverages(aggregateAnalyses, positionMetrics);
    Object.entries(allAvgs).forEach(([key, val]) => {
      if (val != null) result[key] = val;
    });

    // Also check STAT_DEFS for striker_stats
    STAT_DEFS.forEach(sd => {
      if (result[sd.key] != null) return;
      const avg = computeStatAverage(aggregateAnalyses, sd.key);
      if (avg != null) result[sd.key] = avg;
    });

    return result;
  }, [positionMetrics, aggregateAnalyses]);

  const r90BarData = useMemo(() => {
    return selectedAnalyses
      .filter(a => effectiveR90(a) != null)
      .sort((a, b) => a.analysis_date.localeCompare(b.analysis_date))
      .map(a => {
        const isHiddenOrDraft = ['hidden', 'draft', 'clipped'].includes(String(a.visibility_status || '').toLowerCase());
        const r90 = effectiveR90(a) ?? 0;
        return {
          name: isHiddenOrDraft
            ? formatDate(a.analysis_date, playerData?.portal_language, { day: '2-digit', month: 'short' })
            : (a.opponent || formatDate(a.analysis_date, playerData?.portal_language, { day: '2-digit', month: 'short' })),
          r90: Number(r90.toFixed(2)),
        };
      });
  }, [selectedAnalyses]);

  const radarData = useMemo(() => {
    return STAT_DEFS
      .filter(sd => seasonAverages[sd.key] != null)
      .map(sd => ({ metric: sd.label, value: seasonAverages[sd.key] }));
  }, [seasonAverages]);

  const last40AnalysisIds = useMemo(() => {
    return [...analyses]
      .sort((a, b) => b.analysis_date.localeCompare(a.analysis_date))
      .slice(0, 40)
      .map(a => a.id);
  }, [analyses]);

  useEffect(() => {
    let isMounted = true;

    const fetchSeasonZoneActions = async () => {
      if (last40AnalysisIds.length === 0) {
        if (isMounted) setSeasonZoneActions([]);
        return;
      }

      setSeasonZoneLoading(true);

      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("action_score, zone, zone_details")
        .in("analysis_id", last40AnalysisIds);

      if (!isMounted) return;

      if (error) {
        console.error("Error fetching season zone data:", error);
        setSeasonZoneActions([]);
        setSeasonZoneLoading(false);
        return;
      }

      const parsedActions = (data || [])
        .filter((a: any) => typeof a?.action_score === "number")
        .filter((a: any) => a?.zone != null || (Array.isArray(a?.zone_details) && a.zone_details.length > 0))
        .map((a: any, index: number) => ({
          action_number: index + 1,
          action_score: Number(a.action_score),
          zone: a.zone ?? null,
          zone_details: Array.isArray(a.zone_details) ? a.zone_details : null,
        }));

      setSeasonZoneActions(parsedActions);
      setSeasonZoneLoading(false);
    };

    void fetchSeasonZoneActions();

    return () => {
      isMounted = false;
    };
  }, [last40AnalysisIds]);

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
    
    const updatedStrikerStats = { ...(analysis.striker_stats || {}), [metricKey]: numVal };
    const updatedFixtureStats = { ...(analysis.fixture_stats || {}), [metricKey]: numVal };
    if (numVal === null) delete updatedStrikerStats[metricKey];
    if (numVal === null) delete updatedFixtureStats[metricKey];

    const { error } = await supabase
      .from("player_analysis")
      .update({ fixture_stats: updatedFixtureStats, striker_stats: updatedStrikerStats })
      .eq("id", analysisId);

    if (error) {
      toast.error("Failed to save");
    } else {
      // Update local state
      analysis.fixture_stats = updatedFixtureStats;
      analysis.striker_stats = updatedStrikerStats;
      toast.success("Saved");
    }
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const toggleDataUnavailable = async (analysis: Analysis) => {
    const next = !analysis.data_unavailable;
    const { error } = await supabase
      .from("player_analysis")
      .update({ data_unavailable: next })
      .eq("id", analysis.id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    analysis.data_unavailable = next;
    // Force re-render by nudging selectedIds set identity.
    setSelectedIds(prev => new Set(prev));
    toast.success(next ? "Marked as no data available" : "Restored match data");
  };

  // Most recent match (by date) — that's the candidate the staff button toggles
  // as the season-ending fixture.
  const mostRecentAnalysis = useMemo(() => {
    if (analyses.length === 0) return null;
    return [...analyses].sort((a, b) => b.analysis_date.localeCompare(a.analysis_date))[0];
  }, [analyses]);

  const mostRecentIsSeasonFinal = mostRecentAnalysis
    ? seasonFinalIds.has(mostRecentAnalysis.id)
    : false;

  const toggleSeasonFinal = async () => {
    if (!mostRecentAnalysis) return;
    setSavingSeasonFinal(true);
    const next = !mostRecentIsSeasonFinal;
    const { error } = await supabase
      .from("player_analysis")
      .update({ season_final: next })
      .eq("id", mostRecentAnalysis.id);
    if (error) {
      toast.error("Failed to update season marker");
    } else {
      setSeasonFinalIds(prev => {
        const n = new Set(prev);
        if (next) n.add(mostRecentAnalysis.id); else n.delete(mostRecentAnalysis.id);
        return n;
      });
      toast.success(next ? "Marked as final game of the season" : "Removed season marker");
    }
    setSavingSeasonFinal(false);
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
              <p className="font-semibold">{displayAge ?? '-'}</p>
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
              <p className="font-semibold">{aggregateAnalyses.length}</p>
            </div>
          </div>

          {/* Named seasons editor */}
          <div className="mt-5 pt-5 border-t border-border/60 space-y-3">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Seasons</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Name a season (e.g. 2025/26) and pick its first and last match. Used by
              Form, Performance and Comparisons to scope season averages.
            </p>

            {seasons.length > 0 && (
              <div className="space-y-2">
                {seasons.map(s => (
                  <div key={s.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center border rounded-md p-2">
                    <Input
                      defaultValue={s.name}
                      onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.name) handleUpdateSeason(s.id, { name: e.target.value.trim() }); }}
                      placeholder="Season name"
                    />
                    <Select value={s.start_analysis_id || "__none__"} onValueChange={(v) => handleUpdateSeason(s.id, { start_analysis_id: v === "__none__" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="First match" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">— First match —</SelectItem>
                        {matchOptions.map(a => (
                          <SelectItem key={a.id} value={a.id}>{matchLabel(a)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={s.end_analysis_id || "__none__"} onValueChange={(v) => handleUpdateSeason(s.id, { end_analysis_id: v === "__none__" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="Last match" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">— Last match —</SelectItem>
                        {matchOptions.map(a => (
                          <SelectItem key={a.id} value={a.id}>{matchLabel(a)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSeason(s.id)} title="Delete season">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="e.g. 2025/26"
              />
              <Select value={newSeasonStart || "__none__"} onValueChange={(v) => setNewSeasonStart(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="First match" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">— First match —</SelectItem>
                  {matchOptions.map(a => (
                    <SelectItem key={a.id} value={a.id}>{matchLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newSeasonEnd || "__none__"} onValueChange={(v) => setNewSeasonEnd(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Last match" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">— Last match —</SelectItem>
                  {matchOptions.map(a => (
                    <SelectItem key={a.id} value={a.id}>{matchLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddSeason} disabled={savingSeason} className="gap-1">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="h-px w-full" style={{ background: "hsl(43, 49%, 61%)" }} />

        {/* Category filter tabs for match data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">Match-by-Match</h3>
          </div>

          <Tabs value={activeStatCategory} onValueChange={setActiveStatCategory} className="mb-4">
            <TabsList className="grid grid-cols-4 gap-1">
              {positionCategories.map(cat => (
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
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{new Date(a.analysis_date).toLocaleDateString(dateLocale(playerData?.portal_language))}</TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span>{a.opponent || '-'}</span>
                      {embedded && (
                        <button
                          onClick={() => toggleDataUnavailable(a)}
                          title={a.data_unavailable ? "Restore match data" : "Mark as no data available"}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${
                            a.data_unavailable
                              ? "text-destructive hover:text-destructive/80"
                              : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.data_unavailable ? (
                      <span className="blur-sm select-none text-muted-foreground">–</span>
                    ) : (
                      effectiveMinutes(a) ?? '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const r = effectiveR90(a);
                      return r != null ? (
                        <span className="font-bold text-sm" style={{ color: getR90Color(r) }}>
                          {r.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-bold text-sm text-zinc-500">?</span>
                      );
                    })()}
                  </TableCell>
                  {a.data_unavailable ? (
                    <TableCell colSpan={currentMetrics.length} className="text-sm">
                      <div className="flex items-center justify-center text-xs uppercase tracking-wider text-muted-foreground italic">
                        No data available
                      </div>
                    </TableCell>
                  ) : currentMetrics.map(m => {
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
                            <span>{formatStat(m.key, val)}</span>
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

        {/* Season zone aggregate (last 40 reports) */}
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div>
            <h4 className="font-semibold">Season Heat Map & Zone Performance</h4>
            <p className="text-xs text-muted-foreground">Aggregated from the latest 40 reports.</p>
          </div>

          {seasonZoneLoading ? (
            <p className="text-sm text-muted-foreground">Loading zone data…</p>
          ) : seasonZoneActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zone data available in the latest 40 reports.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <PitchHeatmap actions={seasonZoneActions} />
              </div>
              <div className="rounded-lg border p-3">
                <ZonePerformance actions={seasonZoneActions} />
              </div>
            </div>
          )}
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

          </>
        )}
      </CardContent>
    </Card>
  );
};
