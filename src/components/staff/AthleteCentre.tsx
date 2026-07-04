import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCombobox } from "@/components/staff/PlayerCombobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, Dumbbell, LineChart, Target, Calendar,
  Save, Loader2, ChevronRight, ChevronDown, ClipboardList, BarChart3, Film, Database, Plus, Trash2, GripHorizontal,
  Zap, FileText, Search, Video, Pencil, Layers, Brain
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlayerScoutingReports } from "@/components/PlayerScoutingReports";
import { AnalysisComparisons } from "@/components/portal/AnalysisComparisons";
import { AnalysisVideoReports } from "@/components/portal/AnalysisVideoReports";
import { AnalysisDataTab } from "@/components/portal/AnalysisDataTab";
import { InjuryLog } from "@/components/portal/InjuryLog";
import { PlayerFixtures } from "@/components/staff/PlayerFixtures";
import { PlayerSpqHistory } from "@/components/staff/PlayerSpqHistory";
import { ActionReportsList } from "@/components/staff/analysis/ActionReportsList";
import { CreatePerformanceReportDialog } from "@/components/staff/CreatePerformanceReportDialog";
import { AnalysisManagement } from "@/components/staff/AnalysisManagement";
import { VideoAnalysis } from "@/components/staff/coaching/VideoAnalysis";
import { AnnotationProjects } from "@/components/staff/annotations/AnnotationProjects";
import { HighlightCompiler } from "@/components/staff/HighlightCompiler";
import { AiShellSuggestions } from "@/components/staff/AiShellSuggestions";
import { RecentPlayersBar, getRecentPlayerIds, addRecentPlayer } from "@/components/staff/RecentPlayersBar";
import { SessionResumeBanner, saveSession, clearSession, type SessionState } from "@/components/staff/SessionResumeBanner";
import { AddTestResultDialog } from "@/components/staff/AddTestResultDialog";
import { LongTermVisionEditor } from "@/components/staff/LongTermVisionEditor";
import { OperatingProfileViewer } from "@/components/staff/OperatingProfileViewer";
import { sortPlayersByRepresentation } from "@/lib/playerSorting";

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

const STATUS_ORDER = ['represented', 'mandated', 'fuel_for_football', 'previously_mandated', 'prospect', 'other', 'scouted'];
const STATUS_LABELS: Record<string, string> = {
  represented: 'Represented',
  mandated: 'Mandated',
  fuel_for_football: 'Fuel for Football',
  previously_mandated: 'Previously Mandated',
  prospect: 'Prospect',
  other: 'Other',
  scouted: 'Scouted',
};

interface InlineReportState {
  playerId: string;
  playerName: string;
  analysisId?: string;
  reportType?: 'player' | 'team';
}

// ─── Match Flow Section ──────────────────────────────────────────────────────

const MATCH_FLOW_SECTIONS = [
  { id: "fixtures", label: "Fixtures", icon: Calendar, description: "Manage and create fixtures" },
  { id: "reports", label: "Performance Reports", icon: ClipboardList, description: "Create and review performance reports" },
  { id: "analysis", label: "Analysis", icon: Search, description: "Pre-match and post-match analysis" },
  { id: "videoanalysis", label: "Video Analysis", icon: Video, description: "Review match footage and create clips" },
  { id: "annotations", label: "Annotations", icon: Pencil, description: "Annotate and mark up video" },
  { id: "highlightcompiler", label: "Highlight Compiler", icon: Film, description: "Compile highlight reels" },
];

