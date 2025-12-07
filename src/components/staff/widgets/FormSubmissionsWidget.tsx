import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Users, Briefcase, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormSubmission {
  id: string;
  form_type: string;
  data: any;
  created_at: string;
}

export const FormSubmissionsWidget = () => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setSubmissions(data);
      }
      setLoading(false);
    };
    fetchSubmissions();
  }, []);

  const getFormIcon = (type: string) => {
    switch (type) {
      case "contact": return <Mail className="h-3 w-3" />;
      case "join": return <Users className="h-3 w-3" />;
      case "trial": return <Briefcase className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getFormTypeLabel = (type: string) => {
    switch (type) {
      case "contact": return "Contact";
      case "join": return "Join Request";
      case "trial": return "Trial Request";
      case "scout": return "Scout Application";
      default: return type;
    }
  };

  const getSubmissionName = (submission: FormSubmission) => {
    const data = submission.data as any;
    return data?.name || data?.fullName || data?.firstName || "Unknown";
  };

  const getSubmissionEmail = (submission: FormSubmission) => {
    const data = submission.data as any;
    return data?.email || "No email";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-4">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No form submissions yet
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium">Recent Submissions</span>
        <Badge variant="outline" className="text-[10px]">{submissions.length}</Badge>
      </div>

      <div className="space-y-1.5">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => setSelectedSubmission(submission)}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1 rounded bg-primary/10 text-primary">
                {getFormIcon(submission.form_type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{getSubmissionName(submission)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{getSubmissionEmail(submission)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-[9px]">
                {getFormTypeLabel(submission.form_type)}
              </Badge>
              <Eye className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSubmission && getFormIcon(selectedSubmission.form_type)}
              {selectedSubmission && getFormTypeLabel(selectedSubmission.form_type)} Submission
            </DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Submitted {format(new Date(selectedSubmission.created_at), "PPp")}
                </div>
                <div className="space-y-2">
                  {Object.entries(selectedSubmission.data as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="space-y-0.5">
                      <p className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
