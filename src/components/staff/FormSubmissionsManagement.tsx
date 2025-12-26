import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Users, MessageSquare, Calendar, Send, MessageCircle } from "lucide-react";
import { EmailResponseDialog } from "./EmailResponseDialog";

interface FormSubmission {
  id: string;
  form_type: string;
  data: any;
  created_at: string;
}

// Map of common club countries for phone number formatting
const clubCountryCodes: Record<string, string> = {
  // UK
  "arsenal": "+44", "chelsea": "+44", "manchester united": "+44", "manchester city": "+44",
  "liverpool": "+44", "tottenham": "+44", "west ham": "+44", "newcastle": "+44",
  "brighton": "+44", "aston villa": "+44", "everton": "+44", "fulham": "+44",
  "crystal palace": "+44", "wolves": "+44", "leicester": "+44", "leeds": "+44",
  "nottingham forest": "+44", "bournemouth": "+44", "brentford": "+44",
  // Spain
  "barcelona": "+34", "real madrid": "+34", "atletico madrid": "+34", "sevilla": "+34",
  "valencia": "+34", "villarreal": "+34", "real sociedad": "+34", "athletic bilbao": "+34",
  // Germany
  "bayern munich": "+49", "borussia dortmund": "+49", "rb leipzig": "+49", "bayer leverkusen": "+49",
  // Italy
  "juventus": "+39", "ac milan": "+39", "inter milan": "+39", "roma": "+39", "napoli": "+39", "lazio": "+39",
  // France
  "psg": "+33", "paris saint-germain": "+33", "marseille": "+33", "lyon": "+33", "monaco": "+33",
  // Portugal
  "benfica": "+351", "porto": "+351", "sporting": "+351",
  // Netherlands
  "ajax": "+31", "psv": "+31", "feyenoord": "+31",
  // Belgium
  "club brugge": "+32", "anderlecht": "+32",
  // Turkey
  "galatasaray": "+90", "fenerbahce": "+90", "besiktas": "+90",
  // Russia
  "spartak moscow": "+7", "cska moscow": "+7", "zenit": "+7",
  // USA
  "la galaxy": "+1", "inter miami": "+1",
  // Brazil
  "flamengo": "+55", "palmeiras": "+55", "santos": "+55", "sao paulo": "+55",
  // Argentina
  "boca juniors": "+54", "river plate": "+54",
};

// Format phone number for WhatsApp link
const formatPhoneForWhatsApp = (phone: string, currentClub?: string): string => {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // If already has country code (starts with +), use as-is
  if (cleaned.startsWith("+")) {
    return cleaned.replace("+", "");
  }
  
  // If starts with 00, replace with +
  if (cleaned.startsWith("00")) {
    return cleaned.substring(2);
  }
  
  // Try to infer country code from club
  if (currentClub) {
    const clubLower = currentClub.toLowerCase();
    for (const [clubName, countryCode] of Object.entries(clubCountryCodes)) {
      if (clubLower.includes(clubName)) {
        // Remove leading 0 if present (common in UK numbers)
        if (cleaned.startsWith("0")) {
          cleaned = cleaned.substring(1);
        }
        return countryCode.replace("+", "") + cleaned;
      }
    }
  }
  
  // Default: assume UK if starts with 0
  if (cleaned.startsWith("0")) {
    return "44" + cleaned.substring(1);
  }
  
  return cleaned;
};

// Render clickable WhatsApp phone link
const PhoneWhatsAppLink = ({ phone, currentClub }: { phone: string; currentClub?: string }) => {
  const formattedPhone = formatPhoneForWhatsApp(phone, currentClub);
  const whatsappUrl = `https://wa.me/${formattedPhone}`;
  
  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {phone}
    </a>
  );
};

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
            {data.whatsapp && (
              <div>
                <strong>WhatsApp:</strong>{" "}
                <PhoneWhatsAppLink phone={data.whatsapp} currentClub={data.currentClub || data.clubName} />
              </div>
            )}
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
            <div>
              <strong>Phone:</strong>{" "}
              <PhoneWhatsAppLink phone={data.phone} currentClub={data.currentClub} />
            </div>
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
            {data.phone && (
              <div>
                <strong>Phone:</strong>{" "}
                <PhoneWhatsAppLink phone={data.phone} currentClub={data.team} />
              </div>
            )}
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
