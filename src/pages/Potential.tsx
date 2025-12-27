import { useState } from "react";
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
import { LogOut, Plus, Users, MessageSquare, Search, FileText, Trash2, Edit, Target } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkillEvaluationForm } from "@/components/staff/SkillEvaluationForm";
import { initializeSkillEvaluations, SkillEvaluation, SCOUTING_POSITIONS, ScoutingPosition } from "@/data/scoutingSkills";
import ScoutingNetworkMap from "@/components/ScoutingNetworkMap";
import { Globe, TrendingUp, Award, Users2 } from "lucide-react";

interface DraftFormData {
  id?: string;
  player_name: string;
  position: string;
  age: string;
  current_club: string;
  nationality: string;
  competition: string;
  skill_evaluations: SkillEvaluation[];
  strengths: string;
  weaknesses: string;
  summary: string;
  recommendation: string;
  video_url: string;
}

const Potential = () => {
  const { scout, loading, signOut } = useScoutAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form state for draft
  const [draftForm, setDraftForm] = useState<DraftFormData>({
    player_name: "",
    position: "",
    age: "",
    current_club: "",
    nationality: "",
    competition: "",
    skill_evaluations: [],
    strengths: "",
    weaknesses: "",
    summary: "",
    recommendation: "",
    video_url: "",
  });

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

  // Calculate exclusive rights and contributor players
  const playerRights = submissions.reduce((acc, report) => {
    const playerName = report.player_name.toLowerCase();
    const earliestReport = allPlayerNames.find(r => r.player_name.toLowerCase() === playerName);
    
    if (earliestReport?.scout_id === scout?.id) {
      acc.exclusive.push(report);
    } else {
      acc.contributor.push(report);
    }
    
    return acc;
  }, { exclusive: [] as any[], contributor: [] as any[] });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: DraftFormData) => {
      const dataToSave = {
        player_name: draftData.player_name,
        position: draftData.position,
        age: draftData.age ? parseInt(draftData.age) : null,
        current_club: draftData.current_club,
        nationality: draftData.nationality,
        competition: draftData.competition,
        skill_evaluations: draftData.skill_evaluations as any,
        strengths: draftData.strengths,
        weaknesses: draftData.weaknesses,
        summary: draftData.summary,
        recommendation: draftData.recommendation,
        video_url: draftData.video_url,
        scout_id: scout?.id,
      };

      if (draftData.id) {
        // Update existing draft
        const { error } = await supabase
          .from("scouting_report_drafts")
          .update(dataToSave)
          .eq("id", draftData.id);
        
        if (error) throw error;
      } else {
        // Create new draft
        const { error } = await supabase
          .from("scouting_report_drafts")
          .insert(dataToSave);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Draft saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["scout-drafts"] });
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
          age: reportData.age ? parseInt(reportData.age) : null,
          current_club: reportData.current_club,
          nationality: reportData.nationality,
          competition: reportData.competition,
          skill_evaluations: reportData.skill_evaluations as any,
          strengths: reportData.strengths,
          weaknesses: reportData.weaknesses,
          summary: reportData.summary,
          recommendation: reportData.recommendation,
          video_url: reportData.video_url,
          scout_id: scout?.id,
          scout_name: scout?.name,
          scouting_date: new Date().toISOString().split('T')[0],
          status: "pending",
        });
      
      if (error) throw error;

      // Delete the draft if submitting from a saved draft
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
      setIsCreatingNew(false);
      setSelectedDraft(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit report");
    },
  });

  const resetForm = () => {
    setDraftForm({
      player_name: "",
      position: "",
      age: "",
      current_club: "",
      nationality: "",
      competition: "",
      skill_evaluations: [],
      strengths: "",
      weaknesses: "",
      summary: "",
      recommendation: "",
      video_url: "",
    });
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
      age: draft.age?.toString() || "",
      current_club: draft.current_club || "",
      nationality: draft.nationality || "",
      competition: draft.competition || "",
      skill_evaluations: draft.skill_evaluations || [],
      strengths: draft.strengths || "",
      weaknesses: draft.weaknesses || "",
      summary: draft.summary || "",
      recommendation: draft.recommendation || "",
      video_url: draft.video_url || "",
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

  const handleSaveDraft = () => {
    if (!draftForm.player_name || !draftForm.position) {
      toast.error("Please fill in player name and position");
      return;
    }
    saveDraftMutation.mutate(draftForm);
  };

  const handleSubmitReport = () => {
    if (!draftForm.player_name || !draftForm.position) {
      toast.error("Please fill in player name and position");
      return;
    }
    submitReportMutation.mutate(draftForm);
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
            <TabsTrigger value="drafts" onClick={() => setIsCreatingNew(false)}>
              <FileText className="h-4 w-4 mr-2" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
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
                    {playerRights.exclusive.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    New to database
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
                    {playerRights.contributor.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Existing players
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
                              className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                            >
                              <div className="font-medium">{report.player_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {report.position} • {report.current_club}
                              </div>
                              <div className="text-xs text-green-600 mt-1">
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
                              className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                            >
                              <div className="font-medium">{report.player_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {report.position} • {report.current_club}
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
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
          </TabsContent>

          {/* My Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by player name, club, or nationality..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {submissions.length} total submissions
              </div>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        {searchTerm ? "No submissions match your search" : "No submissions yet"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredSubmissions.map((report) => (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle>{report.player_name}</CardTitle>
                            <CardDescription>
                              {report.position} • {report.current_club} • {report.nationality}
                            </CardDescription>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                      <CardContent>
                        {report.summary && (
                          <p className="text-sm text-muted-foreground mb-2">{report.summary}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
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
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setSelectedDraft(null);
                        resetForm();
                      }}
                    >
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
                                  <SelectValue placeholder="Select position to reveal attributes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SCOUTING_POSITIONS.map((pos) => (
                                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="age">Age</Label>
                              <Input
                                id="age"
                                type="number"
                                value={draftForm.age}
                                onChange={(e) => setDraftForm({ ...draftForm, age: e.target.value })}
                                placeholder="Age"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nationality">Nationality</Label>
                              <Input
                                id="nationality"
                                value={draftForm.nationality}
                                onChange={(e) => setDraftForm({ ...draftForm, nationality: e.target.value })}
                                placeholder="Nationality"
                              />
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

                      {/* Position Required Message */}
                      {!draftForm.position && (
                        <Card className="border-dashed border-2 border-muted-foreground/30">
                          <CardContent className="py-12 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Select a Position</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              Choose the player's position above to reveal the detailed attribute 
                              evaluation form with position-specific skills and grades.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Skill Evaluations - Only show when position is selected */}
                      {draftForm.position && draftForm.skill_evaluations.length > 0 && (
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

                      {/* Analysis Section - Only show when position is selected */}
                      {draftForm.position && (
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
                            <div className="space-y-2">
                              <Label htmlFor="recommendation">Recommendation</Label>
                              <Textarea
                                id="recommendation"
                                value={draftForm.recommendation}
                                onChange={(e) => setDraftForm({ ...draftForm, recommendation: e.target.value })}
                                placeholder="Your recommendation for the club..."
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="video_url">Video URL (optional)</Label>
                              <Input
                                id="video_url"
                                type="url"
                                value={draftForm.video_url}
                                onChange={(e) => setDraftForm({ ...draftForm, video_url: e.target.value })}
                                placeholder="https://..."
                              />
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
                          disabled={submitReportMutation.isPending || !draftForm.player_name || !draftForm.position}
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

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No messages yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  messages.map((message) => (
                    <Card key={message.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{message.title}</CardTitle>
                          {message.priority === "high" && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-500 rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                        <CardDescription>
                          {new Date(message.created_at).toLocaleDateString()} at{" "}
                          {new Date(message.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Potential;
