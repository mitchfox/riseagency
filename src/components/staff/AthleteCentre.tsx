import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Dumbbell, LineChart, Target, Calendar,
  Save, Loader2, ChevronRight, ClipboardList, BarChart3, Film, Database
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlayerScoutingReports } from "@/components/PlayerScoutingReports";
import { AnalysisComparisons } from "@/components/portal/AnalysisComparisons";
import { AnalysisVideoReports } from "@/components/portal/AnalysisVideoReports";
import { AnalysisDataTab } from "@/components/portal/AnalysisDataTab";

interface Player {
  id: string;
  name: string;
  position: string;
  club: string | null;
  image_url: string | null;
  nationality: string;
  age: number;
  representation_status?: string;
}

interface PlayerProgram {
  id: string;
  program_name: string;
  phase_name: string | null;
  is_current: boolean;
}

interface PlayerAnalysis {
  id: string;
  analysis_date: string;
  opponent: string | null;
  r90_score: number | null;
  minutes_played: number | null;
  result: string | null;
  striker_stats?: any;
  fixture_stats?: any;
}

const STATUS_ORDER = ['represented', 'mandated', 'previously_mandated', 'fuel_for_football', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  previously_mandated: 'Previously Mandated',
  fuel_for_football: 'Fuel for Football',
  other: 'Other',
  scouted: 'Scouted',
};

