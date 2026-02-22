import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, Film, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompressionPreset {
  label: string;
  description: string;
  videoBitrate: number;
  audioBitrate: number;
  scale: number; // 1 = original, 0.75 = 75% etc.
}

const PRESETS: Record<string, CompressionPreset> = {
  light: {
    label: "Light Compression",
    description: "Minimal quality loss, ~30% smaller",
    videoBitrate: 5000000,
    audioBitrate: 128000,
    scale: 1,
  },
  balanced: {
    label: "Balanced",
    description: "Good quality, ~50% smaller",
    videoBitrate: 2500000,
    audioBitrate: 128000,
    scale: 1,
  },
  heavy: {
    label: "Maximum Compression",
    description: "Noticeable quality reduction, ~70% smaller",
    videoBitrate: 1000000,
    audioBitrate: 96000,
    scale: 0.75,
  },
  resolution720: {
    label: "720p Downscale",
    description: "Scales to 720p with good bitrate",
    videoBitrate: 2500000,
    audioBitrate: 128000,
    scale: 0, // Special: force 720p
  },
};

export const VideoCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState("balanced");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputSize, setOutputSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setOutputBlob(null);
      setProgress(0);
    }
  };

  const compress = async () => {
    if (!file) return;
    setCompressing(true);
    setProgress(0);
    setOutputBlob(null);

    try {
      const config = PRESETS[preset];
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
        video.src = URL.createObjectURL(file);
        video.load();
      });

      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (config.scale === 0) {
        // Force 720p
        const aspect = video.videoWidth / video.videoHeight;
        targetHeight = 720;
        targetWidth = Math.round(720 * aspect);
        // Ensure even numbers
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
      } else if (config.scale < 1) {
        targetWidth = Math.round(video.videoWidth * config.scale);
        targetHeight = Math.round(video.videoHeight * config.scale);
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: config.videoBitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(100);
      video.currentTime = 0;
      await video.play();

      const duration = video.duration;
      const fps = 30;
      const frameInterval = 1000 / fps;

      await new Promise<void>((resolve) => {
        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop();
            resolve();
            return;
          }
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          setProgress(Math.min(95, Math.round((video.currentTime / duration) * 100)));
          setTimeout(() => requestAnimationFrame(drawFrame), frameInterval / 2);
        };
        recorder.onstop = () => resolve();
        requestAnimationFrame(drawFrame);
      });

      // Wait for recorder to finish
      await new Promise<void>((resolve) => {
        if (recorder.state === "inactive") {
          resolve();
        } else {
          recorder.onstop = () => resolve();
        }
      });

      const blob = new Blob(chunks, { type: mimeType });
      setOutputBlob(blob);
      setOutputSize(blob.size);
      setProgress(100);

      const reduction = ((1 - blob.size / file.size) * 100).toFixed(0);
      toast.success(`Compressed! ${reduction}% smaller`);

      URL.revokeObjectURL(video.src);
    } catch (err: any) {
      console.error("Compression error:", err);
      toast.error(err.message || "Compression failed");
    }
    setCompressing(false);
  };

  const downloadOutput = () => {
    if (!outputBlob || !file) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compressed_${file.name.replace(/\.[^/.]+$/, "")}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Film className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Video Compressor</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Compress video files in-browser without uploading. Uses canvas re-encoding to reduce file size.
      </p>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* File selector */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-1">
                <Film className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setOutputBlob(null);
                    setProgress(0);
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select a video file</p>
                <p className="text-xs text-muted-foreground">No size limit. All processing happens locally.</p>
              </div>
            )}
          </div>

          {/* Preset selector */}
          {file && (
            <div className="space-y-2">
              <Label>Compression Level</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <span className="font-medium">{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Compress button */}
          {file && !compressing && !outputBlob && (
            <Button onClick={compress} className="w-full">
              <Film className="h-4 w-4 mr-2" />
              Compress Video
            </Button>
          )}

          {/* Progress */}
          {compressing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Compressing...
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Result */}
          {outputBlob && file && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Compression complete</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)} → {formatSize(outputSize)}
                    <span className="ml-2 text-primary font-medium">
                      ({((1 - outputSize / file.size) * 100).toFixed(0)}% reduction)
                    </span>
                  </p>
                </div>
              </div>
              <Button onClick={downloadOutput} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Compressed Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
