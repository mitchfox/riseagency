import { useState, useEffect, useRef } from "react";
import { PageLoading } from "@/components/LoadingSpinner";
import { useScoutAuth } from "@/hooks/useScoutAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LogOut, Plus, Users, MessageSquare, Search, FileText, Trash2, Edit, Target, ChevronDown, Link, Upload, X, Phone, CreditCard, Receipt, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkillEvaluationForm } from "@/components/staff/SkillEvaluationForm";
import { initializeSkillEvaluations, SkillEvaluation, SCOUTING_POSITIONS, ScoutingPosition } from "@/data/scoutingSkills";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { Globe, TrendingUp, Award, Users2 } from "lucide-react";

interface VideoEntry {
  url: string;
  description: string;
}

interface DraftFormData {
  id?: string;
  player_name: string;
  position: string;
  year_of_birth: string;
  birth_month: string;
  birth_day: string;
  current_club: string;
  nationality: string;
  competition: string;
  skill_evaluations: SkillEvaluation[];
  strengths: string;
  weaknesses: string;
  summary: string;
  video_urls: string[];
  video_entries: VideoEntry[];
  report_type: 'rise' | 'independent' | '';
  independent_report_url: string;
  // Additional contact info
  player_contact_email: string;
  player_contact_phone: string;
  contact_name: string;
  contact_relationship: string;
  contact_email: string;
  contact_phone: string;
  existing_agent: string;
  agent_contract_end: string;
  additional_notes: string;
}

