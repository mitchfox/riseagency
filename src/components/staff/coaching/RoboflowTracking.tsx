import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Crosshair, Loader2, AlertCircle, Check, X } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctionHelper";
import { toast } from "sonner";
import { generateActionSuggestions, type SuggestedAction } from "@/lib/actionSuggestionEngine";

interface TrackingDetection {
  class: string;
  confidence: number;
  zone: number;
  subZone: number;
  bbox: { x: number; y: number; w: number; h: number };
}

interface FrameResult {
  frameIndex: number;
  timestamp: number;
  detections: TrackingDetection[];
}

interface RoboflowTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  onTrackingResults?: (results: FrameResult[]) => void;
  onSuggestedActions?: (actions: SuggestedAction[]) => void;
}

/**
 * Extracts frames from video at a given FPS, sends to Roboflow edge function,
 * and returns zone-mapped detection results.
 */
export const RoboflowTracking = ({ videoRef, videoUrl, onTrackingResults, onSuggestedActions }: RoboflowTrackingProps) => {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<FrameResult[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [fps, setFps] = useState(5);
  const [segmentStart, setSegmentStart] = useState("");
  const [segmentEnd, setSegmentEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const extractFrames = useCallback(async (): Promise<{ index: number; timestamp: number; base64: string }[]> => {
    const video = videoRef.current;
    if (!video) throw new Error("Video element not available");

    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // Use a hidden video element for extraction to avoid disrupting playback
    const extractionVideo = document.createElement("video");
    extractionVideo.crossOrigin = "anonymous";
    extractionVideo.src = videoUrl;
    extractionVideo.muted = true;

    await new Promise<void>((resolve, reject) => {
      extractionVideo.onloadedmetadata = () => resolve();
      extractionVideo.onerror = () => reject(new Error("Failed to load video for extraction"));
    });

    const duration = extractionVideo.duration;
    const startTime = segmentStart ? parseFloat(segmentStart) : 0;
    const endTime = segmentEnd ? parseFloat(segmentEnd) : duration;
    const interval = 1 / fps;

    canvas.width = extractionVideo.videoWidth;
    canvas.height = extractionVideo.videoHeight;

    const frames: { index: number; timestamp: number; base64: string }[] = [];
    let frameIndex = 0;

    for (let t = startTime; t < endTime; t += interval) {
      extractionVideo.currentTime = t;
      await new Promise<void>((resolve) => {
        extractionVideo.onseeked = () => resolve();
      });

      ctx.drawImage(extractionVideo, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const base64 = dataUrl.split(",")[1];

      frames.push({ index: frameIndex, timestamp: t, base64 });
      frameIndex++;
      setProgress({ current: frameIndex, total: Math.ceil((endTime - startTime) * fps) });
    }

    extractionVideo.remove();
    return frames;
  }, [videoRef, videoUrl, fps, segmentStart, segmentEnd]);

  const handleTrack = async () => {
    setProcessing(true);
    setError(null);
    setResults([]);

    try {
      toast.info("Extracting frames from video...");
      const frames = await extractFrames();

      if (frames.length === 0) {
        setError("No frames extracted. Check your segment range.");
        setProcessing(false);
        return;
      }

      toast.info(`Sending ${frames.length} frames to tracking model...`);

      // Send in batches of 10 to avoid payload limits
      const BATCH_SIZE = 10;
      const allResults: FrameResult[] = [];

      for (let i = 0; i < frames.length; i += BATCH_SIZE) {
        const batch = frames.slice(i, i + BATCH_SIZE);
        const video = videoRef.current;

        const { data, error: fnError } = await invokeEdgeFunction<{
          results: FrameResult[];
          totalFrames: number;
          processedFrames: number;
        }>("process-video-frames", {
          body: {
            frames: batch,
            imageWidth: video?.videoWidth || 1920,
            imageHeight: video?.videoHeight || 1080,
          },
        });

        if (fnError) {
          console.error("Tracking batch error:", fnError);
          setError(fnError.message);
          break;
        }

        if (data?.results) {
          allResults.push(...data.results);
        }

        setProgress({ current: Math.min(i + BATCH_SIZE, frames.length), total: frames.length });
      }

      setResults(allResults);
      onTrackingResults?.(allResults);

      // Run rule-based suggestion engine
      const actionSuggestions = generateActionSuggestions(allResults);
      setSuggestions(actionSuggestions);
      onSuggestedActions?.(actionSuggestions);

      const totalDetections = allResults.reduce((sum, f) => sum + f.detections.length, 0);
      toast.success(`Tracking complete: ${totalDetections} detections across ${allResults.length} frames`);
    } catch (err: any) {
      console.error("Tracking error:", err);
      setError(err.message || "Unknown error");
      toast.error("Tracking failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const currentVideoTime = videoRef.current?.currentTime || 0;
  const nearestFrame = results.find(
    (r) => Math.abs(r.timestamp - currentVideoTime) < 1 / fps
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between gap-2">
          <span className="flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            AI Track (Roboflow)
          </span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">FPS</label>
            <input
              type="number"
              min={1}
              max={30}
              value={fps}
              onChange={(e) => setFps(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
              className="w-full h-8 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Start (s)</label>
            <input
              type="number"
              step="0.1"
              value={segmentStart}
              onChange={(e) => setSegmentStart(e.target.value)}
              placeholder="0"
              className="w-full h-8 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End (s)</label>
            <input
              type="number"
              step="0.1"
              value={segmentEnd}
              onChange={(e) => setSegmentEnd(e.target.value)}
              placeholder="End"
              className="w-full h-8 rounded-md border bg-background px-2 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleTrack}
          disabled={processing}
          size="sm"
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing {progress.current}/{progress.total} frames...
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4 mr-2" />
              Start Tracking
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {results.length} frames processed &middot;{" "}
              {results.reduce((s, r) => s + r.detections.length, 0)} total detections
            </p>
            {nearestFrame && nearestFrame.detections.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  Detections at {nearestFrame.timestamp.toFixed(1)}s:
                </p>
                {nearestFrame.detections.map((d, i) => (
                  <div
                    key={i}
                    className="text-xs px-2 py-1 rounded bg-accent/50 flex justify-between"
                  >
                    <span>{d.class} ({(d.confidence * 100).toFixed(0)}%)</span>
                    <span className="text-muted-foreground">
                      Zone {d.zone}.{d.subZone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            <p className="text-xs font-medium">
              Suggested Actions ({suggestions.length})
            </p>
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="text-xs px-2 py-1.5 rounded border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{s.actionType}</span>
                  <span className="text-muted-foreground ml-1">
                    {s.timestamp.toFixed(1)}s &middot; Zone {s.zone}.{s.subZone}
                  </span>
                  <p className="text-muted-foreground truncate">{s.description}</p>
                </div>
                <span className="text-muted-foreground shrink-0">
                  {(s.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CollapsibleContent>
    </Collapsible>
  );
};
