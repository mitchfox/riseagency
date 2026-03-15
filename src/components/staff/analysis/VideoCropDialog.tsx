import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect, useCallback } from "react";
import { Crop, Loader2 } from "lucide-react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  onCropComplete: (newUrl: string) => void;
}

export const VideoCropDialog = ({
  open,
  onOpenChange,
  videoUrl,
  onCropComplete,
}: VideoCropDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Capture a frame from the video for the cropper preview
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setFrameDataUrl(canvas.toDataURL("image/jpeg", 0.9));
  }, []);

  useEffect(() => {
    if (open) {
      setFrameDataUrl(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setProcessing(false);
    }
  }, [open]);

  const handleLoadedData = () => {
    // Seek to 1s in to avoid blank frames
    if (videoRef.current) {
      videoRef.current.currentTime = 1;
    }
  };

  const handleSeeked = () => {
    captureFrame();
  };

  const onCropAreaChange = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels || !videoRef.current) return;
    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current!;
      const { x, y, width, height } = croppedAreaPixels;

      // Scale crop coordinates from the image (which matches videoWidth/Height) to actual video
      const scaleX = video.videoWidth / videoDimensions.width;
      const scaleY = video.videoHeight / videoDimensions.height;
      const cropX = Math.round(x * scaleX);
      const cropY = Math.round(y * scaleY);
      const cropW = Math.round(width * scaleX);
      const cropH = Math.round(height * scaleY);

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;

      // Parse time fragment from URL if present
      const hashMatch = videoUrl.match(/#t=([\d.]+),([\d.]+)/);
      const startTime = hashMatch ? parseFloat(hashMatch[1]) : 0;
      const endTime = hashMatch ? parseFloat(hashMatch[2]) : video.duration;
      const baseUrl = videoUrl.split("#")[0];

      // Set up MediaRecorder
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

      // Seek to start
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

      // Upload
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
  }, [croppedAreaPixels, videoDimensions, videoUrl, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Video</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select the area of the video frame to keep. The cropped version will replace the original clip.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden video for loading + recording */}
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

          {/* Cropper on captured frame */}
          {frameDataUrl ? (
            <>
              <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={frameDataUrl}
                  crop={crop}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropAreaChange}
                  restrictPosition={false}
                  minZoom={0.5}
                />
              </div>

              <div>
                <Label>Zoom</Label>
                <Slider
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  min={0.5}
                  max={5}
                  step={0.05}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="flex gap-2 justify-end">
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
      </DialogContent>
    </Dialog>
  );
};
