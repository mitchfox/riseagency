import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import { calculateOverallGrade, calculateDomainGrade, GRADE_VALUES } from "@/data/scoutingSkills";

interface SkillEval {
  domain: string;
  skill_name: string;
  description?: string;
  grade: string;
  notes: string[];
}

interface ScoutingReport {
  id: string;
  player_name: string;
  scouting_date: string;
  position: string | null;
  skill_evaluations: SkillEval[] | null;
  auto_generated_review: string | null;
  rise_report_url: string | null;
}

interface PlayerScoutingReportsProps {
  playerId: string;
  playerName: string;
  embedded?: boolean;
}

const GRADE_COLOURS: Record<string, string> = {
  'A+': 'bg-green-600 text-white',
  'A': 'bg-green-500 text-white',
  'A-': 'bg-green-400 text-white',
  'B+': 'bg-emerald-400 text-white',
  'B': 'bg-yellow-500 text-white',
  'B-': 'bg-yellow-400 text-black',
  'C+': 'bg-orange-400 text-white',
  'C': 'bg-orange-500 text-white',
  'C-': 'bg-red-400 text-white',
  'D+': 'bg-red-500 text-white',
  'D': 'bg-red-600 text-white',
  'D-': 'bg-red-700 text-white',
};

export const PlayerScoutingReports = ({ playerId, playerName, embedded = false }: PlayerScoutingReportsProps) => {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("scouting_reports")
          .select("id, player_name, scouting_date, position, skill_evaluations, auto_generated_review, rise_report_url")
          .eq("linked_player_id", playerId)
          .order("scouting_date", { ascending: false });
        if (error) throw error;
        setReports((data || []).map(r => ({
          ...r,
          skill_evaluations: r.skill_evaluations as unknown as SkillEval[] | null,
        })));
      } catch (error) {
        console.error("Error fetching scouting reports:", error);
        toast.error("Failed to load scouting reports");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [playerId]);

  if (loading) {
    return (
      <Card className={embedded ? "rounded-none border-0" : "w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0"}>
        <CardContent className={embedded ? "px-0 py-8" : "container mx-auto px-4 py-8"}>
          <p className="text-center text-muted-foreground">Loading scouting reports...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={embedded ? "rounded-none border-0" : "w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] rounded-none border-x-0 border-t-[2px] border-t-[hsl(43,49%,61%)] border-b-0"}>
      <CardHeader marble>
        <div className={embedded ? "" : "container mx-auto px-4"}>
          <CardTitle className="font-heading tracking-tight">Scouting Reports</CardTitle>
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 space-y-4 py-6" : "container mx-auto px-4 space-y-4 py-6"}>
        {reports.length === 0 ? (
          <div className="py-8">
            <p className="text-center text-muted-foreground">No scouting reports available yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => {
              const evals = report.skill_evaluations || [];
              const overallGrade = calculateOverallGrade(evals as any);
              const domains = ['Physical', 'Mental', 'Technical', 'Tactical'];

              return (
                <div key={report.id} className="border rounded-lg overflow-hidden bg-card">
                  {/* Header */}
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{report.player_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.scouting_date), "d MMMM yyyy")}
                        {report.position && ` · ${report.position}`}
                      </p>
                    </div>
                    {overallGrade && (
                      <span className={`text-lg font-bold px-3 py-1 rounded ${GRADE_COLOURS[overallGrade] || 'bg-muted-foreground text-white'}`}>
                        {overallGrade}
                      </span>
                    )}
                  </div>

                  {/* Domain grades */}
                  {evals.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                      {domains.map(domain => {
                        const domainGrade = calculateDomainGrade(evals as any, domain);
                        return (
                          <div key={domain} className="bg-card px-3 py-2 text-center">
                            <p className="text-xs text-muted-foreground">{domain}</p>
                            <p className={`text-sm font-bold ${domainGrade ? '' : 'text-muted-foreground'}`}>
                              {domainGrade || '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Skill evaluations */}
                  {evals.length > 0 && (
                    <div className="p-4 space-y-4">
                      {domains.map(domain => {
                        const domainEvals = evals.filter(e => e.domain === domain && e.grade);
                        if (domainEvals.length === 0) return null;
                        return (
                          <div key={domain}>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{domain}</h4>
                            <div className="space-y-2">
                              {domainEvals.map((ev, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${GRADE_COLOURS[ev.grade] || 'bg-muted text-foreground'}`}>
                                    {ev.grade}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{ev.skill_name}</p>
                                    {ev.notes?.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{ev.notes.join(' ')}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Review */}
                  {report.auto_generated_review && (
                    <div className="border-t px-4 py-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Evaluation</h4>
                      <p className="text-sm leading-relaxed">{report.auto_generated_review}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
