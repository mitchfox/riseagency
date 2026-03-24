import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Maximize, Play, Pause } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { t } from '@/lib/portalTranslations';

interface ActionVideoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  actionTitle?: string;
  language?: string;
  clipStart?: number | null;
  clipEnd?: number | null;
}

export const ActionVideoPopup = ({
  open,
  onOpenChange,
  videoUrl,
  actionTitle,
  language = 'en',
  clipStart,
  clipEnd,
}: ActionVideoPopupProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedSourceRef = useRef<string | null>(null);
  const hasTimeRange = clipStart != null && clipEnd != null;
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Load source once and seek before playback starts
  useEffect(() => {
    if (!open || !videoRef.current || !videoUrl) return;

    const vid = videoRef.current;
    const targetStart = hasTimeRange ? clipStart : 0;

    const applyPlaybackWindow = () => {
      if (hasTimeRange) {
        vid.currentTime = targetStart;
      } else if (vid.currentTime !== 0) {
        vid.currentTime = 0;
      }

      if (isPlaying) {
        vid.play().catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      applyPlaybackWindow();
    };

    if (loadedSourceRef.current !== videoUrl) {
      loadedSourceRef.current = videoUrl;
      vid.pause();
      vid.src = videoUrl;
      vid.load();
    }

    if (vid.readyState >= 1) {
      applyPlaybackWindow();
      return;
    }

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [open, videoUrl, clipStart, hasTimeRange, isPlaying]);

  // Enforce clip boundaries and update progress
  useEffect(() => {
    if (!open || !videoRef.current || !hasTimeRange) return;
    const vid = videoRef.current;
    const duration = clipEnd - clipStart;

    const handleTimeUpdate = () => {
      // Clamp: if user somehow gets outside range, snap back
      if (vid.currentTime < clipStart) {
        vid.currentTime = clipStart;
        return;
      }
      if (vid.currentTime >= clipEnd) {
        vid.currentTime = clipStart; // loop back
      }
      setProgress(Math.min(1, (vid.currentTime - clipStart) / duration));
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [open, clipStart, clipEnd, hasTimeRange]);

  // Auto-open fullscreen when dialog opens
  useEffect(() => {
    if (open && videoRef.current) {
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.requestFullscreen?.().catch(() => {
            (videoRef.current as any)?.webkitEnterFullscreen?.();
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    }
  };

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !hasTimeRange) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const duration = clipEnd - clipStart;
    videoRef.current.currentTime = clipStart + ratio * duration;
  }, [hasTimeRange, clipStart, clipEnd]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden bg-black">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={handleFullscreen}
              title={t(language, 'fullscreen')}
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {actionTitle && (
            <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-sm px-3 py-1 rounded">
              {actionTitle}
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full max-h-[80vh] object-contain cursor-pointer"
            preload={hasTimeRange ? "metadata" : "auto"}
            crossOrigin="anonymous"
            muted
            playsInline
            onClick={togglePlayPause}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controls={!hasTimeRange}
            loop={!hasTimeRange}
          />
          {/* Custom controls for clipped videos */}
          {hasTimeRange && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
              <div
                ref={progressBarRef}
                className="w-full h-1.5 bg-white/20 rounded cursor-pointer mb-2"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-primary rounded"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={togglePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
