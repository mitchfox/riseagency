import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, TrendingUp, Edit, Eye, User, FileEdit, EyeOff, Radio } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreatePerformanceReportDialog } from "@/components/staff/CreatePerformanceReportDialog";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";

interface ActionReport {
  id: string;
  analysis_date: string;
  opponent: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  result: string | null;
  player_id: string;
  player_name?: string;
  player_image_url?: string;
  visibility_status?: string;
  placeholder_raw_score?: number | null;
  placeholder_minutes?: number | null;
}

interface ActionReportsListProps {
  onCreateReport?: (playerId: string, playerName: string) => void;
  onEditReport?: (playerId: string, playerName: string, analysisId: string) => void;
  defaultPlayerId?: string;
  defaultPlayerName?: string;
}

export const ActionReportsList = ({ onCreateReport, onEditReport, defaultPlayerId, defaultPlayerName }: ActionReportsListProps = {}) => {
  const [reports, setReports] = useState<ActionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState(defaultPlayerId || "all");
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  
  // Dialog states
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [reportEditorPlayerId, setReportEditorPlayerId] = useState<string | null>(null);
  const [reportEditorPlayerName, setReportEditorPlayerName] = useState<string>("");
  const [reportEditorAnalysisId, setReportEditorAnalysisId] = useState<string | undefined>(undefined);
  const [selectedReportAnalysisId, setSelectedReportAnalysisId] = useState<string | null>(null);
  const [performanceReportDialogOpen, setPerformanceReportDialogOpen] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  useEffect(() => {
    fetchReports();
    fetchPlayers();
  }, []);

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
    
    setPlayers(data || []);
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
          visibility_status,
          placeholder_raw_score,
          placeholder_minutes,
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
        player_name: report.players?.name || "Unknown Player",
        player_image_url: report.players?.image_url || null,
        visibility_status: report.visibility_status || "draft",
        placeholder_raw_score: report.placeholder_raw_score,
        placeholder_minutes: report.placeholder_minutes,
      }));

      setReports(formattedReports);
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
    return matchesSearch && matchesPlayer;
  });

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
        <Button onClick={() => {
          if (defaultPlayerId && defaultPlayerName) {
            if (onCreateReport) {
              onCreateReport(defaultPlayerId, defaultPlayerName);
            } else {
              setReportEditorPlayerId(defaultPlayerId);
              setReportEditorPlayerName(defaultPlayerName);
              setReportEditorAnalysisId(undefined);
              setShowReportEditor(true);
            }
          } else {
            setShowPlayerPicker(true);
          }
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Action Report
        </Button>
      </div>

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
            <div
              key={report.id}
              className="rounded-lg overflow-hidden text-white flex flex-col md:flex-row md:items-stretch"
            >
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
                      <span className="text-sm font-medium text-primary">{report.player_name}</span>
                      {report.visibility_status && report.visibility_status !== "live" && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          report.visibility_status === "draft" 
                            ? "bg-yellow-500/20 text-yellow-400" 
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {report.visibility_status === "draft" ? <FileEdit className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {report.visibility_status === "draft" ? "Draft" : "Hidden"}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base md:text-lg font-semibold truncate">vs {report.opponent || "Unknown"}</h4>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm opacity-90 mt-1">
                      <span>{format(new Date(report.analysis_date), "dd MMM yyyy")}</span>
                      {report.result && (
                        <>
                          <span>•</span>
                          <span>{report.result}</span>
                        </>
                      )}
                      {report.minutes_played && (
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
                          onEditReport(report.player_id, report.player_name || "", report.id);
                        } else {
                          setReportEditorAnalysisId(report.id);
                          setReportEditorPlayerId(report.player_id);
                          setReportEditorPlayerName(report.player_name || "");
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Picker Dialog */}
      <Dialog open={showPlayerPicker} onOpenChange={setShowPlayerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Player</DialogTitle>
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
                        onCreateReport(player.id, player.name);
                        setShowPlayerPicker(false);
                        setPlayerSearchQuery("");
                      } else {
                        setReportEditorPlayerId(player.id);
                        setReportEditorPlayerName(player.name);
                        setReportEditorAnalysisId(undefined);
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
    </div>
  );
};
