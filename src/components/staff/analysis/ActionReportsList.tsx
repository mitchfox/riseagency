import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, TrendingUp, Edit, Eye, User, FileEdit, EyeOff, Radio, Play, Film, ListChecks, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MatchClipPlayer } from "@/components/staff/analysis/MatchClipPlayer";
import { ScoreEditMode } from "@/components/staff/analysis/ScoreEditMode";
import { format } from "date-fns";
import { CreatePerformanceReportDialog } from "@/components/staff/CreatePerformanceReportDialog";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { useStatsUpdaterAssignments } from "@/hooks/useStatsUpdaterAssignments";

interface ActionReport {
  id: string;
  analysis_date: string;
  opponent: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  result: string | null;
  player_id: string | null;
  player_name?: string;
  player_image_url?: string;
  report_type?: 'player' | 'team' | string | null;
  team_name?: string | null;
  team_logo_url?: string | null;
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
  category?: string | null;
  notes?: string | null;
  is_todo?: boolean;
  todo_note?: string | null;
}

interface ActionReportsListProps {
  onCreateReport?: (playerId: string, playerName: string, reportType?: 'player' | 'team') => void;
  onEditReport?: (playerId: string, playerName: string, analysisId: string) => void;
  defaultPlayerId?: string;
  defaultPlayerName?: string;
}

