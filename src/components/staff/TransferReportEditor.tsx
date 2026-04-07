import { toast } from "sonner";
import { ExternalLink, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransferReportEditorProps {
  reportId: string;
  onClose: () => void;
}

// The editor is now built into the TransferReportView itself.
// This component simply redirects staff to the live report where they can edit inline.
export const TransferReportEditor = ({ reportId, onClose }: TransferReportEditorProps) => {
  // Open the report in a new tab — the view has a built-in edit mode for staff
  const openReport = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from('transfer_reports').select('slug').eq('id', reportId).single();
    if (data?.slug) {
      window.open(`/transfer-report/${data.slug}`, '_blank');
    } else {
      toast.error('Could not find report');
    }
    onClose();
  };

  // Auto-open on mount
  openReport();

  return null;
};
