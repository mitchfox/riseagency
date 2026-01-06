import { useState } from "react";
import { useScoutAuth } from "@/hooks/useScoutAuth";
import { PageLoading } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Target, TrendingUp, Users, FileText, Eye, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScoutReportView } from "@/components/scout/ScoutReportView";
import { ScoutMessages } from "@/components/scout/ScoutMessages";

const ScoutPortal = () => {
  const { scout, loading, signOut } = useScoutAuth();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["scout-reports", scout?.id],
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

  if (loading) {
    return <PageLoading />;
  }

  const statusCounts = {
    recommended: reports.filter(r => r.status === "recommended" || r.status === "recruiting").length,
    monitoring: reports.filter(r => r.status === "monitoring" || r.status === "scouting_further").length,
    pending: reports.filter(r => r.status === "pending").length,
    rejected: reports.filter(r => r.status === "rejected" || r.status === "no_interest").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bebas tracking-wider">Scout Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {scout?.name}</p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recruiting</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.recommended}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful Signings</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scout?.successful_signings || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scout?.commission_rate || 0}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              My Reports
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>Click on a report to view full details</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reports submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => { setSelectedReport(report); setViewDialogOpen(true); }}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold">{report.player_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {report.position} • {report.current_club}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            report.status === "recruiting" ? "bg-green-500/10 text-green-500" :
                            report.status === "scouting_further" ? "bg-blue-500/10 text-blue-500" :
                            report.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {report.status}
                          </span>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            {scout?.id && <ScoutMessages scoutId={scout.id} />}
          </TabsContent>
        </Tabs>
      </main>

      <ScoutReportView
        report={selectedReport}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
};

export default ScoutPortal;
