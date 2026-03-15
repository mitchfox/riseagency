import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { Crop, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  onCropComplete: (newUrl: string) => void;
}

interface CropRect {
  x: number; // percent
  y: number;
  width: number;
  height: number;
}

type HandleType = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const MIN_SIZE = 5; // minimum crop size in percent

const HANDLES: { type: HandleType; cursor: string; style: React.CSSProperties }[] = [
  { type: "nw", cursor: "nwse-resize", style: { top: -5, left: -5 } },
  { type: "n", cursor: "ns-resize", style: { top: -5, left: "50%", transform: "translateX(-50%)" } },
  { type: "ne", cursor: "nesw-resize", style: { top: -5, right: -5 } },
  { type: "e", cursor: "ew-resize", style: { top: "50%", right: -5, transform: "translateY(-50%)" } },
  { type: "se", cursor: "nwse-resize", style: { bottom: -5, right: -5 } },
  { type: "s", cursor: "ns-resize", style: { bottom: -5, left: "50%", transform: "translateX(-50%)" } },
  { type: "sw", cursor: "nesw-resize", style: { bottom: -5, left: -5 } },
  { type: "w", cursor: "ew-resize", style: { top: "50%", left: -5, transform: "translateY(-50%)" } },
];

export const VideoCropDialog = ({
  open,
  onOpenChange,
  videoUrl,
  onCropComplete,
}: VideoCropDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, width: 80, height: 80 });
  const [processing, setProcessing] = useState(false);
  const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });

  const interactionRef = useRef<{
    mode: "move" | "resize";
    handle?: HandleType;
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);

  // Capture a frame from the video
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setVideoDims({ width: video.videoWidth, height: video.videoHeight });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setFrameDataUrl(canvas.toDataURL("image/jpeg", 0.9));
  }, []);

  useEffect(() => {
    if (open) {
      setFrameDataUrl(null);
      setCropRect({ x: 10, y: 10, width: 80, height: 80 });
      setProcessing(false);
    }
  }, [open]);

  const handleLoadedData = () => {
    if (videoRef.current) videoRef.current.currentTime = 1;
  };

  const handleSeeked = () => captureFrame();

  // Pointer math helpers
  const getContainerSize = () => {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1 };
    return { w: el.clientWidth, h: el.clientHeight };
  };

  const clampRect = (r: CropRect): CropRect => ({
    x: Math.max(0, Math.min(r.x, 100 - MIN_SIZE)),
    y: Math.max(0, Math.min(r.y, 100 - MIN_SIZE)),
    width: Math.max(MIN_SIZE, Math.min(r.width, 100 - Math.max(0, r.x))),
    height: Math.max(MIN_SIZE, Math.min(r.height, 100 - Math.max(0, r.y))),
  });

  const onPointerDown = (e: React.PointerEvent, mode: "move" | "resize", handle?: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    interactionRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...cropRect },
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const { w, h } = getContainerSize();
    const dx = ((e.clientX - interaction.startX) / w) * 100;
    const dy = ((e.clientY - interaction.startY) / h) * 100;
    const sr = interaction.startRect;

    if (interaction.mode === "move") {
      setCropRect(clampRect({ ...sr, x: sr.x + dx, y: sr.y + dy }));
      return;
    }

    const handle = interaction.handle!;
    let { x, y, width, height } = sr;

    if (handle.includes("w")) { x = sr.x + dx; width = sr.width - dx; }
    if (handle.includes("e")) { width = sr.width + dx; }
    if (handle.includes("n")) { y = sr.y + dy; height = sr.height - dy; }
    if (handle.includes("s")) { height = sr.height + dy; }

    // Enforce minimums
    if (width < MIN_SIZE) {
      if (handle.includes("w")) { x = sr.x + sr.width - MIN_SIZE; }
      width = MIN_SIZE;
    }
    if (height < MIN_SIZE) {
      if (handle.includes("n")) { y = sr.y + sr.height - MIN_SIZE; }
      height = MIN_SIZE;
    }

    setCropRect(clampRect({ x, y, width, height }));
  }, []);

  const onPointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  const resetCrop = () => setCropRect({ x: 0, y: 0, width: 100, height: 100 });

  // Pixel dimensions for display
  const pixelW = Math.round((cropRect.width / 100) * videoDims.width);
  const pixelH = Math.round((cropRect.height / 100) * videoDims.height);

  const handleCrop = useCallback(async () => {
    if (!videoRef.current) return;
    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current!;

      const cropX = Math.round((cropRect.x / 100) * video.videoWidth);
      const cropY = Math.round((cropRect.y / 100) * video.videoHeight);
      const cropW = Math.max(2, Math.round((cropRect.width / 100) * video.videoWidth));
      const cropH = Math.max(2, Math.round((cropRect.height / 100) * video.videoHeight));

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;

      const hashMatch = videoUrl.match(/#t=([\d.]+),([\d.]+)/);
      const startTime = hashMatch ? parseFloat(hashMatch[1]) : 0;
      const endTime = hashMatch ? parseFloat(hashMatch[2]) : video.duration;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      video.currentTime = startTime;
      await new Promise<void>((r) => { video.onseeked = () => r(); });

      recorder.start();
      video.play();

      const drawFrame = () => {
        if (video.currentTime >= endTime || video.paused) {
          video.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);

      const blob = await recordingDone;

      const fileName = `cropped-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("analysis-videos")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("analysis-videos")
        .getPublicUrl(fileName);

      onCropComplete(publicUrl);
      onOpenChange(false);
      toast.success("Video cropped successfully");
    } catch (error: any) {
      console.error("Crop failed:", error);
      toast.error("Failed to crop video");
    } finally {
      setProcessing(false);
    }
  }, [cropRect, videoUrl, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Video</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag sides or corners to select any area. The cropped version will replace the original clip.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <video
            ref={videoRef}
            src={videoUrl.split("#")[0]}
            onLoadedData={handleLoadedData}
            onSeeked={handleSeeked}
            className="hidden"
            crossOrigin="anonymous"
            muted
            playsInline
            preload="auto"
          />
          <canvas ref={canvasRef} className="hidden" />

          {frameDataUrl ? (
            <>
              <div
                ref={containerRef}
                className="relative bg-muted rounded-lg overflow-hidden select-none"
                style={{ touchAction: "none" }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <img
                  src={frameDataUrl}
                  alt="Video frame"
                  className="w-full h-auto block"
                  draggable={false}
                />

                {/* Dark overlay outside crop */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top */}
                  <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: `${cropRect.y}%` }} />
                  {/* Bottom */}
                  <div className="absolute bg-black/50" style={{ bottom: 0, left: 0, right: 0, height: `${100 - cropRect.y - cropRect.height}%` }} />
                  {/* Left */}
                  <div className="absolute bg-black/50" style={{ top: `${cropRect.y}%`, left: 0, width: `${cropRect.x}%`, height: `${cropRect.height}%` }} />
                  {/* Right */}
                  <div className="absolute bg-black/50" style={{ top: `${cropRect.y}%`, right: 0, width: `${100 - cropRect.x - cropRect.width}%`, height: `${cropRect.height}%` }} />
                </div>

                {/* Crop box */}
                <div
                  className="absolute border-2 border-primary"
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                    cursor: "move",
                  }}
                  onPointerDown={(e) => onPointerDown(e, "move")}
                >
                  {/* Rule of thirds grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-0 right-0 border-t border-primary/30" />
                    <div className="absolute top-2/3 left-0 right-0 border-t border-primary/30" />
                    <div className="absolute left-1/3 top-0 bottom-0 border-l border-primary/30" />
                    <div className="absolute left-2/3 top-0 bottom-0 border-l border-primary/30" />
                  </div>

                  {/* Resize handles */}
                  {HANDLES.map((h) => (
                    <div
                      key={h.type}
                      className="absolute w-[10px] h-[10px] bg-primary rounded-sm border border-primary-foreground z-10"
                      style={{ ...h.style, cursor: h.cursor }}
                      onPointerDown={(e) => onPointerDown(e, "resize", h.type)}
                    />
                  ))}

                  {/* Dimension label */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    {pixelW} × {pixelH}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="flex gap-2 justify-between">
            <Button variant="ghost" size="sm" onClick={resetCrop} disabled={!frameDataUrl}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCrop} disabled={processing || !frameDataUrl}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Cropping...
                  </>
                ) : (
                  <>
                    <Crop className="w-4 h-4 mr-1" />
                    Crop & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
