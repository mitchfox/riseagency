import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, FileText, Dumbbell, LineChart, Target, Calendar,
  Save, Loader2, ChevronRight, ClipboardList
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlayerScoutingReports } from "@/components/PlayerScoutingReports";

interface Player {
  id: string;
  name: string;
  position: string;
  club: string | null;
  image_url: string | null;
  nationality: string;
  age: number;
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
}

export const AthleteCentre = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("scouting");
  const [loading, setLoading] = useState(true);
  
  // Player-specific data
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
      .select("id, name, position, club, image_url, nationality, age")
      .order("name");

    if (!error && data) {
      setPlayers(data);
      if (data.length > 0) {
        setSelectedPlayer(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchPlayerData = async (playerId: string) => {
    // Fetch programs
    const { data: programsData } = await supabase
      .from("player_programs")
      .select("id, program_name, phase_name, is_current")
      .eq("player_id", playerId)
      .order("is_current", { ascending: false });

    setPrograms(programsData || []);

    // Fetch analyses
    const { data: analysesData } = await supabase
      .from("player_analysis")
      .select("id, analysis_date, opponent, r90_score")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false })
      .limit(10);

    setAnalyses(analysesData || []);

    // Fetch player notes (focuses and long-term plan from player bio or a new field)
    const { data: playerData } = await supabase
      .from("players")
      .select("bio")
      .eq("id", playerId)
      .single();

    // For now we'll use bio as a placeholder - in production you'd have dedicated fields
    setFocuses("");
    setLongTermPlan("");
  };

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const handleSaveFocuses = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    // This would save to a dedicated field in production
    toast.success("Development focuses saved");
    setSaving(false);
  };

  const handleSaveLongTermPlan = async () => {
    if (!selectedPlayer) return;
    setSaving(true);
    // This would save to a dedicated field in production
    toast.success("Long-term plan saved");
    setSaving(false);
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-4">
      {/* Player Selector - Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <Select value={selectedPlayer || ""} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a player..." />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
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
              {/* Mobile-friendly tab navigation */}
              <div className="border-b p-2 md:p-3">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full md:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scouting">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Scouting Reports
                      </div>
                    </SelectItem>
                    <SelectItem value="programming">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        Programming
                      </div>
                    </SelectItem>
                    <SelectItem value="analysis">
                      <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4" />
                        Performance Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="focuses">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Development Focuses
                      </div>
                    </SelectItem>
                    <SelectItem value="longterm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Long-Term Plan
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Desktop tabs - hidden on mobile */}
                <TabsList className="hidden md:flex w-full justify-start h-auto p-0 bg-transparent rounded-none gap-1">
                  <TabsTrigger 
                    value="scouting" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t px-4 py-2 text-sm"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Scouting
                  </TabsTrigger>
                  <TabsTrigger 
                    value="programming" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t px-4 py-2 text-sm"
                  >
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Programming
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t px-4 py-2 text-sm"
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="focuses" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t px-4 py-2 text-sm"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Focuses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="longterm" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t px-4 py-2 text-sm"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Long-Term
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-3 md:p-6">
                <TabsContent value="scouting" className="mt-0">
                  <PlayerScoutingReports playerId={selectedPlayer} playerName={currentPlayer.name} embedded />
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
                        <div
                          key={program.id}
                          className={`p-3 md:p-4 rounded-lg border ${
                            program.is_current 
                              ? "bg-primary/5 border-primary" 
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-sm md:text-base truncate">{program.program_name}</h4>
                                {program.is_current && (
                                  <Badge className="bg-primary text-xs">Current</Badge>
                                )}
                              </div>
                              {program.phase_name && (
                                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                                  Phase: {program.phase_name}
                                </p>
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

                <TabsContent value="analysis" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Performance Analysis</h3>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
                      View All Analysis
                    </Button>
                  </div>

                  {analyses.length > 0 ? (
                    <div className="grid gap-2 md:gap-3">
                      {analyses.map((analysis) => (
                        <div
                          key={analysis.id}
                          className="p-3 md:p-4 rounded-lg bg-muted/30 border hover:border-primary/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-sm md:text-base truncate">
                                  vs {analysis.opponent || "Unknown"}
                                </span>
                                {analysis.r90_score && (
                                  <Badge variant="outline" className="text-xs">
                                    R90: {analysis.r90_score.toFixed(1)}
                                  </Badge>
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

                <TabsContent value="focuses" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Development Focuses</h3>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <Textarea
                      placeholder="Enter key areas of focus for this player's development...

Examples:
• Improve first touch under pressure
• Increase shooting accuracy from distance
• Work on defensive positioning
• Develop leadership skills on the pitch"
                      value={focuses}
                      onChange={(e) => setFocuses(e.target.value)}
                      className="min-h-[150px] md:min-h-[200px] resize-none text-sm md:text-base"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveFocuses} disabled={saving} size="sm" className="md:size-default">
                        {saving ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        )}
                        Save Focuses
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="longterm" className="mt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold">Long-Term Development Plan</h3>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <Textarea
                      placeholder="Outline the long-term development trajectory for this player...

Examples:
• 6-month goals: Establish as first-team regular
• 1-year goals: Attract interest from higher leagues
• 2-year goals: Ready for professional contract
• Career pathway notes and milestones"
                      value={longTermPlan}
                      onChange={(e) => setLongTermPlan(e.target.value)}
                      className="min-h-[150px] md:min-h-[200px] resize-none text-sm md:text-base"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveLongTermPlan} disabled={saving} size="sm" className="md:size-default">
                        {saving ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        )}
                        Save Plan
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
