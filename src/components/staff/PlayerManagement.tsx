import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, FileText, LineChart, BookOpen, Pencil, Video } from "lucide-react";
import { PerformanceActionsDialog } from "./PerformanceActionsDialog";
import { ProgrammingManagement } from "./ProgrammingManagement";

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
  const [isPerformanceActionsDialogOpen, setIsPerformanceActionsDialogOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [isHighlightsDialogOpen, setIsHighlightsDialogOpen] = useState(false);
  const [highlightVideoFile, setHighlightVideoFile] = useState<File | null>(null);
  const [highlightClubLogoFile, setHighlightClubLogoFile] = useState<File | null>(null);
  const [highlightName, setHighlightName] = useState<string>("");
  const [existingHighlights, setExistingHighlights] = useState<any[]>([]);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [visibleOnStarsPage, setVisibleOnStarsPage] = useState(false);
  const [playerCategory, setPlayerCategory] = useState<string>("Other");
  const [isProgrammingDialogOpen, setIsProgrammingDialogOpen] = useState(false);
  const [selectedProgrammingPlayerId, setSelectedProgrammingPlayerId] = useState<string>("");
  const [selectedProgrammingPlayerName, setSelectedProgrammingPlayerName] = useState<string>("");
  const [uploadingPlayerImage, setUploadingPlayerImage] = useState(false);
  const [uploadingClubLogo, setUploadingClubLogo] = useState(false);
  const [clubLogoUrl, setClubLogoUrl] = useState<string>("");

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
    notes: "",
    pdf_file: null as File | null,
    video_file: null as File | null,
  });
  
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);

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

      // Get existing tactical formations if editing
      let existingTacticalFormations: any[] = [];
      if (editingPlayer && editingPlayer.bio) {
        try {
          const existingBio = JSON.parse(editingPlayer.bio);
          if (existingBio.tacticalFormations) {
            existingTacticalFormations = existingBio.tacticalFormations;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Combine bio text with additional structured data
      const bioData: ExpandedPlayerData & { bio?: string; tacticalFormations?: any[] } = {
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth || undefined,
        number: formData.number ? parseInt(formData.number) : undefined,
        currentClub: formData.currentClub || undefined,
        whatsapp: formData.whatsapp || undefined,
        externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
        strengthsAndPlayStyle: strengthsAndPlayStyle.length > 0 ? strengthsAndPlayStyle : undefined,
      };

      // Update or add current club in tacticalFormations
      if (clubLogoUrl && formData.currentClub) {
        // Find existing formation for current club or update the first one
        const updatedFormations = [...existingTacticalFormations];
        const currentClubIndex = updatedFormations.findIndex(f => f.club === formData.currentClub);
        
        const currentClubFormation = {
          formation: "4-3-3", // Default formation
          role: formData.position,
          club: formData.currentClub,
          clubLogo: clubLogoUrl
        };
        
        if (currentClubIndex >= 0) {
          // Update existing club formation
          updatedFormations[currentClubIndex] = currentClubFormation;
        } else if (updatedFormations.length > 0) {
          // Replace the first formation with current club
          updatedFormations[0] = currentClubFormation;
        } else {
          // Add as new formation
          updatedFormations.push(currentClubFormation);
        }
        
        bioData.tacticalFormations = updatedFormations;
      } else if (existingTacticalFormations.length > 0) {
        // Keep existing formations if no club logo update
        bioData.tacticalFormations = existingTacticalFormations;
      }

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
            visible_on_stars_page: visibleOnStarsPage,
            category: playerCategory,
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
            visible_on_stars_page: visibleOnStarsPage,
            category: playerCategory,
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
    setVisibleOnStarsPage(player.visible_on_stars_page || false);
    setPlayerCategory(player.category || "Other");
    
    // Parse bio for additional fields if it contains JSON
    let additionalData: ExpandedPlayerData = {};
    try {
      if (player.bio && player.bio.startsWith('{')) {
        const parsed = JSON.parse(player.bio);
        additionalData = parsed;
        // Load club logo from tacticalFormations
        if (parsed.tacticalFormations && parsed.tacticalFormations[0]?.clubLogo) {
          setClubLogoUrl(parsed.tacticalFormations[0].clubLogo);
        } else {
          setClubLogoUrl("");
        }
      }
    } catch (e) {
      // Bio is regular text, not JSON
      setClubLogoUrl("");
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
    if (!currentPlayerId && !isEditingAnalysis) return;
    
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

      if (isEditingAnalysis && editingAnalysisId) {
        // Update existing analysis
        const updateData: any = {
          analysis_date: analysisData.date,
          opponent: analysisData.opponent,
          result: analysisData.result,
          minutes_played: parseInt(analysisData.minutes_played) || null,
          r90_score: analysisData.r90_score ? parseFloat(analysisData.r90_score) : null,
          notes: analysisData.notes || null,
        };
        
        // Only update URLs if new files were uploaded
        if (pdfUrl) updateData.pdf_url = pdfUrl;
        if (videoUrl) updateData.video_url = videoUrl;

        const { error } = await supabase
          .from('player_analysis')
          .update(updateData)
          .eq('id', editingAnalysisId);

        if (error) throw error;
        toast.success("Analysis updated successfully");
      } else {
        // Insert new analysis record
        const { error } = await supabase
          .from('player_analysis')
          .insert({
            player_id: currentPlayerId,
            analysis_date: analysisData.date,
            opponent: analysisData.opponent,
            result: analysisData.result,
            minutes_played: parseInt(analysisData.minutes_played) || null,
            r90_score: analysisData.r90_score ? parseFloat(analysisData.r90_score) : null,
            notes: analysisData.notes || null,
            pdf_url: pdfUrl,
            video_url: videoUrl,
          });

        if (error) throw error;
        toast.success("Analysis added successfully");
      }

      setIsAnalysisDialogOpen(false);
      setIsEditingAnalysis(false);
      setEditingAnalysisId(null);
      setAnalysisData({
        opponent: "",
        result: "",
        date: "",
        minutes_played: "",
        r90_score: "",
        notes: "",
        pdf_file: null,
        video_file: null,
      });
      fetchAllAnalyses();
    } catch (error: any) {
      toast.error(`Failed to ${isEditingAnalysis ? 'update' : 'add'} analysis: ` + error.message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const openAnalysisDialog = (playerId: string) => {
    setCurrentPlayerId(playerId);
    setIsEditingAnalysis(false);
    setEditingAnalysisId(null);
    setAnalysisData({
      opponent: "",
      result: "",
      date: "",
      minutes_played: "",
      r90_score: "",
      notes: "",
      pdf_file: null,
      video_file: null,
    });
    setIsAnalysisDialogOpen(true);
  };

  const openEditAnalysisDialog = (analysis: any) => {
    setIsEditingAnalysis(true);
    setEditingAnalysisId(analysis.id);
    setAnalysisData({
      opponent: analysis.opponent || "",
      result: analysis.result || "",
      date: analysis.analysis_date || "",
      minutes_played: analysis.minutes_played?.toString() || "",
      r90_score: analysis.r90_score?.toString() || "",
      notes: analysis.notes || "",
      pdf_file: null,
      video_file: null,
    });
    setIsAnalysisDialogOpen(true);
  };

  const handlePlayerImageUpload = async (file: File) => {
    try {
      setUploadingPlayerImage(true);
      
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('analysis-files')
        .upload(`player-images/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`player-images/${fileName}`);
      
      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Player image uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading player image:", error);
      toast.error("Failed to upload player image");
    } finally {
      setUploadingPlayerImage(false);
    }
  };

  const handleClubLogoUpload = async (file: File) => {
    try {
      setUploadingClubLogo(true);
      
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('analysis-files')
        .upload(`club-logos/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`club-logos/${fileName}`);
      
      setClubLogoUrl(publicUrl);
      toast.success("Club logo uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading club logo:", error);
      toast.error("Failed to upload club logo");
    } finally {
      setUploadingClubLogo(false);
    }
  };

  if (loading && players.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Players</h2>
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
              setPlayerCategory("Other");
              setVisibleOnStarsPage(false);
              setClubLogoUrl("");
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
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={playerCategory}
                    onChange={(e) => setPlayerCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value="Signed">Signed</option>
                    <option value="Mandate">Mandate</option>
                    <option value="Other">Other</option>
                  </select>
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
                <Label htmlFor="player_image">Player Image</Label>
                <Input
                  id="player_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePlayerImageUpload(file);
                  }}
                  disabled={uploadingPlayerImage}
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.image_url} 
                      alt="Player preview" 
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload player profile image (PNG, JPG, WEBP)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="club_logo">Current Club Logo</Label>
                <Input
                  id="club_logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleClubLogoUpload(file);
                  }}
                  disabled={uploadingClubLogo}
                />
                {clubLogoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img 
                      src={clubLogoUrl} 
                      alt="Club logo preview" 
                      className="w-16 h-16 object-contain bg-secondary p-2 rounded border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClubLogoUrl("")}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a logo for the current club (displayed on player profile)
                </p>
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

              {/* Visible on Stars Page Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible_on_stars_page"
                  checked={visibleOnStarsPage}
                  onChange={(e) => setVisibleOnStarsPage(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="visible_on_stars_page" className="cursor-pointer">
                  Show player on Stars page
                </Label>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingPlayer ? "Update Player" : "Create Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group players by category */}
      {['Signed', 'Mandate', 'Other'].map((category) => {
        const categoryPlayers = players.filter(p => p.category === category);
        if (categoryPlayers.length === 0) return null;
        
        return (
          <div key={category} className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">{category}</h3>
            <div className="grid gap-4">
              {categoryPlayers.map((player) => {
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
                      Player Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedProgrammingPlayerId(player.id);
                      setSelectedProgrammingPlayerName(player.name);
                      setIsProgrammingDialogOpen(true);
                    }}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Programming
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowingAnalysisFor(showingAnalysisFor === player.id ? null : player.id)}
                    >
                      <LineChart className="w-4 h-4 mr-2" />
                      Analysis
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      // First check if there are any analyses for this player
                      const analyses = playerAnalyses[player.id] || [];
                      if (analyses.length === 0) {
                        toast.info("Please add an analysis entry first before creating a performance report");
                        return;
                      }
                      // Use the most recent analysis
                      const latestAnalysis = analyses[0];
                      setSelectedAnalysisId(latestAnalysis.id);
                      setSelectedPlayerName(player.name);
                      setIsPerformanceActionsDialogOpen(true);
                    }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Performance Reports
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedProgrammingPlayerId(player.id);
                        setSelectedProgrammingPlayerName(player.name);
                        setIsProgrammingDialogOpen(true);
                      }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Programming
                    </Button>
                  </div>

                  {/* Highlights Section */}
                  <div className="border-t pt-4 space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold">Player Highlights</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setCurrentPlayerId(player.id);
                          setIsHighlightsDialogOpen(true);
                        }}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Add Highlight
                      </Button>
                    </div>
                    {(() => {
                      let highlights: any[] = [];
                      try {
                        if (player.highlights) {
                          highlights = typeof player.highlights === 'string' 
                            ? JSON.parse(player.highlights) 
                            : player.highlights;
                          highlights = Array.isArray(highlights) ? highlights : [];
                        }
                      } catch {
                        highlights = [];
                      }
                      
                      return highlights.length > 0 ? (
                        <div className="space-y-2">
                          {highlights.map((highlight, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/5">
                              <span className="text-muted-foreground font-bold">{index + 1}</span>
                              
                              {highlight.clubLogo && (
                                <img 
                                  src={highlight.clubLogo} 
                                  alt="Club logo"
                                  className="w-10 h-10 object-contain bg-white rounded p-1"
                                />
                              )}
                              
                              {highlight.videoUrl && (
                                <video 
                                  src={highlight.videoUrl}
                                  className="w-20 h-14 object-cover rounded border cursor-pointer"
                                  muted
                                  onClick={() => window.open(highlight.videoUrl, '_blank')}
                                />
                              )}
                              
                              <div className="flex-1">
                                <p className="text-sm font-medium">{highlight.name || `Highlight ${index + 1}`}</p>
                                {highlight.addedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Added {new Date(highlight.addedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (index > 0) {
                                      const newHighlights = [...highlights];
                                      [newHighlights[index - 1], newHighlights[index]] = [newHighlights[index], newHighlights[index - 1]];
                                      
                                      try {
                                        const { error } = await supabase
                                          .from("players")
                                          .update({ highlights: JSON.stringify(newHighlights) })
                                          .eq("id", player.id);
                                        
                                        if (error) throw error;
                                        toast.success("Highlight moved up");
                                        fetchPlayers();
                                      } catch (error: any) {
                                        toast.error("Failed to reorder");
                                      }
                                    }
                                  }}
                                  disabled={index === 0}
                                  title="Move up"
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (index < highlights.length - 1) {
                                      const newHighlights = [...highlights];
                                      [newHighlights[index], newHighlights[index + 1]] = [newHighlights[index + 1], newHighlights[index]];
                                      
                                      try {
                                        const { error } = await supabase
                                          .from("players")
                                          .update({ highlights: JSON.stringify(newHighlights) })
                                          .eq("id", player.id);
                                        
                                        if (error) throw error;
                                        toast.success("Highlight moved down");
                                        fetchPlayers();
                                      } catch (error: any) {
                                        toast.error("Failed to reorder");
                                      }
                                    }
                                  }}
                                  disabled={index === highlights.length - 1}
                                  title="Move down"
                                >
                                  ↓
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    const newHighlights = highlights.filter((_, i) => i !== index);
                                    
                                    try {
                                      const { error } = await supabase
                                        .from("players")
                                        .update({ highlights: JSON.stringify(newHighlights) })
                                        .eq("id", player.id);
                                      
                                      if (error) throw error;
                                      toast.success("Highlight deleted");
                                      fetchPlayers();
                                    } catch (error: any) {
                                      toast.error("Failed to delete");
                                    }
                                  }}
                                  title="Delete"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No highlights yet. Click "Add Highlight" to create one.
                        </p>
                      );
                    })()}
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
                            
                            {analysis.opponent && (
                              <div className="flex flex-col min-w-[150px]">
                                <span className="text-sm font-medium">vs {analysis.opponent}</span>
                                {analysis.result && (
                                  <span className="text-xs text-muted-foreground">{analysis.result}</span>
                                )}
                              </div>
                            )}
                            
                            {analysis.r90_score !== null && analysis.r90_score !== undefined && (
                              <button
                                onClick={() => {
                                  setSelectedAnalysisId(analysis.id);
                                  setSelectedPlayerName(player.name);
                                  setIsPerformanceActionsDialogOpen(true);
                                }}
                                className={`${getR90Color(analysis.r90_score)} text-white px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity cursor-pointer`}
                              >
                                R90: {analysis.r90_score?.toFixed(2)}
                              </button>
                            )}
                            
                            {analysis.minutes_played && (
                              <span className="text-sm text-muted-foreground">
                                {analysis.minutes_played} min
                              </span>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditAnalysisDialog(analysis)}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            
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
          </div>
        );
      })}

      {/* Analysis Dialog */}
      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditingAnalysis ? 'Edit Analysis' : 'Add New Analysis'}</DialogTitle>
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
                <Label htmlFor="r90_score">R90 Score</Label>
                <Input
                  id="r90_score"
                  type="number"
                  step="0.01"
                  value={analysisData.r90_score}
                  onChange={(e) => setAnalysisData({ ...analysisData, r90_score: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Comments</Label>
              <Textarea
                id="notes"
                value={analysisData.notes}
                onChange={(e) => setAnalysisData({ ...analysisData, notes: e.target.value })}
                rows={3}
                placeholder="e.g., Strong match performance with excellent positioning"
              />
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

      {/* Performance Actions Dialog */}
      <PerformanceActionsDialog
        open={isPerformanceActionsDialogOpen}
        onOpenChange={setIsPerformanceActionsDialogOpen}
        analysisId={selectedAnalysisId || ""}
        playerName={selectedPlayerName}
      />

      {/* Programming Management Dialog */}
      <ProgrammingManagement
        isOpen={isProgrammingDialogOpen}
        onClose={() => setIsProgrammingDialogOpen(false)}
        playerId={selectedProgrammingPlayerId}
        playerName={selectedProgrammingPlayerName}
      />

      {/* Add Highlight Dialog */}
      <Dialog open={isHighlightsDialogOpen} onOpenChange={(open) => {
        setIsHighlightsDialogOpen(open);
        if (!open) {
          // Clear form when closing
          setHighlightVideoFile(null);
          setHighlightClubLogoFile(null);
          setHighlightName("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Highlight</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!currentPlayerId || !highlightVideoFile || !highlightClubLogoFile || !highlightName) return;
            
            try {
              setUploadingFiles(true);
              
              // Upload video file
              const videoFileName = `${currentPlayerId}_${Date.now()}_${highlightVideoFile.name}`;
              const { data: videoData, error: videoError } = await supabase.storage
                .from('analysis-files')
                .upload(`highlights/${videoFileName}`, highlightVideoFile);
              
              if (videoError) throw videoError;
              
              // Get public URL for video
              const { data: { publicUrl: videoUrl } } = supabase.storage
                .from('analysis-files')
                .getPublicUrl(`highlights/${videoFileName}`);
              
              // Upload club logo file
              const logoFileName = `${currentPlayerId}_${Date.now()}_${highlightClubLogoFile.name}`;
              const { data: logoData, error: logoError } = await supabase.storage
                .from('analysis-files')
                .upload(`highlights/logos/${logoFileName}`, highlightClubLogoFile);
              
              if (logoError) throw logoError;
              
              // Get public URL for logo
              const { data: { publicUrl: logoUrl } } = supabase.storage
                .from('analysis-files')
                .getPublicUrl(`highlights/logos/${logoFileName}`);
              
              // Add highlight to array
              // Get existing highlights from the player
              const player = players.find(p => p.id === currentPlayerId);
              let existingHighlightsFromDb: any[] = [];
              try {
                if (player && player.highlights) {
                  existingHighlightsFromDb = typeof player.highlights === 'string' 
                    ? JSON.parse(player.highlights) 
                    : player.highlights;
                  existingHighlightsFromDb = Array.isArray(existingHighlightsFromDb) ? existingHighlightsFromDb : [];
                }
              } catch {
                existingHighlightsFromDb = [];
              }
              
              const newHighlight = {
                name: highlightName,
                videoUrl: videoUrl,
                clubLogo: logoUrl,
                addedAt: new Date().toISOString()
              };
              
              const updatedHighlights = [...existingHighlightsFromDb, newHighlight];
              
              const { error } = await supabase
                .from("players")
                .update({ highlights: JSON.stringify(updatedHighlights) })
                .eq("id", currentPlayerId);
              
              if (error) throw error;
              
              toast.success("Highlight added successfully!");
              setHighlightVideoFile(null);
              setHighlightClubLogoFile(null);
              setHighlightName("");
              setIsHighlightsDialogOpen(false);
              fetchPlayers();
            } catch (error: any) {
              console.error("Error adding highlight:", error);
              toast.error("Failed to add highlight");
            } finally {
              setUploadingFiles(false);
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="highlight_name">Highlight Name *</Label>
              <Input
                id="highlight_name"
                value={highlightName}
                onChange={(e) => setHighlightName(e.target.value)}
                placeholder="e.g., Season Highlights 2024/25"
                required
              />
              <p className="text-xs text-muted-foreground">
                Give this highlight video a descriptive name
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="highlight_video">Highlight Video *</Label>
              <Input
                id="highlight_video"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
                onChange={(e) => setHighlightVideoFile(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Upload a video file (MP4, MOV, AVI, etc.)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="club_logo">Club Logo *</Label>
              <Input
                id="club_logo"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
                onChange={(e) => setHighlightClubLogoFile(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Upload a club logo image (PNG, JPG, JPEG, WEBP)
              </p>
            </div>
            
            <Button type="submit" disabled={uploadingFiles || !highlightVideoFile || !highlightClubLogoFile || !highlightName}>
              {uploadingFiles ? "Uploading..." : "Add Highlight"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;