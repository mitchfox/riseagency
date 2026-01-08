import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Video, ExternalLink, Star, Copy } from "lucide-react";

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
  scouting_date: string | null;
  location: string | null;
  competition: string | null;
  match_context: string | null;
  status: string;
  summary: string | null;
  strengths: string | null;
  weaknesses: string | null;
  skill_evaluations: any;
  video_url: string | null;
  full_match_url: string | null;
  rise_report_url?: string | null;
  additional_documents?: any[];
  additional_info?: string | null;
  contribution_type: string | null;
  created_at: string;
  profile_image_url: string | null;
}

interface ScoutReportViewProps {
  report: ScoutingReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (report: ScoutingReport) => void;
}

export const ScoutReportView = ({ report, open, onOpenChange, onEdit }: ScoutReportViewProps) => {
  if (!report) return null;

  const skillEvaluations = report.skill_evaluations || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {report.profile_image_url && (
                <img src={report.profile_image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div>
                <span className="text-xl">{report.player_name}</span>
                <p className="text-sm font-normal text-muted-foreground">
                  {report.position} • {report.current_club}
                </p>
              </div>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(report)}>
                <Copy className="h-4 w-4 mr-2" />
                Provide Update
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Age</span>
                  <p className="font-medium">{report.age || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Nationality</span>
                  <p className="font-medium">{report.nationality || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Height</span>
                  <p className="font-medium">{report.height_cm ? `${report.height_cm}cm` : "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Preferred Foot</span>
                  <p className="font-medium">{report.preferred_foot || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Scouting Date</span>
                  <p className="font-medium">
                    {report.scouting_date ? format(new Date(report.scouting_date), "dd MMMM yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Location</span>
                  <p className="font-medium">{report.location || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Competition</span>
                  <p className="font-medium">{report.competition || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Match Context</span>
                  <p className="font-medium">{report.match_context || "—"}</p>
                </div>
              </div>

              {/* Video Links Section - Always show */}
              <div className="pt-4 space-y-2">
                <h4 className="text-sm font-medium mb-2">Match Videos</h4>
                {report.video_url ? (
                  <a
                    href={report.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <Video className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Highlight Video</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No highlight video attached</p>
                  </div>
                )}
                {report.full_match_url ? (
                  <a
                    href={report.full_match_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <Video className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Full Match</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No full match video attached</p>
                  </div>
                )}
              </div>

              {report.summary && (
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.summary}</p>
                </div>
              )}

              {report.additional_info && (
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Additional Information</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.additional_info}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4">
                <Badge variant={report.status === "recruiting" ? "default" : "secondary"}>
                  {report.status}
                </Badge>
                {report.contribution_type && (
                  <Badge variant="outline" className={
                    report.contribution_type === "exclusive" 
                      ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                      : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                  }>
                    {report.contribution_type === "exclusive" ? (
                      <><Star className="h-3 w-3 mr-1" />Exclusive</>
                    ) : report.contribution_type}
                  </Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="evaluation" className="space-y-4 pt-4">
              {report.strengths && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                    <p className="text-sm whitespace-pre-wrap">{report.strengths}</p>
                  </CardContent>
                </Card>
              )}
              {report.weaknesses && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium text-red-600 mb-2">Weaknesses</h4>
                    <p className="text-sm whitespace-pre-wrap">{report.weaknesses}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="skills" className="pt-4">
              {skillEvaluations.length > 0 ? (
                <div className="grid gap-2">
                  {skillEvaluations.map((skill: any, index: number) => (
                    <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{skill.skill}</span>
                          <Badge variant="outline" className="text-xs">{skill.rating}</Badge>
                        </div>
                        {skill.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{skill.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No skill evaluations recorded</p>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 pt-4">
              {report.rise_report_url && (
                <a
                  href={report.rise_report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">RISE Report</p>
                    <p className="text-sm text-muted-foreground">View full scouting report</p>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              {report.video_url && (
                <a
                  href={report.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <Video className="h-8 w-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">Highlight Video</p>
                    <p className="text-sm text-muted-foreground">Watch player footage</p>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              {report.full_match_url && (
                <a
                  href={report.full_match_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <Video className="h-8 w-8 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Full Match</p>
                    <p className="text-sm text-muted-foreground">Watch complete match</p>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              {report.additional_documents && report.additional_documents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Additional Documents</h4>
                  {report.additional_documents.map((doc: any, index: number) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">{doc.name || `Document ${index + 1}`}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  ))}
                </div>
              )}

              {!report.rise_report_url && !report.video_url && !report.full_match_url && 
               (!report.additional_documents || report.additional_documents.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No documents attached</p>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
