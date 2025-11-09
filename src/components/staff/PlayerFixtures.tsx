import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlayerFixturesProps {
  playerId: string;
  playerName: string;
  onCreateAnalysis?: (fixtureId: string) => void;
  onViewReport?: (analysisId: string, playerName: string) => void;
  triggerOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  isAdmin?: boolean;
}

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  competition: string | null;
  venue: string | null;
}

interface PlayerFixture {
  id: string;
  fixture_id: string;
  minutes_played: number | null;
  fixtures: Fixture;
}

interface PlayerAnalysis {
  id: string;
  r90_score: number | null;
  fixture_id: string | null;
  opponent: string | null;
  result: string | null;
  pdf_url: string | null;
  video_url: string | null;
  analysis_date?: string;
  minutes_played?: number | null;
  analysis_writer_id?: string | null;
}

interface OpponentData {
  opponent: string;
  result: string;
}

export const PlayerFixtures = ({ playerId, playerName, onCreateAnalysis, onViewReport, triggerOpen, onDialogOpenChange, isAdmin }: PlayerFixturesProps) => {
  const navigate = useNavigate();
  const [playerFixtures, setPlayerFixtures] = useState<PlayerFixture[]>([]);
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState<number | null>(null);
  const [editingPlayerFixture, setEditingPlayerFixture] = useState<PlayerFixture | null>(null);
  const [playerTeam, setPlayerTeam] = useState<string>("");
  const [r90Scores, setR90Scores] = useState<Map<string, number>>(new Map());
  const [opponentData, setOpponentData] = useState<Map<string, OpponentData>>(new Map());
  const [analysisData, setAnalysisData] = useState<Map<string, PlayerAnalysis>>(new Map());
  const [editingAnalysis, setEditingAnalysis] = useState<any | null>(null);
  const [editGameData, setEditGameData] = useState({
    opponent: "",
    result: "",
    match_date: "",
    minutes_played: "",
    notes: "",
    r90_score: "",
    striker_shots: "",
    striker_touches: "",
    striker_duels_won: "",
    striker_successful_dribbles: "",
    pdf_file: null as File | null,
    video_file: null as File | null,
    performance_report_file: null as File | null,
    analysis_writer_id: "" as string,
  });
  const [availableAnalyses, setAvailableAnalyses] = useState<any[]>([]);
  const [manualFixture, setManualFixture] = useState({
    home_team: "",
    away_team: "",
    home_score: null as number | null,
    away_score: null as number | null,
    match_date: "",
    competition: "",
    venue: "",
  });
  const [aiFixtures, setAiFixtures] = useState<any[]>([]);
  const [fetchingAiFixtures, setFetchingAiFixtures] = useState(false);
  const [selectedAiFixtures, setSelectedAiFixtures] = useState<Set<number>>(new Set());
  const [aiRawResponse, setAiRawResponse] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedFixtures, setSelectedFixtures] = useState<Set<string>>(new Set());
  const [unlinkedAnalyses, setUnlinkedAnalyses] = useState<PlayerAnalysis[]>([]);

  useEffect(() => {
    if (triggerOpen) {
      handleOpenDialog();
      onDialogOpenChange?.(false);
    }
  }, [triggerOpen]);

  useEffect(() => {
    fetchPlayerTeam();
    fetchPlayerFixtures();
    fetchAllFixtures();
    fetchAvailableAnalyses();
  }, [playerId]);

  const fetchPlayerTeam = async () => {
    try {
      const { data: playerData } = await supabase
        .from("players")
        .select("club")
        .eq("id", playerId)
        .single();

      if (playerData?.club) {
        setPlayerTeam(playerData.club);
      }
    } catch (error) {
      console.error("Error fetching player team:", error);
    }
  };

  const fetchPlayerFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("player_fixtures")
        .select(`
          *,
          fixtures(*)
        `)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Sort by fixture date descending (newest first)
      const sortedData = (data as any[])?.sort((a, b) => {
        const dateA = new Date(a.fixtures.match_date).getTime();
        const dateB = new Date(b.fixtures.match_date).getTime();
        return dateB - dateA; // Newest first
      }) || [];
      
      setPlayerFixtures(sortedData);

      // Fetch ALL analyses for this player (including those without fixture_id)
      const { data: fetchedAnalysisData } = await supabase
        .from("player_analysis")
        .select("id, fixture_id, r90_score, opponent, result, pdf_url, video_url, analysis_date, minutes_played, analysis_writer_id")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false });

      if (fetchedAnalysisData) {
        const r90Map = new Map<string, number>();
        const opponentMap = new Map<string, OpponentData>();
        const analysisMap = new Map<string, PlayerAnalysis>();
        
        fetchedAnalysisData.forEach((analysis: any) => {
          // For analyses with fixture_id, use fixture_id as key
          if (analysis.fixture_id) {
            if (analysis.r90_score !== null) {
              r90Map.set(analysis.fixture_id, analysis.r90_score);
            }
            if (analysis.opponent) {
              opponentMap.set(analysis.fixture_id, {
                opponent: analysis.opponent,
                result: analysis.result || ""
              });
            }
            analysisMap.set(analysis.fixture_id, analysis);
          } else {
            // For analyses without fixture_id, use analysis id as key
            if (analysis.r90_score !== null) {
              r90Map.set(analysis.id, analysis.r90_score);
            }
            if (analysis.opponent) {
              opponentMap.set(analysis.id, {
                opponent: analysis.opponent,
                result: analysis.result || ""
              });
            }
            analysisMap.set(analysis.id, analysis);
          }
        });
        
        setR90Scores(r90Map);
        setOpponentData(opponentMap);
        setAnalysisData(analysisMap);
        
        // Store unlinked analyses separately
        const unlinkedAnalyses = fetchedAnalysisData.filter((a: any) => !a.fixture_id);
        setUnlinkedAnalyses(unlinkedAnalyses);
      }
    } catch (error: any) {
      console.error("Error fetching player fixtures:", error);
      toast.error("Failed to fetch fixtures");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: false });

      if (error) throw error;
      setAllFixtures(data || []);
    } catch (error: any) {
      console.error("Error fetching fixtures:", error);
    }
  };

  const fetchAvailableAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, analysis_type")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailableAnalyses(data || []);
    } catch (error: any) {
      console.error("Error fetching analyses:", error);
    }
  };

  const handleOpenDialog = async (playerFixture?: PlayerFixture) => {
    try {
      if (playerFixture) {
        setEditingPlayerFixture(playerFixture);
        setSelectedFixtureId(playerFixture.fixture_id);
        setMinutesPlayed(playerFixture.minutes_played);
        
        // Fetch existing analysis for this fixture
        const { data: analysisData, error: analysisError } = await supabase
          .from("player_analysis")
          .select("*")
          .eq("player_id", playerId)
          .eq("fixture_id", playerFixture.fixture_id)
          .maybeSingle();
        
        if (analysisError) {
          console.error("Error fetching analysis:", analysisError);
        }
        
        setEditingAnalysis(analysisData);
        
        // Determine opponent - "For" is a placeholder for player's team
        let opponentName = "";
        if (playerFixture.fixtures.home_team === "For" || playerFixture.fixtures.home_team.toLowerCase().includes("for")) {
          opponentName = playerFixture.fixtures.away_team;
        } else if (playerFixture.fixtures.away_team === "For" || playerFixture.fixtures.away_team.toLowerCase().includes("for")) {
          opponentName = playerFixture.fixtures.home_team;
        } else if (playerTeam) {
          const isHomeTeam = playerFixture.fixtures.home_team.toLowerCase().includes(playerTeam.toLowerCase());
          opponentName = isHomeTeam ? playerFixture.fixtures.away_team : playerFixture.fixtures.home_team;
        }
        
        setEditGameData({
          opponent: analysisData?.opponent || opponentName,
          result: analysisData?.result || "",
          match_date: playerFixture.fixtures.match_date,
          minutes_played: playerFixture.minutes_played?.toString() || "",
          notes: analysisData?.notes || "",
          r90_score: analysisData?.r90_score?.toString() || "",
          striker_shots: (analysisData?.striker_stats as any)?.shots?.toString() || "",
          striker_touches: (analysisData?.striker_stats as any)?.touches?.toString() || "",
          striker_duels_won: (analysisData?.striker_stats as any)?.duels_won?.toString() || "",
          striker_successful_dribbles: (analysisData?.striker_stats as any)?.successful_dribbles?.toString() || "",
          pdf_file: null,
          video_file: null,
          performance_report_file: null,
          analysis_writer_id: analysisData?.analysis_writer_id || "",
        });
      } else {
        setEditingPlayerFixture(null);
        setSelectedFixtureId("");
        setMinutesPlayed(null);
        setEditingAnalysis(null);
        setEditGameData({
          opponent: "",
          result: "",
          match_date: "",
          minutes_played: "",
          notes: "",
          r90_score: "",
          striker_shots: "",
          striker_touches: "",
          striker_duels_won: "",
          striker_successful_dribbles: "",
          pdf_file: null,
          video_file: null,
          performance_report_file: null,
          analysis_writer_id: "",
        });
        setManualFixture({
          home_team: "",
          away_team: "",
          home_score: null,
          away_score: null,
          match_date: "",
          competition: "",
          venue: "",
        });
        setAiFixtures([]);
        setSelectedAiFixtures(new Set());
      }
      setDialogOpen(true);
    } catch (error: any) {
      console.error("Error opening dialog:", error);
      toast.error("Failed to load fixture data");
    }
  };

  const fetchAiFixtures = async (teamName: string) => {
    setFetchingAiFixtures(true);
    setAiRawResponse("");
    try {
      // Get player details to find team name
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("bio")
        .eq("id", playerId)
        .single();

      if (playerError) throw playerError;

      let currentClub = teamName;
      if (playerData?.bio) {
        try {
          const bioData = JSON.parse(playerData.bio);
          currentClub = bioData.currentClub || teamName;
        } catch (e) {
          // Use provided team name
        }
      }

      console.log("Fetching fixtures for:", currentClub);

      // Call edge function to fetch fixtures
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-team-fixtures`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            teamName: currentClub,
            playerTeam: currentClub // Also pass as playerTeam for clarity
          }),
        }
      );

      const data = await response.json();
      console.log("Received data:", data);
      
      // Store raw response for debugging
      if (data.rawResponse) {
        setAiRawResponse(data.rawResponse);
      }
      
      setAiFixtures(data.fixtures || []);
      
      if (data.fixtures?.length === 0) {
        toast.info(
          data.rawResponse 
            ? "No fixtures parsed. Check the 'AI Response' tab to see what was found." 
            : "No fixtures generated for this team"
        );
      } else {
        toast.success(`Generated ${data.fixtures.length} fixtures for ${currentClub}`);
      }
    } catch (error: any) {
      console.error("Error fetching AI fixtures:", error);
      const errorMsg = error.message || "Unknown error occurred";
      toast.error(`Error: ${errorMsg}. Check console for details.`);
      setAiRawResponse(`Error: ${errorMsg}`);
    } finally {
      setFetchingAiFixtures(false);
    }
  };

  const handleSaveManualFixture = async () => {
    try {
      // Validate required fields
      if (!manualFixture.home_team || !manualFixture.away_team || !manualFixture.match_date) {
        toast.error("Please fill in Home Team, Away Team, and Match Date");
        return;
      }

      console.log("Creating fixture:", manualFixture);

      // First create the fixture
      const { data: newFixture, error: fixtureError } = await supabase
        .from("fixtures")
        .insert([manualFixture])
        .select()
        .single();

      if (fixtureError) {
        console.error("Fixture error:", fixtureError);
        throw fixtureError;
      }

      console.log("Fixture created:", newFixture);

      // Then link it to the player
      const { error: linkError } = await supabase
        .from("player_fixtures")
        .insert([
          {
            player_id: playerId,
            fixture_id: newFixture.id,
            minutes_played: minutesPlayed,
          },
        ]);

      if (linkError) {
        console.error("Link error:", linkError);
        throw linkError;
      }

      toast.success("Fixture created and added successfully");
      handleCloseDialog();
      fetchPlayerFixtures();
      fetchAllFixtures();
    } catch (error: any) {
      console.error("Save manual fixture error:", error);
      toast.error(`Failed to save fixture: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveAiFixtures = async () => {
    try {
      const fixturesToAdd = Array.from(selectedAiFixtures).map(
        (index) => aiFixtures[index]
      );

      for (const fixture of fixturesToAdd) {
        // Create fixture in database
        const { data: newFixture, error: fixtureError } = await supabase
          .from("fixtures")
          .insert([
            {
              home_team: fixture.home_team,
              away_team: fixture.away_team,
              match_date: fixture.match_date,
              competition: fixture.competition,
              venue: fixture.venue,
              home_score: fixture.home_score ?? null,
              away_score: fixture.away_score ?? null,
            },
          ])
          .select()
          .single();

        if (fixtureError) throw fixtureError;

        // Link to player with minutes played
        const { error: linkError } = await supabase.from("player_fixtures").insert([
          {
            player_id: playerId,
            fixture_id: newFixture.id,
            minutes_played: fixture.minutes_played ?? null,
          },
        ]);

        if (linkError) throw linkError;
      }

      toast.success(`Added ${fixturesToAdd.length} fixtures successfully`);
      handleCloseDialog();
      fetchPlayerFixtures();
      fetchAllFixtures();
    } catch (error: any) {
      toast.error("Failed to save fixtures");
      console.error(error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlayerFixture(null);
    setSelectedFixtureId("");
    setMinutesPlayed(null);
  };

  const handleSaveEditGame = async () => {
    try {
      if (!editingPlayerFixture) return;

      const minutesValue = editGameData.minutes_played ? parseInt(editGameData.minutes_played) : null;

      // Update player_fixtures minutes
      const { error: fixtureError } = await supabase
        .from("player_fixtures")
        .update({
          minutes_played: minutesValue,
        })
        .eq("id", editingPlayerFixture.id);

      if (fixtureError) throw fixtureError;

      // Upload files if provided
      let pdfUrl = editingAnalysis?.pdf_url || null;
      let videoUrl = editingAnalysis?.video_url || null;

      if (editGameData.pdf_file) {
        const pdfPath = `${playerId}/${Date.now()}_${editGameData.pdf_file.name}`;
        const { error: pdfError } = await supabase.storage
          .from("analysis-files")
          .upload(pdfPath, editGameData.pdf_file);
        
        if (!pdfError) {
          const { data: { publicUrl } } = supabase.storage
            .from("analysis-files")
            .getPublicUrl(pdfPath);
          pdfUrl = publicUrl;
        }
      }

      if (editGameData.video_file) {
        const videoPath = `${playerId}/${Date.now()}_${editGameData.video_file.name}`;
        const { error: videoError } = await supabase.storage
          .from("analysis-files")
          .upload(videoPath, editGameData.video_file);
        
        if (!videoError) {
          const { data: { publicUrl } } = supabase.storage
            .from("analysis-files")
            .getPublicUrl(videoPath);
          videoUrl = publicUrl;
        }
      }

      // Create or update player_analysis
      const strikerStats = {
        shots: editGameData.striker_shots ? parseInt(editGameData.striker_shots) : null,
        touches: editGameData.striker_touches ? parseInt(editGameData.striker_touches) : null,
        duels_won: editGameData.striker_duels_won ? parseInt(editGameData.striker_duels_won) : null,
        successful_dribbles: editGameData.striker_successful_dribbles ? parseInt(editGameData.striker_successful_dribbles) : null,
      };

      const analysisPayload = {
        player_id: playerId,
        fixture_id: editingPlayerFixture.fixture_id,
        analysis_date: editGameData.match_date,
        opponent: editGameData.opponent,
        result: editGameData.result,
        minutes_played: minutesValue,
        notes: editGameData.notes,
        r90_score: editGameData.r90_score ? parseFloat(editGameData.r90_score) : null,
        striker_stats: strikerStats,
        pdf_url: pdfUrl,
        video_url: videoUrl,
        analysis_writer_id: editGameData.analysis_writer_id || null,
      };

      let analysisId = editingAnalysis?.id;

      if (editingAnalysis) {
        // Update existing analysis
        const { error: analysisError } = await supabase
          .from("player_analysis")
          .update(analysisPayload)
          .eq("id", editingAnalysis.id);

        if (analysisError) throw analysisError;
      } else {
        // Create new analysis
        const { data: newAnalysis, error: analysisError } = await supabase
          .from("player_analysis")
          .insert([analysisPayload])
          .select()
          .single();

        if (analysisError) throw analysisError;
        analysisId = newAnalysis.id;
      }

      // Handle performance report upload and processing
      if (editGameData.performance_report_file && analysisId) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target?.result;
            if (typeof content === 'string') {
              // Call edge function to process the performance report
              const { data, error } = await supabase.functions.invoke('import-program-csv', {
                body: {
                  playerId: playerId,
                  analysisId: analysisId,
                  csvContent: content,
                }
              });

              if (error) {
                console.error("Error processing performance report:", error);
                toast.error("Performance report uploaded but processing failed");
              } else {
                toast.success("Performance report processed successfully");
              }
            }
          } catch (error) {
            console.error("Error reading performance report:", error);
          }
        };
        reader.readAsText(editGameData.performance_report_file);
      }

      toast.success("Game updated successfully");
      handleCloseDialog();
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to update game");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this fixture?")) return;

    try {
      const { error } = await supabase
        .from("player_fixtures")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }
      
      toast.success("Fixture removed successfully");
      handleCloseDialog();
      fetchPlayerFixtures();
    } catch (error: any) {
      console.error("Failed to remove fixture:", error);
      toast.error(`Failed to remove fixture: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFixtures.size === 0) {
      toast.error("Please select fixtures to delete");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${selectedFixtures.size} fixture(s)?`)) return;

    try {
      const { error } = await supabase
        .from("player_fixtures")
        .delete()
        .in("id", Array.from(selectedFixtures));

      if (error) throw error;
      toast.success(`Removed ${selectedFixtures.size} fixture(s)`);
      setSelectedFixtures(new Set());
      fetchPlayerFixtures();
    } catch (error: any) {
      toast.error("Failed to remove fixtures");
      console.error(error);
    }
  };

  const toggleSelectAll = () => {
    const visibleFixtures = playerFixtures.slice(0, displayCount);
    if (selectedFixtures.size === visibleFixtures.length && visibleFixtures.length > 0) {
      setSelectedFixtures(new Set());
    } else {
      setSelectedFixtures(new Set(visibleFixtures.map(f => f.id)));
    }
  };

  const toggleFixtureSelection = (fixtureId: string) => {
    const newSelected = new Set(selectedFixtures);
    if (newSelected.has(fixtureId)) {
      newSelected.delete(fixtureId);
    } else {
      newSelected.add(fixtureId);
    }
    setSelectedFixtures(newSelected);
  };

  if (loading) {
    return <div>Loading fixtures...</div>;
  }

  return (
    <div className="space-y-4">
      <button 
        data-trigger-add-fixture 
        onClick={() => handleOpenDialog()} 
        style={{ display: 'none' }}
      />
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {editingPlayerFixture ? "Edit" : "Add"} Fixture
              </DialogTitle>
              {editingPlayerFixture && isAdmin && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (editingPlayerFixture) {
                      handleDelete(editingPlayerFixture.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Fixture
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
          {editingPlayerFixture ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_opponent" className="text-base font-semibold">Who is the opponent? *</Label>
                <Input
                  id="edit_opponent"
                  value={editGameData.opponent}
                  onChange={(e) => setEditGameData({ ...editGameData, opponent: e.target.value })}
                  placeholder="Enter opponent team name"
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_result">Result *</Label>
                  <Input
                    id="edit_result"
                    placeholder="e.g., 4-2 (W)"
                    value={editGameData.result}
                    onChange={(e) => setEditGameData({ ...editGameData, result: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_minutes">Minutes Played</Label>
                  <Input
                    id="edit_minutes"
                    type="number"
                    value={editGameData.minutes_played}
                    onChange={(e) => setEditGameData({ ...editGameData, minutes_played: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_date">Date *</Label>
                <Input
                  id="edit_date"
                  type="date"
                  value={editGameData.match_date}
                  onChange={(e) => setEditGameData({ ...editGameData, match_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_notes">Notes / Comments</Label>
                <Textarea
                  id="edit_notes"
                  value={editGameData.notes}
                  onChange={(e) => setEditGameData({ ...editGameData, notes: e.target.value })}
                  rows={3}
                  placeholder="e.g., Strong match performance with excellent positioning"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Performance Report Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_r90">R90 Score</Label>
                    <Input
                      id="edit_r90"
                      type="number"
                      step="0.01"
                      value={editGameData.r90_score}
                      onChange={(e) => setEditGameData({ ...editGameData, r90_score: e.target.value })}
                      placeholder="e.g., 1.45"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank or upload CSV to auto-calculate
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="edit_striker_shots">Striker: Shots</Label>
                    <Input
                      id="edit_striker_shots"
                      type="number"
                      value={editGameData.striker_shots}
                      onChange={(e) => setEditGameData({ ...editGameData, striker_shots: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_striker_touches">Striker: Touches</Label>
                    <Input
                      id="edit_striker_touches"
                      type="number"
                      value={editGameData.striker_touches}
                      onChange={(e) => setEditGameData({ ...editGameData, striker_touches: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_striker_duels">Striker: Duels Won</Label>
                    <Input
                      id="edit_striker_duels"
                      type="number"
                      value={editGameData.striker_duels_won}
                      onChange={(e) => setEditGameData({ ...editGameData, striker_duels_won: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_striker_dribbles">Striker: Successful Dribbles</Label>
                    <Input
                      id="edit_striker_dribbles"
                      type="number"
                      value={editGameData.striker_successful_dribbles}
                      onChange={(e) => setEditGameData({ ...editGameData, striker_successful_dribbles: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit_performance_report">Upload Performance Report (Excel/CSV)</Label>
                <Input
                  id="edit_performance_report"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setEditGameData({ ...editGameData, performance_report_file: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Upload match performance data and AI will automatically calculate R90 score and generate performance report
                </p>
              </div>

              <div>
                <Label htmlFor="edit_analysis_writer">Link to Analysis Writer (Optional)</Label>
                <Select
                  value={editGameData.analysis_writer_id || "none"}
                  onValueChange={(value) => setEditGameData({ ...editGameData, analysis_writer_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="edit_analysis_writer">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableAnalyses.map((analysis) => (
                      <SelectItem key={analysis.id} value={analysis.id}>
                        {analysis.title} ({analysis.analysis_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Link this performance report to a detailed analysis from Analysis Writer
                </p>
              </div>

              <div>
                <Label htmlFor="edit_pdf">PDF Report</Label>
                <Input
                  id="edit_pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditGameData({ ...editGameData, pdf_file: e.target.files?.[0] || null })}
                />
                {editingAnalysis?.pdf_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current PDF: <a href={editingAnalysis.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit_video">Video Analysis</Label>
                <Input
                  id="edit_video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setEditGameData({ ...editGameData, video_file: e.target.files?.[0] || null })}
                />
                {editingAnalysis?.video_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current Video: <a href={editingAnalysis.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditGame}>Update Game</Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="ai">AI Fetch</TabsTrigger>
                <TabsTrigger value="ai-response">AI Response</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Who is the opponent?</Label>
                  <Input
                    value={manualFixture.away_team}
                    onChange={(e) =>
                      setManualFixture({ 
                        ...manualFixture, 
                        home_team: playerTeam || "For",
                        away_team: e.target.value 
                      })
                    }
                    placeholder="Enter opponent team name"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Just enter the opponent's name - we'll handle the rest
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Home Score (Optional)</Label>
                    <Input
                      type="number"
                      value={manualFixture.home_score ?? ""}
                      onChange={(e) =>
                        setManualFixture({
                          ...manualFixture,
                          home_score: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Away Score (Optional)</Label>
                    <Input
                      type="number"
                      value={manualFixture.away_score ?? ""}
                      onChange={(e) =>
                        setManualFixture({
                          ...manualFixture,
                          away_score: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Match Date</Label>
                  <Input
                    type="date"
                    value={manualFixture.match_date}
                    onChange={(e) =>
                      setManualFixture({ ...manualFixture, match_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Minutes Played (Optional)</Label>
                  <Input
                    type="number"
                    value={minutesPlayed || ""}
                    onChange={(e) =>
                      setMinutesPlayed(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Leave blank if not yet played"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveManualFixture}>Create & Add Fixture</Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an image/screenshot of the fixture list and AI will extract the matches
                  </p>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setUploadedImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                      id="fixture-image-upload"
                    />
                    <label htmlFor="fixture-image-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-muted-foreground">
                          Click to upload fixture list image
                        </div>
                        <div className="text-xs text-muted-foreground">
                          PNG, JPG, or screenshot
                        </div>
                      </div>
                    </label>
                  </div>

                  {uploadedImage && (
                    <>
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded fixture list" 
                          className="max-h-64 w-full object-contain border rounded"
                        />
                      </div>
                      
                      <Button
                        onClick={async () => {
                          setProcessingImage(true);
                          setAiFixtures([]);
                          setAiRawResponse("");
                          
                          try {
                            // Get player's current club from bio
                            const { data: playerData } = await supabase
                              .from("players")
                              .select("bio, name")
                              .eq("id", playerId)
                              .single();

                            let playerTeam = playerName;
                            if (playerData?.bio) {
                              try {
                                const bioData = JSON.parse(playerData.bio);
                                playerTeam = bioData.currentClub || playerName;
                              } catch (e) {
                                // Use player name as fallback
                              }
                            }

                            const response = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-fixtures-from-image`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                                },
                                body: JSON.stringify({ 
                                  image: uploadedImage,
                                  teamName: playerTeam,
                                  playerName: playerData?.name || playerName
                                }),
                              }
                            );

                            const data = await response.json();
                            console.log("Received data from image processing:", data);
                            
                            if (data.rawResponse) {
                              setAiRawResponse(data.rawResponse);
                            }
                            
                            if (data.fixtures && data.fixtures.length > 0) {
                              setAiFixtures(data.fixtures);
                              toast.success(`Extracted ${data.fixtures.length} fixtures from image`);
                            } else {
                              toast.info("No fixtures found. Check the 'AI Response' tab to see what was extracted.");
                            }
                          } catch (error: any) {
                            console.error("Error processing image:", error);
                            toast.error(`Error: ${error.message || "Failed to process image"}`);
                            setAiRawResponse(`Error: ${error.message}`);
                          } finally {
                            setProcessingImage(false);
                          }
                        }}
                        disabled={processingImage}
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {processingImage ? "Processing Image..." : "Extract Fixtures from Image"}
                      </Button>
                    </>
                  )}

                  {aiFixtures.length > 0 && (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {aiFixtures.map((fixture, index) => (
                          <Card
                            key={index}
                            className={`cursor-pointer transition-colors ${
                              selectedAiFixtures.has(index)
                                ? "border-primary bg-primary/5"
                                : ""
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedAiFixtures);
                              if (newSelected.has(index)) {
                                newSelected.delete(index);
                              } else {
                                newSelected.add(index);
                              }
                              setSelectedAiFixtures(newSelected);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {fixture.home_team} vs {fixture.away_team}
                                    {(fixture.home_score !== null && fixture.away_score !== null) && (
                                      <span className="text-primary ml-2">
                                        {fixture.home_score}-{fixture.away_score}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(fixture.match_date).toLocaleDateString()}
                                    {fixture.competition && ` • ${fixture.competition}`}
                                    {fixture.minutes_played && ` • ${fixture.minutes_played} min`}
                                  </div>
                                </div>
                                {selectedAiFixtures.has(index) && (
                                  <div className="text-primary">✓</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={handleCloseDialog}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveAiFixtures}
                          disabled={selectedAiFixtures.size === 0}
                        >
                          Add Selected ({selectedAiFixtures.size})
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Fetch upcoming fixtures for {playerName}'s team using AI
                  </p>
                  <Button
                    onClick={() => fetchAiFixtures(playerName)}
                    disabled={fetchingAiFixtures}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {fetchingAiFixtures ? "Fetching..." : "Fetch Upcoming Fixtures"}
                  </Button>

                  {aiFixtures.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {aiFixtures.map((fixture, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-colors ${
                            selectedAiFixtures.has(index)
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                          onClick={() => {
                            const newSelected = new Set(selectedAiFixtures);
                            if (newSelected.has(index)) {
                              newSelected.delete(index);
                            } else {
                              newSelected.add(index);
                            }
                            setSelectedAiFixtures(newSelected);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {fixture.home_team} vs {fixture.away_team}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(fixture.match_date).toLocaleDateString()} •{" "}
                                  {fixture.competition}
                                </div>
                              </div>
                              {selectedAiFixtures.has(index) && (
                                <div className="text-primary">✓</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {aiFixtures.length > 0 && (
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveAiFixtures}
                        disabled={selectedAiFixtures.size === 0}
                      >
                        Add Selected ({selectedAiFixtures.size})
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai-response" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Raw AI response for debugging (shows what the AI generated)
                  </p>
                  {aiRawResponse ? (
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-xs whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-muted p-4 rounded">
                          {aiRawResponse}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No AI response yet. Use the "AI Fetch" tab to generate fixtures.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          </div>
        </DialogContent>
      </Dialog>

        <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={playerFixtures.slice(0, displayCount).length > 0 && selectedFixtures.size === playerFixtures.slice(0, displayCount).length}
              onChange={toggleSelectAll}
              className="cursor-pointer h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">
              Select All
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && selectedFixtures.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Remove Fixtures ({selectedFixtures.size})</span>
                <span className="sm:hidden">Remove ({selectedFixtures.size})</span>
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => handleOpenDialog()} className="h-8 px-2 sm:px-3 text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Fixture</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {playerFixtures.slice(0, displayCount).map((pf) => {
            // Replace "For" with actual player team name for display
            const displayHomeTeam = (pf.fixtures.home_team === "For" || pf.fixtures.home_team.toLowerCase() === "for") 
              ? (playerTeam || "TBD") 
              : pf.fixtures.home_team;
            const displayAwayTeam = (pf.fixtures.away_team === "For" || pf.fixtures.away_team.toLowerCase() === "for") 
              ? (playerTeam || "TBD") 
              : pf.fixtures.away_team;

            // First try to get opponent from analysis data
            const analysisInfo = opponentData.get(pf.fixture_id);
            let opponent = analysisInfo?.opponent || "";
            let result = analysisInfo?.result || "";
            
            // If no analysis data, determine opponent from fixture
            if (!opponent) {
              const homeTeam = pf.fixtures.home_team;
              const awayTeam = pf.fixtures.away_team;
              
              // "For" is a placeholder - the OTHER team is the opponent
              if (homeTeam === "For" || homeTeam.toLowerCase() === "for") {
                opponent = awayTeam;
              } else if (awayTeam === "For" || awayTeam.toLowerCase() === "for") {
                opponent = homeTeam;
              } else if (playerTeam && playerTeam.trim()) {
                // Match against player's actual team (case-insensitive, trimmed)
                const normalizedPlayerTeam = playerTeam.toLowerCase().trim();
                const normalizedHomeTeam = homeTeam.toLowerCase().trim();
                const normalizedAwayTeam = awayTeam.toLowerCase().trim();
                
                // Check for exact match first
                if (normalizedHomeTeam === normalizedPlayerTeam) {
                  opponent = awayTeam;
                } else if (normalizedAwayTeam === normalizedPlayerTeam) {
                  opponent = homeTeam;
                } else {
                  // Check for partial match (team name contains player's club)
                  const homeContainsPlayer = normalizedHomeTeam.includes(normalizedPlayerTeam);
                  const awayContainsPlayer = normalizedAwayTeam.includes(normalizedPlayerTeam);
                  
                  if (homeContainsPlayer && !awayContainsPlayer) {
                    opponent = awayTeam;
                  } else if (awayContainsPlayer && !homeContainsPlayer) {
                    opponent = homeTeam;
                  } else {
                    // Can't determine clearly, show both teams
                    opponent = `${homeTeam} vs ${awayTeam}`;
                  }
                }
              } else {
                // No player team set, show both teams
                opponent = `${homeTeam} vs ${awayTeam}`;
              }
            }
              
            // Determine result from score if available
            const hasScore = pf.fixtures.home_score !== null && pf.fixtures.away_score !== null;
            if (hasScore && !result) {
              const isPlayerHome = pf.fixtures.home_team === "For" || 
                                  pf.fixtures.home_team.toLowerCase() === "for" ||
                                  (playerTeam && playerTeam.trim() && pf.fixtures.home_team.toLowerCase().includes(playerTeam.toLowerCase()));
              
              if (isPlayerHome) {
                if (pf.fixtures.home_score! > pf.fixtures.away_score!) result = "(W)";
                else if (pf.fixtures.home_score! < pf.fixtures.away_score!) result = "(L)";
                else result = "(D)";
              } else {
                if (pf.fixtures.away_score! > pf.fixtures.home_score!) result = "(W)";
                else if (pf.fixtures.away_score! < pf.fixtures.home_score!) result = "(L)";
                else result = "(D)";
              }
            }

            const r90Score = r90Scores.get(pf.fixture_id);
            const getR90Color = (score: number) => {
              if (score < 0) return "bg-red-950"; // Dark red for negative
              if (score >= 0 && score < 0.2) return "bg-red-600"; // Red
              if (score >= 0.2 && score < 0.4) return "bg-red-400"; // Light red
              if (score >= 0.4 && score < 0.6) return "bg-orange-700"; // Orange-brown
              if (score >= 0.6 && score < 0.8) return "bg-orange-500"; // Yellow-orange
              if (score >= 0.8 && score < 1.0) return "bg-yellow-400"; // Yellow
              if (score >= 1.0 && score < 1.4) return "bg-lime-400"; // Light Green
              if (score >= 1.4 && score < 1.8) return "bg-green-500"; // Green
              if (score >= 1.8 && score < 2.5) return "bg-green-700"; // Dark green
              return "bg-gold"; // RISE gold for 2.5+
            };
            const r90Color = r90Score ? getR90Color(r90Score) : "bg-gray-500";

            return (
              <div 
                key={pf.id} 
                className="border rounded-lg p-2 sm:p-3 hover:border-primary transition-colors cursor-pointer"
                onClick={(e) => {
                  // Don't trigger if clicking checkbox or buttons
                  if ((e.target as HTMLElement).tagName !== 'INPUT' && 
                      (e.target as HTMLElement).tagName !== 'BUTTON' &&
                      !(e.target as HTMLElement).closest('button')) {
                    handleOpenDialog(pf);
                  }
                }}
              >
                {/* Mobile Layout */}
                <div className="flex md:hidden flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFixtures.has(pf.id)}
                      onChange={() => toggleFixtureSelection(pf.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer h-4 w-4 flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(pf.fixtures.match_date).toLocaleDateString('en-GB')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {opponent.includes(" vs ") ? opponent : `vs ${opponent}`}
                      </span>
                      {result && (
                        <span className="text-xs text-muted-foreground">
                          {result}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {pf.minutes_played !== null && pf.minutes_played !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {pf.minutes_played} min
                      </span>
                    )}
                    
                    {r90Score !== undefined && (
                      <div className={`${r90Color} text-white text-xs font-bold px-2 py-1 rounded`}>
                        R90: {r90Score.toFixed(2)}
                      </div>
                    )}
                    
                    {r90Score !== undefined && analysisData.has(pf.fixture_id) && onViewReport && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis) {
                            onViewReport(analysis.id, playerName);
                          }
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.analysis_writer_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.analysis_writer_id) {
                            navigate(`/analysis/${analysis.analysis_writer_id}`);
                          }
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.pdf_url) {
                            window.open(analysis.pdf_url, '_blank');
                          }
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        📄
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.video_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.video_url) {
                            window.open(analysis.video_url, '_blank');
                          }
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        📹
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(pf);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden md:flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFixtures.has(pf.id)}
                    onChange={() => toggleFixtureSelection(pf.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer h-4 w-4"
                  />
                  
                  <span className="text-sm text-muted-foreground min-w-[80px]">
                    {new Date(pf.fixtures.match_date).toLocaleDateString('en-GB')}
                  </span>
                
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">
                      {opponent.includes(" vs ") ? opponent : `vs ${opponent}`}
                    </span>
                    {result && (
                      <span className="text-xs text-muted-foreground">
                        {result}
                      </span>
                    )}
                  </div>
                  
                  {pf.minutes_played !== null && pf.minutes_played !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {pf.minutes_played} min
                    </span>
                  )}
                  
                  {r90Score !== undefined && (
                    <div className={`${r90Color} text-white text-sm font-bold px-3 py-1 rounded`}>
                      R90: {r90Score.toFixed(2)}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {r90Score !== undefined && analysisData.has(pf.fixture_id) && onViewReport && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis) {
                            onViewReport(analysis.id, playerName);
                          }
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Report
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.analysis_writer_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.analysis_writer_id) {
                            navigate(`/analysis/${analysis.analysis_writer_id}`);
                          }
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Analysis
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.pdf_url) {
                            window.open(analysis.pdf_url, '_blank');
                          }
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    )}
                    {analysisData.has(pf.fixture_id) && analysisData.get(pf.fixture_id)?.video_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = analysisData.get(pf.fixture_id);
                          if (analysis?.video_url) {
                            window.open(analysis.video_url, '_blank');
                          }
                        }}
                      >
                        📹 Video
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(pf);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {playerFixtures.length > displayCount && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setDisplayCount(prev => prev + 10)}
            >
              Show More
            </Button>
          )}
        </div>

        {/* Unlinked Performance Reports Section */}
        {unlinkedAnalyses.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Performance Reports (Not Linked to Fixtures)</h3>
            <div className="space-y-2">
              {unlinkedAnalyses.map((analysis) => {
                const r90Score = analysis.r90_score;
                let r90Color = "bg-gray-500";
                if (r90Score !== null && r90Score !== undefined) {
                  if (r90Score < 0) r90Color = "bg-red-950";
                  else if (r90Score >= 0 && r90Score < 0.2) r90Color = "bg-red-600";
                  else if (r90Score >= 0.2 && r90Score < 0.4) r90Color = "bg-red-400";
                  else if (r90Score >= 0.4 && r90Score < 0.6) r90Color = "bg-orange-700";
                  else if (r90Score >= 0.6 && r90Score < 0.8) r90Color = "bg-orange-500";
                  else if (r90Score >= 0.8 && r90Score < 1.0) r90Color = "bg-yellow-400";
                  else if (r90Score >= 1.0 && r90Score < 1.4) r90Color = "bg-lime-400";
                  else if (r90Score >= 1.4 && r90Score < 1.8) r90Color = "bg-green-500";
                  else if (r90Score >= 1.8 && r90Score < 2.5) r90Color = "bg-green-700";
                  else r90Color = "bg-yellow-600";
                }

                return (
                  <div 
                    key={analysis.id} 
                    className="flex items-center gap-3 border rounded-lg p-3 hover:border-primary transition-colors"
                  >
                    <span className="text-sm text-muted-foreground min-w-[80px]">
                      {analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleDateString('en-GB') : 'No date'}
                    </span>
                  
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium">
                        {analysis.opponent ? `vs ${analysis.opponent}` : 'No opponent'}
                      </span>
                      {analysis.result && (
                        <span className="text-xs text-muted-foreground">
                          {analysis.result}
                        </span>
                      )}
                    </div>
                    
                    {analysis.minutes_played !== null && analysis.minutes_played !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        {analysis.minutes_played} min
                      </span>
                    )}
                    
                    {r90Score !== undefined && r90Score !== null && (
                      <div className={`${r90Color} text-white text-sm font-bold px-3 py-1 rounded`}>
                        R90: {r90Score.toFixed(2)}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {onViewReport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewReport(analysis.id, playerName)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Report
                        </Button>
                      )}
                      {analysis.pdf_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(analysis.pdf_url!, '_blank')}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      )}
                      {analysis.video_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(analysis.video_url!, '_blank')}
                        >
                          📹 Video
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (confirm('Delete this performance report?')) {
                            try {
                              const { error } = await supabase
                                .from('player_analysis')
                                .delete()
                                .eq('id', analysis.id);
                              
                              if (error) throw error;
                              toast.success('Performance report deleted');
                              fetchPlayerFixtures();
                            } catch (error: any) {
                              toast.error('Failed to delete report');
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};