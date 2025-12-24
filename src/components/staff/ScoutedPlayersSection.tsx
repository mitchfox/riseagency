import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, User, FileText, Calendar, Target, ChevronLeft, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { PlayerScoutingManagement } from "./PlayerScoutingManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";

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

  useEffect(() => {
    fetchScoutedPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerAnalyses(selectedPlayer.id);
    }
  }, [selectedPlayer]);

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
                  {playerAnalyses.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setViewingReportId(analysis.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {analysis.opponent ? `vs ${analysis.opponent}` : "Match Analysis"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(analysis.analysis_date), "dd MMM yyyy")}
                              {analysis.minutes_played && ` • ${analysis.minutes_played} mins`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {analysis.r90_score && (
                              <Badge variant="outline" className="text-lg font-bold">
                                R90: {analysis.r90_score}
                              </Badge>
                            )}
                            {analysis.result && (
                              <Badge variant="secondary">{analysis.result}</Badge>
                            )}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Scouted Players</h3>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {players.length === 0 
              ? "No scouted players yet. Add players with 'Scouted' representation status to see them here."
              : "No players match your search"
            }
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <Card 
              key={player.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handlePlayerSelect(player)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.image_url || undefined} alt={player.name} />
                    <AvatarFallback className="text-sm">
                      {player.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {player.position} • {player.age} yrs
                    </p>
                    {player.club && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {player.club_logo && (
                          <img src={player.club_logo} alt="" className="h-4 w-4 object-contain" />
                        )}
                        <span className="text-xs text-muted-foreground truncate">{player.club}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {player.nationality}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