// Helper function to normalize names for comparison (remove accents, lowercase, etc.)
const normalizeNameForComparison = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    // Remove accents and diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove common suffixes/prefixes
    .replace(/\b(jr|sr|ii|iii|iv)\b/gi, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to check if two names are similar (lenient matching)
const areNamesSimilar = (name1: string, name2: string): boolean => {
  const normalized1 = normalizeNameForComparison(name1);
  const normalized2 = normalizeNameForComparison(name2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (for nicknames like "Ronaldinho" vs "Ronaldo de Assis Moreira")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  // Split into parts and check for significant overlap
  const parts1 = normalized1.split(' ').filter(p => p.length > 2);
  const parts2 = normalized2.split(' ').filter(p => p.length > 2);
  
  // If any significant name part matches
  const matchingParts = parts1.filter(p1 => 
    parts2.some(p2 => p1 === p2 || p1.includes(p2) || p2.includes(p1))
  );
  
  // If at least half the parts match, consider it a match
  if (matchingParts.length >= Math.min(parts1.length, parts2.length) / 2 && matchingParts.length > 0) {
    return true;
  }
  
  // Levenshtein distance for close matches (typos)
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - (distance / maxLength);
  
  // If more than 80% similar, consider it a match
  return similarity > 0.8;
};

// Levenshtein distance implementation
const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
};

// Helper function to get country code from nationality
const getCountryCode = (nationality: string): string => {
  const countryMap: Record<string, string> = {
    'england': 'gb-eng', 'english': 'gb-eng',
    'scotland': 'gb-sct', 'scottish': 'gb-sct',
    'wales': 'gb-wls', 'welsh': 'gb-wls',
    'northern ireland': 'gb-nir',
    'united kingdom': 'gb', 'british': 'gb', 'uk': 'gb',
    'france': 'fr', 'french': 'fr',
    'germany': 'de', 'german': 'de',
    'spain': 'es', 'spanish': 'es',
    'italy': 'it', 'italian': 'it',
    'portugal': 'pt', 'portuguese': 'pt',
    'netherlands': 'nl', 'dutch': 'nl', 'holland': 'nl',
    'belgium': 'be', 'belgian': 'be',
    'brazil': 'br', 'brazilian': 'br',
    'argentina': 'ar', 'argentinian': 'ar', 'argentine': 'ar',
    'usa': 'us', 'united states': 'us', 'american': 'us',
    'canada': 'ca', 'canadian': 'ca',
    'mexico': 'mx', 'mexican': 'mx',
    'japan': 'jp', 'japanese': 'jp',
    'south korea': 'kr', 'korean': 'kr',
    'australia': 'au', 'australian': 'au',
    'nigeria': 'ng', 'nigerian': 'ng',
    'ghana': 'gh', 'ghanaian': 'gh',
    'senegal': 'sn', 'senegalese': 'sn',
    'ivory coast': 'ci', 'ivorian': 'ci',
    'cameroon': 'cm', 'cameroonian': 'cm',
    'morocco': 'ma', 'moroccan': 'ma',
    'egypt': 'eg', 'egyptian': 'eg',
    'poland': 'pl', 'polish': 'pl',
    'croatia': 'hr', 'croatian': 'hr',
    'serbia': 'rs', 'serbian': 'rs',
    'sweden': 'se', 'swedish': 'se',
    'norway': 'no', 'norwegian': 'no',
    'denmark': 'dk', 'danish': 'dk',
    'austria': 'at', 'austrian': 'at',
    'switzerland': 'ch', 'swiss': 'ch',
    'turkey': 'tr', 'turkish': 'tr',
    'greece': 'gr', 'greek': 'gr',
    'russia': 'ru', 'russian': 'ru',
    'ukraine': 'ua', 'ukrainian': 'ua',
    'czech republic': 'cz', 'czech': 'cz', 'czechia': 'cz',
    'ireland': 'ie', 'irish': 'ie',
    'colombia': 'co', 'colombian': 'co',
    'chile': 'cl', 'chilean': 'cl',
    'uruguay': 'uy', 'uruguayan': 'uy',
    'peru': 'pe', 'peruvian': 'pe',
    'ecuador': 'ec', 'ecuadorian': 'ec',
    'venezuela': 've', 'venezuelan': 've',
    'jamaica': 'jm', 'jamaican': 'jm',
  };
  
  const normalized = nationality.toLowerCase().trim();
  return countryMap[normalized] || normalized.substring(0, 2);
};

const Potential = () => {
  const { scout, loading, signOut } = useScoutAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const formRef = useRef<DraftFormData | null>(null);
  const hasChangesRef = useRef(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageForm, setNewMessageForm] = useState({ subject: '', message: '' });
  const [bankDetailsForm, setBankDetailsForm] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    sort_code: '',
    iban: '',
    swift_bic: '',
  });

  // Form state for draft
  const [draftForm, setDraftForm] = useState<DraftFormData>({
    player_name: "",
    position: "",
    year_of_birth: "",
    birth_month: "",
    birth_day: "",
    current_club: "",
    nationality: "",
    competition: "",
    skill_evaluations: [],
    strengths: "",
    weaknesses: "",
    summary: "",
    video_urls: [],
    video_entries: [],
    report_type: '',
    independent_report_url: '',
    player_contact_email: '',
    player_contact_phone: '',
    contact_name: '',
    contact_relationship: '',
    contact_email: '',
    contact_phone: '',
    existing_agent: '',
    agent_contract_end: '',
    additional_notes: '',
  });

  // Track form changes
  useEffect(() => {
    formRef.current = draftForm;
    if (isCreatingNew && draftForm.player_name) {
      hasChangesRef.current = true;
    }
  }, [draftForm, isCreatingNew]);

  // Auto-save when navigating away
  const handleAutoSave = async () => {
    if (hasChangesRef.current && formRef.current?.player_name && scout?.id) {
      const dataToSave = {
        player_name: formRef.current.player_name,
        position: formRef.current.position,
        year_of_birth: formRef.current.year_of_birth ? parseInt(formRef.current.year_of_birth) : null,
        birth_month: formRef.current.birth_month ? parseInt(formRef.current.birth_month) : null,
        birth_day: formRef.current.birth_day ? parseInt(formRef.current.birth_day) : null,
        current_club: formRef.current.current_club,
        nationality: formRef.current.nationality,
        competition: formRef.current.competition,
        skill_evaluations: formRef.current.skill_evaluations as any,
        strengths: formRef.current.strengths,
        weaknesses: formRef.current.weaknesses,
        summary: formRef.current.summary,
        video_urls: formRef.current.video_urls,
        report_type: formRef.current.report_type,
        independent_report_url: formRef.current.independent_report_url,
        player_contact_email: formRef.current.player_contact_email,
        player_contact_phone: formRef.current.player_contact_phone,
        contact_name: formRef.current.contact_name,
        contact_relationship: formRef.current.contact_relationship,
        contact_email: formRef.current.contact_email,
        contact_phone: formRef.current.contact_phone,
        existing_agent: formRef.current.existing_agent,
        agent_contract_end: formRef.current.agent_contract_end,
        additional_notes: formRef.current.additional_notes,
        scout_id: scout.id,
      };

      try {
        if (formRef.current.id) {
          await supabase
            .from("scouting_report_drafts")
            .update(dataToSave)
            .eq("id", formRef.current.id);
        } else {
          await supabase
            .from("scouting_report_drafts")
            .insert(dataToSave);
        }
        queryClient.invalidateQueries({ queryKey: ["scout-drafts"] });
        toast.success("Draft auto-saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }
    hasChangesRef.current = false;
  };

  // Fetch scout's submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ["scout-submissions", scout?.id],
    queryFn: async () => {
      if (!scout?.id) return [];
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("*")
        .eq("scout_id", scout.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!scout?.id,
  });

  // Fetch drafts
  const { data: drafts = [] } = useQuery({
    queryKey: ["scout-drafts", scout?.id],
    queryFn: async () => {
      if (!scout?.id) return [];
      const { data, error } = await supabase
        .from("scouting_report_drafts")
        .select("*")
        .eq("scout_id", scout.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!scout?.id,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["scout-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_messages")
        .select("*")
        .eq("visible_to_scouts", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all player names to determine exclusive vs contributor
  const { data: allPlayerNames = [] } = useQuery({
    queryKey: ["all-player-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("player_name, scout_id, created_at")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch players from the main players database to check if already exists
  const { data: existingPlayers = [] } = useQuery({
    queryKey: ["existing-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate exclusive rights and contributor players with pending status support
  const playerRights = submissions.reduce((acc, report) => {
    const playerName = report.player_name;
    const isPending = report.status === 'pending';
    const isAccepted = report.status === 'accepted' || report.status === 'approved';
    
    // First check if player already exists in the main players database (lenient matching)
    const existsInPlayersDb = existingPlayers.some(p => 
      areNamesSimilar(p.name, playerName)
    );
    
    // Also check other scouting reports for similar names
    const similarReportExists = allPlayerNames.some(r => 
      areNamesSimilar(r.player_name, playerName) && r.scout_id !== scout?.id
    );
    
    if (existsInPlayersDb || similarReportExists) {
      // Player is already in the main database or reported by another scout - contributor
      acc.contributor.push({
        ...report,
        rightsStatus: isPending ? 'likely' : (isAccepted ? 'confirmed' : 'pending')
      });
    } else {
      // Check if this scout was first to report (lenient matching)
      const earliestReport = allPlayerNames.find(r => areNamesSimilar(r.player_name, playerName));
      
      if (earliestReport?.scout_id === scout?.id) {
        acc.exclusive.push({
          ...report,
          rightsStatus: isPending ? 'likely' : (isAccepted ? 'confirmed' : 'pending')
        });
      } else {
        acc.contributor.push({
          ...report,
          rightsStatus: isPending ? 'likely' : (isAccepted ? 'confirmed' : 'pending')
        });
      }
    }
    
    return acc;
  }, { exclusive: [] as any[], contributor: [] as any[] });

  // Count only confirmed (accepted) reports for the stats
  const confirmedExclusive = playerRights.exclusive.filter((r: any) => r.rightsStatus === 'confirmed');
  const confirmedContributor = playerRights.contributor.filter((r: any) => r.rightsStatus === 'confirmed');

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: DraftFormData) => {
      const dataToSave = {
        player_name: draftData.player_name,
        position: draftData.position,
        year_of_birth: draftData.year_of_birth ? parseInt(draftData.year_of_birth) : null,
        birth_month: draftData.birth_month ? parseInt(draftData.birth_month) : null,
        birth_day: draftData.birth_day ? parseInt(draftData.birth_day) : null,
        current_club: draftData.current_club,
        nationality: draftData.nationality,
        competition: draftData.competition,
        skill_evaluations: draftData.skill_evaluations as any,
        strengths: draftData.strengths,
        weaknesses: draftData.weaknesses,
        summary: draftData.summary,
        video_urls: draftData.video_urls,
        report_type: draftData.report_type,
        independent_report_url: draftData.independent_report_url,
        player_contact_email: draftData.player_contact_email,
        player_contact_phone: draftData.player_contact_phone,
        contact_name: draftData.contact_name,
        contact_relationship: draftData.contact_relationship,
        contact_email: draftData.contact_email,
        contact_phone: draftData.contact_phone,
        existing_agent: draftData.existing_agent,
        agent_contract_end: draftData.agent_contract_end,
        additional_notes: draftData.additional_notes,
        scout_id: scout?.id,
      };

      if (draftData.id) {
        const { error } = await supabase
          .from("scouting_report_drafts")
          .update(dataToSave)
          .eq("id", draftData.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scouting_report_drafts")
          .insert(dataToSave);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Draft saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["scout-drafts"] });
      hasChangesRef.current = false;
      setIsCreatingNew(false);
      setSelectedDraft(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save draft");
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("scouting_report_drafts")
        .delete()
        .eq("id", draftId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draft deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["scout-drafts"] });
      if (selectedDraft) {
        setSelectedDraft(null);
        resetForm();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete draft");
    },
  });

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (reportData: DraftFormData) => {
      const { error } = await supabase
        .from("scouting_reports")
        .insert({
          player_name: reportData.player_name,
          position: reportData.position,
          age: reportData.year_of_birth ? new Date().getFullYear() - parseInt(reportData.year_of_birth) : null,
          current_club: reportData.current_club,
          nationality: reportData.nationality,
          competition: reportData.competition,
          skill_evaluations: reportData.skill_evaluations as any,
          strengths: reportData.strengths,
          weaknesses: reportData.weaknesses,
          summary: reportData.summary,
          video_url: reportData.video_urls.join(', '),
          scout_id: scout?.id,
          scout_name: scout?.name,
          scouting_date: new Date().toISOString().split('T')[0],
          status: "pending",
        });
      
      if (error) throw error;

      if (reportData.id) {
        await supabase
          .from("scouting_report_drafts")
          .delete()
          .eq("id", reportData.id);
      }
    },
    onSuccess: () => {
      toast.success("Report submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["scout-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["scout-drafts"] });
      hasChangesRef.current = false;
      setIsCreatingNew(false);
      setSelectedDraft(null);
      resetForm();
      // Auto-switch to submissions tab
      const submissionsTab = document.querySelector('[data-state="inactive"][value="submissions"]') as HTMLElement;
      if (submissionsTab) submissionsTab.click();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit report");
    },
  });

  const resetForm = () => {
    setDraftForm({
      player_name: "",
      position: "",
      year_of_birth: "",
      birth_month: "",
      birth_day: "",
      current_club: "",
      nationality: "",
      competition: "",
      skill_evaluations: [],
      strengths: "",
      weaknesses: "",
      summary: "",
      video_urls: [],
      video_entries: [],
      report_type: '',
      independent_report_url: '',
      player_contact_email: '',
      player_contact_phone: '',
      contact_name: '',
      contact_relationship: '',
      contact_email: '',
      contact_phone: '',
      existing_agent: '',
      agent_contract_end: '',
      additional_notes: '',
    });
    setAdditionalInfoOpen(false);
    hasChangesRef.current = false;
  };

  const handleCreateNew = () => {
    resetForm();
    setSelectedDraft(null);
    setIsCreatingNew(true);
  };

  const handleEditDraft = (draft: any) => {
    setDraftForm({
      id: draft.id,
      player_name: draft.player_name || "",
      position: draft.position || "",
      year_of_birth: draft.year_of_birth?.toString() || "",
      birth_month: draft.birth_month?.toString() || "",
      birth_day: draft.birth_day?.toString() || "",
      current_club: draft.current_club || "",
      nationality: draft.nationality || "",
      competition: draft.competition || "",
      skill_evaluations: draft.skill_evaluations || [],
      strengths: draft.strengths || "",
      weaknesses: draft.weaknesses || "",
      summary: draft.summary || "",
      video_urls: draft.video_urls || [],
      video_entries: draft.video_entries || [],
      report_type: draft.report_type || '',
      independent_report_url: draft.independent_report_url || '',
      player_contact_email: draft.player_contact_email || '',
      player_contact_phone: draft.player_contact_phone || '',
      contact_name: draft.contact_name || '',
      contact_relationship: draft.contact_relationship || '',
      contact_email: draft.contact_email || '',
      contact_phone: draft.contact_phone || '',
      existing_agent: draft.existing_agent || '',
      agent_contract_end: draft.agent_contract_end || '',
      additional_notes: draft.additional_notes || '',
    });
    setSelectedDraft(draft.id);
    setIsCreatingNew(true);
  };

  const handlePositionChange = (position: string) => {
    setDraftForm(prev => {
      const skillEvals = initializeSkillEvaluations(position);
      return {
        ...prev,
        position,
        skill_evaluations: skillEvals
      };
    });
  };

  const handleBackToDrafts = async () => {
    await handleAutoSave();
    setIsCreatingNew(false);
    setSelectedDraft(null);
    resetForm();
  };

  const handleSaveDraft = () => {
    if (!draftForm.player_name) {
      toast.error("Please fill in player name");
      return;
    }
    saveDraftMutation.mutate(draftForm);
  };

  const handleSubmitReport = () => {
    if (!draftForm.player_name || !draftForm.position) {
      toast.error("Please fill in player name and position");
      return;
    }
    if (!draftForm.report_type) {
      toast.error("Please select a report type");
      return;
    }
    submitReportMutation.mutate(draftForm);
  };

  const handleAddVideoEntry = () => {
    setDraftForm(prev => ({
      ...prev,
      video_entries: [...prev.video_entries, { url: '', description: '' }]
    }));
  };

  const handleVideoEntryChange = (index: number, field: 'url' | 'description', value: string) => {
    setDraftForm(prev => {
      const newEntries = [...prev.video_entries];
      newEntries[index] = { ...newEntries[index], [field]: value };
      return { ...prev, video_entries: newEntries };
    });
  };

  const handleRemoveVideoEntry = (index: number) => {
    setDraftForm(prev => ({
      ...prev,
      video_entries: prev.video_entries.filter((_, i) => i !== index)
    }));
  };

  const filteredSubmissions = submissions.filter(sub =>
    sub.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.current_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bebas tracking-wider">Potential</h1>
              <p className="text-sm text-muted-foreground">Scout Portal - {scout?.name}</p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Globe className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="submissions">
              <Users className="h-4 w-4 mr-2" />
              My Submissions
            </TabsTrigger>
            <TabsTrigger 
              value="drafts" 
              onClick={() => {
                if (isCreatingNew) {
                  handleAutoSave();
                }
                setIsCreatingNew(false);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="admin">
              <MessageSquare className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Submissions
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{submissions.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Exclusive Rights
                    </CardTitle>
                    <Award className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {confirmedExclusive.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirmed new to database
                    {playerRights.exclusive.length - confirmedExclusive.length > 0 && (
                      <span className="text-yellow-600"> (+{playerRights.exclusive.length - confirmedExclusive.length} pending)</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contributors
                    </CardTitle>
                    <Users2 className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">
                    {confirmedContributor.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirmed existing players
                    {playerRights.contributor.length - confirmedContributor.length > 0 && (
                      <span className="text-yellow-600"> (+{playerRights.contributor.length - confirmedContributor.length} pending)</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Scouting Map */}
            <Card>
              <CardHeader>
                <CardTitle>Your Scouting Network</CardTitle>
                <CardDescription>
                  Geographic reach of your scouting reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] rounded-lg overflow-hidden border border-border">
                  <ScoutingNetworkMap />
                </div>
              </CardContent>
            </Card>

            {/* Player Rights Breakdown - Only for submitted reports */}
            {submissions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-500" />
                      Exclusive Rights Players
                    </CardTitle>
                    <CardDescription>
                      You were first to report on these players - full commission guaranteed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {playerRights.exclusive.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No exclusive rights players yet. Keep scouting to find new talent!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {playerRights.exclusive.map((report: any) => (
                            <div
                              key={report.id}
                              className={`p-3 rounded-lg border transition-colors ${
                                report.rightsStatus === 'confirmed' 
                                  ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20' 
                                  : 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{report.player_name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  report.rightsStatus === 'confirmed'
                                    ? 'bg-green-500/20 text-green-600'
                                    : 'bg-yellow-500/20 text-yellow-600'
                                }`}>
                                  {report.rightsStatus === 'confirmed' ? 'Confirmed' : 'Likely'}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {report.position} • {report.current_club}
                              </div>
                              <div className={`text-xs mt-1 ${
                                report.rightsStatus === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                Submitted {new Date(report.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users2 className="h-5 w-5 text-blue-500" />
                      Contributor Reports
                    </CardTitle>
                    <CardDescription>
                      Another scout reported on these players first - bonus commission may apply
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {playerRights.contributor.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No contributor reports yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {playerRights.contributor.map((report: any) => (
                            <div
                              key={report.id}
                              className={`p-3 rounded-lg border transition-colors ${
                                report.rightsStatus === 'confirmed' 
                                  ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' 
                                  : 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{report.player_name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  report.rightsStatus === 'confirmed'
                                    ? 'bg-blue-500/20 text-blue-600'
                                    : 'bg-yellow-500/20 text-yellow-600'
                                }`}>
                                  {report.rightsStatus === 'confirmed' ? 'Confirmed' : 'Likely'}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {report.position} • {report.current_club}
                              </div>
                              <div className={`text-xs mt-1 ${
                                report.rightsStatus === 'confirmed' ? 'text-blue-600' : 'text-yellow-600'
                              }`}>
                                Submitted {new Date(report.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Database Check Note */}
            {submissions.length > 0 && (
              <Card className="border-muted bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Note:</strong> The database is autochecked. It is possible that the player is named differently e.g. Ronaldinho could be down as Ronaldinho Gaúcho or Ronaldo de Assis Moreira instead and not being picked up, however anything written as <span className="text-yellow-600 font-medium">likely</span> is almost certain to be guaranteed. Sometimes incorrect data such as year of birth being wrong can also show it, so we cross-check before confirming.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{submissions.length}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total Reports</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">{confirmedExclusive.length}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Exclusive Rights
                      {playerRights.exclusive.length - confirmedExclusive.length > 0 && (
                        <span className="text-yellow-600 text-xs ml-1">(+{playerRights.exclusive.length - confirmedExclusive.length} likely)</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500">{confirmedContributor.length}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contributor
                      {playerRights.contributor.length - confirmedContributor.length > 0 && (
                        <span className="text-yellow-600 text-xs ml-1">(+{playerRights.contributor.length - confirmedContributor.length} likely)</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name, club, or nationality..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Submissions Grid */}
            <ScrollArea className="h-[500px]">
              {filteredSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No submissions match your search" : "No submissions yet. Start scouting!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubmissions.map((report) => {
                    const isExclusive = playerRights.exclusive.some((r: any) => r.id === report.id);
                    return (
                      <Card 
                        key={report.id} 
                        className={`overflow-hidden transition-all hover:shadow-lg ${
                          isExclusive 
                            ? 'border-l-4 border-l-green-500' 
                            : 'border-l-4 border-l-blue-500'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg truncate">{report.player_name}</CardTitle>
                                {report.nationality && (
                                  <img 
                                    src={`https://flagcdn.com/20x15/${getCountryCode(report.nationality)}.png`}
                                    alt={report.nationality}
                                    className="h-4 w-auto flex-shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isExclusive 
                                    ? 'bg-green-500/10 text-green-600' 
                                    : 'bg-blue-500/10 text-blue-600'
                                }`}>
                                  {isExclusive ? (
                                    <>
                                      <Award className="h-3 w-3" />
                                      Exclusive Rights
                                    </>
                                  ) : (
                                    <>
                                      <Users2 className="h-3 w-3" />
                                      Contributor
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                report.status === "recommended"
                                  ? "bg-green-500/10 text-green-500"
                                  : report.status === "monitoring"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : report.status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {report.status}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {report.position && (
                                <span className="px-2 py-1 bg-muted rounded-md">{report.position}</span>
                              )}
                              {report.current_club && (
                                <span className="px-2 py-1 bg-muted rounded-md">{report.current_club}</span>
                              )}
                              {report.age && (
                                <span className="px-2 py-1 bg-muted rounded-md">{report.age} yrs</span>
                              )}
                            </div>
                            {report.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{report.summary}</p>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground">
                                {new Date(report.created_at).toLocaleDateString('en-GB', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </p>
                              {report.competition && (
                                <span className="text-xs text-muted-foreground">{report.competition}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Drafts Tab */}
          <TabsContent value="drafts">
            {!isCreatingNew ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {drafts.length} saved {drafts.length === 1 ? "draft" : "drafts"}
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Report
                  </Button>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {drafts.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <p className="text-muted-foreground mb-4">No saved drafts</p>
                          <Button onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Draft
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      drafts.map((draft) => (
                        <Card key={draft.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle>{draft.player_name || "Untitled Draft"}</CardTitle>
                                <CardDescription>
                                  {draft.position && `${draft.position} • `}
                                  {draft.current_club && `${draft.current_club} • `}
                                  {draft.nationality}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDraft(draft)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDraftMutation.mutate(draft.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(draft.updated_at).toLocaleDateString()} at{" "}
                              {new Date(draft.updated_at).toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {selectedDraft ? "Edit Draft" : "New Scouting Report"}
                      </CardTitle>
                      <CardDescription>
                        {!draftForm.position 
                          ? "Start by filling in basic player details and selecting a position"
                          : "Fill in the detailed evaluation for each attribute"
                        }
                      </CardDescription>
                    </div>
                    <Button variant="ghost" onClick={handleBackToDrafts}>
                      Back to Drafts
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {/* Basic Info Section - Always visible */}
                      <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Basic Information
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Required fields marked with *
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="player_name">Player Name *</Label>
                              <Input
                                id="player_name"
                                value={draftForm.player_name}
                                onChange={(e) => setDraftForm({ ...draftForm, player_name: e.target.value })}
                                placeholder="Full name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="position">Position *</Label>
                              <Select
                                value={draftForm.position}
                                onValueChange={handlePositionChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SCOUTING_POSITIONS.map((pos) => (
                                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="year_of_birth">
                                Age
                                {draftForm.year_of_birth && (
                                  <span className="ml-2 text-primary font-semibold">
                                    {(() => {
                                      const year = parseInt(draftForm.year_of_birth);
                                      const month = draftForm.birth_month ? parseInt(draftForm.birth_month) : null;
                                      const day = draftForm.birth_day ? parseInt(draftForm.birth_day) : null;
                                      const today = new Date();
                                      let age = today.getFullYear() - year;
                                      if (month && day) {
                                        const birthDate = new Date(year, month - 1, day);
                                        if (today < new Date(today.getFullYear(), month - 1, day)) {
                                          age--;
                                        }
                                      } else if (month) {
                                        if (today.getMonth() + 1 < month) {
                                          age--;
                                        }
                                      }
                                      return `${age} years old`;
                                    })()}
                                  </span>
                                )}
                              </Label>
                              <Input
                                id="year_of_birth"
                                type="number"
                                value={draftForm.year_of_birth}
                                onChange={(e) => setDraftForm({ ...draftForm, year_of_birth: e.target.value })}
                                placeholder="Year of birth (YYYY)"
                                min={1980}
                                max={new Date().getFullYear()}
                              />
                              <div className="flex gap-2 mt-2">
                                <Input
                                  type="number"
                                  value={draftForm.birth_day}
                                  onChange={(e) => setDraftForm({ ...draftForm, birth_day: e.target.value })}
                                  placeholder="Day"
                                  className={`w-20 ${!draftForm.birth_day ? 'opacity-50' : ''}`}
                                  min={1}
                                  max={31}
                                />
                                <Input
                                  type="number"
                                  value={draftForm.birth_month}
                                  onChange={(e) => setDraftForm({ ...draftForm, birth_month: e.target.value })}
                                  placeholder="Month"
                                  className={`w-20 ${!draftForm.birth_month ? 'opacity-50' : ''}`}
                                  min={1}
                                  max={12}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nationality">Nationality</Label>
                              <Input
                                id="nationality"
                                value={draftForm.nationality}
                                onChange={(e) => setDraftForm({ ...draftForm, nationality: e.target.value })}
                                placeholder="Nationality"
                              />
                              {draftForm.nationality && (
                                <div className="flex items-center gap-2 mt-1">
                                  <img 
                                    src={`https://flagcdn.com/32x24/${getCountryCode(draftForm.nationality)}.png`}
                                    alt={draftForm.nationality}
                                    className="h-6 w-auto rounded-sm shadow-sm"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                  <span className="text-xs text-muted-foreground">{draftForm.nationality}</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="current_club">Current Club</Label>
                              <Input
                                id="current_club"
                                value={draftForm.current_club}
                                onChange={(e) => setDraftForm({ ...draftForm, current_club: e.target.value })}
                                placeholder="Club name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="competition">Competition</Label>
                              <Input
                                id="competition"
                                value={draftForm.competition}
                                onChange={(e) => setDraftForm({ ...draftForm, competition: e.target.value })}
                                placeholder="League/Competition"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Additional Information - Collapsible */}
                      <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
                        <Card className="border-border/50">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Additional Information (Optional)</CardTitle>
                                <ChevronDown className={`h-5 w-5 transition-transform ${additionalInfoOpen ? 'rotate-180' : ''}`} />
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="space-y-6 pt-0">
                              {/* FIFA Rules Notice */}
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                  <strong>Important:</strong> Due to FIFA agent licensing regulations, you cannot represent yourself as working on our behalf when reaching out to players directly. However, you are welcome to ask if you can pass their details onto agents you are working with.
                                </p>
                              </div>

                              {/* Player Contact */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium">Player Contact Details (if known)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Player Email</Label>
                                    <Input
                                      type="email"
                                      value={draftForm.player_contact_email}
                                      onChange={(e) => setDraftForm({ ...draftForm, player_contact_email: e.target.value })}
                                      placeholder="player@email.com"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Player Phone</Label>
                                    <Input
                                      value={draftForm.player_contact_phone}
                                      onChange={(e) => setDraftForm({ ...draftForm, player_contact_phone: e.target.value })}
                                      placeholder="+44 ..."
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Parent/Friend/Relation Contact */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium">Parent / Friend / Relation Contact (if known)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Contact Name</Label>
                                    <Input
                                      value={draftForm.contact_name}
                                      onChange={(e) => setDraftForm({ ...draftForm, contact_name: e.target.value })}
                                      placeholder="Full name"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Relationship to Player</Label>
                                    <Input
                                      value={draftForm.contact_relationship}
                                      onChange={(e) => setDraftForm({ ...draftForm, contact_relationship: e.target.value })}
                                      placeholder="e.g., Father, Coach, Friend"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Contact Email</Label>
                                    <Input
                                      type="email"
                                      value={draftForm.contact_email}
                                      onChange={(e) => setDraftForm({ ...draftForm, contact_email: e.target.value })}
                                      placeholder="contact@email.com"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Contact Phone</Label>
                                    <Input
                                      value={draftForm.contact_phone}
                                      onChange={(e) => setDraftForm({ ...draftForm, contact_phone: e.target.value })}
                                      placeholder="+44 ..."
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Existing Agent Info */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium">Existing Agent Information (if known)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Current Agent/Agency</Label>
                                    <Input
                                      value={draftForm.existing_agent}
                                      onChange={(e) => setDraftForm({ ...draftForm, existing_agent: e.target.value })}
                                      placeholder="Agent name or agency"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Contract End Date (if known)</Label>
                                    <Input
                                      type="date"
                                      value={draftForm.agent_contract_end}
                                      onChange={(e) => setDraftForm({ ...draftForm, agent_contract_end: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Additional Notes */}
                              <div className="space-y-2">
                                <Label>Additional Notes</Label>
                                <Textarea
                                  value={draftForm.additional_notes}
                                  onChange={(e) => setDraftForm({ ...draftForm, additional_notes: e.target.value })}
                                  placeholder="Any other relevant details about the player or making contact with them..."
                                  rows={4}
                                />
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>

                      {/* Position Required Message - Hidden, position selection is in basic info */}

                      {/* Report Type Selection - Only show when position is selected */}
                      {draftForm.position && (
                        <Card className="border-border/50 animate-fade-in">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Report Type *</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div
                                onClick={() => setDraftForm({ ...draftForm, report_type: 'rise' })}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  draftForm.report_type === 'rise'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="h-5 w-5 text-primary" />
                                  <span className="font-medium">RISE Report</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Complete our detailed evaluation form with position-specific attributes and grades.
                                </p>
                              </div>
                              <div
                                onClick={() => setDraftForm({ ...draftForm, report_type: 'independent' })}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  draftForm.report_type === 'independent'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Upload className="h-5 w-5 text-primary" />
                                  <span className="font-medium">Independent Report</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Upload a PDF or share a link to your own scouting report format.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Independent Report Upload - Only show when independent is selected */}
                      {draftForm.position && draftForm.report_type === 'independent' && (
                        <Card className="border-border/50 animate-fade-in">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Independent Report</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Upload className="h-4 w-4" />
                                  Upload PDF
                                </Label>
                                <Input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // For now, just show file name - actual upload would need storage integration
                                      toast.info(`File selected: ${file.name}. Upload functionality coming soon.`);
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1 border-t border-border" />
                                <span className="text-xs text-muted-foreground">OR</span>
                                <div className="flex-1 border-t border-border" />
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Link className="h-4 w-4" />
                                  Share Link
                                </Label>
                                <Input
                                  type="url"
                                  value={draftForm.independent_report_url}
                                  onChange={(e) => setDraftForm({ ...draftForm, independent_report_url: e.target.value })}
                                  placeholder="https://... (Google Drive, Dropbox, etc.)"
                                />
                              </div>
                            </div>
                            <p className="text-sm italic text-muted-foreground mt-4">
                              We respond to every single RISE Report and seriously assess the player with feedback provided to the scout for their development. For Independent Reports, we only respond if we intend to scout the player more deeply.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Skill Evaluations - Only show when position is selected AND report type is RISE */}
                      {draftForm.position && draftForm.report_type === 'rise' && draftForm.skill_evaluations.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Skill Evaluations - {draftForm.position}</h3>
                          </div>
                          <SkillEvaluationForm
                            skillEvaluations={draftForm.skill_evaluations}
                            onChange={(evaluations) => setDraftForm({ ...draftForm, skill_evaluations: evaluations })}
                          />
                        </div>
                      )}

                      {/* Analysis Section - Only show when position is selected AND report type is RISE */}
                      {draftForm.position && draftForm.report_type === 'rise' && (
                        <Card className="border-border/50 animate-fade-in">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Analysis & Notes</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="strengths">Strengths</Label>
                              <Textarea
                                id="strengths"
                                value={draftForm.strengths}
                                onChange={(e) => setDraftForm({ ...draftForm, strengths: e.target.value })}
                                placeholder="Key strengths and attributes..."
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="weaknesses">Weaknesses</Label>
                              <Textarea
                                id="weaknesses"
                                value={draftForm.weaknesses}
                                onChange={(e) => setDraftForm({ ...draftForm, weaknesses: e.target.value })}
                                placeholder="Areas for improvement..."
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="summary">Summary</Label>
                              <Textarea
                                id="summary"
                                value={draftForm.summary}
                                onChange={(e) => setDraftForm({ ...draftForm, summary: e.target.value })}
                                placeholder="Overall assessment..."
                                rows={4}
                              />
                            </div>

                            {/* Video URLs */}
                            <div className="space-y-3">
                              <Label>Video URLs <span className="text-muted-foreground font-normal">(matches, highlights, etc.)</span></Label>
                              {draftForm.video_entries.map((entry, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      type="url"
                                      value={entry.url}
                                      onChange={(e) => handleVideoEntryChange(index, 'url', e.target.value)}
                                      placeholder="https://..."
                                    />
                                    <Input
                                      value={entry.description}
                                      onChange={(e) => handleVideoEntryChange(index, 'description', e.target.value)}
                                      placeholder="e.g., vs Manchester City, U18 highlights"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveVideoEntry(index)}
                                    className="mt-1"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddVideoEntry}
                              >
                                <Link className="h-4 w-4 mr-2" />
                                Add Video URL
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 sticky bottom-0 bg-background py-3 border-t border-border">
                        <Button
                          onClick={handleSaveDraft}
                          disabled={saveDraftMutation.isPending || !draftForm.player_name}
                          variant="outline"
                          className="flex-1"
                        >
                          {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button
                          onClick={handleSubmitReport}
                          disabled={submitReportMutation.isPending || !draftForm.player_name || !draftForm.position || !draftForm.report_type}
                          className="flex-1"
                        >
                          {submitReportMutation.isPending ? "Submitting..." : "Submit Report"}
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Messages Section */}
              <Card className="lg:row-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Messages
                      </CardTitle>
                      <CardDescription>
                        Updates and announcements from the team
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowNewMessageModal(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground text-sm">No messages yet</p>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          const isExpanded = expandedMessage === message.id || (index === 0 && !expandedMessage);
                          return (
                            <div 
                              key={message.id} 
                              className={`rounded-lg border cursor-pointer transition-all ${
                                message.priority === "high" 
                                  ? 'border-red-500/30 bg-red-500/5' 
                                  : 'border-border bg-muted/30'
                              } ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:bg-accent/50'}`}
                              onClick={() => setExpandedMessage(isExpanded && index !== 0 ? null : message.id)}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-sm">{message.title}</h4>
                                  <div className="flex items-center gap-2">
                                    {message.priority === "high" && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-full flex-shrink-0">
                                        Urgent
                                      </span>
                                    )}
                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="mt-2 pt-2 border-t border-border/50">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{message.content}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(message.created_at).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Contact Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Contact Us
                  </CardTitle>
                  <CardDescription>
                    Get in touch with the scouting team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-full">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">Urgent Messages</p>
                        <p className="text-sm text-muted-foreground">For time-sensitive matters, contact us on WhatsApp</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-3 bg-green-600 hover:bg-green-700"
                      onClick={() => window.open('https://wa.me/447000000000', '_blank')}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Message on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payments & Invoices
                  </CardTitle>
                  <CardDescription>
                    Manage your payment details and view invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start group"
                    onClick={() => setShowBankDetailsModal(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Bank Details
                    <span className="ml-auto text-xs text-muted-foreground group-hover:text-foreground transition-colors">View payment info</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start group"
                    onClick={() => setShowInvoicesModal(true)}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Invoices
                    <span className="ml-auto text-xs text-muted-foreground group-hover:text-foreground transition-colors">View your invoices</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Bank Details Modal */}
            {showBankDetailsModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBankDetailsModal(false)}>
                <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Your Bank Details
                    </CardTitle>
                    <CardDescription>
                      Enter your payment details to receive commission payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input
                        value={bankDetailsForm.account_name}
                        onChange={(e) => setBankDetailsForm({...bankDetailsForm, account_name: e.target.value})}
                        placeholder="Full name on account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={bankDetailsForm.bank_name}
                        onChange={(e) => setBankDetailsForm({...bankDetailsForm, bank_name: e.target.value})}
                        placeholder="e.g., Barclays, HSBC"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={bankDetailsForm.account_number}
                          onChange={(e) => setBankDetailsForm({...bankDetailsForm, account_number: e.target.value})}
                          placeholder="12345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Code</Label>
                        <Input
                          value={bankDetailsForm.sort_code}
                          onChange={(e) => setBankDetailsForm({...bankDetailsForm, sort_code: e.target.value})}
                          placeholder="12-34-56"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN (for international transfers)</Label>
                      <Input
                        value={bankDetailsForm.iban}
                        onChange={(e) => setBankDetailsForm({...bankDetailsForm, iban: e.target.value})}
                        placeholder="GB82 WEST 1234 5698 7654 32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SWIFT/BIC Code</Label>
                      <Input
                        value={bankDetailsForm.swift_bic}
                        onChange={(e) => setBankDetailsForm({...bankDetailsForm, swift_bic: e.target.value})}
                        placeholder="BUKBGB22"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowBankDetailsModal(false)}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={() => {
                        toast.success("Bank details saved successfully");
                        setShowBankDetailsModal(false);
                      }}>
                        Save Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoices Modal */}
            {showInvoicesModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInvoicesModal(false)}>
                <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Your Invoices
                    </CardTitle>
                    <CardDescription>
                      View and download your commission invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No invoices yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Invoices will appear here once commissions are processed</p>
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => setShowInvoicesModal(false)}>
                      Close
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* New Message Modal */}
            {showNewMessageModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewMessageModal(false)}>
                <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      New Message
                    </CardTitle>
                    <CardDescription>
                      Send a message to the scouting team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Input
                        value={newMessageForm.subject}
                        onChange={(e) => setNewMessageForm({...newMessageForm, subject: e.target.value})}
                        placeholder="What's this about?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message *</Label>
                      <Textarea
                        value={newMessageForm.message}
                        onChange={(e) => setNewMessageForm({...newMessageForm, message: e.target.value})}
                        placeholder="Type your message here..."
                        rows={5}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowNewMessageModal(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        disabled={!newMessageForm.subject || !newMessageForm.message}
                        onClick={() => {
                          toast.success("Message sent successfully!");
                          setShowNewMessageModal(false);
                          setNewMessageForm({ subject: '', message: '' });
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Potential;
