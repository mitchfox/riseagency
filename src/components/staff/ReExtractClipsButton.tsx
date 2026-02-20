import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trimAndUploadClip } from "@/lib/clientClipExtractor";

interface Props {
  analysisId: string;
  onComplete: () => void;
}

/**
 * Temporary migration button: re-extracts legacy clips (full video URLs with #t= fragments)
 * into small independent trimmed files in the clips/ prefix.
 */
export const ReExtractClipsButton = ({ analysisId, onComplete }: Props) => {
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState("");

  const handleReExtract = async () => {
    setExtracting(true);
    try {
      // Fetch all actions for this report that have video_url NOT containing /clips/
      const { data: actions, error } = await supabase
        .from("performance_report_actions")
        .select("id, video_url, action_number")
        .eq("analysis_id", analysisId)
        .not("video_url", "is", null)
        .order("action_number");

      if (error) throw error;

      const legacyActions = (actions || []).filter(
        (a) => a.video_url && !a.video_url.includes("/clips/")
      );

      if (legacyActions.length === 0) {
        toast.info("All clips are already extracted");
        setExtracting(false);
        return;
      }

      let success = 0;
      let failed = 0;

      for (let i = 0; i < legacyActions.length; i++) {
        const action = legacyActions[i];
        setProgress(`Extracting clip ${i + 1}/${legacyActions.length}...`);

        try {
          // Parse #t=start,end from the URL
          const url = action.video_url!;
          const match = url.match(/#t=([\d.]+),([\d.]+)/);
          if (!match) {
            // No time fragment - skip, cannot determine boundaries
            console.warn(`Action #${action.action_number}: no #t= fragment, skipping`);
            failed++;
            continue;
          }

          const start = parseFloat(match[1]);
          const end = parseFloat(match[2]);
          const clipId = action.id!;

          const newUrl = await trimAndUploadClip(
            url,
            clipId,
            start,
            end,
            (msg) => setProgress(`Clip ${i + 1}/${legacyActions.length}: ${msg}`)
          );

          // Update the action's video_url to the new clean URL
          const { error: updateError } = await supabase
            .from("performance_report_actions")
            .update({ video_url: newUrl })
            .eq("id", action.id!);

          if (updateError) throw updateError;
          success++;
        } catch (err) {
          console.error(`Failed to re-extract clip for action #${action.action_number}:`, err);
          failed++;
        }
      }

      toast.success(`Re-extracted ${success} clips${failed > 0 ? `, ${failed} failed` : ""}`);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Re-extraction failed");
    } finally {
      setExtracting(false);
      setProgress("");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReExtract}
      disabled={extracting}
      className="gap-1.5"
    >
      {extracting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {progress || "Extracting..."}
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          Re-extract clips
        </>
      )}
    </Button>
  );
};
