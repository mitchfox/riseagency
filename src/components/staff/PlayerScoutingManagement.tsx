import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Link as LinkIcon, Unlink, Plus, Search, Edit } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillEvaluationForm } from "./SkillEvaluationForm";
import { initializeSkillEvaluations, SkillEvaluation, SCOUTING_POSITIONS, ScoutingPosition, calculateOverallGrade, calculateDomainGrade } from "@/data/scoutingSkills";

interface ScoutingReport {
  id: string;
  player_name: string;
  scouting_date: string;
  overall_rating: number | null;
  position: string | null;
  current_club: string | null;
  nationality: string | null;
  linked_player_id: string | null;
  status: string;
  recommendation: string | null;
  scout_name: string | null;
  skill_evaluations?: any;
  auto_generated_review?: string | null;
  location?: string | null;
  competition?: string | null;
  match_context?: string | null;
  video_url?: string | null;
  full_match_url?: string | null;
  scout_id?: string | null;
}

interface PlayerScoutingManagementProps {
  playerId: string;
  playerName: string;
}

// Generate month options
const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Generate year options (current year and 5 years back)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

export const PlayerScoutingManagement = ({ playerId, playerName }: PlayerScoutingManagementProps) => {
  const [scoutingReports, setScoutingReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [unlinkedReports, setUnlinkedReports] = useState<ScoutingReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [linking, setLinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [skillEvaluations, setSkillEvaluations] = useState<SkillEvaluation[]>([]);
  const [formData, setFormData] = useState({
    position: "",
    scouting_month: format(new Date(), "MM"),
    scouting_year: format(new Date(), "yyyy"),
    current_club: "",
    nationality: "",
    location: "",
    competition: "",
    match_context: "",
    video_url: "",
    scout_name: "",
    auto_generated_review: "",
  });

  useEffect(() => {
    fetchScoutingReports();
  }, [playerId]);

  const fetchScoutingReports = async () => {
    try {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("*")
        .eq("linked_player_id", playerId)
        .order("scouting_date", { ascending: false });

      if (error) throw error;
      setScoutingReports(data || []);
    } catch (error) {
      console.error("Error fetching scouting reports:", error);
      toast.error("Failed to load scouting reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlinkedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("*")
        .is("linked_player_id", null)
        .order("scouting_date", { ascending: false });

      if (error) throw error;
      setUnlinkedReports(data || []);
    } catch (error) {
      console.error("Error fetching unlinked reports:", error);
      toast.error("Failed to load available reports");
    }
  };

  const handleUnlink = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("scouting_reports")
        .update({ linked_player_id: null })
        .eq("id", reportId);

      if (error) throw error;
      
      toast.success("Scouting report unlinked");
      fetchScoutingReports();
    } catch (error) {
      console.error("Error unlinking report:", error);
      toast.error("Failed to unlink report");
    }
  };

  const handleLinkReport = async (reportId: string) => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from("scouting_reports")
        .update({ linked_player_id: playerId })
        .eq("id", reportId);

      if (error) throw error;
      
      toast.success("Scouting report linked successfully");
      setIsLinkDialogOpen(false);
      fetchScoutingReports();
    } catch (error) {
      console.error("Error linking report:", error);
      toast.error("Failed to link report");
    } finally {
      setLinking(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    window.open(`/staff?section=recruitment&view=scouting&report=${reportId}`, '_blank');
  };

  const handleOpenLinkDialog = () => {
    setIsLinkDialogOpen(true);
    fetchUnlinkedReports();
    setSearchTerm("");
  };

  const handlePositionChange = (position: string) => {
    setFormData({ ...formData, position });
    const newEvaluations = initializeSkillEvaluations(position);
    setSkillEvaluations(newEvaluations);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scouting_month || !formData.scouting_year) {
      toast.error("Scouting month and year are required");
      return;
    }

    // Create date from month/year (use 1st of the month)
    const scoutingDate = `${formData.scouting_year}-${formData.scouting_month}-01`;

    setCreating(true);
    try {
      const reportData = {
        player_name: playerName,
        position: formData.position || null,
        current_club: formData.current_club || null,
        nationality: formData.nationality || null,
        scouting_date: scoutingDate,
        location: formData.location || null,
        competition: formData.competition || null,
        match_context: formData.match_context || null,
        video_url: formData.video_url || null,
        scout_name: formData.scout_name || null,
        skill_evaluations: skillEvaluations as any,
        auto_generated_review: formData.auto_generated_review || null,
        linked_player_id: playerId,
        status: "pending",
      };

      const { error } = await supabase
        .from("scouting_reports")
        .insert(reportData);

      if (error) throw error;

      toast.success("Scouting report created and linked");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchScoutingReports();
    } catch (error) {
      console.error("Error creating scouting report:", error);
      toast.error("Failed to create scouting report");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      position: "",
      scouting_month: format(new Date(), "MM"),
      scouting_year: format(new Date(), "yyyy"),
      current_club: "",
      nationality: "",
      location: "",
      competition: "",
      match_context: "",
      video_url: "",
      scout_name: "",
      auto_generated_review: "",
    });
    setSkillEvaluations([]);
    setActiveTab("basic");
    setEditingReportId(null);
  };

  const handleEditReport = async (report: ScoutingReport) => {
    const date = new Date(report.scouting_date);
    setFormData({
      position: report.position || "",
      scouting_month: format(date, "MM"),
      scouting_year: format(date, "yyyy"),
      current_club: report.current_club || "",
      nationality: report.nationality || "",
      location: report.location || "",
      competition: report.competition || "",
      match_context: report.match_context || "",
      video_url: report.video_url || "",
      scout_name: report.scout_name || "",
      auto_generated_review: report.auto_generated_review || "",
    });
    if (report.position) {
      const evaluations = report.skill_evaluations || initializeSkillEvaluations(report.position);
      setSkillEvaluations(evaluations);
    }
    setEditingReportId(report.id);
    setActiveTab("basic");
    setIsEditDialogOpen(true);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingReportId) return;
    
    if (!formData.scouting_month || !formData.scouting_year) {
      toast.error("Scouting month and year are required");
      return;
    }

    const scoutingDate = `${formData.scouting_year}-${formData.scouting_month}-01`;

    setUpdating(true);
    try {
      const reportData = {
        position: formData.position || null,
        current_club: formData.current_club || null,
        nationality: formData.nationality || null,
        scouting_date: scoutingDate,
        location: formData.location || null,
        competition: formData.competition || null,
        match_context: formData.match_context || null,
        video_url: formData.video_url || null,
        scout_name: formData.scout_name || null,
        skill_evaluations: skillEvaluations as any,
        auto_generated_review: formData.auto_generated_review || null,
      };

      const { error } = await supabase
        .from("scouting_reports")
        .update(reportData)
        .eq("id", editingReportId);

      if (error) throw error;

      toast.success("Scouting report updated");
      setIsEditDialogOpen(false);
      resetForm();
      fetchScoutingReports();
    } catch (error) {
      console.error("Error updating scouting report:", error);
      toast.error("Failed to update scouting report");
    } finally {
      setUpdating(false);
    }
  };

  const filteredUnlinkedReports = unlinkedReports.filter(report =>
    report.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.current_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading scouting reports...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Scouting Reports</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleOpenLinkDialog}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Link Existing
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6 py-4">
          {scoutingReports.length > 0 ? (
            <div className="space-y-3">
              {scoutingReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{report.player_name}</h4>
                        {report.overall_rating && (
                          <span className="text-sm px-2 py-0.5 rounded bg-primary/20 text-primary">
                            {report.overall_rating}/10
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {report.position && <div>Position: {report.position}</div>}
                        {report.current_club && <div>Club: {report.current_club}</div>}
                        {report.nationality && <div>Nationality: {report.nationality}</div>}
                        <div>Date: {format(new Date(report.scouting_date), "MMM dd, yyyy")}</div>
                        {report.scout_name && <div>Scout: {report.scout_name}</div>}
                        {report.recommendation && (
                          <div className="mt-2">
                            <span className="font-medium">Recommendation:</span> {report.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewReport(report.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditReport(report)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlink(report.id)}
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No scouting reports linked to {playerName}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleOpenLinkDialog}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Existing Report
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Report
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Existing Report Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Link Existing Scouting Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              {filteredUnlinkedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No unlinked scouting reports available
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUnlinkedReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 rounded-lg border border-border/50 hover:border-primary transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{report.player_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {report.position && `${report.position} • `}
                            {report.current_club && `${report.current_club} • `}
                            {format(new Date(report.scouting_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkReport(report.id)}
                          disabled={linking}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Report Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Scouting Report for {playerName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReport}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="skills">Skill Evaluation</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select value={formData.position} onValueChange={handlePositionChange}>
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
                    <Label>Month *</Label>
                    <Select value={formData.scouting_month} onValueChange={(value) => setFormData({ ...formData, scouting_month: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select value={formData.scouting_year} onValueChange={(value) => setFormData({ ...formData, scouting_year: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Club</Label>
                    <Input
                      value={formData.current_club}
                      onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                      placeholder="Enter club name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Enter nationality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Match location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Competition</Label>
                    <Input
                      value={formData.competition}
                      onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                      placeholder="Competition name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scout Name</Label>
                    <Input
                      value={formData.scout_name}
                      onChange={(e) => setFormData({ ...formData, scout_name: e.target.value })}
                      placeholder="Scout name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="Video link"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Match Context</Label>
                  <Textarea
                    value={formData.match_context}
                    onChange={(e) => setFormData({ ...formData, match_context: e.target.value })}
                    placeholder="Describe the match context..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                {formData.position && skillEvaluations.length > 0 ? (
                  <SkillEvaluationForm
                    skillEvaluations={skillEvaluations}
                    onChange={setSkillEvaluations}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a position first to evaluate skills
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-2">
                  <Label>Review / Notes</Label>
                  <Textarea
                    value={formData.auto_generated_review}
                    onChange={(e) => setFormData({ ...formData, auto_generated_review: e.target.value })}
                    placeholder="Write your assessment of the player..."
                    rows={8}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Scouting Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateReport}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="skills">Skill Evaluation</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select value={formData.position} onValueChange={handlePositionChange}>
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
                    <Label>Month *</Label>
                    <Select value={formData.scouting_month} onValueChange={(value) => setFormData({ ...formData, scouting_month: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select value={formData.scouting_year} onValueChange={(value) => setFormData({ ...formData, scouting_year: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Club</Label>
                    <Input
                      value={formData.current_club}
                      onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                      placeholder="Enter club name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Enter nationality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scout Name</Label>
                    <Input
                      value={formData.scout_name}
                      onChange={(e) => setFormData({ ...formData, scout_name: e.target.value })}
                      placeholder="Scout name"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                {formData.position && skillEvaluations.length > 0 ? (
                  <SkillEvaluationForm
                    skillEvaluations={skillEvaluations}
                    onChange={setSkillEvaluations}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a position first to evaluate skills
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-2">
                  <Label>Review / Notes</Label>
                  <Textarea
                    value={formData.auto_generated_review}
                    onChange={(e) => setFormData({ ...formData, auto_generated_review: e.target.value })}
                    placeholder="Write your assessment of the player..."
                    rows={8}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Updating..." : "Update Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
