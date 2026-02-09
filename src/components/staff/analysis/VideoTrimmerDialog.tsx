import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect, useCallback } from "react";
import { Scissors, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoTrimmerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  onTrimComplete: (newUrl: string) => void;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
};

const parseTime = (str: string): number => {
  const parts = str.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(str) || 0;
};

export const VideoTrimmerDialog = ({
  open,
  onOpenChange,
  videoUrl,
  onTrimComplete,
}: VideoTrimmerDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimming, setTrimming] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime(0);
      setEndTime(0);
      setCurrentTime(0);
      setTrimming(false);
    }
  }, [open, videoUrl]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (endTime === 0) setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const setStart = () => {
    if (videoRef.current) setStartTime(videoRef.current.currentTime);
  };

  const setEnd = () => {
    if (videoRef.current) setEndTime(videoRef.current.currentTime);
  };

  const previewTrim = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  const handleTrim = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setTrimming(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // Use MediaRecorder to capture the trimmed segment
      const stream = canvas.captureStream(30);
      // Also capture audio if present
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        // No audio track or already captured, continue without audio
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      video.currentTime = startTime;
      await new Promise<void>((r) => {
        video.onseeked = () => r();
      });

      recorder.start();
      video.play();

      // Draw frames to canvas
      const drawFrame = () => {
        if (video.currentTime >= endTime || video.paused) {
          video.pause();
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0);
        requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);

      const blob = await recordingDone;

      // Upload trimmed video
      const fileName = `${Math.random()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("analysis-videos")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("analysis-videos").getPublicUrl(fileName);

      onTrimComplete(publicUrl);
      onOpenChange(false);
      toast.success("Video trimmed successfully");
    } catch (error: any) {
      console.error("Trim failed:", error);
      toast.error("Failed to trim video");
    } finally {
      setTrimming(false);
    }
  }, [startTime, endTime, onTrimComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trim Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="w-full rounded max-h-[50vh] object-contain bg-black"
            controls
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="text-sm text-muted-foreground text-center">
            Duration: {formatTime(duration)} | Current: {formatTime(currentTime)}
          </div>

          {/* Start / End controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Start Time</Label>
              <div className="flex gap-2">
                <Input
                  value={formatTime(startTime)}
                  onChange={(e) => {
                    const t = parseTime(e.target.value);
                    if (t >= 0 && t < endTime) setStartTime(t);
                  }}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={setStart}>
                  Set
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <div className="flex gap-2">
                <Input
                  value={formatTime(endTime)}
                  onChange={(e) => {
                    const t = parseTime(e.target.value);
                    if (t > startTime && t <= duration) setEndTime(t);
                  }}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={setEnd}>
                  Set
                </Button>
              </div>
            </div>
          </div>

          {/* Range slider */}
          <div className="space-y-1">
            <Label className="text-xs">Trim Range</Label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={startTime}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v < endTime) setStartTime(v);
                }}
                className="flex-1"
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={endTime}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > startTime) setEndTime(v);
                }}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={previewTrim}>
              Preview
            </Button>
            <Button onClick={handleTrim} disabled={trimming}>
              {trimming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Trimming...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-1" />
                  Trim & Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
