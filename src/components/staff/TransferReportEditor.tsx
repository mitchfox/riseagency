import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface TransferReportEditorProps {
  reportId: string;
  onClose: () => void;
}

export const TransferReportEditor = ({ reportId, onClose }: TransferReportEditorProps) => {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlug = async () => {
      const { data } = await supabase
        .from("transfer_reports")
        .select("slug")
        .eq("id", reportId)
        .single();
      if (data?.slug) {
        setSlug(data.slug);
      } else {
        toast.error("Could not find report");
        onClose();
      }
    };
    fetchSlug();
  }, [reportId, onClose]);

  if (!slug) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold">Transfer Report Editor</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/transfer-report/${slug}`, "_blank")}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in new tab
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Inline iframe showing the live report with edit mode */}
      <iframe
        src={`/transfer-report/${slug}?edit=true`}
        className="flex-1 w-full border-0"
        title="Transfer Report Preview"
      />
    </div>
  );
};
