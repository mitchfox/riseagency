import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Edit, FileText, LineChart, BookOpen, Video, Calendar, Plus, DollarSign, Trash2, Copy, ChevronDown } from "lucide-react";
import { PerformanceActionsDialog } from "./PerformanceActionsDialog";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { ProgrammingManagement } from "./ProgrammingManagement";
import { PlayerFixtures } from "./PlayerFixtures";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showingAnalysisFor, setShowingAnalysisFor] = useState<string | null>(null);
  const [showingHighlightsFor, setShowingHighlightsFor] = useState<string | null>(null);
  const [showingFixturesFor, setShowingFixturesFor] = useState<string | null>(null);
  const [showingInvoicesFor, setShowingInvoicesFor] = useState<string | null>(null);
  const [isAddingFixture, setIsAddingFixture] = useState(false);
  const [playerAnalyses, setPlayerAnalyses] = useState<Record<string, any[]>>({});
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isPerformanceActionsDialogOpen, setIsPerformanceActionsDialogOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [isCreateReportDialogOpen, setIsCreateReportDialogOpen] = useState(false);
  const [createReportPlayerId, setCreateReportPlayerId] = useState<string>("");
  const [createReportPlayerName, setCreateReportPlayerName] = useState<string>("");
  const [editReportAnalysisId, setEditReportAnalysisId] = useState<string | undefined>(undefined);
  const [isHighlightsDialogOpen, setIsHighlightsDialogOpen] = useState(false);
  const [highlightVideoFile, setHighlightVideoFile] = useState<File | null>(null);
  const [highlightClubLogoFile, setHighlightClubLogoFile] = useState<File | null>(null);
  const [highlightName, setHighlightName] = useState<string>("");
  const [highlightType, setHighlightType] = useState<'match' | 'best'>('match');
  const [existingHighlights, setExistingHighlights] = useState<any[]>([]);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [visibleOnStarsPage, setVisibleOnStarsPage] = useState(false);
  const [playerCategory, setPlayerCategory] = useState<string>("Other");
  const [representationStatus, setRepresentationStatus] = useState<string>("other");
  const [isProgrammingDialogOpen, setIsProgrammingDialogOpen] = useState(false);
  const [selectedProgrammingPlayerId, setSelectedProgrammingPlayerId] = useState<string>("");
  const [selectedProgrammingPlayerName, setSelectedProgrammingPlayerName] = useState<string>("");
  const [uploadingPlayerImage, setUploadingPlayerImage] = useState(false);
  const [uploadingClubLogo, setUploadingClubLogo] = useState(false);
  const [clubLogoUrl, setClubLogoUrl] = useState<string>("");
  const [representationFilter, setRepresentationFilter] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    'Signed': true,
    'Mandate': true,
    'Fuel For Football': true,
    'Other': true
  });
  const [schemeHistory, setSchemeHistory] = useState<Array<{
    formation: string;
    positions: string[];
    teamName: string;
    matches: string;
    clubLogo: string;
    playerImage?: string;
  }>>([]);
  const [editingSchemeIndex, setEditingSchemeIndex] = useState<number | null>(null);
  const [uploadingSchemeClubLogo, setUploadingSchemeClubLogo] = useState(false);
  const [uploadingSchemePlayerImage, setUploadingSchemePlayerImage] = useState(false);
  const [availableAnalyses, setAvailableAnalyses] = useState<any[]>([]);
  const [selectedAnalysisWriterId, setSelectedAnalysisWriterId] = useState<string>("none");
  const [playerInvoices, setPlayerInvoices] = useState<Record<string, any[]>>({});
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [currentInvoicePlayerId, setCurrentInvoicePlayerId] = useState<string | null>(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    amount: "",
    description: "",
    status: "pending",
    currency: "EUR",
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

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

  const [seasonStats, setSeasonStats] = useState([
    { header: "Goals", value: "" },
    { header: "Assists", value: "" },
    { header: "Matches", value: "" },
    { header: "Minutes", value: "" }
  ]);

  const [topStats, setTopStats] = useState<{ label: string; value: string; description: string; icon?: string }[]>([]);

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
    fetchAvailableAnalyses();
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

  // Set up real-time subscription for player_analysis updates
  useEffect(() => {
    const channel = supabase
      .channel('player-analysis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_analysis'
        },
        () => {
          // Refetch analyses when any change occurs
          fetchAllAnalyses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAvailableAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, analysis_type, title, home_team, away_team, concept")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailableAnalyses(data || []);
    } catch (error: any) {
      console.error("Failed to fetch available analyses:", error);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      // Group invoices by player_id
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

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoicePlayerId) return;

    try {
      const invoiceData = {
        player_id: currentInvoicePlayerId,
        invoice_number: invoiceFormData.invoice_number,
        invoice_date: invoiceFormData.invoice_date,
        due_date: invoiceFormData.due_date,
        amount: parseFloat(invoiceFormData.amount),
        description: invoiceFormData.description || null,
        status: invoiceFormData.status,
        currency: invoiceFormData.currency,
      };

      if (editingInvoiceId) {
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", editingInvoiceId);

        if (error) throw error;
        toast.success("Invoice updated successfully");
      } else {
        const { error } = await supabase
          .from("invoices")
          .insert(invoiceData);

        if (error) throw error;
        toast.success("Invoice created successfully");
      }

      setInvoiceFormData({
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        amount: "",
        description: "",
        status: "pending",
        currency: "EUR",
      });
      setEditingInvoiceId(null);
      setIsInvoiceDialogOpen(false);
      fetchAllInvoices();
    } catch (error: any) {
      toast.error("Failed to save invoice: " + error.message);
    }
  };

  const handleDuplicateInvoice = (invoice: any) => {
    const newInvoiceNumber = `${invoice.invoice_number}-COPY`;
    setCurrentInvoicePlayerId(invoice.player_id);
    setEditingInvoiceId(null);
    setInvoiceFormData({
      invoice_number: newInvoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: invoice.due_date,
      amount: invoice.amount.toString(),
      description: invoice.description || "",
      status: "pending",
      currency: invoice.currency,
    });
    setIsInvoiceDialogOpen(true);
    toast.info("Invoice duplicated - modify and save");
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
      toast.success("Invoice deleted successfully");
      fetchAllInvoices();
    } catch (error: any) {
      toast.error("Failed to delete invoice: " + error.message);
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
      const bioData: ExpandedPlayerData & { bio?: string; tacticalFormations?: any[]; schemeHistory?: any[]; seasonStats?: any[]; topStats?: any[] } = {
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth || undefined,
        number: formData.number ? parseInt(formData.number) : undefined,
        currentClub: formData.currentClub || undefined,
        whatsapp: formData.whatsapp || undefined,
        externalLinks: externalLinks.length > 0 ? externalLinks : undefined,
        strengthsAndPlayStyle: strengthsAndPlayStyle.length > 0 ? strengthsAndPlayStyle : undefined,
        schemeHistory: schemeHistory.length > 0 ? schemeHistory : undefined,
        seasonStats: seasonStats.length > 0 ? seasonStats : undefined,
        topStats: topStats.length > 0 ? topStats : undefined,
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
            representation_status: representationStatus,
            club: formData.currentClub || null,
            club_logo: clubLogoUrl || null,
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
            representation_status: representationStatus,
            club: formData.currentClub || null,
            club_logo: clubLogoUrl || null,
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
      setSchemeHistory([]);
      setTopStats([]);
      setSeasonStats([
        { header: "Goals", value: "" },
        { header: "Assists", value: "" },
        { header: "Matches", value: "" },
        { header: "Minutes", value: "" }
      ]);
      setEditingPlayer(null);
      setIsDialogOpen(false);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to save player: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (playerId: string, playerEmail: string, playerName: string) => {
    if (!playerEmail) {
      toast.error("Player must have an email address to create an account");
      return;
    }

    const password = prompt(`Enter a temporary password for ${playerName}:`);
    if (!password) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-player-account', {
        body: {
          email: playerEmail,
          password: password,
          fullName: playerName
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Account created successfully for ${playerName}`);
        toast.info(`Email: ${playerEmail} | Password: ${password}`);
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(`Failed to create account: ${error.message}`);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string, playerId: string) => {
    if (!confirm("Are you sure you want to delete this analysis/game? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete associated performance report actions first
      const { error: actionsError } = await supabase
        .from("performance_report_actions")
        .delete()
        .eq("analysis_id", analysisId);

      if (actionsError) throw actionsError;

      // Delete the analysis
      const { error } = await supabase
        .from("player_analysis")
        .delete()
        .eq("id", analysisId);

      if (error) throw error;

      toast.success("Analysis deleted successfully");
      
      // Refresh the analyses list
      fetchAllAnalyses();
    } catch (error: any) {
      console.error("Error deleting analysis:", error);
      toast.error("Failed to delete analysis: " + error.message);
    }
  };


  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setVisibleOnStarsPage(player.visible_on_stars_page || false);
    setPlayerCategory(player.category || "Other");
    setRepresentationStatus(player.representation_status || "other");
    
    // Parse bio for additional fields if it contains JSON
    let additionalData: ExpandedPlayerData = {};
    try {
      if (player.bio && player.bio.startsWith('{')) {
        const parsed = JSON.parse(player.bio);
        additionalData = parsed;
        
        // Load top stats (IN NUMBERS)
        if (parsed.topStats && Array.isArray(parsed.topStats)) {
          setTopStats(parsed.topStats);
        } else {
          setTopStats([]);
        }

        // Load season stats
        if (parsed.seasonStats && Array.isArray(parsed.seasonStats)) {
          setSeasonStats(parsed.seasonStats);
        } else {
          // Default season stats
          const playerStats = stats[player.id];
          setSeasonStats([
            { header: "Goals", value: playerStats?.goals?.toString() || "0" },
            { header: "Assists", value: playerStats?.assists?.toString() || "0" },
            { header: "Matches", value: playerStats?.matches?.toString() || "0" },
            { header: "Minutes", value: playerStats?.minutes?.toString() || "0" }
          ]);
        }
        
        // Load scheme history from schemeHistory OR convert from tacticalFormations
        if (parsed.schemeHistory && Array.isArray(parsed.schemeHistory)) {
          setSchemeHistory(parsed.schemeHistory);
        } else if (parsed.tacticalFormations && Array.isArray(parsed.tacticalFormations)) {
          // Convert old tacticalFormations format to new schemeHistory format
          const convertedSchemes = parsed.tacticalFormations.map((tf: any) => ({
            formation: tf.formation || '',
            positions: tf.position ? [tf.position] : (tf.role ? [tf.role] : []),
            teamName: tf.club || '',
            matches: tf.appearances?.toString() || '',
            clubLogo: tf.clubLogo || '',
            playerImage: tf.playerImage || ''
          }));
          setSchemeHistory(convertedSchemes);
        } else {
          setSchemeHistory([]);
        }
        
        // Load club logo from tacticalFormations
        if (parsed.tacticalFormations && parsed.tacticalFormations[0]?.clubLogo) {
          setClubLogoUrl(parsed.tacticalFormations[0].clubLogo);
        } else {
          setClubLogoUrl("");
        }
      } else {
        setSchemeHistory([]);
      }
    } catch (e) {
      // Bio is regular text, not JSON
      setClubLogoUrl("");
      setSchemeHistory([]);
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
          analysis_writer_id: selectedAnalysisWriterId && selectedAnalysisWriterId !== "none" ? selectedAnalysisWriterId : null,
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
            analysis_writer_id: selectedAnalysisWriterId && selectedAnalysisWriterId !== "none" ? selectedAnalysisWriterId : null,
          });

        if (error) throw error;
        toast.success("Analysis added successfully");
      }

      setIsAnalysisDialogOpen(false);
      setIsEditingAnalysis(false);
      setEditingAnalysisId(null);
      setSelectedAnalysisWriterId("none");
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
    setSelectedAnalysisWriterId("none");
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
    setSelectedAnalysisWriterId(analysis.analysis_writer_id || "none");
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
      toast.success("Player image uploaded successfully! Note: For best results, copy images to /public/players/ folder");
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
      
      const { data: publicUrl } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`club-logos/${fileName}`);
      
      setClubLogoUrl(publicUrl.publicUrl);
      toast.success("Club logo uploaded successfully! Note: For best results, copy logos to /public/clubs/ folder");
    } catch (error: any) {
      console.error("Error uploading club logo:", error);
      toast.error("Failed to upload club logo");
    } finally {
      setUploadingClubLogo(false);
    }
  };

  const handleSchemeClubLogoUpload = async (file: File, schemeIndex: number) => {
    try {
      setUploadingSchemeClubLogo(true);
      
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('analysis-files')
        .upload(`club-logos/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: publicUrl } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`club-logos/${fileName}`);
      
      const newHistory = [...schemeHistory];
      newHistory[schemeIndex].clubLogo = publicUrl.publicUrl;
      setSchemeHistory(newHistory);
      
      toast.success("Club logo uploaded!");
    } catch (error: any) {
      console.error("Error uploading club logo:", error);
      toast.error("Failed to upload club logo");
    } finally {
      setUploadingSchemeClubLogo(false);
    }
  };

  const handleSchemePlayerImageUpload = async (file: File, schemeIndex: number) => {
    try {
      setUploadingSchemePlayerImage(true);
      
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('analysis-files')
        .upload(`player-images/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: publicUrl } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`player-images/${fileName}`);
      
      const newHistory = [...schemeHistory];
      newHistory[schemeIndex].playerImage = publicUrl.publicUrl;
      setSchemeHistory(newHistory);
      
      toast.success("Player image uploaded!");
    } catch (error: any) {
      console.error("Error uploading player image:", error);
      toast.error("Failed to upload player image");
    } finally {
      setUploadingSchemePlayerImage(false);
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
              setSchemeHistory([]);
              setTopStats([]);
              setSeasonStats([
                { header: "Goals", value: "" },
                { header: "Assists", value: "" },
                { header: "Matches", value: "" },
                { header: "Minutes", value: "" }
              ]);
              setPlayerCategory("Other");
              setRepresentationStatus("other");
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
                    <option value="Fuel For Football">Fuel For Football</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="representation_status">Representation Status *</Label>
                  <select
                    id="representation_status"
                    value={representationStatus}
                    onChange={(e) => setRepresentationStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value="represented">Represented</option>
                    <option value="mandated">Mandated</option>
                    <option value="other">Other</option>
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
                  Upload player image OR manually enter a path below
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="/players/player-name.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  For best reliability, copy images to /public/players/ folder and use path: /players/filename.jpg
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
                  Upload a logo OR manually enter a path below
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="/clubs/logo.png"
                    value={clubLogoUrl}
                    onChange={(e) => setClubLogoUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  For best reliability, copy logos to /public/clubs/ folder and use path: /clubs/filename.png
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

              {/* Scheme History */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Scheme History</Label>
                {schemeHistory.map((scheme, index) => (
                  <Card key={index} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Entry {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setSchemeHistory(schemeHistory.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Scheme</Label>
                        <select
                          className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                          value={scheme.formation}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            newHistory[index].formation = e.target.value;
                            setSchemeHistory(newHistory);
                          }}
                        >
                          <option value="">Select scheme</option>
                          <option value="4-3-3">4-3-3</option>
                          <option value="4-2-3-1">4-2-3-1</option>
                          <option value="4-4-2">4-4-2</option>
                          <option value="4-2-2-2">4-2-2-2</option>
                          <option value="4-3-1-2">4-3-1-2</option>
                          <option value="3-4-3">3-4-3</option>
                          <option value="3-3-3-1">3-3-3-1</option>
                          <option value="3-3-4">3-3-4</option>
                          <option value="3-3-2-2">3-3-2-2</option>
                          <option value="3-4-1-2">3-4-1-2</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Team Name</Label>
                        <Input
                          placeholder="e.g., Norwich City"
                          value={scheme.teamName}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            newHistory[index].teamName = e.target.value;
                            setSchemeHistory(newHistory);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Position(s) in Scheme</Label>
                        <Input
                          placeholder="e.g., ST, LW, CAM"
                          value={scheme.positions.join(", ")}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            const value = e.target.value;
                            // Only split and filter when there's actual content or when user finishes typing
                            if (value.trim() === "") {
                              newHistory[index].positions = [];
                            } else {
                              // Allow commas and spaces while typing, only trim individual positions
                              newHistory[index].positions = value.split(",").map(p => p.trim());
                            }
                            setSchemeHistory(newHistory);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use position codes like: GK, LB, CB, RB, LWB, RWB, DM, CM, LM, RM, CAM, AM, LW, RW, ST
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Matches Played</Label>
                        <Input
                          placeholder="e.g., 25 or CURRENT CLUB"
                          value={scheme.matches}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            newHistory[index].matches = e.target.value;
                            setSchemeHistory(newHistory);
                          }}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Player Image for this Team</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSchemePlayerImageUpload(file, index);
                          }}
                          disabled={uploadingSchemePlayerImage}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload a different player image for this team (optional)
                        </p>
                        <Input
                          placeholder="/players/player-team-image.jpg"
                          value={scheme.playerImage || ""}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            newHistory[index].playerImage = e.target.value;
                            setSchemeHistory(newHistory);
                          }}
                        />
                        {scheme.playerImage && (
                          <div className="mt-2">
                            <img 
                              src={scheme.playerImage} 
                              alt="Player image" 
                              className="w-12 h-12 object-cover bg-secondary p-1 rounded-full border"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Club Logo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSchemeClubLogoUpload(file, index);
                          }}
                          disabled={uploadingSchemeClubLogo}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload logo OR manually enter path below
                        </p>
                        <Input
                          placeholder="/clubs/team-logo.png"
                          value={scheme.clubLogo}
                          onChange={(e) => {
                            const newHistory = [...schemeHistory];
                            newHistory[index].clubLogo = e.target.value;
                            setSchemeHistory(newHistory);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          For best reliability, copy logos to /public/clubs/ folder
                        </p>
                        {scheme.clubLogo && (
                          <div className="mt-2">
                            <img 
                              src={scheme.clubLogo} 
                              alt="Club logo" 
                              className="w-12 h-12 object-contain bg-secondary p-1 rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSchemeHistory([...schemeHistory, {
                    formation: "",
                    positions: [],
                    teamName: "",
                    matches: "",
                    clubLogo: "",
                    playerImage: ""
                  }])}
                >
                  Add Scheme History Entry
                </Button>
              </div>

              {/* Season Stats */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Season Stats (4 customizable stats)</Label>
                <p className="text-sm text-muted-foreground">
                  Customize the 4 stat headers and values that will be displayed for this player.
                </p>
                {seasonStats.map((stat, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`stat-header-${index}`}>Stat Header {index + 1}</Label>
                      <Input
                        id={`stat-header-${index}`}
                        value={stat.header}
                        onChange={(e) => {
                          const newStats = [...seasonStats];
                          newStats[index].header = e.target.value;
                          setSeasonStats(newStats);
                        }}
                        placeholder="e.g., Goals, Apps, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`stat-value-${index}`}>Value</Label>
                      <Input
                        id={`stat-value-${index}`}
                        value={stat.value}
                        onChange={(e) => {
                          const newStats = [...seasonStats];
                          newStats[index].value = e.target.value;
                          setSeasonStats(newStats);
                        }}
                        placeholder="e.g., 12, 25, etc."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Stats (IN NUMBERS) */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">In Numbers (Top Stats)</Label>
                <p className="text-sm text-muted-foreground">
                  Add key statistics that will be highlighted in the "IN NUMBERS" section on the player's detail page.
                </p>
                {topStats.map((stat, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-semibold">Stat {index + 1}</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setTopStats(topStats.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`top-stat-label-${index}`}>Label</Label>
                      <Input
                        id={`top-stat-label-${index}`}
                        value={stat.label}
                        onChange={(e) => {
                          const newStats = [...topStats];
                          newStats[index].label = e.target.value;
                          setTopStats(newStats);
                        }}
                        placeholder="e.g., Interceptions, Passing Accuracy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`top-stat-value-${index}`}>Value</Label>
                      <Input
                        id={`top-stat-value-${index}`}
                        value={stat.value}
                        onChange={(e) => {
                          const newStats = [...topStats];
                          newStats[index].value = e.target.value;
                          setTopStats(newStats);
                        }}
                        placeholder="e.g., #1 In League, 92%"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`top-stat-description-${index}`}>Description</Label>
                      <Input
                        id={`top-stat-description-${index}`}
                        value={stat.description}
                        onChange={(e) => {
                          const newStats = [...topStats];
                          newStats[index].description = e.target.value;
                          setTopStats(newStats);
                        }}
                        placeholder="e.g., 14.0 per 90 minutes"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`top-stat-icon-${index}`}>Icon</Label>
                      <select
                        id={`top-stat-icon-${index}`}
                        value={stat.icon || 'default'}
                        onChange={(e) => {
                          const newStats = [...topStats];
                          newStats[index].icon = e.target.value;
                          setTopStats(newStats);
                        }}
                        className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="default">Default (Target)</option>
                        <option value="shield">Shield (Defense)</option>
                        <option value="target">Target (Accuracy)</option>
                        <option value="zap">Lightning (Speed/Power)</option>
                        <option value="muscle">Muscle (Strength)</option>
                        <option value="1v1">1v1 (Dribbling)</option>
                        <option value="trophy">Trophy (Achievement)</option>
                      </select>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTopStats([...topStats, { label: "", value: "", description: "", icon: "default" }])}
                >
                  Add Top Stat
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

              {/* Invoices Section - Only show when editing existing player */}
              {editingPlayer && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Invoices</h4>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setCurrentInvoicePlayerId(editingPlayer.id);
                        setEditingInvoiceId(null);
                        setInvoiceFormData({
                          invoice_number: "",
                          invoice_date: "",
                          due_date: "",
                          amount: "",
                          description: "",
                          status: "pending",
                          currency: "EUR",
                        });
                        setIsInvoiceDialogOpen(true);
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Add Invoice
                    </Button>
                  </div>
                  
                  {playerInvoices[editingPlayer.id]?.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {playerInvoices[editingPlayer.id].map((invoice) => (
                        <div key={invoice.id} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">Invoice #{invoice.invoice_number}</p>
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
                            <p className="text-xs text-muted-foreground">
                              Date: {new Date(invoice.invoice_date).toLocaleDateString()} | 
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-semibold mt-1">
                              {invoice.currency} {invoice.amount.toFixed(2)}
                            </p>
                            {invoice.description && (
                              <p className="text-xs text-muted-foreground mt-1">{invoice.description}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentInvoicePlayerId(editingPlayer.id);
                                setEditingInvoiceId(invoice.id);
                                setInvoiceFormData({
                                  invoice_number: invoice.invoice_number,
                                  invoice_date: new Date(invoice.invoice_date).toISOString().split('T')[0],
                                  due_date: new Date(invoice.due_date).toISOString().split('T')[0],
                                  amount: invoice.amount.toString(),
                                  description: invoice.description || "",
                                  status: invoice.status,
                                  currency: invoice.currency,
                                });
                                setIsInvoiceDialogOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicateInvoice(invoice)}
                              title="Duplicate"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No invoices yet. Click "Add Invoice" to create one.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingPlayer ? "Update Player" : "Create Player"}
                </Button>
                {editingPlayer && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={loading}
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to delete this player? This action cannot be undone.`)) {
                        return;
                      }
                      
                      try {
                        const { error } = await supabase
                          .from("players")
                          .delete()
                          .eq("id", editingPlayer.id);
                        
                        if (error) throw error;
                        
                        toast.success("Player deleted successfully");
                        setIsDialogOpen(false);
                        fetchPlayers();
                      } catch (error: any) {
                        console.error("Error deleting player:", error);
                        toast.error("Failed to delete player");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Player
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <Button
          variant={representationFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setRepresentationFilter("all")}
        >
          All Players
        </Button>
        <Button
          variant={representationFilter === "represented" ? "default" : "outline"}
          size="sm"
          onClick={() => setRepresentationFilter("represented")}
        >
          Represented
        </Button>
        <Button
          variant={representationFilter === "mandated" ? "default" : "outline"}
          size="sm"
          onClick={() => setRepresentationFilter("mandated")}
        >
          Mandated
        </Button>
        <Button
          variant={representationFilter === "other" ? "default" : "outline"}
          size="sm"
          onClick={() => setRepresentationFilter("other")}
        >
          Other
        </Button>
      </div>

      {/* Group players by category */}
      {['Signed', 'Mandate', 'Fuel For Football', 'Other'].map((category) => {
        const categoryPlayers = players.filter(p => {
          const matchesCategory = p.category === category;
          const matchesRepresentation = representationFilter === "all" || p.representation_status === representationFilter;
          return matchesCategory && matchesRepresentation;
        });
        if (categoryPlayers.length === 0) return null;
        
        return (
          <Collapsible 
            key={category} 
            open={!collapsedCategories[category]}
            onOpenChange={(open) => setCollapsedCategories({...collapsedCategories, [category]: !open})}
            className="space-y-4"
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <h3 className="text-xl font-semibold text-primary">{category}</h3>
              <ChevronDown className={`w-5 h-5 transition-transform ${collapsedCategories[category] ? '' : 'rotate-180'}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
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
                   <Card key={player.id} data-player-id={player.id} className="cursor-pointer">
                    <CardHeader 
                      onClick={() => {
                        const newExpanded = isExpanded ? null : player.id;
                        setExpandedPlayerId(newExpanded);
                        // Auto-open fixtures when expanding a player
                        setShowingFixturesFor(newExpanded);
                      }}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-foreground font-normal min-w-0 flex-1">
                          <span className="font-semibold truncate">{player.name}</span>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-muted-foreground">{player.position}</span>
                            <span className="text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-muted-foreground">{player.age} years</span>
                            <span className="text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-muted-foreground">{player.nationality}</span>
                            {player.representation_status && (
                              <>
                                <span className="text-muted-foreground hidden sm:inline">•</span>
                                <span className="text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                                  {player.representation_status === 'represented' ? 'Represented' : 
                                   player.representation_status === 'mandated' ? 'Mandated' : 
                                   'Other'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-muted-foreground flex-shrink-0 mt-1 sm:mt-0">
                          {isExpanded ? "▼" : "▶"}
                        </div>
                      </div>
                    </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={showingFixturesFor === player.id ? "default" : "outline"}
                      size="sm" 
                      onClick={() => {
                        setShowingFixturesFor(showingFixturesFor === player.id ? null : player.id);
                        setShowingAnalysisFor(null);
                        setShowingHighlightsFor(null);
                        setShowingInvoicesFor(null);
                      }}
                      className="flex-shrink-0"
                    >
                      <Calendar className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Fixtures</span>
                    </Button>
                    <Button 
                      variant={showingAnalysisFor === player.id ? "default" : "outline"}
                      size="sm" 
                      onClick={() => {
                        setShowingAnalysisFor(showingAnalysisFor === player.id ? null : player.id);
                        setShowingFixturesFor(null);
                        setShowingHighlightsFor(null);
                        setShowingInvoicesFor(null);
                      }}
                      className="flex-shrink-0"
                    >
                      <LineChart className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Analysis</span>
                    </Button>
                    <Button 
                      variant={isProgrammingDialogOpen && selectedProgrammingPlayerId === player.id ? "default" : "outline"}
                      size="sm" 
                      onClick={() => {
                        setSelectedProgrammingPlayerId(player.id);
                        setSelectedProgrammingPlayerName(player.name);
                        setIsProgrammingDialogOpen(true);
                        setShowingFixturesFor(null);
                        setShowingAnalysisFor(null);
                        setShowingHighlightsFor(null);
                        setShowingInvoicesFor(null);
                      }}
                      className="flex-shrink-0"
                    >
                      <BookOpen className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Programming</span>
                    </Button>
                    <Button 
                      variant={showingHighlightsFor === player.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowingHighlightsFor(showingHighlightsFor === player.id ? null : player.id);
                        setShowingFixturesFor(null);
                        setShowingAnalysisFor(null);
                        setShowingInvoicesFor(null);
                      }}
                      className="flex-shrink-0"
                    >
                      <Video className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Highlights</span>
                    </Button>
                    <Button 
                      variant={showingInvoicesFor === player.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowingInvoicesFor(showingInvoicesFor === player.id ? null : player.id);
                        setShowingFixturesFor(null);
                        setShowingAnalysisFor(null);
                        setShowingHighlightsFor(null);
                      }}
                      className="flex-shrink-0"
                    >
                      <DollarSign className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Invoices</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(player)} className="flex-shrink-0">
                      <Edit className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Player Details</span>
                    </Button>
                  </div>

                   {showingFixturesFor === player.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold mb-4">Fixtures</h4>
                      </div>

                      <PlayerFixtures
                        playerId={player.id} 
                        playerName={player.name}
                        onCreateAnalysis={(fixtureId) => {
                          setCurrentPlayerId(player.id);
                          setSelectedAnalysisWriterId(fixtureId);
                          setIsAnalysisDialogOpen(true);
                        }}
                        onViewReport={(analysisId, playerName) => {
                          setSelectedAnalysisId(analysisId);
                          setSelectedPlayerName(playerName);
                          setIsPerformanceActionsDialogOpen(true);
                        }}
                        triggerOpen={isAddingFixture && player.id === showingFixturesFor}
                        onDialogOpenChange={() => setIsAddingFixture(false)}
                      />
                  </div>
                )}

                  {showingHighlightsFor === player.id && (
                    <>
                       {/* Highlights Section */}
                       <div className="border-t pt-4 space-y-4 mt-4">
                         <Tabs defaultValue="match" className="w-full">
                           <div className="flex items-center justify-between mb-4">
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
                           
                           <TabsList className="grid w-full grid-cols-2 mb-4">
                             <TabsTrigger value="match">Match Highlights</TabsTrigger>
                             <TabsTrigger value="best">Best Clips</TabsTrigger>
                           </TabsList>
                           
                           <TabsContent value="match">
                             {(() => {
                               let matchHighlights: any[] = [];
                               try {
                                 if (player.highlights) {
                                   const parsed = typeof player.highlights === 'string' 
                                     ? JSON.parse(player.highlights) 
                                     : player.highlights;
                                   
                                   // Handle legacy array format or new object format
                                   if (Array.isArray(parsed)) {
                                     matchHighlights = parsed;
                                   } else {
                                     matchHighlights = parsed.matchHighlights || [];
                                   }
                                 }
                               } catch {
                                 matchHighlights = [];
                               }
                               
                               return matchHighlights.length > 0 ? (
                                 <div className="space-y-2">
                                   {matchHighlights.map((highlight, index) => (
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
                                               const newHighlights = [...matchHighlights];
                                               [newHighlights[index - 1], newHighlights[index]] = [newHighlights[index], newHighlights[index - 1]];
                                               
                                               try {
                                                 // Get current full highlights structure
                                                 const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                                 const fullHighlights = Array.isArray(parsed) 
                                                   ? { matchHighlights: newHighlights, bestClips: [] }
                                                   : { ...parsed, matchHighlights: newHighlights };
                                                 
                                                 const { error } = await supabase
                                                   .from("players")
                                                   .update({ highlights: JSON.stringify(fullHighlights) })
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
                                             if (index < matchHighlights.length - 1) {
                                               const newHighlights = [...matchHighlights];
                                               [newHighlights[index], newHighlights[index + 1]] = [newHighlights[index + 1], newHighlights[index]];
                                               
                                               try {
                                                 // Get current full highlights structure
                                                 const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                                 const fullHighlights = Array.isArray(parsed) 
                                                   ? { matchHighlights: newHighlights, bestClips: [] }
                                                   : { ...parsed, matchHighlights: newHighlights };
                                                 
                                                 const { error } = await supabase
                                                   .from("players")
                                                   .update({ highlights: JSON.stringify(fullHighlights) })
                                                   .eq("id", player.id);
                                                 
                                                 if (error) throw error;
                                                 toast.success("Highlight moved down");
                                                 fetchPlayers();
                                               } catch (error: any) {
                                                 toast.error("Failed to reorder");
                                               }
                                             }
                                           }}
                                           disabled={index === matchHighlights.length - 1}
                                           title="Move down"
                                         >
                                           ↓
                                         </Button>
                                         <Button
                                           type="button"
                                           variant="outline"
                                           size="sm"
                                           onClick={() => {
                                             setCurrentPlayerId(player.id);
                                             setEditingHighlightIndex(index);
                                             setHighlightName(highlight.name || "");
                                             setHighlightType('match');
                                             setExistingHighlights(matchHighlights);
                                             setIsHighlightsDialogOpen(true);
                                           }}
                                           title="Edit"
                                         >
                                           <Edit className="w-3 h-3" />
                                         </Button>
                                         <Button
                                           type="button"
                                           variant="destructive"
                                           size="sm"
                                           onClick={async () => {
                                             const newHighlights = matchHighlights.filter((_, i) => i !== index);
                                             
                                             try {
                                               // Get current full highlights structure
                                               const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                               const fullHighlights = Array.isArray(parsed) 
                                                 ? { matchHighlights: newHighlights, bestClips: [] }
                                                 : { ...parsed, matchHighlights: newHighlights };
                                               
                                               const { error } = await supabase
                                                 .from("players")
                                                 .update({ highlights: JSON.stringify(fullHighlights) })
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
                                   No match highlights yet. Click "Add Highlight" to create one.
                                 </p>
                               );
                             })()}
                           </TabsContent>
                           
                           <TabsContent value="best">
                             {(() => {
                               let bestClips: any[] = [];
                               try {
                                 if (player.highlights) {
                                   const parsed = typeof player.highlights === 'string' 
                                     ? JSON.parse(player.highlights) 
                                     : player.highlights;
                                   
                                   // Only new format has best clips
                                   if (!Array.isArray(parsed)) {
                                     bestClips = parsed.bestClips || [];
                                   }
                                 }
                               } catch {
                                 bestClips = [];
                               }
                               
                               return bestClips.length > 0 ? (
                                 <div className="space-y-2">
                                   {bestClips.map((highlight, index) => (
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
                                         <p className="text-sm font-medium">{highlight.name || `Clip ${index + 1}`}</p>
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
                                               const newBestClips = [...bestClips];
                                               [newBestClips[index - 1], newBestClips[index]] = [newBestClips[index], newBestClips[index - 1]];
                                               
                                               try {
                                                 // Get current full highlights structure
                                                 const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                                 const fullHighlights = Array.isArray(parsed) 
                                                   ? { matchHighlights: parsed, bestClips: newBestClips }
                                                   : { ...parsed, bestClips: newBestClips };
                                                 
                                                 const { error } = await supabase
                                                   .from("players")
                                                   .update({ highlights: JSON.stringify(fullHighlights) })
                                                   .eq("id", player.id);
                                                 
                                                 if (error) throw error;
                                                 toast.success("Clip moved up");
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
                                             if (index < bestClips.length - 1) {
                                               const newBestClips = [...bestClips];
                                               [newBestClips[index], newBestClips[index + 1]] = [newBestClips[index + 1], newBestClips[index]];
                                               
                                               try {
                                                 // Get current full highlights structure
                                                 const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                                 const fullHighlights = Array.isArray(parsed) 
                                                   ? { matchHighlights: parsed, bestClips: newBestClips }
                                                   : { ...parsed, bestClips: newBestClips };
                                                 
                                                 const { error } = await supabase
                                                   .from("players")
                                                   .update({ highlights: JSON.stringify(fullHighlights) })
                                                   .eq("id", player.id);
                                                 
                                                 if (error) throw error;
                                                 toast.success("Clip moved down");
                                                 fetchPlayers();
                                               } catch (error: any) {
                                                 toast.error("Failed to reorder");
                                               }
                                             }
                                           }}
                                           disabled={index === bestClips.length - 1}
                                           title="Move down"
                                         >
                                           ↓
                                         </Button>
                                         <Button
                                           type="button"
                                           variant="outline"
                                           size="sm"
                                           onClick={() => {
                                             setCurrentPlayerId(player.id);
                                             setEditingHighlightIndex(index);
                                             setHighlightName(highlight.name || "");
                                             setHighlightType('best');
                                             setExistingHighlights(bestClips);
                                             setIsHighlightsDialogOpen(true);
                                           }}
                                           title="Edit"
                                         >
                                           <Edit className="w-3 h-3" />
                                         </Button>
                                         <Button
                                           type="button"
                                           variant="destructive"
                                           size="sm"
                                           onClick={async () => {
                                             const newBestClips = bestClips.filter((_, i) => i !== index);
                                             
                                             try {
                                               // Get current full highlights structure
                                               const parsed = typeof player.highlights === 'string' ? JSON.parse(player.highlights) : player.highlights;
                                               const fullHighlights = Array.isArray(parsed) 
                                                 ? { matchHighlights: parsed, bestClips: newBestClips }
                                                 : { ...parsed, bestClips: newBestClips };
                                               
                                               const { error } = await supabase
                                                 .from("players")
                                                 .update({ highlights: JSON.stringify(fullHighlights) })
                                                 .eq("id", player.id);
                                               
                                               if (error) throw error;
                                               toast.success("Clip deleted");
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
                                   No best clips yet. Click "Add Highlight" to create one.
                                 </p>
                               );
                             })()}
                           </TabsContent>
                          </Tabs>
                        </div>
                     </>
                   )}

                   {showingInvoicesFor === player.id && (
                     <div className="border-t pt-4 space-y-4">
                       <div className="flex items-center justify-between mb-4">
                         <h4 className="text-lg font-semibold">Invoices</h4>
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => {
                             setCurrentInvoicePlayerId(player.id);
                             setEditingInvoiceId(null);
                             setInvoiceFormData({
                               invoice_number: "",
                               invoice_date: "",
                               due_date: "",
                               amount: "",
                               description: "",
                               status: "pending",
                               currency: "EUR",
                             });
                             setIsInvoiceDialogOpen(true);
                           }}
                         >
                           <DollarSign className="w-4 h-4 mr-2" />
                           Add Invoice
                         </Button>
                       </div>
                       
                       {playerInvoices[player.id]?.length > 0 ? (
                         <div className="space-y-2">
                           {playerInvoices[player.id].map((invoice) => (
                             <div key={invoice.id} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/5">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                   <p className="text-sm font-medium">Invoice #{invoice.invoice_number}</p>
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
                                 <p className="text-xs text-muted-foreground">
                                   Date: {new Date(invoice.invoice_date).toLocaleDateString()} | 
                                   Due: {new Date(invoice.due_date).toLocaleDateString()}
                                 </p>
                                 <p className="text-sm font-semibold mt-1">
                                   {invoice.currency} {invoice.amount.toFixed(2)}
                                 </p>
                                 {invoice.description && (
                                   <p className="text-xs text-muted-foreground mt-1">{invoice.description}</p>
                                 )}
                               </div>
                               
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentInvoicePlayerId(player.id);
                                      setEditingInvoiceId(invoice.id);
                                      setInvoiceFormData({
                                        invoice_number: invoice.invoice_number,
                                        invoice_date: invoice.invoice_date,
                                        due_date: invoice.due_date,
                                        amount: invoice.amount.toString(),
                                        description: invoice.description || "",
                                        status: invoice.status,
                                        currency: invoice.currency,
                                      });
                                      setIsInvoiceDialogOpen(true);
                                    }}
                                    title="Edit"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDuplicateInvoice(invoice)}
                                    title="Duplicate"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">
                           No invoices yet. Click "Add Invoice" to create one.
                         </p>
                       )}
                     </div>
                   )}

                   {showingAnalysisFor === player.id && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-xl font-semibold mb-4">Analysis</h4>
                      
                      <Tabs defaultValue="pre-match" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                          <TabsTrigger value="pre-match" className="text-xs sm:text-sm px-2 sm:px-4">
                            <span className="sm:hidden">⚽ Pre</span>
                            <span className="hidden sm:inline">⚽ Pre-Match</span>
                          </TabsTrigger>
                          <TabsTrigger value="post-match" className="text-xs sm:text-sm px-2 sm:px-4">
                            <span className="sm:hidden">📊 Post</span>
                            <span className="hidden sm:inline">📊 Post-Match</span>
                          </TabsTrigger>
                          <TabsTrigger value="performance" className="text-xs sm:text-sm px-2 sm:px-4">
                            <span className="sm:hidden">📈 Perf</span>
                            <span className="hidden sm:inline">📈 Performance</span>
                          </TabsTrigger>
                          <TabsTrigger value="concepts" className="text-xs sm:text-sm px-2 sm:px-4">
                            <span className="sm:hidden">💡 Conc</span>
                            <span className="hidden sm:inline">💡 Concepts</span>
                          </TabsTrigger>
                        </TabsList>

                        {/* Pre-Match Tab */}
                        <TabsContent value="pre-match" className="space-y-4">
                          
                          {availableAnalyses
                            .filter(a => 
                              a.analysis_type === 'pre_match' &&
                              playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                            ).length > 0 ? (
                            <div className="space-y-2">
                              {availableAnalyses
                                .filter(a => 
                                  a.analysis_type === 'pre-match' &&
                                  playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                                )
                                .map((analysis) => (
                                  <Card key={analysis.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            {analysis.home_team} vs {analysis.away_team}
                                          </p>
                                          {analysis.title && (
                                            <p className="text-sm text-muted-foreground">{analysis.title}</p>
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            window.open(`/analysis/${analysis.id}`, '_blank');
                                          }}
                                        >
                                          View Analysis
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No pre-match analyses yet
                            </p>
                          )}
                        </TabsContent>

                        {/* Post-Match Tab */}
                        <TabsContent value="post-match" className="space-y-4">
                          
                          {availableAnalyses
                            .filter(a => 
                              a.analysis_type === 'post-match' &&
                              playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                            ).length > 0 ? (
                            <div className="space-y-2">
                              {availableAnalyses
                                .filter(a => 
                                  a.analysis_type === 'post-match' &&
                                  playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                                )
                                .map((analysis) => (
                                  <Card key={analysis.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            {analysis.home_team} vs {analysis.away_team}
                                          </p>
                                          {analysis.title && (
                                            <p className="text-sm text-muted-foreground">{analysis.title}</p>
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            window.open(`/analysis/${analysis.id}`, '_blank');
                                          }}
                                        >
                                          View Analysis
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No post-match analyses yet
                            </p>
                          )}
                        </TabsContent>

                        {/* Performance Reports Tab */}
                        <TabsContent value="performance" className="space-y-4">
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                setCreateReportPlayerId(player.id);
                                setCreateReportPlayerName(player.name);
                                setEditReportAnalysisId(undefined);
                                setIsCreateReportDialogOpen(true);
                              }}
                              className="flex-shrink-0"
                            >
                              <Plus className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Add Performance Report</span>
                            </Button>
                          </div>
                          
                          {(playerAnalyses[player.id] || []).filter(a => a.r90_score !== null && a.r90_score !== undefined).length > 0 ? (
                            <div className="space-y-2">
                              {(playerAnalyses[player.id] || [])
                                .filter(a => a.r90_score !== null && a.r90_score !== undefined)
                                .map((analysis) => (
                                  <Card key={analysis.id}>
                                    <CardContent className="p-3 sm:p-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(analysis.analysis_date).toLocaleDateString('en-GB')}
                                          </span>
                                          
                                          {analysis.opponent && (
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-sm font-medium truncate">vs {analysis.opponent}</span>
                                              {analysis.result && (
                                                <span className="text-xs text-muted-foreground">{analysis.result}</span>
                                              )}
                                            </div>
                                          )}
                                          
                                          <span className={`${getR90Color(analysis.r90_score)} text-white px-2 sm:px-3 py-1 rounded font-bold text-xs sm:text-sm whitespace-nowrap self-start`}>
                                            R90: {analysis.r90_score?.toFixed(2)}
                                          </span>
                                        </div>
                                        
                                        <div className="flex gap-2 flex-shrink-0">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedAnalysisId(analysis.id);
                                              setSelectedPlayerName(player.name);
                                              setIsPerformanceActionsDialogOpen(true);
                                            }}
                                            className="flex-shrink-0"
                                          >
                                            <FileText className="w-4 h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">View</span>
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                              setCreateReportPlayerId(player.id);
                                              setCreateReportPlayerName(player.name);
                                              setEditReportAnalysisId(analysis.id);
                                              setIsCreateReportDialogOpen(true);
                                            }}
                                            className="flex-shrink-0"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No performance reports yet
                            </p>
                          )}
                        </TabsContent>

                        {/* Concepts Tab */}
                        <TabsContent value="concepts" className="space-y-4">
                          
                          {availableAnalyses
                            .filter(a => 
                              a.analysis_type === 'concept' &&
                              playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                            ).length > 0 ? (
                            <div className="space-y-2">
                              {availableAnalyses
                                .filter(a => 
                                  a.analysis_type === 'concept' &&
                                  playerAnalyses[player.id]?.some(pa => pa.analysis_writer_id === a.id)
                                )
                                .map((analysis) => (
                                  <Card key={analysis.id}>
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="font-medium">
                                            {analysis.concept || analysis.title}
                                          </p>
                                          {analysis.title && analysis.concept && (
                                            <p className="text-sm text-muted-foreground">{analysis.title}</p>
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const linkedAnalysis = playerAnalyses[player.id].find(pa => pa.analysis_writer_id === analysis.id);
                                            if (linkedAnalysis) {
                                              window.open(`/performance/${linkedAnalysis.id}`, '_blank');
                                            }
                                          }}
                                        >
                                          View
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No concepts yet
                            </p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Analysis Dialog */}
      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditingAnalysis ? 'Edit Game' : 'Add New Game'}</DialogTitle>
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
                <Label htmlFor="performance_file">Upload Performance Report (Excel/CSV)</Label>
                <Input
                  id="performance_file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast.info("Performance data will be analyzed by AI to generate R90 score and performance actions");
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Upload match performance data and AI will automatically calculate R90 score and generate performance report
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linked_analysis">Link to Analysis Writer (Optional)</Label>
              <Select value={selectedAnalysisWriterId} onValueChange={setSelectedAnalysisWriterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an analysis to link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableAnalyses.map((analysis) => (
                    <SelectItem key={analysis.id} value={analysis.id}>
                      {analysis.analysis_type === "pre-match"
                        ? `Pre-Match: ${analysis.home_team} vs ${analysis.away_team}`
                        : analysis.analysis_type === "post-match"
                        ? `Post-Match: ${analysis.home_team} vs ${analysis.away_team}`
                        : `Concept: ${analysis.title || analysis.concept}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this performance report to a detailed analysis from Analysis Writer
              </p>
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
              {uploadingFiles ? "Uploading..." : (isEditingAnalysis ? "Update Game" : "Add Game")}
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

      {/* Create Performance Report Dialog */}
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

      {/* Programming Management Dialog */}
      <ProgrammingManagement
        isOpen={isProgrammingDialogOpen}
        onClose={() => setIsProgrammingDialogOpen(false)}
        playerId={selectedProgrammingPlayerId}
        playerName={selectedProgrammingPlayerName}
      />

      {/* Add/Edit Highlight Dialog */}
      <Dialog open={isHighlightsDialogOpen} onOpenChange={(open) => {
        setIsHighlightsDialogOpen(open);
        if (!open) {
          // Clear form when closing
          setHighlightVideoFile(null);
          setHighlightClubLogoFile(null);
          setHighlightName("");
          setHighlightType('match');
          setEditingHighlightIndex(null);
          setExistingHighlights([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingHighlightIndex !== null ? "Edit Highlight" : "Add New Highlight"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!currentPlayerId || !highlightName) return;
            
            // For editing, files are optional
            const isEditing = editingHighlightIndex !== null;
            if (!isEditing && (!highlightVideoFile || !highlightClubLogoFile)) return;
            
            try {
              setUploadingFiles(true);
              
              // Get existing highlights from the player
              const player = players.find(p => p.id === currentPlayerId);
              let highlightsData: any = { matchHighlights: [], bestClips: [] };
              try {
                if (player && player.highlights) {
                  const parsed = typeof player.highlights === 'string' 
                    ? JSON.parse(player.highlights) 
                    : player.highlights;
                  
                  // Handle legacy array format or new object format
                  if (Array.isArray(parsed)) {
                    highlightsData = { matchHighlights: parsed, bestClips: [] };
                  } else {
                    highlightsData = parsed;
                  }
                }
              } catch {
                highlightsData = { matchHighlights: [], bestClips: [] };
              }
              
              let videoUrl = null;
              let logoUrl = null;
              
              // Upload video file if provided
              if (highlightVideoFile) {
                const videoFileName = `${currentPlayerId}_${Date.now()}_${highlightVideoFile.name}`;
                const { error: videoError } = await supabase.storage
                  .from('analysis-files')
                  .upload(`highlights/${videoFileName}`, highlightVideoFile);
                
                if (videoError) throw videoError;
                
                // Get public URL for video
                const { data: { publicUrl } } = supabase.storage
                  .from('analysis-files')
                  .getPublicUrl(`highlights/${videoFileName}`);
                videoUrl = publicUrl;
              }
              
              // Upload club logo file if provided (only for match highlights)
              if (highlightClubLogoFile && highlightType === 'match') {
                const logoFileName = `${currentPlayerId}_${Date.now()}_${highlightClubLogoFile.name}`;
                const { error: logoError } = await supabase.storage
                  .from('analysis-files')
                  .upload(`highlights/logos/${logoFileName}`, highlightClubLogoFile);
                
                if (logoError) throw logoError;
                
                // Get public URL for logo
                const { data: { publicUrl } } = supabase.storage
                  .from('analysis-files')
                  .getPublicUrl(`highlights/logos/${logoFileName}`);
                logoUrl = publicUrl;
              }
              
              // Determine which array to modify based on type
              const targetArray = highlightType === 'match' ? 'matchHighlights' : 'bestClips';
              const currentArray = highlightsData[targetArray] || [];
              let updatedArray: any[] = [];
              
              if (isEditing && editingHighlightIndex < currentArray.length) {
                // Edit existing highlight
                updatedArray = [...currentArray];
                const existingHighlight = updatedArray[editingHighlightIndex];
                
                updatedArray[editingHighlightIndex] = {
                  name: highlightName,
                  videoUrl: videoUrl || existingHighlight.videoUrl,
                  clubLogo: highlightType === 'match' ? (logoUrl || existingHighlight.clubLogo) : undefined,
                  addedAt: existingHighlight.addedAt,
                  updatedAt: new Date().toISOString()
                };
              } else {
                // Add new highlight
                const newHighlight: any = {
                  name: highlightName,
                  videoUrl: videoUrl!,
                  addedAt: new Date().toISOString()
                };
                
                // Only add clubLogo for match highlights
                if (highlightType === 'match') {
                  newHighlight.clubLogo = logoUrl!;
                }
                
                updatedArray = [...currentArray, newHighlight];
              }
              
              // Update the full highlights structure
              const updatedHighlights = {
                ...highlightsData,
                [targetArray]: updatedArray
              };
              
              const { error } = await supabase
                .from("players")
                .update({ highlights: JSON.stringify(updatedHighlights) })
                .eq("id", currentPlayerId);
              
              if (error) throw error;
              
              toast.success(isEditing ? "Highlight updated successfully!" : "Highlight added successfully!");
              setHighlightVideoFile(null);
              setHighlightClubLogoFile(null);
              setHighlightName("");
              setEditingHighlightIndex(null);
              setExistingHighlights([]);
              setIsHighlightsDialogOpen(false);
              fetchPlayers();
            } catch (error: any) {
              console.error("Error saving highlight:", error);
              toast.error(isEditing ? "Failed to update highlight" : "Failed to add highlight");
            } finally {
              setUploadingFiles(false);
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="highlight_type">Type *</Label>
              <Select value={highlightType} onValueChange={(value: 'match' | 'best') => setHighlightType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Match Highlight</SelectItem>
                  <SelectItem value="best">Best Clip</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose whether this is a match highlight or a best clip
              </p>
            </div>
            
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
              <Label htmlFor="highlight_video">
                {highlightType === 'best' ? 'Clip' : 'Highlight Video'} {editingHighlightIndex === null ? "*" : "(optional - leave blank to keep current)"}
              </Label>
              <Input
                id="highlight_video"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
                onChange={(e) => setHighlightVideoFile(e.target.files?.[0] || null)}
                required={editingHighlightIndex === null}
              />
              {editingHighlightIndex !== null && existingHighlights[editingHighlightIndex]?.videoUrl && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Current video:</p>
                  <video 
                    src={existingHighlights[editingHighlightIndex].videoUrl}
                    className="w-40 h-24 object-cover rounded border"
                    muted
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editingHighlightIndex === null 
                  ? "Upload a video file (MP4, MOV, AVI, etc.)" 
                  : "Upload a new video to replace the current one, or leave blank to keep it"}
              </p>
            </div>
            
            {highlightType === 'match' && (
              <div className="space-y-2">
                <Label htmlFor="club_logo">
                  Club Logo {editingHighlightIndex === null ? "*" : "(optional - leave blank to keep current)"}
                </Label>
                <Input
                  id="club_logo"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
                  onChange={(e) => setHighlightClubLogoFile(e.target.files?.[0] || null)}
                  required={editingHighlightIndex === null}
                />
                {editingHighlightIndex !== null && existingHighlights[editingHighlightIndex]?.clubLogo && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Current logo:</p>
                    <img 
                      src={existingHighlights[editingHighlightIndex].clubLogo}
                      alt="Current club logo"
                      className="w-20 h-20 object-contain bg-secondary p-2 rounded border"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {editingHighlightIndex === null
                    ? "Upload a club logo image (PNG, JPG, JPEG, WEBP)"
                    : "Upload a new logo to replace the current one, or leave blank to keep it"}
                </p>
              </div>
            )}
            
            <Button type="submit" disabled={uploadingFiles || !highlightName || (editingHighlightIndex === null && (!highlightVideoFile || (highlightType === 'match' && !highlightClubLogoFile)))}>
              {uploadingFiles ? "Uploading..." : (editingHighlightIndex !== null ? "Update" : `Add ${highlightType === 'best' ? 'Clip' : 'Highlight'}`)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
        setIsInvoiceDialogOpen(open);
        if (!open) {
          setInvoiceFormData({
            invoice_number: "",
            invoice_date: "",
            due_date: "",
            amount: "",
            description: "",
            status: "pending",
            currency: "EUR",
          });
          setEditingInvoiceId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInvoiceId ? "Edit Invoice" : "Add New Invoice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvoiceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={invoiceFormData.invoice_number}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                  placeholder="INV-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceFormData.amount}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                  placeholder="1000.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={invoiceFormData.invoice_date}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceFormData.due_date}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={invoiceFormData.currency} onValueChange={(value) => setInvoiceFormData({ ...invoiceFormData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CZK">CZK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={invoiceFormData.status} onValueChange={(value) => setInvoiceFormData({ ...invoiceFormData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={invoiceFormData.description}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                placeholder="Invoice description or notes..."
                rows={3}
              />
            </div>
            <Button type="submit">
              {editingInvoiceId ? "Update Invoice" : "Create Invoice"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;