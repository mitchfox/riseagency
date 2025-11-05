import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit, FileText, LineChart, Video, Calendar, Plus, DollarSign, User } from "lucide-react";
import { PerformanceActionsDialog } from "./PerformanceActionsDialog";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { ProgrammingManagement } from "./ProgrammingManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
  visible_on_stars_page: boolean;
  highlights: any;
  category: string;
  representation_status: string;
  club: string | null;
  club_logo: string | null;
  links?: any;
}

interface PlayerStats {
  id: string;
  player_id: string;
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
  clean_sheets: number | null;
  saves: number | null;
}

const PlayerManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerAnalyses, setPlayerAnalyses] = useState<Record<string, any[]>>({});
  const [playerInvoices, setPlayerInvoices] = useState<Record<string, any[]>>({});
  const [isPerformanceActionsDialogOpen, setIsPerformanceActionsDialogOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [isCreateReportDialogOpen, setIsCreateReportDialogOpen] = useState(false);
  const [createReportPlayerId, setCreateReportPlayerId] = useState<string>("");
  const [createReportPlayerName, setCreateReportPlayerName] = useState<string>("");
  const [editReportAnalysisId, setEditReportAnalysisId] = useState<string | undefined>(undefined);
  const [isProgrammingDialogOpen, setIsProgrammingDialogOpen] = useState(false);
  const [selectedProgrammingPlayerId, setSelectedProgrammingPlayerId] = useState<string>("");
  const [selectedProgrammingPlayerName, setSelectedProgrammingPlayerName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    club: "",
  });

  useEffect(() => {
    fetchPlayers();
    fetchAllAnalyses();
    fetchAllInvoices();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (playersError) throw playersError;

      const { data: statsData, error: statsError } = await supabase
        .from("player_stats")
        .select("*");

      if (statsError) throw statsError;

      setPlayers(playersData || []);
      
      const statsMap: Record<string, PlayerStats> = {};
      statsData?.forEach(stat => {
        statsMap[stat.player_id] = stat;
      });
      setStats(statsMap);
    } catch (error: any) {
      toast.error("Failed to fetch players: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("*")
        .order("analysis_date", { ascending: false });

      if (error) throw error;

      const analysesMap: Record<string, any[]> = {};
      data?.forEach(analysis => {
        if (!analysesMap[analysis.player_id]) {
          analysesMap[analysis.player_id] = [];
        }
        analysesMap[analysis.player_id].push(analysis);
      });
      setPlayerAnalyses(analysesMap);
    } catch (error: any) {
      toast.error("Failed to fetch analyses: " + error.message);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      const invoicesMap: Record<string, any[]> = {};
      data?.forEach(invoice => {
        if (!invoicesMap[invoice.player_id]) {
          invoicesMap[invoice.player_id] = [];
        }
        invoicesMap[invoice.player_id].push(invoice);
      });
      setPlayerInvoices(invoicesMap);
    } catch (error: any) {
      toast.error("Failed to fetch invoices: " + error.message);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      email: player.email || "",
      position: player.position,
      club: player.club || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      const { error } = await supabase
        .from("players")
        .update({
          name: formData.name,
          email: formData.email || null,
          position: formData.position,
          club: formData.club || null,
        })
        .eq("id", editingPlayer.id);

      if (error) throw error;

      toast.success("Player updated successfully");
      setIsEditDialogOpen(false);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to update player: " + error.message);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedPlayerStats = selectedPlayerId ? stats[selectedPlayerId] : null;

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading players...</div>;
  }

  return (
    <div className="flex h-full gap-4">
      {/* Inner Player Sidebar */}
      <div className="w-20 flex flex-col gap-2 overflow-y-auto border-r pr-2">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`relative group transition-all ${
              selectedPlayerId === player.id 
                ? 'opacity-100 ring-2 ring-primary' 
                : 'opacity-40 hover:opacity-70'
            }`}
            title={player.name}
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={player.image_url || undefined} alt={player.name} />
              <AvatarFallback className="text-xs">{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPlayerId ? (
          // Preview Cards Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => {
              const playerStats = stats[player.id];
              return (
                <Card 
                  key={player.id} 
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={player.image_url || undefined} alt={player.name} />
                        <AvatarFallback>{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">{player.position}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{player.age}y</span>
                          <span>•</span>
                          <span>{player.nationality}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {player.club && (
                      <div className="flex items-center gap-2 text-sm mb-3">
                        {player.club_logo && (
                          <img src={player.club_logo} alt="" className="w-5 h-5 object-contain" />
                        )}
                        <span className="text-muted-foreground">{player.club}</span>
                      </div>
                    )}
                    {playerStats && (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="font-semibold text-lg">{playerStats.goals}</div>
                          <div className="text-muted-foreground">Goals</div>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{playerStats.assists}</div>
                          <div className="text-muted-foreground">Assists</div>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{playerStats.matches}</div>
                          <div className="text-muted-foreground">Matches</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Player Detail View
          <div className="space-y-6">
            {/* Player Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={selectedPlayer?.image_url || undefined} alt={selectedPlayer?.name} />
                      <AvatarFallback className="text-2xl">
                        {selectedPlayer?.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-3xl font-bold">{selectedPlayer?.name}</h2>
                      <p className="text-muted-foreground text-lg">{selectedPlayer?.position}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                        <span>{selectedPlayer?.age} years</span>
                        <span>•</span>
                        <span>{selectedPlayer?.nationality}</span>
                        {selectedPlayer?.club && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              {selectedPlayer.club_logo && (
                                <img src={selectedPlayer.club_logo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span>{selectedPlayer.club}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditPlayer(selectedPlayer!)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPlayerId(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {selectedPlayerStats && (
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="text-3xl font-bold text-primary">{selectedPlayerStats.goals}</div>
                      <div className="text-sm text-muted-foreground mt-1">Goals</div>
                    </div>
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="text-3xl font-bold text-primary">{selectedPlayerStats.assists}</div>
                      <div className="text-sm text-muted-foreground mt-1">Assists</div>
                    </div>
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="text-3xl font-bold text-primary">{selectedPlayerStats.matches}</div>
                      <div className="text-sm text-muted-foreground mt-1">Matches</div>
                    </div>
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="text-3xl font-bold text-primary">{selectedPlayerStats.minutes}</div>
                      <div className="text-sm text-muted-foreground mt-1">Minutes</div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Tabbed Sections */}
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="analysis">
                  <LineChart className="w-4 h-4 mr-2" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="programming">
                  <FileText className="w-4 h-4 mr-2" />
                  Programming
                </TabsTrigger>
                <TabsTrigger value="highlights">
                  <Video className="w-4 h-4 mr-2" />
                  Highlights
                </TabsTrigger>
                <TabsTrigger value="fixtures">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fixtures
                </TabsTrigger>
                <TabsTrigger value="invoices">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Invoices
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Performance Analysis</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCreateReportPlayerId(selectedPlayerId!);
                          setCreateReportPlayerName(selectedPlayer!.name);
                          setIsCreateReportDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {playerAnalyses[selectedPlayerId]?.length > 0 ? (
                      <div className="space-y-3">
                        {playerAnalyses[selectedPlayerId].map((analysis) => (
                          <div
                            key={analysis.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                          >
                            <div>
                              <h4 className="font-medium">{analysis.opponent}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>{new Date(analysis.analysis_date).toLocaleDateString()}</span>
                                {analysis.result && (
                                  <>
                                    <span>•</span>
                                    <span>{analysis.result}</span>
                                  </>
                                )}
                                {analysis.r90_score && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium text-primary">R90: {analysis.r90_score}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAnalysisId(analysis.id);
                                setSelectedPlayerName(selectedPlayer!.name);
                                setIsPerformanceActionsDialogOpen(true);
                              }}
                            >
                              View Actions
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No performance reports yet. Create one to get started.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="programming">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Training Programs</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProgrammingPlayerId(selectedPlayerId!);
                          setSelectedProgrammingPlayerName(selectedPlayer!.name);
                          setIsProgrammingDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Manage Programs
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                      Click "Manage Programs" to view and edit training programs for this player.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="highlights">
                <Card>
                  <CardHeader>
                    <CardTitle>Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPlayer?.highlights ? (
                      <div className="space-y-4">
                        {(() => {
                          try {
                            const highlights = typeof selectedPlayer.highlights === 'string'
                              ? JSON.parse(selectedPlayer.highlights)
                              : selectedPlayer.highlights;
                            
                            const matchHighlights = highlights.matchHighlights || [];
                            const bestClips = highlights.bestClips || [];

                            return (
                              <>
                                {matchHighlights.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Match Highlights</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      {matchHighlights.map((highlight: any, idx: number) => (
                                        <div key={idx} className="border rounded-lg p-3">
                                          <video 
                                            src={highlight.videoUrl}
                                            controls
                                            className="w-full h-32 object-cover rounded mb-2"
                                          />
                                          <p className="text-sm font-medium">{highlight.name}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {bestClips.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Best Clips</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      {bestClips.map((clip: any, idx: number) => (
                                        <div key={idx} className="border rounded-lg p-3">
                                          <video 
                                            src={clip.videoUrl}
                                            controls
                                            className="w-full h-32 object-cover rounded mb-2"
                                          />
                                          <p className="text-sm font-medium">{clip.name}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          } catch (e) {
                            return <p className="text-center text-muted-foreground">No highlights available</p>;
                          }
                        })()}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No highlights uploaded yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures">
                <Card>
                  <CardHeader>
                    <CardTitle>Fixtures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlayerFixtures 
                      playerId={selectedPlayerId!} 
                      playerName={selectedPlayer!.name}
                      isAdmin={isAdmin} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {playerInvoices[selectedPlayerId]?.length > 0 ? (
                      <div className="space-y-3">
                        {playerInvoices[selectedPlayerId].map((invoice) => (
                          <div key={invoice.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">Invoice #{invoice.invoice_number}</h4>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    invoice.status === 'paid' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : invoice.status === 'overdue'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  }`}>
                                    {invoice.status}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(invoice.invoice_date).toLocaleDateString()} - Due: {new Date(invoice.due_date).toLocaleDateString()}
                                </p>
                                <p className="text-lg font-semibold mt-2">
                                  {invoice.currency} {invoice.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No invoices yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PerformanceActionsDialog
        open={isPerformanceActionsDialogOpen}
        onOpenChange={setIsPerformanceActionsDialogOpen}
        analysisId={selectedAnalysisId || ""}
        playerName={selectedPlayerName}
        isAdmin={isAdmin}
      />

      <CreatePerformanceReportDialog
        open={isCreateReportDialogOpen}
        onOpenChange={(open) => {
          setIsCreateReportDialogOpen(open);
          if (!open) {
            setEditReportAnalysisId(undefined);
          }
        }}
        playerId={createReportPlayerId}
        playerName={createReportPlayerName}
        analysisId={editReportAnalysisId}
        onSuccess={() => {
          fetchAllAnalyses();
          toast.success(`Performance report ${editReportAnalysisId ? 'updated' : 'created'} successfully`);
          setEditReportAnalysisId(undefined);
        }}
      />

      <ProgrammingManagement
        isOpen={isProgrammingDialogOpen}
        onClose={() => setIsProgrammingDialogOpen(false)}
        playerId={selectedProgrammingPlayerId}
        playerName={selectedProgrammingPlayerName}
        isAdmin={isAdmin}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePlayer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="club">Club</Label>
              <Input
                id="club"
                value={formData.club}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
              />
            </div>
            <Button type="submit">Update Player</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;
