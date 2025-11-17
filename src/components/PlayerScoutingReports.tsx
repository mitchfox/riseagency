import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScoutingReport {
  id: string;
  player_name: string;
  scouting_date: string;
  overall_rating: number | null;
  position: string | null;
  current_club: string | null;
  nationality: string | null;
  scout_name: string | null;
  recommendation: string | null;
  summary: string | null;
  strengths: string | null;
  weaknesses: string | null;
}

interface PlayerScoutingReportsProps {
  playerId: string;
  playerName: string;
}

export const PlayerScoutingReports = ({ playerId, playerName }: PlayerScoutingReportsProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [playerId]);

  const fetchReports = async () => {
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
      toast.error("Failed to load scouting reports");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
        <CardContent className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading scouting reports...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0">
      <CardHeader marble>
        <div className="container mx-auto px-4">
          <CardTitle className="font-heading tracking-tight">
            Scouting Reports
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="container mx-auto px-4 space-y-4">
        {reports.length === 0 ? (
          <div className="py-8">
            <p className="text-center text-muted-foreground">
              No scouting reports available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 hover:border-primary transition-colors bg-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{report.player_name}</h3>
                        {report.overall_rating && (
                          <span className="text-sm px-2 py-1 rounded bg-primary/20 text-primary font-semibold">
                            {report.overall_rating}/10
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {report.position && <span>Position: {report.position}</span>}
                          {report.position && report.current_club && <span>•</span>}
                          {report.current_club && <span>Club: {report.current_club}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Date: {format(new Date(report.scouting_date), "MMM dd, yyyy")}</span>
                          {report.scout_name && (
                            <>
                              <span>•</span>
                              <span>Scout: {report.scout_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {report.summary && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground line-clamp-3">{report.summary}</p>
                    </div>
                  )}

                  {report.recommendation && (
                    <div className="pt-2">
                      <div className="text-sm">
                        <span className="font-medium">Recommendation:</span>{" "}
                        <span className="text-muted-foreground">{report.recommendation}</span>
                      </div>
                    </div>
                  )}

                  {(report.strengths || report.weaknesses) && (
                    <div className="pt-2 grid md:grid-cols-2 gap-3">
                      {report.strengths && (
                        <div className="text-sm">
                          <span className="font-medium text-green-500">Strengths:</span>
                          <p className="text-muted-foreground mt-1">{report.strengths}</p>
                        </div>
                      )}
                      {report.weaknesses && (
                        <div className="text-sm">
                          <span className="font-medium text-orange-500">Weaknesses:</span>
                          <p className="text-muted-foreground mt-1">{report.weaknesses}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
