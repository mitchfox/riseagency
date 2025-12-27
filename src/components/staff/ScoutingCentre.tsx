import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, UserPlus, Eye, Filter, Search, Sparkles, FileText, Target, Users, Globe, MapPin, ChevronDown, UserCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { SkillEvaluationForm } from "./SkillEvaluationForm";
import { initializeSkillEvaluations, SkillEvaluation, SCOUTING_POSITIONS, POSITION_SKILLS, ScoutingPosition } from "@/data/scoutingSkills";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { MapCoordinatesManager } from "./MapCoordinatesManager";
import { ScoutedPlayersSection } from "./ScoutedPlayersSection";
import { AllReportsSection } from "./AllReportsSection";

// Import pitch background
import pitchBg from "@/assets/scouting-pitch-gold.png";

// Import player images
import buffon from "@/assets/scouting-players/buffon.jpg";
import ashleyCole from "@/assets/scouting-players/ashley-cole.jpg";
import vanDijk from "@/assets/scouting-players/van-dijk.jpg";
import sergioRamos from "@/assets/scouting-players/sergio-ramos.jpg";
import trent from "@/assets/scouting-players/trent.jpg";
import kante from "@/assets/scouting-players/kante.jpg";
import lampard from "@/assets/scouting-players/lampard.jpg";
import deBruyne from "@/assets/scouting-players/de-bruyne.jpg";
import cristiano from "@/assets/scouting-players/cristiano.jpg";
import ronaldo from "@/assets/scouting-players/ronaldo.jpg";
import messi from "@/assets/scouting-players/messi.jpg";

