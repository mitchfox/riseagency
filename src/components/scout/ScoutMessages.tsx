import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, Star, ArrowRight, Lightbulb, User } from "lucide-react";

interface ReportFeedback {
  id: string;
  report_id: string;
  player_feedback: string | null;
  next_steps: string | null;
  future_reference_notes: string | null;
  is_exclusive: boolean;
  commission_percentage: number;
  staff_notes: string | null;
  created_by: string | null;
  read_by_scout: boolean;
  created_at: string;
  report?: {
    player_name: string;
  };
}

interface ScoutMessagesProps {
  scoutId: string;
}

export const ScoutMessages = ({ scoutId }: ScoutMessagesProps) => {
  const [feedback, setFeedback] = useState<ReportFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, [scoutId]);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("scout_report_feedback")
        .select(`
          *,
          scouting_reports!report_id (player_name)
        `)
        .eq("scout_id", scoutId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map the data to include report info
      const mappedData = (data || []).map(item => ({
        ...item,
        report: item.scouting_reports
      }));
      
      setFeedback(mappedData);

      // Mark unread feedback as read
      const unreadIds = (data || []).filter(f => !f.read_by_scout).map(f => f.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("scout_report_feedback")
          .update({ read_by_scout: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages from Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback from Staff
          {feedback.filter(f => !f.read_by_scout).length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {feedback.filter(f => !f.read_by_scout).length} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedback.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No feedback yet. Check back after staff reviews your reports.
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-4">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    !item.read_by_scout ? "border-primary/50 bg-primary/5" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {item.report?.player_name || "Report"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd MMM yyyy, HH:mm")}
                        {item.created_by && ` • ${item.created_by}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.is_exclusive && (
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                          <Star className="h-3 w-3 mr-1" />
                          Exclusive ({item.commission_percentage}%)
                        </Badge>
                      )}
                      {!item.is_exclusive && item.commission_percentage > 0 && (
                        <Badge variant="outline">
                          Contributor ({item.commission_percentage}%)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {item.player_feedback && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" /> Player Assessment
                        </p>
                        <p className="text-sm">{item.player_feedback}</p>
                      </div>
                    )}

                    {item.next_steps && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <ArrowRight className="h-3 w-3" /> Next Steps
                        </p>
                        <p className="text-sm">{item.next_steps}</p>
                      </div>
                    )}

                    {item.future_reference_notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3 w-3" /> For Future Reference
                        </p>
                        <p className="text-sm">{item.future_reference_notes}</p>
                      </div>
                    )}

                    {item.staff_notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground">{item.staff_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
