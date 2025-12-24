import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, User, FileText, Calendar, Target, ChevronLeft, Eye, Plus, UserPlus, Loader2, Link2, ExternalLink, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { PlayerScoutingManagement } from "./PlayerScoutingManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { createPerformanceReportSlug } from "@/lib/urlHelpers";

interface ScoutedPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  club: string | null;
  club_logo: string | null;
  image_url: string | null;
  bio: string | null;
  category: string | null;
}

interface PlayerAnalysis {
  id: string;
  analysis_date: string;
  opponent: string | null;
  result: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  video_url: string | null;
  performance_overview: string | null;
  player_id?: string;
  player_name?: string;
}

interface AllReportItem {
  id: string;
  type: 'performance' | 'scouting';
  player_name: string;
  player_id?: string;
  date: string;
  opponent?: string | null;
  r90_score?: number | null;
  status?: string;
  position?: string | null;
}

export const ScoutedPlayersSection = () => {
  const [players, setPlayers] = useState<ScoutedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutedPlayer | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "reports" | "fixtures" | "scouting">("info");
  const [playerAnalyses, setPlayerAnalyses] = useState<PlayerAnalysis[]>([]);
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [mainView, setMainView] = useState<"players" | "all-reports">("players");
  const [allReports, setAllReports] = useState<AllReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: "",
    position: "",
    age: "",
    nationality: "",
    club: "",
  });

  useEffect(() => {
    fetchScoutedPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerAnalyses(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (mainView === "all-reports") {
      fetchAllReports();
    }
  }, [mainView]);

  const fetchScoutedPlayers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, age, nationality, club, club_logo, image_url, bio, category")
        .eq("category", "Scouted")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error("Error fetching scouted players:", error);
      toast.error("Failed to load scouted players");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerAnalyses = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("id, analysis_date, opponent, result, r90_score, minutes_played, video_url, performance_overview")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false });

      if (error) throw error;
      setPlayerAnalyses(data || []);
    } catch (error) {
      console.error("Error fetching player analyses:", error);
      setPlayerAnalyses([]);
    }
  };

  const fetchAllReports = async () => {
    setLoadingReports(true);
    try {
      // Fetch performance reports for scouted players
      const { data: performanceData, error: perfError } = await supabase
        .from("player_analysis")
        .select(`
          id, 
          analysis_date, 
          opponent, 
          r90_score,
          player_id,
          players!inner(id, name, category)
        `)
        .eq("players.category", "Scouted")
        .order("analysis_date", { ascending: false });

      if (perfError) throw perfError;

      // Fetch scouting reports
      const { data: scoutingData, error: scoutError } = await supabase
        .from("scouting_reports")
        .select("id, player_name, scouting_date, status, position")
        .order("scouting_date", { ascending: false });

      if (scoutError) throw scoutError;

      // Combine into unified list
      const reports: AllReportItem[] = [];

      (performanceData || []).forEach((item: any) => {
        reports.push({
          id: item.id,
          type: 'performance',
          player_name: item.players?.name || 'Unknown',
          player_id: item.player_id,
          date: item.analysis_date,
          opponent: item.opponent,
          r90_score: item.r90_score,
        });
      });

      (scoutingData || []).forEach((item: any) => {
        reports.push({
          id: item.id,
          type: 'scouting',
          player_name: item.player_name,
          date: item.scouting_date,
          status: item.status,
          position: item.position,
        });
      });

      // Sort by date descending
      reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllReports(reports);
    } catch (error) {
      console.error("Error fetching all reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.nationality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.club?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlayerSelect = (player: ScoutedPlayer) => {
    setSelectedPlayer(player);
    setActiveTab("info");
  };

  const handleBackToList = () => {
    setSelectedPlayer(null);
    setPlayerAnalyses([]);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.name || !newPlayerForm.position || !newPlayerForm.age || !newPlayerForm.nationality) {
      toast.error("Please fill in all required fields");
      return;
    }

    setAddingPlayer(true);
    try {
      const { error } = await supabase.from("players").insert({
        name: newPlayerForm.name,
        position: newPlayerForm.position,
        age: parseInt(newPlayerForm.age),
        nationality: newPlayerForm.nationality,
        club: newPlayerForm.club || null,
        category: "Scouted",
      });

      if (error) throw error;

      toast.success("Player added successfully");
      setIsAddPlayerOpen(false);
      setNewPlayerForm({ name: "", position: "", age: "", nationality: "", club: "" });
      fetchScoutedPlayers();
    } catch (error: any) {
      console.error("Error adding player:", error);
      toast.error("Failed to add player");
    } finally {
      setAddingPlayer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Player Detail View
  if (selectedPlayer) {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={selectedPlayer.image_url || undefined} alt={selectedPlayer.name} />
              <AvatarFallback>{selectedPlayer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{selectedPlayer.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedPlayer.position} • {selectedPlayer.age} years • {selectedPlayer.nationality}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="info" className="gap-1">
              <User className="h-3 w-3" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="fixtures" className="gap-1">
              <Calendar className="h-3 w-3" />
              <span className="hidden sm:inline">Fixtures</span>
            </TabsTrigger>
            <TabsTrigger value="scouting" className="gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline">Scouting</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Player Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedPlayer.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{selectedPlayer.age}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nationality</p>
                    <p className="font-medium">{selectedPlayer.nationality}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Club</p>
                    <div className="flex items-center gap-2">
                      {selectedPlayer.club_logo && (
                        <img src={selectedPlayer.club_logo} alt="" className="h-5 w-5 object-contain" />
                      )}
                      <p className="font-medium">{selectedPlayer.club || "Unknown"}</p>
                    </div>
                  </div>
                </div>
                {selectedPlayer.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="outline">{selectedPlayer.category}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Performance Reports</h3>
                <Button size="sm" onClick={() => setIsCreateReportOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Report
                </Button>
              </div>

              {playerAnalyses.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No performance reports yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {playerAnalyses.map((analysis) => {
                    const publicUrl = analysis.opponent 
                      ? `${window.location.origin}${createPerformanceReportSlug(selectedPlayer.name, analysis.opponent, analysis.id)}`
                      : `${window.location.origin}/performance-report/${analysis.id}`;
                    
                    return (
                      <Card 
                        key={analysis.id} 
                        className="hover:border-primary transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setViewingReportId(analysis.id)}
                            >
                              <p className="font-medium">
                                {analysis.opponent ? `vs ${analysis.opponent}` : "Match Analysis"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(analysis.analysis_date), "dd MMM yyyy")}
                                {analysis.minutes_played && ` • ${analysis.minutes_played} mins`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {analysis.r90_score && (
                                <Badge variant="outline" className="text-lg font-bold">
                                  R90: {analysis.r90_score}
                                </Badge>
                              )}
                              {analysis.result && (
                                <Badge variant="secondary">{analysis.result}</Badge>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(publicUrl);
                                  toast.success("Public link copied to clipboard!");
                                }}
                                title="Copy public link"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(publicUrl, '_blank');
                                }}
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setViewingReportId(analysis.id)}
                                title="View report"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Report Dialog */}
            <CreatePerformanceReportDialog
              open={isCreateReportOpen}
              onOpenChange={setIsCreateReportOpen}
              playerId={selectedPlayer.id}
              playerName={selectedPlayer.name}
              onSuccess={() => {
                fetchPlayerAnalyses(selectedPlayer.id);
                setIsCreateReportOpen(false);
              }}
            />

            {/* View Report Dialog */}
            {viewingReportId && (
              <PerformanceReportDialog
                open={!!viewingReportId}
                onOpenChange={(open) => !open && setViewingReportId(null)}
                analysisId={viewingReportId}
              />
            )}
          </TabsContent>

          {/* Fixtures Tab */}
          <TabsContent value="fixtures" className="mt-4">
            <PlayerFixtures 
              playerId={selectedPlayer.id} 
              playerName={selectedPlayer.name}
              isAdmin={true}
            />
          </TabsContent>

          {/* Scouting Tab */}
          <TabsContent value="scouting" className="mt-4">
            <PlayerScoutingManagement 
              playerId={selectedPlayer.id}
              playerName={selectedPlayer.name}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Players List View
  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button 
          variant={mainView === "players" ? "default" : "ghost"} 
          size="sm"
          onClick={() => setMainView("players")}
        >
          <User className="h-4 w-4 mr-1" />
          Players
        </Button>
        <Button 
          variant={mainView === "all-reports" ? "default" : "ghost"} 
          size="sm"
          onClick={() => setMainView("all-reports")}
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          All Reports
        </Button>
      </div>

      {mainView === "all-reports" ? (
        // All Reports View
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">All Reports</h3>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : allReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reports found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allReports
                .filter(report => 
                  report.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  report.opponent?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((report) => (
                  <Card 
                    key={`${report.type}-${report.id}`}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      if (report.type === 'performance') {
                        setViewingReportId(report.id);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">{report.player_name}</p>
                            <Badge variant={report.type === 'performance' ? 'default' : 'secondary'} className="text-xs">
                              {report.type === 'performance' ? 'Performance' : 'Scouting'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(report.date), "dd MMM yyyy")}
                            {report.type === 'performance' && report.opponent && ` • vs ${report.opponent}`}
                            {report.type === 'scouting' && report.position && ` • ${report.position}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.type === 'performance' && report.r90_score && (
                            <Badge variant="outline" className="font-bold">
                              R90: {report.r90_score}
                            </Badge>
                          )}
                          {report.type === 'scouting' && report.status && (
                            <Badge variant="outline" className="capitalize">
                              {report.status}
                            </Badge>
                          )}
                          {report.type === 'performance' && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      ) : (
        // Players View
        <>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Scouted Players</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setIsAddPlayerOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Add Player
              </Button>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {players.length === 0 
                  ? "No scouted players yet. Click 'Add Player' to add one."
                  : "No players match your search"
                }
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <Card 
                  key={player.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handlePlayerSelect(player)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={player.image_url || undefined} alt={player.name} />
                        <AvatarFallback className="text-sm">
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.position} • {player.age} yrs • {player.nationality}
                        </p>
                        {player.club && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {player.club_logo && (
                              <img src={player.club_logo} alt="" className="h-4 w-4 object-contain" />
                            )}
                            <span className="text-xs text-muted-foreground">{player.club}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* View Report Dialog for All Reports view */}
      {viewingReportId && mainView === "all-reports" && (
        <PerformanceReportDialog
          open={!!viewingReportId}
          onOpenChange={(open) => !open && setViewingReportId(null)}
          analysisId={viewingReportId}
        />
      )}

      {/* Add Player Dialog */}
      <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Scouted Player</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Name *</Label>
              <Input
                id="player-name"
                value={newPlayerForm.name}
                onChange={(e) => setNewPlayerForm({ ...newPlayerForm, name: e.target.value })}
                placeholder="Player name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="player-position">Position *</Label>
                <Input
                  id="player-position"
                  value={newPlayerForm.position}
                  onChange={(e) => setNewPlayerForm({ ...newPlayerForm, position: e.target.value })}
                  placeholder="e.g., Striker"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-age">Age *</Label>
                <Input
                  id="player-age"
                  type="number"
                  value={newPlayerForm.age}
                  onChange={(e) => setNewPlayerForm({ ...newPlayerForm, age: e.target.value })}
                  placeholder="e.g., 22"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-nationality">Nationality *</Label>
              <Input
                id="player-nationality"
                value={newPlayerForm.nationality}
                onChange={(e) => setNewPlayerForm({ ...newPlayerForm, nationality: e.target.value })}
                placeholder="e.g., English"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-club">Current Club</Label>
              <Input
                id="player-club"
                value={newPlayerForm.club}
                onChange={(e) => setNewPlayerForm({ ...newPlayerForm, club: e.target.value })}
                placeholder="e.g., Manchester United"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddPlayerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingPlayer}>
                {addingPlayer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Player
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