interface ScoutingReport {
  id: string;
  player_name: string;
  age: number | null;
  position: string | null;
  current_club: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  preferred_foot: string | null;
  scout_name: string | null;
  scout_id: string | null;
  scouting_date: string | null;
  location: string | null;
  competition: string | null;
  match_context: string | null;
  overall_rating: number | null;
  technical_rating: number | null;
  physical_rating: number | null;
  tactical_rating: number | null;
  mental_rating: number | null;
  strengths: string | null;
  weaknesses: string | null;
  summary: string | null;
  potential_assessment: string | null;
  recommendation: string | null;
  video_url: string | null;
  profile_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  agent_name: string | null;
  agent_contact: string | null;
  status: string;
  priority: string | null;
  added_to_prospects: boolean;
  prospect_id: string | null;
  notes: string | null;
  skill_evaluations: any; // Json type from database
  auto_generated_review: string | null;
  linked_player_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ScoutingCentreProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Scout {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  regions: string[] | null;
  commission_rate: number | null;
  status: string;
  total_submissions: number;
  successful_signings: number;
  profile_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ScoutingCentre = ({ open = true, onOpenChange }: ScoutingCentreProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingReport, setEditingReport] = useState<ScoutingReport | null>(null);
  const [viewingReport, setViewingReport] = useState<ScoutingReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [skillEvaluations, setSkillEvaluations] = useState<SkillEvaluation[]>([]);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [viewMode, setViewMode] = useState<"positions" | "reports">("positions");
  const [viewingPositionAnalysis, setViewingPositionAnalysis] = useState<ScoutingPosition | null>(null);
  const [viewingProspectTable, setViewingProspectTable] = useState<ScoutingPosition | null>(null);
  const [prospectReports, setProspectReports] = useState<ScoutingReport[]>([]);
  const [sortField, setSortField] = useState<string>("overall_rating");
  const [isAddingScout, setIsAddingScout] = useState(false);
  const [newScoutData, setNewScoutData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    regions: [] as string[],
    commission_rate: "",
    notes: ""
  });
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [mainTab, setMainTab] = useState<"reports" | "all-players" | "scouted-players" | "network" | "scouts" | "map-coords">("reports");
  const [groupBy, setGroupBy] = useState<"country" | "club" | "scout">("country");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    player_name: "",
    age: "",
    position: "",
    current_club: "",
    nationality: "",
    date_of_birth: "",
    height_cm: "",
    preferred_foot: "",
    scout_name: "",
    scouting_date: format(new Date(), "yyyy-MM-dd"),
    location: "",
    competition: "",
    match_context: "",
    video_url: "",
    profile_image_url: "",
    contact_email: "",
    contact_phone: "",
    agent_name: "",
    agent_contact: "",
    status: "pending",
    priority: "",
    auto_generated_review: "",
    linked_player_id: "",
    full_match_url: ""
  });

  useEffect(() => {
    if (open) {
      fetchReports();
      fetchPlayers();
      fetchScouts();
    }
  }, [open]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const fetchScouts = async () => {
    try {
      const { data, error } = await supabase
        .from('scouts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setScouts(data || []);
    } catch (error) {
      console.error('Error fetching scouts:', error);
      toast.error('Failed to load scouts');
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("*")
        .order("scouting_date", { ascending: false });

      if (error) throw error;
      setReports((data || []).map(r => ({
        ...r,
        skill_evaluations: r.skill_evaluations || []
      })));
    } catch (error) {
      console.error("Error fetching scouting reports:", error);
      toast.error("Failed to load scouting reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_name || !formData.scouting_date) {
      toast.error("Player name and scouting date are required");
      return;
    }

    try {
      const reportData = {
        player_name: formData.player_name,
        age: formData.age ? parseInt(formData.age) : null,
        position: formData.position || null,
        current_club: formData.current_club || null,
        nationality: formData.nationality || null,
        date_of_birth: formData.date_of_birth || null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        preferred_foot: formData.preferred_foot || null,
        scout_name: formData.scout_name || null,
        scouting_date: formData.scouting_date,
        location: formData.location || null,
        competition: formData.competition || null,
        match_context: formData.match_context || null,
        video_url: formData.video_url || null,
        full_match_url: formData.full_match_url || null,
        profile_image_url: formData.profile_image_url || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        agent_name: formData.agent_name || null,
        agent_contact: formData.agent_contact || null,
        status: formData.status,
        priority: formData.priority || null,
        skill_evaluations: skillEvaluations as any,
        auto_generated_review: formData.auto_generated_review || null,
        linked_player_id: formData.linked_player_id || null,
        // Set legacy rating fields to null
        overall_rating: null,
        technical_rating: null,
        physical_rating: null,
        tactical_rating: null,
        mental_rating: null,
        strengths: null,
        weaknesses: null,
        summary: null,
        potential_assessment: null,
        recommendation: null,
        notes: null
      };

      if (editingReport) {
        const { error } = await supabase
          .from("scouting_reports")
          .update(reportData)
          .eq("id", editingReport.id);

        if (error) throw error;
        toast.success("Scouting report updated successfully");
      } else {
        const { error } = await supabase
          .from("scouting_reports")
          .insert(reportData);

        if (error) throw error;
        toast.success("Scouting report created successfully");
      }

      resetForm();
      fetchReports();
    } catch (error) {
      console.error("Error saving scouting report:", error);
      toast.error("Failed to save scouting report");
    }
  };

  const handlePositionChange = (position: string) => {
    setFormData({ ...formData, position });
    // Initialize skill evaluations for the selected position
    const newEvaluations = initializeSkillEvaluations(position);
    setSkillEvaluations(newEvaluations);
  };

  const handleGenerateReview = async () => {
    if (!skillEvaluations || skillEvaluations.length === 0) {
      toast.error("Please select a position and evaluate skills first");
      return;
    }

    setGeneratingReview(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-scouting-review', {
        body: {
          skill_evaluations: skillEvaluations,
          player_name: formData.player_name || "the player"
        }
      });

      if (error) throw error;

      if (data?.review) {
        setFormData({ ...formData, auto_generated_review: data.review });
        toast.success("Review generated successfully");
      }
    } catch (error) {
      console.error("Error generating review:", error);
      toast.error("Failed to generate review");
    } finally {
      setGeneratingReview(false);
    }
  };

  const handleEdit = (report: ScoutingReport) => {
    setEditingReport(report);
    // Parse skill_evaluations from Json to SkillEvaluation[]
    let evaluations: SkillEvaluation[] = [];
    if (Array.isArray(report.skill_evaluations) && report.skill_evaluations.length > 0) {
      evaluations = report.skill_evaluations as SkillEvaluation[];
    } else if (report.position) {
      // Initialize skill evaluations if position is set but no evaluations exist
      evaluations = initializeSkillEvaluations(report.position);
    }
    setSkillEvaluations(evaluations);
    setFormData({
      player_name: report.player_name,
      age: report.age?.toString() || "",
      position: report.position || "",
      current_club: report.current_club || "",
      nationality: report.nationality || "",
      date_of_birth: report.date_of_birth || "",
      height_cm: report.height_cm?.toString() || "",
      preferred_foot: report.preferred_foot || "",
      scout_name: report.scout_name || "",
      scouting_date: report.scouting_date || format(new Date(), "yyyy-MM-dd"),
      location: report.location || "",
      competition: report.competition || "",
      match_context: report.match_context || "",
      video_url: report.video_url || "",
      profile_image_url: report.profile_image_url || "",
      contact_email: report.contact_email || "",
      contact_phone: report.contact_phone || "",
      agent_name: report.agent_name || "",
      agent_contact: report.agent_contact || "",
      status: report.status,
      priority: report.priority || "",
      auto_generated_review: report.auto_generated_review || "",
      linked_player_id: report.linked_player_id || "",
      full_match_url: (report as any).full_match_url || ""
    });
    setIsAddingNew(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scouting report?")) return;

    try {
      const { error } = await supabase
        .from("scouting_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Scouting report deleted successfully");
      fetchReports();
    } catch (error) {
      console.error("Error deleting scouting report:", error);
      toast.error("Failed to delete scouting report");
    }
  };

  const handleAddToProspects = async (report: ScoutingReport) => {
    try {
      const { data: prospect, error } = await supabase
        .from("prospects")
        .insert({
          name: report.player_name,
          age: report.age,
          position: report.position,
          nationality: report.nationality,
          current_club: report.current_club,
          age_group: report.age && report.age <= 18 ? "Youth" : "Senior",
          stage: "scouted",
          priority: report.priority,
          profile_image_url: report.profile_image_url,
          contact_email: report.contact_email,
          contact_phone: report.contact_phone,
          notes: `Scouted on ${report.scouting_date ? format(new Date(report.scouting_date), "dd/MM/yyyy") : "Unknown"}\n\n${report.summary || ""}`
        })
        .select()
        .single();

      if (error) throw error;

      // Update the scouting report to link to the prospect
      await supabase
        .from("scouting_reports")
        .update({
          added_to_prospects: true,
          prospect_id: prospect.id
        })
        .eq("id", report.id);

      toast.success("Player added to prospect board");
      fetchReports();
    } catch (error) {
      console.error("Error adding to prospects:", error);
      toast.error("Failed to add player to prospects");
    }
  };

  const resetForm = () => {
    setFormData({
      player_name: "",
      age: "",
      position: "",
      current_club: "",
      nationality: "",
      date_of_birth: "",
      height_cm: "",
      preferred_foot: "",
      scout_name: "",
      scouting_date: format(new Date(), "yyyy-MM-dd"),
      location: "",
      competition: "",
      match_context: "",
      video_url: "",
      profile_image_url: "",
      contact_email: "",
      contact_phone: "",
      agent_name: "",
      agent_contact: "",
      status: "pending",
      priority: "",
      auto_generated_review: "",
      linked_player_id: "",
      full_match_url: ""
    });
    setSkillEvaluations([]);
    setEditingReport(null);
    setIsAddingNew(false);
    setActiveTab("basic");
  };

  const handleAddNew = (preSelectedPosition?: string) => {
    setIsAddingNew(true);
    setEditingReport(null);
    setActiveTab("basic");
    if (preSelectedPosition) {
      setFormData(prev => ({ ...prev, position: preSelectedPosition }));
      setSkillEvaluations(initializeSkillEvaluations(preSelectedPosition as ScoutingPosition));
    }
  };

  const handleViewPositionAnalysis = (position: ScoutingPosition) => {
    setViewingPositionAnalysis(position);
  };

  const handleViewProspectTable = async (position: ScoutingPosition) => {
    setViewingProspectTable(position);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scouting_reports')
        .select('*')
        .eq('position', position)
        .order('overall_rating', { ascending: false });

      if (error) throw error;
      setProspectReports(data || []);
    } catch (error) {
      console.error('Error fetching prospect reports:', error);
      toast.error('Failed to load prospect reports');
    } finally {
      setLoading(false);
    }
  };

  const sortProspectReports = (field: string) => {
    setSortField(field);
    const sorted = [...prospectReports].sort((a, b) => {
      if (field === "overall_rating") {
        return (b.overall_rating || 0) - (a.overall_rating || 0);
      }
      // Handle skill-based sorting
      const aSkills = a.skill_evaluations as SkillEvaluation[] || [];
      const bSkills = b.skill_evaluations as SkillEvaluation[] || [];
      const aSkill = aSkills.find(s => s.skill_name === field);
      const bSkill = bSkills.find(s => s.skill_name === field);
      
      const gradeValues: Record<string, number> = { 
        "A+": 11, "A": 10, "A-": 9, "B+": 8, "B": 7, "B-": 6, 
        "C+": 5, "C": 4, "C-": 3, "D": 2, "F": 1 
      };
      
      const aValue = gradeValues[aSkill?.grade || "F"] || 0;
      const bValue = gradeValues[bSkill?.grade || "F"] || 0;
      return bValue - aValue;
    });
    setProspectReports(sorted);
  };

  const handleCreateReportForPosition = (position: ScoutingPosition) => {
    handleAddNew(position);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recommended": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "monitoring": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesSearch = report.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.current_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.position?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group reports by country, club, or scout
  const groupedReports = reports.reduce((acc, report) => {
    let key = '';
    if (groupBy === 'country') {
      key = report.nationality || 'Unknown';
    } else if (groupBy === 'club') {
      key = report.current_club || 'Unknown';
    } else if (groupBy === 'scout') {
      key = report.scout_name || 'Unknown';
    }
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(report);
    return acc;
  }, {} as Record<string, ScoutingReport[]>);

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="flex-1 flex flex-col">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-max md:w-full md:grid md:grid-cols-5 gap-1 h-auto p-1 mb-4">
              <TabsTrigger value="reports" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="scouted-players" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
                <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                Scouted Players
              </TabsTrigger>
              <TabsTrigger value="scouts" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
                <Target className="h-3 w-3 md:h-4 md:w-4" />
                Scouts
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
                <Globe className="h-3 w-3 md:h-4 md:w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger value="map-coords" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 whitespace-nowrap">
                <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                Map
              </TabsTrigger>
            </TabsList>
          </div>

            <TabsContent value="reports" className="flex-1 mt-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-6 pr-4">
        {viewMode === "positions" ? (
          <>
            {/* Position Tiles View */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg md:text-xl font-bold">Position Analysis</h3>
                <p className="text-sm text-muted-foreground">Select a position to view requirements or create a report</p>
              </div>
              <Button onClick={() => setViewMode("reports")} variant="outline" size="sm" className="w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                View All Reports
              </Button>
            </div>
            
            {/* Formation Layout for Desktop/Tablet */}
            <div 
              className="hidden md:block space-y-4 lg:space-y-6 xl:space-y-8 p-4 lg:p-6 xl:p-8 rounded-lg relative"
              style={{
                backgroundImage: `url(${pitchBg})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'hsl(var(--background))'
              }}
            >
              <div className="absolute inset-0 bg-black/10 rounded-lg" />
              
              {/* Forward Line */}
              <div className="flex justify-center gap-4 lg:gap-8 xl:gap-16 relative z-10">
                {[
                  { pos: "Winger / Wide Forward", label: "LW", player: "Cristiano Ronaldo", img: cristiano },
                  { pos: "Centre Forward / Striker", label: "CF", player: "Ronaldo Nazario", img: ronaldo },
                  { pos: "Winger / Wide Forward", label: "RW", player: "Messi", img: messi }
                ].map((item, idx) => (
                  <Card key={`fw-${idx}`} className="w-32 lg:w-40 xl:w-48 bg-card/95 backdrop-blur hover:bg-card transition-all border-2 border-white/20">
                    <CardHeader className="p-2 lg:p-3 xl:pb-2">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 mx-auto mb-1 lg:mb-2 rounded-lg overflow-hidden border-2 border-primary">
                        <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                      </div>
                      <CardTitle className="text-xs lg:text-sm text-center font-bold">{item.label}</CardTitle>
                      <p className="text-[10px] lg:text-xs text-muted-foreground text-center leading-tight">{item.pos}</p>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 lg:p-3 pt-0">
                      <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewPositionAnalysis(item.pos as ScoutingPosition)}>
                        <Eye className="h-3 w-3 mr-1" />Analysis
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewProspectTable(item.pos as ScoutingPosition)}>
                        <Users className="h-3 w-3 mr-1" />Prospects
                      </Button>
                      <Button size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleCreateReportForPosition(item.pos as ScoutingPosition)}>
                        <Plus className="h-3 w-3 mr-1" />Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Midfield Line */}
              <div className="flex justify-center gap-4 lg:gap-8 xl:gap-16 relative z-10">
                {[
                  { pos: "Central Midfielder", label: "RCM", player: "Kevin de Bruyne", img: deBruyne },
                  { pos: "Central Midfielder", label: "LCM", player: "Lampard", img: lampard }
                ].map((item, idx) => (
                  <Card key={`mid-${idx}`} className="w-32 lg:w-40 xl:w-48 bg-card/95 backdrop-blur hover:bg-card transition-all border-2 border-white/20">
                    <CardHeader className="p-2 lg:p-3 xl:pb-2">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 mx-auto mb-1 lg:mb-2 rounded-lg overflow-hidden border-2 border-primary">
                        <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                      </div>
                      <CardTitle className="text-xs lg:text-sm text-center font-bold">{item.label}</CardTitle>
                      <p className="text-[10px] lg:text-xs text-muted-foreground text-center leading-tight">{item.pos}</p>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 lg:p-3 pt-0">
                      <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewPositionAnalysis(item.pos as ScoutingPosition)}>
                        <Eye className="h-3 w-3 mr-1" />Analysis
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewProspectTable(item.pos as ScoutingPosition)}>
                        <Users className="h-3 w-3 mr-1" />Prospects
                      </Button>
                      <Button size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleCreateReportForPosition(item.pos as ScoutingPosition)}>
                        <Plus className="h-3 w-3 mr-1" />Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* CDM Line */}
              <div className="flex justify-center relative z-10">
                <Card className="w-32 lg:w-40 xl:w-48 bg-card/95 backdrop-blur hover:bg-card transition-all border-2 border-white/20">
                  <CardHeader className="p-2 lg:p-3 xl:pb-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 mx-auto mb-1 lg:mb-2 rounded-lg overflow-hidden border-2 border-primary">
                      <img src={kante} alt="CDM" className="w-full h-full object-cover" />
                    </div>
                    <CardTitle className="text-xs lg:text-sm text-center font-bold">CDM</CardTitle>
                    <p className="text-[10px] lg:text-xs text-muted-foreground text-center leading-tight">Central Defensive Midfielder</p>
                  </CardHeader>
                  <CardContent className="space-y-1 p-2 lg:p-3 pt-0">
                    <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewPositionAnalysis("Central Defensive Midfielder")}>
                      <Eye className="h-3 w-3 mr-1" />Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewProspectTable("Central Defensive Midfielder")}>
                      <Users className="h-3 w-3 mr-1" />Prospects
                    </Button>
                    <Button size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleCreateReportForPosition("Central Defensive Midfielder")}>
                      <Plus className="h-3 w-3 mr-1" />Report
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Defense Line */}
              <div className="flex justify-center gap-2 lg:gap-4 xl:gap-8 relative z-10">
                {[
                  { label: "LB", pos: "Full-Back", player: "Ashley Cole", img: ashleyCole },
                  { label: "LCB", pos: "Centre-Back", player: "Virgil van Dijk", img: vanDijk },
                  { label: "RCB", pos: "Centre-Back", player: "Sergio Ramos", img: sergioRamos },
                  { label: "RB", pos: "Full-Back", player: "Trent Alexander-Arnold", img: trent }
                ].map((item, idx) => (
                  <Card key={`def-${idx}`} className="w-28 lg:w-36 xl:w-44 bg-card/95 backdrop-blur hover:bg-card transition-all border-2 border-white/20">
                    <CardHeader className="p-2 lg:p-2">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 xl:w-14 xl:h-14 mx-auto mb-1 lg:mb-2 rounded-lg overflow-hidden border-2 border-primary">
                        <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                      </div>
                      <CardTitle className="text-[10px] lg:text-xs text-center font-bold">{item.label}</CardTitle>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground text-center leading-tight">{item.pos}</p>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 pt-0">
                      <Button variant="outline" size="sm" className="w-full h-5 lg:h-6 xl:h-7 text-[9px] lg:text-[10px] xl:text-xs" onClick={() => handleViewPositionAnalysis(item.pos as ScoutingPosition)}>
                        <Eye className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />Analysis
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-5 lg:h-6 xl:h-7 text-[9px] lg:text-[10px] xl:text-xs" onClick={() => handleViewProspectTable(item.pos as ScoutingPosition)}>
                        <Users className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />Prospects
                      </Button>
                      <Button size="sm" className="w-full h-5 lg:h-6 xl:h-7 text-[9px] lg:text-[10px] xl:text-xs" onClick={() => handleCreateReportForPosition(item.pos as ScoutingPosition)}>
                        <Plus className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Goalkeeper */}
              <div className="flex justify-center relative z-10">
                <Card className="w-32 lg:w-40 xl:w-48 bg-card/95 backdrop-blur hover:bg-card transition-all border-2 border-white/20">
                  <CardHeader className="p-2 lg:p-3 xl:pb-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 mx-auto mb-1 lg:mb-2 rounded-lg overflow-hidden border-2 border-primary">
                      <img src={buffon} alt="GK" className="w-full h-full object-cover" />
                    </div>
                    <CardTitle className="text-xs lg:text-sm text-center font-bold">GK</CardTitle>
                    <p className="text-[10px] lg:text-xs text-muted-foreground text-center leading-tight">Goalkeeper</p>
                  </CardHeader>
                  <CardContent className="space-y-1 p-2 lg:p-3 pt-0">
                    <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewPositionAnalysis("Goalkeeper")}>
                      <Eye className="h-3 w-3 mr-1" />Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleViewProspectTable("Goalkeeper")}>
                      <Users className="h-3 w-3 mr-1" />Prospects
                    </Button>
                    <Button size="sm" className="w-full h-6 lg:h-7 text-[10px] lg:text-xs" onClick={() => handleCreateReportForPosition("Goalkeeper")}>
                      <Plus className="h-3 w-3 mr-1" />Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Mobile Grid Layout */}
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCOUTING_POSITIONS.map((position) => (
                <Card key={position} className="bg-card hover:bg-accent/5 transition-all">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">{position}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => handleViewPositionAnalysis(position)}>
                      <Eye className="h-3 w-3 mr-1" />Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => handleViewProspectTable(position)}>
                      <Users className="h-3 w-3 mr-1" />Prospects
                    </Button>
                    <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleCreateReportForPosition(position)}>
                      <Plus className="h-3 w-3 mr-1" />Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Reports List View - Using Modern AllReportsSection */}
            <div className="mb-4">
              <Button onClick={() => setViewMode("positions")} variant="outline" size="sm" className="w-full sm:w-auto">
                <Target className="h-4 w-4 mr-2" />
                Position Analysis
              </Button>
            </div>
            <AllReportsSection 
              onViewReport={(report) => setViewingReport(report as any)}
              onEditReport={(report) => handleEdit(report as any)}
            />
          </>
        )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="scouted-players" className="flex-1 mt-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="pr-4">
                  <ScoutedPlayersSection />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all-players" className="flex-1 mt-0">
              <AllReportsSection 
                onViewReport={(report) => setViewingReport(report as any)}
                onEditReport={(report) => handleEdit(report as any)}
              />
            </TabsContent>

            <TabsContent value="scouts" className="flex-1 mt-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-4 pr-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Scout Management</h3>
                    <Button onClick={() => setIsAddingScout(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Scout
                    </Button>
                  </div>

                  {scouts.map((scout) => {
                    // Get reports for this scout
                    const scoutReports = reports.filter(r => r.scout_id === scout.id);
                    const statusCounts = {
                      recommended: scoutReports.filter(r => r.status === 'recommended').length,
                      monitoring: scoutReports.filter(r => r.status === 'monitoring').length,
                      pending: scoutReports.filter(r => r.status === 'pending').length,
                      rejected: scoutReports.filter(r => r.status === 'rejected').length,
                    };

                    return (
                      <Card key={scout.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{scout.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{scout.email}</p>
                              {scout.country && (
                                <p className="text-xs text-muted-foreground mt-1">📍 {scout.country}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={scout.status === 'active' ? 'default' : 'secondary'}
                              >
                                {scout.status}
                              </Badge>
                              <Badge variant="secondary">
                                {scoutReports.length} {scoutReports.length === 1 ? 'report' : 'reports'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Scout Info */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Commission</p>
                              <p className="font-semibold">{scout.commission_rate || 0}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Signings</p>
                              <p className="font-semibold">{scout.successful_signings || 0}</p>
                            </div>
                            {scout.phone && (
                              <div>
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="font-semibold text-xs">{scout.phone}</p>
                              </div>
                            )}
                            {scout.regions && scout.regions.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Regions</p>
                                <p className="font-semibold text-xs">{scout.regions.join(', ')}</p>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <div className="text-2xl font-bold text-green-500">{statusCounts.recommended}</div>
                              <div className="text-xs text-muted-foreground">Recommended</div>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <div className="text-2xl font-bold text-blue-500">{statusCounts.monitoring}</div>
                              <div className="text-xs text-muted-foreground">Monitoring</div>
                            </div>
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <div className="text-2xl font-bold text-yellow-500">{statusCounts.pending}</div>
                              <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <div className="text-2xl font-bold text-red-500">{statusCounts.rejected}</div>
                              <div className="text-xs text-muted-foreground">Rejected</div>
                            </div>
                          </div>

                          {/* Recent Reports */}
                          {scoutReports.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Recent Reports</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {scoutReports.slice(0, 6).map((report) => (
                                  <Card 
                                    key={report.id} 
                                    className="cursor-pointer hover:border-primary transition-colors" 
                                    onClick={() => setViewingReport(report)}
                                  >
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm">{report.player_name}</CardTitle>
                                      <p className="text-xs text-muted-foreground">{report.position}</p>
                                    </CardHeader>
                                    <CardContent className="space-y-1">
                                      {report.current_club && (
                                        <p className="text-xs"><span className="text-muted-foreground">Club:</span> {report.current_club}</p>
                                      )}
                                      {report.scouting_date && (
                                        <p className="text-xs"><span className="text-muted-foreground">Date:</span> {format(new Date(report.scouting_date), "dd MMM yyyy")}</p>
                                      )}
                                      <Badge variant="outline" className={getStatusColor(report.status)}>
                                        {report.status}
                                      </Badge>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                              {scoutReports.length > 6 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  +{scoutReports.length - 6} more reports
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {scouts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No scouts added yet. Click "Add Scout" to create a new scout account.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="network" className="flex-1 mt-0">
              <div className="h-[calc(100vh-350px)]">
                <ScoutingNetworkMap />
              </div>
            </TabsContent>

            <TabsContent value="map-coords" className="flex-1 mt-0">
              <div className="h-[calc(100vh-350px)]">
                <MapCoordinatesManager />
              </div>
            </TabsContent>
          </Tabs>
        </div>


      {/* Add/Edit Dialog */}
      <Dialog open={isAddingNew} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingReport ? "Edit Scouting Report" : "New Scouting Report"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-nowrap overflow-x-auto md:grid md:grid-cols-4 w-full gap-1 justify-start">
                <TabsTrigger value="basic" className="flex-shrink-0 whitespace-nowrap">Basic Info</TabsTrigger>
                <TabsTrigger value="skills" disabled={!formData.position} className="flex-shrink-0 whitespace-nowrap">
                  Skill Evaluation
                </TabsTrigger>
                <TabsTrigger value="review" className="flex-shrink-0 whitespace-nowrap">AI Review</TabsTrigger>
                <TabsTrigger value="contact" className="flex-shrink-0 whitespace-nowrap">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="player_name">Player Name *</Label>
                    <Input
                      id="player_name"
                      value={formData.player_name}
                      onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linked_player">Link to Existing Player (Optional)</Label>
                    <Select
                      value={formData.linked_player_id}
                      onValueChange={(value) => setFormData({ ...formData, linked_player_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={handlePositionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOUTING_POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_club">Current Club</Label>
                    <Input
                      id="current_club"
                      value={formData.current_club}
                      onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height_cm">Height (cm)</Label>
                    <Input
                      id="height_cm"
                      type="number"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_foot">Preferred Foot</Label>
                    <Select
                      value={formData.preferred_foot}
                      onValueChange={(value) => setFormData({ ...formData, preferred_foot: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Left">Left</SelectItem>
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scout_name">Scout Name</Label>
                    <Input
                      id="scout_name"
                      value={formData.scout_name}
                      onChange={(e) => setFormData({ ...formData, scout_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scouting_date">Scouting Date *</Label>
                    <Input
                      id="scouting_date"
                      type="date"
                      value={formData.scouting_date}
                      onChange={(e) => setFormData({ ...formData, scouting_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competition">Competition</Label>
                    <Input
                      id="competition"
                      value={formData.competition}
                      onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority || "none"}
                      onValueChange={(value) => setFormData({ ...formData, priority: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="match_context">Match Context</Label>
                  <Textarea
                    id="match_context"
                    value={formData.match_context}
                    onChange={(e) => setFormData({ ...formData, match_context: e.target.value })}
                    placeholder="e.g., Home game vs Team X, playing as striker in 4-3-3"
                  />
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4 mt-4">
                {formData.position ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Skill Evaluation - {formData.position}</h3>
                        <p className="text-sm text-muted-foreground">
                          Grade each skill and add specific observations from the match
                        </p>
                      </div>
                      <Button 
                        type="button"
                        onClick={handleGenerateReview}
                        disabled={generatingReview || skillEvaluations.length === 0}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {generatingReview ? "Generating..." : "Generate Review"}
                      </Button>
                    </div>
                    <SkillEvaluationForm
                      skillEvaluations={skillEvaluations}
                      onChange={setSkillEvaluations}
                    />
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Please select a position in Basic Info to evaluate skills
                  </div>
                )}
              </TabsContent>

              <TabsContent value="review" className="space-y-4 mt-4">
                {formData.auto_generated_review ? (
                  <div className="space-y-4">
                    <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold">AI-Generated Scouting Review</Label>
                        </div>
                        <Button 
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateReview}
                          disabled={generatingReview}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {formData.auto_generated_review}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Match Highlights/Clips URL</Label>
                      <Input
                        id="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_match_url">Full Match URL</Label>
                      <Input
                        id="full_match_url"
                        type="url"
                        value={formData.full_match_url}
                        onChange={(e) => setFormData({ ...formData, full_match_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Complete the skill evaluation to generate an AI review
                    </p>
                    <Button 
                      type="button"
                      onClick={handleGenerateReview}
                      disabled={generatingReview || !formData.position}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatingReview ? "Generating..." : "Generate Review"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Player Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Player Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent_name">Agent Name</Label>
                    <Input
                      id="agent_name"
                      value={formData.agent_name}
                      onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent_contact">Agent Contact</Label>
                    <Input
                      id="agent_contact"
                      value={formData.agent_contact}
                      onChange={(e) => setFormData({ ...formData, agent_contact: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingReport ? "Update Report" : "Create Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => { if (!open) setViewingReport(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Scouting Report: {viewingReport?.player_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2 md:pr-4">
            {viewingReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Player Info</h3>
                    <div className="space-y-1 text-sm">
                      {viewingReport.age && <p><span className="text-muted-foreground">Age:</span> {viewingReport.age}</p>}
                      {viewingReport.position && <p><span className="text-muted-foreground">Position:</span> {viewingReport.position}</p>}
                      {viewingReport.current_club && <p><span className="text-muted-foreground">Club:</span> {viewingReport.current_club}</p>}
                      {viewingReport.nationality && <p><span className="text-muted-foreground">Nationality:</span> {viewingReport.nationality}</p>}
                      {viewingReport.height_cm && <p><span className="text-muted-foreground">Height:</span> {viewingReport.height_cm} cm</p>}
                      {viewingReport.preferred_foot && <p><span className="text-muted-foreground">Foot:</span> {viewingReport.preferred_foot}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Scouting Info</h3>
                    <div className="space-y-1 text-sm">
                      {viewingReport.scout_name && <p><span className="text-muted-foreground">Scout:</span> {viewingReport.scout_name}</p>}
                      <p><span className="text-muted-foreground">Date:</span> {viewingReport.scouting_date ? format(new Date(viewingReport.scouting_date), "dd MMM yyyy") : "—"}</p>
                      {viewingReport.location && <p><span className="text-muted-foreground">Location:</span> {viewingReport.location}</p>}
                      {viewingReport.competition && <p><span className="text-muted-foreground">Competition:</span> {viewingReport.competition}</p>}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className={getStatusColor(viewingReport.status)}>
                          {viewingReport.status}
                        </Badge>
                        {viewingReport.priority && (
                          <Badge variant="outline" className={getPriorityColor(viewingReport.priority)}>
                            {viewingReport.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {viewingReport.match_context && (
                  <div>
                    <h3 className="font-semibold mb-2">Match Context</h3>
                    <p className="text-sm text-muted-foreground">{viewingReport.match_context}</p>
                  </div>
                )}

                {(viewingReport.overall_rating || viewingReport.technical_rating || viewingReport.physical_rating || viewingReport.tactical_rating || viewingReport.mental_rating) && (
                  <div>
                    <h3 className="font-semibold mb-2">Ratings</h3>
                    <div className="grid grid-cols-5 gap-4 text-center">
                      {viewingReport.overall_rating && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{viewingReport.overall_rating}</div>
                          <div className="text-xs text-muted-foreground">Overall</div>
                        </div>
                      )}
                      {viewingReport.technical_rating && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{viewingReport.technical_rating}</div>
                          <div className="text-xs text-muted-foreground">Technical</div>
                        </div>
                      )}
                      {viewingReport.physical_rating && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{viewingReport.physical_rating}</div>
                          <div className="text-xs text-muted-foreground">Physical</div>
                        </div>
                      )}
                      {viewingReport.tactical_rating && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{viewingReport.tactical_rating}</div>
                          <div className="text-xs text-muted-foreground">Tactical</div>
                        </div>
                      )}
                      {viewingReport.mental_rating && (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">{viewingReport.mental_rating}</div>
                          <div className="text-xs text-muted-foreground">Mental</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingReport.strengths && (
                  <div>
                    <h3 className="font-semibold mb-2">Strengths</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.strengths}</p>
                  </div>
                )}

                {viewingReport.weaknesses && (
                  <div>
                    <h3 className="font-semibold mb-2">Weaknesses</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.weaknesses}</p>
                  </div>
                )}

                {viewingReport.summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.summary}</p>
                  </div>
                )}

                {viewingReport.potential_assessment && (
                  <div>
                    <h3 className="font-semibold mb-2">Potential Assessment</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.potential_assessment}</p>
                  </div>
                )}

                {viewingReport.recommendation && (
                  <div>
                    <h3 className="font-semibold mb-2">Recommendation</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.recommendation}</p>
                  </div>
                )}

                {viewingReport.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Additional Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReport.notes}</p>
                  </div>
                )}

                {(viewingReport.contact_email || viewingReport.contact_phone || viewingReport.agent_name) && (
                  <div>
                    <h3 className="font-semibold mb-2">Contact Information</h3>
                    <div className="space-y-1 text-sm">
                      {viewingReport.contact_email && <p><span className="text-muted-foreground">Email:</span> {viewingReport.contact_email}</p>}
                      {viewingReport.contact_phone && <p><span className="text-muted-foreground">Phone:</span> {viewingReport.contact_phone}</p>}
                      {viewingReport.agent_name && <p><span className="text-muted-foreground">Agent:</span> {viewingReport.agent_name}</p>}
                      {viewingReport.agent_contact && <p><span className="text-muted-foreground">Agent Contact:</span> {viewingReport.agent_contact}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Position Analysis Dialog */}
      <Dialog open={!!viewingPositionAnalysis} onOpenChange={(open) => { if (!open) setViewingPositionAnalysis(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{viewingPositionAnalysis} - Position Analysis</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2 md:pr-4">
            {viewingPositionAnalysis && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  What we're looking for in a {viewingPositionAnalysis}
                </p>
                
                {["Physical", "Psychological", "Tactical", "Technical"].map((domain) => {
                  const domainSkills = POSITION_SKILLS[viewingPositionAnalysis].filter(
                    (skill) => skill.domain === domain
                  );
                  
                  return (
                    <div key={domain} className="space-y-3">
                      <h3 className="text-lg font-semibold border-b pb-2">{domain}</h3>
                      <div className="grid gap-4">
                        {domainSkills.map((skill, idx) => (
                          <div key={idx} className="space-y-2">
                            <h4 className="font-medium text-sm">{skill.skill_name}</h4>
                            <p className="text-sm text-muted-foreground">{skill.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => {
                    setViewingPositionAnalysis(null);
                    handleCreateReportForPosition(viewingPositionAnalysis);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Report for {viewingPositionAnalysis}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Prospect Table Dialog */}
      <Dialog open={!!viewingProspectTable} onOpenChange={(open) => { if (!open) setViewingProspectTable(null); }}>
        <DialogContent className="max-w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Prospect Table: {viewingProspectTable}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            {loading ? (
              <div className="text-center py-8">Loading prospects...</div>
            ) : prospectReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scouting reports found for this position
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Player</TableHead>
                      <TableHead className="min-w-[120px]">Club</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => sortProspectReports("overall_rating")}
                      >
                        Overall {sortField === "overall_rating" && "↓"}
                      </TableHead>
                      {viewingProspectTable && POSITION_SKILLS[viewingProspectTable].map((skill) => (
                        <TableHead 
                          key={skill.skill_name}
                          className="cursor-pointer hover:text-foreground min-w-[100px]"
                          onClick={() => sortProspectReports(skill.skill_name)}
                        >
                          {skill.skill_name} {sortField === skill.skill_name && "↓"}
                        </TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospectReports.map((report) => {
                      const skills = report.skill_evaluations as SkillEvaluation[] || [];
                      return (
                        <TableRow 
                          key={report.id} 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => setViewingReport(report)}
                        >
                          <TableCell className="font-medium">{report.player_name}</TableCell>
                          <TableCell className="text-muted-foreground">{report.current_club || "-"}</TableCell>
                          <TableCell>{report.age || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.overall_rating?.toFixed(1) || "-"}</Badge>
                          </TableCell>
                          {viewingProspectTable && POSITION_SKILLS[viewingProspectTable].map((skill) => {
                            const evaluation = skills.find(s => s.skill_name === skill.skill_name);
                            return (
                              <TableCell key={skill.skill_name}>
                                <Badge 
                                  variant={
                                    evaluation?.grade.startsWith('A') ? 'default' : 
                                    evaluation?.grade.startsWith('B') ? 'secondary' : 
                                    'outline'
                                  }
                                >
                                  {evaluation?.grade || "-"}
                                </Badge>
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <Badge variant={
                              report.status === 'recommended' ? 'default' :
                              report.status === 'monitoring' ? 'secondary' :
                              report.status === 'rejected' ? 'destructive' : 
                              'outline'
                            }>
                              {report.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Scout Dialog */}
      <Dialog open={isAddingScout} onOpenChange={setIsAddingScout}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Scout</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scout_name">Name *</Label>
                  <Input
                    id="scout_name"
                    value={newScoutData.name}
                    onChange={(e) => setNewScoutData({ ...newScoutData, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scout_email">Email *</Label>
                  <Input
                    id="scout_email"
                    type="email"
                    value={newScoutData.email}
                    onChange={(e) => setNewScoutData({ ...newScoutData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scout_phone">Phone</Label>
                  <Input
                    id="scout_phone"
                    value={newScoutData.phone}
                    onChange={(e) => setNewScoutData({ ...newScoutData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scout_country">Country</Label>
                  <Input
                    id="scout_country"
                    value={newScoutData.country}
                    onChange={(e) => setNewScoutData({ ...newScoutData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scout_commission">Commission Rate (%)</Label>
                  <Input
                    id="scout_commission"
                    type="number"
                    step="0.1"
                    value={newScoutData.commission_rate}
                    onChange={(e) => setNewScoutData({ ...newScoutData, commission_rate: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scout_notes">Notes</Label>
                <Textarea
                  id="scout_notes"
                  value={newScoutData.notes}
                  onChange={(e) => setNewScoutData({ ...newScoutData, notes: e.target.value })}
                  placeholder="Additional notes about this scout..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingScout(false);
                    setNewScoutData({
                      name: "",
                      email: "",
                      phone: "",
                      country: "",
                      regions: [],
                      commission_rate: "",
                      notes: ""
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!newScoutData.name || !newScoutData.email) {
                      toast.error("Name and email are required");
                      return;
                    }

                    try {
                      const { error } = await supabase
                        .from('scouts')
                        .insert({
                          name: newScoutData.name,
                          email: newScoutData.email,
                          phone: newScoutData.phone || null,
                          country: newScoutData.country || null,
                          regions: newScoutData.regions.length > 0 ? newScoutData.regions : null,
                          commission_rate: newScoutData.commission_rate ? parseFloat(newScoutData.commission_rate) : null,
                          notes: newScoutData.notes || null,
                          status: 'active'
                        });

                      if (error) throw error;

                      toast.success("Scout added successfully!");
                      setIsAddingScout(false);
                      setNewScoutData({
                        name: "",
                        email: "",
                        phone: "",
                        country: "",
                        regions: [],
                        commission_rate: "",
                        notes: ""
                      });
                      fetchScouts();
                    } catch (error: any) {
                      console.error("Error adding scout:", error);
                      toast.error(error.message || "Failed to add scout");
                    }
                  }}
                >
                  Add Scout
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};