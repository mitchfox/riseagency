import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Link as LinkIcon, Unlink, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

interface PlayerScoutingManagementProps {
  playerId: string;
  playerName: string;
}

export const PlayerScoutingManagement = ({ playerId, playerName }: PlayerScoutingManagementProps) => {
  const [scoutingReports, setScoutingReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleViewReport = (reportId: string) => {
    window.open(`/staff?section=recruitment&view=scouting&report=${reportId}`, '_blank');
  };

  if (loading) {
    return <div className="text-center py-8">Loading scouting reports...</div>;
  }

  return (
    <Card>
      <CardHeader className="px-3 md:px-6 py-3 md:py-4">
        <CardTitle className="text-lg">Linked Scouting Reports</CardTitle>
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
            <Button
              variant="outline"
              onClick={() => window.open('/staff?section=recruitment&view=scouting', '_blank')}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Go to Scouting Centre to link reports
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
