import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Star } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ScoutingReport {
  id: string;
  player_name: string;
  scouting_date: string;
  overall_rating: number | null;
  position: string | null;
  current_club: string | null;
  scout_name: string | null;
  status: string;
  summary: string | null;
  recommendation: string | null;
}

interface PlayerScoutingReportsProps {
  playerId: string;
  playerName: string;
}

export const PlayerScoutingReports = ({ playerId, playerName }: PlayerScoutingReportsProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching scouting reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-300 border-green-500/50";
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "rejected":
        return "bg-red-500/20 text-red-300 border-red-500/50";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading scouting reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No scouting reports available for {playerName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{report.player_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{format(new Date(report.scouting_date), "MMM d, yyyy")}</span>
                  {report.scout_name && (
                    <>
                      <span>•</span>
                      <span>Scout: {report.scout_name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.overall_rating && (
                  <div className="flex items-center gap-1 text-primary">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-semibold">{report.overall_rating}/10</span>
                  </div>
                )}
                <Badge className={getStatusColor(report.status)}>
                  {report.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              {report.position && (
                <div>
                  <span className="text-muted-foreground">Position:</span>{" "}
                  <span className="font-medium">{report.position}</span>
                </div>
              )}
              {report.current_club && (
                <div>
                  <span className="text-muted-foreground">Club:</span>{" "}
                  <span className="font-medium">{report.current_club}</span>
                </div>
              )}
            </div>
            
            {report.summary && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Summary:</p>
                <p className="line-clamp-2">{report.summary}</p>
              </div>
            )}

            {report.recommendation && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Recommendation:</p>
                <p className="line-clamp-2">{report.recommendation}</p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/staff?section=scoutingcentre&report=${report.id}`)}
              className="w-full mt-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Report
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
