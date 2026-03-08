import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";

interface ClipSuggestion {
  start: number;
  end: number;
  timestamp: number;
  context: string;
  word: string;
}

interface AICommentaryClipperProps {
  videoUrl: string;
  playerName: string;
  onClipsAccepted: (clips: { start: number; end: number; label: string }[]) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const AICommentaryClipper = ({ videoUrl, playerName, onClipsAccepted }: AICommentaryClipperProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [hasRun, setHasRun] = useState(false);

  const handleTranscribe = useCallback(async () => {
    setProcessing(true);
    setSuggestions([]);
    setDismissed(new Set());

    try {
      const { data, error } = await invokeEdgeFunction<{ suggestions: ClipSuggestion[] }>(
        "transcribe-commentary",
        {
          body: {
            video_url: videoUrl,
            player_name: playerName,
          },
        }
      );

      if (error) throw error;
      if (!data?.suggestions || data.suggestions.length === 0) {
        toast.info("No mentions of the player found in the commentary");
        setHasRun(true);
        setProcessing(false);
        return;
      }

      setSuggestions(data.suggestions);
      setHasRun(true);
      toast.success(`Found ${data.suggestions.length} mention${data.suggestions.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to transcribe commentary");
    }
    setProcessing(false);
  }, [videoUrl, playerName]);

  const activeSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  const handleAcceptAll = () => {
    const clips = activeSuggestions.map((s) => ({
      start: s.start,
      end: s.end,
      label: `Commentary mention - ${formatTime(s.timestamp)} "${s.context}"`,
    }));
    onClipsAccepted(clips);
    setSuggestions([]);
    toast.success(`${clips.length} clip${clips.length > 1 ? "s" : ""} added`);
  };

  const handleAcceptOne = (index: number) => {
    const s = suggestions[index];
    onClipsAccepted([{
      start: s.start,
      end: s.end,
      label: `Commentary mention - ${formatTime(s.timestamp)} "${s.context}"`,
    }]);
    setDismissed(prev => new Set(prev).add(index));
    toast.success("Clip added");
  };

  const handleDismissOne = (index: number) => {
    setDismissed(prev => new Set(prev).add(index));
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 w-full sm:w-auto"
      >
        <Mic className="h-4 w-4" />
        AI Commentary Clipper
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isOpen && (
        <div className="mt-3 border rounded-lg p-4 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Commentary Auto-Clipper</p>
              <p className="text-xs text-muted-foreground">
                Transcribes match audio and clips every mention of {playerName}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleTranscribe}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Transcribing...
                </>
              ) : hasRun ? (
                "Re-scan"
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  Scan Commentary
                </>
              )}
            </Button>
          </div>

          {activeSuggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {activeSuggestions.length} mention{activeSuggestions.length > 1 ? "s" : ""} found
                </Badge>
                <Button size="sm" variant="default" onClick={handleAcceptAll} className="gap-1.5 h-7 text-xs">
                  <Check className="h-3 w-3" />
                  Accept All
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {suggestions.map((s, i) => {
                  if (dismissed.has(i)) return null;
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-md border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {formatTime(s.timestamp)}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            Clip: {formatTime(s.start)} - {formatTime(s.end)}
                          </span>
                        </div>
                        <p className="text-sm mt-1 truncate">
                          "...{s.context}..."
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-primary hover:text-primary"
                          onClick={() => handleAcceptOne(i)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDismissOne(i)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {hasRun && suggestions.length === 0 && !processing && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No player mentions detected in the audio. Try with a video that has commentary.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
