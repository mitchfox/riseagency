import { useState, useEffect, useCallback } from "react";
import * as tus from 'tus-js-client';
import { useNavigate } from "react-router-dom";
import { sharedSupabase as supabase } from "@/integrations/supabase/sharedClient";
import { supabase as localSupabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { Pencil, Trash2, Plus, X, Sparkles, Database, Copy, Settings, Eye, Users, ChevronDown, FileEdit, EyeOff, RefreshCw, Link2, SpellCheck, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAnalysisSlug } from "@/lib/urlHelpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AnalysisMatchDetails } from "./analysis/AnalysisMatchDetails";
import { AnalysisSchemeSection } from "./analysis/AnalysisSchemeSection";
import { AnalysisPointsSection } from "./analysis/AnalysisPointsSection";
import { AnalysisOverviewSection } from "./analysis/AnalysisOverviewSection";
import { AnalysisQuickLink } from "./analysis/AnalysisQuickLink";
import { FFFPackageHeader } from "./FFFPackageHeader";
import { ActionReportsList } from "./analysis/ActionReportsList";
import { ReportLanguageSelector } from "./ReportLanguageSelector";
import { EXAMPLE_LANGUAGE_OPTIONS } from "@/lib/exampleLanguages";

type AnalysisType = "pre-match" | "post-match" | "concept";

interface Analysis {
  id: string;
  analysis_type: AnalysisType;
  title: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_team_bold?: boolean | null;
  away_team_bold?: boolean | null;
  match_date?: string | null;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
  match_image_url?: string | null;
  home_team_bg_color?: string | null;
  away_team_bg_color?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  key_details?: string | null;
  opposition_strengths?: string | null;
  opposition_weaknesses?: string | null;
  matchups?: any[];
  selected_scheme?: string | null;
  starting_xi?: any[];
  kit_primary_color?: string | null;
  kit_secondary_color?: string | null;
  kit_collar_color?: string | null;
  kit_number_color?: string | null;
  kit_stripe_style?: string | null;
  player_team?: string | null;
  scheme_title?: string | null;
  scheme_paragraph_1?: string | null;
  scheme_paragraph_2?: string | null;
  scheme_image_url?: string | null;
  player_image_url?: string | null;
  strengths_improvements?: string | null;
  concept?: string | null;
  explanation?: string | null;
  points?: any[];
  video_url?: string | null;
  visibility_status?: "draft" | "hidden" | "live" | null;
  estimated_ready_at?: string | null;
  created_at: string;
  player_name?: string | null;
  category?: "match" | "training" | null;
}

interface Point {
  title: string;
  paragraph_1: string;
  paragraph_2: string;
  images: string[];
}

interface Matchup {
  name: string;
  shirt_number: string;
  image_url: string;
  notes?: string;
}

interface AIWriterState {
  open: boolean;
  category: 'pre-match' | 'post-match' | 'concept' | 'other';
  paragraph1Info: string;
  paragraph2Info: string;
  targetPointIndex?: number;
}

interface AnalysisManagementProps {
  isAdmin: boolean;
  defaultPlayerId?: string;
}

const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024 * 1024;

const toDateTimeLocalValue = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const AnalysisManagement = ({ isAdmin, defaultPlayerId }: AnalysisManagementProps) => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'pre-match' | 'post-match' | 'concept'>('list');
  const [activeListTab, setActiveListTab] = useState<string>("pre-match");
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("pre-match");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiWriter, setAiWriter] = useState<AIWriterState>({
    open: false,
    category: 'pre-match',
    paragraph1Info: '',
    paragraph2Info: ''
  });
  const [overviewWriter, setOverviewWriter] = useState({
    open: false,
    category: 'pre-match' as 'pre-match' | 'post-match',
    overviewInfo: ''
  });
  const [schemeWriter, setSchemeWriter] = useState({
    open: false,
    schemeInfo: ''
  });
  const [generatedContent, setGeneratedContent] = useState<{
    open: boolean;
    type: 'point' | 'overview' | 'scheme';
    content: string;
    paragraph1?: string;
    paragraph2?: string;
    category: string;
  }>({
    open: false,
    type: 'point',
    content: '',
    category: 'pre-match'
  });
  const [tweakDialog, setTweakDialog] = useState({
    open: false,
    tweakInstructions: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [examplesDialogOpen, setExamplesDialogOpen] = useState(false);
  const [examplesCategory, setExamplesCategory] = useState('pre-match');
  const [examplesType, setExamplesType] = useState<'point' | 'overview'>('point');
  const [examples, setExamples] = useState<any[]>([]);
  const [editingExample, setEditingExample] = useState<any | null>(null);
  const [exampleFormData, setExampleFormData] = useState({
    paragraph_1: '',
    content: ''
  });
  const [linkedPlayers, setLinkedPlayers] = useState<Record<string, { playerId: string; playerName: string }[]>>({});
  const [concepts, setConcepts] = useState<any[]>([]);
  const [taggedPlayerIds, setTaggedPlayerIds] = useState<string[]>([]);
  const [analysisLanguage, setAnalysisLanguage] = useState("en");
  const [spellCheckOn, setSpellCheckOn] = useState(false);
  const [examplesFilter, setExamplesFilter] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Record<string, any>>({
    points: [],
    matchups: [],
    starting_xi: [],
  });

  // Formation templates with position coordinates (x, y as percentages)
  const formationTemplates: Record<string, { x: number; y: number; position: string }[]> = {
    "4-3-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 30, y: 50, position: "CM"}, {x: 50, y: 50, position: "CM"}, {x: 70, y: 50, position: "CM"},
      {x: 15, y: 20, position: "LW"}, {x: 50, y: 20, position: "ST"}, {x: 85, y: 20, position: "RW"}
    ],
    "4-2-1-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 35, y: 55, position: "CDM"}, {x: 65, y: 55, position: "CDM"},
      {x: 50, y: 38, position: "CAM"},
      {x: 15, y: 18, position: "LW"}, {x: 50, y: 15, position: "ST"}, {x: 85, y: 18, position: "RW"}
    ],
    "4-2-4": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 35, y: 50, position: "CM"}, {x: 65, y: 50, position: "CM"},
      {x: 15, y: 20, position: "LW"}, {x: 40, y: 18, position: "ST"}, {x: 60, y: 18, position: "ST"}, {x: 85, y: 20, position: "RW"}
    ],
    "4-2-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 35, y: 50, position: "CM"}, {x: 65, y: 50, position: "CM"},
      {x: 15, y: 28, position: "LW"}, {x: 40, y: 20, position: "ST"}, {x: 60, y: 20, position: "ST"}, {x: 85, y: 28, position: "RW"}
    ],
    "4-3-1-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 15, y: 70, position: "LB"}, {x: 35, y: 70, position: "CB"}, {x: 65, y: 70, position: "CB"}, {x: 85, y: 70, position: "RB"},
      {x: 30, y: 50, position: "CM"}, {x: 50, y: 55, position: "CDM"}, {x: 70, y: 50, position: "CM"},
      {x: 50, y: 32, position: "CAM"},
      {x: 35, y: 15, position: "ST"}, {x: 65, y: 15, position: "ST"}
    ],
    "3-4-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 15, y: 50, position: "LM"}, {x: 40, y: 50, position: "CM"}, {x: 60, y: 50, position: "CM"}, {x: 85, y: 50, position: "RM"},
      {x: 20, y: 20, position: "LW"}, {x: 50, y: 18, position: "ST"}, {x: 80, y: 20, position: "RW"}
    ],
    "3-3-1-3": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 30, y: 52, position: "CM"}, {x: 50, y: 55, position: "CDM"}, {x: 70, y: 52, position: "CM"},
      {x: 50, y: 35, position: "CAM"},
      {x: 20, y: 18, position: "LW"}, {x: 50, y: 15, position: "ST"}, {x: 80, y: 18, position: "RW"}
    ],
    "3-3-4": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 30, y: 48, position: "CM"}, {x: 50, y: 50, position: "CM"}, {x: 70, y: 48, position: "CM"},
      {x: 15, y: 22, position: "LW"}, {x: 40, y: 18, position: "ST"}, {x: 60, y: 18, position: "ST"}, {x: 85, y: 22, position: "RW"}
    ],
    "3-3-2-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 30, y: 50, position: "CM"}, {x: 50, y: 52, position: "CM"}, {x: 70, y: 50, position: "CM"},
      {x: 30, y: 30, position: "CAM"}, {x: 70, y: 30, position: "CAM"},
      {x: 35, y: 15, position: "ST"}, {x: 65, y: 15, position: "ST"}
    ],
    "3-4-1-2": [
      {x: 50, y: 90, position: "GK"},
      {x: 25, y: 70, position: "CB"}, {x: 50, y: 70, position: "CB"}, {x: 75, y: 70, position: "CB"},
      {x: 15, y: 50, position: "LM"}, {x: 40, y: 50, position: "CM"}, {x: 60, y: 50, position: "CM"}, {x: 85, y: 50, position: "RM"},
      {x: 50, y: 30, position: "CAM"},
      {x: 35, y: 15, position: "ST"}, {x: 65, y: 15, position: "ST"}
    ]
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(defaultPlayerId || "none");
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [selectedPerformanceReportId, setSelectedPerformanceReportId] = useState("none");
  const [performanceReportClips, setPerformanceReportClips] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyses();
    fetchPlayers();
    fetchLinkedPlayers();
    fetchConcepts();
  }, []);

  useEffect(() => {
    if (selectedPlayerId && selectedPlayerId !== "none") {
      fetchPerformanceReports(selectedPlayerId);
    } else {
      setPerformanceReports([]);
      setSelectedPerformanceReportId("none");
      setPerformanceReportClips([]);
    }
  }, [selectedPlayerId]);

  useEffect(() => {
    if (defaultPlayerId) {
      setSelectedPlayerId(defaultPlayerId);
    }
  }, [defaultPlayerId]);

  // Fetch clips when a performance report is selected
  useEffect(() => {
    if (selectedPerformanceReportId && selectedPerformanceReportId !== "none") {
      fetchPerformanceReportClips(selectedPerformanceReportId);
    } else {
      setPerformanceReportClips([]);
    }
  }, [selectedPerformanceReportId]);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("match_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnalyses((data as Analysis[]) || []);
    } catch (error: any) {
      toast.error("Failed to fetch analyses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, representation_status, club, club_logo")
        .order("name")
        .range(0, 4999);

      if (error) throw error;
      let list: any[] = data || [];
      try {
        const uid = localStorage.getItem("staff_user_id") || sessionStorage.getItem("staff_user_id");
        if (uid) {
          const { data: roles } = await localSupabase.from("user_roles").select("role").eq("user_id", uid);
          const rl = (roles || []).map((r: any) => r.role);
          if (rl.length > 0 && rl.every((r: string) => r === "stats_updater")) {
            const { data: assigns } = await (localSupabase as any)
              .from("staff_player_assignments").select("player_id")
              .eq("user_id", uid).eq("role_key", "stats_updater");
            const allowed = new Set(((assigns as any[]) || []).map((a: any) => a.player_id));
            list = list.filter((p: any) => allowed.has(p.id));
          }
        }
      } catch { /* ignore */ }
      setPlayers(list);
    } catch (error: any) {
      console.error("Failed to fetch players:", error);
    }
  };

  const fetchPerformanceReports = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("*")
        .eq("player_id", playerId)
        .order("analysis_date", { ascending: false });

      if (error) throw error;
      setPerformanceReports(data || []);
    } catch (error: any) {
      console.error("Failed to fetch performance reports:", error);
    }
  };

  const fetchPerformanceReportClips = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("id, video_url, action_type, action_number, minute, action_score, notes")
        .eq("analysis_id", reportId)
        .not("video_url", "is", null)
        .order("action_number");

      if (error) throw error;
      setPerformanceReportClips(data || []);
    } catch (error: any) {
      console.error("Failed to fetch performance report clips:", error);
    }
  };

  const fetchLinkedPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("player_analysis")
        .select("analysis_writer_id, player_id, players(name)")
        .not("analysis_writer_id", "is", null);

      if (error) throw error;

      const grouped: Record<string, { playerId: string; playerName: string }[]> = {};
      (data || []).forEach((item: any) => {
        const analysisId = item.analysis_writer_id;
        if (!grouped[analysisId]) {
          grouped[analysisId] = [];
        }
        grouped[analysisId].push({
          playerId: item.player_id,
          playerName: item.players?.name || 'Unknown Player'
        });
      });

      // Also fetch manually tagged players
      const { data: tagData } = await supabase
        .from("analysis_player_tags")
        .select("analysis_id, player_id");

      if (tagData && tagData.length > 0) {
        // Get unique player IDs to look up names
        const tagPlayerIds = [...new Set(tagData.map(t => t.player_id))];
        const { data: tagPlayers } = await supabase
          .from("players")
          .select("id, name")
          .in("id", tagPlayerIds);
        const playerNameMap: Record<string, string> = {};
        (tagPlayers || []).forEach(p => { playerNameMap[p.id] = p.name; });

        tagData.forEach((item: any) => {
          const analysisId = item.analysis_id;
          if (!grouped[analysisId]) {
            grouped[analysisId] = [];
          }
          const exists = grouped[analysisId].some(p => p.playerId === item.player_id);
          if (!exists) {
            grouped[analysisId].push({
              playerId: item.player_id,
              playerName: playerNameMap[item.player_id] || 'Unknown Player'
            });
          }
        });
      }

      setLinkedPlayers(grouped);
    } catch (error: any) {
      console.error("Failed to fetch linked players:", error);
    }
  };

  const fetchConcepts = async () => {
    try {
      // Fetch concepts from coaching_analysis table (shared with coaching database)
      const { data, error } = await supabase
        .from("coaching_analysis")
        .select("*")
        .eq("analysis_type", "concept")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConcepts(data || []);
    } catch (error: any) {
      console.error("Failed to fetch concepts:", error);
    }
  };

  const handleOpenDialog = async (type: AnalysisType, analysis?: Analysis) => {
    setAnalysisType(type);
    // Set activeView immediately so the editor shows even if async fetches fail
    setActiveView(type);
    
    if (analysis) {
      setEditingAnalysis(analysis);
      // Assign stable _id to any points that don't have one
      const pointsWithIds = (analysis.points || []).map((p: any) => ({
        ...p,
        _id: p._id || crypto.randomUUID(),
      }));

      // Load match_time from linked fixture (kickoff time lives on fixtures table)
      let fixtureMatchTime: string | null = null;
      if ((analysis as any).fixture_id) {
        try {
          const { data: fx } = await supabase
            .from("fixtures")
            .select("match_time")
            .eq("id", (analysis as any).fixture_id)
            .maybeSingle();
          fixtureMatchTime = (fx as any)?.match_time || null;
        } catch (e) {
          console.error("Failed to load fixture match_time", e);
        }
      }

      setFormData({ ...analysis, points: pointsWithIds, match_time: fixtureMatchTime || "" });

      try {
        const { data } = await supabase
          .from("player_analysis")
          .select("player_id, id")
          .eq("analysis_writer_id", analysis.id)
          .maybeSingle();

        if (data) {
          setSelectedPlayerId(data.player_id);
          setSelectedPerformanceReportId(data.id);
        }

        // Load tagged players
        const { data: tags } = await supabase
          .from("analysis_player_tags")
          .select("player_id")
          .eq("analysis_id", analysis.id);
        setTaggedPlayerIds((tags || []).map(t => t.player_id));
      } catch (error) {
        console.error("Error loading analysis details:", error);
        toast.error("Some analysis details could not be loaded");
      }
    } else {
      setEditingAnalysis(null);
      setFormData({
        analysis_type: type,
        points: [],
        matchups: [],
        starting_xi: [],
        visibility_status: "live",
        estimated_ready_at: null,
        category: "match",
      });
      // In Athlete Centre context, keep the currently selected player pre-linked
      setSelectedPlayerId(defaultPlayerId || "none");
      setSelectedPerformanceReportId("none");
      setTaggedPlayerIds(defaultPlayerId ? [defaultPlayerId] : []);
    }
  };

  const handleCloseDialog = () => {
    setActiveView('list');
    setEditingAnalysis(null);
    setFormData({ points: [], matchups: [], starting_xi: [] });
    // Preserve Athlete Centre selected player context instead of resetting to none
    setSelectedPlayerId(defaultPlayerId || "none");
    setSelectedPerformanceReportId("none");
    setTaggedPlayerIds(defaultPlayerId ? [defaultPlayerId] : []);
  };

  const handleSchemeChange = (scheme: string) => {
    const template = formationTemplates[scheme];
    const existingXI = formData.starting_xi || [];

    const startingXI = template.map((pos, idx) => ({
      ...pos,
      name: existingXI[idx]?.name || "",
      shirt_number: existingXI[idx]?.shirt_number || "",
      id: idx
    }));
    setFormData({ ...formData, selected_scheme: scheme, starting_xi: startingXI });
  };

  const updateStartingXIPlayer = (index: number, field: 'name' | 'shirt_number' | 'position' | 'x' | 'y', value: string | number) => {
    const updatedXI = [...(formData.starting_xi || [])];
    updatedXI[index] = { ...updatedXI[index], [field]: value };
    setFormData({ ...formData, starting_xi: updatedXI });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string,
    pointIndex?: number,
    isMultiple?: boolean,
    matchupIndex?: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `analysis-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("analysis-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("analysis-files").getPublicUrl(filePath);

      if (matchupIndex !== undefined) {
        const updatedMatchups = [...(formData.matchups || [])];
        updatedMatchups[matchupIndex].image_url = publicUrl;
        setFormData({ ...formData, matchups: updatedMatchups });
      } else if (pointIndex !== undefined && isMultiple) {
        const updatedPoints = [...(formData.points || [])];
        updatedPoints[pointIndex].images.push(publicUrl);
        setFormData({ ...formData, points: updatedPoints });
      } else {
        setFormData({ ...formData, [field]: publicUrl });
      }

      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      toast.error("This file exceeds the 50GB upload limit");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const token = session.session?.access_token;

      if (!token) {
        throw new Error("Please sign in again before uploading");
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            authorization: `Bearer ${token}`,
            'x-upsert': 'false'
          },
          uploadDataDuringCreation: false,
          removeFingerprintOnSuccess: true,
          metadata: { bucketName: 'analysis-videos', objectName: filePath, contentType: file.type || 'video/mp4' },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(new Error(error.message)),
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      const { data: { publicUrl } } = supabase.storage.from("analysis-videos").getPublicUrl(filePath);
      setFormData({ ...formData, video_url: publicUrl });
      toast.success("Video uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload video");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUploadForPoint = async (event: React.ChangeEvent<HTMLInputElement>, pointIndex: number) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, 10); // Max 10 files

    setUploadingImage(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const token = session.session?.access_token;

      if (!token) {
        throw new Error("Please sign in again before uploading");
      }

      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
          toast.error(`${file.name} exceeds the 50GB upload limit — skipped`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              authorization: `Bearer ${token}`,
              'x-upsert': 'false'
            },
            uploadDataDuringCreation: false,
            removeFingerprintOnSuccess: true,
            metadata: { bucketName: 'analysis-videos', objectName: filePath, contentType: file.type || 'video/mp4' },
            chunkSize: 6 * 1024 * 1024,
            onError: (error) => reject(new Error(error.message)),
            onSuccess: () => resolve(),
          });
          upload.start();
        });

        const { data: { publicUrl } } = supabase.storage.from("analysis-videos").getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const updatedPoints = [...(formData.points || [])];
        const currentVideos = updatedPoints[pointIndex].video_urls || (updatedPoints[pointIndex].video_url ? [updatedPoints[pointIndex].video_url] : []);
        updatedPoints[pointIndex] = { ...updatedPoints[pointIndex], video_urls: [...currentVideos, ...uploadedUrls], video_url: undefined };
        setFormData({ ...formData, points: updatedPoints });
        toast.success(`${uploadedUrls.length} video${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
      }
    } catch (error: any) {
      toast.error("Failed to upload video");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      // Only include columns that exist in the database schema
      const validColumns = [
        'title', 'home_team', 'away_team', 'key_details', 'opposition_strengths',
        'opposition_weaknesses', 'matchups', 'scheme_title', 'scheme_paragraph_1',
        'scheme_paragraph_2', 'scheme_image_url', 'player_image_url', 'strengths_improvements',
        'concept', 'explanation', 'points', 'home_score', 'away_score', 'fixture_id',
        'match_date', 'home_team_logo', 'away_team_logo', 'selected_scheme', 'starting_xi',
        'kit_primary_color', 'kit_secondary_color', 'kit_number_color', 'kit_collar_color',
        'kit_stripe_style', 'match_image_url', 'home_team_bg_color',
        'away_team_bg_color', 'video_url', 'player_name', 'visibility_status', 'estimated_ready_at',
        'category', 'is_example', 'example_banner', 'example_language'
      ];

      const dataToSave: Record<string, any> = {
        analysis_type: analysisType,
      };

      // Only copy valid columns from formData
      validColumns.forEach(col => {
        if (formData[col] !== undefined) {
          dataToSave[col] = formData[col];
        }
      });

      if (dataToSave.visibility_status === "live") {
        dataToSave.estimated_ready_at = null;
      }

      let analysisId = editingAnalysis?.id;

      if (editingAnalysis) {
        const { error } = await supabase
          .from("analyses")
          .update(dataToSave)
          .eq("id", editingAnalysis.id);

        if (error) throw error;
        toast.success("Analysis updated successfully");
      } else {
        const { data, error } = await supabase
          .from("analyses")
          .insert([dataToSave as any])
          .select()
          .single();

        if (error) throw error;
        analysisId = data.id;
        toast.success("Analysis created successfully");
      }

      // Persist kickoff time to the linked fixture (match_time is on fixtures, not analyses)
      if (formData.match_time !== undefined && (dataToSave.fixture_id || (editingAnalysis as any)?.fixture_id)) {
        const fixtureId = dataToSave.fixture_id || (editingAnalysis as any)?.fixture_id;
        try {
          const { error: fxErr } = await supabase
            .from("fixtures")
            .update({ match_time: formData.match_time || null })
            .eq("id", fixtureId);
          if (fxErr) console.error("Failed to update fixture match_time:", fxErr);
        } catch (e) {
          console.error("Failed to update fixture match_time:", e);
        }
      }

      // Keep linked fixture's match_date in sync with the analysis match_date
      if (dataToSave.match_date !== undefined && (dataToSave.fixture_id || (editingAnalysis as any)?.fixture_id)) {
        const fixtureId = dataToSave.fixture_id || (editingAnalysis as any)?.fixture_id;
        try {
          const { error: fxDateErr } = await supabase
            .from("fixtures")
            .update({ match_date: dataToSave.match_date || null })
            .eq("id", fixtureId);
          if (fxDateErr) {
            console.error("Failed to sync fixture match_date:", fxDateErr);
          } else {
            toast.success("Linked fixture date updated to match");
          }
        } catch (e) {
          console.error("Failed to sync fixture match_date:", e);
        }
      }

      if (selectedPerformanceReportId && selectedPerformanceReportId !== "none" && analysisId) {
        const { error: linkError } = await supabase
          .from("player_analysis")
          .update({ analysis_writer_id: analysisId })
          .eq("id", selectedPerformanceReportId);

        if (linkError) {
          console.error("Failed to link analysis:", linkError);
          toast.error("Analysis saved but failed to link to performance report");
        }
      }

      // Save tagged players
      if (analysisId) {
        // Remove existing tags
        await supabase
          .from("analysis_player_tags")
          .delete()
          .eq("analysis_id", analysisId);

        // Insert new tags
        if (taggedPlayerIds.length > 0) {
          const tagsToInsert = taggedPlayerIds.map(playerId => ({
            player_id: playerId,
            analysis_id: analysisId,
          }));
          const { error: tagError } = await supabase
            .from("analysis_player_tags")
            .insert(tagsToInsert);
          if (tagError) {
            console.error("Failed to save player tags:", tagError);
          }
        }
      }

      if (!editingAnalysis) {
        const { data: newAnalysis } = await supabase
          .from("analyses")
          .select("*")
          .eq("id", analysisId)
          .single();
        if (newAnalysis) {
          setEditingAnalysis(newAnalysis as Analysis);
        }
      }
      fetchAnalyses();
      fetchLinkedPlayers();
    } catch (error: any) {
      toast.error("Failed to save analysis");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      const { error } = await supabase.from("analyses").delete().eq("id", id);

      if (error) throw error;
      toast.success("Analysis deleted successfully");
      logActivity({ action: 'deleted', entityType: 'analysis', entityId: id });
      fetchAnalyses();
    } catch (error: any) {
      toast.error("Failed to delete analysis");
      console.error(error);
    }
  };

  /**
   * Duplicate an analysis (or concept) row, copying every field including
   * JSONB content (points, matchups, scheme data, video URLs, images, kit
   * colours, linked videos, etc.). Stripped: id, created_at, updated_at.
   * The title gets " (Copy)" appended so the duplicate is easy to spot.
   */
  const handleDuplicate = async (id: string) => {
    try {
      const { data: row, error: fetchErr } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!row) throw new Error("Analysis not found");

      const clone: any = JSON.parse(JSON.stringify(row));
      delete clone.id;
      delete clone.created_at;
      delete clone.updated_at;
      if (clone.title) clone.title = `${clone.title} (Copy)`;
      else if (clone.concept) clone.concept = `${clone.concept} (Copy)`;
      else if (clone.home_team || clone.away_team) {
        clone.home_team = clone.home_team
          ? `${clone.home_team} (Copy)`
          : clone.home_team;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("analyses")
        .insert(clone)
        .select()
        .single();
      if (insertErr) throw insertErr;

      toast.success("Analysis duplicated");
      logActivity({ action: 'created', entityType: 'analysis', entityId: inserted?.id, details: { duplicated_from: id } });
      fetchAnalyses();
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate analysis");
      console.error(error);
    }
  };

  const addPoint = (insertAfterIndex?: number) => {
    const newPoint = { _id: crypto.randomUUID(), title: "", paragraph_1: "", paragraph_2: "", images: [] };
    const currentPoints = formData.points || [];
    if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
      const newPoints = [...currentPoints];
      newPoints.splice(insertAfterIndex + 1, 0, newPoint);
      setFormData({ ...formData, points: newPoints });
    } else {
      setFormData({ ...formData, points: [...currentPoints, newPoint] });
    }
  };

  const removePoint = (index: number) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints.splice(index, 1);
    setFormData({ ...formData, points: updatedPoints });
  };

  const updatePoint = (index: number, field: keyof Point, value: any) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints[index][field] = value;
    setFormData({ ...formData, points: updatedPoints });
  };

  const addMatchup = () => {
    setFormData({
      ...formData,
      matchups: [
        ...(formData.matchups || []),
        { name: "", shirt_number: "", image_url: "" },
      ],
    });
  };

  const removeMatchup = (index: number) => {
    const updatedMatchups = [...(formData.matchups || [])];
    updatedMatchups.splice(index, 1);
    setFormData({ ...formData, matchups: updatedMatchups });
  };

  const updateMatchup = (index: number, field: keyof Matchup, value: string) => {
    const updatedMatchups = [...(formData.matchups || [])];
    updatedMatchups[index][field] = value;
    setFormData({ ...formData, matchups: updatedMatchups });
  };

  const removeImageFromPoint = (pointIndex: number, imageIndex: number) => {
    const updatedPoints = [...(formData.points || [])];
    updatedPoints[pointIndex].images.splice(imageIndex, 1);
    setFormData({ ...formData, points: updatedPoints });
  };

  const fetchExamples = async (category: string, type: 'point' | 'overview' = 'point') => {
    try {
      const [sharedResult, localResult] = await Promise.all([
        supabase
          .from('analysis_point_examples')
          .select('*')
          .eq('category', category)
          .eq('example_type', type)
          .order('created_at', { ascending: false }),
        localSupabase
          .from('analysis_point_examples')
          .select('*')
          .eq('category', category)
          .eq('example_type', type)
          .order('created_at', { ascending: false })
      ]);

      const sharedData = sharedResult.data || [];
      const localData = localResult.data || [];
      const seenIds = new Set(sharedData.map(e => e.id));
      const mergedData = [...sharedData, ...localData.filter(e => !seenIds.has(e.id))];

      mergedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setExamples(mergedData);
    } catch (error: any) {
      console.error('Error fetching examples:', error);
      toast.error('Failed to load examples');
    }
  };

  const handleSaveExample = async () => {
    try {
      if (editingExample) {
        const dataToUpdate = examplesType === 'overview' 
          ? { content: exampleFormData.content, category: examplesCategory, example_type: examplesType }
          : { paragraph_1: exampleFormData.paragraph_1, category: examplesCategory, example_type: examplesType };

        let { error } = await supabase
          .from('analysis_point_examples')
          .update(dataToUpdate)
          .eq('id', editingExample.id);

        if (error?.code === '23514') {
          const localResult = await localSupabase
            .from('analysis_point_examples')
            .update(dataToUpdate)
            .eq('id', editingExample.id);
          error = localResult.error;
        }

        if (error) throw error;
        toast.success('Example updated');
      } else {
        const dataToInsert = examplesType === 'overview'
          ? { content: exampleFormData.content, category: examplesCategory, example_type: examplesType }
          : { paragraph_1: exampleFormData.paragraph_1, category: examplesCategory, example_type: examplesType };

        let { error } = await supabase
          .from('analysis_point_examples')
          .insert(dataToInsert);

        if (error?.code === '23514') {
          const localResult = await localSupabase
            .from('analysis_point_examples')
            .insert(dataToInsert);
          error = localResult.error;
        }

        if (error) throw error;
        toast.success('Example added');
      }

      setExampleFormData({ paragraph_1: '', content: '' });
      setEditingExample(null);
      fetchExamples(examplesCategory, examplesType);
    } catch (error: any) {
      console.error('Error saving example:', error);
      toast.error('Failed to save example');
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm('Delete this example?')) return;

    try {
      let { error } = await supabase
        .from('analysis_point_examples')
        .delete()
        .eq('id', id);

      if (error) {
        const localResult = await localSupabase
          .from('analysis_point_examples')
          .delete()
          .eq('id', id);
        error = localResult.error;
      }

      if (error) throw error;
      toast.success('Example deleted');
      fetchExamples(examplesCategory, examplesType);
    } catch (error: any) {
      console.error('Error deleting example:', error);
      toast.error('Failed to delete example');
    }
  };

  const generateWithAI = async (field: string, pointIndex?: number) => {
    setAiGenerating(true);
    try {
      let prompt = '';
      let context = '';
      let type = '';

      if (field === 'scheme_paragraph_1') {
        const schemeCategory = 'scheme-p1';
        const { data: styleExamples } = await supabase
          .from('analysis_point_examples')
          .select('paragraph_1')
          .eq('category', schemeCategory)
          .eq('example_type', 'point')
          .limit(3);

        const existingContent = formData.scheme_paragraph_1 || '';
        const styleExamplesText = styleExamples && styleExamples.length > 0
          ? styleExamples.map((ex, i) => `Style Example ${i + 1}: ${ex.paragraph_1 || ''}`).join('\n\n')
          : '';

        if (!existingContent.trim()) {
          toast.error('Please write some content first - AI will restyle it, not create new content');
          setAiGenerating(false);
          return;
        }

        context = `STYLE EXAMPLES (copy the tone, vocabulary, and sentence structure from these):\n${styleExamplesText}\n\n---`;
        prompt = `SOURCE CONTENT TO RESTYLE (keep ALL these points/facts, just improve the writing style):\n${existingContent}\n\nRewrite the source content using the writing style from the examples. Keep ALL the same tactical points and observations - only change HOW it's written, not WHAT it says.`;
        type = 'analysis-paragraph';
      } else if (field === 'scheme_paragraph_2') {
        const schemeCategory = 'scheme-p2';
        const { data: styleExamples } = await supabase
          .from('analysis_point_examples')
          .select('paragraph_1')
          .eq('category', schemeCategory)
          .eq('example_type', 'point')
          .limit(3);

        const existingContent = formData.scheme_paragraph_2 || '';
        const styleExamplesText = styleExamples && styleExamples.length > 0
          ? styleExamples.map((ex, i) => `Style Example ${i + 1}: ${ex.paragraph_1 || ''}`).join('\n\n')
          : '';

        if (!existingContent.trim()) {
          toast.error('Please write some content first - AI will restyle it, not create new content');
          setAiGenerating(false);
          return;
        }

        context = `STYLE EXAMPLES (copy the tone, vocabulary, and sentence structure from these):\n${styleExamplesText}\n\n---`;
        prompt = `SOURCE CONTENT TO RESTYLE (keep ALL these points/facts, just improve the writing style):\n${existingContent}\n\nRewrite the source content using the writing style from the examples. Keep ALL the same tactical points and observations - only change HOW it's written, not WHAT it says.`;
        type = 'analysis-paragraph';
      } else if (field === 'point_title') {
        prompt = `Create a concise, professional title for a match analysis section.`;
        type = 'analysis-point-title';
      } else if (field === 'point_paragraph_1') {
        const point = formData.points?.[pointIndex!];
        const paragraphCategory = `${analysisType}-p1`;

        const { data: styleExamples } = await supabase
          .from('analysis_point_examples')
          .select('paragraph_1')
          .eq('category', paragraphCategory)
          .eq('example_type', 'point')
          .limit(3);

        const existingContent = point?.paragraph_1 || '';
        const styleExamplesText = styleExamples && styleExamples.length > 0
          ? styleExamples.map((ex, i) => `Style Example ${i + 1}: ${ex.paragraph_1 || ''}`).join('\n\n')
          : '';

        if (!existingContent.trim()) {
          toast.error('Please write some content first - AI will restyle it, not create new content');
          setAiGenerating(false);
          return;
        }

        context = `Section Title: ${point?.title || 'Not specified'}\n\nSTYLE EXAMPLES (copy the tone, vocabulary, and sentence structure from these):\n${styleExamplesText}\n\n---`;
        prompt = `SOURCE CONTENT TO RESTYLE (keep ALL these points/facts, just improve the writing style):\n${existingContent}\n\nRewrite the source content using the writing style from the examples. Keep ALL the same tactical points and observations - only change HOW it's written, not WHAT it says.`;
        type = 'analysis-paragraph';
      } else if (field === 'point_paragraph_2') {
        const point = formData.points?.[pointIndex!];
        const paragraphCategory = `${analysisType}-p2`;

        const { data: styleExamples } = await supabase
          .from('analysis_point_examples')
          .select('paragraph_1')
          .eq('category', paragraphCategory)
          .eq('example_type', 'point')
          .limit(3);

        const existingContent = point?.paragraph_2 || '';
        const styleExamplesText = styleExamples && styleExamples.length > 0
          ? styleExamples.map((ex, i) => `Style Example ${i + 1}: ${ex.paragraph_1 || ''}`).join('\n\n')
          : '';

        if (!existingContent.trim()) {
          toast.error('Please write some content first - AI will restyle it, not create new content');
          setAiGenerating(false);
          return;
        }

        context = `Section Title: ${point?.title || 'Not specified'}\nFirst Paragraph for context: ${point?.paragraph_1 || ''}\n\nSTYLE EXAMPLES (copy the tone, vocabulary, and sentence structure from these):\n${styleExamplesText}\n\n---`;
        prompt = `SOURCE CONTENT TO RESTYLE (keep ALL these points/facts, just improve the writing style):\n${existingContent}\n\nRewrite the source content using the writing style from the examples. Keep ALL the same tactical points and observations - only change HOW it's written, not WHAT it says.`;
        type = 'analysis-paragraph';
      }

      const { data, error } = await invokeEdgeFunction('ai-write', {
        body: { prompt, context, type }
      }, localSupabase);

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits in Settings > Workspace > Usage.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (field === 'scheme_paragraph_1') {
        setFormData({ ...formData, scheme_paragraph_1: data.text });
      } else if (field === 'scheme_paragraph_2') {
        setFormData({ ...formData, scheme_paragraph_2: data.text });
      } else if (field === 'point_title' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'title', data.text);
      } else if (field === 'point_paragraph_1' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'paragraph_1', data.text);
      } else if (field === 'point_paragraph_2' && pointIndex !== undefined) {
        updatePoint(pointIndex, 'paragraph_2', data.text);
      }

      toast.success('AI content generated!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate content with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  // Generate overview from points content or existing key_details using AI
  const generateOverviewFromPoints = async () => {
    const points = formData.points || [];
    const existingKeyDetails = formData.key_details || '';
    
    // Need at least one source of content
    if (points.length === 0 && !existingKeyDetails.trim()) {
      toast.error("Please add some points or write key details before using AI");
      return;
    }

    setAiGenerating(true);
    try {
      // Build source content - combine key_details and points
      let sourceContent = '';
      
      if (existingKeyDetails.trim()) {
        sourceContent += `EXISTING KEY DETAILS TO RESTYLE:\n${existingKeyDetails}\n\n`;
      }
      
      if (points.length > 0) {
        const pointsContent = points
          .map((p: any, i: number) => `Point ${i + 1}: ${p.title || 'Untitled'}\n${p.paragraph_1 || ''}\n${p.paragraph_2 || ''}`)
          .join('\n\n');
        sourceContent += `TACTICAL POINTS TO INCLUDE:\n${pointsContent}`;
      }

      // Fetch overview examples for the current analysis type
      const { data: styleExamples, error: fetchError } = await supabase
        .from('analysis_point_examples')
        .select('content')
        .eq('category', analysisType)
        .eq('example_type', 'overview')
        .limit(3);

      if (fetchError) {
        console.error('Error fetching examples:', fetchError);
      }

      const styleExamplesText = styleExamples && styleExamples.length > 0
        ? styleExamples.map((ex, i) => `Style Example ${i + 1}:\n${ex.content || ''}`).join('\n\n')
        : '';

      if (!styleExamplesText) {
        toast.warning("No overview examples found. Add examples via the settings icon for better results.");
      }

      const { data, error } = await invokeEdgeFunction('ai-write', {
        body: {
          prompt: `SOURCE CONTENT (preserve ALL tactical observations and facts from this - do NOT add new analysis):\n${sourceContent}\n\nRewrite this as a single cohesive overview paragraph. Keep ALL the facts and observations but apply the writing style from the examples.`,
          context: `Analysis Type: ${analysisType}\n\nSTYLE EXAMPLES (copy the EXACT tone, vocabulary, phrasing patterns, and sentence structure from these):\n${styleExamplesText || 'No examples provided - write in a professional football analysis style.'}`,
          type: 'analysis-overview'
        }
      }, localSupabase);

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits in Settings > Workspace > Usage.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setFormData({ ...formData, key_details: data.text });
      toast.success('Overview generated!');
    } catch (error: any) {
      console.error('Error generating overview:', error);
      toast.error(error.message || "Failed to generate overview");
    } finally {
      setAiGenerating(false);
    }
  };

  // Handler to open settings for a specific overview category
  const handleOpenOverviewSettings = (category: string) => {
    setExamplesCategory(category);
    setExamplesType('overview');
    setExamplesDialogOpen(true);
    fetchExamples(category, 'overview');
  };

  const generateOverview = async () => {
    if (!overviewWriter.overviewInfo.trim()) {
      toast.error("Please provide information for the overview");
      return;
    }

    setAiGenerating(true);
    try {
      const { data: styleExamples } = await supabase
        .from('analysis_point_examples')
        .select('content')
        .eq('category', overviewWriter.category)
        .eq('example_type', 'overview')
        .limit(3);

      const exampleContext = styleExamples && styleExamples.length > 0
        ? `\n\nExample overview writing style references:\n${styleExamples.map((ex, i) => 
            `Example ${i + 1}:\n${ex.content || ''}`
          ).join('\n\n')}`
        : '';

      const { data, error } = await invokeEdgeFunction('ai-write', {
        body: {
          prompt: `Write a comprehensive overview paragraph for a ${overviewWriter.category} analysis based on this information: ${overviewWriter.overviewInfo}. Match the writing style, vocabulary level, and level of detail shown in the examples. This should be one cohesive paragraph.`,
          context: `Analysis Type: ${overviewWriter.category}${exampleContext}`,
          type: 'analysis-overview'
        }
      }, localSupabase);

      if (error) throw error;

      setGeneratedContent({
        open: true,
        type: 'overview',
        content: data.text,
        category: overviewWriter.category
      });
      setOverviewWriter({ open: false, category: 'pre-match', overviewInfo: '' });
    } catch (error: any) {
      console.error('Error generating overview:', error);
      toast.error(error.message || "Failed to generate overview");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateScheme = async () => {
    if (!schemeWriter.schemeInfo.trim()) {
      toast.error("Please provide information for the scheme");
      return;
    }

    setAiGenerating(true);
    try {
      const { data: p1Examples } = await supabase
        .from('analysis_point_examples')
        .select('paragraph_1')
        .eq('category', 'scheme-p1')
        .eq('example_type', 'point')
        .limit(3);

      const { data: p2Examples } = await supabase
        .from('analysis_point_examples')
        .select('paragraph_1')
        .eq('category', 'scheme-p2')
        .eq('example_type', 'point')
        .limit(3);

      const p1Context = p1Examples && p1Examples.length > 0
        ? `\n\nExample writing style for FIRST paragraph:\n${p1Examples.map((ex, i) => 
            `Example ${i + 1}: ${ex.paragraph_1 || ''}`
          ).join('\n\n')}`
        : '';

      const p2Context = p2Examples && p2Examples.length > 0
        ? `\n\nExample writing style for SECOND paragraph:\n${p2Examples.map((ex, i) => 
            `Example ${i + 1}: ${ex.paragraph_1 || ''}`
          ).join('\n\n')}`
        : '';

      const { data, error } = await invokeEdgeFunction('ai-write', {
        body: {
          prompt: `Write two tactical scheme paragraphs based on this information: ${schemeWriter.schemeInfo}. 

          Return exactly two paragraphs separated by a blank line.
          - First paragraph should match the style in the FIRST paragraph examples
          - Second paragraph should match the style in the SECOND paragraph examples

          ${p1Context}
          ${p2Context}`,
          context: `Scheme analysis for football match`,
          type: 'analysis-scheme'
        }
      }, localSupabase);

      if (error) throw error;

      const text = data.text || '';
      const paragraphs = text.split('\n\n').filter((p: string) => p.trim());
      const p1 = paragraphs[0] || '';
      const p2 = paragraphs[1] || paragraphs[0] || '';

      setGeneratedContent({
        open: true,
        type: 'scheme',
        content: text,
        paragraph1: p1 || '',
        paragraph2: p2 || '',
        category: 'scheme'
      });
      setSchemeWriter({ open: false, schemeInfo: '' });
    } catch (error: any) {
      console.error('Error generating scheme:', error);
      toast.error(error.message || "Failed to generate scheme");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateWithAIWriter = async () => {
    if (!aiWriter.paragraph1Info.trim() && !aiWriter.paragraph2Info.trim()) {
      toast.error("Please provide information for at least one paragraph");
      return;
    }

    setAiGenerating(true);
    try {
      const { data: styleExamples } = await supabase
        .from('analysis_point_examples')
        .select('paragraph_1, paragraph_2')
        .eq('category', aiWriter.category)
        .limit(3);

      const exampleContext = styleExamples && styleExamples.length > 0
        ? `\n\nExample writing style references:\n${styleExamples.map((ex, i) => 
            `Example ${i + 1}:\n${ex.paragraph_1 || ''}\n${ex.paragraph_2 || ''}`
          ).join('\n\n')}`
        : '';

      let paragraph1 = '';
      let paragraph2 = '';

      if (aiWriter.paragraph1Info.trim()) {
        const { data: data1, error: error1 } = await invokeEdgeFunction('ai-write', {
          body: {
            prompt: `Write a professional analysis paragraph based on this information: ${aiWriter.paragraph1Info}. Match the writing style, vocabulary level, and level of detail shown in the examples.`,
            context: `Analysis Type: ${aiWriter.category}${exampleContext}`,
            type: 'analysis-paragraph'
          }
        }, localSupabase);

        if (error1) throw error1;
        paragraph1 = data1.text;
      }

      if (aiWriter.paragraph2Info.trim()) {
        const { data: data2, error: error2 } = await invokeEdgeFunction('ai-write', {
          body: {
            prompt: `Write a professional analysis paragraph based on this information: ${aiWriter.paragraph2Info}. Match the writing style, vocabulary level, and level of detail shown in the examples.`,
            context: `Analysis Type: ${aiWriter.category}${exampleContext}`,
            type: 'analysis-paragraph'
          }
        }, localSupabase);

        if (error2) throw error2;
        paragraph2 = data2.text;
      }

      setGeneratedContent({
        open: true,
        type: 'point',
        content: `${paragraph1}\n\n${paragraph2}`,
        paragraph1,
        paragraph2,
        category: aiWriter.category
      });
      setAiWriter({ open: false, category: 'pre-match', paragraph1Info: '', paragraph2Info: '' });
    } catch (error: any) {
      console.error('Error generating with AI:', error);
      toast.error(error.message || "Failed to generate content");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyGenerated = () => {
    if (generatedContent.type === 'overview') {
      setFormData({ ...formData, key_details: generatedContent.content });
    } else if (generatedContent.type === 'scheme') {
      setFormData({ 
        ...formData, 
        scheme_paragraph_1: generatedContent.paragraph1 || '',
        scheme_paragraph_2: generatedContent.paragraph2 || ''
      });
    } else if (generatedContent.type === 'point') {
      const newPoint = {
        title: "",
        paragraph_1: generatedContent.paragraph1 || '',
        paragraph_2: generatedContent.paragraph2 || '',
        images: []
      };
      setFormData({
        ...formData,
        points: [...(formData.points || []), newPoint]
      });
    }
    toast.success("Content applied!");
    setGeneratedContent({ open: false, type: 'point', content: '', category: 'pre-match' });
    setEditMode(false);
  };

  const handleCopyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent.content);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      const dataToSave: any = {
        category: generatedContent.category,
        example_type: generatedContent.type === 'overview' ? 'overview' : 'point'
      };

      if (generatedContent.type === 'overview') {
        dataToSave.content = generatedContent.content;
        dataToSave.title = `Generated ${new Date().toLocaleDateString()}`;
      } else {
        dataToSave.paragraph_1 = generatedContent.paragraph1 || '';
        dataToSave.paragraph_2 = generatedContent.paragraph2 || '';
        dataToSave.title = `Generated ${new Date().toLocaleDateString()}`;
      }

      const { error } = await supabase
        .from('analysis_point_examples')
        .insert(dataToSave);

      if (error) throw error;
      toast.success("Saved to examples database!");
    } catch (error) {
      console.error('Error saving to database:', error);
      toast.error("Failed to save to database");
    }
  };

  const handleTweak = async () => {
    if (!tweakDialog.tweakInstructions.trim()) return;

    setAiGenerating(true);
    try {
      const { data, error } = await localSupabase.functions.invoke('ai-write', {
        body: {
          prompt: `Adjust the following content according to these instructions: "${tweakDialog.tweakInstructions}"\n\nOriginal content:\n${generatedContent.content}`,
          context: `Category: ${generatedContent.category}`,
          type: 'tweak'
        }
      });

      if (error) throw error;

      const tweakedText = data.text;

      if (generatedContent.type === 'overview') {
        setGeneratedContent({
          ...generatedContent,
          content: tweakedText
        });
      } else {
        const [p1, p2] = tweakedText.split('\n\n').filter((p: string) => p.trim());
        setGeneratedContent({
          ...generatedContent,
          content: tweakedText,
          paragraph1: p1 || '',
          paragraph2: p2 || tweakedText
        });
      }

      toast.success("Content tweaked!");
      setTweakDialog({ open: false, tweakInstructions: '' });
    } catch (error) {
      console.error('Error tweaking content:', error);
      toast.error("Failed to tweak content");
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading analyses...</div>;
  }

  // If showing an editor view, render it directly instead of the list
  if (activeView !== 'list') {
    const isPreMatch = activeView === 'pre-match';
    const isPostMatch = activeView === 'post-match';
    const isConcept = activeView === 'concept';

    const getAnalysisTranslatableFields = () => {
      const fields: Record<string, string> = {};
      if (formData.title) fields.title = formData.title;
      if (formData.key_details) fields.key_details = formData.key_details;
      if (formData.opposition_strengths) fields.opposition_strengths = formData.opposition_strengths;
      if (formData.opposition_weaknesses) fields.opposition_weaknesses = formData.opposition_weaknesses;
      if (formData.strengths_improvements) fields.strengths_improvements = formData.strengths_improvements;
      if (formData.concept) fields.concept = formData.concept;
      if (formData.explanation) fields.explanation = formData.explanation;
      if (formData.scheme_title) fields.scheme_title = formData.scheme_title;
      if (formData.scheme_paragraph_1) fields.scheme_paragraph_1 = formData.scheme_paragraph_1;
      if (formData.scheme_paragraph_2) fields.scheme_paragraph_2 = formData.scheme_paragraph_2;
      (formData.points || []).forEach((point: any, i: number) => {
        if (point.title) fields[`point_${i}_title`] = point.title;
        if (point.paragraph_1) fields[`point_${i}_paragraph_1`] = point.paragraph_1;
        if (point.paragraph_2) fields[`point_${i}_paragraph_2`] = point.paragraph_2;
      });
      (formData.matchups || []).forEach((matchup: any, i: number) => {
        if (matchup.notes) fields[`matchup_${i}_notes`] = matchup.notes;
      });
      return fields;
    };

    const handleAnalysisTranslated = (translations: Record<string, string>) => {
      const updated = { ...formData };
      if (translations.title) updated.title = translations.title;
      if (translations.key_details) updated.key_details = translations.key_details;
      if (translations.opposition_strengths) updated.opposition_strengths = translations.opposition_strengths;
      if (translations.opposition_weaknesses) updated.opposition_weaknesses = translations.opposition_weaknesses;
      if (translations.strengths_improvements) updated.strengths_improvements = translations.strengths_improvements;
      if (translations.concept) updated.concept = translations.concept;
      if (translations.explanation) updated.explanation = translations.explanation;
      if (translations.scheme_title) updated.scheme_title = translations.scheme_title;
      if (translations.scheme_paragraph_1) updated.scheme_paragraph_1 = translations.scheme_paragraph_1;
      if (translations.scheme_paragraph_2) updated.scheme_paragraph_2 = translations.scheme_paragraph_2;
      const updatedPoints = [...(updated.points || [])];
      (formData.points || []).forEach((_: any, i: number) => {
        if (translations[`point_${i}_title`]) updatedPoints[i] = { ...updatedPoints[i], title: translations[`point_${i}_title`] };
        if (translations[`point_${i}_paragraph_1`]) updatedPoints[i] = { ...updatedPoints[i], paragraph_1: translations[`point_${i}_paragraph_1`] };
        if (translations[`point_${i}_paragraph_2`]) updatedPoints[i] = { ...updatedPoints[i], paragraph_2: translations[`point_${i}_paragraph_2`] };
      });
      updated.points = updatedPoints;
      const updatedMatchups = [...(updated.matchups || [])];
      (formData.matchups || []).forEach((_: any, i: number) => {
        if (translations[`matchup_${i}_notes`]) updatedMatchups[i] = { ...updatedMatchups[i], notes: translations[`matchup_${i}_notes`] };
      });
      updated.matchups = updatedMatchups;
      setFormData(updated);
    };

    return (
      <div className="space-y-6" spellCheck={spellCheckOn}>
        {/* Header with back button */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleCloseDialog}>
              ← Back
            </Button>
            <Button
              variant={spellCheckOn ? "default" : "outline"}
              size="sm"
              title="Toggle browser spell check on every text field in this analysis"
              onClick={() => setSpellCheckOn(s => !s)}
            >
              <SpellCheck className="w-4 h-4 mr-1.5" />
              {spellCheckOn ? "Spell Check On" : "Spell Check"}
            </Button>
            {editingAnalysis && (
              <Button
                variant="outline"
                size="sm"
                title="Copy public URL for this analysis"
                onClick={() => {
                  const slug = createAnalysisSlug(editingAnalysis.home_team, editingAnalysis.away_team, editingAnalysis.id);
                  const url = `${window.location.origin}${slug}`;
                  navigator.clipboard.writeText(url).then(
                    () => toast.success("Link copied"),
                    () => toast.error("Could not copy link")
                  );
                }}
              >
                <Link2 className="w-4 h-4 mr-1.5" />
                Copy Link
              </Button>
            )}
            {editingAnalysis && (
              <Button
                variant="outline"
                size="sm"
                title="Reload this analysis from the database without refreshing the page"
                onClick={async () => {
                  if (!editingAnalysis?.id) return;
                  try {
                    const { data, error } = await supabase
                      .from("analyses")
                      .select("*")
                      .eq("id", editingAnalysis.id)
                      .single();
                    if (error) throw error;
                    if (data) {
                      const pointsWithIds = Array.isArray((data as any).points)
                        ? (data as any).points.map((p: any) => ({ ...p, _id: p._id || crypto.randomUUID() }))
                        : [];
                      setEditingAnalysis(data as Analysis);
                      setFormData({ ...(data as any), points: pointsWithIds });
                      toast.success("Analysis reloaded");
                    }
                  } catch (err: any) {
                    toast.error("Failed to reload analysis");
                    console.error(err);
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </Button>
            )}
            <h2 className="text-2xl font-bold">
              {editingAnalysis ? "Edit" : "New"} {isPreMatch ? "Pre-Match Analysis" : isPostMatch ? "Post-Match Analysis" : "Concept"}
            </h2>
          </div>
          <ReportLanguageSelector
            selectedLanguage={analysisLanguage}
            onLanguageChange={setAnalysisLanguage}
            getTranslatableFields={getAnalysisTranslatableFields}
            onTranslated={handleAnalysisTranslated}
          />
        </div>

        {/* Fuel For Football package tracker - only when player is on FFF */}
        {(() => {
          const linkedPlayer = players.find((p) => p.id === selectedPlayerId);
          if (!linkedPlayer || linkedPlayer.representation_status !== "fuel_for_football") return null;
          return (
            <FFFPackageHeader
              playerId={selectedPlayerId}
              representationStatus={linkedPlayer.representation_status}
              currentAnalysisId={editingAnalysis?.id || null}
              currentFixtureId={formData.fixture_id || null}
            />
          );
        })()}

        {/* Quick Link - only show when creating new analysis (not for concepts) - stays open */}
        {!editingAnalysis && !isConcept && (
          <AnalysisQuickLink
            formData={formData}
            setFormData={setFormData}
            analysisType={activeView as "pre-match" | "post-match"}
            defaultOpen={true}
            taggedPlayerIds={taggedPlayerIds}
            setTaggedPlayerIds={setTaggedPlayerIds}
          />
        )}

        {/* Match Details (Pre-Match and Post-Match only) - collapsed by default */}
        {!isConcept && (
          <>
            {formData.is_example && (
              <Collapsible defaultOpen={false} className="border border-primary/40 rounded-lg bg-primary/5">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                      <Star className="w-3.5 h-3.5 fill-current" /> Example Details
                    </span>
                    <ChevronDown className="w-4 h-4 text-primary" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="example_banner" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Context banner (shown above the analysis)
                    </Label>
                    <Textarea
                      id="example_banner"
                      value={formData.example_banner || ""}
                      onChange={(e) => setFormData({ ...formData, example_banner: e.target.value })}
                      placeholder="e.g. This is an example performance report shown to prospective players to demonstrate the depth of analysis they will receive each week."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="example_language" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Language (shown as a flag in the top corner)
                    </Label>
                    <Select
                      value={formData.example_language || "none"}
                      onValueChange={(v) => setFormData({ ...formData, example_language: v === "none" ? null : v })}
                    >
                      <SelectTrigger id="example_language">
                        <SelectValue placeholder="No flag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No flag</SelectItem>
                        {EXAMPLE_LANGUAGE_OPTIONS.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            <span className="mr-2">{l.flag}</span>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When either field is set, the public analysis pads down slightly to make room for the banner and flag overlay.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          <AnalysisMatchDetails
            formData={formData}
            setFormData={setFormData}
            handleImageUpload={handleImageUpload}
            handleVideoUpload={handleVideoUpload}
            uploadingImage={uploadingImage}
            analysisType={activeView as "pre-match" | "post-match"}
            players={players}
            selectedPlayerId={selectedPlayerId}
            setSelectedPlayerId={setSelectedPlayerId}
            performanceReports={performanceReports}
            selectedPerformanceReportId={selectedPerformanceReportId}
            setSelectedPerformanceReportId={setSelectedPerformanceReportId}
            defaultOpen={false}
            showPlayerLinking={isPostMatch}
            taggedPlayerIds={taggedPlayerIds}
            setTaggedPlayerIds={setTaggedPlayerIds}
            defaultPlayerId={defaultPlayerId}
          />
          </>
        )}

        {/* Scheme Section (Pre-Match only) - collapsed by default */}
        {isPreMatch && (
          <AnalysisSchemeSection
            formData={formData}
            setFormData={setFormData}
            applyFormation={handleSchemeChange}
            updatePlayer={updateStartingXIPlayer}
            handleImageUpload={handleImageUpload}
            handleVideoUpload={handleVideoUpload}
            uploadingImage={uploadingImage}
            generateWithAI={generateWithAI}
            aiGenerating={aiGenerating}
            formationTemplates={formationTemplates}
            analysisType="pre-match"
            defaultOpen={false}
          />
        )}

        {/* Overview Section for Concept - shown first, collapsed by default */}
        {isConcept && (
          <AnalysisOverviewSection
            formData={formData}
            setFormData={setFormData}
            handleVideoUpload={handleVideoUpload}
            handleImageUpload={handleImageUpload}
            uploadingImage={uploadingImage}
            players={players}
            selectedPlayerId={selectedPlayerId}
            setSelectedPlayerId={setSelectedPlayerId}
            performanceReports={performanceReports}
            selectedPerformanceReportId={selectedPerformanceReportId}
            setSelectedPerformanceReportId={setSelectedPerformanceReportId}
            analysisType="concept"
            defaultOpen={false}
            spellCheckOn={spellCheckOn}
          />
        )}

        {/* Points Section - collapsed by default */}
        <AnalysisPointsSection
          formData={formData}
          setFormData={setFormData}
          addPoint={addPoint}
          removePoint={removePoint}
          updatePoint={updatePoint}
          handleImageUpload={handleImageUpload}
          handleVideoUploadForPoint={handleVideoUploadForPoint}
          removeImageFromPoint={removeImageFromPoint}
          uploadingImage={uploadingImage}
          generateWithAI={generateWithAI}
          aiGenerating={aiGenerating}
          analysisType={activeView as AnalysisType}
          defaultOpen={false}
          performanceReportClips={performanceReportClips}
          analysisId={editingAnalysis?.id}
          onSave={handleSave}
          spellCheckOn={spellCheckOn}
        />

        {/* Overview Section (Pre-Match and Post-Match - shown after points) - collapsed by default */}
        {!isConcept && (
          <AnalysisOverviewSection
            formData={formData}
            setFormData={setFormData}
            handleVideoUpload={handleVideoUpload}
            handleImageUpload={handleImageUpload}
            uploadingImage={uploadingImage}
            players={players}
            selectedPlayerId={selectedPlayerId}
            setSelectedPlayerId={setSelectedPlayerId}
            performanceReports={performanceReports}
            selectedPerformanceReportId={selectedPerformanceReportId}
            setSelectedPerformanceReportId={setSelectedPerformanceReportId}
            analysisType={activeView as "pre-match" | "post-match"}
            addMatchup={addMatchup}
            removeMatchup={removeMatchup}
            updateMatchup={updateMatchup}
            defaultOpen={false}
            generateOverviewWithAI={generateOverviewFromPoints}
            aiGenerating={aiGenerating}
            onOpenSettings={handleOpenOverviewSettings}
            spellCheckOn={spellCheckOn}
          />
        )}


        {/* Visibility Status */}
        {!isConcept && (
          <div className="space-y-3 p-3 rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Status</Label>
              <Select
                value={formData.visibility_status || "live"}
                onValueChange={(val) => {
                  setFormData({
                    ...formData,
                    visibility_status: val,
                    estimated_ready_at: val === "live" ? null : formData.estimated_ready_at || null,
                  });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="clipped">Clipped</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 ml-2">
                <Label className="text-sm font-medium whitespace-nowrap">Type</Label>
                <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: "match" })}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                      (formData.category || "match") === "match"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Match
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: "training" })}
                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                      formData.category === "training"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Training
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <Label className="text-sm font-medium whitespace-nowrap">Example</Label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_example: !formData.is_example })}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors inline-flex items-center gap-1 ${
                    formData.is_example
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                  title="Mark this analysis as an example so it can be filtered in the list"
                >
                  <Star className={`w-3 h-3 ${formData.is_example ? "fill-current" : ""}`} />
                  {formData.is_example ? "Example" : "Set as Example"}
                </button>
              </div>
            </div>

            {(formData.visibility_status === "draft" || formData.visibility_status === "hidden" || formData.visibility_status === "clipped") && (
              <div className="space-y-1">
                <Label htmlFor="analysis-estimated-ready" className="text-xs text-muted-foreground">
                  Expected ready time (shown to player)
                </Label>
                <Input
                  id="analysis-estimated-ready"
                  type="datetime-local"
                  value={toDateTimeLocalValue(formData.estimated_ready_at)}
                  min={toDateTimeLocalValue(new Date().toISOString())}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_ready_at: fromDateTimeLocalValue(e.target.value),
                    })
                  }
                  className="w-full sm:w-[280px]"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave}>{isConcept ? "Save Concept" : "Save Analysis"}</Button>
        </div>
      </div>
    );
  }

  const renderAnalysisList = (type: AnalysisType) => {
    const filtered = analyses.filter(a => {
      if (a.analysis_type !== type) return false;
      if (examplesFilter && !(a as any).is_example) return false;
      // When embedded in Athlete Centre with a default player, only show analyses linked to that player
      if (defaultPlayerId) {
        const linked = linkedPlayers[a.id];
        return linked && linked.some(p => p.playerId === defaultPlayerId);
      }
      return true;
    });
    return filtered.map((analysis) => (
      <Card key={analysis.id} className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {analysis.title || `${analysis.home_team} vs ${analysis.away_team}`}
              </h3>
              {(analysis as any).is_example && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-primary/20 text-primary">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Example
                </span>
              )}
              {(analysis as any).visibility_status && (analysis as any).visibility_status !== "live" && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  (analysis as any).visibility_status === "draft"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : (analysis as any).visibility_status === "clipped"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {(analysis as any).visibility_status === "draft" ? <FileEdit className="w-2.5 h-2.5" /> : (analysis as any).visibility_status === "clipped" ? <FileEdit className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  {(analysis as any).visibility_status === "draft" ? "Draft" : (analysis as any).visibility_status === "clipped" ? "Clipped" : "Hidden"}
                </span>
              )}
              {(analysis as any).category === "training" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-emerald-500/20 text-emerald-400">
                  Training
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {new Date((analysis as any).match_date || analysis.created_at).toLocaleDateString("en-GB")}
            </p>
            {["draft", "hidden", "clipped"].includes(analysis.visibility_status || "") && analysis.estimated_ready_at && (
              <p className="text-xs text-primary mt-1">
                Expected by {new Date(analysis.estimated_ready_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {linkedPlayers[analysis.id] && linkedPlayers[analysis.id].length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{linkedPlayers[analysis.id].map(p => p.playerName).join(', ')}</span>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(createAnalysisSlug(analysis.home_team, analysis.away_team, analysis.id))}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenDialog(type, analysis)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Copy share link"
              onClick={() => {
                const slug = createAnalysisSlug(analysis.home_team, analysis.away_team, analysis.id);
                const url = `${window.location.origin}${slug}`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success("Link copied"),
                  () => toast.error("Could not copy link")
                );
              }}
            >
              <Link2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Duplicate" onClick={() => handleDuplicate(analysis.id)}>
              <Copy className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(analysis.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    ));
  };

  const renderConceptsList = () => {
    return concepts.map((concept) => (
      <Card key={concept.id} className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold">
              {concept.title || 'Untitled Concept'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {new Date(concept.created_at).toLocaleDateString()}
            </p>
            {concept.category && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">
                {concept.category}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/staff/coaching?tab=analysis&edit=${concept.id}`)}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/staff/coaching?tab=analysis&edit=${concept.id}`)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Duplicate" onClick={() => handleDuplicate(concept.id)}>
              <Copy className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteConcept(concept.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    ));
  };

  const handleDeleteConcept = async (id: string) => {
    if (!confirm("Are you sure you want to delete this concept?")) return;

    try {
      const { error } = await supabase.from("coaching_analysis").delete().eq("id", id);

      if (error) throw error;
      toast.success("Concept deleted successfully");
      fetchConcepts();
    } catch (error: any) {
      toast.error("Failed to delete concept");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Settings button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analysis</h2>
        <Button variant="outline" size="sm" onClick={() => setSettingsDialogOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs value={activeListTab} onValueChange={setActiveListTab} className="space-y-4">
        <TabsList className="w-full h-auto flex-wrap p-1">
          <TabsTrigger value="pre-match" className="flex-1 min-w-[80px] text-xs sm:text-sm">Pre-Match</TabsTrigger>
          <TabsTrigger value="post-match" className="flex-1 min-w-[80px] text-xs sm:text-sm">Post-Match</TabsTrigger>
          <TabsTrigger value="concept" className="flex-1 min-w-[80px] text-xs sm:text-sm">Concepts</TabsTrigger>
          <TabsTrigger value="action-reports" className="flex-1 min-w-[80px] text-xs sm:text-sm">Action Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-match" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleOpenDialog("pre-match")}
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Pre-Match Analysis
            </Button>
            <Button
              variant={examplesFilter ? "default" : "outline"}
              onClick={() => setExamplesFilter(f => !f)}
              title="Show only analyses marked as examples"
            >
              <Star className={`w-4 h-4 mr-2 ${examplesFilter ? "fill-current" : ""}`} />
              {examplesFilter ? "Showing Examples" : "Examples"}
            </Button>
          </div>
          {renderAnalysisList("pre-match")}
        </TabsContent>

        <TabsContent value="post-match" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleOpenDialog("post-match")}
              className="bg-gold text-foreground hover:bg-gold/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post-Match Analysis
            </Button>
            <Button
              variant={examplesFilter ? "default" : "outline"}
              onClick={() => setExamplesFilter(f => !f)}
              title="Show only analyses marked as examples"
            >
              <Star className={`w-4 h-4 mr-2 ${examplesFilter ? "fill-current" : ""}`} />
              {examplesFilter ? "Showing Examples" : "Examples"}
            </Button>
          </div>
          {renderAnalysisList("post-match")}
        </TabsContent>

        <TabsContent value="concept" className="space-y-4">
          <Button onClick={() => handleOpenDialog("concept")}>
            <Plus className="w-4 h-4 mr-2" />
            New Concept
          </Button>
          {renderConceptsList()}
        </TabsContent>

        <TabsContent value="action-reports" className="space-y-4">
          <ActionReportsList
            defaultPlayerId={defaultPlayerId}
            defaultPlayerName={defaultPlayerId ? players.find(p => p.id === defaultPlayerId)?.name : undefined}
          />
        </TabsContent>
      </Tabs>


      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Analysis Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage the example writing styles used by the AI to generate prose for each analysis type.
            </p>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('pre-match-p1'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('pre-match-p1', 'point'); setSettingsDialogOpen(false); }}>
                Pre-Match Point First Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('pre-match-p2'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('pre-match-p2', 'point'); setSettingsDialogOpen(false); }}>
                Pre-Match Point Second Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('post-match-p1'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('post-match-p1', 'point'); setSettingsDialogOpen(false); }}>
                Post-Match Point First Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('post-match-p2'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('post-match-p2', 'point'); setSettingsDialogOpen(false); }}>
                Post-Match Point Second Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('scheme-p1'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('scheme-p1', 'point'); setSettingsDialogOpen(false); }}>
                Schemes First Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('scheme-p2'); setExamplesType('point'); setExamplesDialogOpen(true); fetchExamples('scheme-p2', 'point'); setSettingsDialogOpen(false); }}>
                Schemes Second Paragraph
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('pre-match'); setExamplesType('overview'); setExamplesDialogOpen(true); fetchExamples('pre-match', 'overview'); setSettingsDialogOpen(false); }}>
                Pre-Match Overview Examples
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => { setExamplesCategory('post-match'); setExamplesType('overview'); setExamplesDialogOpen(true); fetchExamples('post-match', 'overview'); setSettingsDialogOpen(false); }}>
                Post-Match Overview Examples
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Examples Dialog */}
      <Dialog open={examplesDialogOpen} onOpenChange={setExamplesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {examplesCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} - {examplesType === 'overview' ? 'Overview' : 'Point'} Examples
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{examplesType === 'overview' ? 'Content' : 'Paragraph'}</Label>
              <Textarea
                value={examplesType === 'overview' ? exampleFormData.content : exampleFormData.paragraph_1}
                onChange={(e) => setExampleFormData(examplesType === 'overview' 
                  ? { ...exampleFormData, content: e.target.value }
                  : { ...exampleFormData, paragraph_1: e.target.value }
                )}
                placeholder={examplesType === 'overview' ? 'Enter example overview content...' : 'Enter example paragraph...'}
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveExample}>
                  {editingExample ? 'Update' : 'Add'} Example
                </Button>
                {editingExample && (
                  <Button variant="outline" onClick={() => { setEditingExample(null); setExampleFormData({ paragraph_1: '', content: '' }); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Existing Examples</Label>
              {examples.map((example) => (
                <Card key={example.id} className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm flex-1 line-clamp-3">
                      {examplesType === 'overview' ? example.content : example.paragraph_1}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingExample(example);
                        setExampleFormData({
                          paragraph_1: example.paragraph_1 || '',
                          content: example.content || ''
                        });
                      }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteExample(example.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {examples.length === 0 && (
                <p className="text-sm text-muted-foreground">No examples yet. Add some to help the AI match your writing style.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Writer Dialog */}
      <Dialog open={aiWriter.open} onOpenChange={(open) => setAiWriter({ ...aiWriter, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Point Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paragraph 1 Information</Label>
              <Textarea
                value={aiWriter.paragraph1Info}
                onChange={(e) => setAiWriter({ ...aiWriter, paragraph1Info: e.target.value })}
                placeholder="Describe what you want in the first paragraph..."
                rows={3}
              />
            </div>
            <div>
              <Label>Paragraph 2 Information</Label>
              <Textarea
                value={aiWriter.paragraph2Info}
                onChange={(e) => setAiWriter({ ...aiWriter, paragraph2Info: e.target.value })}
                placeholder="Describe what you want in the second paragraph..."
                rows={3}
              />
            </div>
            <Button onClick={generateWithAIWriter} disabled={aiGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {aiGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overview Writer Dialog */}
      <Dialog open={overviewWriter.open} onOpenChange={(open) => setOverviewWriter({ ...overviewWriter, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Overview Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Overview Information</Label>
              <Textarea
                value={overviewWriter.overviewInfo}
                onChange={(e) => setOverviewWriter({ ...overviewWriter, overviewInfo: e.target.value })}
                placeholder="Describe the key points for the overview..."
                rows={4}
              />
            </div>
            <Button onClick={generateOverview} disabled={aiGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {aiGenerating ? 'Generating...' : 'Generate Overview'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheme Writer Dialog */}
      <Dialog open={schemeWriter.open} onOpenChange={(open) => setSchemeWriter({ ...schemeWriter, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Scheme Writer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Scheme Information</Label>
              <Textarea
                value={schemeWriter.schemeInfo}
                onChange={(e) => setSchemeWriter({ ...schemeWriter, schemeInfo: e.target.value })}
                placeholder="Describe the tactical scheme..."
                rows={4}
              />
            </div>
            <Button onClick={generateScheme} disabled={aiGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {aiGenerating ? 'Generating...' : 'Generate Scheme'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Content Dialog */}
      <Dialog open={generatedContent.open} onOpenChange={(open) => setGeneratedContent({ ...generatedContent, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editMode ? (
              <Textarea
                value={generatedContent.content}
                onChange={(e) => {
                  const text = e.target.value;
                  const paragraphs = text.split('\n\n').filter(p => p.trim());
                  setGeneratedContent({
                    ...generatedContent,
                    content: text,
                    paragraph1: paragraphs[0] || '',
                    paragraph2: paragraphs[1] || ''
                  });
                }}
                rows={10}
              />
            ) : (
              <div className="whitespace-pre-wrap p-4 bg-muted rounded-lg">
                {generatedContent.content}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleApplyGenerated}>
                Apply to Analysis
              </Button>
              <Button variant="outline" onClick={handleCopyGenerated}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={() => setEditMode(!editMode)}>
                <Pencil className="w-4 h-4 mr-2" />
                {editMode ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="outline" onClick={handleSaveToDatabase}>
                <Database className="w-4 h-4 mr-2" />
                Save as Example
              </Button>
              <Button variant="outline" onClick={() => setTweakDialog({ open: true, tweakInstructions: '' })}>
                <Sparkles className="w-4 h-4 mr-2" />
                Tweak
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tweak Dialog */}
      <Dialog open={tweakDialog.open} onOpenChange={(open) => setTweakDialog({ ...tweakDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tweak Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Instructions</Label>
              <Textarea
                value={tweakDialog.tweakInstructions}
                onChange={(e) => setTweakDialog({ ...tweakDialog, tweakInstructions: e.target.value })}
                placeholder="How would you like to modify the content? e.g., 'Make it more formal' or 'Add more tactical detail'"
                rows={3}
              />
            </div>
            <Button onClick={handleTweak} disabled={aiGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {aiGenerating ? 'Tweaking...' : 'Apply Tweak'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