const MatchFlowTab = ({ selectedPlayer, currentPlayer, initialOpenSections, initialInlineReport, onSessionChange }: { 
  selectedPlayer: string | null; 
  currentPlayer: Player | null;
  initialOpenSections?: Record<string, boolean>;
  initialInlineReport?: InlineReportState | null;
  onSessionChange?: (openSections: Record<string, boolean>, inlineReport: InlineReportState | null) => void;
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialOpenSections || {});
  const [inlineReport, setInlineReport] = useState<InlineReportState | null>(initialInlineReport || null);

  // Notify parent of session changes for persistence
  useEffect(() => {
    onSessionChange?.(openSections, inlineReport);
  }, [openSections, inlineReport]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (inlineReport) {
    return (
      <CreatePerformanceReportDialog
        inline
        playerId={inlineReport.playerId}
        playerName={inlineReport.playerName}
        analysisId={inlineReport.analysisId}
        initialReportType={inlineReport.reportType || 'player'}
        onClose={() => setInlineReport(null)}
        onSuccess={() => setInlineReport(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">
        Work through each stage of match preparation and review without switching tabs.
      </p>

      <AiShellSuggestions
        section="athlete_centre"
        playerId={selectedPlayer}
        playerName={currentPlayer?.name}
        onAccept={(shell) => {
          // Open the reports section with the shell content available
          setOpenSections(prev => ({ ...prev, reports: true }));
        }}
      />

      {MATCH_FLOW_SECTIONS.map((section, idx) => (
        <Collapsible
          key={section.id}
          open={openSections[section.id] ?? false}
          onOpenChange={() => toggleSection(section.id)}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${openSections[section.id] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <section.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                  <span className="font-semibold text-sm">{section.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[section.id] ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pb-1 px-1">
            <div className="border rounded-lg p-3 md:p-4 bg-background">
              {section.id === "fixtures" && selectedPlayer && currentPlayer ? (
                <PlayerFixtures playerId={selectedPlayer} playerName={currentPlayer.name} isAdmin={true} />
              ) : section.id === "fixtures" ? (
                <p className="text-sm text-muted-foreground text-center py-6">Select a player to view fixtures</p>
              ) : null}

              {section.id === "reports" && (
                <ActionReportsList
                  defaultPlayerId={selectedPlayer || undefined}
                  defaultPlayerName={currentPlayer?.name}
                  onCreateReport={(playerId, playerName, reportType) => {
                    setInlineReport({ playerId, playerName, reportType: reportType || 'player' });
                  }}
                  onEditReport={(playerId, playerName, analysisId) => {
                    setInlineReport({ playerId, playerName, analysisId });
                  }}
                />
              )}

              {section.id === "analysis" && (
                <AnalysisManagement isAdmin={true} defaultPlayerId={selectedPlayer || undefined} />
              )}

              {section.id === "videoanalysis" && (
                <VideoAnalysis defaultPlayerId={selectedPlayer || undefined} />
              )}

              {section.id === "annotations" && (
                <AnnotationProjects defaultPlayerId={selectedPlayer || undefined} />
              )}

              {section.id === "highlightcompiler" && (
                <HighlightCompiler defaultPlayerId={selectedPlayer || undefined} />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const AthleteCentre = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState("matchflow");
  const [devTab, setDevTab] = useState("longterm");
  const [loading, setLoading] = useState(true);
  const [resumedSession, setResumedSession] = useState<SessionState | null>(null);
  
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
      .order("name")
      .range(0, 4999);

    if (!error && data) {
      const userId = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
      let filtered = data as Player[];
      if (userId) {
        try {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          const onlyStatsUpdater = (roles || []).length > 0 && (roles || []).every((r: any) => r.role === "stats_updater");
          if (onlyStatsUpdater) {
            const { data: assignments } = await (supabase as any)
              .from("staff_player_assignments")
              .select("player_id")
              .eq("user_id", userId)
              .eq("role_key", "stats_updater");
            const allowed = new Set(((assignments as any[]) || []).map((a: any) => a.player_id));
            filtered = (data as Player[]).filter(p => allowed.has(p.id));
          }
        } catch {/* ignore */}
      }
      const sorted = sortPlayersByRepresentation(filtered);
      setPlayers(sorted);
      if (filtered.length > 0) {
        const savedPlayerId = localStorage.getItem('athleteCentre_lastPlayer');
        const savedPlayer = savedPlayerId ? sorted.find(p => p.id === savedPlayerId) : null;
        if (savedPlayer) {
          setSelectedPlayer(savedPlayer.id);
        } else {
          const firstRepresented = sorted.find(p => p.representation_status === 'represented');
          setSelectedPlayer(firstRepresented?.id || sorted[0].id);
        }
      }
    }
    setLoading(false);
  };

  const groupedPlayers = useMemo(() => {
    const groups: { status: string; label: string; players: Player[] }[] = [];
    
    STATUS_ORDER.forEach(status => {
      const matching = players.filter(p => p.representation_status === status);
      if (matching.length > 0) {
        groups.push({ status, label: STATUS_LABELS[status] || status, players: sortPlayersByRepresentation(matching) });
      }
    });
    
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
      .select("id, analysis_date, opponent, r90_score, minutes_played, result, striker_stats, fixture_stats, visibility_status, placeholder_raw_score, placeholder_minutes, season_final")
      .eq("player_id", playerId)
      .order("analysis_date", { ascending: false });

    setAnalyses(analysesData || []);
    setFocuses("");
    setLongTermPlan("");
  };

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  const recentPlayers = useMemo(() => {
    const ids = getRecentPlayerIds();
    return ids.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
  }, [players, selectedPlayer]);

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

  const devTabItems = [
    { value: "profile", label: "Operating Profile", icon: Brain },
    { value: "longterm", label: "Long-Term Vision", icon: Calendar },
    { value: "periodisation", label: "Periodisation", icon: GripHorizontal },
    { value: "focuses", label: "Dev Focuses", icon: Target },
    { value: "programming", label: "Programming", icon: Dumbbell },
    { value: "testing", label: "Testing", icon: ClipboardList },
    { value: "injuries", label: "Injury Log", icon: ClipboardList },
    { value: "scouting", label: "Scouting", icon: ClipboardList },
    { value: "data", label: "Data", icon: Database },
    { value: "comparisons", label: "Comparisons", icon: BarChart3 },
    { value: "video", label: "Video Reports", icon: Film },
    { value: "analysis", label: "Analysis", icon: LineChart },
    { value: "psychology", label: "Psychology", icon: Brain },
  ];

  const handleSelectPlayer = (val: string) => {
    setSelectedPlayer(val);
    localStorage.setItem('athleteCentre_lastPlayer', val);
    addRecentPlayer(val);
    setResumedSession(null);
  };

  const handleResumeSession = (session: SessionState) => {
    setSelectedPlayer(session.playerId);
    localStorage.setItem('athleteCentre_lastPlayer', session.playerId);
    addRecentPlayer(session.playerId);
    setMainTab(session.mainTab || "matchflow");
    setResumedSession(session);
  };

  // Persist session on meaningful state changes
  const handleMatchFlowSessionChange = (openSections: Record<string, boolean>, inlineReport: InlineReportState | null) => {
    if (!selectedPlayer || !currentPlayer) return;
    saveSession({
      playerId: selectedPlayer,
      playerName: currentPlayer.name,
      mainTab,
      openSections,
      inlineReport: inlineReport ? {
        playerId: inlineReport.playerId,
        playerName: inlineReport.playerName,
        analysisId: inlineReport.analysisId,
        reportType: inlineReport.reportType,
      } : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Resume Banner */}
      <SessionResumeBanner onResume={handleResumeSession} />

      {/* Recent Players */}
      <RecentPlayersBar
        recentPlayers={recentPlayers}
        selectedPlayerId={selectedPlayer}
        onSelect={handleSelectPlayer}
      />

      {/* Player Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <PlayerCombobox
            players={groupedPlayers.flatMap(g => g.players)}
            value={selectedPlayer}
            onChange={handleSelectPlayer}
            placeholder="Select a player..."
            className="w-full"
          />
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
            {/* Main two tabs: Match Flow / Development */}
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <div className="border-b p-2 md:p-3">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none gap-1">
                  <TabsTrigger
                    value="matchflow"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded px-4 py-2 text-sm font-semibold"
                  >
                    <Zap className="h-4 w-4 mr-1.5" />
                    Match Flow
                  </TabsTrigger>
                  <TabsTrigger
                    value="development"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded px-4 py-2 text-sm font-semibold"
                  >
                    <Layers className="h-4 w-4 mr-1.5" />
                    Development
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-3 md:p-6">
                {/* ═══ Match Flow Tab ═══ */}
                <TabsContent value="matchflow" className="mt-0">
                  <MatchFlowTab 
                    selectedPlayer={selectedPlayer} 
                    currentPlayer={currentPlayer}
                    initialOpenSections={resumedSession?.openSections}
                    initialInlineReport={resumedSession?.inlineReport ? {
                      playerId: resumedSession.inlineReport.playerId,
                      playerName: resumedSession.inlineReport.playerName,
                      analysisId: resumedSession.inlineReport.analysisId,
                      reportType: (resumedSession.inlineReport as any).reportType,
                    } : null}
                    onSessionChange={handleMatchFlowSessionChange}
                  />
                </TabsContent>

                {/* ═══ Development Tab ═══ */}
                <TabsContent value="development" className="mt-0">
                  <Tabs value={devTab} onValueChange={setDevTab} className="w-full">
                    <div className="mb-4">
                      <Select value={devTab} onValueChange={setDevTab}>
                        <SelectTrigger className="w-full md:hidden">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {devTabItems.map((tab) => (
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
                        {devTabItems.map((tab) => (
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

                    <TabsContent value="longterm" className="mt-0 space-y-3 md:space-y-4">
                      {selectedPlayer && <LongTermVisionEditor playerId={selectedPlayer} />}
                    </TabsContent>

                    <TabsContent value="profile" className="mt-0 space-y-3 md:space-y-4">
                      {selectedPlayer && <OperatingProfileViewer playerId={selectedPlayer} />}
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

                    <TabsContent value="periodisation" className="mt-0 space-y-4">
                      <PeriodisationPlanner playerId={selectedPlayer} />
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

                    <TabsContent value="testing" className="mt-0 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base md:text-lg font-semibold">Testing Results</h3>
                        <AddTestResultDialog
                          playerId={selectedPlayer}
                          playerName={currentPlayer.name}
                          onSuccess={() => {}}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">Test results are accessible from Player Management and Strength, Power &amp; Speed sections.</p>
                    </TabsContent>

                    <TabsContent value="injuries" className="mt-0">
                      <InjuryLog playerId={selectedPlayer} readOnly />
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

                    <TabsContent value="psychology" className="mt-0 space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="text-base md:text-lg font-semibold">Psychology — SPQ Reports</h3>
                      </div>
                      {selectedPlayer && <PlayerSpqHistory playerId={selectedPlayer} />}
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
                  </Tabs>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Periodisation Planner sub-component
const PHASE_TYPES = [
  { value: "pre-season", label: "Pre-Season", colour: "hsl(220, 70%, 50%)" },
  { value: "in-season", label: "In-Season", colour: "hsl(140, 60%, 40%)" },
  { value: "recovery", label: "Recovery", colour: "hsl(45, 80%, 50%)" },
  { value: "off-season", label: "Off-Season", colour: "hsl(0, 0%, 60%)" },
  { value: "competition", label: "Competition", colour: "hsl(0, 70%, 50%)" },
  { value: "transition", label: "Transition", colour: "hsl(280, 60%, 50%)" },
];

interface Phase {
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  colour: string;
}

const PeriodisationPlanner = ({ playerId }: { playerId: string }) => {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [season, setSeason] = useState("2024/25");
  const [planId, setPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlan();
  }, [playerId, season]);

  const fetchPlan = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("periodisation_plans")
      .select("*")
      .eq("player_id", playerId)
      .eq("season", season)
      .maybeSingle();

    if (data) {
      setPlanId(data.id);
      setPhases((data.phases as any as Phase[]) || []);
    } else {
      setPlanId(null);
      setPhases([]);
    }
    setLoading(false);
  };

  const addPhase = () => {
    setPhases(prev => [...prev, {
      name: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(), "yyyy-MM-dd"),
      type: "pre-season",
      colour: PHASE_TYPES[0].colour,
    }]);
  };

  const updatePhase = (index: number, field: keyof Phase, value: string) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };
      if (field === "type") {
        const pt = PHASE_TYPES.find(t => t.value === value);
        if (pt) updated.colour = pt.colour;
      }
      return updated;
    }));
  };

  const removePhase = (index: number) => {
    setPhases(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    if (planId) {
      await supabase
        .from("periodisation_plans")
        .update({ phases: phases as any })
        .eq("id", planId);
    } else {
      const { data } = await supabase
        .from("periodisation_plans")
        .insert({ player_id: playerId, season, phases: phases as any })
        .select()
        .single();
      if (data) setPlanId(data.id);
    }
    toast.success("Periodisation plan saved");
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">Periodisation Planner</h3>
        <div className="flex items-center gap-2">
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2023/24">2023/24</SelectItem>
              <SelectItem value="2024/25">2024/25</SelectItem>
              <SelectItem value="2025/26">2025/26</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addPhase}>
            <Plus className="h-4 w-4 mr-1" /> Add Phase
          </Button>
        </div>
      </div>

      {phases.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-[600px]">
            {phases.map((phase, idx) => (
              <div
                key={idx}
                className="flex-1 min-w-[80px] rounded-lg p-2 text-center text-xs text-white font-medium"
                style={{ backgroundColor: phase.colour }}
              >
                <div className="truncate">{phase.name || phase.type}</div>
                <div className="opacity-75 text-[10px] mt-0.5">
                  {phase.start_date ? format(new Date(phase.start_date), "dd MMM") : '?'} - {phase.end_date ? format(new Date(phase.end_date), "dd MMM") : '?'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {phases.map((phase, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phase.colour }} />
            <Input
              placeholder="Phase name"
              value={phase.name}
              onChange={e => updatePhase(idx, "name", e.target.value)}
              className="flex-1 min-w-[120px]"
            />
            <Select value={phase.type} onValueChange={v => updatePhase(idx, "type", v)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PHASE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={phase.start_date} onChange={e => updatePhase(idx, "start_date", e.target.value)} className="w-[140px]" />
            <Input type="date" value={phase.end_date} onChange={e => updatePhase(idx, "end_date", e.target.value)} className="w-[140px]" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removePhase(idx)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {phases.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <GripHorizontal className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No phases planned yet. Add a phase to start building the periodisation cycle.</p>
        </div>
      )}

      {phases.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Plan
          </Button>
        </div>
      )}
    </div>
  );
};