export const ActionReportsList = ({ onCreateReport, onEditReport, defaultPlayerId, defaultPlayerName }: ActionReportsListProps = {}) => {
  const [reports, setReports] = useState<ActionReport[]>([]);
  const scope = useStatsUpdaterAssignments();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState(defaultPlayerId || "all");
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [statusTab, setStatusTab] = useState("draft");
  const [clipPlayerReport, setClipPlayerReport] = useState<ActionReport | null>(null);
  const [scoreEditReport, setScoreEditReport] = useState<ActionReport | null>(null);
  
  // Dialog states
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [reportEditorPlayerId, setReportEditorPlayerId] = useState<string | null>(null);
  const [reportEditorPlayerName, setReportEditorPlayerName] = useState<string>("");
  const [reportEditorAnalysisId, setReportEditorAnalysisId] = useState<string | undefined>(undefined);
  const [reportEditorInitialType, setReportEditorInitialType] = useState<'player' | 'team'>('player');
  const [selectedReportAnalysisId, setSelectedReportAnalysisId] = useState<string | null>(null);
  const [performanceReportDialogOpen, setPerformanceReportDialogOpen] = useState(false);
  const [showReportTypePicker, setShowReportTypePicker] = useState(false);
  const [pendingReportType, setPendingReportType] = useState<'player' | 'team'>('player');
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [todoPickerOpen, setTodoPickerOpen] = useState(false);
  const [todoNoteEditor, setTodoNoteEditor] = useState<{ id: string; note: string } | null>(null);
  const [todoPickerSearch, setTodoPickerSearch] = useState("");
  const [todoPickerNote, setTodoPickerNote] = useState("");

  useEffect(() => {
    if (scope.loading) return;
    fetchReports();
    fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.loading, scope.isScoped]);

  useEffect(() => {
    if (defaultPlayerId) {
      setPlayerFilter(defaultPlayerId);
    }
  }, [defaultPlayerId]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("id, name")
      .order("name");
    const all = data || [];
    if (scope.isScoped) {
      const ids = scope.allowedIds;
      setPlayers(ids ? all.filter(p => ids.has(p.id)) : []);
    } else {
      setPlayers(all);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select(`
          id,
          analysis_date,
          opponent,
          r90_score,
          minutes_played,
          result,
          player_id,
          report_type,
          team_name,
          team_logo_url,
          visibility_status,
          placeholder_raw_score,
          placeholder_minutes,
          category,
          notes,
          is_todo,
          todo_note,
          players!player_analysis_player_id_fkey (
            name,
            image_url
          )
        `)
        .order("analysis_date", { ascending: false });

      if (error) throw error;

      const formattedReports = (data || []).map((report: any) => ({
        id: report.id,
        analysis_date: report.analysis_date,
        opponent: report.opponent,
        r90_score: report.r90_score,
        minutes_played: report.minutes_played,
        result: report.result,
        player_id: report.player_id,
        report_type: report.report_type || "player",
        team_name: report.team_name || null,
        team_logo_url: report.team_logo_url || null,
        player_name: report.report_type === "team" ? (report.team_name || "Team Report") : (report.players?.name || "Unknown Player"),
        player_image_url: report.report_type === "team" ? (report.team_logo_url || null) : (report.players?.image_url || null),
        visibility_status: report.visibility_status || "draft",
        placeholder_raw_score: report.placeholder_raw_score,
        placeholder_minutes: report.placeholder_minutes,
        category: report.category || "match",
        notes: report.notes || null,
        is_todo: !!report.is_todo,
        todo_note: report.todo_note || null,
      }));

      const scoped = scope.isScoped
        ? (scope.allowedIds
            ? formattedReports.filter((r) => r.player_id && scope.allowedIds!.has(r.player_id))
            : [])
        : formattedReports;
      setReports(scoped);
    } catch (error: any) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load action reports");
    } finally {
      setLoading(false);
    }
  };

  const getR90ColorClass = (score: number) => {
    if (score < 0) return "bg-red-950";
    if (score >= 0 && score < 0.2) return "bg-red-600";
    if (score >= 0.2 && score < 0.4) return "bg-red-400";
    if (score >= 0.4 && score < 0.6) return "bg-orange-700";
    if (score >= 0.6 && score < 0.8) return "bg-orange-500";
    if (score >= 0.8 && score < 1.0) return "bg-yellow-400";
    if (score >= 1.0 && score < 1.4) return "bg-lime-400";
    if (score >= 1.4 && score < 1.8) return "bg-green-500";
    if (score >= 1.8 && score < 2.5) return "bg-green-700";
    return "bg-gold";
  };

  const getEffectiveR90 = (report: ActionReport): number | null => {
    if (report.visibility_status === "hidden" && report.placeholder_raw_score != null && report.placeholder_minutes) {
      return (report.placeholder_raw_score / report.placeholder_minutes) * 90;
    }
    return report.r90_score;
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.player_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.opponent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlayer = playerFilter === "all" || report.player_id === playerFilter;
    const status = report.visibility_status || "draft";
    const matchesStatus =
      statusTab === "all" ? true
      : statusTab === "todo" ? !!report.is_todo
      : status === statusTab;
    return matchesSearch && matchesPlayer && matchesStatus;
  });

  const statusCounts = {
    all: reports.filter(r => {
      const matchesSearch = r.player_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.opponent?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlayer = playerFilter === "all" || r.player_id === playerFilter;
      return matchesSearch && matchesPlayer;
    }).length,
    todo: reports.filter(r => r.is_todo).length,
    draft: reports.filter(r => (r.visibility_status || "draft") === "draft").length,
    clipped: reports.filter(r => r.visibility_status === "clipped").length,
    hidden: reports.filter(r => r.visibility_status === "hidden").length,
    live: reports.filter(r => r.visibility_status === "live").length,
  };

  const toggleTodo = async (report: ActionReport, next: boolean, note?: string | null) => {
    const payload: any = { is_todo: next };
    if (note !== undefined) payload.todo_note = note;
    const { error } = await supabase.from("player_analysis").update(payload).eq("id", report.id);
    if (error) { toast.error("Couldn't update To Do"); return; }
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, is_todo: next, ...(note !== undefined ? { todo_note: note } : {}) } : r));
    toast.success(next ? "Added to To Do" : "Removed from To Do");
  };

  const beginCreateReport = (reportType: 'player' | 'team') => {
    setPendingReportType(reportType);
    setShowReportTypePicker(false);
    // Team reports are anchored to a club, not a player — skip the picker entirely.
    if (reportType === 'team') {
      if (onCreateReport) {
        onCreateReport('', '', reportType);
      } else {
        setReportEditorPlayerId(null);
        setReportEditorPlayerName('');
        setReportEditorAnalysisId(undefined);
        setReportEditorInitialType('team');
        setShowReportEditor(true);
      }
      return;
    }
    if (defaultPlayerId && defaultPlayerName) {
      if (onCreateReport) {
        onCreateReport(defaultPlayerId, defaultPlayerName, reportType);
      } else {
        setReportEditorPlayerId(defaultPlayerId);
        setReportEditorPlayerName(defaultPlayerName);
        setReportEditorAnalysisId(undefined);
        setReportEditorInitialType(reportType);
        setShowReportEditor(true);
      }
    } else {
      setShowPlayerPicker(true);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading action reports...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by player or opponent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {defaultPlayerId ? (
            <div className="rounded-md border px-3 py-2 text-sm min-w-[200px]">
              <span className="font-medium">{defaultPlayerName || players.find(p => p.id === defaultPlayerId)?.name || "Selected player"}</span>
            </div>
          ) : (
            <Select value={playerFilter} onValueChange={setPlayerFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={() => setShowReportTypePicker(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Action Report
        </Button>
      </div>

      {/* Status Subtabs */}
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto p-1 bg-muted/50">
          <TabsTrigger value="all" className="text-xs px-3 py-1.5">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="todo" className="text-xs px-3 py-1.5 data-[state=active]:text-primary">
            <ListChecks className="w-3 h-3 mr-1" />
            To Do ({statusCounts.todo})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs px-3 py-1.5">Draft ({statusCounts.draft})</TabsTrigger>
          <TabsTrigger value="clipped" className="text-xs px-3 py-1.5">Clipped ({statusCounts.clipped})</TabsTrigger>
          <TabsTrigger value="hidden" className="text-xs px-3 py-1.5">Hidden ({statusCounts.hidden})</TabsTrigger>
          <TabsTrigger value="live" className="text-xs px-3 py-1.5">Live ({statusCounts.live})</TabsTrigger>
        </TabsList>
      </Tabs>

      {statusTab === "todo" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            A manual list of reports that need action. Each one shows its note as a banner at the top of the report.
          </p>
          <Button size="sm" onClick={() => { setTodoPickerOpen(true); setTodoPickerSearch(""); setTodoPickerNote(""); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add to To Do
          </Button>
        </div>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No action reports found</p>
          <p className="text-sm">Create your first action report to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredReports.map((report) => (
            <div key={report.id} className="rounded-lg overflow-hidden">
              {report.is_todo && (
                <div className="flex items-center gap-2 bg-primary/15 border-b border-primary/40 px-3 py-1.5 text-[11px] md:text-xs text-primary">
                  <ListChecks className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    <span className="font-semibold mr-1">To Do:</span>
                    {report.todo_note?.trim() || <span className="opacity-70 italic">No note yet — click pencil to add one.</span>}
                  </span>
                  <button
                    type="button"
                    title="Edit note"
                    onClick={() => setTodoNoteEditor({ id: report.id, note: report.todo_note || "" })}
                    className="hover:text-primary/80 p-0.5"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Remove from To Do"
                    onClick={() => toggleTodo(report, false, null)}
                    className="hover:text-primary/80 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="text-white flex flex-col md:flex-row md:items-stretch">
              {/* R90 Score */}
              {(() => {
                const effectiveR90 = getEffectiveR90(report);
                if (effectiveR90 === null || effectiveR90 === undefined) return null;
                return (
                  <>
                    {/* Mobile: Horizontal R90 */}
                    <div className={`md:hidden ${getR90ColorClass(effectiveR90)} p-3`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="text-3xl font-bold">
                          {effectiveR90.toFixed(2)}
                        </div>
                        <TrendingUp className="w-8 h-8 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="text-xs opacity-90 font-medium text-center">R90 SCORE</div>
                    </div>
                    
                    {/* Desktop: Vertical R90 */}
                    <div className={`hidden md:flex ${getR90ColorClass(effectiveR90)} items-center justify-center p-4 flex-shrink-0`}>
                      <div className="text-center">
                        <TrendingUp className="w-8 h-8 text-white mx-auto mb-2" strokeWidth={2.5} />
                        <div className="text-4xl font-bold">
                          {effectiveR90.toFixed(2)}
                        </div>
                        <div className="text-xs opacity-80">R90</div>
                      </div>
                    </div>
                  </>
                );
              })()}
              
              {/* Match info with black background */}
              <div className="bg-black flex-1 p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                        {report.player_image_url ? (
                          <img src={report.player_image_url} alt={report.player_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {report.report_type === "team" || !report.player_id ? (
                        <span className="text-sm font-medium text-primary">{report.player_name}</span>
                      ) : (
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            setPlayerFilter(report.player_id || "all");
                            setStatusTab("all");
                            setSearchQuery("");
                          }}
                        >
                          {report.player_name}
                        </button>
                      )}
                      {report.visibility_status && report.visibility_status !== "live" && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          report.visibility_status === "draft" 
                            ? "bg-yellow-500/20 text-yellow-400" 
                            : report.visibility_status === "clipped"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {report.visibility_status === "draft" ? <FileEdit className="w-2.5 h-2.5" /> : report.visibility_status === "clipped" ? <FileEdit className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {report.visibility_status === "draft" ? "Draft" : report.visibility_status === "clipped" ? "Clipped" : "Hidden"}
                        </span>
                      )}
                  {report.category === "training" && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400">
                      Training
                    </span>
                  )}
                  {report.category === "highlights" && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary/20 text-primary">
                      Highlights
                    </span>
                  )}
                    </div>
                    <h4 className="text-base md:text-lg font-semibold truncate">
                      {report.category === "highlights"
                        ? (report.notes || "Highlights")
                        : `vs ${report.opponent || "Unknown"}`}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm opacity-90 mt-1">
                      <span>{format(new Date(report.analysis_date), "dd MMM yyyy")}</span>
                      {report.category !== "highlights" && report.result && (
                        <>
                          <span>•</span>
                          <span>{report.result}</span>
                        </>
                      )}
                      {report.category !== "highlights" && report.minutes_played && (
                        <>
                          <span>•</span>
                          <span>{report.minutes_played} min</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onEditReport) {
                          onEditReport(report.player_id || "", report.player_name || "", report.id);
                        } else {
                          setReportEditorAnalysisId(report.id);
                          setReportEditorPlayerId(report.player_id || null);
                          setReportEditorPlayerName(report.player_name || "");
                          setReportEditorInitialType(report.report_type === "team" ? "team" : "player");
                          setShowReportEditor(true);
                        }
                      }}
                      className="h-8 px-2 md:px-3"
                    >
                      <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedReportAnalysisId(report.id);
                        setPerformanceReportDialogOpen(true);
                      }}
                      className="h-8 px-2 md:px-3"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">View</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setClipPlayerReport(report)}
                      className="h-8 px-2 md:px-3"
                      title="Play match clips"
                    >
                      <Play className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Play</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScoreEditReport(report)}
                      className="h-8 px-2 md:px-3"
                      title="Score Edit mode"
                    >
                      <Film className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Score</span>
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Picker Dialog */}
      <Dialog open={showReportTypePicker} onOpenChange={setShowReportTypePicker}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-none sm:max-w-3xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Action Report</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => beginCreateReport('player')}
              className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-primary" />Player report</div>
              <p className="mt-2 text-xs text-muted-foreground">Create a report for one player.</p>
            </button>
            <button
              type="button"
              onClick={() => beginCreateReport('team')}
              className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-primary" />Team report</div>
              <p className="mt-2 text-xs text-muted-foreground">Create a report with a roster and player chips on actions.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlayerPicker} onOpenChange={setShowPlayerPicker}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-none sm:max-w-3xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Select Player for {pendingReportType === 'team' ? 'Team' : 'Player'} Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {players
                .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => {
                      if (onCreateReport) {
                        onCreateReport(player.id, player.name, pendingReportType);
                        setShowPlayerPicker(false);
                        setPlayerSearchQuery("");
                      } else {
                        setReportEditorPlayerId(player.id);
                        setReportEditorPlayerName(player.name);
                        setReportEditorAnalysisId(undefined);
                        setReportEditorInitialType(pendingReportType);
                        setShowPlayerPicker(false);
                        setPlayerSearchQuery("");
                        setShowReportEditor(true);
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center gap-2 transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{player.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Report Editor Dialog */}
      {showReportEditor && (
        <CreatePerformanceReportDialog
          open={showReportEditor}
          onOpenChange={setShowReportEditor}
          playerId={reportEditorPlayerId || undefined}
          playerName={reportEditorPlayerName}
          analysisId={reportEditorAnalysisId}
          initialReportType={reportEditorInitialType}
          onSuccess={() => {
            fetchReports();
            setShowReportEditor(false);
            setReportEditorAnalysisId(undefined);
            setReportEditorPlayerId(null);
          }}
          inline={false}
        />
      )}

      {/* Performance Report View Dialog */}
      {selectedReportAnalysisId && (
        <PerformanceReportDialog
          open={performanceReportDialogOpen}
          onOpenChange={setPerformanceReportDialogOpen}
          analysisId={selectedReportAnalysisId}
        />
      )}

      {/* Match Clip Player */}
      {clipPlayerReport && (
        <MatchClipPlayer
          analysisId={clipPlayerReport.id}
          playerName={clipPlayerReport.player_name || "Unknown"}
          opponent={clipPlayerReport.opponent || "Unknown"}
          onClose={() => setClipPlayerReport(null)}
          playerId={clipPlayerReport.player_id}
        />
      )}

      {/* Score Edit Mode */}
      {scoreEditReport && (
        <ScoreEditMode
          analysisId={scoreEditReport.id}
          playerName={scoreEditReport.player_name || "Unknown"}
          onClose={() => {
            setScoreEditReport(null);
            fetchReports();
          }}
          onSave={() => {
            fetchReports();
          }}
        />
      )}
    </div>
  );
};
