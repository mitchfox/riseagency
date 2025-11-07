import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Users, MessageSquare, Calendar, Send } from "lucide-react";
import { EmailResponseDialog } from "./EmailResponseDialog";

interface FormSubmission {
  id: string;
  form_type: string;
  data: any;
  created_at: string;
}

export const FormSubmissionsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load form submissions");
    } finally {
      setLoading(false);
    }
  };

  const getFormIcon = (formType: string) => {
    switch (formType) {
      case "work-with-us":
        return <Users className="w-4 h-4" />;
      case "declare-interest":
        return <MessageSquare className="w-4 h-4" />;
      case "representation":
        return <Mail className="w-4 h-4" />;
      case "request-scout":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getFormTypeLabel = (formType: string) => {
    switch (formType) {
      case "work-with-us":
        return "Work With Us";
      case "declare-interest":
        return "Declare Interest";
      case "representation":
        return "Representation Request";
      case "request-scout":
        return "Scout Request";
      default:
        return formType;
    }
  };

  const getSubmissionEmail = (submission: FormSubmission) => {
    return submission.data.email || null;
  };

  const getSubmissionName = (submission: FormSubmission) => {
    return submission.data.name || "Recipient";
  };

  const handleSendEmail = (submission: FormSubmission) => {
    const email = getSubmissionEmail(submission);
    if (!email) {
      toast.error("No email address found for this submission");
      return;
    }
    setSelectedSubmission(submission);
    setEmailDialogOpen(true);
  };

  const renderSubmissionDetails = (submission: FormSubmission) => {
    const data = submission.data;

    switch (submission.form_type) {
      case "work-with-us":
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Role:</strong> {data.role}</div>
            <div><strong>Name:</strong> {data.name}</div>
            <div><strong>Email:</strong> {data.email}</div>
            {data.whatsapp && <div><strong>WhatsApp:</strong> {data.whatsapp}</div>}
            {data.currentClub && <div><strong>Current Club:</strong> {data.currentClub}</div>}
            {data.position && <div><strong>Position:</strong> {data.position}</div>}
            {data.clubName && <div><strong>Club Name:</strong> {data.clubName}</div>}
            {data.location && <div><strong>Location:</strong> {data.location}</div>}
            {data.company && <div><strong>Company:</strong> {data.company}</div>}
            {data.playerName && <div><strong>Player Name:</strong> {data.playerName}</div>}
            {data.organization && <div><strong>Organization:</strong> {data.organization}</div>}
            {data.message && <div><strong>Message:</strong> {data.message}</div>}
          </div>
        );

      case "declare-interest":
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Player:</strong> {data.playerName}</div>
            <div><strong>Name:</strong> {data.name}</div>
            <div><strong>Role:</strong> {data.role}</div>
            <div><strong>Club/Company:</strong> {data.clubOrCompany}</div>
            <div><strong>Request:</strong> {data.request}</div>
          </div>
        );

      case "representation":
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {data.name}</div>
            <div><strong>Phone:</strong> {data.phone}</div>
            {data.email && <div><strong>Email:</strong> {data.email}</div>}
            <div><strong>Current Club:</strong> {data.currentClub}</div>
            {data.position && <div><strong>Position:</strong> {data.position}</div>}
            {data.message && <div><strong>Message:</strong> {data.message}</div>}
          </div>
        );

      case "request-scout":
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {data.name}</div>
            <div><strong>Email:</strong> {data.email}</div>
            {data.phone && <div><strong>Phone:</strong> {data.phone}</div>}
            <div><strong>Team:</strong> {data.team}</div>
            <div><strong>Match Date:</strong> {data.matchDate}</div>
            <div><strong>Location:</strong> {data.location}</div>
            {data.message && <div><strong>Additional Info:</strong> {data.message}</div>}
          </div>
        );

      default:
        return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  const groupedSubmissions = submissions.reduce((acc, submission) => {
    if (!acc[submission.form_type]) {
      acc[submission.form_type] = [];
    }
    acc[submission.form_type].push(submission);
    return acc;
  }, {} as Record<string, FormSubmission[]>);

  if (loading) {
    return <div className="text-center p-8">Loading submissions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-2xl font-bebas uppercase tracking-wider">
          Form Submissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="mb-4 w-max sm:w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({submissions.length})
              </TabsTrigger>
              {Object.keys(groupedSubmissions).map((formType) => (
                <TabsTrigger key={formType} value={formType} className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">{getFormTypeLabel(formType)}</span>
                  <span className="sm:hidden">{getFormTypeLabel(formType).split(' ')[0]}</span>
                  {' '}({groupedSubmissions[formType].length})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No form submissions yet
              </p>
            ) : (
              submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {getFormIcon(submission.form_type)}
                        <Badge variant="secondary" className="text-xs">
                          {getFormTypeLabel(submission.form_type)}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {getSubmissionEmail(submission) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail(submission)}
                            className="gap-2 w-full sm:w-auto"
                          >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Send Email</span>
                            <span className="sm:hidden">Email</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderSubmissionDetails(submission)}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {Object.entries(groupedSubmissions).map(([formType, formSubmissions]) => (
            <TabsContent key={formType} value={formType} className="space-y-4">
              {formSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <Badge variant="secondary" className="text-xs w-fit">
                        {getFormTypeLabel(submission.form_type)}
                      </Badge>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {getSubmissionEmail(submission) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail(submission)}
                            className="gap-2 w-full sm:w-auto"
                          >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Send Email</span>
                            <span className="sm:hidden">Email</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderSubmissionDetails(submission)}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {selectedSubmission && (
        <EmailResponseDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          recipientEmail={getSubmissionEmail(selectedSubmission) || ""}
          recipientName={getSubmissionName(selectedSubmission)}
          submissionType={getFormTypeLabel(selectedSubmission.form_type)}
        />
      )}
    </Card>
  );
};
