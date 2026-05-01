import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trimAndUploadClip } from "@/lib/clientClipExtractor";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

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

      // Two categories of action:
      //  1. Legacy `#t=start,end` URLs against the original master video
      //     -> re-trim into a fresh `/clips/` MP4.
      //  2. Existing `/clips/` URLs that are stuttery (typically high-bitrate
      //     WebM produced by the client recorder) -> re-encode in place into
      //     a smooth H.264 MP4.
      const candidateActions = (actions || []).filter((a) => !!a.video_url);

      if (candidateActions.length === 0) {
        toast.info("No clips to process");
        setExtracting(false);
        return;
      }

      let success = 0;
      let failed = 0;

      for (let i = 0; i < candidateActions.length; i++) {
        const action = candidateActions[i];
        setProgress(`Processing clip ${i + 1}/${candidateActions.length}...`);

        try {
          const url = action.video_url!;
          const clipId = action.id!;
          const match = url.match(/#t=([\d.]+),([\d.]+)/);

          let newUrl: string;

          if (match) {
            // Legacy #t= URL — trim from the master video.
            const start = parseFloat(match[1]);
            const end = parseFloat(match[2]);
            newUrl = await trimAndUploadClip(
              url,
              clipId,
              start,
              end,
              (msg) => setProgress(`Clip ${i + 1}/${candidateActions.length}: ${msg}`),
            );
          } else if (url.includes("/clips/") && url.toLowerCase().endsWith(".webm")) {
            // Stuttery WebM clip — re-encode into smooth H.264 MP4.
            setProgress(`Clip ${i + 1}/${candidateActions.length}: Re-encoding to MP4...`);
            const { data, error } = await invokeEdgeFunction<{ url: string }>(
              "reencode-clip",
              { body: { sourceUrl: url, clipId } },
            );
            if (error || !data?.url) {
              throw new Error(error?.message || "Re-encode failed");
            }
            newUrl = data.url;
          } else {
            // Already a smooth /clips/ MP4 — nothing to do.
            continue;
          }

          const { error: updateError } = await supabase
            .from("performance_report_actions")
            .update({ video_url: newUrl })
            .eq("id", action.id!);

          if (updateError) throw updateError;
          success++;
        } catch (err) {
          console.error(`Failed to process clip for action #${action.action_number}:`, err);
          failed++;
        }
      }

      if (success === 0 && failed === 0) {
        toast.info("All clips are already smooth MP4");
      } else {
        toast.success(`Processed ${success} clips${failed > 0 ? `, ${failed} failed` : ""}`);
      }
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
