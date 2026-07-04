import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { calculateAge } from "@/lib/ageUtils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit, FileText, LineChart, Video, Calendar, Plus, DollarSign, User, Trash2, Eye, TrendingUp, GripVertical, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Image as ImageIcon, X, Download, FileDown, Pencil, Copy, Link, Settings, Search as SearchIcon, Brain, ScrollText } from "lucide-react";
import { StaffSearchInput } from "./StaffSearchInput";
import { matchesQuery } from "@/lib/searchMatch";
import { logActivity } from "@/lib/activityLogger";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { CreatePerformanceReportDialog } from "./CreatePerformanceReportDialog";
import { ProgrammingManagement } from "./ProgrammingManagement";
import { NutritionProgramManagement } from "./NutritionProgramManagement";
import { PlayerFixtures } from "./PlayerFixtures";
import { PlayerImages } from "./PlayerImages";
import { PlayerScoutingManagement } from "./PlayerScoutingManagement";
import { PlaylistManager } from "@/components/PlaylistManager";
import { InlineVideoUpload } from "./InlineVideoUpload";
import { EditHighlightDialog } from "./EditHighlightDialog";
import { UploadPlayerImageDialog } from "./UploadPlayerImageDialog";
import { AddPlayerDialog } from "./AddPlayerDialog";
import { HighlightedMatchForm } from "./HighlightedMatchForm";
import { SyncPlayerStatsButton } from "./SyncPlayerStatsButton";
import { AutoMatchPlayersButton } from "./AutoMatchPlayersButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAYER_POSITIONS } from "@/lib/playerPositions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MarkdownText } from "@/utils/markdownRenderer";
import { Progress } from "@/components/ui/progress";
import { downloadVideo } from "@/lib/videoDownload";
import { PerformanceReportDialog } from "@/components/PerformanceReportDialog";
import { AddTestResultDialog } from "./AddTestResultDialog";
import { PlayerFixtureStats } from "./PlayerFixtureStats";
import { PlayerHudlVisibilityTab, type PlayerHudlVisibilityHandle } from "./PlayerHudlVisibilityTab";
import { PlayerFormConfigTab, type PlayerFormConfigHandle } from "./PlayerFormConfigTab";
import { PlayerContractsTab } from "./PlayerContractsTab";
import { PlayerReferenceImagesUploader } from "./PlayerReferenceImagesUploader";
import { PlayerCategoriesDialog } from "./PlayerCategoriesDialog";
import { PlayerSpqHistory } from "./PlayerSpqHistory";
import { getRepresentationStatusKey, sortPlayersByRepresentation } from "@/lib/playerSorting";

interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  bio: string | null;
  image_url: string | null;
  hover_image_url: string | null;
  email: string | null;
  visible_on_stars_page: boolean;
  highlights: any;
  representation_status: string;
  category?: string | null;
  has_representation_offer?: boolean | null;
  club: string | null;
  club_logo: string | null;
  league: string | null;
  links?: any;
  highlighted_match?: any;
  agent_notes?: string | null;
  next_program_notes?: string | null;
  programming_notes?: string | null;
  portal_language?: string | null;
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
  external_player_id?: string | null;
}

// Convert DD/MM/YYYY or other formats to YYYY-MM-DD for the database
const formatDateForDb = (dateStr: string): string | null => {
  if (!dateStr) return null;
  // Already in YYYY-MM-DD format (from HTML date input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // DD/MM/YYYY format (from bio JSON)
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) return null; // ambiguous, already handled above
  return null;
};

