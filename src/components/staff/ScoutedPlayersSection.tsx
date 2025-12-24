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
import { Search, User, FileText, Calendar, Target, ChevronLeft, Plus, UserPlus, Loader2, ExternalLink, Pencil } from "lucide-react";
import { format } from "date-fns";
import { PlayerScoutingManagement } from "./PlayerScoutingManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";

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

export const ScoutedPlayersSection = () => {
  const [players, setPlayers] = useState<ScoutedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutedPlayer | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "reports" | "fixtures" | "scouting">("info");
  const [playerAnalyses, setPlayerAnalyses] = useState<PlayerAnalysis[]>([]);
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
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
                    
                    // R90 color function matching player management
                    const getR90Color = (score: number) => {
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
                    const r90Color = analysis.r90_score !== null && analysis.r90_score !== undefined 
                      ? getR90Color(analysis.r90_score) 
                      : "bg-gray-500";
                    
                    return (
                      <Card 
                        key={analysis.id} 
                        className="hover:border-primary transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                {analysis.opponent ? `vs ${analysis.opponent}` : "Match Analysis"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(analysis.analysis_date), "dd MMM yyyy")}
                                {analysis.minutes_played && ` • ${analysis.minutes_played} mins`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {analysis.r90_score !== null && analysis.r90_score !== undefined && (
                                <div className={`${r90Color} text-white text-sm font-bold px-3 py-1 rounded`}>
                                  R90: {analysis.r90_score.toFixed(2)}
                                </div>
                              )}
                              {analysis.result && (
                                <Badge variant="secondary">{analysis.result}</Badge>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingReportId(analysis.id)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(publicUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open Link
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

            {/* Edit Report Dialog */}
            {editingReportId && (
              <CreatePerformanceReportDialog
                open={!!editingReportId}
                onOpenChange={(open) => !open && setEditingReportId(null)}
                playerId={selectedPlayer.id}
                playerName={selectedPlayer.name}
                analysisId={editingReportId}
                onSuccess={() => {
                  fetchPlayerAnalyses(selectedPlayer.id);
                  setEditingReportId(null);
                }}
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
