import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";

interface PlayerTransferStatusProps {
  playerId: string;
}

const STATUS_LABELS: Record<string, { label: string; description: string }> = {
  actively_marketed: { 
    label: "Actively Marketed", 
    description: "We are actively promoting your profile to clubs and agents." 
  },
  open_to_offers: { 
    label: "Open to Offers", 
    description: "Your profile is available for club inquiries." 
  },
  not_available: { 
    label: "Not Available", 
    description: "You are currently not being marketed for transfers." 
  },
  contract_talks: { 
    label: "In Contract Talks", 
    description: "Negotiations are ongoing with interested parties." 
  },
  loan_available: { 
    label: "Loan Available", 
    description: "You are being marketed for loan opportunities." 
  },
};

const PRIORITY_LABELS: Record<string, { label: string; description: string }> = {
  high: { 
    label: "High Priority", 
    description: "Your case is receiving maximum attention." 
  },
  standard: { 
    label: "Standard", 
    description: "Regular attention and updates." 
  },
  low: { 
    label: "Low Priority", 
    description: "Routine monitoring and updates." 
  },
  monitoring: { 
    label: "Monitoring Only", 
    description: "We are keeping an eye on opportunities for you." 
  },
};

export const PlayerTransferStatus = ({ playerId }: PlayerTransferStatusProps) => {
  const [status, setStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [playerId]);

  const fetchStatus = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("transfer_status, transfer_priority")
      .eq("id", playerId)
      .single();

    if (!error && data) {
      setStatus(data.transfer_status || "actively_marketed");
      setPriority(data.transfer_priority || "standard");
    }
    setLoading(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "actively_marketed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "open_to_offers": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "not_available": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "contract_talks": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "loan_available": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "standard": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "monitoring": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusInfo = STATUS_LABELS[status || "actively_marketed"] || STATUS_LABELS.actively_marketed;
  const priorityInfo = PRIORITY_LABELS[priority || "standard"] || PRIORITY_LABELS.standard;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Transfer Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-6 border rounded-lg bg-muted/30">
              <Badge variant="outline" className={`text-lg px-4 py-2 mb-3 ${getStatusBadgeClass(status || "actively_marketed")}`}>
                {statusInfo.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {statusInfo.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Market Position</p>
                <Badge variant="outline" className={getStatusBadgeClass(status || "actively_marketed")}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Agent Activity</p>
                <Badge variant="outline" className={getPriorityBadgeClass(priority || "standard")}>
                  {priorityInfo.label}
                </Badge>
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>{priorityInfo.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