const categoryStatusKey = (name: string): string => {
  const normalised = String(name || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const legacyMap: Record<string, string> = {
    signed: 'represented',
    represented: 'represented',
    mandate: 'mandated',
    mandated: 'mandated',
    'previously mandated': 'previously_mandated',
    'fuel for football': 'fuel_for_football',
    prospect: 'prospect',
    scouted: 'scouted',
    other: 'other',
  };
  return legacyMap[normalised] || normalised.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

const PlayerManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(() => {
    const urlPlayer = searchParams.get('player');
    if (urlPlayer) return urlPlayer;
    try { return localStorage.getItem('staff_last_player') || null; } catch { return null; }
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlTab = searchParams.get('tab');
    return urlTab || "analysis";
  });
  const [playerAnalyses, setPlayerAnalyses] = useState<Record<string, any[]>>({});
  const [playerInvoices, setPlayerInvoices] = useState<Record<string, any[]>>({});
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  // Inline report editor state (replaces dialog)
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [reportEditorPlayerId, setReportEditorPlayerId] = useState<string>("");
  const [reportEditorPlayerName, setReportEditorPlayerName] = useState<string>("");
  const [reportEditorAnalysisId, setReportEditorAnalysisId] = useState<string | undefined>(undefined);
  const [reportEditorInitialType, setReportEditorInitialType] = useState<'player' | 'team'>('player');
  const [showReportTypePicker, setShowReportTypePicker] = useState(false);
  const [isProgrammingDialogOpen, setIsProgrammingDialogOpen] = useState(false);
  const [selectedProgrammingPlayerId, setSelectedProgrammingPlayerId] = useState<string>("");
  const [selectedProgrammingPlayerName, setSelectedProgrammingPlayerName] = useState<string>("");
  const [isNutritionDialogOpen, setIsNutritionDialogOpen] = useState(false);
  const [selectedNutritionPlayerId, setSelectedNutritionPlayerId] = useState<string>("");
  const [selectedNutritionPlayerName, setSelectedNutritionPlayerName] = useState<string>("");
  const [nutritionPrograms, setNutritionPrograms] = useState<Record<string, any[]>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const formConfigRef = useRef<PlayerFormConfigHandle | null>(null);
  const hudlVisibilityRef = useRef<PlayerHudlVisibilityHandle | null>(null);
  const [isEditHighlightOpen, setIsEditHighlightOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<{ highlight: any; type: 'match' | 'best' } | null>(null);
  const [draggedHighlightIndex, setDraggedHighlightIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);
  const [clubLogoPreview, setClubLogoPreview] = useState<string | null>(null);
  const [hoverImageFile, setHoverImageFile] = useState<File | null>(null);
  const [hoverImagePreview, setHoverImagePreview] = useState<string | null>(null);
  
  // Scheme-specific image uploads (indexed by scheme index)
  const [schemePlayerImageFiles, setSchemePlayerImageFiles] = useState<{ [key: number]: File }>({});
  const [schemePlayerImagePreviews, setSchemePlayerImagePreviews] = useState<{ [key: number]: string }>({});
  const [schemeClubLogoFiles, setSchemeClubLogoFiles] = useState<{ [key: number]: File }>({});
  const [schemeClubLogoPreviews, setSchemeClubLogoPreviews] = useState<{ [key: number]: string }>({});
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    email: "",
    position: "",
    age: 0,
    nationality: "",
    representation_status: "",
    has_representation_offer: false,
    visible_on_stars_page: false,
    portal_language: "en",
    image_url: "",
    hover_image_url: "",
    
    // Club Info
    club: "",
    club_logo: "",
    league: "",
    
    // Bio JSON fields
    bioText: "",
    dateOfBirth: "",
    number: "",
    whatsapp: "",
    
    // Arrays
    externalLinks: [] as { label: string; url: string }[],
    strengths: [] as string[],
    tacticalSchemes: [] as {
      formation: string;
      positions: string[];
      teamName: string;
      matches: string | number; // Can be string like "CURRENT CLUB" or number
      clubLogo: string;
      playerImage: string;
    }[],
    seasonStats: [] as { header: string; value: string }[],
    topStats: [] as { label: string; value: string; description?: string }[],
    externalPlayerId: "",
    
    // Separate links field
    links: [] as { label: string; url: string }[],
    
    // Highlighted Match
    highlightedMatch: null as {
      analysis_id?: string | null;
      home_team: string;
      home_team_logo: string;
      away_team: string;
      away_team_logo: string;
      score: string;
      show_score: boolean;
      minutes_played: number;
      match_date: string;
      competition: string;
      selected_stats: string[];
      stats: Record<string, any>;
      video_url: string;
      full_match_url: string;
      r90_report_url: string;
    } | null,
    // AI Identification
    identification_description: "",
    identification_reference_image_url: "",
    identification_reference_images: [] as string[],
    not_to_confuse_with: "",
  });
  const [tacticalAnalyses, setTacticalAnalyses] = useState<Record<string, any[]>>({});
  const [playerPrograms, setPlayerPrograms] = useState<Record<string, any[]>>({});
  const [playerTestResults, setPlayerTestResults] = useState<Record<string, any[]>>({});
  const [otherAnalyses, setOtherAnalyses] = useState<Record<string, any[]>>({});
  const [isAssignAnalysisDialogOpen, setIsAssignAnalysisDialogOpen] = useState(false);
  const [availableAnalyses, setAvailableAnalyses] = useState<any[]>([]);
  const [selectedAnalysesToAssign, setSelectedAnalysesToAssign] = useState<string[]>([]);
  const [analysisSearchQuery, setAnalysisSearchQuery] = useState("");
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { status: 'uploading' | 'success' | 'error', progress: number, error?: string }>>({});
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [bestClipsPage, setBestClipsPage] = useState(1);
  const CLIPS_PER_PAGE = 9;
  const [autoSelectedFromUrl, setAutoSelectedFromUrl] = useState(false);
  const playerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousPlayerIdFromUrl = useRef<string | null>(null);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string; key: string; sort_order: number; is_system: boolean }[]>([]);
  
  // Performance Report Dialog state
  const [performanceReportDialogOpen, setPerformanceReportDialogOpen] = useState(false);
  const [selectedReportAnalysisId, setSelectedReportAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchAllAnalyses();
    fetchAllInvoices();
    fetchTacticalAnalyses();
    fetchAllPrograms();
    fetchAllNutritionPrograms();
    fetchAllTestResults();
    fetchOtherAnalyses();
    fetchAvailableAnalyses();
    fetchCustomCategories();
  }, []);

  const fetchCustomCategories = async () => {
    try {
      const { data } = await (supabase as any)
        .from('player_categories')
        .select('*')
        .order('sort_order');
      setCustomCategories((data || []).map((r: any) => ({ ...r, key: categoryStatusKey(r.name) })));
    } catch (err) {
      console.error('Failed to fetch player categories:', err);
    }
  };

  // Store pending player/tab from URL to apply once players load
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Read player and tab from URL params immediately
  useEffect(() => {
    const playerSlug = searchParams.get('player');
    const tabParam = searchParams.get('tab');
    
    if (playerSlug) {
      setPendingPlayerId(playerSlug);
    }
    if (tabParam) {
      setPendingTab(tabParam);
    }
  }, [searchParams]);

  // Apply pending player selection when players are loaded
  useEffect(() => {
    if (players.length === 0 || !pendingPlayerId) return;
    
    // Only update if the player param actually changed
    if (pendingPlayerId !== previousPlayerIdFromUrl.current) {
      // First try to find by ID (UUID format), then by slug (name-based)
      const player = players.find(p => p.id === pendingPlayerId) || 
                     players.find(p => p.name?.toLowerCase().replace(/\s+/g, '-') === pendingPlayerId);
      
      if (player) {
        setSelectedPlayerId(player.id);
        setAutoSelectedFromUrl(true);
        // Reset pagination when player changes
        setBestClipsPage(1);
      }
      previousPlayerIdFromUrl.current = pendingPlayerId;
    }
    
    // Apply pending tab
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    
    // Clear pending player after applying
    setPendingPlayerId(null);
  }, [players, pendingPlayerId, pendingTab]);

  // Handle player removal from URL
  useEffect(() => {
    const playerSlug = searchParams.get('player');
    if (!playerSlug && previousPlayerIdFromUrl.current) {
      setSelectedPlayerId(null);
      previousPlayerIdFromUrl.current = null;
    }
  }, [searchParams]);

  // Auto-scroll to selected player when they're selected from URL
  useEffect(() => {
    if (selectedPlayerId && autoSelectedFromUrl && playerRefs.current[selectedPlayerId]) {
      const element = playerRefs.current[selectedPlayerId];
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Reset the flag after scrolling
        setTimeout(() => {
          setAutoSelectedFromUrl(false);
        }, 1000);
      }, 100);
    }
  }, [selectedPlayerId, autoSelectedFromUrl]);

  const refreshSelectedPlayer = async () => {
    if (!selectedPlayerId) return;
    
    try {
      const { data: playerData, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", selectedPlayerId)
        .single();

      if (error) throw error;

      // Update only the selected player in the players array
      setPlayers(prev => prev.map(p => p.id === selectedPlayerId ? playerData : p));
    } catch (error: any) {
      console.error("Failed to refresh player:", error);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    try { localStorage.setItem('staff_last_player', playerId); } catch {}
    // Scroll to top when selecting a player since content is at top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMainTabChange = (value: string) => {
    setActiveTab(value);
    
    // Get all current params
    const params = new URLSearchParams();
    searchParams.forEach((paramValue, key) => {
      if (key.startsWith('__lovable')) params.set(key, paramValue);
    });
    params.set('section', 'players');
    
    // Update the tab param
    params.set('tab', value);
    
    // Make sure player param is preserved if we have a selected player
    if (selectedPlayerId) {
      params.set('player', selectedPlayerId);
    }
    
    setSearchParams(params);
  };

  const fetchPlayers = async (preserveSelection = false) => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (playersError) throw playersError;

      setPlayers(sortPlayersByRepresentation(playersData || []));
      
      // Preserve URL parameters if requested
      if (preserveSelection && selectedPlayerId) {
        const currentTab = searchParams.get('tab') || activeTab;
        const params = new URLSearchParams();
        searchParams.forEach((paramValue, key) => {
          if (key.startsWith('__lovable')) params.set(key, paramValue);
        });
        params.set('section', 'players');
        params.set('player', selectedPlayerId);
        params.set('tab', currentTab);
        setSearchParams(params);
      }
      
      // Fetch stats from player_stats table first, then overlay bio seasonStats
      const statsMap: Record<string, PlayerStats> = {};
      
      // 1. Fetch from player_stats table (primary source)
      const playerIds = (playersData || []).map(p => p.id);
      if (playerIds.length > 0) {
        const { data: playerStatsData } = await supabase
          .from('player_stats')
          .select('id, player_id, goals, assists, matches, minutes, clean_sheets, saves, external_player_id')
          .in('player_id', playerIds);
        
        playerStatsData?.forEach(ps => {
          statsMap[ps.player_id] = {
            id: ps.id,
            player_id: ps.player_id,
            goals: ps.goals || 0,
            assists: ps.assists || 0,
            matches: ps.matches || 0,
            minutes: ps.minutes || 0,
            clean_sheets: ps.clean_sheets || null,
            saves: ps.saves || null,
            external_player_id: (ps as any).external_player_id || null,
          };
        });
      }
      
      // 2. Override with bio seasonStats if available (takes priority as manually entered)
      playersData?.forEach(player => {
        try {
          let bioData: any = {};
          if (player.bio) {
            bioData = typeof player.bio === 'string' ? JSON.parse(player.bio) : player.bio;
          }
          
          if (bioData.seasonStats && Array.isArray(bioData.seasonStats)) {
            const seasonStats = bioData.seasonStats;
            const goals = seasonStats.find((s: any) => s.header?.toLowerCase() === 'goals')?.value;
            const assists = seasonStats.find((s: any) => s.header?.toLowerCase() === 'assists')?.value;
            const matches = seasonStats.find((s: any) => s.header?.toLowerCase() === 'matches')?.value;
            const minutes = seasonStats.find((s: any) => s.header?.toLowerCase() === 'minutes')?.value;
            
            // Only override if bio has actual values
            if (goals || assists || matches || minutes) {
              const existing = statsMap[player.id] || { id: player.id, player_id: player.id, goals: 0, assists: 0, matches: 0, minutes: 0, clean_sheets: null, saves: null };
              statsMap[player.id] = {
                ...existing,
                goals: goals ? (parseInt(goals) || 0) : existing.goals,
                assists: assists ? (parseInt(assists) || 0) : existing.assists,
                matches: matches ? (parseInt(matches) || 0) : existing.matches,
                minutes: minutes ? (parseInt(minutes) || 0) : existing.minutes,
              };
            }
          }
        } catch (e) {
          console.warn(`Failed to parse stats for player ${player.name}:`, e);
        }
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

  const fetchTacticalAnalyses = async () => {
    try {
      // Fetch analyses linked via player_analysis.analysis_writer_id
      const { data: playerAnalysisLinks, error: linksError } = await supabase
        .from("player_analysis")
        .select("player_id, analysis_writer_id");

      if (linksError) throw linksError;

      // Fetch analyses tagged to players via analysis_player_tags
      const { data: playerTags, error: tagsError } = await supabase
        .from("analysis_player_tags")
        .select("player_id, analysis_id");

      if (tagsError) throw tagsError;

      const { data: analyses, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (analysesError) throw analysesError;

      const tacticalMap: Record<string, any[]> = {};
      const addedIds: Record<string, Set<string>> = {};

      const addAnalysis = (playerId: string, analysis: any) => {
        if (!addedIds[playerId]) addedIds[playerId] = new Set();
        if (addedIds[playerId].has(analysis.id)) return;
        addedIds[playerId].add(analysis.id);
        if (!tacticalMap[playerId]) tacticalMap[playerId] = [];
        tacticalMap[playerId].push(analysis);
      };

      // Add from player_analysis links
      playerAnalysisLinks?.forEach(link => {
        if (link.analysis_writer_id) {
          const analysis = analyses?.find(a => a.id === link.analysis_writer_id);
          if (analysis) addAnalysis(link.player_id, analysis);
        }
      });

      // Add from analysis_player_tags
      playerTags?.forEach(tag => {
        const analysis = analyses?.find(a => a.id === tag.analysis_id);
        if (analysis) addAnalysis(tag.player_id, analysis);
      });

      setTacticalAnalyses(tacticalMap);
    } catch (error: any) {
      toast.error("Failed to fetch tactical analyses: " + error.message);
    }
  };

  const fetchAllPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("player_programs")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      const programsMap: Record<string, any[]> = {};
      data?.forEach(program => {
        if (!programsMap[program.player_id]) {
          programsMap[program.player_id] = [];
        }
        programsMap[program.player_id].push(program);
      });
      setPlayerPrograms(programsMap);
    } catch (error: any) {
      toast.error("Failed to fetch programs: " + error.message);
    }
  };

  const fetchAllNutritionPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("player_nutrition_programs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const programsMap: Record<string, any[]> = {};
      data?.forEach(program => {
        if (!programsMap[program.player_id]) {
          programsMap[program.player_id] = [];
        }
        programsMap[program.player_id].push(program);
      });
      setNutritionPrograms(programsMap);
    } catch (error: any) {
      console.error("Failed to fetch nutrition programs:", error.message);
    }
  };

  const fetchAllTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from("player_test_results")
        .select("*")
        .order("test_date", { ascending: false });

      if (error) throw error;

      const resultsMap: Record<string, any[]> = {};
      data?.forEach(result => {
        if (!resultsMap[result.player_id]) {
          resultsMap[result.player_id] = [];
        }
        resultsMap[result.player_id].push(result);
      });
      setPlayerTestResults(resultsMap);
    } catch (error: any) {
      console.error("Failed to fetch test results:", error.message);
    }
  };

  const fetchOtherAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("player_other_analysis")
        .select(`
          id,
          player_id,
          assigned_at,
          analysis:coaching_analysis (
            id,
            title,
            description,
            content,
            category
          )
        `)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      const otherMap: Record<string, any[]> = {};
      data?.forEach(item => {
        if (!otherMap[item.player_id]) {
          otherMap[item.player_id] = [];
        }
        otherMap[item.player_id].push(item);
      });
      setOtherAnalyses(otherMap);
    } catch (error: any) {
      toast.error("Failed to fetch other analyses: " + error.message);
    }
  };

  const fetchAvailableAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("coaching_analysis")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailableAnalyses(data || []);
    } catch (error: any) {
      console.error("Failed to fetch available analyses:", error);
    }
  };

  const handleAssignAnalysis = async () => {
    if (!selectedPlayerId || selectedAnalysesToAssign.length === 0) return;

    try {
      // Check for existing assignments to avoid duplicates
      const { data: existingAssignments } = await supabase
        .from("player_other_analysis")
        .select("analysis_id")
        .eq("player_id", selectedPlayerId)
        .in("analysis_id", selectedAnalysesToAssign);

      const existingIds = new Set(existingAssignments?.map(a => a.analysis_id) || []);
      const newAnalysesToAssign = selectedAnalysesToAssign.filter(id => !existingIds.has(id));

      if (newAnalysesToAssign.length === 0) {
        toast.error("All selected analyses are already assigned to this player");
        return;
      }

      const inserts = newAnalysesToAssign.map(analysisId => ({
        player_id: selectedPlayerId,
        analysis_id: analysisId
      }));

      const { error } = await supabase
        .from("player_other_analysis")
        .insert(inserts);

      if (error) throw error;

      const skippedCount = selectedAnalysesToAssign.length - newAnalysesToAssign.length;
      if (skippedCount > 0) {
        toast.success(`${newAnalysesToAssign.length} assigned (${skippedCount} already assigned)`);
      } else {
        toast.success(`${newAnalysesToAssign.length} analysis/analyses assigned successfully`);
      }
      setIsAssignAnalysisDialogOpen(false);
      setSelectedAnalysesToAssign([]);
      setAnalysisSearchQuery("");
      fetchOtherAnalyses();
    } catch (error: any) {
      toast.error("Failed to assign analysis: " + error.message);
    }
  };

  const handleUnassignAnalysis = async (assignmentId: string) => {
    if (!confirm("Remove this analysis from the player?")) return;

    try {
      const { error } = await supabase
        .from("player_other_analysis")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Analysis removed");
      fetchOtherAnalyses();
    } catch (error: any) {
      toast.error("Failed to remove analysis: " + error.message);
    }
  };

  const parseBioJSON = (bioString: string | null) => {
    if (!bioString) return null;
    try {
      const parsed = JSON.parse(bioString);
      return parsed;
    } catch {
      // If it's not JSON, return as plain text
      return { text: bioString };
    }
  };

  const reconstructBioJSON = (customTacticalSchemes?: any[], fd: any = formData) => {
    const bio: any = {
      bio: fd.bioText, // Use 'bio' key to match existing structure
      dateOfBirth: fd.dateOfBirth || undefined,
      number: fd.number || undefined,
      whatsapp: fd.whatsapp || undefined,
      currentClub: fd.club || undefined,
      currentClubLogo: fd.club_logo || undefined,
    };

    if (fd.externalLinks.length > 0) {
      bio.externalLinks = fd.externalLinks;
    }

    if (fd.strengths.length > 0) {
      bio.strengthsAndPlayStyle = fd.strengths;
    }

    const schemesToUse = customTacticalSchemes || fd.tacticalSchemes;
    if (schemesToUse.length > 0) {
      bio.schemeHistory = schemesToUse; // Use 'schemeHistory' to match existing structure
    }

    if (fd.seasonStats.length > 0) {
      bio.seasonStats = fd.seasonStats;
    }

    if (fd.topStats.length > 0) {
      bio.topStats = fd.topStats;
    }

    // Remove undefined fields
    Object.keys(bio).forEach(key => {
      if (bio[key] === undefined) delete bio[key];
    });

    return JSON.stringify(bio);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setImageFile(null);
    setImagePreview(null);
    setHoverImageFile(null);
    setHoverImagePreview(null);
    setSchemePlayerImageFiles({});
    setSchemePlayerImagePreviews({});
    setSchemeClubLogoFiles({});
    setSchemeClubLogoPreviews({});
    
    // Parse bio JSON
    const bioData = parseBioJSON(player.bio);
    
    // Parse links JSON
    let linksArray: { label: string; url: string }[] = [];
    if (player.links && Array.isArray(player.links)) {
      linksArray = player.links;
    }

    setFormData({
      // Basic Info
      name: player.name,
      email: player.email || "",
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      representation_status: player.representation_status || "",
      has_representation_offer: Boolean((player as any).has_representation_offer),
      visible_on_stars_page: player.visible_on_stars_page || false,
      portal_language: player.portal_language || "en",
      image_url: player.image_url || "",
      hover_image_url: player.hover_image_url || "",
      
      // Club Info - read from player table OR bio JSON
      club: player.club || bioData?.currentClub || "",
      club_logo: player.club_logo || bioData?.currentClubLogo || "",
      league: player.league || "",
      
      // Bio JSON fields - handle both 'bio' and 'text' keys
      bioText: bioData?.bio || bioData?.text || "",
      dateOfBirth: bioData?.dateOfBirth || "",
      number: bioData?.number?.toString() || "",
      whatsapp: bioData?.whatsapp || "",
      
      // Arrays from bio - ensure proper structure with defaults
      externalLinks: Array.isArray(bioData?.externalLinks) ? bioData.externalLinks : [],
      strengths: Array.isArray(bioData?.strengthsAndPlayStyle) ? bioData.strengthsAndPlayStyle : [],
      tacticalSchemes: (Array.isArray(bioData?.tacticalFormations) ? bioData.tacticalFormations : 
                          Array.isArray(bioData?.schemeHistory) ? bioData.schemeHistory : []).map(f => ({
        formation: f?.formation || "",
        positions: Array.isArray(f?.positions) ? f.positions : [],
        teamName: f?.teamName || "",
        matches: f?.matches || 0, // Keep as-is, can be string or number
        clubLogo: f?.clubLogo || "",
        playerImage: f?.playerImage || "",
      })),
      seasonStats: Array.isArray(bioData?.seasonStats) ? bioData.seasonStats : [],
      topStats: Array.isArray(bioData?.topStats) ? bioData.topStats : [],
      externalPlayerId: stats[player.id]?.external_player_id || "",
      
      // Separate links field
      links: linksArray,
      
      // Highlighted Match
      highlightedMatch: player.highlighted_match || null,
      // AI Identification
      identification_description: (player as any).identification_description || "",
      identification_reference_image_url: (player as any).identification_reference_image_url || "",
      identification_reference_images: Array.isArray((player as any).identification_reference_images)
        ? (player as any).identification_reference_images
        : [],
      not_to_confuse_with: (player as any).not_to_confuse_with || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleReorderHighlights = async (playerId: string, type: 'match' | 'best', fromIndex: number, toIndex: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const highlights = typeof player.highlights === 'string' 
      ? JSON.parse(player.highlights) 
      : player.highlights || {};
    
    const targetArray = type === 'match' ? 'matchHighlights' : 'bestClips';
    const items = [...(highlights[targetArray] || [])];
    
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    
    const updatedHighlights = {
      ...highlights,
      [targetArray]: items
    };

    // Optimistically update local state
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, highlights: updatedHighlights } : p
    ));

    const { error } = await supabase
      .from('players')
      .update({ highlights: updatedHighlights })
      .eq('id', playerId);

    if (error) {
      toast.error('Failed to reorder highlights');
      console.error(error);
      // Revert on error
      fetchPlayers(true);
    } else {
      toast.success('Highlights reordered');
    }
  };

  const handleDeleteHighlight = async (playerId: string, type: 'match' | 'best', index: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const highlights = typeof player.highlights === 'string' 
      ? JSON.parse(player.highlights) 
      : player.highlights || {};
    
    const targetArray = type === 'match' ? 'matchHighlights' : 'bestClips';
    const items = [...(highlights[targetArray] || [])];
    
    // Remove the item at the specified index
    items.splice(index, 1);
    
    const updatedHighlights = {
      ...highlights,
      [targetArray]: items
    };

    // Optimistically update local state
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, highlights: updatedHighlights } : p
    ));

    const { error } = await supabase
      .from('players')
      .update({ highlights: updatedHighlights })
      .eq('id', playerId);

    if (error) {
      toast.error('Failed to delete highlight');
      console.error(error);
      // Revert on error
      fetchPlayers(true);
    } else {
      toast.success('Highlight deleted');
    }
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const handleClubLogoSelect = (file: File) => {
    setClubLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setClubLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveClubLogo = () => {
    setClubLogoFile(null);
    setClubLogoPreview(null);
    setFormData(prev => ({ ...prev, club_logo: "" }));
  };

  const handleSchemePlayerImageSelect = (file: File, schemeIndex: number) => {
    setSchemePlayerImageFiles(prev => ({ ...prev, [schemeIndex]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setSchemePlayerImagePreviews(prev => ({ ...prev, [schemeIndex]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSchemePlayerImage = (schemeIndex: number) => {
    setSchemePlayerImageFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[schemeIndex];
      return newFiles;
    });
    setSchemePlayerImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[schemeIndex];
      return newPreviews;
    });
    const newSchemes = [...formData.tacticalSchemes];
    newSchemes[schemeIndex].playerImage = "";
    setFormData({ ...formData, tacticalSchemes: newSchemes });
  };

  const handleSchemeClubLogoSelect = (file: File, schemeIndex: number) => {
    setSchemeClubLogoFiles(prev => ({ ...prev, [schemeIndex]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setSchemeClubLogoPreviews(prev => ({ ...prev, [schemeIndex]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSchemeClubLogo = (schemeIndex: number) => {
    setSchemeClubLogoFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[schemeIndex];
      return newFiles;
    });
    setSchemeClubLogoPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[schemeIndex];
      return newPreviews;
    });
    const newSchemes = [...formData.tacticalSchemes];
    newSchemes[schemeIndex].clubLogo = "";
    setFormData({ ...formData, tacticalSchemes: newSchemes });
  };

  const handleHoverImageSelect = (file: File) => {
    setHoverImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setHoverImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveHoverImage = () => {
    setHoverImageFile(null);
    setHoverImagePreview(null);
    setFormData({ ...formData, hover_image_url: "" });
  };

  const handleAddPlayer = async (e: React.FormEvent, submittedData?: any) => {
    e.preventDefault();
    // AddPlayerDialog now owns its own local state and passes the latest
    // values directly so we don't read stale `formData` from React state.
    const fd = submittedData ?? formData;

    try {
      // Upload image if selected
      let finalImageUrl = fd.image_url;
      if (imageFile) {
        const imageFileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: imageError } = await supabase.storage
          .from('analysis-files')
          .upload(`player-images/${imageFileName}`, imageFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (imageError) {
          toast.error('Failed to upload image');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`player-images/${imageFileName}`);
        finalImageUrl = publicUrl;
      }

      // Upload club logo if selected
      let finalClubLogoUrl = fd.club_logo;
      if (clubLogoFile) {
        const logoFileName = `${Date.now()}_logo_${clubLogoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: logoError } = await supabase.storage
          .from('analysis-files')
          .upload(`club-logos/${logoFileName}`, clubLogoFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (logoError) {
          toast.error('Failed to upload club logo');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`club-logos/${logoFileName}`);
        finalClubLogoUrl = publicUrl;
      }

      // Upload hover image if selected
      let finalHoverImageUrl = fd.hover_image_url;
      if (hoverImageFile) {
        const hoverFileName = `${Date.now()}_hover_${hoverImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: hoverError } = await supabase.storage
          .from('analysis-files')
          .upload(`player-images/${hoverFileName}`, hoverImageFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (hoverError) {
          toast.error('Failed to upload hover image');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`player-images/${hoverFileName}`);
        finalHoverImageUrl = publicUrl;
      }

      const bioJSON = reconstructBioJSON(undefined, fd);
      const { data: { user: _currentUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("players")
        .insert({
          name: fd.name,
          email: fd.email || null,
          position: fd.position,
          club: fd.club || null,
          club_logo: finalClubLogoUrl || null,
          league: fd.league || null,
          age: calculateAge(formatDateForDb(fd.dateOfBirth) || null) || fd.age || 0,
          nationality: fd.nationality,
          bio: bioJSON,
          image_url: finalImageUrl || null,
          hover_image_url: finalHoverImageUrl || null,
          representation_status: fd.representation_status || 'other',
          has_representation_offer: fd.has_representation_offer,
          visible_on_stars_page: fd.visible_on_stars_page,
          links: fd.links.length > 0 ? fd.links : null,
          date_of_birth: formatDateForDb(fd.dateOfBirth) || null,
          created_by: _currentUser?.id || null,
        } as any);

      if (error) throw error;

      toast.success("Player added successfully");
      logActivity({ action: 'created', entityType: 'player', entityName: fd.name });
      setIsAddPlayerDialogOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setClubLogoFile(null);
      setClubLogoPreview(null);
      setHoverImageFile(null);
      setHoverImagePreview(null);
      fetchPlayers();
    } catch (error: any) {
      toast.error("Failed to add player: " + error.message);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      // Upload new image if selected
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        const imageFileName = `${editingPlayer.id}_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: imageError } = await supabase.storage
          .from('analysis-files')
          .upload(`player-images/${imageFileName}`, imageFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (imageError) {
          toast.error('Failed to upload image');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`player-images/${imageFileName}`);
        finalImageUrl = publicUrl;
      }

      // Upload new club logo if selected
      let finalClubLogoUrl = formData.club_logo;
      if (clubLogoFile) {
        const logoFileName = `${editingPlayer.id}_${Date.now()}_logo_${clubLogoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: logoError } = await supabase.storage
          .from('analysis-files')
          .upload(`club-logos/${logoFileName}`, clubLogoFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (logoError) {
          toast.error('Failed to upload club logo');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('analysis-files')
          .getPublicUrl(`club-logos/${logoFileName}`);
        finalClubLogoUrl = publicUrl;
      }

      // Upload new hover image if selected
      let finalHoverImageUrl = formData.hover_image_url;
      if (hoverImageFile) {
        const hoverFileName = `${editingPlayer.id}_${Date.now()}_hover_${hoverImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: hoverError } = await supabase.storage
          .from('analysis-files')
          .upload(`player-images/${hoverFileName}`, hoverImageFile, {
            cacheControl: '31536000',
            upsert: false
          });

        if (hoverError) {
          toast.error('Failed to upload hover image');
          return;
        }

      const { data: { publicUrl } } = supabase.storage
        .from('analysis-files')
        .getPublicUrl(`player-images/${hoverFileName}`);
      finalHoverImageUrl = publicUrl;
    }

    // Upload scheme-specific images
    const updatedSchemes = [...formData.tacticalSchemes];
    
    for (let i = 0; i < updatedSchemes.length; i++) {
      // Upload scheme player image if selected
      if (schemePlayerImageFiles[i]) {
        const schemePlayerFileName = `${editingPlayer.id}_scheme${i}_${Date.now()}_${schemePlayerImageFiles[i].name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: schemePlayerError } = await supabase.storage
          .from('analysis-files')
          .upload(`player-images/${schemePlayerFileName}`, schemePlayerImageFiles[i], {
            cacheControl: '31536000',
            upsert: false
          });

        if (!schemePlayerError) {
          const { data: { publicUrl } } = supabase.storage
            .from('analysis-files')
            .getPublicUrl(`player-images/${schemePlayerFileName}`);
          updatedSchemes[i].playerImage = publicUrl;
        }
      }

      // Upload scheme club logo if selected
      if (schemeClubLogoFiles[i]) {
        const schemeLogoFileName = `${editingPlayer.id}_scheme${i}_logo_${Date.now()}_${schemeClubLogoFiles[i].name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: schemeLogoError } = await supabase.storage
          .from('analysis-files')
          .upload(`club-logos/${schemeLogoFileName}`, schemeClubLogoFiles[i], {
            cacheControl: '31536000',
            upsert: false
          });

        if (!schemeLogoError) {
          const { data: { publicUrl } } = supabase.storage
            .from('analysis-files')
            .getPublicUrl(`club-logos/${schemeLogoFileName}`);
          updatedSchemes[i].clubLogo = publicUrl;
        }
      }
    }

    // Update formData with uploaded scheme images before reconstructing bioJSON
    const updatedFormData = { ...formData, tacticalSchemes: updatedSchemes };
    setFormData(updatedFormData);

    const bioJSON = reconstructBioJSON(updatedSchemes);
      
      const { error } = await supabase
        .from("players")
        .update({
          name: formData.name,
          email: formData.email || null,
          position: formData.position,
          club: formData.club || null,
          club_logo: finalClubLogoUrl || null,
          league: formData.league || null,
          age: calculateAge(formatDateForDb(formData.dateOfBirth) || null) || formData.age || 0,
          nationality: formData.nationality,
          bio: bioJSON,
          image_url: finalImageUrl || null,
          hover_image_url: finalHoverImageUrl || null,
          representation_status: formData.representation_status || null,
          has_representation_offer: formData.has_representation_offer,
          visible_on_stars_page: formData.visible_on_stars_page,
          links: formData.links.length > 0 ? formData.links : null,
          highlighted_match: formData.highlightedMatch || null,
          portal_language: formData.portal_language || "en",
          date_of_birth: formatDateForDb(formData.dateOfBirth) || null,
          identification_description: formData.identification_description || null,
          identification_reference_image_url: formData.identification_reference_image_url || null,
          identification_reference_images: formData.identification_reference_images || [],
          not_to_confuse_with: formData.not_to_confuse_with || null,
        } as any)
        .eq("id", editingPlayer.id);

      if (error) throw error;

      // Save external player ID to player_stats
      if (formData.externalPlayerId !== undefined) {
        const existingStats = stats[editingPlayer.id];
        if (existingStats) {
          await supabase
            .from('player_stats')
            .update({ external_player_id: formData.externalPlayerId || null })
            .eq('id', existingStats.id);
        } else {
          await supabase
            .from('player_stats')
            .insert({
              player_id: editingPlayer.id,
              external_player_id: formData.externalPlayerId || null,
              goals: 0, assists: 0, matches: 0, minutes: 0,
            });
        }
      }

      // Also persist Form and Hudl tab configs alongside the main save
      const formSaved = await formConfigRef.current?.saveNow();
      const hudlSaved = await hudlVisibilityRef.current?.saveNow();
      if (formSaved === false || hudlSaved === false) {
        toast.error("Player saved, but Form or Hudl settings failed to save");
        return;
      }
      toast.success("Player updated successfully");
      setIsEditDialogOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setClubLogoFile(null);
      setClubLogoPreview(null);
      setHoverImageFile(null);
      setHoverImagePreview(null);
      setSchemePlayerImageFiles({});
      setSchemePlayerImagePreviews({});
      setSchemeClubLogoFiles({});
      setSchemeClubLogoPreviews({});
      fetchPlayers(true);
    } catch (error: any) {
      toast.error("Failed to update player: " + error.message);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  
  // Parse seasonStats from bio field (same as PlayerDetail does)
  const getSeasonStats = (player: Player | undefined) => {
    if (!player?.bio) return null;
    try {
      const bioData = typeof player.bio === 'string' ? JSON.parse(player.bio) : player.bio;
      return bioData.seasonStats || null;
    } catch {
      return null;
    }
  };
  
  const selectedPlayerSeasonStats = selectedPlayer ? getSeasonStats(selectedPlayer) : null;

  const canonicalCategorySections = [
    { id: 'represented', name: 'Signed', key: 'represented', sort_order: 10, is_system: true },
    { id: 'mandated', name: 'Mandate', key: 'mandated', sort_order: 20, is_system: true },
    { id: 'fuel_for_football', name: 'Fuel For Football', key: 'fuel_for_football', sort_order: 30, is_system: true },
    { id: 'previously_mandated', name: 'Previously Mandated', key: 'previously_mandated', sort_order: 40, is_system: true },
    { id: 'prospect', name: 'Prospect', key: 'prospect', sort_order: 50, is_system: true },
    { id: 'other', name: 'Other', key: 'other', sort_order: 60, is_system: true },
    { id: 'scouted', name: 'Scouted', key: 'scouted', sort_order: 70, is_system: true },
  ];
  const canonicalCategoryKeys = new Set(canonicalCategorySections.map(c => c.key));
  const customCategorySections = customCategories
    .map(c => ({ ...c, key: c.key || categoryStatusKey(c.name) }))
    .filter(c => !canonicalCategoryKeys.has(c.key));
  const categorySections = [...canonicalCategorySections, ...customCategorySections];

  // Group players directly from the managed Player Categories settings
  const _searchedPlayers = playerSearchTerm.trim()
    ? players.filter(p => matchesQuery(playerSearchTerm, [p.name]))
    : players;
  const getPlayerGroupKey = (player: Player) => {
    const statusKey = getRepresentationStatusKey(player.representation_status);
    if (canonicalCategoryKeys.has(statusKey)) return statusKey;
    return 'other';
  };
  const groupedPlayers = categorySections.map(category => ({
    ...category,
    players: sortPlayersByRepresentation(_searchedPlayers.filter(p => getPlayerGroupKey(p) === category.key)),
  }));
  const visibleCategoryGroups = groupedPlayers.filter(group => group.players.length > 0);

  // State for collapsed sections - other, scouted, fuel_for_football, prospect collapsed by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    other: true,
    scouted: true,
    fuel_for_football: true,
    prospect: true,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading players...</div>;
  }

  const renderPlayerCard = (player: Player) => {
    const playerStats = stats[player.id];
    return (
      <Card key={player.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handlePlayerSelect(player.id)}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="w-16 h-16">
              <AvatarImage src={player.image_url || undefined} alt={player.name} className="object-cover" />
              <AvatarFallback>{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" title={player.name}>{player.name}</h3>
              <p className="text-sm text-muted-foreground">{player.position}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{player.age}y</span>
                <span>•</span>
                <span>{player.nationality}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {player.club && (
            <div className="flex items-center gap-2 text-sm mb-3">
              {player.club_logo && <img src={player.club_logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-muted-foreground truncate">{player.club}</span>
            </div>
          )}
          {playerStats && (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-semibold text-lg">{playerStats.matches || 0}</div>
                <div className="text-muted-foreground">Matches</div>
              </div>
              <div>
                <div className="font-semibold text-lg">{playerStats.minutes || 0}</div>
                <div className="text-muted-foreground">Minutes</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-full gap-4 flex-col md:flex-row">
      {/* Mobile Player Selector */}
      <div className="md:hidden px-3 pb-3">
        <Select value={selectedPlayerId || undefined} onValueChange={handlePlayerSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a player" />
          </SelectTrigger>
          <SelectContent>
            {visibleCategoryGroups.map((group) => (
              <div key={group.key}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {group.name}
                </div>
                {group.players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Inner Player Sidebar */}
      <div className="hidden md:flex w-20 flex-col gap-2 overflow-y-auto border-r pr-2">
        {visibleCategoryGroups.map((group, groupIndex) => (
          <div key={group.key} className="contents">
            {groupIndex > 0 && <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent my-2" />}
            {group.players.map((player) => (
              <button
                key={player.id}
                ref={(el) => (playerRefs.current[player.id] = el)}
                onClick={() => handlePlayerSelect(player.id)}
                className={`relative group transition-all ${
                  selectedPlayerId === player.id 
                    ? 'opacity-100 ring-2 ring-primary' 
                    : 'opacity-40 hover:opacity-70'
                } ${autoSelectedFromUrl && selectedPlayerId === player.id ? 'animate-pulse' : ''}`}
                title={`${group.name}: ${player.name}`}
              >
                <Avatar className="w-14 h-14">
                  <AvatarImage src={player.image_url || undefined} alt={player.name} className="object-cover" />
                  <AvatarFallback className="text-xs">{(player.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}</AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
      {!selectedPlayerId ? (
          <div className="space-y-6 px-3 md:px-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Players</h2>
              <div className="flex items-center gap-2">
                <div className="relative hidden md:block">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    placeholder="Search players…"
                    className="h-9 w-56 pl-7 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  title="Manage player categories"
                  onClick={() => setIsCategoriesDialogOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <AutoMatchPlayersButton onComplete={fetchPlayers} />
                <SyncPlayerStatsButton onSynced={fetchPlayers} />
                <Button onClick={() => {
                  setFormData({
                    name: "",
                    email: "",
                    position: "",
                    age: 18,
                    nationality: "",
                    representation_status: "other",
                    has_representation_offer: false,
                    visible_on_stars_page: false,
                    portal_language: "en",
                    image_url: "",
                    hover_image_url: "",
                    club: "",
                    club_logo: "",
                    league: "",
                    bioText: "",
                    dateOfBirth: "",
                    number: "",
                    whatsapp: "",
                    externalLinks: [],
                    strengths: [],
                    tacticalSchemes: [],
                    seasonStats: [],
                    topStats: [],
                    externalPlayerId: "",
                    links: [],
                    highlightedMatch: null,
                    identification_description: "",
                    identification_reference_image_url: "",
                    identification_reference_images: [],
                    not_to_confuse_with: "",
                  });
                  setIsAddPlayerDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </div>
            </div>

            {visibleCategoryGroups.map((group, index) => {
              const defaultExpanded = index < 4 && !['other', 'scouted'].includes(group.key);
              const isCollapsed = collapsedSections[group.key] ?? !defaultExpanded;
              return (
                <div key={group.key} className="space-y-4">
                  {index > 0 && <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full" />}
                  <button
                    className="flex items-center gap-2 text-lg font-semibold text-primary hover:opacity-80 transition-opacity"
                    onClick={() => toggleSection(group.key)}
                  >
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    {group.name} ({group.players.length})
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {group.players.map(renderPlayerCard)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !selectedPlayer ? (
          // Player selected but not found (loading or invalid)
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading player data...
          </div>
        ) : (
          // Player Detail View
          <div className="space-y-4 md:space-y-6">
            {/* Player Header */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 md:gap-4">
                    <Avatar className="w-14 h-14 md:w-20 md:h-20 flex-shrink-0">
                      <AvatarImage src={selectedPlayer?.image_url || undefined} alt={selectedPlayer?.name} className="object-cover" />
                      <AvatarFallback className="text-lg md:text-2xl">
                        {(selectedPlayer?.name || '').split(' ').filter(n => n).map(n => n[0]).join('') || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl md:text-3xl font-bold truncate">{selectedPlayer?.name}</h2>
                      <p className="text-muted-foreground text-sm md:text-lg">{selectedPlayer?.position}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">
                        <span>{selectedPlayer?.age} years</span>
                        <span>•</span>
                        <span className="truncate">{selectedPlayer?.nationality}</span>
                        {selectedPlayer?.club && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1 truncate">
                              {selectedPlayer.club_logo && (
                                <img src={selectedPlayer.club_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className="truncate">{selectedPlayer.club}</span>
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
                      className="flex-1 h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                    {selectedPlayer?.email ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const email = selectedPlayer!.email!;
                            localStorage.removeItem("player_email");
                            sessionStorage.removeItem("player_email");
                            localStorage.setItem("player_email", email);
                            sessionStorage.setItem("player_email", email);
                            localStorage.setItem("player_login_timestamp", Date.now().toString());
                            window.open(`${window.location.origin}/portal?staff_login=${encodeURIComponent(email)}`, '_blank');
                          }}
                          className="flex-1 h-8 md:h-9 text-xs md:text-sm"
                        >
                          <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                          <span className="hidden md:inline">Portal</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const loginUrl = `${window.location.origin}/portal?staff_login=${encodeURIComponent(selectedPlayer!.email!)}`;
                            navigator.clipboard.writeText(loginUrl).then(() => {
                              toast.success("Login link copied to clipboard");
                            }).catch(() => {
                              toast.error("Failed to copy link");
                            });
                          }}
                          className="h-8 w-8 md:h-9 md:w-9 p-0 shrink-0"
                          title="Copy login link"
                        >
                          <Link className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </>
                    ) : null}
                    {selectedPlayer?.has_representation_offer && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const slug = selectedPlayer!.name.toLowerCase().replace(/\s+/g, '-');
                          window.open(`${window.location.origin}/risewithus/${slug}`, '_blank');
                        }}
                        className="flex-1 h-8 md:h-9 text-xs md:text-sm"
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">Rise With Us</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPlayerId(null)}
                      className="flex-1 h-8 md:h-9 text-xs md:text-sm"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {(() => {
                  // Always prioritize the actual seasonStats from bio data
                  if (selectedPlayerSeasonStats && selectedPlayerSeasonStats.length > 0) {
                    return (
                      <div className={`grid gap-2 sm:gap-4 text-center ${
                        selectedPlayerSeasonStats.length <= 2 ? 'grid-cols-2' : 
                        selectedPlayerSeasonStats.length === 3 ? 'grid-cols-3' : 
                        selectedPlayerSeasonStats.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
                        'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
                      }`}>
                        {selectedPlayerSeasonStats.map((stat: any, idx: number) => (
                          <div key={idx} className="p-2 sm:p-4 bg-secondary/30 rounded-lg">
                            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{stat.value || "0"}</div>
                            <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">{stat.header}</div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No season stats available</p>
                      </div>
                    );
                  }
                })()}
              </CardContent>
            </Card>

            {/* Tabbed Sections */}
            <Tabs value={activeTab} onValueChange={handleMainTabChange} className="w-full mt-4">
              {/* Mobile Dropdown */}
              <div className="md:hidden mb-4 relative z-20">
                <Select value={activeTab} onValueChange={handleMainTabChange}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="analysis">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4" />
                        <span>Analysis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="programming">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Programs</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="highlights">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Videos</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fixtures">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Fixtures</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="invoices">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Invoices</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="contracts">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4" />
                        <span>Contracts</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop Tabs */}
              <TabsList className="hidden md:grid md:grid-cols-6 w-full gap-1.5 bg-sidebar-accent/50 backdrop-blur-sm rounded-lg p-1.5 mb-4">
                <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LineChart className="w-4 h-4 flex-shrink-0" />
                  <span>Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="programming" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>Programs</span>
                </TabsTrigger>
                <TabsTrigger value="highlights" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Video className="w-4 h-4 flex-shrink-0" />
                  <span>Videos</span>
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Fixtures</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span>Invoices</span>
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ScrollText className="w-4 h-4 flex-shrink-0" />
                  <span>Contracts</span>
                </TabsTrigger>
              </TabsList>

              {/* Analysis with nested tabs */}
              <TabsContent value="analysis" className="mt-4 md:mt-0 md:pt-0">
                <Tabs defaultValue="performance" className="w-full">
                  <TabsList className="flex flex-col md:grid md:grid-cols-5 w-full gap-2 bg-muted/20 rounded-lg p-2 mb-[60px] md:mb-4">
                    <TabsTrigger value="performance" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Performance Reports</TabsTrigger>
                    <TabsTrigger value="player-data" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Player Data</TabsTrigger>
                    <TabsTrigger value="tactical" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Tactical Analysis</TabsTrigger>
                    <TabsTrigger value="other" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Other Analysis</TabsTrigger>
                    <TabsTrigger value="scouting" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Scouting Reports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="mt-0">
                    <Card>
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <CardTitle className="hidden md:block text-lg">Performance Reports</CardTitle>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => setShowReportTypePicker(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            New Report
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {playerAnalyses[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-3">
                            {playerAnalyses[selectedPlayerId].map((analysis) => {
                              const getR90ColorClass = (score: number) => {
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

                              return (
                                <div
                                  key={analysis.id}
                                  className="rounded-lg overflow-hidden text-white flex flex-col md:flex-row md:items-stretch"
                                >
                                  {/* R90 Score - Horizontal on Mobile, Vertical on Desktop */}
                                  {(() => {
                                    const isHidden = String(analysis.visibility_status || '').toLowerCase() === 'hidden';
                                    const effectiveR90 = isHidden && analysis.placeholder_raw_score != null && (analysis.placeholder_minutes ?? 0) > 0
                                      ? (analysis.placeholder_raw_score / analysis.placeholder_minutes) * 90
                                      : analysis.r90_score;
                                    if (effectiveR90 === null || effectiveR90 === undefined) return null;
                                    return (
                                    <>
                                      {/* Mobile: Horizontal R90 */}
                                      <div className={`md:hidden ${getR90ColorClass(effectiveR90)} p-3`}>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <div className="text-3xl font-bold">
                                            {effectiveR90.toFixed(2)}
                                          </div>
                                          <TrendingUp className="w-8 h-8 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="text-xs opacity-90 font-medium text-center">R90 SCORE</div>
                                      </div>
                                      
                                      {/* Desktop: Vertical R90 */}
                                      <div className={`hidden md:flex ${getR90ColorClass(effectiveR90)} items-center justify-center p-4 flex-shrink-0`}>
                                        <div className="text-center">
                                          <TrendingUp className="w-8 h-8 text-white mx-auto mb-2" strokeWidth={2.5} />
                                          <div className="text-4xl font-bold">
                                            {effectiveR90.toFixed(2)}
                                          </div>
                                          <div className="text-xs opacity-80">R90</div>
                                        </div>
                                      </div>
                                    </>
                                    );
                                  })()}
                                  
                                  {/* Match info and stats with black background */}
                                  <div className="bg-black flex-1 p-3 md:p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-base md:text-lg font-semibold truncate">{analysis.opponent}</h4>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm opacity-90 mt-1">
                                          <span>{new Date(analysis.analysis_date).toLocaleDateString('en-GB')}</span>
                                          {analysis.result && (
                                            <>
                                              <span>•</span>
                                              <span>{analysis.result}</span>
                                            </>
                                          )}
                                          {analysis.minutes_played && (
                                            <>
                                              <span>•</span>
                                              <span>{analysis.minutes_played} min</span>
                                            </>
                                          )}
                                        </div>
                                        
                                        {/* Advanced Stats - Compact */}
                                        {analysis.striker_stats && Object.keys(analysis.striker_stats).length > 0 && (
                                          <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-[10px] md:text-xs opacity-80 mt-2">
                                            {Object.entries(analysis.striker_stats).map(([key, value]) => {
                                              let displayValue = '';
                                              if (value === null || value === undefined) {
                                                displayValue = '-';
                                              } else if (Array.isArray(value)) {
                                                try {
                                                  displayValue = value.filter(v => v != null && v !== undefined).map(v => String(v)).join(', ') || '-';
                                                } catch (e) {
                                                  displayValue = '-';
                                                }
                                              } else if (typeof value === 'object') {
                                                displayValue = JSON.stringify(value);
                                              } else {
                                                displayValue = String(value);
                                              }
                                              
                                              return (
                                                <span key={key} className="whitespace-nowrap">
                                                  <span className="font-medium">{key.replace(/_/g, ' ')}</span>: {displayValue}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex gap-2 flex-shrink-0">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setReportEditorAnalysisId(analysis.id);
                                            setReportEditorPlayerId(selectedPlayerId!);
                                            setReportEditorPlayerName(selectedPlayer!.name);
                                            setShowReportEditor(true);
                                          }}
                                          className="h-8 px-2 md:px-3"
                                        >
                                          <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                                          <span className="hidden md:inline">Edit</span>
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedReportAnalysisId(analysis.id);
                                            setPerformanceReportDialogOpen(true);
                                          }}
                                          className="h-8 px-2 md:px-3"
                                        >
                                          <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                                          <span className="hidden md:inline">View</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => {
                                            // Open report in new tab - the page has a print button
                                            const reportUrl = `/performance-report/${analysis.id}-${selectedPlayer?.name.toLowerCase().replace(/\s+/g, '-')}-vs-${analysis.opponent?.toLowerCase().replace(/\s+/g, '-') || 'opponent'}`;
                                            const newWindow = window.open(reportUrl, '_blank');
                                            // Auto-trigger print after page loads
                                            if (newWindow) {
                                              newWindow.addEventListener('load', () => {
                                                setTimeout(() => newWindow.print(), 500);
                                              });
                                            }
                                          }}
                                          title="Save as PDF"
                                        >
                                          <FileDown className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={async () => {
                                            // Open the dialog and capture it
                                            setSelectedReportAnalysisId(analysis.id);
                                            setPerformanceReportDialogOpen(true);
                                            toast.info('Report opened - use the Save as Image button in the dialog');
                                          }}
                                          title="Save as WEBP"
                                        >
                                          <ImageIcon className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No performance reports yet. Create one to get started.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="player-data" className="mt-0">
                    <PlayerFixtureStats
                      playerId={selectedPlayerId!}
                      playerName={players.find(p => p.id === selectedPlayerId)?.name || 'Player'}
                      playerPosition={players.find(p => p.id === selectedPlayerId)?.position || undefined}
                    />
                  </TabsContent>

                  <TabsContent value="tactical" className="mt-0">
                    <Card>
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="hidden md:block text-lg">Tactical Analysis</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => {
                              navigate('/staff?section=analysis');
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Analysis
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {tacticalAnalyses[selectedPlayerId!]?.length > 0 ? (
                          <div className="space-y-3">
                            {tacticalAnalyses[selectedPlayerId!].map((analysis) => (
                              <div
                                key={analysis.id}
                                className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className={`text-[10px] md:text-xs px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap ${
                                        analysis.analysis_type === 'pre-match' 
                                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      }`}>
                                        {analysis.analysis_type === 'pre-match' ? 'PRE' : 'POST'}
                                      </span>
                                      {analysis.match_date && (
                                        <span className="text-xs md:text-sm text-muted-foreground">
                                          {new Date(analysis.match_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-medium mb-1 text-sm md:text-base">{analysis.title || 'Untitled'}</h4>
                                    {analysis.home_team && analysis.away_team && (
                                      <p className="text-xs md:text-sm text-muted-foreground">
                                        {analysis.home_team} vs {analysis.away_team}
                                        {analysis.home_score !== null && analysis.away_score !== null && (
                                          <span className="ml-2 font-medium">
                                            ({analysis.home_score} - {analysis.away_score})
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/analysis/${analysis.id}`)}
                                      className="flex-1 sm:flex-none"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        const params = new URLSearchParams();
                                        new URLSearchParams(window.location.search).forEach((value, key) => {
                                          if (key.startsWith('__lovable')) params.set(key, value);
                                        });
                                        params.set('section', 'analysis');
                                        navigate(`/staff?${params.toString()}`);
                                        // Small delay to let section load, then trigger edit
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('edit-analysis', { detail: { id: analysis.id, type: analysis.analysis_type } }));
                                        }, 300);
                                      }}
                                      className="flex-1 sm:flex-none"
                                    >
                                      <Pencil className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No tactical analysis available yet. Create a pre-match or post-match analysis to get started.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="other" className="mt-0 pt-6 md:pt-0">
                    <Card className="md:mt-0">
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="hidden md:block text-lg">Other Analysis</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => setIsAssignAnalysisDialogOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign Analysis
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {otherAnalyses[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-3">
                            {otherAnalyses[selectedPlayerId].map((item: any) => (
                              <div
                                key={item.id}
                                className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium mb-1 text-sm md:text-base">{item.analysis.title}</h4>
                                    {item.analysis.description && (
                                      <p className="text-xs md:text-sm text-muted-foreground mb-2">
                                        <MarkdownText text={item.analysis.description} />
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                      {item.analysis.category && (
                                        <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                                          {item.analysis.category}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        Assigned {new Date(item.assigned_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {item.analysis.content && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(item.analysis.content, '_blank')}
                                      >
                                        <FileText className="w-4 h-4 mr-2" />
                                        View
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleUnassignAnalysis(item.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No other analysis assigned yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="scouting" className="mt-0 pt-6 md:pt-0">
                    <PlayerScoutingManagement 
                      playerId={selectedPlayerId!}
                      playerName={selectedPlayer!.name}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="programming" className="mt-4 md:mt-0">
                <Tabs defaultValue="sps" className="w-full">
                  <TabsList className="flex flex-col md:grid md:grid-cols-3 w-full gap-2 bg-muted/20 rounded-lg p-2 mb-[60px] md:mb-4">
                    <TabsTrigger value="sps" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Strength, Power & Speed (SPS)</TabsTrigger>
                    <TabsTrigger value="nutrition" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">Nutrition</TabsTrigger>
                    <TabsTrigger value="psychology" className="w-full justify-center px-3 py-2.5 text-xs md:text-sm">
                      <Brain className="h-3.5 w-3.5 mr-1.5" /> Psychology
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sps" className="mt-0">
                    {/* Player Notes and Next Program Notes - Side by Side - MOVED TO TOP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Programming Notes Card - Shows in player's Physical Programming section */}
                      <Card>
                        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                          <CardTitle className="text-base">Programming Notes</CardTitle>
                          <p className="text-xs text-muted-foreground">Health, needs, training considerations - visible in player's programming section</p>
                        </CardHeader>
                        <CardContent className="px-3 md:px-6 py-4">
                          <Textarea
                            placeholder="Add notes about the player's health, specific needs, training considerations..."
                            value={(selectedPlayer as any)?.programming_notes || ''}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              // Optimistic update
                              setPlayers(prev => prev.map(p => 
                                p.id === selectedPlayerId ? { ...p, programming_notes: newValue } : p
                              ));
                            }}
                            onBlur={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from('players')
                                  .update({ programming_notes: e.target.value } as any)
                                  .eq('id', selectedPlayerId);
                                if (error) throw error;
                              } catch (error: any) {
                                toast.error('Failed to save notes: ' + error.message);
                              }
                            }}
                            className="min-h-[200px] resize-none"
                          />
                        </CardContent>
                      </Card>

                      {/* Next Program Notes Card */}
                      <Card>
                        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                          <CardTitle className="text-base">Next Program Notes</CardTitle>
                          <p className="text-xs text-muted-foreground">Ideas and brainstorming for upcoming programs</p>
                        </CardHeader>
                        <CardContent className="px-3 md:px-6 py-4">
                          <Textarea
                            placeholder="Brainstorm ideas for the player's next training program, goals, focus areas..."
                            value={selectedPlayer?.next_program_notes || ''}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              // Optimistic update
                              setPlayers(prev => prev.map(p => 
                                p.id === selectedPlayerId ? { ...p, next_program_notes: newValue } : p
                              ));
                            }}
                            onBlur={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from('players')
                                  .update({ next_program_notes: e.target.value })
                                  .eq('id', selectedPlayerId);
                                if (error) throw error;
                              } catch (error: any) {
                                toast.error('Failed to save notes: ' + error.message);
                              }
                            }}
                            className="min-h-[200px] resize-none"
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <CardTitle>Training Programs</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProgrammingPlayerId(selectedPlayerId!);
                              setSelectedProgrammingPlayerName(selectedPlayer!.name);
                              setIsProgrammingDialogOpen(true);
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Manage Programs
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {playerPrograms[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-3">
                            {playerPrograms[selectedPlayerId].map((program) => (
                              <div
                                key={program.id}
                                className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedProgrammingPlayerId(selectedPlayerId!);
                                  setSelectedProgrammingPlayerName(selectedPlayer!.name);
                                  setIsProgrammingDialogOpen(true);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm md:text-base truncate">{program.program_name}</h4>
                                      {program.is_current && (
                                        <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium whitespace-nowrap">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    {program.phase_name && (
                                      <p className="text-xs md:text-sm text-muted-foreground">
                                        Phase: {program.phase_name}
                                      </p>
                                    )}
                                    {program.phase_dates && (
                                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                                        {program.phase_dates}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No programs yet. Click "Manage Programs" to create one.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Testing Results Card */}
                    <Card className="mt-4">
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4 flex flex-row items-center justify-between">
                        <CardTitle>Testing Results</CardTitle>
                        <AddTestResultDialog
                          playerId={selectedPlayerId!}
                          playerName={selectedPlayer?.name || ''}
                          onSuccess={fetchAllTestResults}
                        />
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {playerTestResults[selectedPlayerId]?.length > 0 ? (
                          <div className="space-y-4">
                            {['Strength', 'Power', 'Speed', 'Conditioning'].map((category) => {
                              const categoryResults = playerTestResults[selectedPlayerId]?.filter(
                                r => r.test_category === category
                              );
                              if (!categoryResults?.length) return null;

                              // Group by test name, show latest for each
                              const latestByTest: Record<string, any> = {};
                              categoryResults.forEach(r => {
                                if (!latestByTest[r.test_name] || new Date(r.test_date) > new Date(latestByTest[r.test_name].test_date)) {
                                  latestByTest[r.test_name] = r;
                                }
                              });

                              return (
                                <div key={category} className="space-y-2">
                                  <h4 className="font-medium text-sm text-primary border-b border-primary/30 pb-1">
                                    {category}
                                  </h4>
                                  <div className="grid gap-2">
                                    {Object.values(latestByTest).map((result: any) => (
                                      <div
                                        key={result.id}
                                        className="p-3 border rounded-lg bg-secondary/20"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-medium text-sm">{result.test_name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-lg font-bold text-primary">{result.score}</span>
                                              <Badge variant={result.status === 'draft' ? 'outline' : 'default'} className="text-xs">
                                                {result.status === 'draft' ? 'Draft' : 'Submitted'}
                                              </Badge>
                                            </div>
                                            {result.notes && (
                                              <p className="text-xs text-muted-foreground mt-1">{result.notes}</p>
                                            )}
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(result.test_date).toLocaleDateString('en-GB', { 
                                              day: 'numeric', month: 'short', year: 'numeric' 
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No test results recorded yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="nutrition" className="mt-0">
                    {/* Nutrition Notes - Same structure as SPS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Card>
                        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                          <CardTitle className="text-base">Nutrition Notes</CardTitle>
                          <p className="text-xs text-muted-foreground">Health, dietary needs, nutrition considerations - visible in player's nutrition section</p>
                        </CardHeader>
                        <CardContent className="px-3 md:px-6 py-4">
                          <Textarea
                            placeholder="Add notes about the player's dietary needs, allergies, preferences..."
                            value={(selectedPlayer as any)?.nutrition_programming_notes || ''}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              setPlayers(prev => prev.map(p => 
                                p.id === selectedPlayerId ? { ...p, nutrition_programming_notes: newValue } : p
                              ));
                            }}
                            onBlur={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from('players')
                                  .update({ nutrition_programming_notes: e.target.value } as any)
                                  .eq('id', selectedPlayerId);
                                if (error) throw error;
                              } catch (error: any) {
                                toast.error('Failed to save notes: ' + error.message);
                              }
                            }}
                            className="min-h-[200px] resize-none"
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                          <CardTitle className="text-base">Next Nutrition Program Notes</CardTitle>
                          <p className="text-xs text-muted-foreground">Ideas and brainstorming for upcoming nutrition programs</p>
                        </CardHeader>
                        <CardContent className="px-3 md:px-6 py-4">
                          <Textarea
                            placeholder="Brainstorm ideas for the player's next nutrition program, goals, focus areas..."
                            value={(selectedPlayer as any)?.nutrition_next_program_notes || ''}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              setPlayers(prev => prev.map(p => 
                                p.id === selectedPlayerId ? { ...p, nutrition_next_program_notes: newValue } : p
                              ));
                            }}
                            onBlur={async (e) => {
                              try {
                                const { error } = await supabase
                                  .from('players')
                                  .update({ nutrition_next_program_notes: e.target.value } as any)
                                  .eq('id', selectedPlayerId);
                                if (error) throw error;
                              } catch (error: any) {
                                toast.error('Failed to save notes: ' + error.message);
                              }
                            }}
                            className="min-h-[200px] resize-none"
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <CardTitle>Nutrition Programs</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedNutritionPlayerId(selectedPlayerId!);
                              setSelectedNutritionPlayerName(selectedPlayer!.name);
                              setIsNutritionDialogOpen(true);
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Manage Programs
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {nutritionPrograms[selectedPlayerId!]?.length > 0 ? (
                          <div className="space-y-3">
                            {nutritionPrograms[selectedPlayerId!].map((program: any) => (
                              <div
                                key={program.id}
                                className="p-3 md:p-4 border rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedNutritionPlayerId(selectedPlayerId!);
                                  setSelectedNutritionPlayerName(selectedPlayer!.name);
                                  setIsNutritionDialogOpen(true);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm md:text-base truncate">{program.phase_name}</h4>
                                      {program.is_current && (
                                        <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-primary/20 text-primary font-medium whitespace-nowrap">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    {program.diet_framework && (
                                      <p className="text-xs md:text-sm text-muted-foreground">
                                        {program.diet_framework}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8 text-sm">
                            No programs yet. Click "Manage Programs" to create one.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="psychology" className="mt-0">
                    <Card>
                      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" /> Psychology — SPQ Reports
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">All saved SPQs for this player. Run new ones from the Programming → Psychology section.</p>
                      </CardHeader>
                      <CardContent className="px-3 md:px-6 py-4">
                        {selectedPlayerId && <PlayerSpqHistory playerId={selectedPlayerId} variant="inline" />}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="highlights" className="mt-4 md:mt-0">
                <Card>
                  <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                    <CardTitle>Video Content & Images</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 py-4">
                    {selectedPlayer?.highlights ? (
                      <Tabs defaultValue="match-highlights" className="w-full">
                        <TabsList className="flex flex-col md:grid md:w-full md:grid-cols-3 gap-2 p-2 mt-20 md:mt-4 mb-20 md:mb-4">
                          <TabsTrigger value="match-highlights" className="w-full justify-start px-4 py-3 text-sm">Match Highlights</TabsTrigger>
                          <TabsTrigger value="best-clips" className="w-full justify-start px-4 py-3 text-sm">Best Clips</TabsTrigger>
                          <TabsTrigger value="images" className="w-full justify-start px-4 py-3 text-sm">Images</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="match-highlights" className="mt-0">
                          {(() => {
                            try {
                              const highlights = typeof selectedPlayer.highlights === 'string'
                                ? JSON.parse(selectedPlayer.highlights)
                                : selectedPlayer.highlights;
                              
                              const matchHighlights = Array.isArray(highlights) ? highlights : (highlights.matchHighlights || []);

                              return (
                                <div className="space-y-4">
                                  <InlineVideoUpload
                                    playerEmail={selectedPlayer.email || ''}
                                    playerId={selectedPlayer.id}
                                    highlightType="match"
                                    onUploadComplete={refreshSelectedPlayer}
                                  />
                                  
                                    {matchHighlights.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                      {matchHighlights.map((highlight: any, idx: number) => (
                                        <Card 
                                          key={idx} 
                                          className={`overflow-hidden group relative transition-all ${
                                            draggedHighlightIndex === idx ? 'opacity-50 scale-95' : ''
                                          }`}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedHighlightIndex !== null && draggedHighlightIndex !== idx) {
                                              handleReorderHighlights(selectedPlayer.id, 'match', draggedHighlightIndex, idx);
                                            }
                                            setDraggedHighlightIndex(null);
                                          }}
                                        >
                                          <video 
                                            src={highlight.videoUrl} 
                                            controls 
                                            preload="none"
                                            className="w-full aspect-video pointer-events-auto"
                                            onPointerDown={(e) => {
                                              // Allow drag to work even if pointer is near video
                                              if ((e.target as HTMLElement).tagName === 'VIDEO') {
                                                const card = (e.target as HTMLElement).closest('.group');
                                                if (card) card.setAttribute('data-allow-drag', 'true');
                                              }
                                            }}
                                          />
                                          {highlight.logoUrl && (
                                            <div className="absolute top-2 left-2 bg-background/90 p-1 rounded">
                                              <img 
                                                src={highlight.logoUrl} 
                                                alt="Club logo" 
                                                className="w-8 h-8 object-contain"
                                              />
                                            </div>
                                          )}
                                          <CardContent className="p-4">
                                            <div className="space-y-2">
                                              <p className="font-medium truncate">{highlight.name || `Highlight ${idx + 1}`}</p>
                                              <div 
                                                className="flex items-center gap-2"
                                                draggable
                                                onDragStart={(e) => {
                                                  // Only allow drag from title area, not buttons
                                                  const target = e.target as HTMLElement;
                                                  if (target.closest('button')) {
                                                    e.preventDefault();
                                                    return;
                                                  }
                                                  setDraggedHighlightIndex(idx);
                                                  e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => setDraggedHighlightIndex(null)}
                                              >
                                                <div className="cursor-grab active:cursor-grabbing">
                                                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                                <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={idx === 0}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (idx > 0) handleReorderHighlights(selectedPlayer.id, 'match', idx, idx - 1);
                                                    }}
                                                  >
                                                    <ChevronLeft className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={idx === matchHighlights.length - 1}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (idx < matchHighlights.length - 1) handleReorderHighlights(selectedPlayer.id, 'match', idx, idx + 1);
                                                    }}
                                                  >
                                                    <ChevronRight className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      downloadVideo(highlight.videoUrl, highlight.name || `Highlight ${idx + 1}`);
                                                    }}
                                                  >
                                                    <Download className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingHighlight({ highlight, type: 'match' });
                                                      setIsEditHighlightOpen(true);
                                                    }}
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteHighlight(selectedPlayer.id, 'match', idx);
                                                    }}
                                                  >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-center text-muted-foreground py-8">No match highlights yet</p>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return <p className="text-center text-muted-foreground py-8">Error loading highlights</p>;
                            }
                          })()}
                        </TabsContent>

                        <TabsContent value="best-clips" className="mt-0">
                          {(() => {
                            try {
                              const highlights = typeof selectedPlayer.highlights === 'string'
                                ? JSON.parse(selectedPlayer.highlights)
                                : selectedPlayer.highlights;
                              
                              // Sort best clips by date (newest first)
                              const bestClips = (highlights.bestClips || []).sort((a: any, b: any) => {
                                const dateA = new Date(a.addedAt || 0).getTime();
                                const dateB = new Date(b.addedAt || 0).getTime();
                                return dateB - dateA; // Newest first
                              });
                              
                              // Pagination
                              const totalPages = Math.ceil(bestClips.length / CLIPS_PER_PAGE);
                              const startIdx = (bestClipsPage - 1) * CLIPS_PER_PAGE;
                              const endIdx = startIdx + CLIPS_PER_PAGE;
                              const paginatedClips = bestClips.slice(startIdx, endIdx);

                              return (
                                <div className="space-y-4">
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline"
                                      onClick={() => setShowPlaylistManager(true)}
                                    >
                                      Manage Playlists
                                    </Button>
                                  </div>

                                  <InlineVideoUpload
                                    playerEmail={selectedPlayer.email || ''}
                                    playerId={selectedPlayer.id}
                                    highlightType="best"
                                    onUploadComplete={refreshSelectedPlayer}
                                  />
                                  
                                    {bestClips.length > 0 ? (
                                    <>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                      {paginatedClips.map((clip: any, idx: number) => {
                                        // Calculate the actual index in the full array
                                        const actualIdx = startIdx + idx;
                                        return (
                                        <Card 
                                          key={actualIdx} 
                                          className={`overflow-hidden group relative transition-all ${
                                            draggedHighlightIndex === actualIdx ? 'opacity-50 scale-95' : ''
                                          }`}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedHighlightIndex !== null && draggedHighlightIndex !== actualIdx) {
                                              handleReorderHighlights(selectedPlayer.id, 'best', draggedHighlightIndex, actualIdx);
                                            }
                                            setDraggedHighlightIndex(null);
                                          }}
                                        >
                                          <video 
                                            src={clip.videoUrl} 
                                            controls 
                                            preload="none"
                                            className="w-full aspect-video pointer-events-auto"
                                            onPointerDown={(e) => {
                                              // Allow drag to work even if pointer is near video
                                              if ((e.target as HTMLElement).tagName === 'VIDEO') {
                                                const card = (e.target as HTMLElement).closest('.group');
                                                if (card) card.setAttribute('data-allow-drag', 'true');
                                              }
                                            }}
                                          />
                                          {clip.logoUrl && (
                                            <div className="absolute top-2 left-2 bg-background/90 p-1 rounded">
                                              <img 
                                                src={clip.logoUrl} 
                                                alt="Club logo" 
                                                className="w-8 h-8 object-contain"
                                              />
                                            </div>
                                          )}
                                          <CardContent className="p-4">
                                            <div className="space-y-2">
                                              <p className="font-medium truncate">{clip.name || `Clip ${actualIdx + 1}`}</p>
                                              <div 
                                                className="flex items-center gap-2"
                                                draggable
                                                onDragStart={(e) => {
                                                  // Only allow drag from title area, not buttons
                                                  const target = e.target as HTMLElement;
                                                  if (target.closest('button')) {
                                                    e.preventDefault();
                                                    return;
                                                  }
                                                  setDraggedHighlightIndex(actualIdx);
                                                  e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => setDraggedHighlightIndex(null)}
                                              >
                                                <div className="cursor-grab active:cursor-grabbing">
                                                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                                <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={actualIdx === 0}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (actualIdx > 0) handleReorderHighlights(selectedPlayer.id, 'best', actualIdx, actualIdx - 1);
                                                    }}
                                                  >
                                                    <ChevronLeft className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={actualIdx === bestClips.length - 1}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (actualIdx < bestClips.length - 1) handleReorderHighlights(selectedPlayer.id, 'best', actualIdx, actualIdx + 1);
                                                    }}
                                                  >
                                                    <ChevronRight className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      downloadVideo(clip.videoUrl, clip.name || `Clip ${actualIdx + 1}`);
                                                    }}
                                                  >
                                                    <Download className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingHighlight({ highlight: clip, type: 'best' });
                                                      setIsEditHighlightOpen(true);
                                                    }}
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteHighlight(selectedPlayer.id, 'best', actualIdx);
                                                    }}
                                                  >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      )})}
                                    </div>
                                    
                                    {totalPages > 1 && (
                                      <Pagination className="mt-6">
                                        <PaginationContent>
                                          <PaginationItem>
                                            <PaginationPrevious
                                              onClick={() => setBestClipsPage(p => Math.max(1, p - 1))}
                                              className={bestClipsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                          </PaginationItem>
                                          
                                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <PaginationItem key={page}>
                                              <PaginationLink
                                                onClick={() => setBestClipsPage(page)}
                                                isActive={page === bestClipsPage}
                                                className="cursor-pointer"
                                              >
                                                {page}
                                              </PaginationLink>
                                            </PaginationItem>
                                          ))}
                                          
                                          <PaginationItem>
                                            <PaginationNext
                                              onClick={() => setBestClipsPage(p => Math.min(totalPages, p + 1))}
                                              className={bestClipsPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                          </PaginationItem>
                                        </PaginationContent>
                                      </Pagination>
                                    )}
                                    </>
                                  ) : (
                                    <p className="text-center text-muted-foreground py-8">No best clips yet</p>
                                  )}
                                </div>
                              );
                            } catch (e) {
                              return <p className="text-center text-muted-foreground py-8">Error loading clips</p>;
                            }
                          })()}
                        </TabsContent>
                        
                        <TabsContent value="images" className="mt-0">
                          <div className="space-y-4">
                            <Button 
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = 'image/jpeg,image/png,image/gif,image/webp,image/*';
                                input.onchange = async (e: any) => {
                                  const files = Array.from(e.target.files || []) as File[];
                                  if (files.length > 0) {
                                    // Initialize progress for all files
                                    const initialProgress: Record<string, any> = {};
                                    files.forEach(file => {
                                      initialProgress[file.name] = { status: 'uploading', progress: 0 };
                                    });
                                    setUploadProgress(initialProgress);

                                    // Process all files
                                    const uploadPromises = files.map(async (file) => {
                                      try {
                                        setUploadProgress(prev => ({
                                          ...prev,
                                          [file.name]: { status: 'uploading', progress: 33 }
                                        }));

                                        const fileExt = file.name.split('.').pop();
                                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                                        const filePath = `${fileName}`;
                                        
                                        const { error: uploadError } = await supabase.storage
                                          .from('marketing-gallery')
                                          .upload(filePath, file);
                                        
                                        if (uploadError) throw uploadError;

                                        setUploadProgress(prev => ({
                                          ...prev,
                                          [file.name]: { status: 'uploading', progress: 66 }
                                        }));
                                        
                                        const { data: { publicUrl } } = supabase.storage
                                          .from('marketing-gallery')
                                          .getPublicUrl(filePath);
                                        
                                        const { error: dbError } = await supabase
                                          .from('marketing_gallery')
                                          .insert([{
                                            title: `${selectedPlayer.name} - ${file.name.replace(/\.[^/.]+$/, '')}`,
                                            description: `Player image for ${selectedPlayer.name}`,
                                            file_url: publicUrl,
                                            file_type: 'image',
                                            category: 'players',
                                            player_id: selectedPlayer.id,
                                          }]);
                                        
                                        if (dbError) throw dbError;

                                        setUploadProgress(prev => ({
                                          ...prev,
                                          [file.name]: { status: 'success', progress: 100 }
                                        }));

                                        toast.success(`Successfully uploaded ${file.name}`);
                                        return publicUrl;
                                      } catch (error) {
                                        console.error(`Error uploading ${file.name}:`, error);
                                        setUploadProgress(prev => ({
                                          ...prev,
                                          [file.name]: { status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
                                        }));
                                        toast.error(`Failed to upload ${file.name}`);
                                        return null;
                                      }
                                    });

                                    const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
                                    if (uploadedUrls.length > 0 && !selectedPlayer.image_url) {
                                      await supabase
                                        .from('players')
                                        .update({ image_url: uploadedUrls[0] })
                                        .eq('id', selectedPlayer.id);
                                      setPlayers(prev => prev.map(player =>
                                        player.id === selectedPlayer.id
                                          ? { ...player, image_url: uploadedUrls[0] }
                                          : player
                                      ));
                                    }
                                    
                                    // Clear progress after 3 seconds
                                    setTimeout(() => {
                                      setUploadProgress({});
                                    }, 3000);
                                  }
                                };
                                input.click();
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Upload Images
                            </Button>
                            
                            {/* Upload Progress */}
                            {Object.keys(uploadProgress).length > 0 && (
                              <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-semibold">Upload Progress</h3>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setUploadProgress({})}
                                  >
                                    Clear
                                  </Button>
                                </div>
                                {Object.entries(uploadProgress).map(([filename, status]) => (
                                  <Card key={filename} className="overflow-hidden">
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium truncate flex-1">{filename}</span>
                                        <Badge variant={
                                          status.status === 'success' ? 'default' :
                                          status.status === 'error' ? 'destructive' :
                                          'secondary'
                                        }>
                                          {status.status === 'uploading' ? 'Uploading' :
                                           status.status === 'success' ? 'Uploaded' :
                                           'Failed'}
                                        </Badge>
                                      </div>
                                      <Progress value={status.progress} className="h-2" />
                                      {status.error && (
                                        <p className="text-xs text-destructive mt-2">{status.error}</p>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex justify-end mb-4">
                              <Button onClick={() => setShowImageUploadDialog(true)}>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Upload Image
                              </Button>
                            </div>
                            
                            <PlayerImages 
                              key={`player-images-${selectedPlayer.id}-${Date.now()}`}
                              playerId={selectedPlayer.id} 
                              isAdmin={isAdmin} 
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No content uploaded yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures" className="mt-4 md:mt-0">
                <Card>
                  <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                    <CardTitle>Fixtures</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 py-4">
                    <PlayerFixtures 
                      playerId={selectedPlayerId!} 
                      playerName={selectedPlayer!.name}
                      isAdmin={isAdmin} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4 md:mt-0">
                <Card>
                  <CardHeader className="px-3 md:px-6 py-3 md:py-4">
                    <CardTitle>Invoices</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 py-4">
                    {playerInvoices[selectedPlayerId]?.length > 0 ? (
                      <div className="space-y-3">
                         {playerInvoices[selectedPlayerId].map((invoice) => (
                          <div key={invoice.id} className="p-4 border rounded-lg">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="w-full sm:w-auto">
                                <div className="flex flex-wrap items-center gap-2">
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

              <TabsContent value="contracts" className="mt-4 md:mt-0">
                {selectedPlayerId && <PlayerContractsTab playerId={selectedPlayerId} />}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <Dialog open={showReportTypePicker} onOpenChange={setShowReportTypePicker}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-none sm:max-w-3xl p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Action Report</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['player', 'team'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setReportEditorPlayerId(selectedPlayerId!);
                  setReportEditorPlayerName(selectedPlayer!.name);
                  setReportEditorAnalysisId(undefined);
                  setReportEditorInitialType(type);
                  setShowReportTypePicker(false);
                  setShowReportEditor(true);
                }}
                className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {type === 'player' ? <User className="h-4 w-4 text-primary" /> : <LineChart className="h-4 w-4 text-primary" />}
                  {type === 'player' ? 'Player report' : 'Team report'}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {type === 'player' ? 'Create a report for one player.' : 'Create a report with a roster and player chips on actions.'}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Performance Report Editor */}
      {showReportEditor && (
        <CreatePerformanceReportDialog
          inline={true}
          playerId={reportEditorPlayerId}
          playerName={reportEditorPlayerName}
          analysisId={reportEditorAnalysisId}
          initialReportType={reportEditorInitialType}
          onClose={() => {
            setShowReportEditor(false);
            setReportEditorAnalysisId(undefined);
          }}
          onSuccess={() => {
            fetchAllAnalyses();
            fetchTacticalAnalyses();
          }}
        />
      )}

      <ProgrammingManagement
        isOpen={isProgrammingDialogOpen}
        onClose={() => setIsProgrammingDialogOpen(false)}
        playerId={selectedProgrammingPlayerId}
        playerName={selectedProgrammingPlayerName}
        isAdmin={isAdmin}
      />

      <NutritionProgramManagement
        isOpen={isNutritionDialogOpen}
        onClose={() => setIsNutritionDialogOpen(false)}
        playerId={selectedNutritionPlayerId}
        playerName={selectedNutritionPlayerName}
        onProgramsChange={(programs) => {
          setNutritionPrograms(prev => ({
            ...prev,
            [selectedNutritionPlayerId]: programs
          }));
        }}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setImageFile(null);
          setImagePreview(null);
          setClubLogoFile(null);
          setClubLogoPreview(null);
          setHoverImageFile(null);
          setHoverImagePreview(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] w-[98vw] sm:w-[95vw] p-3 sm:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg">Edit Player - {editingPlayer?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(95vh-100px)] sm:h-[calc(90vh-120px)] pr-2 sm:pr-4">
            <form onSubmit={handleUpdatePlayer} className="space-y-4 sm:space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide gap-1 h-auto p-1 bg-muted rounded-md mb-4">
                  <TabsTrigger value="basic" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Basic</TabsTrigger>
                  <TabsTrigger value="career" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Career</TabsTrigger>
                  <TabsTrigger value="bio" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Bio</TabsTrigger>
                  <TabsTrigger value="tactical" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Schemes</TabsTrigger>
                  <TabsTrigger value="stats" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Stats</TabsTrigger>
                  <TabsTrigger value="links" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Links</TabsTrigger>
                  <TabsTrigger value="highlight" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Highlighted Game</TabsTrigger>
                  <TabsTrigger value="hudl" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Hudl Reports</TabsTrigger>
                  <TabsTrigger value="form" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Form</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-3 sm:space-y-4 pt-2">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="name" className="text-sm">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-10 sm:h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="email" className="text-sm">Email</Label>
                       <Input
                        id="email"
                        type="text"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Email or username"
                        className="h-10 sm:h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="position" className="text-sm">Position *</Label>
                      <Select
                        value={formData.position || ''}
                        onValueChange={(value) => setFormData({ ...formData, position: value })}
                      >
                        <SelectTrigger id="position" className="h-10 sm:h-11">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAYER_POSITIONS.map((code) => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">Age</Label>
                        <div className="h-10 sm:h-11 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                          {formData.dateOfBirth ? (calculateAge(formData.dateOfBirth) ?? "Set DOB") : "Set DOB"}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="dateOfBirth_basic" className="text-sm">Date of Birth</Label>
                        <Input
                          id="dateOfBirth_basic"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="nationality" className="text-sm">Nationality *</Label>
                        <Input
                          id="nationality"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          required
                          className="h-10 sm:h-11"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-sm">Portal Language</Label>
                    <Select value={formData.portal_language} onValueChange={(v) => setFormData({ ...formData, portal_language: v })}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { code: "en", label: "English", flag: "🇬🇧" },
                          { code: "es", label: "Español", flag: "🇪🇸" },
                          { code: "pt", label: "Português", flag: "🇵🇹" },
                          { code: "fr", label: "Français", flag: "🇫🇷" },
                          { code: "de", label: "Deutsch", flag: "🇩🇪" },
                          { code: "it", label: "Italiano", flag: "🇮🇹" },
                          { code: "pl", label: "Polski", flag: "🇵🇱" },
                          { code: "cs", label: "Čeština", flag: "🇨🇿" },
                          { code: "ru", label: "Русский", flag: "🇷🇺" },
                          { code: "tr", label: "Türkçe", flag: "🇹🇷" },
                        ].map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="image_url" className="text-sm">Player Image</Label>
                    <div className="flex flex-col gap-3">
                      <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://example.com/player.png or upload below"
                        className="h-10 sm:h-11 text-sm"
                      />
                      <div className="flex items-center gap-3">
                        <Label 
                          htmlFor="image_upload" 
                          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Upload Image
                        </Label>
                        <input
                          id="image_upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(file);
                          }}
                          className="hidden"
                        />
                        {(imagePreview || formData.image_url) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveImage}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                      {(imagePreview || formData.image_url) && (
                        <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                          <img 
                            src={imagePreview || formData.image_url} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Image (Transparent Background) */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="hover_image_url" className="text-sm">Hover Image (Transparent Background)</Label>
                    <p className="text-xs text-muted-foreground">This image shows when hovering over the player card on Stars/Players pages</p>
                    <div className="flex flex-col gap-3">
                      <Input
                        id="hover_image_url"
                        value={formData.hover_image_url}
                        onChange={(e) => setFormData({ ...formData, hover_image_url: e.target.value })}
                        placeholder="https://example.com/player-transparent.png or upload below"
                        className="h-10 sm:h-11 text-sm"
                      />
                      <div className="flex items-center gap-3">
                        <Label 
                          htmlFor="hover_image_upload" 
                          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Upload Hover Image
                        </Label>
                        <input
                          id="hover_image_upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleHoverImageSelect(file);
                          }}
                          className="hidden"
                        />
                        {(hoverImagePreview || formData.hover_image_url) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveHoverImage}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                      {(hoverImagePreview || formData.hover_image_url) && (
                        <div className="relative w-32 h-32 border rounded-md overflow-hidden bg-muted/50">
                          <img 
                            src={hoverImagePreview || formData.hover_image_url} 
                            alt="Hover Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="representation_status" className="text-sm">Representation Status</Label>
                    <Select
                      value={formData.representation_status}
                      onValueChange={(value) => setFormData({ ...formData, representation_status: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorySections.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="has_representation_offer"
                      checked={formData.has_representation_offer}
                      onChange={(e) => setFormData({ ...formData, has_representation_offer: e.target.checked })}
                      className="h-5 w-5 sm:h-4 sm:w-4"
                    />
                    <Label htmlFor="has_representation_offer" className="text-sm cursor-pointer">Representation Offer Page</Label>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="visible_on_stars_page"
                      checked={formData.visible_on_stars_page}
                      onChange={(e) => setFormData({ ...formData, visible_on_stars_page: e.target.checked })}
                      className="h-5 w-5 sm:h-4 sm:w-4"
                    />
                    <Label htmlFor="visible_on_stars_page" className="text-sm cursor-pointer">Visible on Stars Page</Label>
                  </div>

                  {/* AI Identification — used by RISE Action Spotter to find this player in match footage */}
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">AI Identification</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used by the RISE Action Spotter to find this player in match footage. Written once, reused across every analysis.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identification_description" className="text-sm">Identification Description</Label>
                      <Textarea
                        id="identification_description"
                        value={formData.identification_description}
                        onChange={(e) => setFormData({ ...formData, identification_description: e.target.value })}
                        placeholder="Describe shirt number, hair, skin tone, build, boots — anything that helps the AI find this player in match footage."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Reference Images</Label>
                      <PlayerReferenceImagesUploader
                        playerId={editingPlayer?.id || null}
                        values={formData.identification_reference_images}
                        onChange={(urls) => setFormData({ ...formData, identification_reference_images: urls })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="not_to_confuse_with" className="text-sm">Not To Confuse With</Label>
                      <Textarea
                        id="not_to_confuse_with"
                        value={formData.not_to_confuse_with}
                        onChange={(e) => setFormData({ ...formData, not_to_confuse_with: e.target.value })}
                        placeholder="Names or descriptions of teammates that look similar (same hair, same build, same kit number range, etc.)"
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Career Info Tab */}
                <TabsContent value="career" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="club">Current Club</Label>
                    <Input
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      placeholder="e.g., FC Barcelona"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="club_logo">Club Logo</Label>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Label 
                          htmlFor="club_logo_upload" 
                          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Upload Logo
                        </Label>
                        <input
                          id="club_logo_upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleClubLogoSelect(file);
                          }}
                          className="hidden"
                        />
                        {(clubLogoPreview || formData.club_logo) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveClubLogo}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                      {(clubLogoPreview || formData.club_logo) && (
                        <div className="relative w-24 h-24 border rounded-md overflow-hidden p-2 bg-transparent">
                          <img 
                            src={clubLogoPreview || formData.club_logo} 
                            alt="Club Logo Preview" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="league">League</Label>
                    <Input
                      id="league"
                      value={formData.league}
                      onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                      placeholder="e.g., Premier League, La Liga"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Jersey Number</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="e.g., 10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                </TabsContent>

                {/* Bio & Strengths Tab */}
                <TabsContent value="bio" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bioText">Bio Text</Label>
                    <Textarea
                      id="bioText"
                      value={formData.bioText}
                      onChange={(e) => setFormData({ ...formData, bioText: e.target.value })}
                      rows={4}
                      placeholder="Player biography..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Strengths & Play Style</Label>
                    {formData.strengths.map((strength, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={strength}
                          onChange={(e) => {
                            const newStrengths = [...formData.strengths];
                            newStrengths[index] = e.target.value;
                            setFormData({ ...formData, strengths: newStrengths });
                          }}
                          placeholder="e.g., Exceptional dribbling ability"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newStrengths = formData.strengths.filter((_, i) => i !== index);
                            setFormData({ ...formData, strengths: newStrengths });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, strengths: [...formData.strengths, ""] });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Strength
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>External Links (in Bio)</Label>
                    {formData.externalLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...formData.externalLinks];
                            newLinks[index].label = e.target.value;
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                          placeholder="Label (e.g., Transfermarkt)"
                          className="flex-1"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.externalLinks];
                            newLinks[index].url = e.target.value;
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                          placeholder="URL"
                          className="flex-[2]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newLinks = formData.externalLinks.filter((_, i) => i !== index);
                            setFormData({ ...formData, externalLinks: newLinks });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          externalLinks: [...formData.externalLinks, { label: "", url: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add External Link
                    </Button>
                  </div>
                </TabsContent>

                {/* Tactical Schemes Tab */}
                <TabsContent value="tactical" className="space-y-4">
                  <Label>Tactical Schemes</Label>
                  {formData.tacticalSchemes.map((scheme, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Scheme {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newSchemes = formData.tacticalSchemes.filter((_, i) => i !== index);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                            
                            // Clear file states for this scheme
                            setSchemePlayerImageFiles(prev => {
                              const newFiles = { ...prev };
                              delete newFiles[index];
                              return newFiles;
                            });
                            setSchemePlayerImagePreviews(prev => {
                              const newPreviews = { ...prev };
                              delete newPreviews[index];
                              return newPreviews;
                            });
                            setSchemeClubLogoFiles(prev => {
                              const newFiles = { ...prev };
                              delete newFiles[index];
                              return newFiles;
                            });
                            setSchemeClubLogoPreviews(prev => {
                              const newPreviews = { ...prev };
                              delete newPreviews[index];
                              return newPreviews;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={scheme.formation || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].formation = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Formation (e.g., 4-3-3)"
                        />
                        <Input
                          value={(Array.isArray(scheme.positions) ? scheme.positions : []).join(", ")}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].positions = e.target.value.split(",").map(p => p.trim()).filter(p => p);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Positions (e.g., CM, RCM)"
                        />
                        <Input
                          value={scheme.teamName || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            newSchemes[index].teamName = e.target.value;
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Team Name"
                        />
                        <Input
                          value={scheme.matches || ""}
                          onChange={(e) => {
                            const newSchemes = [...formData.tacticalSchemes];
                            const value = e.target.value;
                            // Try to parse as number, otherwise keep as string
                            newSchemes[index].matches = isNaN(Number(value)) ? value : parseInt(value);
                            setFormData({ ...formData, tacticalSchemes: newSchemes });
                          }}
                          placeholder="Matches (e.g., 15 or 'CURRENT CLUB')"
                        />
                      </div>
                      
                      {/* Club Logo Upload */}
                      <div className="space-y-2">
                        <Label>Club Logo</Label>
                        {(schemeClubLogoPreviews[index] || scheme.clubLogo) && (
                          <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
                            <img 
                              src={schemeClubLogoPreviews[index] || scheme.clubLogo} 
                              alt="Club logo" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Label
                            htmlFor={`scheme-club-logo-${index}`}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Upload Club Logo
                          </Label>
                          <input
                            id={`scheme-club-logo-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSchemeClubLogoSelect(file, index);
                            }}
                            className="hidden"
                          />
                          {(schemeClubLogoPreviews[index] || scheme.clubLogo) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSchemeClubLogo(index)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Player Image Upload */}
                      <div className="space-y-2">
                        <Label>Player Image</Label>
                        {(schemePlayerImagePreviews[index] || scheme.playerImage) && (
                          <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
                            <img 
                              src={schemePlayerImagePreviews[index] || scheme.playerImage} 
                              alt="Player" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Label
                            htmlFor={`scheme-player-image-${index}`}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80 transition-colors text-sm"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Upload Player Image
                          </Label>
                          <input
                            id={`scheme-player-image-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSchemePlayerImageSelect(file, index);
                            }}
                            className="hidden"
                          />
                          {(schemePlayerImagePreviews[index] || scheme.playerImage) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSchemePlayerImage(index)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        tacticalSchemes: [
                          ...formData.tacticalSchemes, 
                          {
                            formation: "",
                            positions: [],
                            teamName: "",
                            matches: 0,
                            clubLogo: "",
                            playerImage: "",
                          }
                        ] 
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scheme
                  </Button>
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="space-y-4 sm:space-y-6 pt-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Season Stats</Label>
                    <div className="space-y-3">
                      {formData.seasonStats.map((stat, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-2 border rounded-lg sm:border-0 sm:rounded-none">
                          <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <Input
                              value={stat.header}
                              onChange={(e) => {
                                const newStats = [...formData.seasonStats];
                                newStats[index].header = e.target.value;
                                setFormData({ ...formData, seasonStats: newStats });
                              }}
                              placeholder="Goals"
                              className="flex-1 h-11 sm:h-10"
                            />
                            <Input
                              value={stat.value}
                              onChange={(e) => {
                                const newStats = [...formData.seasonStats];
                                newStats[index].value = e.target.value;
                                setFormData({ ...formData, seasonStats: newStats });
                              }}
                              placeholder="15"
                              className="flex-1 h-11 sm:h-10"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const newStats = formData.seasonStats.filter((_, i) => i !== index);
                              setFormData({ ...formData, seasonStats: newStats });
                            }}
                            className="w-full sm:w-10 h-11 sm:h-10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 sm:hidden">Delete</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          seasonStats: [...formData.seasonStats, { header: "", value: "" }] 
                        });
                      }}
                      className="w-full sm:w-auto h-11 sm:h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Season Stat
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Top Stats</Label>
                    <div className="space-y-3">
                      {formData.topStats.map((stat, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={stat.label}
                              onChange={(e) => {
                                const newStats = [...formData.topStats];
                                newStats[index].label = e.target.value;
                                setFormData({ ...formData, topStats: newStats });
                              }}
                              placeholder="Pass Accuracy"
                              className="flex-1 h-11 sm:h-10"
                            />
                            <Input
                              value={stat.value}
                              onChange={(e) => {
                                const newStats = [...formData.topStats];
                                newStats[index].value = e.target.value;
                                setFormData({ ...formData, topStats: newStats });
                              }}
                              placeholder="89%"
                              className="flex-1 h-11 sm:h-10"
                            />
                          </div>
                          <Input
                            value={stat.description || ""}
                            onChange={(e) => {
                              const newStats = [...formData.topStats];
                              newStats[index].description = e.target.value;
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            placeholder="Description (optional)"
                            className="h-11 sm:h-10"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newStats = formData.topStats.filter((_, i) => i !== index);
                              setFormData({ ...formData, topStats: newStats });
                            }}
                            className="w-full h-11 sm:h-9"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Top Stat
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          topStats: [...formData.topStats, { label: "", value: "", description: "" }] 
                        });
                      }}
                      className="w-full sm:w-auto h-11 sm:h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Top Stat
                    </Button>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <Label className="text-sm font-medium">Auto Stats Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter the player's external profile ID to automatically sync appearances, goals, assists and minutes every two weeks.
                    </p>
                    <Input
                      value={formData.externalPlayerId}
                      onChange={(e) => setFormData({ ...formData, externalPlayerId: e.target.value })}
                      placeholder="e.g. 551309"
                      className="h-11 sm:h-10"
                    />
                  </div>
                </TabsContent>

                {/* Links Tab */}
                <TabsContent value="links" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transfermarkt URL</Label>
                    <p className="text-sm text-muted-foreground">
                      Direct link to the player's Transfermarkt profile. Auto-filled by the enricher when a match is found.
                    </p>
                    <Input
                      value={(formData.links.find(l => /transfermarkt/i.test(l.label) || /transfermarkt/i.test(l.url))?.url) || ""}
                      onChange={(e) => {
                        const url = e.target.value;
                        const idx = formData.links.findIndex(l => /transfermarkt/i.test(l.label) || /transfermarkt/i.test(l.url));
                        const newLinks = [...formData.links];
                        if (idx >= 0) {
                          if (!url.trim()) {
                            newLinks.splice(idx, 1);
                          } else {
                            newLinks[idx] = { label: "Transfermarkt", url };
                          }
                        } else if (url.trim()) {
                          newLinks.push({ label: "Transfermarkt", url });
                        }
                        setFormData({ ...formData, links: newLinks });
                      }}
                      placeholder="https://www.transfermarkt.com/-/profil/spieler/..."
                      className="h-11 sm:h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>External Profile Links</Label>
                    <p className="text-sm text-muted-foreground">
                      These appear as separate link buttons on the player profile
                    </p>
                    {formData.links.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].label = e.target.value;
                            setFormData({ ...formData, links: newLinks });
                          }}
                          placeholder="Label (e.g., Transfermarkt)"
                          className="flex-1"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.links];
                            newLinks[index].url = e.target.value;
                            setFormData({ ...formData, links: newLinks });
                          }}
                          placeholder="URL"
                          className="flex-[2]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const newLinks = formData.links.filter((_, i) => i !== index);
                            setFormData({ ...formData, links: newLinks });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          links: [...formData.links, { label: "", url: "" }] 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>

                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Note about Highlights:</p>
                    <p className="text-muted-foreground">
                      Video highlights are managed through the player's Highlights tab using the file upload system, not through this edit dialog.
                    </p>
                  </div>
                </TabsContent>

                {/* Highlight Tab */}
                <TabsContent value="highlight" className="space-y-4">
                  <HighlightedMatchForm 
                    value={formData.highlightedMatch}
                    onChange={(value) => setFormData({ ...formData, highlightedMatch: value })}
                    playerAnalyses={playerAnalyses[selectedPlayerId || ""] || []}
                    playerHighlights={editingPlayer?.highlights}
                    playerName={editingPlayer?.name}
                  />
                </TabsContent>

                {/* Hudl Reports Tab */}
                <TabsContent value="hudl" className="space-y-4">
                  {editingPlayer && <PlayerHudlVisibilityTab ref={hudlVisibilityRef} playerId={editingPlayer.id} />}
                </TabsContent>

                {/* Form Tab */}
                <TabsContent value="form" className="space-y-4">
                  {editingPlayer && <PlayerFormConfigTab ref={formConfigRef} playerId={editingPlayer.id} />}
                </TabsContent>
              </Tabs>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="w-full sm:w-auto h-11 sm:h-10"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="w-full sm:w-auto h-11 sm:h-10"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignAnalysisDialogOpen} onOpenChange={setIsAssignAnalysisDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Analysis to Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StaffSearchInput
              value={analysisSearchQuery}
              onChange={setAnalysisSearchQuery}
              placeholder="Search analyses..."
            />
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-2">
                {availableAnalyses
                  .filter(analysis => matchesQuery(analysisSearchQuery, [analysis.title, analysis.description, analysis.content]))
                  .map((analysis) => (
                    <div key={analysis.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-md">
                      <Checkbox
                        id={analysis.id}
                        checked={selectedAnalysesToAssign.includes(analysis.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAnalysesToAssign([...selectedAnalysesToAssign, analysis.id]);
                          } else {
                            setSelectedAnalysesToAssign(selectedAnalysesToAssign.filter(id => id !== analysis.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <label htmlFor={analysis.id} className="flex-1 cursor-pointer">
                        <div className="font-medium">{analysis.title}</div>
                        {analysis.description && (
                          <div className="text-sm text-muted-foreground">
                            <MarkdownText text={analysis.description} />
                          </div>
                        )}
                        {analysis.category && (
                          <div className="text-xs text-muted-foreground mt-1">{analysis.category}</div>
                        )}
                      </label>
                    </div>
                  ))}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedAnalysesToAssign.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAssignAnalysisDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignAnalysis} disabled={selectedAnalysesToAssign.length === 0}>
                  Assign Selected
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist Manager (handles its own Dialog) */}
      {showPlaylistManager && selectedPlayer && (
        <PlaylistManager
          playerData={{ id: selectedPlayer.id, email: selectedPlayer.email || '', name: selectedPlayer.name }}
          availableClips={(() => {
            try {
              const highlights = typeof selectedPlayer.highlights === 'string'
                ? JSON.parse(selectedPlayer.highlights)
                : (selectedPlayer.highlights || {});

              const matchHighlights = highlights.matchHighlights || [];
              const bestClips = highlights.bestClips || [];

              const allClips = [
                ...(matchHighlights as any[]).map((clip: any, idx: number) => ({
                  id: clip.clipId || `match-${idx}`,
                  name: clip.name || clip.clipName || `Match Highlight ${idx + 1}`,
                  videoUrl: clip.videoUrl,
                  thumbnailUrl: clip.thumbnailUrl,
                })),
                ...(bestClips as any[]).map((clip: any, idx: number) => ({
                  id: clip.clipId || `best-${idx}`,
                  name: clip.name || clip.clipName || `Best Clip ${idx + 1}`,
                  videoUrl: clip.videoUrl,
                  thumbnailUrl: clip.thumbnailUrl,
                }))
              ];

              return allClips;
            } catch (e) {
              return [];
            }
          })()}
          onClose={() => setShowPlaylistManager(false)}
        />
      )}

      {isEditHighlightOpen && editingHighlight && selectedPlayer && (
        <EditHighlightDialog
          open={isEditHighlightOpen}
          onOpenChange={setIsEditHighlightOpen}
          playerId={selectedPlayer.id}
          highlightType={editingHighlight.type}
          highlight={editingHighlight.highlight}
          onSave={() => {
            fetchPlayers(true);
            setEditingHighlight(null);
          }}
        />
      )}

      {selectedPlayer && (
        <UploadPlayerImageDialog
          open={showImageUploadDialog}
          onOpenChange={setShowImageUploadDialog}
          playerName={selectedPlayer.name}
          playerId={selectedPlayer.id}
          onUploadComplete={() => {
            toast.success("Image uploaded! Refresh to see it.");
          }}
        />
      )}

      <AddPlayerDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={(open) => {
          setIsAddPlayerDialogOpen(open);
          if (!open) {
            setImageFile(null);
            setImagePreview(null);
            setClubLogoFile(null);
            setClubLogoPreview(null);
            setHoverImageFile(null);
            setHoverImagePreview(null);
          }
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleAddPlayer}
        imageFile={imageFile}
        imagePreview={imagePreview}
        clubLogoFile={clubLogoFile}
        clubLogoPreview={clubLogoPreview}
        hoverImageFile={hoverImageFile}
        hoverImagePreview={hoverImagePreview}
        handleImageSelect={handleImageSelect}
        handleRemoveImage={handleRemoveImage}
        handleClubLogoSelect={handleClubLogoSelect}
        handleRemoveClubLogo={handleRemoveClubLogo}
        handleHoverImageSelect={handleHoverImageSelect}
        handleRemoveHoverImage={handleRemoveHoverImage}
      />
      
      {/* Performance Report Dialog */}
      <PerformanceReportDialog
        open={performanceReportDialogOpen}
        onOpenChange={setPerformanceReportDialogOpen}
        analysisId={selectedReportAnalysisId}
      />

      {/* Player Categories Management */}
      <PlayerCategoriesDialog
        open={isCategoriesDialogOpen}
        onOpenChange={setIsCategoriesDialogOpen}
        onSaved={() => { fetchCustomCategories(); fetchPlayers(); }}
      />
    </div>
  );
};

export default PlayerManagement;
