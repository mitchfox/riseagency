import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera, SkipBack, SkipForward, Play, Pause } from "lucide-react";

interface Props {
  clip: {
    id: string;
    action_type: string;
    video_url: string | null;
  };
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, blob: Blob, time: number) => void;
}

export const DatasetFrameCapture = ({ clip, open, onClose, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const videoUrl = clip.video_url?.split("#")[0] || "";

  const handleLoaded = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setReady(true);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const stepFrame = useCallback((direction: number) => {
    if (videoRef.current) {
      // Approximate frame step (~1/30th of a second)
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration, videoRef.current.currentTime + direction * (1 / 30))
      );
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.pause();
    setPlaying(false);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(dataUrl, blob, video.currentTime);
      }
    }, "image/png");
  }, [onCapture]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Capture Frame — {clip.action_type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              onLoadedMetadata={handleLoaded}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setPlaying(false)}
              className="w-full max-h-[60vh] object-contain"
              preload="auto"
              playsInline
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {ready && (
            <>
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 1}
                step={0.001}
                onValueChange={handleSeek}
                className="w-full"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => stepFrame(-1)}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={togglePlay}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => stepFrame(1)}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-mono text-muted-foreground ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <Button onClick={captureFrame}>
                  <Camera className="h-4 w-4 mr-1.5" />
                  Capture Frame
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
