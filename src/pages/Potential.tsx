import { useState } from "react";
import { useScoutAuth } from "@/hooks/useScoutAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Plus, Users, MessageSquare, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Potential = () => {
  const { scout, loading, signOut } = useScoutAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewReportForm, setShowNewReportForm] = useState(false);

  // Form state for new submission
  const [newReport, setNewReport] = useState({
    player_name: "",
    position: "",
    age: "",
    current_club: "",
    nationality: "",
    competition: "",
    overall_rating: "",
    technical_rating: "",
    physical_rating: "",
    tactical_rating: "",
    mental_rating: "",
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

  // Submit new report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const { error } = await supabase
        .from("scouting_reports")
        .insert({
          ...reportData,
          scout_id: scout?.id,
          scout_name: scout?.name,
          scouting_date: new Date().toISOString().split('T')[0],
          status: "pending",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["scout-submissions"] });
      setShowNewReportForm(false);
      setNewReport({
        player_name: "",
        position: "",
        age: "",
        current_club: "",
        nationality: "",
        competition: "",
        overall_rating: "",
        technical_rating: "",
        physical_rating: "",
        tactical_rating: "",
        mental_rating: "",
        strengths: "",
        weaknesses: "",
        summary: "",
        recommendation: "",
        video_url: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit report");
    },
  });

  const handleSubmitReport = () => {
    if (!newReport.player_name || !newReport.position) {
      toast.error("Please fill in player name and position");
      return;
    }

    const reportData = {
      ...newReport,
      age: newReport.age ? parseInt(newReport.age) : null,
      overall_rating: newReport.overall_rating ? parseFloat(newReport.overall_rating) : null,
      technical_rating: newReport.technical_rating ? parseFloat(newReport.technical_rating) : null,
      physical_rating: newReport.physical_rating ? parseFloat(newReport.physical_rating) : null,
      tactical_rating: newReport.tactical_rating ? parseFloat(newReport.tactical_rating) : null,
      mental_rating: newReport.mental_rating ? parseFloat(newReport.mental_rating) : null,
    };

    submitReportMutation.mutate(reportData);
  };

  const filteredSubmissions = submissions.filter(sub =>
    sub.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.current_club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
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
        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="submissions">
              <Users className="h-4 w-4 mr-2" />
              My Submissions
            </TabsTrigger>
            <TabsTrigger value="new-report">
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Overall</p>
                            <p className="text-lg font-bold">{report.overall_rating}/10</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Technical</p>
                            <p className="text-lg font-bold">{report.technical_rating}/10</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Physical</p>
                            <p className="text-lg font-bold">{report.physical_rating}/10</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tactical</p>
                            <p className="text-lg font-bold">{report.tactical_rating}/10</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mental</p>
                            <p className="text-lg font-bold">{report.mental_rating}/10</p>
                          </div>
                        </div>
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

          {/* New Report Tab */}
          <TabsContent value="new-report">
            <Card>
              <CardHeader>
                <CardTitle>Submit New Scouting Report</CardTitle>
                <CardDescription>
                  Fill in the details for the player you want to recommend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="player_name">Player Name *</Label>
                          <Input
                            id="player_name"
                            value={newReport.player_name}
                            onChange={(e) => setNewReport({ ...newReport, player_name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="position">Position *</Label>
                          <Select
                            value={newReport.position}
                            onValueChange={(value) => setNewReport({ ...newReport, position: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GK">Goalkeeper</SelectItem>
                              <SelectItem value="CB">Centre Back</SelectItem>
                              <SelectItem value="LB">Left Back</SelectItem>
                              <SelectItem value="RB">Right Back</SelectItem>
                              <SelectItem value="CDM">Defensive Midfielder</SelectItem>
                              <SelectItem value="CM">Central Midfielder</SelectItem>
                              <SelectItem value="CAM">Attacking Midfielder</SelectItem>
                              <SelectItem value="LW">Left Winger</SelectItem>
                              <SelectItem value="RW">Right Winger</SelectItem>
                              <SelectItem value="ST">Striker</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            type="number"
                            value={newReport.age}
                            onChange={(e) => setNewReport({ ...newReport, age: e.target.value })}
                            placeholder="Age"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationality</Label>
                          <Input
                            id="nationality"
                            value={newReport.nationality}
                            onChange={(e) => setNewReport({ ...newReport, nationality: e.target.value })}
                            placeholder="Nationality"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="current_club">Current Club</Label>
                          <Input
                            id="current_club"
                            value={newReport.current_club}
                            onChange={(e) => setNewReport({ ...newReport, current_club: e.target.value })}
                            placeholder="Club name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="competition">Competition</Label>
                          <Input
                            id="competition"
                            value={newReport.competition}
                            onChange={(e) => setNewReport({ ...newReport, competition: e.target.value })}
                            placeholder="League/Competition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Ratings (1-10)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="overall_rating">Overall</Label>
                          <Input
                            id="overall_rating"
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={newReport.overall_rating}
                            onChange={(e) => setNewReport({ ...newReport, overall_rating: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="technical_rating">Technical</Label>
                          <Input
                            id="technical_rating"
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={newReport.technical_rating}
                            onChange={(e) => setNewReport({ ...newReport, technical_rating: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="physical_rating">Physical</Label>
                          <Input
                            id="physical_rating"
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={newReport.physical_rating}
                            onChange={(e) => setNewReport({ ...newReport, physical_rating: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tactical_rating">Tactical</Label>
                          <Input
                            id="tactical_rating"
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={newReport.tactical_rating}
                            onChange={(e) => setNewReport({ ...newReport, tactical_rating: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mental_rating">Mental</Label>
                          <Input
                            id="mental_rating"
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            value={newReport.mental_rating}
                            onChange={(e) => setNewReport({ ...newReport, mental_rating: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Analysis</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="strengths">Strengths</Label>
                          <Textarea
                            id="strengths"
                            value={newReport.strengths}
                            onChange={(e) => setNewReport({ ...newReport, strengths: e.target.value })}
                            placeholder="Key strengths and attributes..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weaknesses">Weaknesses</Label>
                          <Textarea
                            id="weaknesses"
                            value={newReport.weaknesses}
                            onChange={(e) => setNewReport({ ...newReport, weaknesses: e.target.value })}
                            placeholder="Areas for improvement..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="summary">Summary</Label>
                          <Textarea
                            id="summary"
                            value={newReport.summary}
                            onChange={(e) => setNewReport({ ...newReport, summary: e.target.value })}
                            placeholder="Overall assessment..."
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recommendation">Recommendation</Label>
                          <Textarea
                            id="recommendation"
                            value={newReport.recommendation}
                            onChange={(e) => setNewReport({ ...newReport, recommendation: e.target.value })}
                            placeholder="Your recommendation for the club..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="video_url">Video URL (optional)</Label>
                          <Input
                            id="video_url"
                            type="url"
                            value={newReport.video_url}
                            onChange={(e) => setNewReport({ ...newReport, video_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmitReport}
                      disabled={submitReportMutation.isPending}
                      className="w-full"
                    >
                      {submitReportMutation.isPending ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
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
