import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, FileText, LineChart, BookOpen } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
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

interface ExpandedPlayerData {
  // Additional fields that may be stored as JSON in bio or separate columns
  bio?: string;
  dateOfBirth?: string;
  number?: number;
  currentClub?: string;
  whatsapp?: string;
  externalLinks?: { label: string; url: string }[];
  strengthsAndPlayStyle?: string[];
}

const PlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingStats, setEditingStats] = useState<PlayerStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showingAnalysisFor, setShowingAnalysisFor] = useState<string | null>(null);
  const [playerAnalyses, setPlayerAnalyses] = useState<Record<string, any[]>>({});
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    nationality: "",
    bio: "",
    image_url: "",
    email: "",
    dateOfBirth: "",
    number: "",
    currentClub: "",
    whatsapp: "",
  });

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const parts = dob.split('/');
    if (parts.length !== 3) return 0;
    
    const birthDate = new Date(
      parseInt(parts[2]), // year
      parseInt(parts[1]) - 1, // month (0-indexed)
      parseInt(parts[0]) // day
    );
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const [externalLinks, setExternalLinks] = useState<{ label: string; url: string }[]>([]);
  const [strengthsAndPlayStyle, setStrengthsAndPlayStyle] = useState<string[]>([]);

  const [statsData, setStatsData] = useState({
    goals: "",
    assists: "",
    matches: "",
    minutes: "",
    clean_sheets: "",
    saves: "",
  });

  const [analysisData, setAnalysisData] = useState({
    opponent: "",
    result: "",
    date: "",
    minutes_played: "",
    r90_score: "",
    pdf_file: null as File | null,
    video_file: null as File | null,
  });

  useEffect(() => {
    fetchPlayers();
    fetchAllAnalyses();
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

      // Group analyses by player_id
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate age from date of birth
      const age = calculateAge(formData.dateOfBirth);
      
      if (age === 0 && formData.dateOfBirth) {
        toast.error("Invalid date of birth format. Use DD/MM/YYYY");
        setLoading(false);
        return;
      }

      // Combine bio text with additional structured data
      const bioData: ExpandedPlayerData & { bio?: string } = {
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth || undefined,
        number: formData.number ? parseInt(formData.number) : undefined,
        currentClub: formData.currentClub || undefined,
        whatsapp: formData.whatsapp || undefined,
        externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
        strengthsAndPlayStyle: strengthsAndPlayStyle.length > 0 ? strengthsAndPlayStyle : undefined,
      };

      const bioString = JSON.stringify(bioData);

      if (editingPlayer) {
        const { error } = await supabase
          .from("players")
          .update({
            name: formData.name,
            position: formData.position,
            age: age,
            nationality: formData.nationality,
            bio: bioString,
            image_url: formData.image_url,
            email: formData.email || null,
          })
          .eq("id", editingPlayer.id);

        if (error) throw error;
        toast.success("Player updated successfully");
      } else {
        const { data: newPlayer, error } = await supabase
          .from("players")
          .insert({
            name: formData.name,
            position: formData.position,
            age: age,
            nationality: formData.nationality,
            bio: bioString,
            image_url: formData.image_url,
            email: formData.email || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Create default stats for new player
        if (newPlayer) {
          await supabase.from("player_stats").insert({
            player_id: newPlayer.id,
            goals: 0,
            assists: 0,
            matches: 0,
            minutes: 0,
          });
        }

        toast.success("Player created successfully");
      }

      setFormData({ 
        name: "", 
        position: "", 
        nationality: "", 
        bio: "", 
        image_url: "",
        email: "",
        dateOfBirth: "",
        number: "",
        currentClub: "",
        whatsapp: "",
      });
      setExternalLinks([]);
      setStrengthsAndPlayStyle([]);
      setEditingPlayer(null);
      setIsDialogOpen(false);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to save player: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatsSubmit = async (playerId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("player_stats")
        .upsert({
          player_id: playerId,
          goals: parseInt(statsData.goals) || 0,
          assists: parseInt(statsData.assists) || 0,
          matches: parseInt(statsData.matches) || 0,
          minutes: parseInt(statsData.minutes) || 0,
          clean_sheets: statsData.clean_sheets ? parseInt(statsData.clean_sheets) : null,
          saves: statsData.saves ? parseInt(statsData.saves) : null,
        });

      if (error) throw error;
      toast.success("Stats updated successfully");
      setEditingStats(null);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to update stats: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    
    // Parse bio for additional fields if it contains JSON
    let additionalData: ExpandedPlayerData = {};
    try {
      if (player.bio && player.bio.startsWith('{')) {
        const parsed = JSON.parse(player.bio);
        additionalData = parsed;
      }
    } catch (e) {
      // Bio is regular text, not JSON
    }
    
    setFormData({
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      bio: typeof additionalData === 'object' && additionalData.bio ? additionalData.bio : (player.bio || ""),
      image_url: player.image_url || "",
      email: player.email || "",
      dateOfBirth: additionalData.dateOfBirth || "",
      number: additionalData.number?.toString() || "",
      currentClub: additionalData.currentClub || "",
      whatsapp: additionalData.whatsapp || "",
    });
    
    setExternalLinks(additionalData.externalLinks || []);
    setStrengthsAndPlayStyle(additionalData.strengthsAndPlayStyle || []);
    setIsDialogOpen(true);
  };

  const startEditStats = (playerId: string) => {
    const playerStats = stats[playerId];
    if (playerStats) {
      setEditingStats(playerStats);
      setStatsData({
        goals: playerStats.goals.toString(),
        assists: playerStats.assists.toString(),
        matches: playerStats.matches.toString(),
        minutes: playerStats.minutes.toString(),
        clean_sheets: playerStats.clean_sheets?.toString() || "",
        saves: playerStats.saves?.toString() || "",
      });
    }
  };

  const getR90Color = (score: number) => {
    if (score < 0) return "bg-red-900";
    if (score >= 0 && score < 0.5) return "bg-red-600";
    if (score >= 0.5 && score < 1.0) return "bg-yellow-500";
    if (score >= 1.0 && score < 1.5) return "bg-lime-400";
    if (score >= 1.5 && score < 2.5) return "bg-green-500";
    return "bg-green-700";
  };

  const handleAnalysisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlayerId) return;
    
    setUploadingFiles(true);
    try {
      let pdfUrl = null;
      let videoUrl = null;

      // Upload PDF if provided
      if (analysisData.pdf_file) {
        const pdfPath = `${currentPlayerId}/${Date.now()}-${analysisData.pdf_file.name}`;
        const { error: pdfError } = await supabase.storage
          .from('analysis-files')
          .upload(pdfPath, analysisData.pdf_file);
        
        if (pdfError) throw pdfError;
        
        const { data: pdfData } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(pdfPath);
        pdfUrl = pdfData.publicUrl;
      }

      // Upload video if provided
      if (analysisData.video_file) {
        const videoPath = `${currentPlayerId}/${Date.now()}-${analysisData.video_file.name}`;
        const { error: videoError } = await supabase.storage
          .from('analysis-files')
          .upload(videoPath, analysisData.video_file);
        
        if (videoError) throw videoError;
        
        const { data: videoData } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(videoPath);
        videoUrl = videoData.publicUrl;
      }

      // Insert analysis record
      const { error } = await supabase
        .from('player_analysis')
        .insert({
          player_id: currentPlayerId,
          analysis_date: analysisData.date,
          opponent: analysisData.opponent,
          result: analysisData.result,
          minutes_played: parseInt(analysisData.minutes_played) || null,
          r90_score: parseFloat(analysisData.r90_score),
          pdf_url: pdfUrl,
          video_url: videoUrl,
        });

      if (error) throw error;

      toast.success("Analysis added successfully");
      setIsAnalysisDialogOpen(false);
      setAnalysisData({
        opponent: "",
        result: "",
        date: "",
        minutes_played: "",
        r90_score: "",
        pdf_file: null,
        video_file: null,
      });
      fetchAllAnalyses();
    } catch (error: any) {
      toast.error("Failed to add analysis: " + error.message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const openAnalysisDialog = (playerId: string) => {
    setCurrentPlayerId(playerId);
    setIsAnalysisDialogOpen(true);
  };

  if (loading && players.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Player Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlayer(null);
              setFormData({ 
                name: "", 
                position: "", 
                nationality: "", 
                bio: "", 
                image_url: "",
                email: "",
                dateOfBirth: "",
                number: "",
                currentClub: "",
                whatsapp: "",
              });
              setExternalLinks([]);
              setStrengthsAndPlayStyle([]);
            }}>
              Add New Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? "Edit Player" : "Add New Player"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth (DD/MM/YYYY) *</Label>
                  <Input
                    id="dateOfBirth"
                    placeholder="DD/MM/YYYY"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />
                  {formData.dateOfBirth && (
                    <p className="text-sm text-muted-foreground">
                      Age: {calculateAge(formData.dateOfBirth)} years old
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Jersey Number</Label>
                  <Input
                    id="number"
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentClub">Current Club</Label>
                  <Input
                    id="currentClub"
                    value={formData.currentClub}
                    onChange={(e) => setFormData({ ...formData, currentClub: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+447508342901"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="player@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>
              
              {/* External Links */}
              <div className="space-y-2">
                <Label>External Links</Label>
                {externalLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...externalLinks];
                        newLinks[index].label = e.target.value;
                        setExternalLinks(newLinks);
                      }}
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...externalLinks];
                        newLinks[index].url = e.target.value;
                        setExternalLinks(newLinks);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setExternalLinks(externalLinks.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExternalLinks([...externalLinks, { label: "", url: "" }])}
                >
                  Add Link
                </Button>
              </div>

              {/* Strengths and Play Style */}
              <div className="space-y-2">
                <Label>Strengths & Play Style</Label>
                {strengthsAndPlayStyle.map((strength, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Strength or play style characteristic"
                      value={strength}
                      onChange={(e) => {
                        const newStrengths = [...strengthsAndPlayStyle];
                        newStrengths[index] = e.target.value;
                        setStrengthsAndPlayStyle(newStrengths);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setStrengthsAndPlayStyle(strengthsAndPlayStyle.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStrengthsAndPlayStyle([...strengthsAndPlayStyle, ""])}
                >
                  Add Strength
                </Button>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingPlayer ? "Update Player" : "Create Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {players.map((player) => {
          const isExpanded = expandedPlayerId === player.id;
          const playerStats = stats[player.id];
          let bioData: any = {};
          try {
            if (player.bio && player.bio.startsWith('{')) {
              bioData = JSON.parse(player.bio);
            }
          } catch (e) {
            // Bio is regular text
          }
          
          return (
            <Card key={player.id} className="cursor-pointer">
              <CardHeader 
                onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                className="hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-foreground font-normal">
                    <span>{player.name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{player.position}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{player.age} years</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{player.nationality}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(player)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Player
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info("Programming feature coming soon")}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Edit Programming
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowingAnalysisFor(showingAnalysisFor === player.id ? null : player.id)}
                    >
                      <LineChart className="w-4 h-4 mr-2" />
                      {showingAnalysisFor === player.id ? "Hide" : "View"} Analysis
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info("Performance report feature coming soon")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Add Performance Report
                    </Button>
                  </div>

                  {showingAnalysisFor === player.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold">Player Analysis</h4>
                        <Button size="sm" onClick={() => openAnalysisDialog(player.id)}>
                          Add New Analysis
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {(playerAnalyses[player.id] || []).map((analysis) => (
                          <div 
                            key={analysis.id} 
                            className="flex items-center gap-3 border rounded-lg p-3 hover:border-primary transition-colors"
                          >
                            <span className="text-sm text-muted-foreground min-w-[80px]">
                              {new Date(analysis.analysis_date).toLocaleDateString('en-GB')}
                            </span>
                            
                            <button
                              onClick={() => toast.info("Performance report coming soon")}
                              className={`${getR90Color(analysis.r90_score)} text-white px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer`}
                            >
                              R90: {analysis.r90_score?.toFixed(2)}
                            </button>
                            
                            {analysis.pdf_url && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(analysis.pdf_url, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            )}
                            
                            {analysis.video_url && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(analysis.video_url, '_blank')}
                              >
                                📹 Video
                              </Button>
                            )}
                          </div>
                        ))}
                        {(!playerAnalyses[player.id] || playerAnalyses[player.id].length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No analysis data yet. Click "Add New Analysis" to create one.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Analysis Dialog */}
      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Analysis</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAnalysisSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent *</Label>
                <Input
                  id="opponent"
                  value={analysisData.opponent}
                  onChange={(e) => setAnalysisData({ ...analysisData, opponent: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="result">Result *</Label>
                <Input
                  id="result"
                  placeholder="e.g., 2-1 Win"
                  value={analysisData.result}
                  onChange={(e) => setAnalysisData({ ...analysisData, result: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={analysisData.date}
                  onChange={(e) => setAnalysisData({ ...analysisData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minutes_played">Minutes Played</Label>
                <Input
                  id="minutes_played"
                  type="number"
                  value={analysisData.minutes_played}
                  onChange={(e) => setAnalysisData({ ...analysisData, minutes_played: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r90_score">R90 Score *</Label>
                <Input
                  id="r90_score"
                  type="number"
                  step="0.01"
                  value={analysisData.r90_score}
                  onChange={(e) => setAnalysisData({ ...analysisData, r90_score: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf_file">PDF Report</Label>
              <Input
                id="pdf_file"
                type="file"
                accept=".pdf"
                onChange={(e) => setAnalysisData({ ...analysisData, pdf_file: e.target.files?.[0] || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_file">Video Analysis</Label>
              <Input
                id="video_file"
                type="file"
                accept="video/*"
                onChange={(e) => setAnalysisData({ ...analysisData, video_file: e.target.files?.[0] || null })}
              />
            </div>
            <Button type="submit" disabled={uploadingFiles}>
              {uploadingFiles ? "Uploading..." : "Add Analysis"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;