export const AthleteCentre = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("longterm");
  const [loading, setLoading] = useState(true);
  
  const [programs, setPrograms] = useState<PlayerProgram[]>([]);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [focuses, setFocuses] = useState("");
  const [longTermPlan, setLongTermPlan] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerData(selectedPlayer);
    }
  }, [selectedPlayer]);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, position, club, image_url, nationality, age, representation_status")
      .order("name");

    if (!error && data) {
      setPlayers(data);
      if (data.length > 0) {
        // Default to first represented player, or first player
        const firstRepresented = data.find(p => p.representation_status === 'represented');
        setSelectedPlayer(firstRepresented?.id || data[0].id);
      }
    }
    setLoading(false);
  };

  // Group players by representation_status in correct order
  const groupedPlayers = useMemo(() => {
    const groups: { status: string; label: string; players: Player[] }[] = [];
    
    STATUS_ORDER.forEach(status => {
      const matching = players.filter(p => p.representation_status === status);
      if (matching.length > 0) {
        groups.push({ status, label: STATUS_LABELS[status] || status, players: matching });
      }
    });
    
    // Catch any players with no/unknown status
    const uncategorised = players.filter(p => !p.representation_status || !STATUS_ORDER.includes(p.representation_status));
    if (uncategorised.length > 0) {
      groups.push({ status: 'uncategorised', label: 'Uncategorised', players: uncategorised });
    }
    
    return groups;
  }, [players]);

  const fetchPlayerData = async (playerId: string) => {
    const { data: programsData } = await supabase
      .from("player_programs")
      .select("id, program_name, phase_name, is_current")
      .eq("player_id", playerId)
      .order("is_current", { ascending: false });

    setPrograms(programsData || []);

    const { data: analysesData } = await supabase
      .from("player_analysis")
      .select("id, analysis_date, opponent, r90_score, minutes_played, result, striker_stats, fixture_stats")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false });

    setAnalyses(analysesData || []);
    setFocuses("");
    setLongTermPlan("");
  };

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const handleSaveFocuses = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    toast.success("Development focuses saved");
    setSaving(false);
  };

  const handleSaveLongTermPlan = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    toast.success("Long-term plan saved");
    setSaving(false);
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  const tabItems = [
    { value: "longterm", label: "Long-Term Plan", icon: Calendar },
    { value: "focuses", label: "Dev Focuses", icon: Target },
    { value: "programming", label: "Programming", icon: Dumbbell },
    { value: "scouting", label: "Scouting", icon: ClipboardList },
    { value: "data", label: "Data", icon: Database },
    { value: "comparisons", label: "Comparisons", icon: BarChart3 },
    { value: "video", label: "Video Reports", icon: Film },
    { value: "analysis", label: "Analysis", icon: LineChart },
  ];

  return (
    <div className="space-y-4">
      {/* Player Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <Select value={selectedPlayer || ""} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a player..." />
            </SelectTrigger>
            <SelectContent>
              {groupedPlayers.map((group) => (
                <div key={group.status}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </div>
                  {group.players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          {player.image_url ? (
                            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <span>{player.name}</span>
                        <span className="text-muted-foreground text-xs">({player.position})</span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {players.length} players in database
        </p>
      </div>

      {selectedPlayer && currentPlayer && (
        <Card className="border-2">
          <CardHeader className="border-b bg-muted/30 p-3 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-primary shrink-0">
                {currentPlayer.image_url ? (
                  <img src={currentPlayer.image_url} alt={currentPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg md:text-xl truncate">{currentPlayer.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{currentPlayer.position}</Badge>
                  <Badge variant="secondary" className="text-xs">{currentPlayer.age} yrs</Badge>
                  {currentPlayer.club && (
                    <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{currentPlayer.club}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b p-2 md:p-3">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full md:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tabItems.map((tab) => (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          <tab.icon className="h-4 w-4" />
                          {tab.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <TabsList className="hidden md:flex w-full justify-start h-auto p-0 bg-transparent rounded-none gap-1 flex-wrap">
                  {tabItems.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value} 
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t px-3 py-2 text-sm"
                    >
                      <tab.icon className="h-4 w-4 mr-1.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-3 md:p-6">
                <TabsContent value="longterm" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Long-Term Development Plan</h3>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <Textarea
                      placeholder="Outline the long-term development trajectory for this player..."
                      value={longTermPlan}
                      onChange={(e) => setLongTermPlan(e.target.value)}
                      className="min-h-[150px] md:min-h-[200px] resize-none text-sm md:text-base"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveLongTermPlan} disabled={saving} size="sm">
                        {saving ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" /> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-2" />}
                        Save Plan
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="focuses" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Development Focuses</h3>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <Textarea
                      placeholder="Enter key areas of focus for this player's development..."
                      value={focuses}
                      onChange={(e) => setFocuses(e.target.value)}
                      className="min-h-[150px] md:min-h-[200px] resize-none text-sm md:text-base"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveFocuses} disabled={saving} size="sm">
                        {saving ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" /> : <Save className="h-3 w-3 md:h-4 md:w-4 mr-2" />}
                        Save Focuses
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="programming" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Training Programs</h3>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
                      View All Programs
                    </Button>
                  </div>
                  
                  {programs.length > 0 ? (
                    <div className="grid gap-3 md:gap-4">
                      {programs.map((program) => (
                        <div key={program.id} className={`p-3 md:p-4 rounded-lg border ${program.is_current ? "bg-primary/5 border-primary" : "bg-muted/30"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-sm md:text-base truncate">{program.program_name}</h4>
                                {program.is_current && <Badge className="bg-primary text-xs">Current</Badge>}
                              </div>
                              {program.phase_name && (
                                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">Phase: {program.phase_name}</p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-8 text-muted-foreground">
                      <Dumbbell className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                      <p className="text-sm md:text-base">No programs assigned yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scouting" className="mt-0">
                  <PlayerScoutingReports playerId={selectedPlayer} playerName={currentPlayer.name} embedded />
                </TabsContent>

                <TabsContent value="data" className="mt-0">
                  <AnalysisDataTab analyses={analyses} playerData={currentPlayer} embedded />
                </TabsContent>

                <TabsContent value="comparisons" className="mt-0">
                  <AnalysisComparisons analyses={analyses} playerData={currentPlayer} embedded />
                </TabsContent>

                <TabsContent value="video" className="mt-0">
                  <AnalysisVideoReports analyses={analyses} playerId={selectedPlayer} embedded />
                </TabsContent>

                <TabsContent value="analysis" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Performance Analysis</h3>
                  </div>
                  {analyses.length > 0 ? (
                    <div className="grid gap-2 md:gap-3">
                      {analyses.map((analysis) => (
                        <div key={analysis.id} className="p-3 md:p-4 rounded-lg bg-muted/30 border hover:border-primary/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-sm md:text-base truncate">vs {analysis.opponent || "Unknown"}</span>
                                {analysis.r90_score && (
                                  <Badge variant="outline" className="text-xs">R90: {analysis.r90_score.toFixed(1)}</Badge>
                                )}
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                                {format(new Date(analysis.analysis_date), "MMM dd, yyyy")}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-8 text-muted-foreground">
                      <LineChart className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                      <p className="text-sm md:text-base">No analysis reports yet</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
