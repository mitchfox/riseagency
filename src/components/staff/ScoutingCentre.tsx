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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, UserPlus, Eye, Filter, Search, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { SkillEvaluationForm } from "./SkillEvaluationForm";
import { initializeSkillEvaluations, SkillEvaluation, SCOUTING_POSITIONS } from "@/data/scoutingSkills";

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
  scouting_date: string;
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
  created_at: string;
  updated_at: string;
}

interface ScoutingCentreProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScoutingCentre = ({ open, onOpenChange }: ScoutingCentreProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingReport, setEditingReport] = useState<ScoutingReport | null>(null);
  const [viewingReport, setViewingReport] = useState<ScoutingReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [skillEvaluations, setSkillEvaluations] = useState<SkillEvaluation[]>([]);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
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
    auto_generated_review: ""
  });

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open]);

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
        profile_image_url: formData.profile_image_url || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        agent_name: formData.agent_name || null,
        agent_contact: formData.agent_contact || null,
        status: formData.status,
        priority: formData.priority || null,
        skill_evaluations: skillEvaluations as any,
        auto_generated_review: formData.auto_generated_review || null,
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
      scouting_date: report.scouting_date,
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
      auto_generated_review: report.auto_generated_review || ""
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
          notes: `Scouted on ${format(new Date(report.scouting_date), "dd/MM/yyyy")}\n\n${report.summary || ""}`
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
      auto_generated_review: ""
    });
    setSkillEvaluations([]);
    setEditingReport(null);
    setIsAddingNew(false);
    setActiveTab("basic");
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading reports...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="bg-card hover:bg-accent/5 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{report.player_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {report.age && <span>{report.age}y</span>}
                        {report.position && <span>• {report.position}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(report)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.current_club && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Club:</span>
                      <span className="ml-2 font-medium">{report.current_club}</span>
                    </div>
                  )}
                  {report.overall_rating && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Rating:</span>
                      <span className="ml-2 font-medium">{report.overall_rating}/10</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                    {report.priority && (
                      <Badge variant="outline" className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Scouted: {format(new Date(report.scouting_date), "dd MMM yyyy")}
                  </div>
                  {!report.added_to_prospects && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleAddToProspects(report)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add to Prospects
                    </Button>
                  )}
                  {report.added_to_prospects && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Added to Prospects
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredReports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No scouting reports found
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingNew} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? "Edit Scouting Report" : "New Scouting Report"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="skills" disabled={!formData.position}>
                  Skill Evaluation
                </TabsTrigger>
                <TabsTrigger value="review">AI Review</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
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
                      <Label htmlFor="video_url">Match Video URL</Label>
                      <Input
                        id="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
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
                <div className="grid grid-cols-2 gap-4">
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Scouting Report: {viewingReport?.player_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {viewingReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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
                      <p><span className="text-muted-foreground">Date:</span> {format(new Date(viewingReport.scouting_date), "dd MMM yyyy")}</p>
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
    </>
  );
};